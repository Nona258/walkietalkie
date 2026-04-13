import React, { useRef, useState } from 'react';
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

function getPasswordValidationError(value: string): string | null {
  const password = value ?? '';
  if (!/[A-Za-z]/.test(password)) return 'Password must include at least one letter.';
  if (!/\d/.test(password)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(password))
    return 'Password must include at least one special character (e.g. ! @ #).';

  return null;
}

type PasswordStrength = {
  label: 'Low' | 'Medium' | 'Strong';
  percent: number;
  barClassName: string;
  textClassName: string;
};

function getPasswordStrength(value: string): PasswordStrength {
  const password = value ?? '';

  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const len = password.length;

  let score = 0;
  if (len >= 8) score += 1;
  if (len >= 12) score += 1;
  if (hasLetter) score += 1;
  if (hasNumber) score += 1;
  if (hasSpecial) score += 1;

  if (score >= 5) {
    return {
      label: 'Strong',
      percent: 100,
      barClassName: 'bg-green-500',
      textClassName: 'text-green-600',
    };
  }

  if (score >= 3) {
    return {
      label: 'Medium',
      percent: 66,
      barClassName: 'bg-yellow-500',
      textClassName: 'text-yellow-600',
    };
  }

  return {
    label: 'Low',
    percent: password.length ? 33 : 0,
    barClassName: 'bg-red-500',
    textClassName: 'text-red-500',
  };
}

type FieldKey = 'currentPassword' | 'newPassword' | 'retypeNewPassword';
type FieldErrors = Partial<Record<FieldKey, string>>;

export default function ChangePassword({ onBackToSettings }: { onBackToSettings?: () => void }) {
  const currentPasswordRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const retypeNewPasswordRef = useRef<TextInput>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [retypeNewPassword, setRetypeNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

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
    setFieldErrors({});
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const showFieldError = (
    field: FieldKey,
    title: string,
    message: string,
    ref?: React.RefObject<TextInput | null>
  ) => {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
    setAlert({
      visible: true,
      title,
      message,
      type: 'warning',
    });
    if (ref?.current) {
      requestAnimationFrame(() => ref.current?.focus());
    }
  };

  const clearFieldError = (field: FieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleChangePassword = async () => {
    const curr = currentPassword.trim();
    const next = newPassword.trim();
    const retype = retypeNewPassword.trim();

    setFieldErrors({});

    if (!curr) {
      return showFieldError(
        'currentPassword',
        'Missing Current Password',
        'Please enter your current password.',
        currentPasswordRef
      );
    }

    if (!next) {
      return showFieldError(
        'newPassword',
        'Missing New Password',
        'Please enter your new password.',
        newPasswordRef
      );
    }

    const passwordError = getPasswordValidationError(next);
    if (passwordError) {
      return showFieldError('newPassword', 'Invalid New Password', passwordError, newPasswordRef);
    }

    if (!retype) {
      return showFieldError(
        'retypeNewPassword',
        'Missing Re-type Password',
        'Please re-type your new password.',
        retypeNewPasswordRef
      );
    }

    if (next !== retype) {
      return showFieldError(
        'retypeNewPassword',
        'Passwords Do Not Match',
        'New Password and Re-type New Password must match.',
        retypeNewPasswordRef
      );
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
    <View className="flex-1 w-full bg-white">
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
      <View className="flex-row items-center gap-4 px-6 pt-6 pb-6 bg-[f8f4fb] shadow-sm">
        <TouchableOpacity
          onPress={onBackToSettings}
          className="items-center justify-center w-10 h-10 bg-[#237227] rounded-full active:scale-95">
          <Ionicons name="chevron-back" size={24} color="#f8f4fb" />
        </TouchableOpacity>
        <Text className="text-2xl font-extrabold text-gray-900">Change Password</Text>
      </View>

      <ScrollView
        className="flex-1 w-full"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 30 }}
        showsVerticalScrollIndicator={true}>
        <View className="mb-6">
          <Text className="mb-5 text-lg font-bold text-gray-800">Update Password</Text>

          <View className="mb-5">
            <Text className="mb-4 font-semibold text-gray-700">Current Password</Text>
            <View
              className={`flex-row items-center rounded-2xl border bg-gray-50 px-4 py-3 ${
                fieldErrors.currentPassword ? 'border-red-300' : 'border-[#237227]'
              }`}>
              <Ionicons name="key-outline" size={20} color="#237227" />
              <TextInput
                className="flex-1 ml-3 font-medium text-gray-900"
                placeholder="Enter current password"
                placeholderTextColor="#9ca3af"
                ref={currentPasswordRef}
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  clearFieldError('currentPassword');
                }}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            {!!fieldErrors.currentPassword && (
              <Text className="mt-2 text-xs text-red-500">{fieldErrors.currentPassword}</Text>
            )}
          </View>

          <View className="mb-5">
            <Text className="mb-2 font-semibold text-gray-700">New Password</Text>
            <View
              className={`flex-row items-center rounded-2xl border bg-gray-50 px-4 py-3 ${
                fieldErrors.newPassword ? 'border-red-300' : 'border-[#237227]'
              }`}>
              <Ionicons name="lock-open-outline" size={20} color="#237227" />
              <TextInput
                className="flex-1 ml-3 font-medium text-gray-900"
                placeholder="Enter new password"
                placeholderTextColor="#9ca3af"
                ref={newPasswordRef}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  clearFieldError('newPassword');
                }}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            {!!newPassword && (
              <View className="mt-2">
                <View className="w-full h-2 overflow-hidden bg-gray-200 rounded-full">
                  <View
                    className={`h-2 ${passwordStrength.barClassName}`}
                    style={{ width: `${passwordStrength.percent}%` }}
                  />
                </View>
                <Text className={`mt-1 text-xs ${passwordStrength.textClassName}`}>
                  Password strength: {passwordStrength.label}
                </Text>
              </View>
            )}
            {!!fieldErrors.newPassword && (
              <Text className="mt-2 text-xs text-red-500">{fieldErrors.newPassword}</Text>
            )}
          </View>

          <View className="mb-6">
            <Text className="mb-2 font-semibold text-gray-700">Re-type New Password</Text>
            <View
              className={`flex-row items-center rounded-2xl border bg-gray-50 px-4 py-3 ${
                fieldErrors.retypeNewPassword ? 'border-red-300' : 'border-[#237227]'
              }`}>
              <Ionicons name="lock-open-outline" size={20} color="#237227" />
              <TextInput
                className="flex-1 ml-3 font-medium text-gray-900"
                placeholder="Re-type new password"
                placeholderTextColor="#9ca3af"
                ref={retypeNewPasswordRef}
                value={retypeNewPassword}
                onChangeText={(text) => {
                  setRetypeNewPassword(text);
                  clearFieldError('retypeNewPassword');
                }}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            {!!fieldErrors.retypeNewPassword && (
              <Text className="mt-2 text-xs text-red-500">{fieldErrors.retypeNewPassword}</Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleChangePassword}
            activeOpacity={0.8}
            disabled={changingPassword}
            className="flex-row items-center justify-center p-4 bg-[#237227] rounded-2xl disabled:opacity-60">
            {changingPassword ? (
              <ActivityIndicator color="#f8f4fb" />
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