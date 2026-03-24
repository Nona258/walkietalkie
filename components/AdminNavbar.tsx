import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, Modal, Pressable, Dimensions } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';

interface AdminNavbarProps {
  activeTab: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
  onNavigate?: (page: string) => void;
  onLogout: () => void;
  pendingUsersCount?: number;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
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

export default function AdminNavbar({ activeTab, setActiveTab, onNavigate, onLogout, pendingUsersCount, isMobileOpen = false, onMobileClose }: AdminNavbarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const sidebarWidth = useRef(new Animated.Value(EXPANDED_WIDTH)).current;
  const isDesktop = Dimensions.get('window').width >= 900;

  useEffect(() => {
    Animated.timing(sidebarWidth, {
      toValue: isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, sidebarWidth]);

  const handleNavPress = (key: any) => {
    setActiveTab(key);
    if (onMobileClose) onMobileClose();
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
                <View className="items-center justify-center w-10 h-10 rounded-full" style={{ backgroundColor: '#237227', shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
                  <Ionicons name="radio" size={20} color="#f8fafb" />
                </View>
                <View>
                  <Text className="text-sm font-bold tracking-tight text-stone-900">WalkieTalkie</Text>
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
                className="items-center justify-center w-8 h-8 rounded-lg"
                style={{ backgroundColor: '#237227' }}
              >
                <Feather name="sidebar" size={18} color="#f8fafb" />
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
          <View className={`bg-stone-50 rounded-xl py-3 mb-2 flex-row items-center ${isExpanded ? 'px-3' : 'px-0 justify-center'}`}>
            <View className={`w-8 h-8 rounded-full items-center justify-center ${isExpanded ? 'mr-3' : ''}`} style={{ backgroundColor: '#237227' }}>
              <Text className="text-xs font-bold" style={{ color: '#f8fafb' }}>AD</Text>
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
      )}

      {/* ── MOBILE DRAWER OVERLAY ── */}
      <Modal visible={isMobileOpen} transparent animationType="fade" onRequestClose={onMobileClose}>
        <Pressable
          style={{ flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.45)' }}
          onPress={onMobileClose}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={{ width: 270, flex: 1, backgroundColor: '#f8fafb', borderRightWidth: 1, borderRightColor: '#e7e5e4' }}>

              {/* Mobile Header */}
              <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#e7e5e4' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#237227', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="radio" size={20} color="#f8fafb" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1c1917' }}>WalkieTalkie</Text>
                      <Text style={{ fontSize: 12, color: '#a8a29e' }}>Admin Console</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={onMobileClose}
                    style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#f5f5f4', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="close" size={18} color="#57534e" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Mobile Nav Items */}
              <ScrollView style={{ flex: 1, paddingHorizontal: 12, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
                {NAV_ITEMS.map((item) => {
                  const isActive = activeTab === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => handleNavPress(item.key as any)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        marginBottom: 2,
                        borderRadius: 10,
                        backgroundColor: isActive ? '#e8f5e9' : 'transparent',
                      }}
                    >
                      {isActive && (
                        <View style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 4, backgroundColor: '#237227' }} />
                      )}
                      <View style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: isActive ? '#f8fafb' : 'transparent' }}>
                        <Ionicons
                          name={(isActive ? item.activeIcon : item.icon) as any}
                          size={18}
                          color={isActive ? '#237227' : '#a8a29e'}
                        />
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: isActive ? '#237227' : '#78716c', flex: 1 }}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <View style={{ marginHorizontal: 8, marginVertical: 12, borderTopWidth: 1, borderTopColor: '#e7e5e4' }} />

                {/* Settings */}
                <TouchableOpacity
                  onPress={() => handleNavPress('settings')}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    marginBottom: 2,
                    borderRadius: 10,
                    backgroundColor: activeTab === 'settings' ? '#e8f5e9' : 'transparent',
                  }}
                >
                  {activeTab === 'settings' && (
                    <View style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 4, backgroundColor: '#237227' }} />
                  )}
                  <View style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: activeTab === 'settings' ? '#f8fafb' : 'transparent' }}>
                    <Ionicons
                      name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
                      size={18}
                      color={activeTab === 'settings' ? '#237227' : '#a8a29e'}
                    />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: activeTab === 'settings' ? '#237227' : '#78716c', flex: 1 }}>
                    Settings
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Mobile Footer */}
              <View style={{ paddingHorizontal: 12, paddingBottom: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e7e5e4' }}>
                <View style={{ backgroundColor: '#f5f5f4', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#237227', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#f8fafb' }}>AD</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#1c1917' }}>Admin User</Text>
                    <Text style={{ fontSize: 12, color: '#a8a29e' }}>Super Admin</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onLogout}
                  activeOpacity={0.7}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 }}
                >
                  <View style={{ width: 32, height: 32, backgroundColor: '#fef2f2', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Ionicons name="log-out-outline" size={16} color="#ef4444" />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#ef4444' }}>Sign Out</Text>
                </TouchableOpacity>
              </View>

            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}