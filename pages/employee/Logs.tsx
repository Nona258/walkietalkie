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
      <View className="bg-white px-6 py-6 pt-12 border-b border-green-200">
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-gray-900 text-3xl font-extrabold">Logs</Text>
            <Text className="text-green-600 text-xs font-semibold mt-1">Track your site activities</Text>
          </View>
          <View className="bg-green-100 rounded-full p-3">
            <Ionicons name="time-outline" size={24} color="#10b981" />
          </View>
        </View>

        {/* Stats Section */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-green-600 text-xs font-semibold">Active Shifts</Text>
                <Text className="text-gray-900 font-extrabold text-2xl mt-1">{activeLogs}</Text>
              </View>
              <View className="w-10 h-10 rounded-full bg-green-500 items-center justify-center">
                <Ionicons name="play-circle" size={20} color="white" />
              </View>
            </View>
          </View>

          <View className="flex-1 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-200">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-blue-600 text-xs font-semibold">Total Hours</Text>
                <Text className="text-gray-900 font-extrabold text-2xl mt-1">{totalHours}h</Text>
              </View>
              <View className="w-10 h-10 rounded-full bg-blue-500 items-center justify-center">
                <Ionicons name="stats-chart" size={20} color="white" />
              </View>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View className={`flex-row items-center rounded-2xl bg-gray-100 px-4 py-3 border-2 ${searchText.length > 0 ? 'border-green-500' : 'border-gray-300'}`}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            placeholder="Search sites..."
            value={searchText}
            onChangeText={setSearchText}
            className="flex-1 ml-3 text-gray-900 text-base font-medium"
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
      <View className="bg-white px-6 py-3 border-b border-green-200 flex-row gap-3">
        {(['all', 'active', 'completed'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            onPress={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-full border-2 ${
              filterStatus === status
                ? 'bg-green-500 border-green-500'
                : 'bg-white border-green-300'
            }`}
          >
            <Text
              className={`font-semibold text-sm capitalize ${
                filterStatus === status ? 'text-white' : 'text-green-700'
              }`}
            >
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
        bounces={false}
      >
        {filteredLogs.length > 0 ? (
          <View className="gap-3">
            {filteredLogs.map((log) => (
              <TouchableOpacity
                key={log.id}
                className="bg-white rounded-3xl p-5 shadow-sm border-2 border-green-200 active:scale-95"
                activeOpacity={0.7}
              >
                {/* Header */}
                <View className="flex-row items-start justify-between mb-4">
                  <View className="flex-1">
                    <Text className="text-gray-900 font-extrabold text-lg">{log.siteName}</Text>
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="location-sharp" size={13} color="#10b981" />
                      <Text className="text-green-600 text-xs font-semibold ml-1">
                        {log.location}
                      </Text>
                    </View>
                  </View>

                  {/* Status Badge */}
                  <View
                    className={`rounded-full px-3 py-2 border-2 ${
                      log.status === 'active'
                        ? 'bg-green-100 border-green-500'
                        : 'bg-green-50 border-green-300'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold uppercase ${
                        log.status === 'active'
                          ? 'text-green-600'
                          : 'text-green-700'
                      }`}
                    >
                      {log.status === 'active' ? 'Active' : 'Done'}
                    </Text>
                  </View>
                </View>

                {/* Time Section */}
                <View className="bg-green-50 rounded-2xl p-4 mb-4 border border-green-200">
                  <View className="flex-row items-center justify-between">
                    <View className="items-center flex-1">
                      <View className="bg-green-500 rounded-full p-2 mb-2">
                        <Ionicons name="arrow-down-circle" size={18} color="white" />
                      </View>
                      <Text className="text-green-600 text-xs font-semibold">Time In</Text>
                      <Text className="text-gray-900 font-extrabold text-base mt-1">
                        {log.timeIn}
                      </Text>
                    </View>

                    <View className="h-1 bg-green-300 flex-1 mx-3" />

                    <View className="items-center flex-1">
                      {log.timeOut ? (
                        <>
                          <View className="bg-red-500 rounded-full p-2 mb-2">
                            <Ionicons name="arrow-up-circle" size={18} color="white" />
                          </View>
                          <Text className="text-green-600 text-xs font-semibold">Time Out</Text>
                          <Text className="text-gray-900 font-extrabold text-base mt-1">
                            {log.timeOut}
                          </Text>
                        </>
                      ) : (
                        <>
                          <View className="bg-yellow-500 rounded-full p-2 mb-2">
                            <Ionicons name="time" size={18} color="white" />
                          </View>
                          <Text className="text-yellow-600 text-xs font-semibold">In Progress</Text>
                          <Text className="text-yellow-600 font-extrabold text-base mt-1">--</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>

                {/* Footer */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="calendar" size={14} color="#10b981" />
                    <Text className="text-green-700 text-sm font-semibold">{log.date}</Text>
                  </View>

                  {log.duration && (
                    <View className="bg-blue-100 rounded-full px-3 py-1 border border-blue-300">
                      <Text className="text-blue-700 text-xs font-bold">{log.duration}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="items-center justify-center py-16">
            <Ionicons name="document-outline" size={48} color="#10b981" />
            <Text className="text-green-600 text-base mt-4 font-semibold">No logs found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}