import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../utils/supabase';
import AdminNavbar from '../../components/AdminNavbar';
import SiteManagement from './SiteManagement';
import '../../global.css';

interface AdminDashboardProps {
  onLogout: () => void;
  onNavigate?: (page: string) => void;
}

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
}

interface Site {
  id: string;
  name: string;
  location: string;
  branch_id?: string;
}

interface Activity {
  id?: number;
  action: string;
  description?: string;
  icon?: string;
  color?: string;
  created_at?: string;
}

export default function AdminDashboard({ onLogout, onNavigate }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings'>('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const windowWidth = Dimensions.get('window').width;
  const isWebView = windowWidth > 900;

  // Mock activity data for recent activity display
  const MOCK_ACTIVITIES = [
    { id: 1, action: 'Site Check-in', description: 'Recent facility registration', icon: 'location-outline', color: '#ecfdf5' },
    { id: 2, action: 'New Message', description: 'System broadcast notification', icon: 'chatbubble-outline', color: '#fffbeb' },
    { id: 3, action: 'User Added', description: 'New employee assigned', icon: 'person-add-outline', color: '#eff6ff' },
    { id: 4, action: 'System Alert', description: 'Activity log generated', icon: 'warning-outline', color: '#fef2f2' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch users
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Fetch sites
      const { data: sitesData } = await supabase
        .from('sites')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Count employees (non-admin users)
      const employeesCount = usersData?.filter(u => u.role !== 'admin').length || 0;
      const adminCount = usersData?.filter(u => u.role === 'admin').length || 0;
      const onlineCount = usersData?.filter(u => u.status === 'online').length || 0;
      const sitesCount = sitesData?.length || 0;
      
      // Set statistics
      setStats([
        { label: 'Total Employees', value: employeesCount, icon: 'people', color: '#10b981' },
        { label: 'Active Sites', value: sitesCount, icon: 'location', color: '#14b8a6' },
        { label: 'Messages Today', value: '1,847', icon: 'chatbubbles', color: '#f59e0b' },
        { label: 'Active Tracking', value: onlineCount, icon: 'map', color: '#3b82f6' },
      ]);

      if (usersData) {
        setUsers(usersData);
        setEmployees(usersData.filter(u => u.role !== 'admin'));
      }
      
      if (sitesData) {
        setSites(sitesData);
      }

      // Fetch recent activities
      const { data: logsData } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (logsData) {
        setActivities(logsData);
      }
    } catch (error) {
      console.error('Error fetching admin dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchData().then(() => setRefreshing(false));
  }, []);

  const StatCard = ({ item }: { item: StatCard }) => (
    <View className="bg-white rounded-2xl p-4 lg:p-6 border border-stone-200 flex-1 min-w-[45%] lg:min-w-[200px]">
      <View className="flex-row items-center justify-between mb-3">
        <View 
          className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl items-center justify-center"
          style={{ 
            backgroundColor: item.color + '20',
          }}
        >
          <Ionicons name={item.icon as any} size={24} color={item.color} />
        </View>
        <View className="bg-stone-50 px-2 py-1 rounded-lg">
          <Text className="text-stone-600 text-xs font-semibold">+5</Text>
        </View>
      </View>
      <Text className="text-3xl lg:text-4xl font-bold text-stone-900 mb-1">{item.value}</Text>
      <Text className="text-stone-500 text-sm lg:text-base">{item.label}</Text>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  // Render SiteManagement if selected
  if (activeTab === 'siteManagement') {
    return (
      <View className="flex-1 flex-row bg-stone-50">
        <AdminNavbar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
        <SiteManagement onNavigate={setActiveTab} />
      </View>
    );
  }

  return (
    <View className="flex-1 flex-row bg-stone-50">
      <AdminNavbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <ScrollView 
        className="flex-1 bg-stone-50"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="bg-white px-5 pt-4 pb-3 border-b border-stone-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity className="lg:hidden w-9 h-9 items-center justify-center mr-3">
                <Ionicons name="menu" size={24} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-lg lg:text-2xl font-bold text-stone-900">Dashboard</Text>
                <Text className="text-stone-500 text-xs lg:text-sm mt-0.5">Welcome back, Administrator</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2.5">
              <TouchableOpacity className="w-9 h-9 bg-stone-100 rounded-full items-center justify-center">
                <View className="w-2 h-2 bg-red-500 rounded-full absolute top-1.5 right-1.5" />
                <Ionicons name="notifications-outline" size={18} color="#57534e" />
              </TouchableOpacity>
              <View className="w-9 h-9 bg-emerald-100 rounded-full items-center justify-center">
                <Text className="text-emerald-700 font-semibold text-xs">AD</Text>
              </View>
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
            {stats.map((stat, index) => (
              <View key={index} style={{ width: isWebView ? '23%' : '48%' }}>
                <StatCard item={stat} />
              </View>
            ))}
          </View>
        </View>

        <View className="lg:flex-row lg:gap-6 px-6 pb-6">
          {/* Left Column */}
          <View className="flex-1 mb-6 lg:mb-0">
            <View className="bg-white rounded-2xl border border-stone-200 p-5 lg:p-6 mb-6">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg lg:text-xl font-semibold text-stone-900">Communication Activity</Text>
                <View className="flex-row items-center bg-stone-50 px-3 py-2 rounded-lg">
                  <Text className="text-stone-600 text-sm mr-1">Last 7 Days</Text>
                  <Ionicons name="chevron-down" size={16} color="#57534e" />
                </View>
              </View>
              <View className="flex-row items-end justify-between h-32 lg:h-40 gap-1">
                {[45, 60, 75, 55, 85, 95, 70].map((h, i) => (
                  <View key={i} className="flex-1 bg-emerald-100 rounded-t-lg" style={{ height: `${h}%` }} />
                ))}
              </View>
            </View>

            <View className="bg-white rounded-2xl border border-stone-200 p-5 lg:p-6 mb-6">
              <Text className="text-lg lg:text-xl font-semibold text-stone-900 mb-4">Live Location Map</Text>
              <View className="bg-stone-100 rounded-xl h-48 lg:h-64 items-center justify-center">
                <Ionicons name="map-outline" size={48} color="#a8a29e" />
                <Text className="text-stone-400 mt-2">Map Interface Preview</Text>
              </View>
            </View>
          </View>

          {/* Right Column */}
          <View className="lg:w-96">
            <View className="bg-white rounded-2xl border border-stone-200 p-5 lg:p-6">
              <Text className="text-lg lg:text-xl font-semibold text-stone-900 mb-4">Recent Activity</Text>
              {MOCK_ACTIVITIES.map((activity, idx) => (
                <View key={activity.id} className={`flex-row items-start ${idx !== MOCK_ACTIVITIES.length - 1 ? 'mb-4' : ''}`}>
                  <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: activity.color }}>
                    <Ionicons name={activity.icon as any} size={18} color="#10b981" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-stone-900 font-medium mb-1">{activity.action}</Text>
                    <Text className="text-stone-500 text-sm">{activity.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
