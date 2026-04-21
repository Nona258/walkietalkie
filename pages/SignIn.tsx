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
  ScrollView,
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
    <View className="flex-1 bg-white md:bg-[#f8fafb]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <View className="flex-1">
          {/* Header - Hidden on mobile, shown on desktop */}
          <View className="hidden md:flex bg-[#f8fafb] border-b border-[#e5e7eb] px-6 py-4">
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-[#237227]">
                <Ionicons name="radio" size={22} color="#ffffff" />
              </View>
              <Text className="text-xl font-bold text-[#111827]">WalkieTalkie</Text>
            </View>
          </View>

          {/* Centered content: mobile is minimal and borderless; desktop keeps card/border/shadow */}
          <View className="items-center justify-center flex-1 px-0 md:px-6">
            <View className="w-full md:h-auto max-w-md bg-white p-6 md:p-8 md:rounded-2xl md:border md:border-[#f8f4fb] md:shadow-sm">
               <View className="items-center mb-6 md:mt-0">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#237227]">
                <Ionicons name="radio" size={32} color="#f8fafb" />
              </View>
            </View>

              {/* Heading */}
              <Text className="mb-2 text-2xl md:text-3xl text-center font-bold text-[#111827]">Welcome back</Text>
              <Text className="mb-6 md:mb-8 text-sm md:text-base text-center text-[#237227]">Sign in to your WalkieTalkie account</Text>

              {/* Error Message */}
              {error ? (
                <View className="mb-4 md:mb-6">
                  <Text className="text-sm text-center text-red-600">{error}</Text>
                </View>
              ) : null}

              {/* Email Field */}
              <View className="mb-4 md:mb-6">
                <Text className="mb-2 text-sm font-medium md:text-md text-stone-900">Email address</Text>
                <TextInput
                  className="w-full rounded-lg bg-[#f8f4fb] px-4 py-3 text-base text-[#111827] md:bg-white md:border md:border-[#d1d5db]"
                  placeholder="you@example.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* Password Field */}
              <View className="mb-2">
                <Text className="mb-2 text-sm font-medium md:text-md text-stone-900">Password</Text>
                <View className="relative">
                  <TextInput
                    className="w-full rounded-lg bg-[#f8f4fb] px-4 py-3 pr-12 text-base text-[#111827] md:bg-white md:border md:border-[#d1d5db]"
                    placeholder="Enter your password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    className="absolute right-4 top-3.5"
                    onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                className="self-end mb-4 md:mb-6"
                onPress={onNavigateToForgotPassword}
                disabled={loading}>
                <Text className="text-sm font-medium text-[#237227]">Forgot password?</Text>
              </TouchableOpacity>

              {/* Sign In Button */}
              <TouchableOpacity
                className="w-full mb-4 md:mb-6 h-12 items-center justify-center rounded-lg bg-[#237227] active:opacity-90 disabled:opacity-50"
                onPress={handleSignIn}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-base font-semibold text-white">Sign in</Text>
                )}
              </TouchableOpacity>
              
              {/* Sign Up Link */}
              <View className="flex-row items-center justify-center">
                <Text className="text-sm text-[#6b7280]">{"Don't have an account? "}</Text>
                <TouchableOpacity onPress={onNavigateToSignUp}>
                  <Text className="text-sm font-semibold text-[#237227]">Sign up</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>

        {/* Footer - Hidden on mobile, shown on desktop */}
        <View className="hidden md:flex bg-[bg-[#f8fafb]] border-t border-[#e5e7eb] px-6 py-4">
          <Text className="text-center text-md text-stone-900">
            © 2026 WalkieTalkie. All rights reserved.
          </Text>
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
        <View className="items-center justify-center flex-1 px-6 bg-black/50">
          <View className="items-center w-full max-w-sm p-8 bg-white rounded-2xl">
            <View className="mb-4 bg[#237227]">
              <Ionicons name="time-outline" size={56} color="#237227" />
            </View>
            <Text className="mb-3 text-2xl font-bold text-center text-stone-900">
              Approval Pending
            </Text>
            <Text className="mb-6 leading-6 text-center text-stone-600">
              Your account is still pending approval from the administrator. Please check back
              later.
            </Text>
            <View className="w-full px-4 py-3 mb-6 border border-[#237227] rounded-xl ">
              <Text className="text-xs font-semibold text-center text-stone-800">
                 You will be able to access the app once your account is approved
              </Text>
            </View>
            <TouchableOpacity
              className="w-full items-center rounded-xl bg-[#237227] py-3"
              onPress={() => setShowApprovalPendingModal(false)}>
              <Text className="font-bold text-white">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}