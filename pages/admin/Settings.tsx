import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import supabase, { getCurrentUser } from '../../utils/supabase';
import '../../global.css';

interface SettingsProps {
  onNavigate: (
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
        const user = await getCurrentUser();
        if (user) {
          setFullName(user.user_metadata?.full_name || 'Admin User');
          setEmail(user.email || '');
          const name = user.user_metadata?.full_name || user.email || 'AD';
          const initialsComputed = name
            .split(' ')
            .map((p: string) => p[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          setInitials(initialsComputed || 'AD');
          // If you have profile_picture_url in user_metadata, use it
          if (user.user_metadata?.profile_picture_url) {
            setProfilePicture(`${user.user_metadata.profile_picture_url}?t=${Date.now()}`);
          }
        } else {
          // fallback to auth metadata
          const {
            data: { user: fallbackUser },
          } = await supabase.auth.getUser();
          setFullName(fallbackUser?.user_metadata?.full_name || 'Admin User');
          setEmail(fallbackUser?.email || '');
          const name = fallbackUser?.user_metadata?.full_name || fallbackUser?.email || 'AD';
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
        const {
          data: { user },
        } = await supabase.auth.getUser();
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
      Alert.alert(
        'Permission needed',
        'Please allow access to your photo library to upload a profile picture'
      );
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
          actions.push({
            resize: { width: Math.round(width * scale), height: Math.round(height * scale) },
          });
        }

        const manipulated =
          actions.length > 0
            ? await ImageManipulator.manipulateAsync(uri, actions, {
                compress: 0.85,
                format: ImageManipulator.SaveFormat.JPEG,
              })
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

      const { data: urlData } = supabase.storage
        .from('profile_picture')
        .getPublicUrl(imageFileName);
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
      const user = await getCurrentUser();
      const userId = user?.id;
      if (!userId) {
        Alert.alert('Error', 'Could not resolve current user');
        return;
      }

      let publicUrl = user?.user_metadata?.profile_picture_url || null;
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
        <View className="border-b border-stone-200 bg-white px-5 pb-3 pt-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center">
              <TouchableOpacity
                className="mr-3 h-9 w-9 items-center justify-center lg:hidden"
                onPress={() => setIsDrawerOpen(true)}>
                <Ionicons name="menu" size={24} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-lg font-bold text-stone-900 lg:text-2xl">
                  Account Settings
                </Text>
                <Text className="mt-0.5 text-xs text-stone-500 lg:text-sm">
                  Welcome back, Administrator
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2.5">
              <TouchableOpacity
                className="h-9 w-9 items-center justify-center rounded-full bg-stone-100"
                onPress={() => setIsNotificationOpen(true)}>
                <View className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
                <Ionicons name="notifications-outline" size={18} color="#57534e" />
              </TouchableOpacity>

              <View className="h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                <Text className="text-xs font-semibold text-emerald-700">{initials}</Text>
              </View>
              <View className="ml-2 hidden lg:flex">
                <Text className="text-sm font-semibold text-stone-900">{fullName}</Text>
                <Text className="text-xs text-stone-500">Super Admin</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-5 pb-6 pt-3 lg:px-8 lg:pt-4">
          <View className="max-w-2xl overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <View className="border-b border-stone-100 px-4 pb-2.5 pt-3 lg:px-5 lg:pt-4">
              <Text className="mb-0.5 text-base font-bold text-stone-900">Account Settings</Text>
              <Text className="text-xs text-stone-500">Manage your admin account</Text>
            </View>

            <View className="px-4 py-3 lg:px-5 lg:py-4">
              <View className="mb-4">
                <View className="flex-row items-center">
                  <View className="mr-3 h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100 lg:h-16 lg:w-16">
                    {profilePicture ? (
                      <Image
                        source={{ uri: profilePicture }}
                        style={{ width: 64, height: 64, borderRadius: 12 }}
                      />
                    ) : (
                      <Text className="text-lg font-bold text-emerald-700 lg:text-xl">
                        {initials}
                      </Text>
                    )}
                  </View>
                  {isEditMode && (
                    <TouchableOpacity
                      className="rounded-lg border border-emerald-600 bg-white px-3 py-1.5"
                      onPress={pickImage}>
                      <Text className="text-xs font-semibold text-emerald-600">Change Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View className="mb-3">
                <Text className="mb-1.5 text-xs font-medium text-stone-700">Full Name</Text>
                <TextInput
                  className={`border bg-white ${isEditMode ? 'border-stone-300' : 'border-stone-200 bg-stone-50'} rounded-lg px-3 py-2 text-sm text-stone-900`}
                  value={fullName}
                  onChangeText={setFullName}
                  editable={isEditMode}
                />
              </View>

              <View className="mb-4">
                <Text className="mb-1.5 text-xs font-medium text-stone-700">Email Address</Text>
                <TextInput
                  className={`border bg-white ${isEditMode ? 'border-stone-300' : 'border-stone-200 bg-stone-50'} rounded-lg px-3 py-2 text-sm text-stone-900`}
                  value={email}
                  onChangeText={setEmail}
                  editable={isEditMode}
                />
              </View>

              {isEditMode ? (
                <View className="flex-row gap-2.5">
                  <TouchableOpacity
                    className="flex-1 rounded-lg bg-stone-100 py-2"
                    onPress={() => setIsEditMode(false)}>
                    <Text className="text-center text-sm font-semibold text-stone-700">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 rounded-lg bg-emerald-600 py-2"
                    onPress={handleSaveChanges}>
                    <Text className="text-center text-sm font-semibold text-white">
                      Save Changes
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  className="flex-row items-center self-start rounded-lg bg-emerald-600 px-4 py-2"
                  onPress={() => setIsEditMode(true)}>
                  <Ionicons name="create-outline" size={16} color="white" />
                  <Text className="ml-1.5 text-sm font-semibold text-white">Edit Profile</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Notification Modal */}
      <Modal visible={isNotificationOpen} transparent animationType="fade">
        <Pressable
          className="flex-1 items-center justify-center bg-black/20"
          onPress={() => setIsNotificationOpen(false)}>
          <View className="w-80 items-center rounded-2xl bg-white p-6">
            <Ionicons name="notifications-outline" size={32} color="#10b981" className="mb-3" />
            <Text className="mb-2 text-lg font-bold text-stone-800">Notifications</Text>
            <Text className="mb-4 text-center text-stone-500">You have no new notifications.</Text>
            <TouchableOpacity
              className="rounded-lg bg-emerald-600 px-6 py-2"
              onPress={() => setIsNotificationOpen(false)}>
              <Text className="font-bold text-white">Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Mobile Drawer */}
      <Modal visible={isDrawerOpen} transparent animationType="fade">
        <View className="flex-1 flex-row">
          <View className="h-full w-72 bg-white shadow-2xl">
            <View className="border-b border-emerald-100 bg-emerald-50 px-6 pb-6 pt-12">
              <Text className="text-base font-bold text-stone-900">Admin Portal</Text>
            </View>
            <ScrollView className="flex-1 px-4 py-4">
              <Text className="p-4 text-xs text-stone-400">Mobile Menu Content</Text>
            </ScrollView>
          </View>
          <Pressable className="flex-1 bg-black/40" onPress={() => setIsDrawerOpen(false)} />
        </View>
      </Modal>
    </View>
  );
}
