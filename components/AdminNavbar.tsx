import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AdminNavbarProps {
  activeTab: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
  onNavigate?: (page: string) => void;
  onLogout: () => void;
}

export default function AdminNavbar({ activeTab, setActiveTab, onNavigate, onLogout }: AdminNavbarProps) {
  return (
    <View className="hidden lg:flex w-72 bg-white border-r border-stone-200">
      {/* Header */}
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

      {/* Navigation Items */}
      <ScrollView className="flex-1 px-4 py-4">
        <TouchableOpacity 
          onPress={() => setActiveTab('dashboard')}
          className={`flex-row items-center px-4 py-3 mb-1 rounded-xl ${activeTab === 'dashboard' ? 'bg-emerald-50' : ''}`}
        >
          <Ionicons name="grid-outline" size={20} color={activeTab === 'dashboard' ? '#10b981' : '#78716c'} />
          <Text className={`ml-3 font-medium ${activeTab === 'dashboard' ? 'text-emerald-700' : 'text-stone-700'}`}>Dashboard</Text>
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
            className={`flex-row items-center px-4 py-3 mb-1 rounded-xl ${activeTab === item.key ? 'bg-emerald-50' : ''}`}
            onPress={() => setActiveTab(item.key as any)}
          >
            <Ionicons name={item.icon as any} size={20} color={activeTab === item.key ? '#10b981' : '#78716c'} />
            <Text className={`ml-3 font-medium ${activeTab === item.key ? 'text-emerald-700' : 'text-stone-700'}`}>{item.label}</Text>
          </TouchableOpacity>
        ))}

        <View className="border-t border-stone-200 my-4" />

        <TouchableOpacity 
          className="flex-row items-center px-4 py-3 mb-1 rounded-xl"
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons name="settings-outline" size={20} color="#78716c" />
          <Text className="ml-3 text-stone-700 font-medium">Settings</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sign Out */}
      <View className="px-4 pb-6 pt-4 border-t border-stone-200">
        <TouchableOpacity 
          className="flex-row items-center px-4 py-3 rounded-xl"
          onPress={onLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text className="ml-3 text-red-600 font-medium">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
