import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../../components/SimpleToast';
import '../../global.css';

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

  return (
    <View className="flex-row flex-1 bg-stone-50">
      {/* Desktop Sidebar - Hidden on mobile */}
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
          {/* Dashboard */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('dashboard')}
          >
            <Ionicons name="grid-outline" size={20} color="#78716c" />
            <Text className="ml-3 font-medium text-stone-700">Dashboard</Text>
          </TouchableOpacity>

          {/* Site Management */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('siteManagement')}
          >
            <Ionicons name="location-outline" size={20} color="#78716c" />
            <Text className="ml-3 font-medium text-stone-700">Site Management</Text>
          </TouchableOpacity>

          {/* Walkie Talkie */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('walkieTalkie')}
          >
            <Ionicons name="mic-outline" size={20} color="#78716c" />
            <Text className="ml-3 font-medium text-stone-700">Walkie Talkie</Text>
          </TouchableOpacity>

          {/* Activity Logs */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('activityLogs')}
          >
            <Ionicons name="clipboard-outline" size={20} color="#78716c" />
            <Text className="ml-3 font-medium text-stone-700">Activity Logs</Text>
          </TouchableOpacity>

          {/* Company Lists */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('companyList')}
          >
            <Ionicons name="business-outline" size={20} color="#78716c" />
            <Text className="ml-3 font-medium text-stone-700">Company Lists</Text>
          </TouchableOpacity>

          {/* Employees */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('employee')}
          >
            <Ionicons name="people-outline" size={20} color="#78716c" />
            <Text className="ml-3 font-medium text-stone-700">Employees</Text>
          </TouchableOpacity>

          <View className="my-4 border-t border-stone-200" />

          {/* Settings */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl bg-emerald-50"
            onPress={() => onNavigate('settings')}
          >
            <Ionicons name="settings-outline" size={20} color="#10b981" />
            <Text className="ml-3 font-medium text-emerald-700">Settings</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Sign Out */}
        <View className="px-4 pt-4 pb-6 border-t border-stone-200">
          <TouchableOpacity className="flex-row items-center px-4 py-3 rounded-xl">
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            <Text className="ml-3 font-medium text-red-600">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView className="flex-1 bg-stone-50">
        {/* Header */}
        <View className="px-5 pt-4 pb-3 bg-white border-b border-stone-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              {/* Mobile Menu Button - Hidden on desktop */}
              <TouchableOpacity 
                className="items-center justify-center mr-3 lg:hidden w-9 h-9"
                onPress={() => setIsDrawerOpen(true)}
              >
                <Ionicons name="menu" size={24} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-lg font-bold lg:text-2xl text-stone-900">Account Settings</Text>
                <Text className="text-stone-500 text-xs lg:text-sm mt-0.5">Welcome back, Administrator</Text>
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
                <Text className="text-xs font-semibold text-emerald-700">{initials}</Text>
              </View>
              {/* Desktop User Info - Hidden on mobile */}
              <View className="hidden ml-2 lg:flex">
                <Text className="text-sm font-semibold text-stone-900">{fullName}</Text>
                <Text className="text-xs text-stone-500">Super Admin</Text>
              </View>
            </View>
          </View>
        </View>

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
      <Modal
        visible={isDrawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDrawerOpen(false)}
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
            </View>

            {/* Menu Items */}
            <ScrollView className="flex-1 px-4 py-4">
              {/* Dashboard */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('dashboard');
                }}
              >
                <Ionicons name="grid-outline" size={20} color="#78716c" />
                <Text className="ml-3 font-medium text-stone-700">Dashboard</Text>
              </TouchableOpacity>

              {/* Site Management */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('siteManagement');
                }}
              >
                <Ionicons name="location-outline" size={20} color="#78716c" />
                <Text className="ml-3 font-medium text-stone-700">Site Management</Text>
              </TouchableOpacity>

              {/* Walkie Talkie */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('walkieTalkie');
                }}
              >
                <Ionicons name="mic-outline" size={20} color="#78716c" />
                <Text className="ml-3 font-medium text-stone-700">Walkie Talkie</Text>
              </TouchableOpacity>

              {/* Activity Logs */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('activityLogs');
                }}
              >
                <Ionicons name="clipboard-outline" size={20} color="#78716c" />
                <Text className="ml-3 font-medium text-stone-700">Activity Logs</Text>
              </TouchableOpacity>

              {/* Company Lists */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('companyList');
                }}
              >
                <Ionicons name="business-outline" size={20} color="#78716c" />
                <Text className="ml-3 font-medium text-stone-700">Company Lists</Text>
              </TouchableOpacity>

              {/* Employees */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('employee');
                }}
              >
                <Ionicons name="people-outline" size={20} color="#78716c" />
                <Text className="ml-3 font-medium text-stone-700">Employees</Text>
              </TouchableOpacity>

              <View className="my-4 border-t border-stone-200" />

              {/* Settings */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl bg-emerald-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('settings');
                }}
              >
                <Ionicons name="settings-outline" size={20} color="#10b981" />
                <Text className="ml-3 font-medium text-emerald-700">Settings</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Sign Out */}
            <View className="px-4 pt-4 pb-6 border-t border-stone-200">
              <TouchableOpacity className="flex-row items-center px-4 py-3 rounded-xl">
                <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                <Text className="ml-3 font-medium text-red-600">Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Overlay - Close drawer when tapped */}
          <Pressable 
            className="flex-1 bg-black/40" 
            onPress={() => setIsDrawerOpen(false)}
          />
        </View>
      </Modal>
    </View>
  );
}