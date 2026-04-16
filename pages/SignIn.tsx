import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../utils/supabase';
import { hasAcceptedEula, acceptEula } from '../utils/eula';
import EulaModal from '../components/EulaModal';
import '../global.css';

interface SignInProps {
  onNavigateToSignUp: () => void;
  onNavigateToForgotPassword: () => void;
  onSignInSuccess: (user: any) => void;
}

function getPasswordValidationError(value: string): string | null {
  const password = value ?? '';

  if (password === '123456') return 'Password cannot be 123456.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password)) return 'Password must include at least one letter.';
  if (!/\d/.test(password)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(password))
    return 'Password must include at least one special character (e.g. ! @ #).';

  return null;
}

export default function SignIn({
  onNavigateToSignUp,
  onNavigateToForgotPassword,
  onSignInSuccess,
}: SignInProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEulaModal, setShowEulaModal] = useState(false);
  const [showApprovalPendingModal, setShowApprovalPendingModal] = useState(false);
  const [eulaLoading, setEulaLoading] = useState(false);
  const [signedInUser, setSignedInUser] = useState<any>(null);

  // Auto-hide error after 5 seconds
  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (data?.user) {
        // Check if user is approved (admins are automatically approved)
        const metadataRole = data.user.user_metadata?.role;
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, is_approved')
          .eq('id', data.user.id)
          .single();

        const role = userData?.role || metadataRole || 'employee';
        const isAdmin = role === 'admin';

        // If we cannot verify approval from DB, fail closed for non-admins.
        if (userError || !userData) {
          if (!isAdmin) {
            console.error('Failed to check approval status:', userError);
            setSignedInUser(data.user);
            setShowApprovalPendingModal(true);
            await supabase.auth.signOut();
            return;
          }
        }

        const isApproved = isAdmin || userData?.is_approved === true;
        if (!isApproved) {
          setSignedInUser(data.user);
          setShowApprovalPendingModal(true);
          await supabase.auth.signOut();
          return;
        }

        // Check if user has accepted EULA
        try {
          const eulaAccepted = await hasAcceptedEula(data.user.id);

          if (eulaAccepted) {
            // User has accepted EULA, proceed to dashboard
            onSignInSuccess(data.user);
          } else {
            // User hasn't accepted EULA, show modal
            setSignedInUser(data.user);
            setShowEulaModal(true);
          }
        } catch (err) {
          console.error('Error during sign in:', err);
          // Continue with user anyway
          onSignInSuccess(data.user);
        }
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'An error occurred during sign in';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEulaAccept = async () => {
    if (!signedInUser) return;

    setEulaLoading(true);
    try {
      const success = await acceptEula(signedInUser.id);

      if (success) {
        setShowEulaModal(false);
        setSignedInUser(null);
        onSignInSuccess(signedInUser);
      } else {
        setError('Failed to accept EULA. Please try again.');
      }
    } catch (err: any) {
      setError('An error occurred while accepting the EULA');
      console.error('EULA accept error:', err);
    } finally {
      setEulaLoading(false);
    }
  };

  const handleEulaDecline = async () => {
    try {
      // Sign out the user
      const { error: signOutError } = await supabase.auth.signOut();

      if (!signOutError) {
        setShowEulaModal(false);
        setSignedInUser(null);
        setEmail('');
        setPassword('');
      } else {
        setError(signOutError.message || 'Failed to sign out. Please try again.');
      }
    } catch (err: any) {
      setError('An error occurred while signing out');
      console.error('Sign out error:', err);
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
          {/* Logo */}
          <View className="mb-10 items-center">
            <View className="mb-6 h-20 w-20 items-center justify-center rounded-3xl bg-[#10b981] shadow-lg shadow-[#10b981]/30">
              <Ionicons name="radio" size={38} color="#ffffff" />
            </View>
            <Text className="text-3xl font-bold italic tracking-wide text-[#111827]">
              SyncSpeak
            </Text>
            <Text className="mt-2 text-base tracking-wide text-[#6b7280]">
              Connect instantly. Talk freely.
            </Text>
          </View>

          {/* Form */}
          <View className="mt-2">
            {/* Email Input */}
            <View className="mb-4 flex-row items-center rounded-xl border border-green-300 bg-white px-3 py-3">
              <Ionicons name="mail-outline" size={20} color="#10b981" />
              <TextInput
                className="ml-2 flex-1 text-base outline-none"
                placeholder="Email address"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password Input */}
            <View className="mb-3 flex-row items-center rounded-xl border border-green-300 bg-white px-3 py-3">
              <Ionicons name="lock-closed-outline" size={20} color="#10b981" />
              <TextInput
                className="ml-2 flex-1 text-base outline-none"
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error ? (
              <View className="mt-2 rounded-xl bg-red-50 px-4 py-3">
                <Text className="text-sm text-red-500">{error}</Text>
              </View>
            ) : null}

            {/* Forgot Password */}
            <TouchableOpacity
              className="mb-8 mt-2 self-end"
              onPress={onNavigateToForgotPassword}
              disabled={loading}>
              <Text className="text-sm font-semibold text-[#10b981]">Forgot password?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              className="mb-6 h-14 items-center justify-center rounded-2xl bg-[#10b981] shadow-lg shadow-[#10b981]/30 active:opacity-90 disabled:opacity-50"
              onPress={handleSignIn}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-lg font-bold tracking-wide text-white">Sign In</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View className="mt-2 flex-row items-center justify-center">
              <Text className="text-base text-[#6b7280]">{"Don't have an account?"} </Text>
              <TouchableOpacity onPress={onNavigateToSignUp}>
                <Text className="text-base font-bold text-[#10b981]">Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* EULA Modal */}
      <EulaModal
        visible={showEulaModal}
        onAccept={handleEulaAccept}
        onDecline={handleEulaDecline}
        loading={eulaLoading}
      />

      {/* Approval Pending Modal */}
      <Modal visible={showApprovalPendingModal} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-sm items-center rounded-2xl bg-white p-8">
            <View className="mb-4">
              <Ionicons name="time-outline" size={56} color="#f59e0b" />
            </View>
            <Text className="mb-3 text-center text-2xl font-bold text-stone-900">
              Approval Pending
            </Text>
            <Text className="mb-6 text-center leading-6 text-stone-600">
              Your account is still pending approval from the administrator. Please check back
              later.
            </Text>
            <View className="mb-6 w-full rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
              <Text className="text-center text-xs font-semibold text-yellow-800">
                ⏱️ You will be able to access the app once your account is approved
              </Text>
            </View>
            <TouchableOpacity
              className="w-full items-center rounded-xl bg-[#10b981] py-3"
              onPress={() => setShowApprovalPendingModal(false)}>
              <Text className="font-bold text-white">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
