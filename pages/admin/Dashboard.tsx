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
import ContactManagement from './ContactManagement';
import ActivityLogs from './ActivityLogs';
import CompanyList from './CompanyList';
import Employees from './Employees';
import Settings from './Settings';
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
  bgColor: string;
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


  const colors = {
    green: '#237227', 
    greenLight: '#237227', 
    greenPale: '#e8f5e9', 
    cloudMist: '#f8fafb',
    white: '#ffffff',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    border: '#e2e8f0',
    black: '#000000',
  };

  // Mock activity data with single green palette
  const MOCK_ACTIVITIES = [
    { id: 1, action: 'Site Check-in', description: 'Recent facility registration', icon: 'location-outline', color: colors.greenPale },
    { id: 2, action: 'New Message', description: 'System broadcast notification', icon: 'chatbubble-outline', color: colors.greenPale },
    { id: 3, action: 'User Added', description: 'New employee assigned', icon: 'person-add-outline', color: colors.greenPale },
    { id: 4, action: 'System Alert', description: 'Activity log generated', icon: 'warning-outline', color: colors.greenPale },
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
      
      // Set statistics with single green color
      setStats([
        { label: 'Total Employees', value: employeesCount, icon: 'people-outline', color: colors.green, bgColor: colors.greenPale },
        { label: 'Active Sites', value: sitesCount, icon: 'location-outline', color: colors.green, bgColor: colors.greenPale },
        { label: 'Messages Today', value: '1,847', icon: 'chatbubbles-outline', color: colors.green, bgColor: colors.greenPale },
        { label: 'Active Tracking', value: onlineCount, icon: 'map-outline', color: colors.green, bgColor: colors.greenPale },
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
    <View 
      className="rounded-xl p-5 lg:p-6 flex-1 min-w-[45%] lg:min-w-[200px]"
      style={{ backgroundColor: item.bgColor }}
    >
      <View className="flex-row items-center justify-between mb-4">
        <View 
          className="items-center justify-center rounded-lg w-11 h-11"
          style={{ backgroundColor: colors.white }}
        >
          <Ionicons name={item.icon as any} size={22} color={item.color} />
        </View>
      </View>
      <Text 
        className="mb-1 text-3xl font-light lg:text-4xl"
        style={{ color: colors.green }}
      >
        {item.value}
      </Text>
      <Text 
        className="text-xs font-medium tracking-wide lg:text-sm"
        style={{ color: colors.green, opacity: 0.7 }}
      >
        {item.label.toUpperCase()}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View className="items-center justify-center flex-1" style={{ backgroundColor: colors.cloudMist }}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  // Render SiteManagement if selected
  if (activeTab === 'siteManagement') {
    return (
      <View className="flex-row flex-1" style={{ backgroundColor: colors.cloudMist }}>
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

  // Render ContactManagement if selected
  if (activeTab === 'walkieTalkie') {
    return (
      <View className="flex-row flex-1" style={{ backgroundColor: colors.cloudMist }}>
        <AdminNavbar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
        <ContactManagement onNavigate={setActiveTab} />
      </View>
    );
  }

  // Render ActivityLogs if selected
  if (activeTab === 'activityLogs') {
    return (
      <View className="flex-row flex-1" style={{ backgroundColor: colors.cloudMist }}>
        <AdminNavbar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
        <ActivityLogs onNavigate={setActiveTab} />
      </View>
    );
  }

  // Render CompanyList if selected
  if (activeTab === 'companyList') {
    return (
      <View className="flex-row flex-1" style={{ backgroundColor: colors.cloudMist }}>
        <AdminNavbar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
        <CompanyList onNavigate={setActiveTab} />
      </View>
    );
  }

  // Render Employees if selected
  if (activeTab === 'employee') {
    return (
      <View className="flex-row flex-1" style={{ backgroundColor: colors.cloudMist }}>
        <AdminNavbar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
        <Employees onNavigate={setActiveTab} />
      </View>
    );
  }

  // Render Settings if selected
  if (activeTab === 'settings') {
    return (
      <View className="flex-row flex-1" style={{ backgroundColor: colors.cloudMist }}>
        <AdminNavbar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
        <Settings onNavigate={setActiveTab} />
      </View>
    );
  }

  return (
    <View className="flex-row flex-1" style={{ backgroundColor: colors.cloudMist }}>
      <AdminNavbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <ScrollView 
        className="flex-1"
        style={{ backgroundColor: colors.cloudMist }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
      >
        {/* Header - Minimalist */}
        <View 
          className="px-6 pt-8 pb-6"
          style={{ backgroundColor: colors.cloudMist, borderBottomWidth: 1, borderBottomColor: colors.border }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text 
                className="mb-1 text-2xl font-light lg:text-3xl"
                style={{ color: colors.black }}
              >
                Dashboard
              </Text>
              <Text 
                className="text-sm lg:text-base"
                style={{ color: colors.black }}
              >
                Welcome back, Administrator
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity 
                className="relative items-center justify-center w-10 h-10 rounded-full"
                style={{ backgroundColor: colors.cloudMist }}
              >
                <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
                <View 
                  className="absolute w-2 h-2 rounded-full top-2 right-2"
                  style={{ backgroundColor: colors.green }}
                />
              </TouchableOpacity>
              <View 
                className="items-center justify-center w-10 h-10 rounded-full"
                style={{ backgroundColor: colors.greenPale }}
              >
                <Text 
                  className="text-sm font-medium"
                  style={{ color: colors.green }}
                >
                  AD
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Grid - Clean spacing */}
        <View className="px-6 py-8">
          <View className="flex-row flex-wrap gap-4">
            {/* Row 1: Total Employees and Active Sites */}
            <View style={{ width: isWebView ? '23.5%' : '48%' }}>
              <StatCard item={stats[0]} />
            </View>
            <View style={{ width: isWebView ? '23.5%' : '48%' }}>
              <StatCard item={stats[1]} />
            </View>
            {/* Row 2: Messages Today and Active Tracking */}
            <View style={{ width: isWebView ? '23.5%' : '48%' }}>
              <StatCard item={stats[2]} />
            </View>
            <View style={{ width: isWebView ? '23.5%' : '48%' }}>
              <StatCard item={stats[3]} />
            </View>
          </View>
        </View>

        <View className="px-6 pb-8 lg:flex-row lg:gap-6">
          {/* Left Column */}
          <View className="flex-1 mb-6 lg:mb-0">
            {/* Communication Activity - Minimalist Chart */}
            <View 
              className="p-6 mb-6 rounded-xl lg:p-7"
              style={{ backgroundColor: colors.white }}
            >
              <View className="flex-row items-center justify-between mb-6">
                <Text 
                  className="text-lg font-light lg:text-xl"
                  style={{ color: colors.textPrimary }}
                >
                  Communication Activity
                </Text>
                <TouchableOpacity 
                  className="flex-row items-center px-3 py-2 rounded-lg"
                  style={{ backgroundColor: colors.cloudMist }}
                >
                  <Text 
                    className="mr-1 text-xs"
                    style={{ color: colors.textSecondary }}
                  >
                    7 Days
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View className="flex-row items-end justify-between gap-2 h-36 lg:h-44">
                {[45, 60, 75, 55, 85, 95, 70].map((h, i) => (
                  <View 
                    key={i} 
                    className="flex-1 rounded-t"
                    style={{ 
                      height: `${h}%`,
                      backgroundColor: i === 5 ? colors.green : colors.greenPale
                    }} 
                  />
                ))}
              </View>
              <View className="flex-row justify-between mt-3">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <Text 
                    key={i} 
                    className="flex-1 text-xs text-center"
                    style={{ color: colors.textTertiary }}
                  >
                    {day}
                  </Text>
                ))}
              </View>
            </View>

            {/* Map Preview - Clean */}
            <View 
              className="p-6 rounded-xl lg:p-7"
              style={{ backgroundColor: colors.white }}
            >
              <Text 
                className="mb-5 text-lg font-light lg:text-xl"
                style={{ color: colors.textPrimary }}
              >
                Live Location Tracking
              </Text>
              <View 
                className="items-center justify-center rounded-lg h-52 lg:h-64"
                style={{ backgroundColor: colors.cloudMist }}
              >
                <View 
                  className="items-center justify-center w-16 h-16 mb-3 rounded-full"
                  style={{ backgroundColor: colors.greenPale }}
                >
                  <Ionicons name="map-outline" size={32} color={colors.green} />
                </View>
                <Text 
                  className="text-sm"
                  style={{ color: colors.textTertiary }}
                >
                  Map view
                </Text>
              </View>
            </View>
          </View>

          {/* Right Column - Recent Activity */}
          <View className="lg:w-96">
            <View 
              className="p-6 rounded-xl lg:p-7"
              style={{ backgroundColor: colors.white }}
            >
              <Text 
                className="mb-5 text-lg font-light lg:text-xl"
                style={{ color: colors.textPrimary }}
              >
                Recent Activity
              </Text>
              {MOCK_ACTIVITIES.map((activity, idx) => (
                <View 
                  key={activity.id} 
                  className={`flex-row items-start ${idx !== MOCK_ACTIVITIES.length - 1 ? 'mb-5 pb-5' : ''}`}
                  style={idx !== MOCK_ACTIVITIES.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.border } : {}}
                >
                  <View 
                    className="items-center justify-center w-10 h-10 mr-4 rounded-lg"
                    style={{ backgroundColor: colors.greenPale }}
                  >
                    <Ionicons name={activity.icon as any} size={18} color={colors.green} />
                  </View>
                  <View className="flex-1">
                    <Text 
                      className="mb-1 text-sm font-medium"
                      style={{ color: colors.textPrimary }}
                    >
                      {activity.action}
                    </Text>
                    <Text 
                      className="text-xs"
                      style={{ color: colors.textSecondary }}
                    >
                      {activity.description}
                    </Text>
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
