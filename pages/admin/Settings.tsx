import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';

interface SettingsProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}

export default function Settings({ onNavigate }: SettingsProps) {
  // UI State remains to keep the design interactive
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Static data for design representation
  const [fullName, setFullName] = useState('Admin User');
  const [email, setEmail] = useState('admin@company.com');
  const [initials] = useState('AD');

  return (
    <View className="flex-1 bg-stone-50">
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-white px-6 pt-5 pb-4 border-b border-stone-100">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity className="lg:hidden w-9 h-9 items-center justify-center mr-3" onPress={() => setIsDrawerOpen(true)}>
                <Ionicons name="menu" size={22} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-xl font-bold text-stone-900 tracking-tight">Settings</Text>
                <Text className="text-stone-400 text-xs mt-0.5 font-medium">Manage your account</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity className="w-9 h-9 bg-stone-50 border border-stone-100 rounded-lg items-center justify-center" onPress={() => setIsNotificationOpen(true)}>
                <View className="w-2 h-2 bg-red-400 rounded-full absolute top-1.5 right-1.5" />
                <Ionicons name="notifications-outline" size={17} color="#78716c" />
              </TouchableOpacity>
              <View className="flex-row items-center gap-2 bg-stone-50 border border-stone-100 rounded-lg px-2.5 py-1.5">
                <View className="w-6 h-6 bg-emerald-500 rounded-md items-center justify-center">
                  <Text className="text-white font-bold text-xs">{initials}</Text>
                </View>
                <View className="hidden lg:flex">
                  <Text className="text-xs font-semibold text-stone-800">{fullName}</Text>
                  <Text className="text-xs text-stone-400 leading-none">Super Admin</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className="px-6 py-5">
          <View
            className="bg-white rounded-xl border border-stone-100 overflow-hidden max-w-lg"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}
          >
            {/* Card Header */}
            <View className="px-6 pt-5 pb-4 border-b border-stone-100">
              <Text className="text-sm font-bold text-stone-900">Profile Information</Text>
              <Text className="text-xs text-stone-400 mt-0.5">Update your display name and email address</Text>
            </View>

            <View className="px-6 py-5">
              {/* Avatar Row */}
              <View className="flex-row items-center gap-4 mb-6 pb-5 border-b border-stone-50">
                <View className="w-14 h-14 bg-emerald-500 rounded-xl items-center justify-center" style={{ shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 }}>
                  <Text className="text-white font-bold text-lg">{initials}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-stone-900">{fullName}</Text>
                  <Text className="text-xs text-stone-400 mt-0.5">Super Administrator</Text>
                </View>
                {isEditMode && (
                  <TouchableOpacity className="bg-stone-50 border border-stone-100 px-3 py-2 rounded-lg flex-row items-center gap-1">
                    <Ionicons name="camera-outline" size={13} color="#78716c" />
                    <Text className="text-stone-600 font-semibold text-xs">Change</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Full Name */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">Full Name</Text>
                <TextInput
                  className={`border rounded-lg px-3 py-2.5 text-stone-900 text-sm ${isEditMode ? 'bg-white border-stone-200' : 'bg-stone-50 border-stone-100'}`}
                  value={fullName}
                  onChangeText={setFullName}
                  editable={isEditMode}
                  placeholderTextColor="#a8a29e"
                />
              </View>

              {/* Email */}
              <View className="mb-5">
                <Text className="text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">Email Address</Text>
                <TextInput
                  className={`border rounded-lg px-3 py-2.5 text-stone-900 text-sm ${isEditMode ? 'bg-white border-stone-200' : 'bg-stone-50 border-stone-100'}`}
                  value={email}
                  onChangeText={setEmail}
                  editable={isEditMode}
                  placeholderTextColor="#a8a29e"
                />
              </View>

              {/* Action Buttons */}
              {isEditMode ? (
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 bg-stone-50 border border-stone-100 py-2.5 rounded-lg items-center"
                    onPress={() => setIsEditMode(false)}
                  >
                    <Text className="text-stone-600 font-semibold text-sm">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-emerald-500 py-2.5 rounded-lg items-center"
                    style={{ shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 }}
                    onPress={() => setIsEditMode(false)}
                  >
                    <Text className="text-white font-semibold text-sm">Save Changes</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  className="flex-row items-center gap-1.5 bg-stone-50 border border-stone-100 py-2.5 px-4 rounded-lg self-start"
                  onPress={() => setIsEditMode(true)}
                >
                  <Ionicons name="create-outline" size={14} color="#78716c" />
                  <Text className="text-stone-700 font-semibold text-sm">Edit Profile</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Danger Zone */}
          <View
            className="bg-white rounded-xl border border-stone-100 overflow-hidden max-w-lg mt-4"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}
          >
            <View className="px-6 pt-5 pb-4 border-b border-stone-100">
              <Text className="text-sm font-bold text-stone-900">Security</Text>
              <Text className="text-xs text-stone-400 mt-0.5">Manage your account security</Text>
            </View>
            <View className="px-6 py-5">
              <TouchableOpacity className="flex-row items-center gap-3 py-3 border-b border-stone-50">
                <View className="w-8 h-8 bg-stone-50 rounded-lg items-center justify-center">
                  <Ionicons name="lock-closed-outline" size={15} color="#78716c" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-stone-800">Change Password</Text>
                  <Text className="text-xs text-stone-400">Update your account password</Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color="#d6d3d1" />
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center gap-3 py-3">
                <View className="w-8 h-8 bg-red-50 rounded-lg items-center justify-center">
                  <Ionicons name="log-out-outline" size={15} color="#ef4444" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-red-500">Sign Out</Text>
                  <Text className="text-xs text-stone-400">Sign out of your account</Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color="#d6d3d1" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Notification Modal */}
      <Modal visible={isNotificationOpen} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/30 justify-center items-center px-5" onPress={() => setIsNotificationOpen(false)}>
          <View className="bg-white w-full max-w-xs rounded-2xl overflow-hidden" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40 }}>
            <View className="px-6 pt-6 pb-4 items-center border-b border-stone-100">
              <View className="w-12 h-12 bg-emerald-50 rounded-xl items-center justify-center mb-3">
                <Ionicons name="notifications" size={22} color="#10b981" />
              </View>
              <Text className="font-bold text-stone-900 text-base">Notifications</Text>
            </View>
            <View className="px-6 py-5 items-center">
              <Text className="text-stone-400 text-sm text-center">You have no new notifications.</Text>
            </View>
            <View className="px-6 pb-6">
              <TouchableOpacity className="bg-emerald-500 w-full py-3 rounded-lg items-center" onPress={() => setIsNotificationOpen(false)}>
                <Text className="text-white font-semibold text-sm">Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Mobile Drawer */}
      <Modal visible={isDrawerOpen} transparent animationType="fade">
        <View className="flex-1 flex-row">
          <View className="w-64 bg-white h-full" style={{ shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.1, shadowRadius: 16 }}>
            <View className="px-5 pt-12 pb-5 border-b border-stone-100">
              <Text className="text-sm font-bold text-stone-900">Admin Portal</Text>
            </View>
            <ScrollView className="flex-1 px-3 py-3">
              <Text className="p-4 text-stone-400 text-xs">Navigation items appear here</Text>
            </ScrollView>
          </View>
          <Pressable className="flex-1 bg-black/30" onPress={() => setIsDrawerOpen(false)} />
        </View>
      </Modal>
    </View>
  );
}