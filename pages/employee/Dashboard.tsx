import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../utils/supabase';
import * as Location from 'expo-location';
import SweetAlertModal from '../../components/SweetAlertModal';
import {
  fetchMyNotifications,
  fetchMyUnreadNotificationCount,
  deleteMyNotificationsOlderThan,
  markMyNotificationsViewed,
  type AppNotification,
} from '../../utils/notifications';
import { respondToContactRequest } from '../../utils/FriendRequests';

type AttendanceRow = {
  id: number;
  created_at: string;
  employee_start_time: string | null;
  employee_end_time: string | null;
  total_hours?: string | null;
  status?: string | null;
};

type SiteStats = {
  pendingSites: number;
  finishedToday: number;
  hoursThisWeek: string;
  finishedThisWeek: number;
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toTimetzValue(date: Date) {
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());

  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const offH = pad2(Math.floor(abs / 60));
  const offM = pad2(abs % 60);

  return `${hh}:${mm}:${ss}${sign}${offH}:${offM}`;
}

function timetzToDisplay(t: string | null | undefined) {
  if (!t) return '--:--';
  const m = String(t).match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return '--:--';
  const hours24 = Number(m[1]);
  const minutes = Number(m[2]);

  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${pad2(hours12)}:${pad2(minutes)} ${ampm}`;
}

function timetzToSeconds(t: string | null | undefined) {
  if (!t) return null;
  const m = String(t).match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  const seconds = m[3] ? Number(m[3]) : 0;
  if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

function formatTotalHoursFromSeconds(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours}h ${pad2(minutes)}m`;
}

function getTodayRangeIso() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function getWeekRangeIso() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diffFromMonday = (day + 6) % 7; // Mon=0 ... Sun=6
  start.setDate(start.getDate() - diffFromMonday);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function msUntilNextMidnight() {
  const next = new Date();
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - Date.now());
}

export default function Dashboard({
  onLogout,
  onNavigateToSettings,
}: {
  onLogout?: () => void;
  onNavigateToSettings?: () => void;
}) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState({
    full_name: 'User',
    phone_number: null,
    profile_picture_url: null,
  });

  const [currentLocationName, setCurrentLocationName] = useState<string>('Not assigned');
  const [attendance, setAttendance] = useState<AttendanceRow | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceActionLoading, setAttendanceActionLoading] = useState(false);
  const [showSweetAlert, setShowSweetAlert] = useState(false);
  const [sweetAlertMessage, setSweetAlertMessage] = useState('');

  const [siteStats, setSiteStats] = useState<SiteStats>({
    pendingSites: 0,
    finishedToday: 0,
    hoursThisWeek: '0h 00m',
    finishedThisWeek: 0,
  });
  const [siteStatsLoading, setSiteStatsLoading] = useState(false);

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifActionLoading, setNotifActionLoading] = useState<Record<number, boolean>>({});

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const rows = await fetchMyNotifications(30);
      setNotifications(rows);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const handleRespondToRequest = async (notificationId: number, senderId: string, accept: boolean) => {
    if (!currentUserId) {
      Alert.alert('Error', 'Unable to determine current user');
      return;
    }
    setNotifActionLoading((s) => ({ ...s, [notificationId]: true }));
    try {
      await respondToContactRequest(senderId, currentUserId, accept);

      // remove the notification row (best-effort)
      await supabase.from('notification').delete().eq('id', notificationId);

      // refresh
      await Promise.all([loadNotifications(), loadUnreadCount()]);
    } catch (e: any) {
      console.error('Failed to respond to contact request:', e);
      Alert.alert('Error', e?.message || String(e));
    } finally {
      setNotifActionLoading((s) => ({ ...s, [notificationId]: false }));
    }
  };

  const loadUnreadCount = useCallback(async () => {
    const count = await fetchMyUnreadNotificationCount();
    setUnreadCount(count);
  }, []);

  const fetchAttendance = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user?.id) {
        setAttendance(null);
        return;
      }

      const { data, error } = await supabase
        .from('user_attendances')
        .select('id, created_at, employee_start_time, employee_end_time, total_hours, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setAttendance((data as any) ?? null);
    } catch (e) {
      console.error('Error fetching attendance:', e);
      setAttendance(null);
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  const fetchSiteStats = useCallback(async () => {
    setSiteStatsLoading(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;

      let pendingSitesCount = 0;
      let finishedTodayCount = 0;
      let hoursWeekSeconds = 0;
      let finishedThisWeekCount = 0;
      if (user?.id) {
        const [
          { count: leaderAnyCount, error: leaderAnyErr },
          { count: leaderPendingCount, error: leaderPendingErr },
        ] = await Promise.all([
          supabase
            .from('sites')
            .select('id', { count: 'exact', head: true })
            .eq('leader_id', user.id),
          supabase
            .from('sites')
            .select('id', { count: 'exact', head: true })
            .eq('leader_id', user.id)
            .eq('status', 'Pending'),
        ]);
        if (leaderAnyErr) throw leaderAnyErr;
        if (leaderPendingErr) throw leaderPendingErr;

        const isLeader = (leaderAnyCount ?? 0) > 0;

        const { data: userRow, error: userRowErr } = await supabase
          .from('users')
          .select('site_id, archived_sitegroup_id')
          .eq('id', user.id)
          .maybeSingle();
        if (userRowErr) throw userRowErr;

        if (isLeader) {
          pendingSitesCount = leaderPendingCount ?? 0;
        } else {
          const siteId = userRow?.site_id ? String(userRow.site_id) : null;
          if (siteId) {
            const { count, error } = await supabase
              .from('sites')
              .select('id', { count: 'exact', head: true })
              .eq('id', siteId)
              .eq('status', 'Pending');
            if (error) throw error;
            pendingSitesCount = count ?? 0;
          }
        }

        const { startIso, endIso } = getTodayRangeIso();
        if (isLeader) {
          const { count, error } = await supabase
            .from('archived_sitegroup')
            .select('id', { count: 'exact', head: true })
            .eq('leader_id', user.id)
            .gte('finished_at', startIso)
            .lt('finished_at', endIso);
          if (error) throw error;
          finishedTodayCount = count ?? 0;
        } else {
          const archivedId = userRow?.archived_sitegroup_id
            ? String(userRow.archived_sitegroup_id)
            : null;
          if (archivedId) {
            const { count, error } = await supabase
              .from('archived_sitegroup')
              .select('id', { count: 'exact', head: true })
              .eq('id', archivedId)
              .gte('finished_at', startIso)
              .lt('finished_at', endIso);
            if (error) throw error;
            finishedTodayCount = count ?? 0;
          }
        }

        const now = new Date();
        const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

        const weekRange = getWeekRangeIso();

        if (isLeader) {
          const { count, error } = await supabase
            .from('archived_sitegroup')
            .select('id', { count: 'exact', head: true })
            .eq('leader_id', user.id)
            .gte('finished_at', weekRange.startIso)
            .lt('finished_at', weekRange.endIso);
          if (error) throw error;
          finishedThisWeekCount = count ?? 0;
        } else {
          const archivedId = userRow?.archived_sitegroup_id
            ? String(userRow.archived_sitegroup_id)
            : null;
          if (archivedId) {
            const { count, error } = await supabase
              .from('archived_sitegroup')
              .select('id', { count: 'exact', head: true })
              .eq('id', archivedId)
              .gte('finished_at', weekRange.startIso)
              .lt('finished_at', weekRange.endIso);
            if (error) throw error;
            finishedThisWeekCount = count ?? 0;
          }
        }

        const { data: weekRows, error: weekErr } = await supabase
          .from('user_attendances')
          .select('created_at, employee_start_time, employee_end_time')
          .eq('user_id', user.id)
          .gte('created_at', weekRange.startIso)
          .lt('created_at', weekRange.endIso);
        if (weekErr) throw weekErr;

        (weekRows || []).forEach((row: any) => {
          const startS = timetzToSeconds(row?.employee_start_time);
          if (startS == null) return;
          const endS = timetzToSeconds(row?.employee_end_time);
          if (endS != null) {
            let diff = endS - startS;
            if (diff < 0) diff += 24 * 3600;
            hoursWeekSeconds += diff;
            return;
          }

          const createdAt = row?.created_at ? new Date(row.created_at) : null;
          if (createdAt && isSameLocalDay(createdAt, now)) {
            let diff = nowSeconds - startS;
            if (diff < 0) diff += 24 * 3600;
            hoursWeekSeconds += diff;
          }
        });

        setSiteStats({
          pendingSites: pendingSitesCount,
          finishedToday: finishedTodayCount,
          hoursThisWeek: formatTotalHoursFromSeconds(hoursWeekSeconds),
          finishedThisWeek: finishedThisWeekCount,
        });

        return;
      }

      setSiteStats({
        pendingSites: 0,
        finishedToday: 0,
        hoursThisWeek: '0h 00m',
        finishedThisWeek: 0,
      });
    } catch (e) {
      console.error('Error fetching site stats:', e);
      setSiteStats({
        pendingSites: 0,
        finishedToday: 0,
        hoursThisWeek: '0h 00m',
        finishedThisWeek: 0,
      });
    } finally {
      setSiteStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUserData();
    void fetchAttendance();
    void fetchSiteStats();
    (async () => {
      await deleteMyNotificationsOlderThan(7);
      await loadUnreadCount();
    })();
  }, [fetchAttendance, fetchSiteStats, loadUnreadCount]);

  useEffect(() => {
    if (isNotificationOpen) {
      (async () => {
        // Auto-delete notifications older than 1 week.
        await deleteMyNotificationsOlderThan(7);

        // When the user opens the bell, mark notifications as read.
        await markMyNotificationsViewed();
        await Promise.all([loadNotifications(), loadUnreadCount()]);
      })();
    }
  }, [isNotificationOpen, loadNotifications, loadUnreadCount]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('employee_dashboard_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          void loadUnreadCount();
          if (isNotificationOpen) void loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, isNotificationOpen, loadNotifications, loadUnreadCount]);

  useEffect(() => {
    let mounted = true;
    let midnightTimer: any = null;

    const schedule = () => {
      if (!mounted) return;
      midnightTimer = setTimeout(async () => {
        if (!mounted) return;
        await fetchSiteStats();
        schedule();
      }, msUntilNextMidnight() + 250);
    };

    schedule();
    return () => {
      mounted = false;
      if (midnightTimer) clearTimeout(midnightTimer);
    };
  }, [fetchSiteStats]);

  useEffect(() => {
    const channel = supabase
      .channel('employee_dashboard_site_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sites' }, () => {
        void fetchSiteStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'archived_sitegroup' }, () => {
        void fetchSiteStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSiteStats]);

  const fetchUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        setCurrentUserId(user.id);
        setUserData({
          full_name: user.user_metadata?.full_name || 'User',
          phone_number: null,
          profile_picture_url: null,
        });

        const { data, error: usersError } = await supabase
          .from('users')
          .select('full_name, phone_number, profile_picture_url, site_id')
          .eq('id', user.id);

        if (usersError) throw usersError;

        if (data && data.length > 0 && data[0].full_name) {
          setUserData({
            full_name: data[0].full_name,
            phone_number: data[0].phone_number,
            profile_picture_url: data[0].profile_picture_url,
          });

          const siteId = data[0].site_id ? String(data[0].site_id) : null;
          if (!siteId) {
            setCurrentLocationName('Not assigned');
          } else {
            const { data: siteRow, error: siteErr } = await supabase
              .from('sites')
              .select('name')
              .eq('id', siteId)
              .maybeSingle();
            if (!siteErr && siteRow?.name) {
              setCurrentLocationName(String(siteRow.name));
            } else {
              setCurrentLocationName('Assigned site');
            }
          }
        }
      } else {
        setCurrentUserId(null);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setUserData({
          full_name: user.user_metadata?.full_name || 'User',
          phone_number: null,
          profile_picture_url: null,
        });
      } else {
        setCurrentUserId(null);
      }
    }
  };

  // Haversine formula - returns distance in meters between two lat/lon points
  function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const isTimedIn = Boolean(attendance?.employee_start_time && !attendance?.employee_end_time);

  const handleTimeIn = useCallback(async () => {
    if (attendanceActionLoading) return;
    setAttendanceActionLoading(true);
    try {
      // --- Location check start ---
      // Target site coordinates (center)
      const TARGET_LAT = 8.2246043;
      const TARGET_LON = 124.2504357;
      // Allowed radius in meters (adjust as needed)
      const ALLOWED_RADIUS_METERS = 10;

      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== 'granted') {
        console.log('[TimeIn] location permission not granted', { permStatus });
        setSweetAlertMessage('Location permission denied. Cannot time-in.');
        setShowSweetAlert(true);
        setAttendanceActionLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const userLat = loc.coords.latitude;
      const userLon = loc.coords.longitude;
      const dist = haversineDistance(userLat, userLon, TARGET_LAT, TARGET_LON);
      console.log('[TimeIn] location fetched', { userLat, userLon, target: { TARGET_LAT, TARGET_LON }, dist, ALLOWED_RADIUS_METERS });
      if (dist > ALLOWED_RADIUS_METERS) {
        console.log('[TimeIn] user outside allowed radius', { dist, ALLOWED_RADIUS_METERS });
        setSweetAlertMessage('You cannot time-in early');
        setShowSweetAlert(true);
        setAttendanceActionLoading(false);
        return;
      }
      // --- Location check end ---

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user?.id) throw new Error('No authenticated user');

      if (attendance?.employee_start_time && !attendance?.employee_end_time) {
        return;
      }

      const now = new Date();
      const isOnTime = now.getHours() < 8 || (now.getHours() === 8 && now.getMinutes() === 0);
      const status = isOnTime ? 'On-Time' : 'Late';
      console.log('[TimeIn] creating attendance record', { userId: user.id, time: toTimetzValue(now), status });
      const { data, error } = await supabase
        .from('user_attendances')
        .insert([
          {
            user_id: user.id,
            employee_start_time: toTimetzValue(now),
            status,
          },
        ])
        .select('id, created_at, employee_start_time, employee_end_time, total_hours, status')
        .single();
      if (error) throw error;
      console.log('[TimeIn] attendance created', data);
      setAttendance(data as any);
    } catch (e) {
      console.error('Time In error:', e);
    } finally {
      setAttendanceActionLoading(false);
    }
  }, [attendance, attendanceActionLoading]);

  const handleTimeOut = useCallback(async () => {
    if (attendanceActionLoading) return;
    if (!attendance?.id) return;
    setAttendanceActionLoading(true);
    try {
      const now = new Date();
      const startSeconds = timetzToSeconds(attendance?.employee_start_time);
      const endSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

      let totalHours: string | null = null;
      if (startSeconds != null) {
        let diff = endSeconds - startSeconds;
        if (diff < 0) diff += 24 * 3600;
        totalHours = formatTotalHoursFromSeconds(diff);
      }

      console.log('[TimeOut] updating attendance', { attendanceId: attendance.id, startSeconds, endSeconds, totalHours });

      const { data, error } = await supabase
        .from('user_attendances')
        .update({ employee_end_time: toTimetzValue(now), total_hours: totalHours })
        .eq('id', attendance.id)
        .select('id, created_at, employee_start_time, employee_end_time, total_hours, status')
        .single();
      if (error) throw error;
      console.log('[TimeOut] attendance updated', data);
      setAttendance(data as any);
    } catch (e) {
      console.error('Time Out error:', e);
    } finally {
      setAttendanceActionLoading(false);
    }
  }, [attendance, attendanceActionLoading]);

  const statsValue = (n: number) => (siteStatsLoading ? '--' : String(n));
  const statsText = (s: string) => (siteStatsLoading ? '--' : s);

  return (
    <View className="flex-1 w-full bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 w-full"
        contentContainerStyle={{ flexGrow: 1, width: '100%' }}
        bounces={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-12 pb-6 bg-white">
          <View className="flex-row items-center flex-1 gap-3">
            <View className="items-center justify-center flex-shrink-0 overflow-hidden bg-[#237227] rounded-full h-14 w-14">
              {userData.profile_picture_url ? (
                <Image
                  source={{ uri: userData.profile_picture_url }}
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={26} color="#f8f4fb" />
              )}
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-2xl font-extrabold text-gray-900" numberOfLines={1}>
                {userData.full_name}
              </Text>
              <Text className="-mt-1 text-sm font-semibold text-gray-500">Employee</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              className="p-3 bg-[#237227] rounded-full active:scale-95"
              onPress={() => setIsNotificationOpen(true)}>
              <View className="relative">
                <Ionicons name="notifications" size={22} color="#f8f4fb" />
                {unreadCount > 0 && (
                  <View className="absolute -right-2 -top-2 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1">
                    <Text className="text-[11px] font-bold text-white">
                      {unreadCount > 99 ? '99+' : String(unreadCount)}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onNavigateToSettings}
              className="p-3 bg-[#237227] rounded-full active:scale-95">
              <Ionicons name="settings" size={22} color="#f8f4fb" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications Panel (right-side overlay) */}
        {isNotificationOpen && (
          <Pressable
            className="absolute inset-0 items-end"
            style={{ zIndex: 50 }}
            onPress={() => setIsNotificationOpen(false)}>
            <Pressable
              className="w-full h-full max-w-md p-5 bg-white rounded-l-2xl"
              onPress={() => {}}
              style={{ shadowColor: '#000', shadowOffset: { width: -2, height: 0 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-gray-900">Notifications</Text>
                <TouchableOpacity
                  className="p-2 bg-[#f8f4fb] rounded-full"
                  onPress={() => setIsNotificationOpen(false)}>
                  <Ionicons name="close" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View className="mt-4 max-h-96">
                {notificationsLoading ? (
                  <View className="items-center justify-center py-8">
                    <ActivityIndicator />
                    <Text className="mt-2 text-sm text-gray-500">Loading…</Text>
                  </View>
                ) : notifications.length === 0 ? (
                  <Text className="py-6 text-sm text-center text-gray-500">You have no notifications.</Text>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {notifications.map((n) => {
                      const rawBody = n.body || '';
                      const senderMatch = rawBody.match(/__sender_id__:(\S+)/);
                      const senderId = senderMatch ? senderMatch[1] : null;
                      const bodyWithoutMarker = rawBody.replace(/__sender_id__:\S+\n?/, '').trim();

                      return (
                        <View
                          key={String(n.id)}
                          className="p-3 mb-3 border border-gray-100 rounded-xl bg-gray-50">
                          <Text className="text-sm font-bold text-gray-900">{n.title || 'Notification'}</Text>
                          <Text className="mt-1 text-xs text-gray-600">{bodyWithoutMarker}</Text>
                          <Text className="mt-2 text-[11px] text-gray-400">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</Text>

                          {senderId && n.title === 'Contact Request' && (
                            <View className="flex-row gap-2 mt-3">
                              <TouchableOpacity
                                className="flex-1 py-2 bg-[#237227] rounded-xl"
                                onPress={() => void handleRespondToRequest(Number(n.id), senderId, true)}
                                disabled={Boolean(notifActionLoading[Number(n.id)])}>
                                <Text className="text-sm font-semibold text-center text-white">{notifActionLoading[Number(n.id)] ? 'Processing...' : 'Accept'}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                className="flex-1 py-2 bg-gray-100 rounded-xl"
                                onPress={() => void handleRespondToRequest(Number(n.id), senderId, false)}
                                disabled={Boolean(notifActionLoading[Number(n.id)])}>
                                <Text className="text-sm font-semibold text-center text-gray-700">{notifActionLoading[Number(n.id)] ? 'Processing...' : 'Deny'}</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              <TouchableOpacity
                className="w-full py-3 mt-3 bg-[#237227] rounded-xl"
                onPress={() => {
                  void loadNotifications();
                  void loadUnreadCount();
                }}
                disabled={notificationsLoading}>
                <Text className="text-md font-semibold text-center text-[#f8f4fb]">Refresh</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        )}

        {/* Content */}
        <View className="w-full px-6 py-2 pb-32 bg-gray-50">
          {/* Stats Grid */}
          <Text className="mb-1 text-lg font-bold text-gray-800">Your Statistics</Text>
          <View className="flex-row flex-wrap justify-between w-full gap-2">
            <StatCard
              icon="hourglass-outline"
              title="Pending Sites"
              value={statsValue(siteStats.pendingSites)}
              color="bg-[#237227]"
            />
            <StatCard
              icon="checkmark-done-outline"
              title="Finished Today"
              value={statsValue(siteStats.finishedToday)}
              color="bg-[#237227]"
            />
            <StatCard
              icon="calendar-outline"
              title="Hours This Week"
              value={statsText(siteStats.hoursThisWeek)}
              color="bg-[#237227]"
            />
            <StatCard
              icon="trophy-outline"
              title="Finished This Week"
              value={statsValue(siteStats.finishedThisWeek)}
              color="bg-[#237227]"
            />
          </View>

          {/* Ongoing Shift Card */}
          <View className="w-full mt-1">
            <Text className="mb-2 text-lg font-bold text-gray-800">Ongoing Shift</Text>
            <View className="w-full p-4 bg-white border border-gray-200 rounded-2xl">
              {/* Location */}
              <View className="flex-row items-center p-3 mb-2 rounded-xl bg-gray-50">
                <View className="mr-4 rounded-full bg-[#237227] p-2.5">
                  <Ionicons name="location" size={20} color="#f8f4fb" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Active Site
                  </Text>
                  <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
                    {currentLocationName}
                  </Text>
                </View>
              </View>

              {/* Time & Status */}
              <View className="flex-row justify-between mb-2">
                <View className="flex-1">
                  <Text className="text-xs font-medium text-gray-500">START TIME</Text>
                  <Text className="mt-1 text-base font-bold text-gray-900">
                    {attendanceLoading ? '--:--' : timetzToDisplay(attendance?.employee_start_time)}
                  </Text>
                </View>
                <View className="w-px mx-4 bg-gray-200" />
                <View className="flex-1">
                  <Text className="text-xs font-medium text-gray-500">END TIME</Text>
                  <Text className="mt-1 text-base font-bold text-gray-900">
                    {attendanceLoading ? '--:--' : timetzToDisplay(attendance?.employee_end_time)}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between pt-3 border-t border-gray-100">
                <View className="flex-1">
                  <Text className="text-xs font-medium text-gray-500">TOTAL HOURS</Text>
                  <Text className="mt-1 text-base font-bold text-gray-900">
                    {attendanceLoading ? '--' : attendance?.total_hours || '--'}
                  </Text>
                </View>
                <View className="w-px mx-4 bg-gray-200" />
                <View className="flex-1">
                  <Text className="text-xs font-medium text-gray-500">STATUS</Text>
                  <Text className="mt-1 text-base font-bold text-gray-900">
                    {attendanceLoading ? '--' : attendance?.status || '--'}
                  </Text>
                </View>
              </View>

              {/* Action Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={attendanceLoading || attendanceActionLoading}
                onPress={isTimedIn ? handleTimeOut : handleTimeIn}
                className="mt-2 w-full flex-row items-center justify-center rounded-xl bg-[#237227] py-3.5 active:scale-95">
                <Ionicons name="finger-print" size={20} color="#f8f4fb" />
                <Text className="ml-2 text-base font-semibold text-[#f8f4fb]">
                  {attendanceActionLoading ? 'Saving…' : isTimedIn ? 'Time Out' : 'Time In'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
      <SweetAlertModal
        visible={showSweetAlert}
        title={"Cannot Time-in"}
        message={sweetAlertMessage}
        type={'error'}
        confirmText={'OK'}
        onConfirm={() => setShowSweetAlert(false)}
        onCancel={() => setShowSweetAlert(false)}
      />
    </View>
  );
}

// Helper Components
function StatCard({
  icon,
  title,
  value,
  color,
}: {
  icon: any;
  title: string;
  value: string;
  color: string;
}) {
  return (
    <View className="mb-3 w-[48%] rounded-2xl border border-gray-200 bg-white p-4 active:scale-95">
      <View className={`${color} mb-3 self-start rounded-full p-2.5`}>
        <Ionicons name={icon} size={20} color="#f8f4fb" />
      </View>
      <Text className="text-2xl font-black text-gray-900">{value}</Text>
      <Text className="mt-1 text-xs font-medium text-gray-500">{title}</Text>
    </View>
  );
}