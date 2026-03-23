import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
}

const MOCK_LOGS: Log[] = [
  {
    id: '1',
    siteId: '5',
    siteName: 'West Branch',
    location: 'West End',
    timeIn: '08:30 AM',
    timeOut: '05:00 PM',
    date: 'Today',
    status: 'completed',
    duration: '8h 30m',
  },
  {
    id: '2',
    siteId: '1',
    siteName: 'Main Headquarters',
    location: 'Downtown',
    timeIn: '09:00 AM',
    timeOut: null,
    date: 'Today',
    status: 'active',
  },
  {
    id: '3',
    siteId: '2',
    siteName: 'North Building',
    location: 'North District',
    timeIn: '07:45 AM',
    timeOut: '04:30 PM',
    date: 'Yesterday',
    status: 'completed',
    duration: '8h 45m',
  },
  {
    id: '4',
    siteId: '3',
    siteName: 'South Warehouse',
    location: 'South Suburb',
    timeIn: '06:00 AM',
    timeOut: '02:15 PM',
    date: 'Yesterday',
    status: 'completed',
    duration: '8h 15m',
  },
  {
    id: '5',
    siteId: '4',
    siteName: 'East Facility',
    location: 'East Side',
    timeIn: '08:00 AM',
    timeOut: '05:30 PM',
    date: '2 days ago',
    status: 'completed',
    duration: '9h 30m',
  },
  {
    id: '6',
    siteId: '5',
    siteName: 'West Branch',
    location: 'West End',
    timeIn: '07:30 AM',
    timeOut: '04:00 PM',
    date: '3 days ago',
    status: 'completed',
    duration: '8h 30m',
  },
];

export default function Logs() {
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

  const filteredLogs = MOCK_LOGS.filter((log) => {
    const matchesSearch =
      log.siteName.toLowerCase().includes(searchText.toLowerCase()) ||
      log.location.toLowerCase().includes(searchText.toLowerCase());
    const matchesFilter = filterStatus === 'all' || log.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const activeLogs = MOCK_LOGS.filter((log) => log.status === 'active').length;
  const totalHours = MOCK_LOGS.reduce((acc, log) => {
    if (log.duration) {
      const [hours] = log.duration.split('h');
      return acc + parseInt(hours);
    }
    return acc;
  }, 0);

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />

      {/* Header Section */}
      <View className="border-b border-green-200 bg-white px-6 py-6 pt-12">
        <View className="mb-6 flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-extrabold text-gray-900">Logs</Text>
            <Text className="mt-1 text-xs font-semibold text-green-600">
              Track your site activities
            </Text>
          </View>
          <View className="rounded-full bg-green-100 p-3">
            <Ionicons name="time-outline" size={24} color="#10b981" />
          </View>
        </View>

        {/* Stats Section */}
        <View className="mb-6 flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-semibold text-green-600">Active Shifts</Text>
                <Text className="mt-1 text-2xl font-extrabold text-gray-900">{activeLogs}</Text>
              </View>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-green-500">
                <Ionicons name="play-circle" size={20} color="white" />
              </View>
            </View>
          </View>

          <View className="flex-1 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-semibold text-blue-600">Total Hours</Text>
                <Text className="mt-1 text-2xl font-extrabold text-gray-900">{totalHours}h</Text>
              </View>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-500">
                <Ionicons name="stats-chart" size={20} color="white" />
              </View>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View
          className={`flex-row items-center rounded-2xl border-2 bg-gray-100 px-4 py-3 ${searchText.length > 0 ? 'border-green-500' : 'border-gray-300'}`}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            placeholder="Search sites..."
            value={searchText}
            onChangeText={setSearchText}
            className="ml-3 flex-1 text-base font-medium text-gray-900"
            placeholderTextColor="#9ca3af"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row gap-3 border-b border-green-200 bg-white px-6 py-3">
        {(['all', 'active', 'completed'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            onPress={() => setFilterStatus(status)}
            className={`rounded-full border-2 px-4 py-2 ${
              filterStatus === status
                ? 'border-green-500 bg-green-500'
                : 'border-green-300 bg-white'
            }`}>
            <Text
              className={`text-sm font-semibold capitalize ${
                filterStatus === status ? 'text-white' : 'text-green-700'
              }`}>
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logs List */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {filteredLogs.length > 0 ? (
          <View className="gap-3">
            {filteredLogs.map((log) => (
              <TouchableOpacity
                key={log.id}
                className="rounded-3xl border-2 border-green-200 bg-white p-5 shadow-sm active:scale-95"
                activeOpacity={0.7}>
                {/* Header */}
                <View className="mb-4 flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="text-lg font-extrabold text-gray-900">{log.siteName}</Text>
                    <View className="mt-1 flex-row items-center">
                      <Ionicons name="location-sharp" size={13} color="#10b981" />
                      <Text className="ml-1 text-xs font-semibold text-green-600">
                        {log.location}
                      </Text>
                    </View>
                  </View>

                  {/* Status Badge */}
                  <View
                    className={`rounded-full border-2 px-3 py-2 ${
                      log.status === 'active'
                        ? 'border-green-500 bg-green-100'
                        : 'border-green-300 bg-green-50'
                    }`}>
                    <Text
                      className={`text-xs font-bold uppercase ${
                        log.status === 'active' ? 'text-green-600' : 'text-green-700'
                      }`}>
                      {log.status === 'active' ? 'Active' : 'Done'}
                    </Text>
                  </View>
                </View>

                {/* Time Section */}
                <View className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 items-center">
                      <View className="mb-2 rounded-full bg-green-500 p-2">
                        <Ionicons name="arrow-down-circle" size={18} color="white" />
                      </View>
                      <Text className="text-xs font-semibold text-green-600">Time In</Text>
                      <Text className="mt-1 text-base font-extrabold text-gray-900">
                        {log.timeIn}
                      </Text>
                    </View>

                    <View className="mx-3 h-1 flex-1 bg-green-300" />

                    <View className="flex-1 items-center">
                      {log.timeOut ? (
                        <>
                          <View className="mb-2 rounded-full bg-red-500 p-2">
                            <Ionicons name="arrow-up-circle" size={18} color="white" />
                          </View>
                          <Text className="text-xs font-semibold text-green-600">Time Out</Text>
                          <Text className="mt-1 text-base font-extrabold text-gray-900">
                            {log.timeOut}
                          </Text>
                        </>
                      ) : (
                        <>
                          <View className="mb-2 rounded-full bg-yellow-500 p-2">
                            <Ionicons name="time" size={18} color="white" />
                          </View>
                          <Text className="text-xs font-semibold text-yellow-600">In Progress</Text>
                          <Text className="mt-1 text-base font-extrabold text-yellow-600">--</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>

                {/* Footer */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="calendar" size={14} color="#10b981" />
                    <Text className="text-sm font-semibold text-green-700">{log.date}</Text>
                  </View>

                  {log.duration && (
                    <View className="rounded-full border border-blue-300 bg-blue-100 px-3 py-1">
                      <Text className="text-xs font-bold text-blue-700">{log.duration}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="items-center justify-center py-16">
            <Ionicons name="document-outline" size={48} color="#10b981" />
            <Text className="mt-4 text-base font-semibold text-green-600">No logs found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
