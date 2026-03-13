import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';

interface ActivityLogsProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}

const MOCK_ACTIVITIES = [
  { id: 1, action: 'New User Registered', description: 'John Doe has been added to the system', time: '2 mins ago', color: '#ecfdf5', icon: 'person-add-outline', type: 'user' },
  { id: 2, action: 'Site Updated', description: 'Main Office location settings updated', time: '1 hour ago', color: '#ecfdf5', icon: 'location-outline', type: 'site' },
  { id: 3, action: 'Employee Check-In', description: 'Maria Santos checked in at Site A', time: '2 hours ago', color: '#ecfdf5', icon: 'checkmark-circle-outline', type: 'checkin' },
  { id: 4, action: 'Company Added', description: 'Global Logistics has been registered', time: '3 hours ago', color: '#ecfdf5', icon: 'business-outline', type: 'company' },
  { id: 5, action: 'System Backup', description: 'Automatic backup completed successfully', time: '5 hours ago', color: '#f0fdf4', icon: 'cloud-upload-outline', type: 'system' },
];

const TYPE_COLORS: Record<string, { bg: string; icon: string }> = {
  user:    { bg: '#ecfdf5', icon: '#10b981' },
  site:    { bg: '#f0f9ff', icon: '#0ea5e9' },
  checkin: { bg: '#fef9c3', icon: '#ca8a04' },
  company: { bg: '#fdf4ff', icon: '#a855f7' },
  system:  { bg: '#ecfdf5', icon: '#10b981' },
};

export default function ActivityLogs({ onNavigate }: ActivityLogsProps) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  return (
    <View className="flex-1 bg-stone-50">
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-white px-6 pt-5 pb-4 border-b border-stone-100">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xl font-bold text-stone-900 tracking-tight">Activity Logs</Text>
              <Text className="text-stone-400 text-xs mt-0.5 font-medium">System events & actions</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity className="w-9 h-9 bg-stone-50 border border-stone-100 rounded-lg items-center justify-center" onPress={() => setIsNotificationOpen(true)}>
                <View className="w-2 h-2 bg-red-400 rounded-full absolute top-1.5 right-1.5" />
                <Ionicons name="notifications-outline" size={17} color="#78716c" />
              </TouchableOpacity>
              <View className="flex-row items-center gap-2 bg-stone-50 border border-stone-100 rounded-lg px-2.5 py-1.5">
                <View className="w-6 h-6 bg-emerald-500 rounded-md items-center justify-center">
                  <Text className="text-white font-bold text-xs">AD</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className="px-6 py-5">
          <View
            className="bg-white rounded-xl border border-stone-100 overflow-hidden"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}
          >
            {/* Card Header */}
            <View className="px-5 py-4 border-b border-stone-100 flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-semibold text-stone-900">Recent Events</Text>
                <Text className="text-xs text-stone-400 mt-0.5">{MOCK_ACTIVITIES.length} activities recorded</Text>
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity className="flex-row items-center gap-1.5 px-3 py-2 bg-stone-50 border border-stone-100 rounded-lg">
                  <Ionicons name="filter-outline" size={13} color="#78716c" />
                  <Text className="text-xs text-stone-600 font-medium">Filter</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <Ionicons name="download-outline" size={13} color="#059669" />
                  <Text className="text-xs text-emerald-700 font-semibold">Export</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Activity List */}
            <View className="px-5">
              {MOCK_ACTIVITIES.map((activity, index) => {
                const colors = TYPE_COLORS[activity.type] || TYPE_COLORS.system;
                return (
                  <View
                    key={activity.id}
                    className={`flex-row items-center py-3.5 ${index !== MOCK_ACTIVITIES.length - 1 ? 'border-b border-stone-50' : ''}`}
                  >
                    <View
                      className="w-9 h-9 rounded-lg items-center justify-center mr-3"
                      style={{ backgroundColor: colors.bg }}
                    >
                      <Ionicons name={activity.icon as any} size={16} color={colors.icon} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-stone-800">{activity.action}</Text>
                      <Text className="text-xs text-stone-400 mt-0.5">{activity.description}</Text>
                    </View>
                    <View className="bg-stone-50 border border-stone-100 px-2 py-1 rounded-md ml-3">
                      <Text className="text-xs text-stone-400 font-medium">{activity.time}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Load More */}
            <View className="px-5 py-4 border-t border-stone-50">
              <TouchableOpacity className="flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg border border-stone-100">
                <Text className="text-xs text-stone-500 font-medium">Load more events</Text>
                <Ionicons name="chevron-down" size={13} color="#a8a29e" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Notification Modal */}
      <Modal visible={isNotificationOpen} transparent animationType="fade" onRequestClose={() => setIsNotificationOpen(false)}>
        <Pressable className="flex-1 bg-black/30 justify-center items-center px-5" onPress={() => setIsNotificationOpen(false)}>
          <View className="bg-white w-full max-w-xs rounded-2xl overflow-hidden" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40 }}>
            <View className="px-6 pt-6 pb-4 items-center border-b border-stone-100">
              <View className="w-12 h-12 bg-emerald-50 rounded-xl items-center justify-center mb-3">
                <Ionicons name="notifications" size={22} color="#10b981" />
              </View>
              <Text className="font-bold text-stone-900 text-base">Notifications</Text>
            </View>
            <View className="px-6 py-5 items-center">
              <Text className="text-stone-400 text-sm text-center">You have no new notifications.</Text>
            </View>
            <View className="px-6 pb-6">
              <TouchableOpacity className="bg-emerald-500 w-full py-3 rounded-lg items-center" onPress={() => setIsNotificationOpen(false)}>
                <Text className="text-white font-semibold text-sm">Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}