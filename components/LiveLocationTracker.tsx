import { useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
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
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastConnectivityRef = useRef<boolean | null>(null);

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
        } catch {
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

  const syncUserLocation = useCallback(
    async (lat: number, lng: number, opts?: { status?: string; force?: boolean }) => {
      if (!userId) return;

      const status = opts?.status ?? 'online';
      const force = opts?.force ?? false;

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
        force ||
        !hasLast ||
        (elapsed >= minIntervalMs && movedMeters >= minDistanceMeters) ||
        elapsed >= maxIntervalMs;

      if (!shouldSend) return;

      lastSentRef.current = { at: now, lat, lng };

      try {
        // Update users table for live status.
        // (DB trigger can log changes into user_location_history automatically.)
        const { error: userErr } = await supabase
          .from('users')
          .update({ latitude: lat, longitude: lng, status })
          .eq('id', userId);
        if (userErr) console.error('Failed to update live location (users):', userErr);
      } catch (e) {
        console.error('Failed to update live location:', e);
      }
    },
    [userId]
  );

  const markLostConnection = useCallback(async () => {
    if (!enabled || !userId) return;
    const last = lastCoordsRef.current;
    if (!last) return;
    try {
      await syncUserLocation(last.lat, last.lng, { status: 'lost_connection', force: true });
    } catch (e) {
      // If we truly have no internet, this will fail; the admin map has a staleness-based fallback.
      console.warn('Failed to mark lost_connection (likely offline):', e);
    }
  }, [enabled, userId, syncUserLocation]);

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
            if (typeof lat === 'number' && typeof lng === 'number') {
              lastCoordsRef.current = { lat, lng };
              void syncUserLocation(lat, lng);
            }
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
          if (typeof lat === 'number' && typeof lng === 'number') {
            lastCoordsRef.current = { lat, lng };
            void syncUserLocation(lat, lng);
          }
        }
      );
    } catch (e) {
      console.warn('Failed to start location watcher:', e);
    }
  }, [enabled, userId, syncUserLocation, stopTracking, startOrStopBackground]);

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

  // Connectivity watcher: when internet is lost, mark the user as lost_connection using the last known GPS fix.
  // Note: if there is *no* connection, this write may fail; the admin map also has a staleness-based fallback.
  useEffect(() => {
    if (!enabled || !userId) return;

    const setConnected = (connected: boolean) => {
      const prev = lastConnectivityRef.current;
      lastConnectivityRef.current = connected;
      if (prev === null) return;
      if (prev === true && connected === false) void markLostConnection();
    };

    if (Platform.OS === 'web') {
      const onOffline = () => setConnected(false);
      const onOnline = () => setConnected(true);

      try {
        setConnected(typeof navigator !== 'undefined' ? !!(navigator as any).onLine : true);
      } catch {
        setConnected(true);
      }

      window.addEventListener('offline', onOffline);
      window.addEventListener('online', onOnline);
      return () => {
        window.removeEventListener('offline', onOffline);
        window.removeEventListener('online', onOnline);
      };
    }

    const unsubscribe = NetInfo.addEventListener(state => {
      // isInternetReachable can be null initially; treat null as "connected" until we know.
      const reachable = state.isInternetReachable;
      const connected = !!state.isConnected && (reachable === null ? true : !!reachable);
      setConnected(connected);
    });

    return () => {
      try {
        unsubscribe();
      } catch {
        // ignore
      }
    };
  }, [enabled, userId, markLostConnection]);

  return null;
}
