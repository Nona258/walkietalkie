import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AdminNavbarProps {
  activeTab: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
  onNavigate?: (page: string) => void;
  onLogout: () => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

export default function AdminNavbar({ activeTab, setActiveTab, onNavigate, onLogout, isMobileMenuOpen, setIsMobileMenuOpen }: AdminNavbarProps) {
  const windowWidth = Dimensions.get('window').width;
  const isWebView = windowWidth > 900;

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    if (setIsMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  const NavContent = () => (
    <View className="flex-1 bg-[#f8fafb]">
      {/* Header */}
      <View className="bg-[#e8f5e9] px-6 pt-8 pb-6 border-b border-emerald-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="items-center justify-center w-14 h-14 bg-[#f8fafb] rounded-2xl">
              <Ionicons name="chatbubble" size={24} color="#237227" />
            </View>
            <View>
              <Text className="text-base font-bold text-stone-900">Admin Portal</Text>
              <Text className="text-xs text-stone-500">Monitoring System</Text>
            </View>
          </View>
          {!isWebView && setIsMobileMenuOpen && (
            <TouchableOpacity onPress={() => setIsMobileMenuOpen(false)}>
              <Ionicons name="close" size={28} color="#237227" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Navigation Items */}
      <ScrollView className="flex-1 px-4 py-4">
        <TouchableOpacity 
          onPress={() => handleTabChange('dashboard')}
          className={`flex-row items-center px-4 py-3 mb-1 rounded-xl ${activeTab === 'dashboard' ? 'bg-[#e8f5e9]' : ''}`}
        >
          <Ionicons name="grid-outline" size={20} color={activeTab === 'dashboard' ? '#237227' : '#78716c'} />
          <Text className={`ml-3 font-medium ${activeTab === 'dashboard' ? 'text-[#237227]' : 'text-stone-900'}`}>Dashboard</Text>
        </TouchableOpacity>

        {[
          { label: 'Site Management', icon: 'location-outline', key: 'siteManagement' },
          { label: 'Contact Management', icon: 'mail-outline', key: 'walkieTalkie' },
          { label: 'Activity Logs', icon: 'clipboard-outline', key: 'activityLogs' },
          { label: 'Company Lists', icon: 'business-outline', key: 'companyList' },
          { label: 'Employees', icon: 'people-outline', key: 'employee' },
        ].map((item) => (
          <TouchableOpacity 
            key={item.key} 
            className={`flex-row items-center px-4 py-3 mb-1 rounded-xl ${activeTab === item.key ? 'bg-[#e8f5e9]' : ''}`}
            onPress={() => handleTabChange(item.key as any)}
          >
            <Ionicons name={item.icon as any} size={20} color={activeTab === item.key ? '#237227' : '#78716c'} />
            <Text className={`ml-3 font-medium ${activeTab === item.key ? 'text-[#237227]' : 'text-stone-900'}`}>{item.label}</Text>
          </TouchableOpacity>
        ))}

        <View className="my-4 border-t border-stone-200" />

        <TouchableOpacity 
          className={`flex-row items-center px-4 py-3 mb-1 rounded-xl ${activeTab === 'settings' ? 'bg-[#e8f5e9]' : ''}`}
          onPress={() => handleTabChange('settings')}
        >
          <Ionicons name="settings-outline" size={20} color={activeTab === 'settings' ? '#237227' : '#78716c'} />
          <Text className={`ml-3 font-medium ${activeTab === 'settings' ? 'text-[#237227]' : 'text-stone-900'}`}>Settings</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sign Out */}
      <View className="px-4 pt-4 pb-6 border-t border-stone-200">
        <TouchableOpacity 
          className="flex-row items-center px-4 py-3 rounded-xl"
          onPress={onLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text className="ml-3 font-medium text-red-600">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Desktop view - always visible sidebar
  if (isWebView) {
    return (
      <View className="bg-[#f8fafb] border-r w-72 border-stone-200">
        <NavContent />
      </View>
    );
  }

  // Mobile view - modal sidebar
  return (
    <Modal
      visible={isMobileMenuOpen || false}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <TouchableOpacity 
          style={{ flex: 1 }} 
          activeOpacity={1} 
          onPress={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
        />
        <View style={{ width: '80%', height: '100%', position: 'absolute', left: 0 }}>
          <NavContent />
        </View>
      </View>
    </Modal>
  );
}
