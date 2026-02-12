import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 1. Define the allowed route type
export type AdminRoute =
  | 'dashboard'
  | 'siteManagement'
  | 'walkieTalkie'
  | 'activityLogs'
  | 'companyList'
  | 'employee'
  | 'settings';

// 2. Use the type in the props interface
interface AdminSidebarMobileProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (page: AdminRoute) => void;
  activeRoute: AdminRoute;
  onSignOut: () => void;
}

// 3. Type your menu items with AdminRoute
const menuItems: {
  label: string;
  route: AdminRoute;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: 'Dashboard', route: 'dashboard', icon: 'grid-outline' },
  { label: 'Site Management', route: 'siteManagement', icon: 'location-outline' },
  { label: 'Walkie Talkie', route: 'walkieTalkie', icon: 'mic-outline' },
  { label: 'Activity Logs', route: 'activityLogs', icon: 'clipboard-outline' },
  { label: 'Company Lists', route: 'companyList', icon: 'business-outline' },
  { label: 'Employees', route: 'employee', icon: 'people-outline' },
  { label: 'Settings', route: 'settings', icon: 'settings-outline' },
];

export default function AdminSidebarMobile({
  visible,
  onClose,
  onNavigate,
  activeRoute,
  onSignOut,
}: AdminSidebarMobileProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-row flex-1">
        {/* Drawer Content */}
        <View className="h-full bg-white shadow-2xl w-72">
          {/* Drawer Header */}
          <View className="px-6 pt-12 pb-6 border-b bg-emerald-50 border-emerald-100">
            <View className="flex-row items-center gap-3 mb-3">
              <View className="items-center justify-center w-14 h-14 bg-emerald-100 rounded-2xl">
                <Ionicons name="chatbubble" size={24} color="#10b981" />
              </View>
              <View>
                <Text className="text-base font-bold text-stone-900">Admin Portal</Text>
                <Text className="text-xs text-stone-500">Monitoring System</Text>
              </View>
            </View>
            <TouchableOpacity
              className="absolute top-4 right-4"
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#78716c" />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <ScrollView className="flex-1 px-4 py-4">
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.route}
                className={`flex-row items-center px-4 py-3 mb-1 rounded-xl ${
                  activeRoute === item.route
                    ? 'bg-emerald-50'
                    : 'hover:bg-stone-50'
                }`}
                onPress={() => {
                  onClose();
                  onNavigate(item.route);
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={activeRoute === item.route ? '#10b981' : '#78716c'}
                />
                <Text
                  className={`ml-3 font-medium ${
                    activeRoute === item.route
                      ? 'text-emerald-700'
                      : 'text-stone-700'
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}

            <View className="my-4 border-t border-stone-200" />

            {/* Sign Out */}
            <TouchableOpacity
              className="flex-row items-center px-4 py-3 rounded-xl"
              onPress={() => {
                onClose();
                onSignOut();
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#dc2626" />
              <Text className="ml-3 font-medium text-red-600">Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Overlay - Close drawer when tapped */}
        <Pressable
          className="flex-1 bg-black/40"
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}