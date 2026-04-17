import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput, Dimensions, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import supabase, { getCurrentUser, uploadProfilePictureFromUri, updateUserProfile } from '../../utils/supabase';

import '../../global.css';

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const COLORS = {
  green: '#237227',
  greenLight: '#237227',
  cloudMist: '#f8fafb',
  white: '#ffffff',
  border: '#e5e7eb',
  borderLight: '#f0f4f0',
  textPrimary: '#1a2e1b',
  textSecondary: '#4b6b4d',
  textMuted: '#8fa88f',
};

const SCROLL_CONTENT_CONTAINER_STYLE = { flexGrow: 1 } as const;

interface SettingsProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

function LabeledInput({
  label,
  value,
  onChangeText,
  editable,
  icon,
  placeholder,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  editable: boolean;
  icon: string;
  placeholder?: string;
  secureTextEntry?: boolean;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-[#4b6b4d]">{label}</Text>
      <View
        className={
          'flex-row items-center gap-2 px-3 h-10 rounded-[9px] border ' +
          (editable ? 'bg-white border-[#237227]' : 'bg-[#f8fafb] border-[#e5e7eb]')
        }
      >
        <Ionicons name={icon as any} size={14} color={editable ? COLORS.green : COLORS.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secureTextEntry}
          className={'flex-1 text-sm ' + (editable ? 'text-[#1a2e1b]' : 'text-[#8fa88f]')}
        />
        {!editable && <Ionicons name="lock-closed-outline" size={12} color={COLORS.textMuted} />}
      </View>
    </View>
  );
}

export default function Settings({ onNavigate, isMobileMenuOpen, setIsMobileMenuOpen }: SettingsProps) {
  const windowWidth = Dimensions.get('window').width;
  const isWebView = windowWidth > 900;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const hasSharedMobileMenu = typeof setIsMobileMenuOpen === 'function';
  const openMenu = () => {
    if (setIsMobileMenuOpen) return setIsMobileMenuOpen(true);
    return setIsDrawerOpen(true);
  };
  const closeMenu = () => {
    if (setIsMobileMenuOpen) return setIsMobileMenuOpen(false);
    return setIsDrawerOpen(false);
  };

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const [fullName, setFullName] = useState('Admin User');
  const [email, setEmail] = useState('admin@company.com');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [newImageSelected, setNewImageSelected] = useState(false);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [phone, setPhone] = useState('+1 555-0100');
  const [role] = useState('Super Administrator');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();
          if (authUser) {
            setFullName(authUser.user_metadata?.full_name || 'Admin User');
            setEmail(authUser.email || '');
          }
          return;
        }

        setEmail(user.email || '');

        // Try to load full profile from users table
        const { data: dbUser, error: dbError } = await supabase
          .from('users')
          .select('full_name, profile_picture_url')
          .eq('id', user.id)
          .single();

        if (!dbError && dbUser) {
          const full = dbUser.full_name || 'Admin User';
          setFullName(full);
          if (dbUser.profile_picture_url) setProfilePicture(`${dbUser.profile_picture_url}?t=${Date.now()}`);
        } else {
          // fallback to auth metadata
          setFullName(user.user_metadata?.full_name || 'Admin User');
          if (user.user_metadata?.profile_picture_url) {
            setProfilePicture(`${user.user_metadata.profile_picture_url}?t=${Date.now()}`);
          }
        }
      } catch (err) {
        console.error('Failed to load admin profile:', err);
      }
    };

    loadProfile();
  }, []);

  const initials = useMemo(
    () =>
      fullName
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'AD',
    [fullName]
  );
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
        const asset = result.assets[0] as any;
        const { width, height, uri } = asset;
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

  // Emit a small cross-platform notification that the profile changed.
  // Other parts of the app can listen for the `profileUpdated` event.
  const emitProfileUpdate = (payload: Record<string, any>) => {
    try {
      if (typeof window !== 'undefined' && (window as any).dispatchEvent) {
        try {
          const ev = new CustomEvent('profileUpdated', { detail: payload });
          window.dispatchEvent(ev);
        } catch (e) {
          // Some environments may not support CustomEvent constructor
          const ev = document.createEvent('CustomEvent');
          ev.initCustomEvent('profileUpdated', false, false, payload);
          document.dispatchEvent(ev);
        }
      }
    } catch {}

    try {
      // emit on React Native DeviceEventEmitter if available
      // use require to avoid SSR/import issues
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { DeviceEventEmitter } = require('react-native');
      DeviceEventEmitter?.emit?.('profileUpdated', payload);
    } catch {}
  };

  const handleSave = async () => {
    setPasswordError(null);

    const wantsPasswordChange = !!(
      currentPassword.trim() ||
      newPassword.trim() ||
      confirmPassword.trim()
    );

    if (wantsPasswordChange) {
      if (!currentPassword.trim()) {
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
      if (newPassword !== confirmPassword) {
        setPasswordError('New passwords do not match');
        return;
      }
    }

    if (wantsPasswordChange) {
      setChangingPassword(true);
    }
    try {
      // Save password change first (if requested)
      if (wantsPasswordChange) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });

        if (signInError) {
          setPasswordError('Current password is incorrect');
          setChangingPassword(false);
          return;
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateError) {
          console.error('Password update error:', updateError);
          Alert.alert('Error', updateError.message || 'Failed to change password');
          setChangingPassword(false);
          return;
        }

        Alert.alert('Success', 'Your password has been changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError(null);
      }

      // Profile updates: check if name or picture changed
      const user = await getCurrentUser();
      const userId = user?.id;
      if (userId) {
        const nameChanged = fullName.trim() && fullName.trim() !== (user.user_metadata?.full_name || '');
        let publicUrl: string | null = null;

        if (newImageSelected && newImageUri && imageFileName) {
          publicUrl = await uploadProfilePictureFromUri(userId, newImageUri, imageFileName);
          if (!publicUrl) {
            // upload failed; stop profile save
            Alert.alert('Error', 'Failed to upload profile picture.');
            return;
          }
        }

        const updateData: any = {};
        if (nameChanged) updateData.full_name = fullName;
        if (publicUrl) updateData.profile_picture_url = publicUrl;

        if (Object.keys(updateData).length > 0) {
          await updateUserProfile(userId, updateData);
          if (updateData.profile_picture_url) {
            const newUrl = `${updateData.profile_picture_url}?t=${Date.now()}`;
            setProfilePicture(newUrl);
            emitProfileUpdate({ profile_picture_url: updateData.profile_picture_url, full_name: updateData.full_name });
          } else if (updateData.full_name) {
            emitProfileUpdate({ full_name: updateData.full_name });
          }
        }
      }

      setIsEditMode(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err: any) {
      console.error('Save settings error:', err);
      Alert.alert('Error', err.message || 'An error occurred while saving changes');
    } finally {
      if (wantsPasswordChange) {
        setChangingPassword(false);
      }
      // reset image selection flags after attempting save
      setNewImageSelected(false);
      setNewImageUri(null);
      setImageFileName(null);
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <View className="flex-1 bg-[#f8fafb]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={SCROLL_CONTENT_CONTAINER_STYLE}
      >
        {/* ── Top Header ─────────────────────────────────────────────────────── */}
        <View className="px-5 pt-4 pb-3 bg-white border-b border-stone-200 lg:px-8">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity
                onPress={openMenu}
                className="items-center justify-center mr-3 h-9 w-9 lg:hidden">
                <Ionicons name="menu" size={28} color={COLORS.green} />
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
          </View>
        </View>

        {/* ── Page Body ────────────────────────────────────────────────────── */}
        <View className="w-full px-5 py-4 lg:px-8 lg:py-6">
          <View className={`${isWebView ? 'flex-row' : 'flex-col'} items-stretch ${isWebView ? 'gap-5' : 'gap-4'}`}>
            {/* ── LEFT COLUMN — Profile Card ───────────────────────────────── */}
            <View className={isWebView ? 'w-[280px] shrink-0 self-stretch' : 'w-full'}>
              <View
                className={`bg-white border border-[#e5e7eb] rounded-2xl ${isWebView ? 'p-6' : 'p-4'} flex-1 self-stretch justify-between`}
              >
                <View className="items-center w-full">
                  <View
                    className={`${isWebView ? 'w-20 h-20' : 'w-16 h-16'} rounded-full items-center justify-center border-2 mb-3.5 bg-[#f8fafb] border-[#237227]`}
                  >
                    {profilePicture ? (
                      <Image
                        source={{ uri: profilePicture }}
                        style={{ width: isWebView ? 80 : 64, height: isWebView ? 80 : 64, borderRadius: 999 }}
                      />
                    ) : (
                      <Text className={`${isWebView ? 'text-2xl' : 'text-xl'} font-extrabold text-[#237227]`}>
                        {initials}
                      </Text>
                    )}
                  </View>

                  <Text
                    className={`${isWebView ? 'text-[17px]' : 'text-base'} font-bold text-center mb-[3px] text-[#1a2e1b]`}
                  >
                    {fullName}
                  </Text>
                  <Text className="mb-2 text-sm text-center text-[#8fa88f]">
                    {email}
                  </Text>

                  <View
                    className="px-3 py-1 mb-5 border rounded-full bg-[#f8fafb] border-[#237227]"
                  >
                    <Text className="text-sm font-semibold text-[#237227]">
                      {role}
                    </Text>
                  </View>

                  <View className="w-full h-px mb-4 bg-[#f0f4f0]" />

                  {[
                    { icon: 'shield-outline', label: 'Role', value: role },
                    { icon: 'time-outline', label: 'Member', value: 'Since Jan 2024' },
                  ].map((row) => (
                    <View key={row.label} className="w-full flex-row items-center mb-2.5 gap-2.5">
                      <View
                        className="w-7 h-7 rounded-full border items-center justify-center bg-[#237227] border-[#237227]"
                      >
                        <Ionicons name={row.icon as any} size={16} color={COLORS.cloudMist} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[10px] text-stone-900">
                          {row.label}
                        </Text>
                        <Text className="text-sm font-semibold text-stone-900">
                          {row.value}
                        </Text>
                      </View>
                    </View>
                  ))}

                  <View className="w-full h-px my-4 bg-[#f0f4f0]" />
                </View>

                <View className="w-full">
                  {isSaved && (
                    <View
                      className="w-full flex-row items-center px-3 py-2 rounded-lg mb-3.5 border bg-[#f8fafb] border-[#237227] gap-1.5"
                    >
                      <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.green} />
                      <Text className="flex-1 text-sm font-semibold text-[#237227]">
                        Profile updated!
                      </Text>
                    </View>
                  )}

                  {!isEditMode ? (
                    <TouchableOpacity
                      onPress={() => setIsEditMode(true)}
                      className="w-full flex-row items-center justify-center rounded-lg py-2.5 bg-[#237227] gap-1.5"
                    >
                      <Ionicons name="create-outline" size={16} color={COLORS.white} />
                      <Text className="text-sm font-semibold text-white">
                        Edit Profile
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="w-full gap-2.5">
                      <TouchableOpacity
                        onPress={handleSave}
                        disabled={changingPassword}
                        className="w-full h-10 rounded-lg items-center justify-center flex-row bg-[#237227] gap-1.5"
                      >
                        <Ionicons name="checkmark-outline" size={16} color={COLORS.white} />
                        <Text className="text-sm font-semibold text-white">
                          Save Changes
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleCancel}
                        className="w-full h-10 rounded-lg items-center justify-center bg-[#f8fafb] border border-[#237227]"
                      >
                        <Text className="text-sm font-semibold text-[#237227]">
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* ── RIGHT COLUMN — Info / Security ─────────────────────────── */}
            <View className={`${isWebView ? 'flex-1' : 'w-full'} gap-4`}>
              <View
                className={`bg-[#f8fafb] border border-[#e5e7eb] rounded-2xl ${isWebView ? 'p-6' : 'p-4'}`}
              >
                <View className="flex-row items-center mb-4.5 gap-2">
                  <View className="w-[30px] h-[30px] rounded-full items-center justify-center bg-[#237227]">
                    <Ionicons name="person-outline" size={15} color={COLORS.cloudMist} />
                  </View>
                  <Text className="text-sm font-bold text-[#1a2e1b]">
                    Profile Information
                  </Text>
                </View>

                <View className="gap-[14px]">
                  <LabeledInput
                    label="Full Name"
                    value={fullName}
                    onChangeText={setFullName}
                    editable={isEditMode}
                    icon="person-outline"
                    placeholder="Enter full name"
                  />
                  {/* Change Photo button */}
                  {isEditMode && (
                    <TouchableOpacity
                      className="mt-2 flex-row items-center gap-2 px-3 h-10 rounded-[9px] border bg-white border-[#237227]"
                      onPress={() => pickImage()}
                    >
                      <Ionicons name="camera-outline" size={14} color={COLORS.textMuted} />
                      <Text className="text-sm text-[#8fa88f]">Change Photo</Text>
                    </TouchableOpacity>
                  )}
                  <LabeledInput
                    label="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    editable={isEditMode}
                    icon="mail-outline"
                    placeholder="Enter email"
                  />
                  <LabeledInput
                    label="Phone Number"
                    value={phone}
                    onChangeText={setPhone}
                    editable={isEditMode}
                    icon="call-outline"
                    placeholder="Enter phone"
                  />
                  <View className="gap-1.5">
                    <Text className="text-sm font-semibold text-[#4b6b4d]">
                      Role
                    </Text>
                    <View
                      className="flex-row items-center gap-2 px-3 h-10 rounded-[9px] border bg-white border-[#e5e7eb]"
                    >
                      <Ionicons name="shield-outline" size={14} color={COLORS.textMuted} />
                      <Text className="flex-1 text-sm text-[#8fa88f]">
                        {role}
                      </Text>
                      <Ionicons name="lock-closed-outline" size={12} color={COLORS.textMuted} />
                    </View>
                  </View>
                </View>
              </View>

              <View
                className={`bg-[#f8fafb] border border-[#e5e7eb] rounded-2xl ${isWebView ? 'p-6' : 'p-4'}`}
              >
                <View className="flex-row items-center mb-4.5 gap-2">
                  <View className="w-[30px] h-[30px] rounded-full items-center justify-center bg-[#237227]">
                    <Ionicons name="lock-closed-outline" size={15} color={COLORS.cloudMist} />
                  </View>
                  <Text className="text-sm font-bold text-[#1a2e1b]">
                    Security
                  </Text>
                </View>

                <View className="gap-[14px]">
                  <LabeledInput
                    label="Current Password"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    editable={isEditMode}
                    icon="key-outline"
                    placeholder={isEditMode ? 'Enter current password' : '••••••••'}
                    secureTextEntry={isEditMode}
                  />
                  <LabeledInput
                    label="New Password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={isEditMode}
                    icon="lock-open-outline"
                    placeholder={isEditMode ? 'Enter new password' : '••••••••'}
                    secureTextEntry={isEditMode}
                  />
                  <LabeledInput
                    label="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={isEditMode}
                    icon="checkmark-circle-outline"
                    placeholder={isEditMode ? 'Confirm new password' : '••••••••'}
                    secureTextEntry={isEditMode}
                  />
                  {passwordError && (
                    <Text className="text-xs text-red-500">{passwordError}</Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Notification Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={isNotificationOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNotificationOpen(false)}
      >
        <Pressable
          className="items-end flex-1 bg-black/15 pt-[60px] pr-5"
          onPress={() => setIsNotificationOpen(false)}
        >
          <View
            className="w-[300px] rounded-2xl border border-[#e5e7eb] overflow-hidden bg-white"
          >
            <View
              className="flex-row items-center justify-between px-4 py-3.5 border-b border-[#f0f4f0]"
            >
              <Text className="text-sm font-bold text-[#1a2e1b]">
                Notifications
              </Text>
              <View className="px-2 py-0.5 rounded-full bg-[#f8fafb]">
                <Text className="text-[10px] font-semibold text-[#237227]">
                  1 new
                </Text>
              </View>
            </View>
            <View className="flex-row px-4 py-3 gap-2.5">
              <View className="items-center justify-center w-8 h-8 rounded-full bg-[#237227]">
                <Ionicons name="settings-outline" size={15} color={COLORS.cloudMist} />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-medium text-[#1a2e1b] leading-4">
                  Your account settings were updated
                </Text>
                <Text className="text-[11px] mt-0.5 text-[#8fa88f]">
                  Just now
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setIsNotificationOpen(false)}
              className="m-3 py-2.5 rounded-lg items-center bg-[#237227]"
            >
              <Text className="text-xs font-semibold text-white">
                Mark all as read
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Mobile Drawer (fallback only — Dashboard/AdminNavbar owns the shared drawer) */}
      {!hasSharedMobileMenu && (
        <Modal visible={isDrawerOpen} transparent animationType="fade" onRequestClose={closeMenu}>
          <View className="flex-row flex-1">
            <View className="w-64 h-full bg-white shadow-lg">
              <View className="px-5 pt-12 pb-5 border-b border-[#e5e7eb]">
                <Text className="text-sm font-bold text-[#1a2e1b]">Admin Portal</Text>
              </View>
              <ScrollView className="flex-1 px-3 py-3" showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg"
                  onPress={() => {
                    closeMenu();
                    onNavigate('dashboard');
                  }}
                >
                  <Ionicons name="grid-outline" size={18} color={COLORS.textMuted} />
                  <Text className="ml-3 text-sm font-medium text-[#4b6b4d]">Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg"
                  onPress={() => {
                    closeMenu();
                    onNavigate('siteManagement');
                  }}
                >
                  <Ionicons name="location-outline" size={18} color={COLORS.textMuted} />
                  <Text className="ml-3 text-sm font-medium text-[#4b6b4d]">Site Management</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg"
                  onPress={() => {
                    closeMenu();
                    onNavigate('walkieTalkie');
                  }}
                >
                  <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />
                  <Text className="ml-3 text-sm font-medium text-[#4b6b4d]">Contact Management</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg"
                  onPress={() => {
                    closeMenu();
                    onNavigate('activityLogs');
                  }}
                >
                  <Ionicons name="clipboard-outline" size={18} color={COLORS.textMuted} />
                  <Text className="ml-3 text-sm font-medium text-[#4b6b4d]">Activity Logs</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg"
                  onPress={() => {
                    closeMenu();
                    onNavigate('companyList');
                  }}
                >
                  <Ionicons name="business-outline" size={18} color={COLORS.textMuted} />
                  <Text className="ml-3 text-sm font-medium text-[#4b6b4d]">Company Lists</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg"
                  onPress={() => {
                    closeMenu();
                    onNavigate('employee');
                  }}
                >
                  <Ionicons name="people-outline" size={18} color={COLORS.textMuted} />
                  <Text className="ml-3 text-sm font-medium text-[#4b6b4d]">Employees</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg bg-[#f8fafb]"
                  onPress={() => {
                    closeMenu();
                    onNavigate('settings');
                  }}
                >
                  <Ionicons name="settings" size={18} color={COLORS.green} />
                  <Text className="ml-3 text-sm font-semibold text-[#237227]">Settings</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
            <Pressable className="flex-1 bg-black/15" onPress={closeMenu} />
          </View>
        </Modal>
      )}
    </View>
  );
}
