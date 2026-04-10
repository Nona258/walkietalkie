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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import supabase, { getCurrentUser } from '../../utils/supabase';
import SweetAlertModal from '../../components/SweetAlertModal';
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
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Sweet Alert State
  const [sweetAlertConfig, setSweetAlertConfig] = useState<{
    show: boolean;
    type?: 'success' | 'error' | 'warning' | 'info';
    title?: string;
    text?: string;
  }>({
    show: false,
  });

  // Password change fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Profile data (will be loaded from authenticated user's `public.users` row)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [initials, setInitials] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [newImageSelected, setNewImageSelected] = useState(false);
  const [imageFileName, setImageFileName] = useState<string | null>(null);

  // Store original values for comparison
  const [originalFullName, setOriginalFullName] = useState('');

  // Confirmation dialog state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<{
    publicUrl: string | null;
    nameChanged: boolean;
    pictureChanged: boolean;
  } | null>(null);

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        // Get authenticated user
        const user = await getCurrentUser();
        if (user) {
          const userId = user.id;
          setEmail(user.email || '');
          
          // Fetch full profile from users table
          const { data: dbUser, error: dbError } = await supabase
            .from('users')
            .select('full_name, profile_picture_url')
            .eq('id', userId)
            .single();

          if (dbError) {
            console.warn('Failed to fetch from users table, falling back to auth metadata:', dbError);
            // Fallback to auth metadata
            setFullName(user.user_metadata?.full_name || 'Admin User');
            if (user.user_metadata?.profile_picture_url) {
              setProfilePicture(`${user.user_metadata.profile_picture_url}?t=${Date.now()}`);
            }
          } else if (dbUser) {
            // Use database values
            const fullNameValue = dbUser.full_name || 'Admin User';
            setFullName(fullNameValue);
            setOriginalFullName(fullNameValue); // Store original

            if (dbUser.profile_picture_url) {
              const picUrl = `${dbUser.profile_picture_url}?t=${Date.now()}`;
              setProfilePicture(picUrl);
            }
          }

          // Calculate initials
          const name = dbUser?.full_name || user.user_metadata?.full_name || user.email || 'AD';
          const initialsComputed = name
            .split(' ')
            .map((p: string) => p[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          setInitials(initialsComputed || 'AD');
        } else {
          // Fallback to auth user
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();
          const fullNameValue = authUser?.user_metadata?.full_name || 'Admin User';
          setFullName(fullNameValue);
          setOriginalFullName(fullNameValue); // Store original
          setEmail(authUser?.email || '');
          const name = authUser?.user_metadata?.full_name || authUser?.email || 'AD';
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
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const fullNameValue = user?.user_metadata?.full_name || 'Admin User';
          setFullName(fullNameValue);
          setOriginalFullName(fullNameValue); // Store original
          setEmail(user?.email || '');
          const name = user?.user_metadata?.full_name || user?.email || 'AD';
          const initialsComputed = name
            .split(' ')
            .map((p: string) => p[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          setInitials(initialsComputed || 'AD');
        } catch (authErr) {
          console.error('Failed to load from auth:', authErr);
        }
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
      // Fetch the image as blob
      const response = await fetch(newImageUri);
      const blob = await response.blob();

      // Upload to the profile_picture bucket with user ID folder
      const filePath = `${userId}/${imageFileName}`; // Organize by user ID
      const { error: uploadError } = await supabase.storage
        .from('profile_picture')
        .upload(filePath, blob, { 
          contentType: 'image/jpeg', 
          upsert: true // Overwrite existing file
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get the public URL for the uploaded file
      const { data } = supabase.storage
        .from('profile_picture')
        .getPublicUrl(filePath);
      
      const publicUrl = data?.publicUrl;
      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }
      
      console.log('Image uploaded successfully. Public URL:', publicUrl);
      return publicUrl;
    } catch (err) {
      console.error('Upload failed:', err);
      Alert.alert('Upload Failed', 'Could not upload profile picture. Please try again.');
      return null;
    }
  };

  const handleSaveChanges = async () => {
    // 1. Validate that name is not empty
    if (!fullName.trim()) {
      setSweetAlertConfig({
        show: true,
        type: 'error',
        title: 'Validation Error',
        text: 'Full name cannot be empty.',
      });
      return;
    }

    // 2. Check what actually changed
    const nameChanged = fullName !== originalFullName;
    const pictureChanged = newImageSelected && newImageUri !== null;

    // 3. If nothing changed, show warning
    if (!nameChanged && !pictureChanged) {
      setSweetAlertConfig({
        show: true,
        type: 'warning',
        title: 'No Changes',
        text: 'You haven\'t made any changes to save.',
      });
      return;
    }

    // 4. Store pending data and show confirmation
    setPendingSaveData({
      publicUrl: null,
      nameChanged,
      pictureChanged,
    });
    setShowConfirmation(true);
  };

  // Handle confirmation of changes
  const handleConfirmSave = async () => {
    try {
      // Hide confirmation modal
      setShowConfirmation(false);

      if (!pendingSaveData) return;

      // get current user id
      const user = await getCurrentUser();
      const userId = user?.id;
      if (!userId) {
        Alert.alert('Error', 'Could not resolve current user');
        return;
      }

      let publicUrl: string | null = null;
      
      // If a new image was selected and uploaded, use the new URL
      if (pendingSaveData.pictureChanged && newImageUri) {
        const uploaded = await uploadProfilePicture(userId);
        if (uploaded) {
          publicUrl = uploaded;
        } else {
          // Upload failed, don't proceed with save
          return;
        }
      }

      // Build update object
      const updateData: any = {};
      
      if (pendingSaveData.nameChanged) {
        updateData.full_name = fullName;
      }
      
      // Only update profile_picture_url if we have a new one
      if (publicUrl) {
        updateData.profile_picture_url = publicUrl;
      }

      // Update users table
      const { error: dbError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (dbError) {
        console.error('Failed to update users table:', dbError);
        setSweetAlertConfig({
          show: true,
          type: 'error',
          title: 'Error',
          text: 'Failed to save profile changes. Please try again.',
        });
        return;
      }

      // Also update auth metadata for consistency if name changed
      if (pendingSaveData.nameChanged) {
        try {
          await supabase.auth.updateUser({ 
            data: { full_name: fullName } 
          });
        } catch (authErr) {
          console.warn('Failed to update auth metadata (non-critical):', authErr);
        }
      }

      // Update original values for next comparison
      if (pendingSaveData.nameChanged) {
        setOriginalFullName(fullName);
      }

      // Clear image selection state
      setNewImageSelected(false);
      setNewImageUri(null);
      setImageFileName(null);

      // Update displayed profile picture with cache buster
      if (publicUrl) {
        setProfilePicture(`${publicUrl}?t=${Date.now()}`);
      }

      // Close edit mode after successful save
      setIsEditMode(false);

      // Clear pending data
      setPendingSaveData(null);
      
      // Show contextual success message
      let successMessage = 'Profile updated successfully!';
      if (pendingSaveData.nameChanged && pendingSaveData.pictureChanged) {
        successMessage = 'Full name and profile picture updated successfully!';
      } else if (pendingSaveData.nameChanged) {
        successMessage = 'Full name updated successfully!';
      } else if (pendingSaveData.pictureChanged) {
        successMessage = 'Profile picture updated successfully!';
      }

      setSweetAlertConfig({
        show: true,
        type: 'success',
        title: 'Success!',
        text: successMessage,
      });
    } catch (err) {
      console.error('Save error:', err);
      setSweetAlertConfig({
        show: true,
        type: 'error',
        title: 'Error',
        text: 'An error occurred while saving changes. Please try again.',
      });
    }
  };

  // Password change handler
  const handleChangePassword = async () => {
    // Reset error
    setPasswordError(null);

    // Validation
    if (!oldPassword.trim()) {
      setPasswordError('Please enter your current password');
      return;
    }
    if (!newPassword.trim()) {
      setPasswordError('Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setChangingPassword(true);

    try {
      // 1. Verify old password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: oldPassword,
      });

      if (signInError) {
        setPasswordError('Current password is incorrect');
        setChangingPassword(false);
        return;
      }

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      // Show sweet alert success for password change
      setSweetAlertConfig({
        show: true,
        type: 'success',
        title: 'Success!',
        text: 'Your password has been changed successfully.',
      });
      // Reset modal and fields
      setIsPasswordModalOpen(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordError(null);
    } catch (err: any) {
      console.error('Password change error:', err);
      setSweetAlertConfig({
        show: true,
        type: 'error',
        title: 'Error',
        text: err.message || 'Failed to change password',
      });
    } finally {
      setChangingPassword(false);
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

            {/* Right-side header (notifications + profile) removed per user request */}
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
                <View className="flex-row gap-2.5">
                  <TouchableOpacity
                    className="flex-row items-center self-start rounded-lg bg-emerald-600 px-4 py-2"
                    onPress={() => setIsEditMode(true)}>
                    <Ionicons name="create-outline" size={16} color="white" />
                    <Text className="ml-1.5 text-sm font-semibold text-white">Edit Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-row items-center self-start rounded-lg border border-stone-300 bg-white px-4 py-2"
                    onPress={() => setIsPasswordModalOpen(true)}>
                    <Ionicons name="lock-closed-outline" size={16} color="#57534e" />
                    <Text className="ml-1.5 text-sm font-semibold text-stone-700">
                      Change Password
                    </Text>
                  </TouchableOpacity>
                </View>
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

      {/* Change Password Modal */}
      <Modal visible={isPasswordModalOpen} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/40 px-5">
          <View
            className="w-full max-w-md rounded-2xl bg-white"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.15,
              shadowRadius: 40,
            }}>
            <View className="border-b border-stone-100 px-6 pb-4 pt-6">
              <Text className="text-base font-bold text-stone-900">Change Password</Text>
              <Text className="mt-0.5 text-xs text-stone-400">
                Enter your current password and choose a new one
              </Text>
            </View>

            <ScrollView className="max-h-[70%] px-6 py-5">
              <View className="mb-4">
                <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Current Password *
                </Text>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="#a8a29e"
                  secureTextEntry
                  className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2.5 text-sm text-stone-900"
                  value={oldPassword}
                  onChangeText={setOldPassword}
                />
              </View>

              <View className="mb-4">
                <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-600">
                  New Password *
                </Text>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="#a8a29e"
                  secureTextEntry
                  className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2.5 text-sm text-stone-900"
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
              </View>

              <View className="mb-4">
                <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Confirm New Password *
                </Text>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="#a8a29e"
                  secureTextEntry
                  className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2.5 text-sm text-stone-900"
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                />
              </View>

              {passwordError && (
                <Text className="mb-2 text-xs text-red-500">{passwordError}</Text>
              )}
            </ScrollView>

            <View className="flex-row gap-3 px-6 pb-6">
              <TouchableOpacity
                className="flex-1 items-center rounded-lg border border-stone-100 bg-stone-50 py-3"
                onPress={() => {
                  setIsPasswordModalOpen(false);
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setPasswordError(null);
                }}>
                <Text className="text-sm font-semibold text-stone-600">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-lg bg-emerald-600 py-3"
                onPress={handleChangePassword}
                disabled={changingPassword}>
                {changingPassword ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-sm font-semibold text-white">Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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

      {/* Confirmation Modal */}
      <Modal visible={showConfirmation} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            {/* Icon */}
            <View className="items-center mb-4">
              <Ionicons name="help-circle" size={48} color="#EA580C" />
            </View>

            {/* Title */}
            <Text className="text-xl font-bold text-gray-800 text-center mb-2">
              Confirm Changes
            </Text>

            {/* Message */}
            <Text className="text-sm text-gray-600 text-center mb-6">
              {pendingSaveData?.nameChanged && pendingSaveData?.pictureChanged
                ? 'Your full name and profile picture will be updated.'
                : pendingSaveData?.nameChanged
                ? `Your full name will be changed to "${fullName}".`
                : 'Your profile picture will be updated.'}
            </Text>

            {/* Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowConfirmation(false);
                  setPendingSaveData(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-200 rounded-lg"
              >
                <Text className="text-center font-semibold text-gray-800">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmSave}
                className="flex-1 px-4 py-3 bg-orange-500 rounded-lg"
              >
                <Text className="text-center font-semibold text-white">Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sweet Alert Modal */}
      <SweetAlertModal
        visible={sweetAlertConfig.show}
        type={sweetAlertConfig.type || 'success'}
        title={sweetAlertConfig.title || 'Success'}
        message={sweetAlertConfig.text || ''}
        confirmText="Ok"
        onConfirm={() => setSweetAlertConfig({ show: false })}
      />
    </View>
  );
}