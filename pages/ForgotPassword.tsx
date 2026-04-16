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
    <View className="flex-1 overflow-hidden bg-white">
      {/* Background decorative elements */}
      <View className="absolute -left-20 top-20 h-48 w-48 rounded-full bg-[#10b981] opacity-10" />
      <View className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[#10b981] opacity-10" />
      <View className="absolute -right-16 bottom-40 h-48 w-48 rounded-full bg-[#10b981] opacity-10" />

      {/* Decorative rings */}
      <View className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full border-2 border-[#10b981]/15" />
      <View className="absolute -right-12 bottom-48 h-32 w-32 rounded-full border border-[#10b981]/20" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 overflow-hidden">
        <View className="flex-1 justify-center overflow-hidden px-8">
          {/* Header */}
          <View className="mb-8 flex-row items-center">
            <TouchableOpacity
              className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-green-100"
              onPress={onBackToSignIn}
              disabled={loading}>
              <Ionicons name="chevron-back" size={22} color="#10b981" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-[#111827]">Forgot Password</Text>
              <Text className="mt-1 text-sm text-[#6b7280]">
                {canUpdatePassword
                  ? 'Set a new password for your account.'
                  : 'Enter your email to receive a reset link.'}
              </Text>
            </View>
          </View>

          {!canUpdatePassword ? (
            <>
              {/* Email */}
              <View
                className={`mb-1 flex-row items-center rounded-xl border px-3 py-3 ${
                  fieldErrors.email ? 'border-red-300' : 'border-green-300'
                }`}>
                <Ionicons name="mail-outline" size={20} color="#10b981" />
                <TextInput
                  className="ml-2 flex-1"
                  placeholder="Email address"
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
                <Text className="mb-4 text-xs text-red-500">{fieldErrors.email}</Text>
              )}

              <TouchableOpacity
                className="mt-4 h-14 items-center justify-center rounded-2xl bg-[#10b981]"
                onPress={handleSendRecoveryEmail}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-lg font-bold text-white">Send Reset Link</Text>
                )}
              </TouchableOpacity>

              <View className="mt-4 flex-row justify-center">
                <Text>Remembered your password? </Text>
                <TouchableOpacity onPress={onBackToSignIn} disabled={loading}>
                  <Text className="font-bold text-[#10b981]">Sign In</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* New Password */}
              <View
                className={`mb-1 flex-row items-center rounded-xl border px-3 py-3 ${
                  fieldErrors.newPassword ? 'border-red-300' : 'border-green-300'
                }`}>
                <Ionicons name="lock-closed-outline" size={20} color="#10b981" />
                <TextInput
                  className="ml-2 flex-1"
                  placeholder="New Password"
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
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
              {!!newPassword && (
                <View className="mb-3">
                  <View className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
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
                <Text className="mb-3 text-xs text-red-500">{fieldErrors.newPassword}</Text>
              )}

              {/* Confirm */}
              <View
                className={`mb-1 flex-row items-center rounded-xl border px-3 py-3 ${
                  fieldErrors.confirmNewPassword ? 'border-red-300' : 'border-green-300'
                }`}>
                <Ionicons name="lock-closed-outline" size={20} color="#10b981" />
                <TextInput
                  className="ml-2 flex-1"
                  placeholder="Confirm New Password"
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
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
              {!!fieldErrors.confirmNewPassword && (
                <Text className="mb-6 text-xs text-red-500">{fieldErrors.confirmNewPassword}</Text>
              )}

              {!fieldErrors.confirmNewPassword && <View className="mb-6" />}

              <TouchableOpacity
                className="h-14 items-center justify-center rounded-2xl bg-[#10b981]"
                onPress={handleUpdatePassword}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-lg font-bold text-white">Update Password</Text>
                )}
              </TouchableOpacity>
            </>
          )}
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
