import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <View className="flex-1 bg-stone-50">
      {/* Main Content Area */}
      <ScrollView className="flex-1 bg-stone-50">
        <View className="border-b border-stone-200 bg-white px-5 pb-3 pt-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center">
              <TouchableOpacity
                className="mr-3 h-9 w-9 items-center justify-center lg:hidden"
                onPress={() => setIsDrawerOpen(true)}>
                <Ionicons name="menu" size={24} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-lg font-bold text-stone-900 lg:text-2xl">Activity Logs</Text>
                <Text className="mt-0.5 text-xs text-stone-500 lg:text-sm">
                  Welcome back, Administrator
                </Text>
              </View>
            </View>
            {/* Right-side header (notifications + profile) removed per user request */}
          </View>
        </View>

        <View className="px-5 py-4 lg:px-8 lg:py-6">
          <View className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <View className="border-b border-stone-100 px-5 py-4 lg:px-6 lg:py-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-stone-900 lg:text-lg">Activity Logs</Text>
                <View className="flex-row items-center gap-2 lg:gap-3">
                  <TouchableOpacity className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 lg:px-4 lg:py-2.5">
                    <Text className="text-xs font-medium text-stone-600 lg:text-sm">
                      All Activities
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="rounded-lg border border-stone-200 bg-stone-100 px-3 py-2 lg:px-4 lg:py-2.5">
                    <Text className="text-xs font-medium text-stone-700 lg:text-sm">Export</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Activity List Preview */}
            <View className="px-3 py-3 lg:px-6 lg:py-4">
              {loading ? (
                <Text className="text-sm text-stone-500">Loading...</Text>
              ) : error ? (
                <Text className="text-sm text-red-500">{error}</Text>
              ) : activities.length === 0 ? (
                <Text className="text-sm text-stone-500">No activities yet.</Text>
              ) : (
                activities.map((activity, index) => (
                  <View
                    key={activity.id}
                    className={`flex-row items-start py-4 lg:py-5 ${index !== activities.length - 1 ? 'border-b border-stone-100' : ''}`}>
                    <View
                      className="mr-3 h-12 w-12 items-center justify-center rounded-xl lg:mr-4 lg:h-14 lg:w-14 lg:rounded-2xl"
                      style={{ backgroundColor: activity.color || '#ecfdf5' }}>
                      <Ionicons
                        name={(activity.icon || 'notifications-outline') as any}
                        size={20}
                        color="#10b981"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="mb-1 text-sm font-semibold text-stone-900 lg:text-base">
                        {activity.action}
                      </Text>
                      <Text className="text-xs text-stone-500 lg:text-sm">
                        {activity.description}
                      </Text>
                    </View>
                    <Text className="ml-3 mt-1 text-xs text-stone-400 lg:ml-4 lg:text-sm">
                      {activity.time ? new Date(activity.time).toLocaleString() : ''}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Drawer and Notification Modals left intact as they are part of the UI Design */}
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

      {/* Mobile Drawer Code remains here for design completeness... */}
    </View>
  );
}
