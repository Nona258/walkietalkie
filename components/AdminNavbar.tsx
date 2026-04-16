import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, Image } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import supabase from '../utils/supabase';

interface AdminNavbarProps {
  activeTab:
    | 'dashboard'
    | 'siteManagement'
    | 'walkieTalkie'
    | 'activityLogs'
    | 'companyList'
    | 'employee'
    | 'employeeLogs'
    | 'technicalSupport'   // added
    | 'settings';
  setActiveTab: (
    tab:
      | 'dashboard'
      | 'siteManagement'
      | 'walkieTalkie'
      | 'activityLogs'
      | 'companyList'
      | 'employee'
      | 'employeeLogs'
      | 'technicalSupport'   // added
      | 'settings'
  ) => void;
  onNavigate?: (page: string) => void;
  onLogout: () => void;
  pendingUsersCount?: number;
}

const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'grid-outline', activeIcon: 'grid', key: 'dashboard' },
  {
    label: 'Site Management',
    icon: 'location-outline',
    activeIcon: 'location',
    key: 'siteManagement',
  },
  { label: 'Contact Management', icon: 'mail-outline', activeIcon: 'mail', key: 'walkieTalkie' },
  {
    label: 'Activity Logs',
    icon: 'clipboard-outline',
    activeIcon: 'clipboard',
    key: 'activityLogs',
  },
  { label: 'Company Lists', icon: 'business-outline', activeIcon: 'business', key: 'companyList' },
  { label: 'Employees', icon: 'people-outline', activeIcon: 'people', key: 'employee' },
  { label: 'Attendance Log', icon: 'time-outline', activeIcon: 'time', key: 'employeeLogs' },
  // New Technical Support item
  {label: 'Technical Issue', icon: 'construct-outline', activeIcon: 'construct', key: 'technicalSupport' },

] as const;

const EXPANDED_WIDTH = 256;
const COLLAPSED_WIDTH = 72;

export default function AdminNavbar({
  activeTab,
  setActiveTab,
  onNavigate,
  onLogout,
  pendingUsersCount,
}: AdminNavbarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const sidebarWidth = useRef(new Animated.Value(EXPANDED_WIDTH)).current;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayInitials, setDisplayInitials] = useState('AD');
  const [displayName, setDisplayName] = useState('Admin User');
  const [displayRole, setDisplayRole] = useState('Super Admin');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        const userId = user?.id;
        if (!userId) return;

        const { data: dbUser, error } = await supabase
          .from('users')
          .select('full_name, role, profile_picture_url')
          .eq('id', userId)
          .single();
        if (error || !dbUser) return;

        const name = dbUser.full_name || user.user_metadata?.full_name || user.email || 'Admin User';
        setDisplayName(name);
        setDisplayRole(dbUser.role || 'Super Admin');

        const initials = String(name)
          .split(' ')
          .map((p) => p?.[0] || '')
          .join('')
          .toUpperCase()
          .slice(0, 2);
        setDisplayInitials(initials || 'AD');

        const picPath = dbUser.profile_picture_url || user.user_metadata?.profile_picture || null;
        if (!picPath) return;

        if (String(picPath).startsWith('http://') || String(picPath).startsWith('https://')) {
          setAvatarUrl(`${picPath}?t=${Date.now()}`);
          return;
        }

        const relative = String(picPath).replace(/^profile_picture\//, '');
        const { data: publicData } = supabase.storage.from('profile_picture').getPublicUrl(relative);
        if (publicData?.publicUrl) {
          setAvatarUrl(`${publicData.publicUrl}?t=${Date.now()}`);
        }
      } catch (e) {
        // ignore load errors
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    Animated.timing(sidebarWidth, {
      toValue: isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, sidebarWidth]);

  return (
    <Animated.View
      className="hidden border-r border-stone-100 bg-white lg:flex"
      style={{
        width: sidebarWidth,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      }}>
      {/* Branding Header */}
      <View className="border-b border-stone-100 px-5 pb-5 pt-6">
        {isExpanded ? (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View
                className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-500"
                style={{
                  shadowColor: '#10b981',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                }}>
                <Ionicons name="radio" size={20} color="#ffffff" />
              </View>
              <View>
                <Text className="text-sm font-bold tracking-tight text-stone-900">
                  WalkieTalkie
                </Text>
                <Text className="text-xs font-medium text-stone-400">Admin Console</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIsExpanded(false)}
              activeOpacity={0.8}
              className="h-8 w-8 items-center justify-center rounded-lg bg-stone-100">
              <Ionicons name="close" size={18} color="#57534e" />
            </TouchableOpacity>
          </View>
        ) : (
          <View className="items-center">
            <TouchableOpacity
              onPress={() => setIsExpanded(true)}
              activeOpacity={0.8}
              className="h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <Feather name="sidebar" size={18} color="#059669" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Navigation Items */}
      <ScrollView
        className={`flex-1 ${isExpanded ? 'px-3' : 'px-2 pt-3'}`}
        showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => setActiveTab(item.key as any)}
              activeOpacity={0.7}
              className={`mb-0.5 flex-row items-center rounded-lg py-2.5 ${isExpanded ? 'px-3' : 'justify-center px-0'} ${isActive ? 'bg-emerald-50' : ''}`}>
              {/* Active indicator bar */}
              {isActive && (
                <View className="absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-emerald-500" />
              )}
              <View
                className={`h-8 w-8 items-center justify-center rounded-lg ${isExpanded ? 'mr-3' : ''} ${isActive ? 'bg-emerald-100' : 'bg-transparent'}`}>
                <Ionicons
                  name={(isActive ? item.activeIcon : item.icon) as any}
                  size={18}
                  color={isActive ? '#059669' : '#a8a29e'}
                />
              </View>
              {isExpanded && (
                <Text
                  className={`flex-1 text-sm font-medium ${isActive ? 'text-emerald-700' : 'text-stone-500'}`}>
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Divider */}
        <View className="mx-2 my-3 border-t border-stone-100" />

        {/* Settings */}
        <TouchableOpacity
          className={`mb-0.5 flex-row items-center rounded-lg py-2.5 ${isExpanded ? 'px-3' : 'justify-center px-0'} ${activeTab === 'settings' ? 'bg-emerald-50' : ''}`}
          onPress={() => setActiveTab('settings')}
          activeOpacity={0.7}>
          {activeTab === 'settings' && (
            <View className="absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-emerald-500" />
          )}
          <View
            className={`h-8 w-8 items-center justify-center rounded-lg ${isExpanded ? 'mr-3' : ''} ${activeTab === 'settings' ? 'bg-emerald-100' : 'bg-transparent'}`}>
            <Ionicons
              name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
              size={18}
              color={activeTab === 'settings' ? '#059669' : '#a8a29e'}
            />
          </View>
          {isExpanded && (
            <Text
              className={`flex-1 text-sm font-medium ${activeTab === 'settings' ? 'text-emerald-700' : 'text-stone-500'}`}>
              Settings
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Footer - Admin Profile & Sign Out */}
      <View className={`border-t border-stone-100 pb-5 pt-3 ${isExpanded ? 'px-3' : 'px-2'}`}>
        <View
          className={`mb-2 flex-row items-center rounded-xl bg-stone-50 py-3 ${isExpanded ? 'px-3' : 'justify-center px-0'}`}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              className={`${isExpanded ? 'mr-3' : ''} h-8 w-8 rounded-lg`}
              style={{ resizeMode: 'cover' }}
            />
          ) : (
            <View
              className={`h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 ${isExpanded ? 'mr-3' : ''}`}>
              <Text className="text-xs font-bold text-white">{displayInitials}</Text>
            </View>
          )}
          {isExpanded && (
            <View className="flex-1">
              <Text className="text-xs font-semibold text-stone-800">{displayName}</Text>
              <Text className="text-xs text-stone-400">{displayRole}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          className={`flex-row items-center rounded-lg py-2.5 ${isExpanded ? 'px-3' : 'justify-center px-0'}`}
          onPress={onLogout}
          activeOpacity={0.7}>
          <View
            className={`h-8 w-8 items-center justify-center rounded-lg bg-red-50 ${isExpanded ? 'mr-3' : ''}`}>
            <Ionicons name="log-out-outline" size={16} color="#ef4444" />
          </View>
          {isExpanded && <Text className="text-sm font-medium text-red-500">Sign Out</Text>}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}