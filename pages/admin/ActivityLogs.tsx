import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';

interface ActivityLogsProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}

// Mock data for design preview
const MOCK_ACTIVITIES = [
  {
    id: 1,
    action: 'New User Registered',
    description: 'John Doe has been added to the system',
    time: '2 mins ago',
    color: '#ecfdf5',
    icon: 'person-add-outline'
  },
  {
    id: 2,
    action: 'Site Update',
    description: 'Main Office security settings updated',
    time: '1 hour ago',
    color: '#ecfdf5',
    icon: 'shield-checkmark-outline'
  }
];

export default function ActivityLogs({ onNavigate }: ActivityLogsProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  return (
    <View className="flex-1 bg-stone-50">
      {/* Main Content Area */}
      <ScrollView className="flex-1 bg-stone-50">
        <View className="bg-white px-5 pt-4 pb-3 border-b border-stone-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity className="lg:hidden w-9 h-9 items-center justify-center mr-3" onPress={() => setIsDrawerOpen(true)}>
                <Ionicons name="menu" size={24} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-lg lg:text-2xl font-bold text-stone-900">Activity Logs</Text>
                <Text className="text-stone-500 text-xs lg:text-sm mt-0.5">Welcome back, Administrator</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2.5">
              <TouchableOpacity className="w-9 h-9 bg-stone-100 rounded-full items-center justify-center" onPress={() => setIsNotificationOpen(true)}>
                <View className="w-2 h-2 bg-red-500 rounded-full absolute top-1.5 right-1.5" />
                <Ionicons name="notifications-outline" size={18} color="#57534e" />
              </TouchableOpacity>
              <View className="w-9 h-9 bg-emerald-100 rounded-full items-center justify-center">
                <Text className="text-emerald-700 font-semibold text-xs">AD</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-5 lg:px-8 py-4 lg:py-6">
          <View className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <View className="px-5 lg:px-6 py-4 lg:py-5 border-b border-stone-100">
              <View className="flex-row items-center justify-between">
                <Text className="text-base lg:text-lg font-bold text-stone-900">Activity Logs</Text>
                <View className="flex-row items-center gap-2 lg:gap-3">
                  <TouchableOpacity className="px-3 lg:px-4 py-2 lg:py-2.5 bg-stone-50 rounded-lg border border-stone-200">
                    <Text className="text-xs lg:text-sm text-stone-600 font-medium">All Activities</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="px-3 lg:px-4 py-2 lg:py-2.5 bg-stone-100 rounded-lg border border-stone-200">
                    <Text className="text-xs lg:text-sm text-stone-700 font-medium">Export</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Activity List Preview */}
            <View className="px-3 lg:px-6 py-3 lg:py-4">
              {MOCK_ACTIVITIES.map((activity, index) => (
                <View key={activity.id} className={`flex-row items-start py-4 lg:py-5 ${index !== MOCK_ACTIVITIES.length - 1 ? 'border-b border-stone-100' : ''}`}>
                  <View className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl items-center justify-center mr-3 lg:mr-4" style={{ backgroundColor: activity.color }}>
                    <Ionicons name={activity.icon as any} size={20} color="#10b981" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm lg:text-base font-semibold text-stone-900 mb-1">{activity.action}</Text>
                    <Text className="text-xs lg:text-sm text-stone-500">{activity.description}</Text>
                  </View>
                  <Text className="text-xs lg:text-sm text-stone-400 ml-3 lg:ml-4 mt-1">{activity.time}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Drawer and Notification Modals left intact as they are part of the UI Design */}
      <Modal visible={isNotificationOpen} transparent animationType="fade" onRequestClose={() => setIsNotificationOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setIsNotificationOpen(false)}>
          <View style={{ width: 320, backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center' }}>
            <Ionicons name="notifications-outline" size={32} color="#10b981" style={{ marginBottom: 12 }} />
            <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#44403c', marginBottom: 8 }}>Notifications</Text>
            <TouchableOpacity style={{ backgroundColor: '#10b981', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24 }} onPress={() => setIsNotificationOpen(false)}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      
      {/* Mobile Drawer Code remains here for design completeness... */}
    </View>
  );
}