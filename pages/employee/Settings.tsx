import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SweetAlertModal from '../../components/SweetAlertModal';

const NOTIFICATIONS_ENABLED_STORAGE_KEY = 'employee.notifications.enabled';

export default function Settings({
  onLogout,
  onBackToDashboard,
  onNavigateToEditProfile,
  onNavigateToChangePassword,
}: {
  onLogout?: () => void;
  onBackToDashboard?: () => void;
  onNavigateToEditProfile?: () => void;
  onNavigateToChangePassword?: () => void;
}) {
  const [userData, setUserData] = useState({
    full_name: 'User',
    email: '',
    phone_number: null,
    profile_picture_url: null,
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loadingNotificationsPref, setLoadingNotificationsPref] = useState(true);

  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  useEffect(() => {
    fetchUserData();
    loadNotificationsPref();
  }, []);

  const loadNotificationsPref = async () => {
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_STORAGE_KEY);
      if (raw === null) {
        setNotificationsEnabled(true);
      } else {
        setNotificationsEnabled(raw === 'true');
      }
    } catch (e) {
      console.warn('Failed to load notifications preference', e);
    } finally {
      setLoadingNotificationsPref(false);
    }
  };

  const persistNotificationsPref = async (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_STORAGE_KEY, String(enabled));
    } catch (e) {
      console.warn('Failed to save notifications preference', e);
      setAlert({
        visible: true,
        title: 'Error',
        message: 'Failed to save notification preference.',
        type: 'error',
      });
    }
  };


  const fetchUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Show auth metadata immediately
      if (user?.id) {
        setUserData({
          full_name: user.user_metadata?.full_name || 'User',
          email: user.email || '',
          phone_number: null,
          profile_picture_url: null,
        });

        // Then fetch and update with database data in background
        const { data, error } = await supabase
          .from('users')
          .select('full_name, phone_number, profile_picture_url')
          .eq('id', user.id);

        if (error) {
          console.warn('Error fetching user profile from users table:', error);
        }

        if (data && data.length > 0 && data[0].full_name) {
          setUserData({
            full_name: data[0].full_name,
            email: user.email || '',
            phone_number: data[0].phone_number,
            profile_picture_url: data[0].profile_picture_url,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserData({
          full_name: user.user_metadata?.full_name || 'User',
          email: user.email || '',
          phone_number: null,
          profile_picture_url: null,
        });
      }
    }
  };

  return (
    <View className="w-full flex-1 bg-white">
      <StatusBar barStyle="light-content" />

      <SweetAlertModal
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        confirmText="OK"
        onConfirm={() => setAlert((a) => ({ ...a, visible: false }))}
        onCancel={() => setAlert((a) => ({ ...a, visible: false }))}
      />

      <View className="w-full flex-1 flex-col">
        {/* HEADER WITH BACK BUTTON */}
        <View className="flex-row items-center gap-4 bg-white px-6 pb-6 pt-6">
          <TouchableOpacity
            onPress={onBackToDashboard}
            className="h-10 w-10 items-center justify-center rounded-full bg-green-100 active:scale-95">
            <Ionicons name="chevron-back" size={24} color="#10b981" />
          </TouchableOpacity>
          <Text className="text-2xl font-extrabold text-gray-900">Settings</Text>
        </View>

        {/* SCROLLABLE CONTENT */}
        <ScrollView
          className="w-full flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32 }}
          showsVerticalScrollIndicator={true}>
          {/* User Info Card */}
          <View className="mb-8 w-full rounded-3xl border-2 border-green-200 bg-gradient-to-br from-white to-green-50 p-6 shadow-md shadow-green-200">
            <View className="mb-6 flex-row items-center">
              <View className="mr-4 h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-green-500">
                {userData.profile_picture_url ? (
                  <Image
                    source={{ uri: userData.profile_picture_url }}
                    style={{ width: 64, height: 64, borderRadius: 32 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={32} color="white" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-lg font-extrabold text-gray-900">{userData.full_name}</Text>
                <Text className="text-sm text-gray-500">{userData.email}</Text>
              </View>
            </View>
            <View className="self-start rounded-full bg-green-100 px-4 py-2">
              <Text className="text-xs font-bold text-green-700">EMPLOYEE</Text>
            </View>
          </View>

          {/* SETTINGS SECTIONS */}
          <Text className="mb-4 text-lg font-bold text-gray-800">Account Settings</Text>

          {/* Settings Options */}
          <SettingOption
            icon="person-circle-outline"
            label="Edit Profile"
            description="Update your personal information"
            onPress={onNavigateToEditProfile}
            disabled={!onNavigateToEditProfile}
          />
          <SettingOption
            icon="lock-closed-outline"
            label="Change Password"
            description="Update your password"
            onPress={onNavigateToChangePassword}
            disabled={!onNavigateToChangePassword}
          />
          <SettingToggle
            icon="notifications-outline"
            label="Notifications"
            description="Turn notifications on/off"
            value={notificationsEnabled}
            disabled={loadingNotificationsPref}
            onValueChange={persistNotificationsPref}
          />
          <SettingOption
            icon="shield-checkmark-outline"
            label="Privacy & Security"
            description="Control your privacy settings"
            onPress={() => {}}
          />

          {/* LOGOUT SECTION */}
          <View className="mt-8 border-t border-gray-200 pt-8">
            <TouchableOpacity
              onPress={onLogout}
              activeOpacity={0.8}
              className="flex-row items-center justify-center rounded-2xl bg-red-500 p-4 shadow-md shadow-red-300 active:scale-95">
              <Ionicons name="log-out-outline" size={24} color="white" />
              <Text className="ml-3 text-lg font-bold text-white">Sign Out</Text>
            </TouchableOpacity>
            <Text className="mt-4 text-center text-xs text-gray-400">
              You will be signed out from this device
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function SettingToggle({
  icon,
  label,
  description,
  value,
  disabled,
  onValueChange,
}: {
  icon: any;
  label: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between rounded-2xl border border-green-100 bg-white p-4 shadow-md shadow-green-100">
      <View className="flex-1 flex-row items-center">
        <View className="mr-4 rounded-full bg-green-100 p-3">
          <Ionicons name={icon} size={24} color="#10b981" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900">{label}</Text>
          <Text className="mt-1 text-xs text-gray-400">{description}</Text>
        </View>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#e5e7eb', true: '#bbf7d0' }}
        thumbColor={value ? '#10b981' : '#f3f4f6'}
      />
    </View>
  );
}

function SettingOption({
  icon,
  label,
  description,
  onPress,
  disabled,
}: {
  icon: any;
  label: string;
  description: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
      className={`mb-3 flex-row items-center justify-between rounded-2xl border border-green-100 bg-white p-4 shadow-md shadow-green-100 ${
        disabled || !onPress ? 'opacity-60' : 'active:scale-95'
      }`}>
      <View className="flex-1 flex-row items-center">
        <View className="mr-4 rounded-full bg-green-100 p-3">
          <Ionicons name={icon} size={24} color="#10b981" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900">{label}</Text>
          <Text className="mt-1 text-xs text-gray-400">{description}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#d1d5db" />
    </TouchableOpacity>
  );
}
