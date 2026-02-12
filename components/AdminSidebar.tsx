import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type RouteName =
  | "dashboard"
  | "siteManagement"
  | "walkieTalkie"
  | "activityLogs"
  | "companyList"
  | "employee"
  | "settings";

interface AdminSidebarProps {
  onNavigate: (route: RouteName) => void;
  activeRoute?: RouteName;
}

type IoniconName =
  | "grid-outline"
  | "location-outline"
  | "mic-outline"
  | "clipboard-outline"
  | "business-outline"
  | "people-outline"
  | "settings-outline"
  | "log-out-outline"
  | "chatbubble";

interface MenuItem {
  label: string;
  route: RouteName;
  icon: IoniconName;
  color: string;
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard', route: 'dashboard', icon: 'grid-outline', color: '#10b981' },
  { label: 'Site Management', route: 'siteManagement', icon: 'location-outline', color: '#78716c' },
  { label: 'Walkie Talkie', route: 'walkieTalkie', icon: 'mic-outline', color: '#78716c' },
  { label: 'Activity Logs', route: 'activityLogs', icon: 'clipboard-outline', color: '#78716c' },
  { label: 'Company Lists', route: 'companyList', icon: 'business-outline', color: '#78716c' },
  { label: 'Employees', route: 'employee', icon: 'people-outline', color: '#78716c' },
  { label: 'Settings', route: 'settings', icon: 'settings-outline', color: '#78716c' },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({ onNavigate, activeRoute }) => (
  <View className="hidden bg-white border-r lg:flex w-72 border-stone-200">
    {/* Sidebar Header */}
    <View className="px-6 pt-8 pb-6 border-b bg-emerald-50 border-emerald-100">
      <View className="flex-row items-center gap-3">
        <View className="items-center justify-center w-14 h-14 bg-emerald-100 rounded-2xl">
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
      {menuItems.map(item => (
        <TouchableOpacity
          key={item.route}
          className={`flex-row items-center px-4 py-3 mb-1 rounded-xl ${
            activeRoute === item.route
              ? 'bg-emerald-50'
              : 'hover:bg-stone-50'
          }`}
          onPress={() => onNavigate(item.route)}
        >
          <Ionicons name={item.icon} size={20} color={activeRoute === item.route ? '#10b981' : item.color} />
          <Text className={`ml-3 font-medium ${
            activeRoute === item.route
              ? 'text-emerald-700'
              : 'text-stone-700'
          }`}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}

      <View className="my-4 border-t border-stone-200" />
    </ScrollView>

    {/* Sign Out */}
    <View className="px-4 pt-4 pb-6 border-t border-stone-200">
      <TouchableOpacity className="flex-row items-center px-4 py-3 rounded-xl">
        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        <Text className="ml-3 font-medium text-red-600">Sign Out</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default AdminSidebar;