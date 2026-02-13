import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../utils/supabase';

export default function Settings({ 
  onLogout, 
  onBackToDashboard 
}: { 
  onLogout?: () => void;
  onBackToDashboard?: () => void;
}) {
  const [userData, setUserData] = useState({ full_name: 'User', email: '', phone_number: null });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.id) {
        const { data, error } = await supabase
          .from('users')
          .select('full_name, phone_number')
          .eq('id', user.id);

        if (data && data.length > 0 && data[0].full_name) {
          setUserData({
            full_name: data[0].full_name,
            email: user.email || '',
            phone_number: data[0].phone_number,
          });
        } else {
          setUserData({
            full_name: user.user_metadata?.full_name || 'User',
            email: user.email || '',
            phone_number: null,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserData({
          full_name: user.user_metadata?.full_name || 'User',
          email: user.email || '',
          phone_number: null,
        });
      }
    }
  };

  return (
    <View className="flex-1 w-full bg-white">
      <StatusBar barStyle="light-content" />
      
      <View 
        className="flex-1 w-full flex-col"
      >
        {/* HEADER WITH BACK BUTTON */}
        <View className="bg-white pt-6 pb-6 px-6 flex-row items-center gap-4">
          <TouchableOpacity 
            onPress={onBackToDashboard}
            className="h-10 w-10 rounded-full bg-green-100 items-center justify-center active:scale-95"
          >
            <Ionicons name="chevron-back" size={24} color="#10b981" />
          </TouchableOpacity>
          <Text className="text-gray-900 text-2xl font-extrabold">Settings</Text>
        </View>

        {/* SCROLLABLE CONTENT */}
        <ScrollView 
          className="flex-1 w-full"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32 }}
          showsVerticalScrollIndicator={true}
        >
          {/* User Info Card */}
          <View className="bg-gradient-to-br from-white to-green-50 rounded-3xl p-6 shadow-md shadow-green-200 border-2 border-green-200 w-full mb-8">
            <View className="flex-row items-center mb-6">
              <View className="h-16 w-16 rounded-full bg-green-500 items-center justify-center mr-4">
                <Ionicons name="person" size={32} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 text-lg font-extrabold">{userData.full_name}</Text>
                <Text className="text-gray-500 text-sm">{userData.email}</Text>
              </View>
            </View>
            <View className="bg-green-100 px-4 py-2 rounded-full self-start">
              <Text className="text-green-700 text-xs font-bold">EMPLOYEE</Text>
            </View>
          </View>

          {/* SETTINGS SECTIONS */}
          <Text className="text-gray-800 text-lg font-bold mb-4">Account Settings</Text>

          {/* Settings Options */}
          <SettingOption 
            icon="person-circle-outline"
            label="Edit Profile"
            description="Update your personal information"
            onPress={() => {}}
          />
          <SettingOption 
            icon="lock-closed-outline"
            label="Change Password"
            description="Update your password"
            onPress={() => {}}
          />
          <SettingOption 
            icon="notifications-outline"
            label="Notifications"
            description="Manage notification preferences"
            onPress={() => {}}
          />
          <SettingOption 
            icon="shield-checkmark-outline"
            label="Privacy & Security"
            description="Control your privacy settings"
            onPress={() => {}}
          />

          {/* LOGOUT SECTION */}
          <View className="mt-8 pt-8 border-t border-gray-200">
            <TouchableOpacity 
              onPress={onLogout}
              activeOpacity={0.8}
              className="bg-red-500 rounded-2xl p-4 flex-row items-center justify-center active:scale-95 shadow-md shadow-red-300"
            >
              <Ionicons name="log-out-outline" size={24} color="white" />
              <Text className="text-white font-bold ml-3 text-lg">Sign Out</Text>
            </TouchableOpacity>
            <Text className="text-gray-400 text-xs text-center mt-4">You will be signed out from this device</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function SettingOption({ 
  icon, 
  label, 
  description, 
  onPress 
}: { 
  icon: any;
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center justify-between bg-white p-4 rounded-2xl mb-3 shadow-md shadow-green-100 border border-green-100 active:scale-95"
    >
      <View className="flex-row items-center flex-1">
        <View className="bg-green-100 p-3 rounded-full mr-4">
          <Ionicons name={icon} size={24} color="#10b981" />
        </View>
        <View className="flex-1">
          <Text className="text-gray-900 font-semibold text-base">{label}</Text>
          <Text className="text-gray-400 text-xs mt-1">{description}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#d1d5db" />
    </TouchableOpacity>
  );
}
