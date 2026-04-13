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
    <View className="flex-1 w-full bg-white">
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

      <View className="flex-col flex-1 w-full">
        {/* HEADER WITH BACK BUTTON */}
        <View className="flex-row items-center gap-4 px-6 pt-6 pb-6 bg-[#f8fafb] shadow-sm">
          <TouchableOpacity
            onPress={onBackToDashboard}
            className="items-center justify-center w-10 h-10 bg-[#237227] rounded-full active:scale-95">
            <Ionicons name="chevron-back" size={24} color="#f8fafb" />
          </TouchableOpacity>
          <Text className="text-2xl font-extrabold text-gray-800">Settings</Text>
        </View>

        {/* SCROLLABLE CONTENT */}
        <ScrollView
          className="flex-1 w-full"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32 }}
          showsVerticalScrollIndicator={true}>
          {/* User Info Card */}
          <View className="w-full p-6 mb-8 rounded-3xl bg-gradient-to-br from-[#e8f5e9] to-[#237227] shadow-lg ">
            <View className="flex-row items-center mb-6">
              <View className="items-center justify-center w-16 h-16 mr-4 overflow-hidden bg-[#237227] rounded-full">
                {userData.profile_picture_url ? (
                  <Image
                    source={{ uri: userData.profile_picture_url }}
                    style={{ width: 64, height: 64, borderRadius: 32 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={32} color="#f8fafb" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-lg font-extrabold text-gray-800">{userData.full_name}</Text>
                <Text className="text-sm text-gray-500">{userData.email}</Text>
              </View>
            </View>
            <View className="self-start px-4 py-2 bg-[#237227] rounded-full">
              <Text className="text-xs font-bold text-[#f8fafb]">EMPLOYEE</Text>
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
          <View className="pt-8 mt-8 border-t border-gray-200">
            <TouchableOpacity
              onPress={onLogout}
              activeOpacity={0.8}
              className="flex-row items-center justify-center p-4 bg-[#ef4444] shadow-md rounded-2xl active:scale-95">
              <Ionicons name="log-out-outline" size={24} color="white" />
              <Text className="ml-3 text-lg font-bold text-[#f8fafb]">Sign Out</Text>
            </TouchableOpacity>
            <Text className="mt-4 text-xs text-center text-gray-500">
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
    <View className="flex-row items-center justify-between p-4 mb-3 border border-[#237227] bg-white shadow-sm rounded-2xl">
        <View className="flex-row items-center flex-1">
        <View className="p-3 mr-4 bg-[#237227] rounded-full">
          <Ionicons name={icon} size={24} color="#f8fafb" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-800">{label}</Text>
          <Text className="mt-1 text-xs text-gray-400">{description}</Text>
        </View>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#e8f5e9', true: '#237227' }}
        thumbColor={value ? '#f8fafb' : '#237227' }
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
      className={`mb-3 flex-row items-center justify-between rounded-2xl shadow-sm border border-[#237227] bg-white p-5 ${
        disabled || !onPress ? 'opacity-60' : 'active:scale-95'
      }`}>
      <View className="flex-row items-center flex-1">
        <View className="p-3 mr-4 bg-[#237227] rounded-full">
          <Ionicons name={icon} size={24} color="#f8fafb" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-800">{label}</Text>
          <Text className="mt-1 text-xs text-gray-400">{description}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#237227" />
    </TouchableOpacity>
  );
}