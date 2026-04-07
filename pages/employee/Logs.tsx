import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../utils/supabase';
import {
  getUserAttendances,
  getUserAttendanceStats,
  type UserAttendance,
} from '../../utils/userAttendance';

interface Log {
  id: string;
  siteId: string;
  siteName: string;
  location: string;
  timeIn: string;
  timeOut: string | null;
  date: string;
  status: 'active' | 'completed';
  duration?: string;
  attendanceId: number;
}

export default function Logs() {
  const [searchText, setSearchText] = useState('');
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load attendance data on component mount
  useEffect(() => {
    const loadAttendanceData = async () => {
      try {
        setLoading(true);

        // Get current user
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const userId = authData?.user?.id;
        if (!userId) {
          Alert.alert('Error', 'User not authenticated');
          setLoading(false);
          return;
        }

        setCurrentUserId(userId);

        // Get attendance records
        const attendances = await getUserAttendances(userId);

        // Transform attendance data to Log format
        const logsData: Log[] = attendances.map((attendance, index) => {
          const createdDate = new Date(attendance.createdAt);
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          // Format date display
          let dateDisplay = 'N/A';
          if (createdDate.toDateString() === today.toDateString()) {
            dateDisplay = 'Today';
          } else if (createdDate.toDateString() === yesterday.toDateString()) {
            dateDisplay = 'Yesterday';
          } else {
            const daysAgo = Math.floor(
              (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysAgo > 0) {
              dateDisplay = `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
            } else {
              dateDisplay = createdDate.toLocaleDateString();
            }
          }

          // Format times
          const timeIn = attendance.employeeStartTime
            ? new Date(`2000-01-01 ${attendance.employeeStartTime}`).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '--';

          const timeOut = attendance.employeeEndTime
            ? new Date(`2000-01-01 ${attendance.employeeEndTime}`).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : null;

          return {
            id: String(attendance.id),
            attendanceId: attendance.id,
            siteId: 'site-' + index,
            siteName: 'Work Site',
            location: 'On Site',
            timeIn,
            timeOut,
            date: dateDisplay,
            status: attendance.status === 'completed' ? 'completed' : 'active',
            duration: attendance.totalHours || undefined,
          };
        });

        setLogs(logsData);
      } catch (err: any) {
        console.error('Error loading attendance data:', err);
        Alert.alert('Error', 'Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    };

    loadAttendanceData();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.siteName.toLowerCase().includes(searchText.toLowerCase()) ||
      log.location.toLowerCase().includes(searchText.toLowerCase());
    return matchesSearch;
  });

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Header Section - Clean White */}
      <View className="px-6 pt-12 pb-4 bg-white border-b border-gray-100">
        <View className="mb-6">
          <Text className="text-3xl font-extrabold text-gray-900">Logs</Text>
          <Text className="mt-1 text-xs font-semibold text-green-600">All work activity</Text>
        </View>

        {/* Search Bar - Light Gray Border */}
        <View className="flex-row items-center px-4 py-3 rounded-xl bg-gray-50">
          <Ionicons name="search-outline" size={18} color="#6B7280" />
          <TextInput
            placeholder="Search activity..."
            value={searchText}
            onChangeText={setSearchText}
            className="flex-1 ml-3 text-base text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Logs List */}
      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="items-center justify-center flex-1 py-16">
            <ActivityIndicator size="large" color="#1F2937" />
            <Text className="mt-4 text-base text-gray-500">Loading activity...</Text>
          </View>
        ) : filteredLogs.length > 0 ? (
          <View className="gap-4">
            {filteredLogs.map((log) => (
              <TouchableOpacity
                key={log.id}
                className="mb-4 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm shadow-gray-200 active:scale-[0.98]"
                activeOpacity={0.7}
              >
                {/* Header row: site name + status */}
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="flex-1 text-lg font-bold text-gray-900">{log.siteName}</Text>
                  <View
                    className={`h-2.5 w-2.5 rounded-full ${
                      log.status === 'completed' ? 'bg-gray-400' : 'bg-green-500'
                    }`}
                  />
                </View>

                <Text className="mb-2 text-xs font-semibold text-gray-500">{log.location}</Text>

                <View className="flex-row items-center gap-4 mb-3">
                  <View>
                    <Text className="text-xs font-semibold text-gray-500">Time In</Text>
                    <Text className="text-base font-bold text-gray-900">{log.timeIn}</Text>
                  </View>
                  <View className="w-px h-8 bg-gray-200" />
                  <View>
                    <Text className="text-xs font-semibold text-gray-500">
                      {log.timeOut ? 'Time Out' : 'Status'}
                    </Text>
                    <Text className={`text-base font-bold ${log.status === 'active' ? 'text-green-700' : 'text-gray-700'}`}>
                      {log.timeOut || (log.status === 'active' ? 'In Progress' : '--')}
                    </Text>
                  </View>
                </View>

                {/* Footer */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text className="text-sm font-semibold text-gray-700">{log.date}</Text>
                  </View>
                  <View className="px-2 py-1 rounded-md bg-green-50">
                    <Text className="text-xs font-semibold text-green-700">{log.duration || '0h 00m'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="items-center justify-center py-16">
            <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
            <Text className="mt-4 text-base text-gray-500">No activity found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}