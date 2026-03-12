import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import supabase from './supabase';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Store the userId for use inside the background task
let _backgroundUserId: string | null = null;

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (!data || !_backgroundUserId) return;

  const { locations } = data;
  if (!locations || locations.length === 0) return;

  const loc = locations[locations.length - 1];
  const lat = loc.coords?.latitude;
  const lng = loc.coords?.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') return;

  supabase
    .from('users')
    .update({ latitude: lat, longitude: lng, status: 'online' })
    .eq('id', _backgroundUserId)
    .then(({ error: err }) => {
      if (err) console.error('Background location update error:', err);
    });
});

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

  const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
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
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch (e) {
    console.warn('Failed to stop background location:', e);
  }
}
