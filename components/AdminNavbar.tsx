import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';

interface AdminNavbarProps {
  activeTab: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
  onNavigate?: (page: string) => void;
  onLogout: () => void;
  pendingUsersCount?: number;
}

const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'grid-outline', activeIcon: 'grid', key: 'dashboard' },
  { label: 'Site Management', icon: 'location-outline', activeIcon: 'location', key: 'siteManagement' },
  { label: 'Contact Management', icon: 'mail-outline', activeIcon: 'mail', key: 'walkieTalkie' },
  { label: 'Activity Logs', icon: 'clipboard-outline', activeIcon: 'clipboard', key: 'activityLogs' },
  { label: 'Company Lists', icon: 'business-outline', activeIcon: 'business', key: 'companyList' },
  { label: 'Employees', icon: 'people-outline', activeIcon: 'people', key: 'employee' },
] as const;

const EXPANDED_WIDTH = 256;
const COLLAPSED_WIDTH = 72;

export default function AdminNavbar({ activeTab, setActiveTab, onNavigate, onLogout, pendingUsersCount }: AdminNavbarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const sidebarWidth = useRef(new Animated.Value(EXPANDED_WIDTH)).current;

  useEffect(() => {
    Animated.timing(sidebarWidth, {
      toValue: isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, sidebarWidth]);

  return (
    <Animated.View
      className="hidden lg:flex bg-white border-r border-stone-100"
      style={{
        width: sidebarWidth,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      }}
    >
      {/* Branding Header */}
      <View className="px-5 pt-6 pb-5 border-b border-stone-100">
        {isExpanded ? (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 bg-emerald-500 rounded-xl items-center justify-center" style={{ shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
                <Ionicons name="radio" size={20} color="#ffffff" />
              </View>
              <View>
                <Text className="text-sm font-bold text-stone-900 tracking-tight">WalkieTalkie</Text>
                <Text className="text-xs text-stone-400 font-medium">Admin Console</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIsExpanded(false)}
              activeOpacity={0.8}
              className="w-8 h-8 rounded-lg items-center justify-center bg-stone-100"
            >
              <Ionicons name="close" size={18} color="#57534e" />
            </TouchableOpacity>
          </View>
        ) : (
          <View className="items-center">
            <TouchableOpacity
              onPress={() => setIsExpanded(true)}
              activeOpacity={0.8}
              className="w-8 h-8 rounded-lg items-center justify-center bg-emerald-50"
            >
              <Feather name="sidebar" size={18} color="#059669" />
            </TouchableOpacity>
          </View>
        )}
      </View>



      {/* Navigation Items */}
      <ScrollView className={`flex-1 ${isExpanded ? 'px-3' : 'px-2 pt-3'}`} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => setActiveTab(item.key as any)}
              activeOpacity={0.7}
              className={`flex-row items-center py-2.5 mb-0.5 rounded-lg ${isExpanded ? 'px-3' : 'px-0 justify-center'} ${isActive ? 'bg-emerald-50' : ''}`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <View className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-full" />
              )}
              <View className={`w-8 h-8 rounded-lg items-center justify-center ${isExpanded ? 'mr-3' : ''} ${isActive ? 'bg-emerald-100' : 'bg-transparent'}`}>
                <Ionicons
                  name={(isActive ? item.activeIcon : item.icon) as any}
                  size={18}
                  color={isActive ? '#059669' : '#a8a29e'}
                />
              </View>
              {isExpanded && (
                <Text className={`text-sm font-medium flex-1 ${isActive ? 'text-emerald-700' : 'text-stone-500'}`}>
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
          className={`flex-row items-center py-2.5 mb-0.5 rounded-lg ${isExpanded ? 'px-3' : 'px-0 justify-center'} ${activeTab === 'settings' ? 'bg-emerald-50' : ''}`}
          onPress={() => setActiveTab('settings')}
          activeOpacity={0.7}
        >
          {activeTab === 'settings' && (
            <View className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-full" />
          )}
          <View className={`w-8 h-8 rounded-lg items-center justify-center ${isExpanded ? 'mr-3' : ''} ${activeTab === 'settings' ? 'bg-emerald-100' : 'bg-transparent'}`}>
            <Ionicons
              name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
              size={18}
              color={activeTab === 'settings' ? '#059669' : '#a8a29e'}
            />
          </View>
          {isExpanded && (
            <Text className={`text-sm font-medium flex-1 ${activeTab === 'settings' ? 'text-emerald-700' : 'text-stone-500'}`}>
              Settings
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Footer - Admin Profile & Sign Out */}
      <View className={`pb-5 pt-3 border-t border-stone-100 ${isExpanded ? 'px-3' : 'px-2'}`}>
        <View className={`bg-stone-50 rounded-xl py-3 mb-2 flex-row items-center ${isExpanded ? 'px-3' : 'px-0 justify-center'}`}>
          <View className={`w-8 h-8 bg-emerald-500 rounded-lg items-center justify-center ${isExpanded ? 'mr-3' : ''}`}>
            <Text className="text-white font-bold text-xs">AD</Text>
          </View>
          {isExpanded && (
            <View className="flex-1">
              <Text className="text-xs font-semibold text-stone-800">Admin User</Text>
              <Text className="text-xs text-stone-400">Super Admin</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          className={`flex-row items-center py-2.5 rounded-lg ${isExpanded ? 'px-3' : 'px-0 justify-center'}`}
          onPress={onLogout}
          activeOpacity={0.7}
        >
          <View className={`w-8 h-8 bg-red-50 rounded-lg items-center justify-center ${isExpanded ? 'mr-3' : ''}`}>
            <Ionicons name="log-out-outline" size={16} color="#ef4444" />
          </View>
          {isExpanded && <Text className="text-sm font-medium text-red-500">Sign Out</Text>}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
