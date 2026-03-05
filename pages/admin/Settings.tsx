import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import supabase, { getCurrentUserProfile } from '../../utils/supabase';
import '../../global.css';

interface SettingsProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}

export default function Settings({ onNavigate }: SettingsProps) {
  // UI State remains to keep the design interactive
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Profile data (will be loaded from authenticated user's `public.users` row)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [initials, setInitials] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [newImageSelected, setNewImageSelected] = useState(false);
  const [imageFileName, setImageFileName] = useState<string | null>(null);

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        // try to get DB-backed profile
        const profile = await getCurrentUserProfile();
        if (profile) {
          setFullName(profile.full_name || 'Admin User');
          setEmail(profile.email || '');
          const name = profile.full_name || profile.email || 'AD';
          const initialsComputed = name
            .split(' ')
            .map((p: string) => p[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          setInitials(initialsComputed || 'AD');
          if (profile.profile_picture_url) {
            setProfilePicture(`${profile.profile_picture_url}?t=${Date.now()}`);
          }
        } else {
          // fallback to auth metadata
          const { data: { user } } = await supabase.auth.getUser();
          setFullName(user?.user_metadata?.full_name || 'Admin User');
          setEmail(user?.email || '');
          const name = user?.user_metadata?.full_name || user?.email || 'AD';
          const initialsComputed = name
            .split(' ')
            .map((p: string) => p[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          setInitials(initialsComputed || 'AD');
        }
      } catch (err) {
        console.error('Failed to load admin profile:', err);
        const { data: { user } } = await supabase.auth.getUser();
        setFullName(user?.user_metadata?.full_name || 'Admin User');
        setEmail(user?.email || '');
        const name = user?.user_metadata?.full_name || user?.email || 'AD';
        const initialsComputed = name
          .split(' ')
          .map((p: string) => p[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        setInitials(initialsComputed || 'AD');
      }
    };

    loadProfile();
  }, []);

  const requestImagePickerPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to upload a profile picture');
    }
  };

  const pickImage = async () => {
    try {
      await requestImagePickerPermission();
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const { width, height, uri } = asset as any;
        // Resize if large
        const actions: any[] = [];
        if (width > 1200 || height > 1200) {
          const scale = Math.min(1200 / width, 1200 / height);
          actions.push({ resize: { width: Math.round(width * scale), height: Math.round(height * scale) } });
        }

        const manipulated = actions.length > 0
          ? await ImageManipulator.manipulateAsync(uri, actions, { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG })
          : { uri };

        const fileName = `admin_${Date.now()}.jpg`;
        setImageFileName(fileName);
        setNewImageUri(manipulated.uri);
        setProfilePicture(manipulated.uri);
        setNewImageSelected(true);
      }
    } catch (err) {
      console.error('Image pick error:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadProfilePicture = async (userId: string): Promise<string | null> => {
    if (!newImageUri || !imageFileName) return null;
    try {
      const response = await fetch(newImageUri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('profile_picture')
        .upload(imageFileName, blob, { contentType: 'image/jpeg', upsert: true });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      const { data: urlData } = supabase.storage.from('profile_picture').getPublicUrl(imageFileName);
      return urlData?.publicUrl || null;
    } catch (err) {
      console.error('Upload failed:', err);
      return null;
    }
  };

  const handleSaveChanges = async () => {
    try {
      setIsEditMode(false); // optimistically close edit UI
      // get current user id
      const profile = await getCurrentUserProfile();
      const userId = profile?.id;
      if (!userId) {
        Alert.alert('Error', 'Could not resolve current user');
        return;
      }

      let publicUrl = profile?.profile_picture_url || null;
      if (newImageSelected && newImageUri) {
        const uploaded = await uploadProfilePicture(userId);
        if (uploaded) {
          publicUrl = uploaded;
        }
      }

      // Update public.users row
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName, profile_picture_url: publicUrl })
        .eq('id', userId);

      if (error) {
        console.error('Failed to update users row:', error);
        Alert.alert('Error', 'Failed to save changes');
        return;
      }

      // update auth metadata full_name for consistency
      try {
        await supabase.auth.updateUser({ data: { full_name: fullName } });
      } catch (err) {
        console.warn('Failed to update auth metadata:', err);
      }

      // clear image selection flag
      setNewImageSelected(false);
      setNewImageUri(null);
      setImageFileName(null);

      // update local displayed image to the new public URL (with cache-buster)
      if (publicUrl) {
        setProfilePicture(`${publicUrl}?t=${Date.now()}`);
      }

      Alert.alert('Success', 'Profile updated');
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Error', 'An error occurred while saving changes');
    }
  };

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
                  <View className="w-14 h-14 lg:w-16 lg:h-16 bg-emerald-100 rounded-2xl items-center justify-center mr-3 overflow-hidden">
                    {profilePicture ? (
                      <Image source={{ uri: profilePicture }} style={{ width: 64, height: 64, borderRadius: 12 }} />
                    ) : (
                      <Text className="text-emerald-700 font-bold text-lg lg:text-xl">{initials}</Text>
                    )}
                  </View>
                  {isEditMode && (
                    <TouchableOpacity className="bg-white border border-emerald-600 px-3 py-1.5 rounded-lg" onPress={pickImage}>
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
                  <TouchableOpacity className="flex-1 bg-emerald-600 py-2 rounded-lg" onPress={handleSaveChanges}>
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