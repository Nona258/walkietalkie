import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const [phone, setPhone] = useState('+1 555-0100');
  const [role] = useState('Super Administrator');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

  const handleSave = () => {
    setIsEditMode(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
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
        <View className="px-5 py-4 lg:px-8 lg:py-6 w-full">
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
                    <Text className={`${isWebView ? 'text-2xl' : 'text-xl'} font-extrabold text-[#237227]`}>
                      {initials}
                    </Text>
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
