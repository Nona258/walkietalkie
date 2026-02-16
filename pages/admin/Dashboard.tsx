import React, { useState, useEffect } from 'react';

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
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';
import supabase from '../../utils/supabase';

interface AdminDashboardProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
  onLogout?: () => void; // Add logout callback prop
}

export default function AdminDashboard({ onNavigate, onLogout }: AdminDashboardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [totalEmployees, setTotalEmployees] = useState<number>(0);
  const [activeSites, setActiveSites] = useState<number>(0);

  // Recent Activity logs state
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    // Fetch recent activity logs (limit 4 for dashboard)
    const fetchRecentLogs = async () => {
      setActivityLoading(true);
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('time', { ascending: false })
        .limit(4);
      if (!error && data) setRecentActivities(data);
      setActivityLoading(false);
    };
    fetchRecentLogs();

    // Fetch total employees with role 'employee'
    const fetchTotalEmployees = async () => {
      const { count, error } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'employee');
      if (!error && typeof count === 'number') setTotalEmployees(count);
    };
    fetchTotalEmployees();
  }, []);

  useEffect(() => {
    // Fetch total employees
    // Removed fetchEmployees, static employee count
    // Fetch active sites
    const fetchSites = async () => {
      const { count, error } = await supabase
        .from('sites')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Active');
      if (!error && typeof count === 'number') setActiveSites(count);
    };
    // Removed fetchEmployees()
    fetchSites();
  }, []);

  // Logout function
  const handleLogout = async () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) {
                console.error('Logout error:', error.message);
                Alert.alert('Error', 'Failed to logout. Please try again.');
                return;
              }
              
              // Close any open modals
              setIsDrawerOpen(false);
              setIsNotificationOpen(false);
              
              // Call the onLogout callback if provided
              if (onLogout) {
                onLogout();
              }
            } catch (err) {
              console.error('Unexpected logout error:', err);
              Alert.alert('Error', 'An unexpected error occurred.');
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 flex-row bg-stone-50">
      {/* Desktop Sidebar - Hidden on mobile */}
      <View className="hidden lg:flex w-72 bg-white border-r border-stone-200">
        {/* Sidebar Header */}
        <View className="bg-emerald-50 px-6 pt-8 pb-6 border-b border-emerald-100">
          <View className="flex-row items-center gap-3">
            <View className="w-14 h-14 bg-emerald-100 rounded-2xl items-center justify-center">
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
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl bg-emerald-50"
            onPress={() => onNavigate('dashboard')}
          >
            <Ionicons name="grid-outline" size={20} color="#10b981" />
            <Text className="ml-3 text-emerald-700 font-medium">Dashboard</Text>
          </TouchableOpacity>

          {/* Site Management */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('siteManagement')}
          >
            <Ionicons name="location-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Site Management</Text>
          </TouchableOpacity>

          {/* Walkie Talkie */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('walkieTalkie')}
          >
            <Ionicons name="mic-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Walkie Talkie</Text>
          </TouchableOpacity>

          {/* Activity Logs */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('activityLogs')}
          >
            <Ionicons name="clipboard-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Activity Logs</Text>
          </TouchableOpacity>

          {/* Company Lists */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('companyList')}
          >
            <Ionicons name="business-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Company Lists</Text>
          </TouchableOpacity>

          {/* Employees */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('employee')}
          >
            <Ionicons name="people-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Employees</Text>
          </TouchableOpacity>

          <View className="border-t border-stone-200 my-4" />

          {/* Settings */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('settings')}
          >
            <Ionicons name="settings-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Settings</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Sign Out */}
        <View className="px-4 pb-6 pt-4 border-t border-stone-200">
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 rounded-xl"
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            <Text className="ml-3 text-red-600 font-medium">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView className="flex-1 bg-stone-50">
        {/* Header */}
        <View className="bg-white px-5 pt-4 pb-3 border-b border-stone-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              {/* Mobile Menu Button - Hidden on desktop */}
              <TouchableOpacity 
                className="lg:hidden w-9 h-9 items-center justify-center mr-3"
                onPress={() => setIsDrawerOpen(true)}
              >
                <Ionicons name="menu" size={24} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-lg lg:text-2xl font-bold text-stone-900">Dashboard</Text>
                <Text className="text-stone-500 text-xs lg:text-sm mt-0.5">Welcome back, Administrator</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2.5">
              <TouchableOpacity
                className="w-9 h-9 bg-stone-100 rounded-full items-center justify-center"
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
              <View className="w-9 h-9 bg-emerald-100 rounded-full items-center justify-center">
                <Text className="text-emerald-700 font-semibold text-xs">AD</Text>
              </View>
              {/* Desktop User Info - Hidden on mobile */}
              <View className="hidden lg:flex ml-2">
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
                <View className="w-12 h-12 lg:w-14 lg:h-14 bg-emerald-100 rounded-xl items-center justify-center">
                  <Ionicons name="people" size={24} color="#10b981" />
                </View>
                <View className="bg-emerald-50 px-2 py-1 rounded-lg">
                  <Text className="text-emerald-600 text-xs font-semibold">+12%</Text>
                </View>
              </View>
              <Text className="text-3xl lg:text-4xl font-bold text-stone-900 mb-1">{totalEmployees}</Text>
              <Text className="text-stone-500 text-sm lg:text-base">Total Employees</Text>
            </View>

            {/* Active Sites */}
            <View className="bg-white rounded-2xl p-4 lg:p-6 border border-stone-200 flex-1 min-w-[45%] lg:min-w-[200px] lg:max-w-[280px]">
              <View className="flex-row items-center justify-between mb-3">
                <View className="w-12 h-12 lg:w-14 lg:h-14 bg-teal-100 rounded-xl items-center justify-center">
                  <Ionicons name="location" size={24} color="#14b8a6" />
                </View>
                <View className="bg-teal-50 px-2 py-1 rounded-lg">
                  <Text className="text-teal-600 text-xs font-semibold">+5</Text>
                </View>
              </View>
              <Text className="text-3xl lg:text-4xl font-bold text-stone-900 mb-1">{activeSites}</Text>
              <Text className="text-stone-500 text-sm lg:text-base">Active Sites</Text>
            </View>

            {/* Messages Today */}
            <View className="bg-white rounded-2xl p-4 lg:p-6 border border-stone-200 flex-1 min-w-[45%] lg:min-w-[200px] lg:max-w-[280px]">
              <View className="flex-row items-center justify-between mb-3">
                <View className="w-12 h-12 lg:w-14 lg:h-14 bg-amber-100 rounded-xl items-center justify-center">
                  <Ionicons name="chatbubbles" size={24} color="#f59e0b" />
                </View>
                <View className="bg-amber-50 px-2 py-1 rounded-lg">
                  <Text className="text-amber-600 text-xs font-semibold">Live</Text>
                </View>
              </View>
              <Text className="text-3xl lg:text-4xl font-bold text-stone-900 mb-1">1,847</Text>
              <Text className="text-stone-500 text-sm lg:text-base">Messages Today</Text>
            </View>

            {/* Active Tracking */}
            <View className="bg-white rounded-2xl p-4 lg:p-6 border border-stone-200 flex-1 min-w-[45%] lg:min-w-[200px] lg:max-w-[280px]">
              <View className="flex-row items-center justify-between mb-3">
                <View className="w-12 h-12 lg:w-14 lg:h-14 bg-blue-100 rounded-xl items-center justify-center">
                  <Ionicons name="map" size={24} color="#3b82f6" />
                </View>
                <View className="bg-blue-50 px-2 py-1 rounded-lg">
                  <Text className="text-blue-600 text-xs font-semibold">Online</Text>
                </View>
              </View>
              <Text className="text-3xl lg:text-4xl font-bold text-stone-900 mb-1">186</Text>
              <Text className="text-stone-500 text-sm lg:text-base">Active Tracking</Text>
            </View>
          </View>
        </View>

        {/* Desktop Layout - 2 Column Grid */}
        <View className="lg:flex-row lg:gap-6 px-6">
          {/* Left Column */}
          <View className="flex-1">
            {/* Communication Activity */}
            <View className="pb-6">
              <View className="bg-white rounded-2xl border border-stone-200 p-5 lg:p-6">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-lg lg:text-xl font-semibold text-stone-900">Communication Activity</Text>
                  <TouchableOpacity className="flex-row items-center bg-stone-50 px-3 py-2 rounded-lg">
                    <Text className="text-stone-600 text-sm mr-1">Last 7 Days</Text>
                    <Ionicons name="chevron-down" size={16} color="#57534e" />
                  </TouchableOpacity>
                </View>
                
                {/* Simple bar chart representation */}
                <View className="flex-row items-end justify-between h-32 lg:h-40 gap-1">
                  <View className="flex-1 bg-emerald-100 rounded-t-lg" style={{ height: '45%' }} />
                  <View className="flex-1 bg-emerald-200 rounded-t-lg" style={{ height: '60%' }} />
                  <View className="flex-1 bg-emerald-300 rounded-t-lg" style={{ height: '75%' }} />
                  <View className="flex-1 bg-emerald-200 rounded-t-lg" style={{ height: '55%' }} />
                  <View className="flex-1 bg-emerald-300 rounded-t-lg" style={{ height: '85%' }} />
                  <View className="flex-1 bg-emerald-400 rounded-t-lg" style={{ height: '95%' }} />
                  <View className="flex-1 bg-emerald-300 rounded-t-lg" style={{ height: '70%' }} />
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
            <View className="hidden lg:flex pb-6">
              <View className="bg-white rounded-2xl border border-stone-200 p-5 lg:p-6">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-lg lg:text-xl font-semibold text-stone-900">Live Location Map</Text>
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 bg-emerald-500 rounded-full mr-2" />
                    <Text className="text-stone-600 text-sm">186 Online</Text>
                  </View>
                </View>
                
                {/* Map placeholder */}
                <View className="bg-stone-100 rounded-xl h-48 lg:h-64 items-center justify-center">
                  <Ionicons name="map-outline" size={48} color="#a8a29e" />
                  <Text className="text-stone-400 mt-2">Map View</Text>
                </View>
                
                {/* Quick stats */}
                <View className="flex-row justify-between mt-4">
                  <View className="flex-1 items-center">
                    <Text className="text-2xl font-bold text-stone-900">32</Text>
                    <Text className="text-stone-500 text-xs">Active Sites</Text>
                  </View>
                  <View className="w-px bg-stone-200" />
                  <View className="flex-1 items-center">
                    <Text className="text-2xl font-bold text-stone-900">186</Text>
                    <Text className="text-stone-500 text-xs">Employees</Text>
                  </View>
                  <View className="w-px bg-stone-200" />
                  <View className="flex-1 items-center">
                    <Text className="text-2xl font-bold text-stone-900">12</Text>
                    <Text className="text-stone-500 text-xs">Alerts</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Right Column - Recent Activity */}
          <View className="lg:w-96">
            <View className="pb-6">
              <View className="bg-white rounded-2xl border border-stone-200 p-5 lg:p-6">
                <Text className="text-lg lg:text-xl font-semibold text-stone-900 mb-4">Recent Activity</Text>
                
                {/* Dynamic Recent Activities */}
                {activityLoading ? (
                  <View className="items-center justify-center py-6">
                    <Ionicons name="time-outline" size={32} color="#d6d3d1" />
                    <Text className="text-stone-400 mt-2 text-sm">Loading...</Text>
                  </View>
                ) : recentActivities.length === 0 ? (
                  <View className="items-center justify-center py-6">
                    <Ionicons name="document-text-outline" size={32} color="#d6d3d1" />
                    <Text className="text-stone-400 mt-2 text-sm">No recent activity</Text>
                  </View>
                ) : (
                  recentActivities.map((activity, idx) => (
                    <View
                      key={activity.id}
                      className={`flex-row items-start${idx !== recentActivities.length - 1 ? ' mb-4' : ''}`}
                    >
                      <View
                        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                        style={{ backgroundColor: activity.color }}
                      >
                        <Ionicons name={activity.icon as any} size={18} color="#10b981" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-stone-900 font-medium mb-1">{activity.action}</Text>
                        <Text className="text-stone-500 text-sm">{activity.description}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Live Location Map - Mobile only */}
        <View className="lg:hidden px-6 pb-8">
          <View className="bg-white rounded-2xl border border-stone-200 p-5">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-stone-900">Live Location Map</Text>
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-emerald-500 rounded-full mr-2" />
                <Text className="text-stone-600 text-sm">186 Online</Text>
              </View>
            </View>
            
            {/* Map placeholder */}
            <View className="bg-stone-100 rounded-xl h-48 items-center justify-center">
              <Ionicons name="map-outline" size={48} color="#a8a29e" />
              <Text className="text-stone-400 mt-2">Map View</Text>
            </View>
            
            {/* Quick stats */}
            <View className="flex-row justify-between mt-4">
              <View className="flex-1 items-center">
                <Text className="text-2xl font-bold text-stone-900">32</Text>
                <Text className="text-stone-500 text-xs">Active Sites</Text>
              </View>
              <View className="w-px bg-stone-200" />
              <View className="flex-1 items-center">
                <Text className="text-2xl font-bold text-stone-900">186</Text>
                <Text className="text-stone-500 text-xs">Employees</Text>
              </View>
              <View className="w-px bg-stone-200" />
              <View className="flex-1 items-center">
                <Text className="text-2xl font-bold text-stone-900">12</Text>
                <Text className="text-stone-500 text-xs">Alerts</Text>
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
        <View className="flex-1 flex-row">
          {/* Drawer Content */}
          <View className="w-72 bg-white h-full shadow-2xl">
            {/* Drawer Header */}
            <View className="bg-emerald-50 px-6 pt-12 pb-6 border-b border-emerald-100">
              <View className="flex-row items-center gap-3 mb-3">
                <View className="w-14 h-14 bg-emerald-100 rounded-2xl items-center justify-center">
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
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl bg-emerald-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('dashboard');
                }}
              >
                <Ionicons name="grid-outline" size={20} color="#10b981" />
                <Text className="ml-3 text-emerald-700 font-medium">Dashboard</Text>
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
                <Text className="ml-3 text-stone-700 font-medium">Site Management</Text>
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
                <Text className="ml-3 text-stone-700 font-medium">Walkie Talkie</Text>
              </TouchableOpacity>

              {/* Activity Logs */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('activityLogs');
                }}
              >
                <Ionicons name="clipboard-outline" size={20} color="#78716c" />
                <Text className="ml-3 text-stone-700 font-medium">Activity Logs</Text>
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
                <Text className="ml-3 text-stone-700 font-medium">Company Lists</Text>
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
                <Text className="ml-3 text-stone-700 font-medium">Employees</Text>
              </TouchableOpacity>

              <View className="border-t border-stone-200 my-4" />

              {/* Settings */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('settings');
                }}
              >
                <Ionicons name="settings-outline" size={20} color="#78716c" />
                <Text className="ml-3 text-stone-700 font-medium">Settings</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Sign Out */}
            <View className="px-4 pb-6 pt-4 border-t border-stone-200">
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 rounded-xl"
                onPress={() => {
                  setIsDrawerOpen(false);
                  handleLogout();
                }}
              >
                <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                <Text className="ml-3 text-red-600 font-medium">Sign Out</Text>
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