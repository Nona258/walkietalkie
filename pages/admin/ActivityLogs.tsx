import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';
import supabase from '../../utils/supabase';

interface ActivityLogsProps {
  onNavigate: (
    page:
      | 'dashboard'
      | 'siteManagement'
      | 'walkieTalkie'
      | 'activityLogs'
      | 'companyList'
      | 'employee'
      | 'settings'
  ) => void;
}

interface Activity {
  id: number;
  user_name: string;
  initials?: string | null;
  action: string;
  description?: string | null;
  location?: string | null;
  time?: string | null;
  type?: string | null;
  color?: string | null;
  icon?: string | null;
}

export default function ActivityLogs({ onNavigate }: ActivityLogsProps) {
  const [, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .order('time', { ascending: false })
          .limit(100);
        if (error) throw error;
        if (mounted) setActivities((data as Activity[]) || []);
      } catch (err: any) {
        console.error('fetch activity_logs error', err);
        if (mounted) setError(err.message || 'Failed to fetch activities');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Filter activities based on search and filter
  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = searchQuery.trim() === '' ||
      (activity.action && activity.action.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (activity.user_name && activity.user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (activity.description && activity.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = activeFilter === 'All' ||
      (activeFilter === ' Contact' && activity.type === 'contact') ||
      (activeFilter === ' Group Chat' && activity.type === 'group');

    return matchesSearch && matchesFilter;
  });

  // Pagination
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentActivities = filteredActivities.slice(startIndex, endIndex);

  return (
    <View className="flex-1 bg-stone-50">
      {/* Main Content Area */}
      <ScrollView className="flex-1 bg-stone-50">
        {/* Header */}
        <View className="px-5 pt-4 pb-3 bg-white border-b border-stone-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity
                className="items-center justify-center mr-3 h-9 w-9 lg:hidden"
                onPress={() => setIsDrawerOpen(true)}>
                <Ionicons name="menu" size={24} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="mb-1 text-xl font-light lg:text-3xl text-stone-900">Activity Logs</Text>
                <Text className="mt-0.5 text-xs text-stone-500 lg:text-sm">
                  Welcome back, Administrator
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Main Content Card */}
        <View className="px-5 py-4 lg:px-8 lg:py-6">
          <View className="overflow-hidden bg-white border rounded-2xl border-stone-200">
            {/* Header with Recent Activity title and Export button */}
            <View className="px-5 py-4 border-b border-stone-100 lg:px-6 lg:py-5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Text className="mr-2 text-base font-bold text-stone-900 lg:text-lg">Recent Activity</Text>
                  <View className="items-center justify-center w-6 h-6 rounded-full" style={{ backgroundColor: '#237227' }}>
                    <Text className="text-xs font-bold" style={{ color: '#f8fafb' }}>{filteredActivities.length}</Text>
                  </View>
                </View>
                <TouchableOpacity className="rounded-lg px-4 py-2 lg:px-5 lg:py-2.5" style={{ backgroundColor: '#237227' }}>
                  <Text className="text-xs font-medium lg:text-sm" style={{ color: '#f8fafb' }}>Export</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Bar */}
            <View className="px-5 py-3 border-b border-stone-100 lg:px-6">
              <View className="flex-row items-center px-3 py-2 border rounded-lg bg-stone-50 border-stone-200">
                <Ionicons name="search" size={16} color="#78716c" className="mr-2" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search logs..."
                  className="flex-1 ml-2 text-sm text-stone-700"
                  placeholderTextColor="#a8a29e"
                />
              </View>
            </View>

            {/* Filter Tabs */}
            <View className="px-5 py-3 border-b border-stone-100 lg:px-6">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {['All', ' Contact', ' Group Chat'].map((filter) => (
                    <TouchableOpacity
                      key={filter}
                      onPress={() => setActiveFilter(filter)}
                      className={`px-4 py-2 rounded-lg border ${
                        activeFilter === filter
                          ? 'border-stone-200'
                          : 'bg-stone-50 border-stone-200'
                      }`}
                      style={activeFilter === filter ? { backgroundColor: '#237227' } : {}}>
                      <Text
                        className={`text-xs font-medium lg:text-sm`}
                        style={{ color: activeFilter === filter ? '#f8fafb' : '#78716c' }}>
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Activity List */}
            <View className="px-3 py-3 lg:px-6 lg:py-4">
              {loading ? (
                <Text className="text-sm text-stone-500">Loading activities...</Text>
              ) : error ? (
                <Text className="text-sm text-red-500">{error}</Text>
              ) : currentActivities.length === 0 ? (
                <Text className="text-sm text-stone-500">No activities found.</Text>
              ) : (
                currentActivities.map((activity, index) => (
                  <View
                    key={activity.id}
                    className={`flex-row items-start py-4 lg:py-5 ${index !== currentActivities.length - 1 ? 'border-b border-stone-100' : ''}`}>
                    <View
                      className="items-center justify-center mr-3 rounded-full w-11 h-11 lg:mr-4"
                      style={{ backgroundColor: '#237227' }}>
                      <Ionicons
                        name={(activity.icon || 'person-outline') as any}
                        size={18}
                        color="#f8fafb"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="mb-1 text-sm font-semibold text-stone-900 lg:text-base">
                        {activity.action}
                      </Text>
                      <Text className="mb-2 text-xs text-stone-500 lg:text-sm">
                        {activity.description || `Action performed by ${activity.user_name}`}
                      </Text>
                      <View className="flex-row items-center">
                        <View className="px-2 py-1 mr-2 rounded-full" style={{ backgroundColor: '#f8fafb', borderWidth: 1, borderColor: '#237227' }}>
                          <Text className="text-xs font-medium" style={{ color: '#237227' }}>
                            {activity.initials || activity.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </Text>
                        </View>
                        <Text className="text-xs text-stone-500">
                          {activity.user_name}
                        </Text>
                      </View>
                    </View>
                    <Text className="mt-1 ml-3 text-xs text-stone-400 lg:ml-4 lg:text-sm">
                      {activity.time ? new Date(activity.time).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : ''}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Pagination */}
            {filteredActivities.length > itemsPerPage && (
              <View className="px-5 py-3 border-t border-stone-100 lg:px-6">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-stone-500">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredActivities.length)} of {filteredActivities.length} activities
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                      onPress={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg border ${currentPage === 1 ? 'border-stone-200 opacity-50' : 'border-stone-300'}`}
                      style={currentPage === 1 ? {} : { backgroundColor: '#f8fafb' }}>
                      <Ionicons
                        name="chevron-back"
                        size={16}
                        color={currentPage === 1 ? '#a8a29e' : '#237227'}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg border ${currentPage === totalPages ? 'border-stone-200 opacity-50' : 'border-stone-300'}`}
                      style={currentPage === totalPages ? {} : { backgroundColor: '#f8fafb' }}>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={currentPage === totalPages ? '#a8a29e' : '#237227'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Notification Modal */}
      <Modal
        visible={isNotificationOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNotificationOpen(false)}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.2)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setIsNotificationOpen(false)}>
          <View
            style={{
              width: 320,
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 24,
              alignItems: 'center',
            }}>
            <Ionicons
              name="notifications-outline"
              size={32}
              color="#10b981"
              style={{ marginBottom: 12 }}
            />
            <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#44403c', marginBottom: 8 }}>
              Notifications
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#10b981',
                borderRadius: 8,
                paddingVertical: 8,
                paddingHorizontal: 24,
              }}
              onPress={() => setIsNotificationOpen(false)}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
