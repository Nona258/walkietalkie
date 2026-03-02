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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      style={{ 
        backgroundColor: item.bgColor,
        padding: isWebView ? 24 : 16,
        borderRadius: 12
      }}
    >
      <View className="flex-row items-center justify-between" style={{ marginBottom: isWebView ? 12 : 8 }}>
        <View 
          style={{ 
            backgroundColor: colors.white,
            width: isWebView ? 44 : 40,
            height: isWebView ? 44 : 40,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Ionicons name={item.icon as any} size={isWebView ? 22 : 18} color={item.color} />
        </View>
      </View>
      <Text 
        style={{ 
          color: colors.green,
          fontSize: isWebView ? 36 : 24,
          fontWeight: '300',
          marginBottom: 4
        }}
      >
        {item.value}
      </Text>
      <Text 
        style={{ 
          color: colors.green,
          opacity: 0.7,
          fontSize: isWebView ? 14 : 11,
          fontWeight: '500',
          letterSpacing: 0.5
        }}
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
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
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
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        <ContactManagement 
          onNavigate={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
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
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        <ActivityLogs 
          onNavigate={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
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
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        <CompanyList 
          onNavigate={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
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
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        <Employees 
          onNavigate={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
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
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        <Settings 
          onNavigate={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
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
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
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
          style={{ 
            backgroundColor: colors.cloudMist, 
            borderBottomWidth: 1, 
            borderBottomColor: colors.border,
            paddingHorizontal: isWebView ? 24 : 16,
            paddingTop: isWebView ? 32 : 16,
            paddingBottom: isWebView ? 24 : 16
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              {!isWebView && (
                <TouchableOpacity 
                  onPress={() => setIsMobileMenuOpen(true)}
                  style={{ 
                    marginRight: 12,
                    width: 40,
                    height: 40,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Ionicons name="menu" size={28} color={colors.green} />
                </TouchableOpacity>
              )}
              <View className="flex-1">
                <Text 
                  className="mb-1 text-xl font-light lg:text-3xl"
                  style={{ color: colors.black }}
                >
                  Dashboard
                </Text>
                <Text 
                  className="text-xs lg:text-base"
                  style={{ color: colors.black }}
                >
                  Welcome back, Administrator
                </Text>
              </View>
            </View>
            <View className="flex-row items-center" style={{ gap: isWebView ? 12 : 8 }}>
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
        <View style={{ paddingHorizontal: isWebView ? 24 : 16, paddingVertical: isWebView ? 32 : 20 }}>
          <View className="flex-row flex-wrap" style={{ marginHorizontal: isWebView ? -8 : -6 }}>
            {stats.map((stat, index) => (
              <View 
                key={index}
                style={{ 
                  width: isWebView ? '25%' : '50%',
                  paddingHorizontal: isWebView ? 8 : 6,
                  marginBottom: isWebView ? 16 : 12
                }}
              >
                <StatCard item={stat} />
              </View>
            ))}
          </View>
        </View>

        <View style={{ 
          paddingHorizontal: isWebView ? 24 : 16, 
          paddingBottom: isWebView ? 32 : 20,
          flexDirection: isWebView ? 'row' : 'column'
        }}>
          {/* Left Column */}
          <View className="flex-1" style={{ marginBottom: isWebView ? 0 : 16, marginRight: isWebView ? 24 : 0 }}>
            {/* Communication Activity - Minimalist Chart */}
            <View 
              style={{ 
                backgroundColor: colors.white,
                padding: isWebView ? 28 : 16,
                borderRadius: 12,
                marginBottom: isWebView ? 24 : 16
              }}
            >
              <View className="flex-row items-center justify-between" style={{ marginBottom: isWebView ? 24 : 16 }}>
                <Text 
                  style={{ 
                    color: colors.textPrimary,
                    fontSize: isWebView ? 20 : 16,
                    fontWeight: '300'
                  }}
                >
                  Communication Activity
                </Text>
                <TouchableOpacity 
                  className="flex-row items-center rounded-lg"
                  style={{ 
                    backgroundColor: colors.cloudMist,
                    paddingHorizontal: isWebView ? 12 : 8,
                    paddingVertical: isWebView ? 8 : 6
                  }}
                >
                  <Text 
                    className="text-xs"
                    style={{ color: colors.textSecondary, marginRight: 4 }}
                  >
                    7 Days
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View className="flex-row items-end justify-between" style={{ gap: isWebView ? 8 : 4, height: isWebView ? 176 : 120 }}>
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
              style={{ 
                backgroundColor: colors.white,
                padding: isWebView ? 28 : 16,
                borderRadius: 12
              }}
            >
              <Text 
                style={{ 
                  color: colors.textPrimary,
                  fontSize: isWebView ? 20 : 16,
                  fontWeight: '300',
                  marginBottom: isWebView ? 20 : 16
                }}
              >
                Live Location Tracking
              </Text>
              <View 
                className="items-center justify-center rounded-lg"
                style={{ 
                  backgroundColor: colors.cloudMist,
                  height: isWebView ? 256 : 180
                }}
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
          <View style={{ width: isWebView ? 384 : '100%' }}>
            <View 
              style={{ 
                backgroundColor: colors.white,
                padding: isWebView ? 28 : 16,
                borderRadius: 12
              }}
            >
              <Text 
                style={{ 
                  color: colors.textPrimary,
                  fontSize: isWebView ? 20 : 16,
                  fontWeight: '300',
                  marginBottom: isWebView ? 20 : 16
                }}
              >
                Recent Activity
              </Text>
              {MOCK_ACTIVITIES.map((activity, idx) => (
                <View 
                  key={activity.id} 
                  className="flex-row items-start"
                  style={{
                    marginBottom: idx !== MOCK_ACTIVITIES.length - 1 ? (isWebView ? 20 : 16) : 0,
                    paddingBottom: idx !== MOCK_ACTIVITIES.length - 1 ? (isWebView ? 20 : 16) : 0,
                    borderBottomWidth: idx !== MOCK_ACTIVITIES.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border
                  }}
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
