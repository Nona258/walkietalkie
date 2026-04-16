import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import supabase, { supabaseUrl, supabaseKey } from './supabase';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Store the userId for use inside the background task
let _backgroundUserId: string | null = null;

TaskManager.defineTask(
  BACKGROUND_LOCATION_TASK,
  async ({
    data,
    error,
  }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
    if (error) {
      console.error('[BG TASK] error:', error);
      return;
    }
    if (!data || !_backgroundUserId) {
      console.warn('[BG TASK] no data or no background user id');
      return;
    }

    const { locations } = data;
    if (!locations || locations.length === 0) {
      console.warn('[BG TASK] no locations');
      return;
    }

    const loc = locations[locations.length - 1];
    const lat = loc.coords?.latitude;
    const lng = loc.coords?.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      console.warn('[BG TASK] invalid coords', { lat, lng });
      return;
    }

    // First attempt: try to read auth session and call Supabase REST with the access token
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) console.warn('[BG TASK] getSession error', sessionError);
      const accessToken = sessionData?.session?.access_token;
      if (accessToken) {
        try {
          console.log('[BG TASK] has access token — updating via Supabase REST');
          const url = `${supabaseUrl}/rest/v1/users?id=eq.${_backgroundUserId}`;
          const body = JSON.stringify({ latitude: lat, longitude: lng, status: 'online' });
          const res = await fetch(url, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
              apikey: supabaseKey,
              Prefer: 'return=representation',
            },
            body,
          });
          if (!res.ok) {
            const text = await res.text();
            console.error('[BG TASK] REST update failed', res.status, text);
          } else {
            const json = await res.json();
            console.log('[BG TASK] REST update succeeded', json);
          }
          return;
        } catch (e) {
          console.warn('[BG TASK] REST update exception', e);
        }
      } else {
        console.warn('[BG TASK] no access token in session');
      }
    } catch (e) {
      console.warn('[BG TASK] error while checking session / REST attempt', e);
    }

    // Second attempt: use the supabase client (may fail if the task has no auth)
    try {
      console.log('[BG TASK] falling back to supabase.from update (may lack auth)');
      const { error: err } = await supabase
        .from('users')
        .update({ latitude: lat, longitude: lng, status: 'online' })
        .eq('id', _backgroundUserId);
      if (err) {
        console.error('[BG TASK] client update error:', err);
      } else {
        console.log('[BG TASK] client update succeeded');
      }
      return;
    } catch (e) {
      console.error('[BG TASK] exception during client update', e);
    }

    // Final fallback: call an external update endpoint (edge function) if configured
    try {
      const endpoint = process.env.EXPO_PUBLIC_LOCATION_UPDATE_ENDPOINT;
      const secret = process.env.EXPO_PUBLIC_LOCATION_UPDATE_SECRET;
      if (endpoint) {
        console.log('[BG TASK] calling fallback endpoint', endpoint);
        const headers: any = { 'Content-Type': 'application/json' };
        if (secret) headers['x-update-secret'] = secret;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ userId: _backgroundUserId, latitude: lat, longitude: lng }),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error('[BG TASK] fallback endpoint failed:', res.status, text);
        } else {
          const json = await res.json();
          console.log('[BG TASK] fallback endpoint success', json);
        }
      } else {
        console.warn('[BG TASK] no fallback endpoint configured (EXPO_PUBLIC_LOCATION_UPDATE_ENDPOINT)');
      }
    } catch (e) {
      console.error('[BG TASK] fallback endpoint error:', e);
    }
  }
);

export async function startBackgroundLocation(userId: string): Promise<void> {
  _backgroundUserId = userId;

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

  const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(
    () => false
  );
  if (isRunning) return;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 5000,
    distanceInterval: 5,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Location Tracking',
      notificationBody: 'Your location is being tracked.',
    },
  });
}

export async function stopBackgroundLocation(): Promise<void> {
  _backgroundUserId = null;
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(
      () => false
    );
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch (e) {
    console.warn('Failed to stop background location:', e);
  }
}
