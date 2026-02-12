import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
  onMenuPress?: () => void;
  isNotificationOpen?: boolean;
  setIsNotificationOpen?: (open: boolean) => void;
  onNavigate?: (
    page:
      | 'dashboard'
      | 'siteManagement'
      | 'walkieTalkie'
      | 'activityLogs'
      | 'companyList'
      | 'employee'
      | 'settings'
  ) => void;
}

export default function AdminHeader({
  title = 'Employee Management',
  subtitle = 'View and manage all employees',
  onMenuPress,
  isNotificationOpen = false,
  setIsNotificationOpen = () => {},
  onNavigate,
}: AdminHeaderProps) {
  return (
    <View className="px-5 pt-4 pb-3 bg-white border-b border-stone-200">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          {/* Mobile Menu Button - Hidden on desktop */}
          {onMenuPress && (
            <TouchableOpacity
              className="items-center justify-center mr-3 lg:hidden w-9 h-9"
              onPress={onMenuPress}
            >
              <Ionicons name="menu" size={24} color="#44403c" />
            </TouchableOpacity>
          )}
          <View className="flex-1">
            <Text className="text-lg font-bold lg:text-2xl text-stone-900">{title}</Text>
            {subtitle && (
              <Text className="text-stone-500 text-xs lg:text-sm mt-0.5">{subtitle}</Text>
            )}
          </View>
        </View>
        <View className="flex-row items-center gap-2.5">
          <TouchableOpacity
            className="items-center justify-center rounded-full w-9 h-9 bg-stone-100"
            onPress={() => setIsNotificationOpen(true)}
            activeOpacity={0.7}
          >
            <View className="w-2 h-2 bg-red-500 rounded-full absolute top-1.5 right-1.5" />
            <Ionicons name="notifications-outline" size={18} color="#57534e" />
          </TouchableOpacity>
          {/* Notification Modal */}
          <Modal
            visible={isNotificationOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setIsNotificationOpen(false)}
          >
            <Pressable
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }}
              onPress={() => setIsNotificationOpen(false)}
            >
              <View
                style={{
                  width: 320,
                  backgroundColor: 'rgba(255,255,255,0.85)',
                  borderRadius: 16,
                  padding: 24,
                  alignItems: 'center',
                }}
              >
                <Ionicons name="notifications-outline" size={32} color="#10b981" style={{ marginBottom: 12 }} />
                <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#44403c', marginBottom: 8 }}>Notifications</Text>
                <Text style={{ color: '#57534e', textAlign: 'center', marginBottom: 16 }}>
                  You have no new notifications.
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#10b981', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24 }}
                  onPress={() => setIsNotificationOpen(false)}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Close</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>
          <View className="items-center justify-center rounded-full w-9 h-9 bg-emerald-100">
            <Text className="text-xs font-semibold text-emerald-700">AD</Text>
          </View>
          {/* Desktop User Info - Hidden on mobile */}
          <View className="hidden ml-2 lg:flex">
            <Text className="text-sm font-semibold text-stone-900">Admin User</Text>
            <Text className="text-xs text-stone-500">Super Admin</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

