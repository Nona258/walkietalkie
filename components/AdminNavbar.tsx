import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, Modal, Pressable, Dimensions } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';

interface AdminNavbarProps {
  activeTab:
    | 'dashboard'
    | 'siteManagement'
    | 'walkieTalkie'
    | 'activityLogs'
    | 'companyList'
    | 'employee'
    | 'employeeLogs'
    | 'technicalSupport'
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
      | 'technicalSupport'
      | 'settings'
  ) => void;
  onNavigate?: (page: string) => void;
  onLogout: () => void;
  pendingUsersCount?: number;
  // Mobile menu props
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
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
  isMobileOpen = false,
  onMobileClose,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}: AdminNavbarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const sidebarWidth = useRef(new Animated.Value(EXPANDED_WIDTH)).current;
  const isDesktop = Dimensions.get('window').width >= 900;

  // Determine the actual mobile-open state and a unified close handler
  const mobileOpen = typeof isMobileMenuOpen === 'boolean' ? isMobileMenuOpen : isMobileOpen;
  const handleMobileClose = () => {
    if (typeof onMobileClose === 'function') return onMobileClose();
    if (typeof setIsMobileMenuOpen === 'function') return setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    Animated.timing(sidebarWidth, {
      toValue: isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, sidebarWidth]);

  const handleNavPress = (key: any) => {
    setActiveTab(key);
    handleMobileClose();
  };

  return (
    <>
      {/* ── DESKTOP SIDEBAR (hidden on mobile, visible on lg+) ── */}
      {isDesktop && (
      <Animated.View
        className="border-r border-stone-100 bg-[#f8fafb]"
        style={{
          width: sidebarWidth,
          backgroundColor: '#f8fafb',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
          elevation: 12, // for Android shadow
        }}
      >
        {/* Branding Header */}
        <View className="px-5 pt-6 pb-5 border-b border-stone-100">
          {isExpanded ? (
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View
                  className="items-center justify-center w-10 h-10 rounded-full bg-[#237227]"
                  style={{
                    shadowColor: '#10b981',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                  }}
                >
                  <Ionicons name="radio" size={20} color="#f8fafb" />
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
                className="items-center justify-center w-8 h-8 rounded-lg bg-stone-100"
              >
                <Ionicons name="close" size={18} color="#57534e" />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="items-center">
              <TouchableOpacity
                onPress={() => setIsExpanded(true)}
                activeOpacity={0.8}
                className="items-center justify-center w-8 h-8 rounded-lg bg-[#237227]"
              >
                <Feather name="sidebar" size={18} color="#f8fafb" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Navigation Items */}
        <ScrollView
          className={`flex-1 ${isExpanded ? 'px-3' : 'px-2 pt-3'}`}
          showsVerticalScrollIndicator={false}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setActiveTab(item.key as any)}
                activeOpacity={0.7}
                className={`flex-row items-center py-2.5 mb-0.5 rounded-lg ${
                  isExpanded ? 'px-3' : 'px-0 justify-center'
                } ${isActive ? 'bg-[#e8f5e9]' : ''}`}
              >
                {isActive && (
                  <View className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-[#237227]" />
                )}
                <View
                  className={`w-8 h-8 rounded-lg items-center justify-center ${
                    isExpanded ? 'mr-3' : ''
                  } ${isActive ? 'bg-[#f8fafb]' : 'bg-transparent'}`}
                >
                  <Ionicons
                    name={(isActive ? item.activeIcon : item.icon) as any}
                    size={18}
                    color={isActive ? '#237227' : '#a8a29e'}
                  />
                </View>
                {isExpanded && (
                  <Text
                    className={`text-sm font-medium flex-1 ${
                      isActive ? 'text-[#237227]' : 'text-stone-500'
                    }`}
                  >
                    {item.label}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}

          <View className="mx-2 my-3 border-t border-stone-100" />

          {/* Settings */}
          <TouchableOpacity
            className={`flex-row items-center py-2.5 mb-0.5 rounded-lg ${
              isExpanded ? 'px-3' : 'px-0 justify-center'
            } ${activeTab === 'settings' ? 'bg-[#e8f5e9]' : ''}`}
            onPress={() => setActiveTab('settings')}
            activeOpacity={0.7}
          >
            {activeTab === 'settings' && (
              <View className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-[#237227]" />
            )}
            <View
              className={`w-8 h-8 rounded-lg items-center justify-center ${
                isExpanded ? 'mr-3' : ''
              } ${activeTab === 'settings' ? 'bg-[#f8fafb]' : 'bg-transparent'}`}
            >
              <Ionicons
                name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
                size={18}
                color={activeTab === 'settings' ? '#237227' : '#a8a29e'}
              />
            </View>
            {isExpanded && (
              <Text
                className={`text-sm font-medium flex-1 ${
                  activeTab === 'settings' ? 'text-[#237227]' : 'text-stone-500'
                }`}
              >
                Settings
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Footer */}
        <View className={`pb-5 pt-3 border-t border-stone-100 ${isExpanded ? 'px-3' : 'px-2'}`}>
          <View
            className={`bg-stone-50 rounded-xl py-3 mb-2 flex-row items-center ${
              isExpanded ? 'px-3' : 'px-0 justify-center'
            }`}
          >
            <View
              className={`w-8 h-8 rounded-full items-center justify-center bg-[#237227] ${
                isExpanded ? 'mr-3' : ''
              }`}
            >
              <Text className="text-xs font-bold text-[#f8fafb]">AD</Text>
            </View>
            {isExpanded && (
              <View className="flex-1">
                <Text className="text-xs font-semibold text-stone-800">Admin User</Text>
                <Text className="text-xs text-stone-400">Super Admin</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            className={`flex-row items-center py-2.5 rounded-lg ${
              isExpanded ? 'px-3' : 'px-0 justify-center'
            }`}
            onPress={onLogout}
            activeOpacity={0.7}
          >
            <View
              className={`w-8 h-8 bg-red-50 rounded-lg items-center justify-center ${
                isExpanded ? 'mr-3' : ''
              }`}
            >
              <Ionicons name="log-out-outline" size={16} color="#ef4444" />
            </View>
            {isExpanded && <Text className="text-sm font-medium text-red-500">Sign Out</Text>}
          </TouchableOpacity>
        </View>
      </Animated.View>
      )}

      {/* ── MOBILE DRAWER OVERLAY ── */}
      <Modal visible={mobileOpen} transparent animationType="fade" onRequestClose={handleMobileClose}>
        <Pressable
          className="flex-row flex-1 bg-black/45"
          onPress={handleMobileClose}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <View className="w-[270px] flex-1 bg-[#f8fafb] border-r border-stone-200">

              {/* Mobile Header */}
              <View className="px-5 pt-6 pb-5 border-b border-stone-200">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-[#237227] items-center justify-center">
                      <Ionicons name="radio" size={20} color="#f8fafb" />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-stone-900">WalkieTalkie</Text>
                      <Text className="text-xs text-stone-400">Admin Console</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={handleMobileClose}
                    className="items-center justify-center w-8 h-8 rounded-lg bg-stone-100"
                  >
                    <Ionicons name="close" size={18} color="#57534e" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Mobile Nav Items */}
              <ScrollView className="flex-1 px-3 pt-2" showsVerticalScrollIndicator={false}>
                {NAV_ITEMS.map((item) => {
                  const isActive = activeTab === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => handleNavPress(item.key as any)}
                      activeOpacity={0.7}
                      className={`flex-row items-center py-2.5 px-3 mb-0.5 rounded-lg ${
                        isActive ? 'bg-[#e8f5e9]' : 'bg-transparent'
                      }`}
                    >
                      {isActive && (
                        <View className="absolute left-0 top-2 bottom-2 w-0.5 rounded bg-[#237227]" />
                      )}
                      <View
                        className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${
                          isActive ? 'bg-[#f8fafb]' : 'bg-transparent'
                        }`}
                      >
                        <Ionicons
                          name={(isActive ? item.activeIcon : item.icon) as any}
                          size={18}
                          color={isActive ? '#237227' : '#a8a29e'}
                        />
                      </View>
                      <Text
                        className={`text-sm font-medium flex-1 ${
                          isActive ? 'text-[#237227]' : 'text-stone-500'
                        }`}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <View className="mx-2 my-3 border-t border-stone-200" />

                {/* Settings */}
                <TouchableOpacity
                  onPress={() => handleNavPress('settings')}
                  activeOpacity={0.7}
                  className={`flex-row items-center py-2.5 px-3 mb-0.5 rounded-lg ${
                    activeTab === 'settings' ? 'bg-[#e8f5e9]' : 'bg-transparent'
                  }`}
                >
                  {activeTab === 'settings' && (
                    <View className="absolute left-0 top-2 bottom-2 w-0.5 rounded bg-[#237227]" />
                  )}
                  <View
                    className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${
                      activeTab === 'settings' ? 'bg-[#f8fafb]' : 'bg-transparent'
                    }`}
                  >
                    <Ionicons
                      name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
                      size={18}
                      color={activeTab === 'settings' ? '#237227' : '#a8a29e'}
                    />
                  </View>
                  <Text
                    className={`text-sm font-medium flex-1 ${
                      activeTab === 'settings' ? 'text-[#237227]' : 'text-stone-500'
                    }`}
                  >
                    Settings
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Mobile Footer */}
              <View className="px-3 pt-3 pb-5 border-t border-stone-200">
                <View className="flex-row items-center px-3 py-3 mb-2 bg-stone-100 rounded-xl">
                  <View className="w-8 h-8 rounded-full bg-[#237227] items-center justify-center mr-3">
                    <Text className="text-xs font-bold text-[#f8fafb]">AD</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-stone-900">Admin User</Text>
                    <Text className="text-xs text-stone-400">Super Admin</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onLogout}
                  activeOpacity={0.7}
                  className="flex-row items-center py-2.5 px-3 rounded-lg"
                >
                  <View className="items-center justify-center w-8 h-8 mr-3 rounded-lg bg-red-50">
                    <Ionicons name="log-out-outline" size={16} color="#ef4444" />
                  </View>
                  <Text className="text-sm font-medium text-red-500">Sign Out</Text>
                </TouchableOpacity>
              </View>

            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}