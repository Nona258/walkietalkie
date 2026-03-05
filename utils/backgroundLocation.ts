import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import supabase from './supabase';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

const STORAGE_KEYS = {
  userId: 'bg_location_user_id',
  lastSent: 'bg_location_last_sent',
  historyRowId: 'bg_location_history_row_id',
} as const;

type LastSent = { at: number; lat: number | null; lng: number | null };

const distanceMeters = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const aa = s1 * s1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
};

const readJson = async <T,>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = async (key: string, value: unknown) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const shouldSendLocation = async (lat: number, lng: number) => {
  // Same tuning knobs as the in-app tracker.
  const minIntervalMs = 4000;
  const maxIntervalMs = 20000;
  const minDistance = 4;

  const now = Date.now();
  const last = (await readJson<LastSent>(STORAGE_KEYS.lastSent)) || ({ at: 0, lat: null, lng: null } as LastSent);

  const elapsed = now - (last.at || 0);
  const hasLast = typeof last.lat === 'number' && typeof last.lng === 'number';
  const moved = hasLast ? distanceMeters(last.lat as number, last.lng as number, lat, lng) : Infinity;

  const shouldSend = !hasLast || (elapsed >= minIntervalMs && moved >= minDistance) || elapsed >= maxIntervalMs;
  if (!shouldSend) return { shouldSend: false as const };

  await writeJson(STORAGE_KEYS.lastSent, { at: now, lat, lng } satisfies LastSent);
  return { shouldSend: true as const };
};

const syncLocationToSupabase = async (userId: string, lat: number, lng: number) => {
  const gate = await shouldSendLocation(lat, lng);
  if (!gate.shouldSend) return;

  // Update users table for live status
  const { error: userErr } = await supabase
    .from('users')
    .update({ latitude: lat, longitude: lng, status: 'online' })
    .eq('id', userId);
  if (userErr) console.error('Failed to update live location (users):', userErr);

  // Maintain at most one history row per user (same behavior as your foreground code)
  const payload = {
    latitude: lat,
    longitude: lng,
    recorded_at: new Date().toISOString(),
    status: 'online',
  };

  const cachedRowId = await AsyncStorage.getItem(STORAGE_KEYS.historyRowId);
  if (cachedRowId) {
    const { error: updateErr } = await supabase.from('user_location_history').update(payload).eq('id', cachedRowId);
    if (!updateErr) return;
    console.error('Failed to update cached user_location_history row:', updateErr);
    await AsyncStorage.removeItem(STORAGE_KEYS.historyRowId);
  }

  const { data: existingRows, error: selectErr } = await supabase
    .from('user_location_history')
    .select('id')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(1);

  if (selectErr) {
    console.error('Failed to query user_location_history:', selectErr);
    return;
  }

  const latest = Array.isArray(existingRows) ? (existingRows[0] as any) : undefined;
  if (latest && latest.id) {
    await AsyncStorage.setItem(STORAGE_KEYS.historyRowId, String(latest.id));
    const { error: updateErr } = await supabase.from('user_location_history').update(payload).eq('id', latest.id);
    if (updateErr) {
      console.error('Failed to update user_location_history row:', updateErr);
      await AsyncStorage.removeItem(STORAGE_KEYS.historyRowId);
    }
    return;
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('user_location_history')
    .insert([{ user_id: userId, latitude: lat, longitude: lng, status: 'online' }])
    .select('id')
    .single();

  if (insertErr) {
    console.error('Failed to insert user_location_history row:', insertErr);
    return;
  }

  if (inserted?.id) await AsyncStorage.setItem(STORAGE_KEYS.historyRowId, String(inserted.id));
};

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error('Background location task error:', error);
      return;
    }

    const userId = await AsyncStorage.getItem(STORAGE_KEYS.userId);
    if (!userId) return;

    const locations = (data as any)?.locations as Location.LocationObject[] | undefined;
    const loc = locations?.[0];
    const lat = loc?.coords?.latitude;
    const lng = loc?.coords?.longitude;

    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    try {
      await syncLocationToSupabase(userId, lat, lng);
    } catch (e) {
      console.error('Background location sync failed:', e);
    }
  });
}

export async function startBackgroundLocation(userId: string) {
  if (!userId) return;

  await AsyncStorage.setItem(STORAGE_KEYS.userId, userId);

  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') {
    console.warn('Foreground location permission not granted');
    return;
  }

  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  if (bg !== 'granted') {
    console.warn('Background location permission not granted');
    return;
  }

  const already = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (already) return;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 2000,
    distanceInterval: 3,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService:
      // Android-only: required for reliable high-frequency background updates.
      // (Displays a persistent notification while tracking.)
      {
        notificationTitle: 'Location tracking active',
        notificationBody: 'Your location is being shared while you are online.',
      },
  });
}

export async function stopBackgroundLocation() {
  try {
    const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (started) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    // ignore
  }

  try {
    await AsyncStorage.multiRemove([STORAGE_KEYS.userId, STORAGE_KEYS.lastSent, STORAGE_KEYS.historyRowId]);
  } catch {
    // ignore
  }
}
