import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../utils/supabase';

type AttendanceRow = {
  id: number;
  created_at: string;
  employee_start_time: string | null;
  employee_end_time: string | null;
  total_hours?: string | null;
  status?: string | null;
};


function pad2(n: number) {
  return String(n).padStart(2, '0');
}

// Formats a JS Date into Postgres `time with time zone` (timetz) text: HH:MM:SS±HH:MM
function toTimetzValue(date: Date) {
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());

  // getTimezoneOffset() is minutes behind UTC. We need ±HH:MM offset from UTC.
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const offH = pad2(Math.floor(abs / 60));
  const offM = pad2(abs % 60);

  return `${hh}:${mm}:${ss}${sign}${offH}:${offM}`;
}

function timetzToDisplay(t: string | null | undefined) {
  if (!t) return '--:--';
  // Supabase returns timetz like: "08:00:00+00" or "08:00:00+00:00".
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

export default function Dashboard({
  onLogout,
  onNavigateToSettings,
}: {
  onLogout?: () => void;
  onNavigateToSettings?: () => void;
}) {
  const [userData, setUserData] = useState({
    full_name: 'User',
    phone_number: null,
    profile_picture_url: null,
  });

  const [currentLocationName, setCurrentLocationName] = useState<string>('Not assigned');
  const [attendance, setAttendance] = useState<AttendanceRow | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceActionLoading, setAttendanceActionLoading] = useState(false);

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

  useEffect(() => {
    void fetchUserData();
    void fetchAttendance();
  }, [fetchAttendance]);

  const fetchUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log('Current user:', user?.id);

      // Show auth metadata immediately
      if (user?.id) {
        setUserData({
          full_name: user.user_metadata?.full_name || 'User',
          phone_number: null,
          profile_picture_url: null,
        });

        // Then fetch and update with database data in background
        const { data, error } = await supabase
          .from('users')
          .select('full_name, phone_number, profile_picture_url, site_id')
          .eq('id', user.id);

        console.log('User data from table:', data);
        console.log('Error:', error);

        if (data && data.length > 0 && data[0].full_name) {
          setUserData({
            full_name: data[0].full_name,
            phone_number: data[0].phone_number,
            profile_picture_url: data[0].profile_picture_url,
          });

          // Resolve current location from user's assigned site
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
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      // Silent fallback to auth metadata
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserData({
          full_name: user.user_metadata?.full_name || 'User',
          phone_number: null,
          profile_picture_url: null,
        });
      }
    }
  };

  const isTimedIn = Boolean(attendance?.employee_start_time && !attendance?.employee_end_time);

  const handleTimeIn = useCallback(async () => {
    if (attendanceActionLoading) return;
    setAttendanceActionLoading(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user?.id) throw new Error('No authenticated user');

      // Prevent double time-in if there's an open shift.
      if (attendance?.employee_start_time && !attendance?.employee_end_time) {
        return;
      }

      const now = new Date();
      const isOnTime = now.getHours() < 8 || (now.getHours() === 8 && now.getMinutes() === 0);
      const status = isOnTime ? 'On-Time' : 'Late';
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

      const { data, error } = await supabase
        .from('user_attendances')
        .update({ employee_end_time: toTimetzValue(now), total_hours: totalHours })
        .eq('id', attendance.id)
        .select('id, created_at, employee_start_time, employee_end_time, total_hours, status')
        .single();
      if (error) throw error;
      setAttendance(data as any);
    } catch (e) {
      console.error('Time Out error:', e);
    } finally {
      setAttendanceActionLoading(false);
    }
  }, [attendance, attendanceActionLoading]);

  // Fetch recent activity for employee
  const [activityLog, setActivityLog] = useState<any[]>([]);

  const fetchActivityLog = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user?.id) {
        setActivityLog([]);
        return;
      }
      // Fetch activities: joining site, site status changes
      const { data, error } = await supabase
        .from('employee_activity_log')
        .select('id, created_at, activity_type, description, status, site_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setActivityLog(data || []);
    } catch (e) {
      setActivityLog([]);
    }
  }, []);

  useEffect(() => {
    fetchActivityLog();
  }, []);

  // Helper to format activity time
  function formatActivityTime(createdAt: string) {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffH < 1) {
      const diffM = Math.floor(diffMs / (1000 * 60));
      return `${diffM}m ago`;
    }
    return `${diffH}h ago`;
  }

  return (
    // FIX 1: Use flex-1 with w-full to ensure it fills the entire parent container
    <View className="w-full flex-1 bg-white">
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="w-full flex-1"
        // FIX 2: contentContainerStyle must be flexGrow to allow scrolling but w-full to prevent gaps
        contentContainerStyle={{ flexGrow: 1, width: '100%' }}
        // Disables horizontal bouncing that reveals white backgrounds
        bounces={false}>
        {/* 1. TOP BRANDED HEADER - MINIMAL DESIGN */}
        <View className="flex-row items-center justify-between bg-white px-6 pb-6 pt-6">
          <View className="flex-1 flex-row items-center gap-3">
            <TouchableOpacity className="h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-500 active:scale-95">
              {userData.profile_picture_url ? (
                <Image
                  source={{ uri: userData.profile_picture_url }}
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={26} color="white" />
              )}
            </TouchableOpacity>
            <View className="min-w-0 flex-1">
              <Text className="text-2xl font-extrabold text-gray-900" numberOfLines={1}>
                {userData.full_name}
              </Text>
              <Text className="-mt-1 text-sm font-semibold text-gray-600">Employee</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="rounded-full bg-green-100 p-3">
              <Ionicons name="notifications" size={24} color="#10b981" />
            </View>
            <TouchableOpacity
              onPress={onNavigateToSettings}
              className="rounded-full bg-green-100 p-3 active:scale-95">
              <Ionicons name="settings" size={24} color="#10b981" />
            </TouchableOpacity>
          </View>
        </View>

        {/* CONTENT WRAPPER */}
        <View className="w-full bg-white px-6 py-8">
          {/* 2. STATS GRID - ENHANCED DESIGN */}
          <Text className="mb-4 text-lg font-bold text-gray-800">Your Statistics</Text>
          <View className="w-full flex-row flex-wrap justify-between gap-3">
            <StatCard icon="map-outline" title="Sites" value="3" color="bg-green-500" />
            <StatCard icon="chatbubbles-outline" title="Alerts" value="5" color="bg-green-400" />
            <StatCard icon="time-outline" title="Hours" value="8h" color="bg-green-600" />
            <StatCard
              icon="shield-checkmark-outline"
              title="Tasks"
              value="12"
              color="bg-green-500"
            />
          </View>

          {/* 3. CURRENT ASSIGNMENT CARD - PREMIUM DESIGN */}
          <View className="mt-6 w-full">
            <Text className="mb-4 text-lg font-bold text-gray-800">Ongoing Shift</Text>
            <View className="w-full rounded-3xl border-2 border-green-200 bg-gradient-to-br from-white to-green-50 p-6 shadow-md shadow-green-200">
              {/* Location Section */}
              <View className="mb-6 flex-row items-center rounded-2xl border border-green-200 bg-green-50 p-4">
                <View className="mr-4 rounded-full bg-green-500 p-3">
                  <Ionicons name="location" size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold uppercase tracking-wider text-green-600">
                    Current Active Site
                  </Text>
                  <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
                    {currentLocationName}
                  </Text>
                </View>
              </View>

              {/* Time Range Section */}
              <View className="mb-6 w-full flex-row items-center justify-between rounded-2xl border border-green-100 bg-white p-4">
                <View>
                  <Text className="text-xs font-semibold text-gray-500">START TIME</Text>
                  <Text className="mt-1 text-base font-bold text-gray-900">
                    {attendanceLoading
                      ? 'Loading…'
                      : timetzToDisplay(attendance?.employee_start_time)}
                  </Text>
                </View>
                <View className="h-8 w-px bg-green-200" />
                <View className="items-end">
                  <Text className="text-xs font-semibold text-gray-500">END TIME</Text>
                  <Text className="mt-1 text-base font-bold text-gray-900">
                    {attendanceLoading
                      ? 'Loading…'
                      : timetzToDisplay(attendance?.employee_end_time)}
                  </Text>
                </View>
              </View>

              <View className="mb-6 w-full flex-row items-center justify-between rounded-2xl border border-green-100 bg-white p-4">
                <View>
                  <Text className="text-xs font-semibold text-gray-500">TOTAL HOURS</Text>
                  <Text className="mt-1 text-base font-bold text-gray-900">
                    {attendanceLoading ? 'Loading…' : attendance?.total_hours || '--'}
                  </Text>
                </View>
                <View className="h-8 w-px bg-green-200" />
                <View className="items-end">
                  <Text className="text-xs font-semibold text-gray-500">STATUS</Text>
                  <Text className="mt-1 text-base font-bold text-gray-900">
                    {attendanceLoading ? 'Loading…' : attendance?.status || '--'}
                  </Text>
                </View>
              </View>

              {/* Time In / Time Out Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={attendanceLoading || attendanceActionLoading}
                onPress={isTimedIn ? handleTimeOut : handleTimeIn}
                className="w-full flex-row items-center justify-center rounded-2xl bg-gradient-to-r from-green-500 to-green-600 py-4 shadow-lg shadow-green-300 active:scale-95">
                <Ionicons name="finger-print" size={20} color="white" />
                <Text className="ml-2 text-base font-bold text-white">
                  {attendanceActionLoading ? 'Saving…' : isTimedIn ? 'Time Out Now' : 'Time In Now'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. ACTIVITY LOG - ENHANCED */}
          <View className="mb-16 mt-6 w-full">
            <Text className="mb-4 text-lg font-bold text-gray-800">Recent Activity</Text>
            {activityLog.length === 0 ? (
              <Text className="text-sm text-gray-400">No recent activity.</Text>
            ) : (
              activityLog.map((item) => (
                <ActivityItem
                  key={item.id}
                  icon={
                    item.activity_type === 'join_site'
                      ? 'people-circle'
                      : item.activity_type === 'site_status'
                        ? item.status === 'Pending'
                          ? 'hourglass'
                          : item.status === 'Finished'
                            ? 'checkmark-circle'
                            : 'alert-circle'
                        : 'alert-circle'
                  }
                  text={item.description}
                  time={formatActivityTime(item.created_at)}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
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
    // FIX 4: Use 48% width to ensure grid responsiveness on all screen sizes
    <View className="mb-3 w-[48%] rounded-3xl border-2 border-green-100 bg-white p-5 shadow-md shadow-green-200 active:scale-95">
      <View className={`${color} mb-3 self-start rounded-xl p-3`}>
        <Ionicons name={icon} size={24} color="white" />
      </View>
      <Text className="text-2xl font-black text-gray-900">{value}</Text>
      <Text className="mt-1\ text-xs font-semibold text-gray-500">{title}</Text>
    </View>
  );
}

function ActivityItem({ icon, text, time }: { icon: any; text: string; time: string }) {
  return (
    <View className="mb-4 w-full flex-row items-center rounded-2xl border border-green-100 bg-white p-4 shadow-md shadow-green-100">
      <View className="mr-4 rounded-full bg-green-100 p-3">
        <Ionicons name={icon} size={18} color="#16a34a" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-800" numberOfLines={1}>
          {text}
        </Text>
        <Text className="mt-1\ text-xs text-gray-400">{time}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </View>
  );
}
