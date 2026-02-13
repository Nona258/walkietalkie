import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../../components/SimpleToast';
import '../../global.css';
import AdminSidebar from '../../components/AdminSidebar';
import AdminSidebarMobile from '../../components/AdminSidebarMobile'; // <-- Import mobile sidebar
import AdminHeader from '../../components/AdminHeader';

interface AccountSettings {
  fullName: string;
  email: string;
  initials: string;
}

interface SettingsProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}

export default function Settings({ onNavigate }: SettingsProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [fullName, setFullName] = useState('Admin User');
  const [email, setEmail] = useState('admin@company.com');
  const [initials, setInitials] = useState('AD');

  // Load account settings from AsyncStorage
  useEffect(() => {
    loadSettings();
  }, []);

  const getInitials = (name: string): string => {
    const names = name.trim().split(' ');
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('accountSettings');
      if (storedSettings) {
        const settings: AccountSettings = JSON.parse(storedSettings);
        setFullName(settings.fullName);
        setEmail(settings.email);
        setInitials(settings.initials);
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  const handleSaveChanges = async () => {
    if (!fullName.trim() || !email.trim()) {
      showToast({ type: 'error', text1: 'Required Fields', text2: 'Please fill in all required fields' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showToast({ type: 'error', text1: 'Invalid Email', text2: 'Please enter a valid email address' });
      return;
    }

    const newInitials = getInitials(fullName.trim());
    const settings: AccountSettings = {
      fullName: fullName.trim(),
      email: email.trim(),
      initials: newInitials,
    };

    try {
      await AsyncStorage.setItem('accountSettings', JSON.stringify(settings));
      setInitials(newInitials);
      setIsEditMode(false);
      showToast({ type: 'success', text1: 'Success!', text2: 'Account settings saved successfully' });
    } catch (error) {
      console.log('Error saving settings:', error);
      showToast({ type: 'error', text1: 'Error', text2: 'Failed to save settings' });
    }
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      // If canceling edit, reload original data
      loadSettings();
    }
    setIsEditMode(!isEditMode);
  };

  // Dummy sign out handler
  const handleSignOut = () => {
    // Add your sign out logic here
  };

  return (
    <View className="flex-row flex-1 bg-stone-50">
      {/* Desktop Sidebar - Hidden on mobile */}
      <AdminSidebar onNavigate={onNavigate} />

      {/* Main Content Area */}
      <ScrollView className="flex-1 bg-stone-50">
        {/* Header */}
        <AdminHeader
          title="Settings"
          subtitle="Welcome back, Administrator"
          onMenuPress={() => setIsDrawerOpen(true)}
          isNotificationOpen={isNotificationOpen}
          setIsNotificationOpen={setIsNotificationOpen}
          onNavigate={onNavigate}
        />

        {/* Settings Content */}
        <View className="px-5 pt-3 pb-6 lg:px-8 lg:pt-4">
          {/* Settings Card */}
          <View className="max-w-2xl overflow-hidden bg-white border rounded-2xl border-stone-200">
            {/* Card Header */}
            <View className="px-4 lg:px-5 pt-3 lg:pt-4 pb-2.5 border-b border-stone-100">
              <Text className="text-base font-bold text-stone-900 mb-0.5">Account Settings</Text>
              <Text className="text-xs text-stone-500">Manage your admin account</Text>
            </View>

            {/* Card Content */}
            <View className="px-4 py-3 lg:px-5 lg:py-4">
              {/* Profile Photo Section */}
              <View className="mb-4">
                <View className="flex-row items-center">
                  {/* Avatar */}
                  <View className="items-center justify-center mr-3 w-14 h-14 lg:w-16 lg:h-16 bg-emerald-100 rounded-2xl">
                    <Text className="text-lg font-bold text-emerald-700 lg:text-xl">{initials}</Text>
                  </View>
                  {/* Change Photo Button - Only visible in edit mode */}
                  {isEditMode && (
                    <TouchableOpacity className="bg-white border border-emerald-600 px-3 py-1.5 rounded-lg">
                      <Text className="text-xs font-semibold text-emerald-600">Change Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Full Name */}
              <View className="mb-3">
                <Text className="text-xs font-medium text-stone-700 mb-1.5">Full Name</Text>
                <TextInput
                  className={`bg-white border ${isEditMode ? 'border-stone-300' : 'border-stone-200 bg-stone-50'} rounded-lg px-3 py-2 text-stone-900 text-sm`}
                  placeholder="Enter your full name"
                  placeholderTextColor="#a8a29e"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={isEditMode}
                />
              </View>

              {/* Email Address */}
              <View className="mb-4">
                <Text className="text-xs font-medium text-stone-700 mb-1.5">Email Address</Text>
                <TextInput
                  className={`bg-white border ${isEditMode ? 'border-stone-300' : 'border-stone-200 bg-stone-50'} rounded-lg px-3 py-2 text-stone-900 text-sm`}
                  placeholder="Enter your email"
                  placeholderTextColor="#a8a29e"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  editable={isEditMode}
                />
              </View>

              {/* Action Buttons */}
              {isEditMode ? (
                <View className="flex-row gap-2.5">
                  <TouchableOpacity
                    className="flex-1 py-2 rounded-lg bg-stone-100 active:opacity-70"
                    onPress={handleEditToggle}
                  >
                    <Text className="text-sm font-semibold text-center text-stone-700">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 py-2 rounded-lg bg-emerald-600 active:opacity-80"
                    onPress={handleSaveChanges}
                  >
                    <Text className="text-sm font-semibold text-center text-white">Save Changes</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  className="flex-row items-center self-start justify-center px-4 py-2 rounded-lg bg-emerald-600 active:opacity-80"
                  onPress={handleEditToggle}
                >
                  <Ionicons name="create-outline" size={16} color="white" />
                  <Text className="text-white font-semibold text-sm ml-1.5">Edit Profile</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Mobile Drawer Modal */}
      <AdminSidebarMobile
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={(route) => {
          setIsDrawerOpen(false);
          onNavigate(route);
        }}
        activeRoute="settings"
        onSignOut={handleSignOut}
      />
    </View>
  );
}