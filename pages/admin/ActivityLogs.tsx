import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';
//import { supabase } from '../../utils/supabase';

interface ActivityLogsProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}


// Activity log type for fetched data
interface ActivityLog {
  id: number;
  user_name: string;
  initials: string;
  action: string;
  description: string;
  location: string;
  time: string;
  type: string;
  color: string;
  icon: string;
}


export default function ActivityLogs({ onNavigate }: ActivityLogsProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  /*
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('time', { ascending: false });
      if (!error && data) setActivities(data);
      setLoading(false);
    };
    fetchLogs();
  }, []);
  */
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || activity.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <View className="flex-row flex-1 bg-stone-50">
      {/* Desktop Sidebar - Hidden on mobile */}
      <View className="hidden bg-white border-r lg:flex w-72 border-stone-200">
        {/* Sidebar Header */}
        <View className="px-6 pt-8 pb-6 border-b bg-emerald-50 border-emerald-100">
          <View className="flex-row items-center gap-3">
            <View className="items-center justify-center w-14 h-14 bg-emerald-100 rounded-2xl">
              <Ionicons name="chatbubble" size={24} color="#10b981" />
            </View>
            <View>
              <Text className="text-base font-bold text-stone-900">Admin Portal</Text>
              <Text className="text-xs text-stone-500">Monitoring System</Text>
            </View>
          </View>
        </View>

        {/* Desktop Menu Items */}
        <ScrollView className="flex-1 px-4 py-4">
          {/* Dashboard */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('dashboard')}
          >
            <Ionicons name="grid-outline" size={20} color="#78716c" />
            <Text className="ml-3 font-medium text-stone-700">Dashboard</Text>
          </TouchableOpacity>

          {/* Site Management */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('siteManagement')}
          >
            <Ionicons name="location-outline" size={20} color="#78716c" />
            <Text className="ml-3 font-medium text-stone-700">Site Management</Text>
          </TouchableOpacity>

          {/* Walkie Talkie */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('walkieTalkie')}
          >
            <Ionicons name="mic-outline" size={20} color="#78716c" />
            <Text className="ml-3 font-medium text-stone-700">Walkie Talkie</Text>
          </TouchableOpacity>

          {/* Activity Logs */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl bg-emerald-50"
            onPress={() => onNavigate('activityLogs')}
          >
            <Ionicons name="clipboard-outline" size={20} color="#10b981" />
            <Text className="ml-3 font-medium text-emerald-700">Activity Logs</Text>
          </TouchableOpacity>

          {/* Company Lists */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('companyList')}
          >
            <Ionicons name="business-outline" size={20} color="#78716c" />
            <Text className="ml-3 font-medium text-stone-700">Company Lists</Text>
          </TouchableOpacity>

          {/* Employees */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('employee')}
          >
            <Ionicons name="people-outline" size={20} color="#78716c" />
            <Text className="ml-3 font-medium text-stone-700">Employees</Text>
          </TouchableOpacity>

          <View className="my-4 border-t border-stone-200" />

          {/* Settings */}
          <TouchableOpacity className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50" onPress={() => onNavigate('settings')}>
            <Ionicons name="settings-outline" size={20} color="#78716c" />
            <Text className="ml-3 font-medium text-stone-700">Settings</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Sign Out */}
        <View className="px-4 pt-4 pb-6 border-t border-stone-200">
          <TouchableOpacity className="flex-row items-center px-4 py-3 rounded-xl">
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            <Text className="ml-3 font-medium text-red-600">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView className="flex-1 bg-stone-50">
        {/* Header */}
        <View className="px-5 pt-4 pb-3 bg-white border-b border-stone-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              {/* Mobile Menu Button - Hidden on desktop */}
              <TouchableOpacity 
                className="items-center justify-center mr-3 lg:hidden w-9 h-9"
                onPress={() => setIsDrawerOpen(true)}
              >
                <Ionicons name="menu" size={24} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-lg font-bold lg:text-2xl text-stone-900">Activity Logs</Text>
                <Text className="text-stone-500 text-xs lg:text-sm mt-0.5">Welcome back, Administrator</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2.5">
              <TouchableOpacity
                className="items-center justify-center rounded-full w-9 h-9 bg-stone-100"
                onPress={() => setIsNotificationOpen(true)}
                activeOpacity={0.7}
              >
                <View className="w-2 h-2 bg-red-500 rounded-full absolute top-1.5 right-1.5" />
                <Ionicons name="notifications-outline" size={18} color="#57534e" />
              </TouchableOpacity>
                    {/* Notification Modal */}
                    <Modal
                      visible={isNotificationOpen}
                      transparent
                      animationType="fade"
                      onRequestClose={() => setIsNotificationOpen(false)}
                    >
                      <Pressable
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => setIsNotificationOpen(false)}
                      >
                        <View
                          style={{
                            width: 320,
                            backgroundColor: 'rgba(255,255,255,0.85)',
                            borderRadius: 16,
                            padding: 24,
                            alignItems: 'center',
                          }}
                        >
                          <Ionicons name="notifications-outline" size={32} color="#10b981" style={{ marginBottom: 12 }} />
                          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#44403c', marginBottom: 8 }}>Notifications</Text>
                          <Text style={{ color: '#57534e', textAlign: 'center', marginBottom: 16 }}>
                            You have no new notifications.
                          </Text>
                          <TouchableOpacity
                            style={{ backgroundColor: '#10b981', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24 }}
                            onPress={() => setIsNotificationOpen(false)}
                          >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Close</Text>
                          </TouchableOpacity>
                        </View>
                      </Pressable>
                    </Modal>
              <View className="items-center justify-center rounded-full w-9 h-9 bg-emerald-100">
                <Text className="text-xs font-semibold text-emerald-700">AD</Text>
              </View>
              {/* Desktop User Info - Hidden on mobile */}
              <View className="hidden ml-2 lg:flex">
                <Text className="text-sm font-semibold text-stone-900">Admin User</Text>
                <Text className="text-xs text-stone-500">Super Admin</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Activity Logs Content Container */}
        <View className="px-5 py-4 lg:px-8 lg:py-6">
          {/* Desktop Card Container */}
          <View className="overflow-hidden bg-white border rounded-2xl border-stone-200">
            {/* Card Header with Filter & Export */}
            <View className="px-5 py-4 border-b lg:px-6 lg:py-5 border-stone-100">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold lg:text-lg text-stone-900">Activity Logs</Text>
                <View className="flex-row items-center gap-2 lg:gap-3">
                  <TouchableOpacity 
                    className="px-3 lg:px-4 py-2 lg:py-2.5 bg-stone-50 rounded-lg border border-stone-200"
                    onPress={() => setFilterType('all')}
                  >
                    <Text className="text-xs font-medium lg:text-sm text-stone-600">All Activities</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="px-3 lg:px-4 py-2 lg:py-2.5 bg-stone-100 rounded-lg border border-stone-200"
                    onPress={() => {/* Export logic */}}
                  >
                    <Text className="text-xs font-medium lg:text-sm text-stone-700">Export</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Activity List */}
            <View className="px-3 py-3 lg:px-6 lg:py-4">
              {filteredActivities.length === 0 ? (
                <View className="items-center justify-center flex-1 py-12">
                  <Ionicons name="document-text-outline" size={48} color="#d6d3d1" />
                  <Text className="mt-3 text-sm text-stone-400">No activities found</Text>
                </View>
              ) : (
                filteredActivities.map((activity, index) => (
                  <View 
                    key={activity.id} 
                    className={`flex-row items-start py-4 lg:py-5 ${
                      index !== filteredActivities.length - 1 ? 'border-b border-stone-100' : ''
                    }`}
                  >
                    {/* Icon */}
                    <View 
                      className="items-center justify-center w-12 h-12 mr-3 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl lg:mr-4"
                      style={{ backgroundColor: activity.color }}
                    >
                      <Ionicons name={activity.icon as any} size={20} color="#10b981" />
                    </View>

                    {/* Content */}
                    <View className="flex-1">
                      <Text className="mb-1 text-sm font-semibold lg:text-base text-stone-900">
                        {activity.action}
                      </Text>
                      <Text className="text-xs lg:text-sm text-stone-500">
                        {activity.description}
                      </Text>
                    </View>

                    {/* Time */}
                    <Text className="mt-1 ml-3 text-xs lg:text-sm text-stone-400 lg:ml-4">
                      {activity.time}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Mobile Drawer Modal */}
      <Modal
        visible={isDrawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <View className="flex-row flex-1">
          {/* Drawer Content */}
          <View className="h-full bg-white shadow-2xl w-72">
            {/* Drawer Header */}
            <View className="px-6 pt-12 pb-6 border-b bg-emerald-50 border-emerald-100">
              <View className="flex-row items-center gap-3 mb-3">
                <View className="items-center justify-center w-14 h-14 bg-emerald-100 rounded-2xl">
                  <Ionicons name="chatbubble" size={24} color="#10b981" />
                </View>
                <View>
                  <Text className="text-base font-bold text-stone-900">Admin Portal</Text>
                  <Text className="text-xs text-stone-500">Monitoring System</Text>
                </View>
              </View>
            </View>

            {/* Menu Items */}
            <ScrollView className="flex-1 px-4 py-4">
              {/* Dashboard */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('dashboard');
                }}
              >
                <Ionicons name="grid-outline" size={20} color="#78716c" />
                <Text className="ml-3 font-medium text-stone-700">Dashboard</Text>
              </TouchableOpacity>

              {/* Site Management */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('siteManagement');
                }}
              >
                <Ionicons name="location-outline" size={20} color="#78716c" />
                <Text className="ml-3 font-medium text-stone-700">Site Management</Text>
              </TouchableOpacity>

              {/* Walkie Talkie */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('walkieTalkie');
                }}
              >
                <Ionicons name="mic-outline" size={20} color="#78716c" />
                <Text className="ml-3 font-medium text-stone-700">Walkie Talkie</Text>
              </TouchableOpacity>

              {/* Activity Logs */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl bg-emerald-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('activityLogs');
                }}
              >
                <Ionicons name="clipboard-outline" size={20} color="#10b981" />
                <Text className="ml-3 font-medium text-emerald-700">Activity Logs</Text>
              </TouchableOpacity>

              {/* Company Lists */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('companyList');
                }}
              >
                <Ionicons name="business-outline" size={20} color="#78716c" />
                <Text className="ml-3 font-medium text-stone-700">Company Lists</Text>
              </TouchableOpacity>

              {/* Employees */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('employee');
                }}
              >
                <Ionicons name="people-outline" size={20} color="#78716c" />
                <Text className="ml-3 font-medium text-stone-700">Employees</Text>
              </TouchableOpacity>

              <View className="my-4 border-t border-stone-200" />

              {/* Settings */}
              <TouchableOpacity className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50" onPress={() => onNavigate('settings')}>
                <Ionicons name="settings-outline" size={20} color="#78716c" />
                <Text className="ml-3 font-medium text-stone-700">Settings</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Sign Out */}
            <View className="px-4 pt-4 pb-6 border-t border-stone-200">
              <TouchableOpacity className="flex-row items-center px-4 py-3 rounded-xl">
                <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                <Text className="ml-3 font-medium text-red-600">Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Overlay - Close drawer when tapped */}
          <Pressable 
            className="flex-1 bg-black/40" 
            onPress={() => setIsDrawerOpen(false)}
          />
        </View>
      </Modal>
    </View>
  );
}