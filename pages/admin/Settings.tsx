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
      <ScrollView className="flex-1 bg-stone-50">
        <View className="bg-white px-5 pt-4 pb-3 border-b border-stone-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity className="lg:hidden w-9 h-9 items-center justify-center mr-3" onPress={() => setIsDrawerOpen(true)}>
                <Ionicons name="menu" size={24} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-lg lg:text-2xl font-bold text-stone-900">Account Settings</Text>
                <Text className="text-stone-500 text-xs lg:text-sm mt-0.5">Welcome back, Administrator</Text>
              </View>
            </View>
            
            <View className="flex-row items-center gap-2.5">
              <TouchableOpacity className="w-9 h-9 bg-stone-100 rounded-full items-center justify-center" onPress={() => setIsNotificationOpen(true)}>
                <View className="w-2 h-2 bg-red-500 rounded-full absolute top-1.5 right-1.5" />
                <Ionicons name="notifications-outline" size={18} color="#57534e" />
              </TouchableOpacity>
              
              <View className="w-9 h-9 bg-emerald-100 rounded-full items-center justify-center">
                <Text className="text-emerald-700 font-semibold text-xs">{initials}</Text>
              </View>
              <View className="hidden lg:flex ml-2">
                <Text className="text-sm font-semibold text-stone-900">{fullName}</Text>
                <Text className="text-xs text-stone-500">Super Admin</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-5 lg:px-8 pt-3 lg:pt-4 pb-6">
          <View className="bg-white rounded-2xl border border-stone-200 overflow-hidden max-w-2xl">
            <View className="px-4 lg:px-5 pt-3 lg:pt-4 pb-2.5 border-b border-stone-100">
              <Text className="text-base font-bold text-stone-900 mb-0.5">Account Settings</Text>
              <Text className="text-stone-500 text-xs">Manage your admin account</Text>
            </View>

            <View className="px-4 lg:px-5 py-3 lg:py-4">
              <View className="mb-4">
                <View className="flex-row items-center">
                  <View className="w-14 h-14 lg:w-16 lg:h-16 bg-emerald-100 rounded-2xl items-center justify-center mr-3">
                    <Text className="text-emerald-700 font-bold text-lg lg:text-xl">{initials}</Text>
                  </View>
                  {isEditMode && (
                    <TouchableOpacity className="bg-white border border-emerald-600 px-3 py-1.5 rounded-lg">
                      <Text className="text-emerald-600 font-semibold text-xs">Change Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View className="mb-3">
                <Text className="text-xs font-medium text-stone-700 mb-1.5">Full Name</Text>
                <TextInput
                  className={`bg-white border ${isEditMode ? 'border-stone-300' : 'border-stone-200 bg-stone-50'} rounded-lg px-3 py-2 text-stone-900 text-sm`}
                  value={fullName}
                  onChangeText={setFullName}
                  editable={isEditMode}
                />
              </View>

              <View className="mb-4">
                <Text className="text-xs font-medium text-stone-700 mb-1.5">Email Address</Text>
                <TextInput
                  className={`bg-white border ${isEditMode ? 'border-stone-300' : 'border-stone-200 bg-stone-50'} rounded-lg px-3 py-2 text-stone-900 text-sm`}
                  value={email}
                  onChangeText={setEmail}
                  editable={isEditMode}
                />
              </View>

              {isEditMode ? (
                <View className="flex-row gap-2.5">
                  <TouchableOpacity className="flex-1 bg-stone-100 py-2 rounded-lg" onPress={() => setIsEditMode(false)}>
                    <Text className="text-center text-stone-700 font-semibold text-sm">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="flex-1 bg-emerald-600 py-2 rounded-lg" onPress={() => setIsEditMode(false)}>
                    <Text className="text-center text-white font-semibold text-sm">Save Changes</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity className="bg-emerald-600 py-2 px-4 rounded-lg self-start flex-row items-center" onPress={() => setIsEditMode(true)}>
                  <Ionicons name="create-outline" size={16} color="white" />
                  <Text className="text-white font-semibold text-sm ml-1.5">Edit Profile</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Notification Modal */}
      <Modal visible={isNotificationOpen} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/20 justify-center items-center" onPress={() => setIsNotificationOpen(false)}>
          <View className="w-80 bg-white rounded-2xl p-6 items-center">
            <Ionicons name="notifications-outline" size={32} color="#10b981" className="mb-3" />
            <Text className="font-bold text-lg text-stone-800 mb-2">Notifications</Text>
            <Text className="text-stone-500 text-center mb-4">You have no new notifications.</Text>
            <TouchableOpacity className="bg-emerald-600 rounded-lg py-2 px-6" onPress={() => setIsNotificationOpen(false)}>
              <Text className="text-white font-bold">Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Mobile Drawer */}
      <Modal visible={isDrawerOpen} transparent animationType="fade">
        <View className="flex-1 flex-row">
          <View className="w-72 bg-white h-full shadow-2xl">
            <View className="bg-emerald-50 px-6 pt-12 pb-6 border-b border-emerald-100">
                <Text className="text-base font-bold text-stone-900">Admin Portal</Text>
            </View>
            <ScrollView className="flex-1 px-4 py-4">
                <Text className="p-4 text-stone-400 text-xs">Mobile Menu Content</Text>
            </ScrollView>
          </View>
          <Pressable className="flex-1 bg-black/40" onPress={() => setIsDrawerOpen(false)} />
        </View>
      </Modal>
    </View>
  );
}