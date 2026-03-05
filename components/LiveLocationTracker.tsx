import { useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import supabase from '../utils/supabase';

type Props = {
  enabled: boolean;
  userId: string | null;
};

export default function LiveLocationTracker({ enabled, userId }: Props) {
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const webWatchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<{ at: number; lat: number | null; lng: number | null }>({ at: 0, lat: null, lng: null });

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

  const sendLocation = useCallback(
    async (lat: number, lng: number) => {
      if (!userId) return;

      const now = Date.now();
      const last = lastSentRef.current;

      // Push at most once every 5 minutes.
      const minIntervalMs = 5 * 60 * 1000; // 5 minutes

      if (now - last.at < minIntervalMs) {
        return;
      }

      lastSentRef.current = { at: now, lat, lng };

      try {
        // Update users table for live status
        const { error: userErr } = await supabase
          .from('users')
          .update({ latitude: lat, longitude: lng, status: 'online' })
          .eq('id', userId);
        if (userErr) console.error('Failed to update live location (users):', userErr);

        // Maintain at most one history row per user by updating the latest row if present,
        // otherwise inserting a new one.
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

        const latest = Array.isArray(existingRows) && existingRows[0];
        if (latest && latest.id) {
          const { error: updateErr } = await supabase
            .from('user_location_history')
            .update({ latitude: lat, longitude: lng, recorded_at: new Date().toISOString(), status: 'online' })
            .eq('id', latest.id);
          if (updateErr) console.error('Failed to update user_location_history row:', updateErr);
        } else {
          const { error: insertErr } = await supabase
            .from('user_location_history')
            .insert([{ user_id: userId, latitude: lat, longitude: lng, status: 'online' }]);
          if (insertErr) console.error('Failed to insert user_location_history row:', insertErr);
        }
      } catch (e) {
        console.error('Failed to update live location:', e);
      }
    },
    [userId]
  );

  const startTracking = useCallback(async () => {
    stopTracking();
    if (!enabled || !userId) return;

    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return;
      try {
        // Immediately request current position and then poll every 5 minutes.
        const poll = async () => {
          try {
            navigator.geolocation.getCurrentPosition(
              pos => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                if (typeof lat === 'number' && typeof lng === 'number') void sendLocation(lat, lng);
              },
              err => console.warn('geolocation getCurrentPosition error:', err),
              { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
            );
          } catch (e) {
            console.warn('Failed to get web geolocation position:', e);
          }
        };

        // run immediately
        poll();
        // then every 5 minutes
        webWatchIdRef.current = setInterval(poll, 5 * 60 * 1000) as unknown as number;
      } catch (e) {
        console.warn('Failed to start web geolocation poller:', e);
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
          timeInterval: 5 * 60 * 1000, // 5 minutes
          distanceInterval: 0,
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
  }, [enabled, userId, sendLocation, stopTracking]);

  useEffect(() => {
    if (!enabled || !userId) {
      stopTracking();
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
    };
  }, [enabled, userId, startTracking, stopTracking]);

  return null;
}
