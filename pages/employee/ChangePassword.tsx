import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../utils/supabase';
import SweetAlertModal from '../../components/SweetAlertModal';

export default function ChangePassword({
  onBackToSettings,
}: {
  onBackToSettings?: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [retypeNewPassword, setRetypeNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setRetypeNewPassword('');
  };

  const handleChangePassword = async () => {
    const curr = currentPassword.trim();
    const next = newPassword.trim();
    const retype = retypeNewPassword.trim();

    if (!curr || !next || !retype) {
      setAlert({
        visible: true,
        title: 'Missing Fields',
        message: 'Please fill out all password fields.',
        type: 'warning',
      });
      return;
    }

    if (next !== retype) {
      setAlert({
        visible: true,
        title: 'Passwords Do Not Match',
        message: 'New Password and Re-type New Password must match.',
        type: 'warning',
      });
      return;
    }

    if (next.length < 6) {
      setAlert({
        visible: true,
        title: 'Weak Password',
        message: 'New Password must be at least 6 characters.',
        type: 'warning',
      });
      return;
    }

    setChangingPassword(true);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const email = user?.email;
      if (!email) throw new Error('Missing user email. Please sign in again.');

      // Verify current password by re-authenticating.
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email,
        password: curr,
      });
      if (verifyErr) {
        setAlert({
          visible: true,
          title: 'Incorrect Password',
          message: 'Your current password is incorrect.',
          type: 'error',
        });
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password: next });
      if (updateErr) throw updateErr;

      resetForm();
      setAlert({
        visible: true,
        title: 'Success',
        message: 'Password updated successfully.',
        type: 'success',
      });
    } catch (e: any) {
      const message =
        typeof e?.message === 'string' ? e.message : 'Failed to change password. Please try again.';
      setAlert({
        visible: true,
        title: 'Error',
        message,
        type: 'error',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <View className="w-full flex-1 bg-white">
      <StatusBar barStyle="light-content" />

      <SweetAlertModal
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        confirmText="OK"
        onConfirm={() => setAlert((a) => ({ ...a, visible: false }))}
        onCancel={() => setAlert((a) => ({ ...a, visible: false }))}
      />

      {/* HEADER WITH BACK BUTTON */}
      <View className="flex-row items-center gap-4 bg-white px-6 pb-6 pt-6">
        <TouchableOpacity
          onPress={onBackToSettings}
          className="h-10 w-10 items-center justify-center rounded-full bg-green-100 active:scale-95">
          <Ionicons name="chevron-back" size={24} color="#10b981" />
        </TouchableOpacity>
        <Text className="text-2xl font-extrabold text-gray-900">Change Password</Text>
      </View>

      <ScrollView
        className="w-full flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 30 }}
        showsVerticalScrollIndicator={true}>
        <View className="mb-6">
          <Text className="mb-4 text-lg font-bold text-gray-800">Update Password</Text>

          <View className="mb-5">
            <Text className="mb-2 font-semibold text-gray-700">Current Password</Text>
            <View className="flex-row items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <Ionicons name="key-outline" size={20} color="#10b981" />
              <TextInput
                className="ml-3 flex-1 font-medium text-gray-900"
                placeholder="Enter current password"
                placeholderTextColor="#9ca3af"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          <View className="mb-5">
            <Text className="mb-2 font-semibold text-gray-700">New Password</Text>
            <View className="flex-row items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <Ionicons name="lock-open-outline" size={20} color="#10b981" />
              <TextInput
                className="ml-3 flex-1 font-medium text-gray-900"
                placeholder="Enter new password"
                placeholderTextColor="#9ca3af"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="mb-2 font-semibold text-gray-700">Re-type New Password</Text>
            <View className="flex-row items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <Ionicons name="lock-open-outline" size={20} color="#10b981" />
              <TextInput
                className="ml-3 flex-1 font-medium text-gray-900"
                placeholder="Re-type new password"
                placeholderTextColor="#9ca3af"
                value={retypeNewPassword}
                onChangeText={setRetypeNewPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleChangePassword}
            activeOpacity={0.8}
            disabled={changingPassword}
            className="flex-row items-center justify-center rounded-2xl bg-green-500 p-4 disabled:opacity-60">
            {changingPassword ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color="white" />
                <Text className="ml-2 text-base font-bold text-white">Update Password</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
