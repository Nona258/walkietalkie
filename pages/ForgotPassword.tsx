import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import supabase from '../utils/supabase';
import SweetAlertModal from '../components/SweetAlertModal';

interface ForgotPasswordProps {
  onBackToSignIn: () => void;
}

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

type FieldKey = 'email' | 'newPassword' | 'confirmNewPassword';
type FieldErrors = Partial<Record<FieldKey, string>>;

export default function ForgotPassword({ onBackToSignIn }: ForgotPasswordProps) {
  const emailRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmNewPasswordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [canUpdatePassword, setCanUpdatePassword] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    confirmText: 'OK',
    onConfirm: () => setAlertVisible(false),
  });

  const passwordStrength = getPasswordStrength(newPassword);

  useEffect(() => {
    // If we already have a session (e.g., user opened a recovery link that created a session),
    // we can allow password update directly from this screen.
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setCanUpdatePassword(!!data?.session);
      } catch {
        setCanUpdatePassword(false);
      }
    };
    checkSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setCanUpdatePassword(!!session);
    });

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

  const showFieldError = (
    field: FieldKey,
    title: string,
    message: string,
    ref?: React.RefObject<TextInput | null>
  ) => {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
    setAlertConfig({
      title,
      message,
      type: 'warning',
      confirmText: 'OK',
      onConfirm: () => setAlertVisible(false),
    });
    setAlertVisible(true);
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

  const handleSendRecoveryEmail = async () => {
    setFieldErrors({});

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return showFieldError('email', 'Missing Email', 'Please enter your email address.', emailRef);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return showFieldError(
        'email',
        'Invalid Email',
        'Please enter a valid email address.',
        emailRef
      );
    }

    setLoading(true);
    try {
      const redirectTo = Linking.createURL('forgot-password');
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo });
      if (error) throw error;

      setAlertConfig({
        title: 'Email Sent',
        message: 'Check your email for a password reset link.',
        type: 'success',
        confirmText: 'Back to Sign In',
        onConfirm: () => {
          setAlertVisible(false);
          onBackToSignIn();
        },
      });
      setAlertVisible(true);
    } catch (e: any) {
      const message = typeof e?.message === 'string' ? e.message : 'Failed to send reset email.';
      setAlertConfig({
        title: 'Error',
        message,
        type: 'error',
        confirmText: 'OK',
        onConfirm: () => setAlertVisible(false),
      });
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    setFieldErrors({});

    const next = newPassword.trim();
    const confirm = confirmNewPassword.trim();

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
      return showFieldError('newPassword', 'Invalid Password', passwordError, newPasswordRef);
    }

    if (!confirm) {
      return showFieldError(
        'confirmNewPassword',
        'Missing Confirm Password',
        'Please confirm your new password.',
        confirmNewPasswordRef
      );
    }

    if (next !== confirm) {
      return showFieldError(
        'confirmNewPassword',
        'Passwords Do Not Match',
        'New Password and Confirm Password must match.',
        confirmNewPasswordRef
      );
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;

      setNewPassword('');
      setConfirmNewPassword('');

      // After a successful password update, force the user back to sign-in.
      // (Recovery sessions should not keep the user “stuck” on this screen.)
      try {
        await supabase.auth.signOut();
      } catch {}
      onBackToSignIn();
    } catch (e: any) {
      const message = typeof e?.message === 'string' ? e.message : 'Failed to update password.';
      setAlertConfig({
        title: 'Error',
        message,
        type: 'error',
        confirmText: 'OK',
        onConfirm: () => setAlertVisible(false),
      });
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <View className="justify-center flex-1 px-6 sm:items-center sm:py-8">
          <View className="w-full max-w-3xl sm:bg-white sm:shadow-lg sm:rounded-2xl sm:p-8">
          {!canUpdatePassword ? (
            <>
              {/* Heading */}
               <View className="h-16 w-16 items-center justify-center rounded-full bg-[#237227] self-center mb-6">
                              <Ionicons name="radio" size={32} color="#f8fafb" />
                            </View>
              <Text className="mb-3 text-3xl font-bold text-center text-gray-900">
                Forgot password?
              </Text>

              {/* Subtext */}
              <Text className="mb-8 text-base text-center text-gray-600">
                No worries, we&apos;ll send you reset instructions.
              </Text>

              {/* Email Label */}
              <Text className="mb-2 text-sm font-medium text-gray-700">Email</Text>

              {/* Email Input */}
              <View
                className={`flex-row items-center rounded-lg border px-4 py-3.5 mb-6 ${
                  fieldErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}>
                <TextInput
                  className="flex-1 text-base text-gray-900"
                  placeholder="you@example.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  ref={emailRef}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    clearFieldError('email');
                  }}
                />
              </View>
              {!!fieldErrors.email && (
                <Text className="mb-4 -mt-4 text-sm text-red-500">{fieldErrors.email}</Text>
              )}

              {/* Reset Password Button */}
              <TouchableOpacity
                className="h-12 items-center justify-center rounded-lg bg-[#237227] mb-8"
                onPress={handleSendRecoveryEmail}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#f8fafb" />
                ) : (
                  <Text className="text-base font-semibold text-white">Reset password</Text>
                )}
              </TouchableOpacity>

              {/* Back to Sign In Link */}
              <TouchableOpacity
                className="flex-row items-center justify-center"
                onPress={onBackToSignIn}
                disabled={loading}>
                <Ionicons name="arrow-back" size={18} color="#6b7280" />
                <Text className="ml-2 text-sm font-medium text-gray-600">Back to sign in</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Password Update View - Keep existing logic */}
              <Text className="mb-3 text-3xl font-bold text-center text-gray-900">
                Set new password
              </Text>

              <Text className="mb-8 text-base text-center text-gray-600">
                Your new password must be different from previously used passwords.
              </Text>

              {/* New Password */}
              <Text className="mb-2 text-sm font-medium text-gray-700">New Password</Text>
              <View
                className={`mb-1 flex-row items-center rounded-lg border px-4 py-3.5 ${
                  fieldErrors.newPassword ? 'border-red-500' : 'border-gray-300'
                }`}>
                <TextInput
                  className="flex-1 text-base text-gray-900"
                  placeholder="Enter new password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showNewPassword}
                  ref={newPasswordRef}
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    clearFieldError('newPassword');
                  }}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowNewPassword((s) => !s)}>
                  <Ionicons
                    name={showNewPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={22}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
              {!!newPassword && (
                <View className="mb-3">
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
                <Text className="mb-3 text-sm text-red-500">{fieldErrors.newPassword}</Text>
              )}

              {/* Confirm Password */}
              <Text className="mt-4 mb-2 text-sm font-medium text-gray-700">Confirm Password</Text>
              <View
                className={`mb-1 flex-row items-center rounded-lg border px-4 py-3.5 ${
                  fieldErrors.confirmNewPassword ? 'border-red-500' : 'border-gray-300'
                }`}>
                <TextInput
                  className="flex-1 text-base text-gray-900"
                  placeholder="Confirm new password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showConfirmNewPassword}
                  ref={confirmNewPasswordRef}
                  value={confirmNewPassword}
                  onChangeText={(text) => {
                    setConfirmNewPassword(text);
                    clearFieldError('confirmNewPassword');
                  }}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirmNewPassword((s) => !s)}>
                  <Ionicons
                    name={showConfirmNewPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={22}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
              {!!fieldErrors.confirmNewPassword && (
                <Text className="mb-6 text-sm text-red-500">{fieldErrors.confirmNewPassword}</Text>
              )}

              {!fieldErrors.confirmNewPassword && <View className="mb-6" />}

              <TouchableOpacity
                className="h-12 items-center justify-center rounded-lg bg-[#237227] mb-8 mt-4"
                onPress={handleUpdatePassword}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#f8f4fb" />
                ) : (
                  <Text className="text-base font-semibold text-white">Update password</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center justify-center"
                onPress={onBackToSignIn}
                disabled={loading}>
                <Ionicons name="arrow-back" size={18} color="#6b7280" />
                <Text className="ml-2 text-sm font-medium text-gray-600">Back to sign in</Text>
              </TouchableOpacity>
            </>
          )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <SweetAlertModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        onConfirm={alertConfig.onConfirm}
      />
    </View>
  );
}