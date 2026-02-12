import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';

// Activity log type for fetched data (copied from ActivityLogs)
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

interface AdminDashboardProps {
  onNavigate: (
    page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings'
  ) => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [totalEmployees, setTotalEmployees] = useState<number>(0);
  const [activeSites, setActiveSites] = useState<number>(0);

  // Recent Activity logs state
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    setActivityLoading(true);
    setTimeout(() => {
      setRecentActivities([
        {
          id: 1,
          user_name: 'John Doe',
          initials: 'JD',
          action: 'Logged In',
          description: 'User logged in to the dashboard',
          location: 'HQ',
          time: '2026-02-12T08:00:00Z',
          type: 'login',
          color: '#ccfbf1',
          icon: 'log-in-outline',
        },
        {
          id: 2,
          user_name: 'Jane Smith',
          initials: 'JS',
          action: 'Updated Site',
          description: 'Site details updated',
          location: 'Site 2',
          time: '2026-02-12T09:00:00Z',
          type: 'update',
          color: '#a7f3d0',
          icon: 'create-outline',
        },
      ]);
      setActivityLoading(false);
      setTotalEmployees(186); 
      setActiveSites(32);     
    }, 1000);
  }, []);

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
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl bg-emerald-50"
            onPress={() => onNavigate('dashboard')}
          >
            <Ionicons name="grid-outline" size={20} color="#10b981" />
            <Text className="ml-3 font-medium text-emerald-700">Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('siteManagement')}
          >
            <Ionicons name="location-outline" size={20} color="#78716c" />
            <Text className="ml-3 font-medium text-stone-700">Site Management</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('walkieTalkie')}
          >
            <Ionicons name="mic-outline" size={20} color="#78716c" />
            <Text className="ml-3 font-medium text-stone-700">Walkie Talkie</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('activityLogs')}
          >
            <Ionicons name="clipboard-outline" size={20} color="#78716c" />
            <Text className="ml-3 font-medium text-stone-700">Activity Logs</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('companyList')}
          >
            <Ionicons name="business-outline" size={20} color="#78716c" />
            <Text className="ml-3 font-medium text-stone-700">Company Lists</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('employee')}
          >
            <Ionicons name="people-outline" size={20} color="#78716c" />
            <Text className="ml-3 font-medium text-stone-700">Employees</Text>
          </TouchableOpacity>
          <View className="my-4 border-t border-stone-200" />
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('settings')}
          >
            <Ionicons name="settings-outline" size={20} color="#78716c" />
            <Text className="ml-3 font-medium text-stone-700">Settings</Text>
          </TouchableOpacity>
        </ScrollView>
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
              <TouchableOpacity 
                className="items-center justify-center mr-3 lg:hidden w-9 h-9"
                onPress={() => setIsDrawerOpen(true)}
              >
                <Ionicons name="menu" size={24} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-lg font-bold lg:text-2xl text-stone-900">Dashboard</Text>
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
              <View className="hidden ml-2 lg:flex">
                <Text className="text-sm font-semibold text-stone-900">Admin User</Text>
                <Text className="text-xs text-stone-500">Super Admin</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View className="px-6 py-6">
          <View className="flex-row flex-wrap gap-4 lg:gap-6">
            {/* Total Employees */}
            <View className="bg-white rounded-2xl p-4 lg:p-6 border border-stone-200 flex-1 min-w-[45%] lg:min-w-[200px] lg:max-w-[280px]">
              <View className="flex-row items-center justify-between mb-3">
                <View className="items-center justify-center w-12 h-12 lg:w-14 lg:h-14 bg-emerald-100 rounded-xl">
                  <Ionicons name="people" size={24} color="#10b981" />
                </View>
                <View className="px-2 py-1 rounded-lg bg-emerald-50">
                  <Text className="text-xs font-semibold text-emerald-600">+12%</Text>
                </View>
              </View>
              <Text className="mb-1 text-3xl font-bold lg:text-4xl text-stone-900">{totalEmployees}</Text>
              <Text className="text-sm text-stone-500 lg:text-base">Total Employees</Text>
            </View>

            {/* Active Sites */}
            <View className="bg-white rounded-2xl p-4 lg:p-6 border border-stone-200 flex-1 min-w-[45%] lg:min-w-[200px] lg:max-w-[280px]">
              <View className="flex-row items-center justify-between mb-3">
                <View className="items-center justify-center w-12 h-12 bg-teal-100 lg:w-14 lg:h-14 rounded-xl">
                  <Ionicons name="location" size={24} color="#14b8a6" />
                </View>
                <View className="px-2 py-1 rounded-lg bg-teal-50">
                  <Text className="text-xs font-semibold text-teal-600">+5</Text>
                </View>
              </View>
              <Text className="mb-1 text-3xl font-bold lg:text-4xl text-stone-900">{activeSites}</Text>
              <Text className="text-sm text-stone-500 lg:text-base">Active Sites</Text>
            </View>

            {/* Messages Today */}
            <View className="bg-white rounded-2xl p-4 lg:p-6 border border-stone-200 flex-1 min-w-[45%] lg:min-w-[200px] lg:max-w-[280px]">
              <View className="flex-row items-center justify-between mb-3">
                <View className="items-center justify-center w-12 h-12 lg:w-14 lg:h-14 bg-amber-100 rounded-xl">
                  <Ionicons name="chatbubbles" size={24} color="#f59e0b" />
                </View>
                <View className="px-2 py-1 rounded-lg bg-amber-50">
                  <Text className="text-xs font-semibold text-amber-600">Live</Text>
                </View>
              </View>
              <Text className="mb-1 text-3xl font-bold lg:text-4xl text-stone-900">1,847</Text>
              <Text className="text-sm text-stone-500 lg:text-base">Messages Today</Text>
            </View>

            {/* Active Tracking */}
            <View className="bg-white rounded-2xl p-4 lg:p-6 border border-stone-200 flex-1 min-w-[45%] lg:min-w-[200px] lg:max-w-[280px]">
              <View className="flex-row items-center justify-between mb-3">
                <View className="items-center justify-center w-12 h-12 bg-blue-100 lg:w-14 lg:h-14 rounded-xl">
                  <Ionicons name="map" size={24} color="#3b82f6" />
                </View>
                <View className="px-2 py-1 rounded-lg bg-blue-50">
                  <Text className="text-xs font-semibold text-blue-600">Online</Text>
                </View>
              </View>
              <Text className="mb-1 text-3xl font-bold lg:text-4xl text-stone-900">186</Text>
              <Text className="text-sm text-stone-500 lg:text-base">Active Tracking</Text>
            </View>
          </View>
        </View>

        {/* Desktop Layout - 2 Column Grid */}
        <View className="px-6 lg:flex-row lg:gap-6">
          {/* Left Column */}
          <View className="flex-1">
            {/* Communication Activity */}
            <View className="pb-6">
              <View className="p-5 bg-white border rounded-2xl border-stone-200 lg:p-6">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-lg font-semibold lg:text-xl text-stone-900">Communication Activity</Text>
                  <TouchableOpacity className="flex-row items-center px-3 py-2 rounded-lg bg-stone-50">
                    <Text className="mr-1 text-sm text-stone-600">Last 7 Days</Text>
                    <Ionicons name="chevron-down" size={16} color="#57534e" />
                  </TouchableOpacity>
                </View>
                {/* Simple bar chart representation */}
                <View className="flex-row items-end justify-between h-32 gap-1 lg:h-40">
                  <View className="flex-1 rounded-t-lg bg-emerald-100" style={{ height: '45%' }} />
                  <View className="flex-1 rounded-t-lg bg-emerald-200" style={{ height: '60%' }} />
                  <View className="flex-1 rounded-t-lg bg-emerald-300" style={{ height: '75%' }} />
                  <View className="flex-1 rounded-t-lg bg-emerald-200" style={{ height: '55%' }} />
                  <View className="flex-1 rounded-t-lg bg-emerald-300" style={{ height: '85%' }} />
                  <View className="flex-1 rounded-t-lg bg-emerald-400" style={{ height: '95%' }} />
                  <View className="flex-1 rounded-t-lg bg-emerald-300" style={{ height: '70%' }} />
                </View>
                <View className="flex-row justify-between mt-3">
                  <Text className="text-xs text-stone-400">Mon</Text>
                  <Text className="text-xs text-stone-400">Tue</Text>
                  <Text className="text-xs text-stone-400">Wed</Text>
                  <Text className="text-xs text-stone-400">Thu</Text>
                  <Text className="text-xs text-stone-400">Fri</Text>
                  <Text className="text-xs text-stone-400">Sat</Text>
                  <Text className="text-xs text-stone-400">Sun</Text>
                </View>
              </View>
            </View>

            {/* Live Location Map - Desktop only shows in left column */}
            <View className="hidden pb-6 lg:flex">
              <View className="p-5 bg-white border rounded-2xl border-stone-200 lg:p-6">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-lg font-semibold lg:text-xl text-stone-900">Live Location Map</Text>
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 mr-2 rounded-full bg-emerald-500" />
                    <Text className="text-sm text-stone-600">186 Online</Text>
                  </View>
                </View>
                {/* Map placeholder */}
                <View className="items-center justify-center h-48 bg-stone-100 rounded-xl lg:h-64">
                  <Ionicons name="map-outline" size={48} color="#a8a29e" />
                  <Text className="mt-2 text-stone-400">Map View</Text>
                </View>
                {/* Quick stats */}
                <View className="flex-row justify-between mt-4">
                  <View className="items-center flex-1">
                    <Text className="text-2xl font-bold text-stone-900">32</Text>
                    <Text className="text-xs text-stone-500">Active Sites</Text>
                  </View>
                  <View className="w-px bg-stone-200" />
                  <View className="items-center flex-1">
                    <Text className="text-2xl font-bold text-stone-900">186</Text>
                    <Text className="text-xs text-stone-500">Employees</Text>
                  </View>
                  <View className="w-px bg-stone-200" />
                  <View className="items-center flex-1">
                    <Text className="text-2xl font-bold text-stone-900">12</Text>
                    <Text className="text-xs text-stone-500">Alerts</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Right Column - Recent Activity */}
          <View className="lg:w-96">
            <View className="pb-6">
              <View className="p-5 bg-white border rounded-2xl border-stone-200 lg:p-6">
                <Text className="mb-4 text-lg font-semibold lg:text-xl text-stone-900">Recent Activity</Text>
                {/* Dynamic Recent Activities */}
                {activityLoading ? (
                  <View className="items-center justify-center py-6">
                    <Ionicons name="time-outline" size={32} color="#d6d3d1" />
                    <Text className="mt-2 text-sm text-stone-400">Loading...</Text>
                  </View>
                ) : recentActivities.length === 0 ? (
                  <View className="items-center justify-center py-6">
                    <Ionicons name="document-text-outline" size={32} color="#d6d3d1" />
                    <Text className="mt-2 text-sm text-stone-400">No recent activity</Text>
                  </View>
                ) : (
                  recentActivities.map((activity, idx) => (
                    <View
                      key={activity.id}
                      className={`flex-row items-start${idx !== recentActivities.length - 1 ? ' mb-4' : ''}`}
                    >
                      <View
                        className="items-center justify-center w-10 h-10 mr-3 rounded-xl"
                        style={{ backgroundColor: activity.color }}
                      >
                        <Ionicons name={activity.icon as any} size={18} color="#10b981" />
                      </View>
                      <View className="flex-1">
                        <Text className="mb-1 font-medium text-stone-900">{activity.action}</Text>
                        <Text className="text-sm text-stone-500">{activity.description}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Live Location Map - Mobile only */}
        <View className="px-6 pb-8 lg:hidden">
          <View className="p-5 bg-white border rounded-2xl border-stone-200">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-stone-900">Live Location Map</Text>
              <View className="flex-row items-center">
                <View className="w-2 h-2 mr-2 rounded-full bg-emerald-500" />
                <Text className="text-sm text-stone-600">186 Online</Text>
              </View>
            </View>
            {/* Map placeholder */}
            <View className="items-center justify-center h-48 bg-stone-100 rounded-xl">
              <Ionicons name="map-outline" size={48} color="#a8a29e" />
              <Text className="mt-2 text-stone-400">Map View</Text>
            </View>
            {/* Quick stats */}
            <View className="flex-row justify-between mt-4">
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-stone-900">32</Text>
                <Text className="text-xs text-stone-500">Active Sites</Text>
              </View>
              <View className="w-px bg-stone-200" />
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-stone-900">186</Text>
                <Text className="text-xs text-stone-500">Employees</Text>
              </View>
              <View className="w-px bg-stone-200" />
              <View className="items-center flex-1">
                <Text className="text-2xl font-bold text-stone-900">12</Text>
                <Text className="text-xs text-stone-500">Alerts</Text>
              </View>
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
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl bg-emerald-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('dashboard');
                }}
              >
                <Ionicons name="grid-outline" size={20} color="#10b981" />
                <Text className="ml-3 font-medium text-emerald-700">Dashboard</Text>
              </TouchableOpacity>
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
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('activityLogs');
                }}
              >
                <Ionicons name="clipboard-outline" size={20} color="#78716c" />
                <Text className="ml-3 font-medium text-stone-700">Activity Logs</Text>
              </TouchableOpacity>
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
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('settings');
                }}
              >
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
