import { useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import supabase from '../utils/supabase';
import { startBackgroundLocation, stopBackgroundLocation } from '../utils/backgroundLocation';

type Props = {
  enabled: boolean;
  userId: string | null;
};

export default function LiveLocationTracker({ enabled, userId }: Props) {
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const webWatchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<{ at: number; lat: number | null; lng: number | null }>({ at: 0, lat: null, lng: null });
  const historyRowIdRef = useRef<number | null>(null);

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

  const stopTracking = useCallback(() => {
    try {
      if (locationSubRef.current && typeof locationSubRef.current.remove === 'function') {
        locationSubRef.current.remove();
      }
    } catch {}
    locationSubRef.current = null;

    try {
      if (webWatchIdRef.current !== null && Platform.OS === 'web' && typeof navigator !== 'undefined') {
        // webWatchIdRef may hold either a geolocation.watchPosition id or a setInterval id
        try {
          navigator.geolocation.clearWatch(webWatchIdRef.current as number);
        } catch (e) {
          try {
            clearInterval(webWatchIdRef.current as number);
          } catch {}
        }
      }
    } catch {}
    webWatchIdRef.current = null;
  }, []);

  const startOrStopBackground = useCallback(async () => {
    // Web does not support Expo background tasks.
    if (Platform.OS === 'web') return;
    if (!enabled || !userId) {
      await stopBackgroundLocation();
      return;
    }
    try {
      await startBackgroundLocation(userId);
    } catch (e) {
      console.warn('Failed to start background location updates:', e);
    }
  }, [enabled, userId]);

  const sendLocation = useCallback(
    async (lat: number, lng: number) => {
      if (!userId) return;

      // Tune these two knobs based on how "live" you want it vs battery/network usage.
      // This setup updates when the user moves a few meters, with a small time gate to reduce GPS jitter spam.
      const minIntervalMs = 4000; // 4 seconds
      const maxIntervalMs = 20000; // 20 seconds (force-refresh)
      const minDistanceMeters = 4; // 4 meters

      const now = Date.now();
      const last = lastSentRef.current;

      const elapsed = now - last.at;
      const hasLast = typeof last.lat === 'number' && typeof last.lng === 'number';
      const movedMeters = hasLast ? distanceMeters(last.lat as number, last.lng as number, lat, lng) : Infinity;

      const shouldSend =
        !hasLast ||
        (elapsed >= minIntervalMs && movedMeters >= minDistanceMeters) ||
        elapsed >= maxIntervalMs;

      if (!shouldSend) return;

      lastSentRef.current = { at: now, lat, lng };

      try {
        // Update users table for live status
        const { error: userErr } = await supabase
          .from('users')
          .update({ latitude: lat, longitude: lng, status: 'online' })
          .eq('id', userId);
        if (userErr) console.error('Failed to update live location (users):', userErr);

        // Maintain at most one history row per user by updating a cached/latest row if present,
        // otherwise inserting a new one and caching its id.
        const upsertHistoryRow = async () => {
          const payload = {
            latitude: lat,
            longitude: lng,
            recorded_at: new Date().toISOString(),
            status: 'online',
          };

          if (historyRowIdRef.current !== null) {
            const { error: updateErr } = await supabase
              .from('user_location_history')
              .update(payload)
              .eq('id', historyRowIdRef.current);
            if (!updateErr) return;
            console.error('Failed to update cached user_location_history row:', updateErr);
            historyRowIdRef.current = null;
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
            historyRowIdRef.current = Number(latest.id);
            const { error: updateErr } = await supabase
              .from('user_location_history')
              .update(payload)
              .eq('id', latest.id);
            if (updateErr) {
              console.error('Failed to update user_location_history row:', updateErr);
              historyRowIdRef.current = null;
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
          if (inserted?.id) historyRowIdRef.current = Number(inserted.id);
        };

        await upsertHistoryRow();
      } catch (e) {
        console.error('Failed to update live location:', e);
      }
    },
    [userId]
  );

  const startTracking = useCallback(async () => {
    stopTracking();
    if (!enabled || !userId) return;

    // Ensure background tracking is started for native platforms.
    // This is what keeps GPS updates running when the app is in background.
    await startOrStopBackground();

    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return;
      try {
        // Continuous web tracking (updates as the device reports movement)
        webWatchIdRef.current = navigator.geolocation.watchPosition(
          pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            if (typeof lat === 'number' && typeof lng === 'number') void sendLocation(lat, lng);
          },
          err => console.warn('geolocation watchPosition error:', err),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
        );
      } catch (e) {
        console.warn('Failed to start web geolocation watcher:', e);
      }
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted');
        return;
      }

      locationSubRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          // Expo applies `timeInterval` on Android. `distanceInterval` works across platforms.
          timeInterval: 2000,
          distanceInterval: 3,
        },
        loc => {
          const lat = loc.coords?.latitude;
          const lng = loc.coords?.longitude;
          if (typeof lat === 'number' && typeof lng === 'number') void sendLocation(lat, lng);
        }
      );
    } catch (e) {
      console.warn('Failed to start location watcher:', e);
    }
  }, [enabled, userId, sendLocation, stopTracking, startOrStopBackground]);

  useEffect(() => {
    if (!enabled || !userId) {
      stopTracking();
      void startOrStopBackground();
      return;
    }

    void startTracking();

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void startTracking();
      else stopTracking();
    });

    return () => {
      sub.remove();
      stopTracking();
      void startOrStopBackground();
    };
  }, [enabled, userId, startTracking, stopTracking, startOrStopBackground]);

  return null;
}
