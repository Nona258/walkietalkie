// pages/signup.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../utils/supabase';
import { acceptEula, signOutUser } from '../utils/eula';
import SweetAlertModal from '../components/SweetAlertModal';
import EulaModal from '../components/EulaModal';
import '../global.css';

interface SignUpProps {
  onNavigateToSignIn: () => void;
  onSignUpSuccess: (user: any) => void;
}

export default function SignUp({ onNavigateToSignIn, onSignUpSuccess }: SignUpProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEulaModal, setShowEulaModal] = useState(false);
  const [eulaForViewing, setEulaForViewing] = useState(false);
  const [eulaLoading, setEulaLoading] = useState(false);
  const [signedUpUser, setSignedUpUser] = useState<any>(null);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    confirmText: 'OK',
    onConfirm: () => setAlertVisible(false),
  });

  const handleSignUp = async () => {
    if (!fullName.trim()) return Alert.alert('Error', 'Please enter your full name.');
    if (!email.trim()) return Alert.alert('Error', 'Please enter your email.');
    if (!phoneNumber.trim()) return Alert.alert('Error', 'Please enter your phone number.');
    if (!/^\d{10,}$/.test(phoneNumber.trim()))
      return Alert.alert('Error', 'Please enter a valid phone number (at least 10 digits).');
    if (!password) return Alert.alert('Error', 'Please enter a password.');
    if (password.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters.');
    if (password !== confirmPassword) return Alert.alert('Error', 'Passwords do not match.');
    if (!agreeToTerms) return Alert.alert('Error', 'Please agree to the Terms of Service and Privacy Policy.');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim()))
      return Alert.alert('Error', 'Please enter a valid email address.');

    setLoading(true);

    try {
      // ✅ SAVE full_name inside Auth user_metadata
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        setAlertConfig({
          title: 'Sign Up Error',
          message: error.message,
          type: 'error',
          confirmText: 'OK',
          onConfirm: () => setAlertVisible(false),
        });
        setAlertVisible(true);
        return;
      }

      if (!data.user) {
        throw new Error('User creation failed.');
      }

      // ✅ Insert into your public users table using upsert to handle conflicts
      const phoneNum = phoneNumber.trim() || null;

      const { error: insertError } = await supabase.from('users').upsert(
        {
          id: data.user.id,
          email: email.trim(),
          full_name: fullName.trim(),
          phone_number: phoneNum,
        },
        {
          onConflict: 'id',
        }
      );

      if (insertError) {
        throw insertError;
      }

      // Approval gate: unapproved users should NOT see EULA/dashboard yet
      try {
        const { data: dbUser, error: dbUserError } = await supabase
          .from('users')
          .select('role, is_approved')
          .eq('id', data.user.id)
          .single();
        if (dbUserError) throw dbUserError;

        const role = dbUser?.role || data.user.user_metadata?.role || 'employee';
        const isAdmin = role === 'admin';
        const isApproved = isAdmin || dbUser?.is_approved === true;

        if (!isApproved) {
          await signOutUser(data.user.id);
          setAlertConfig({
            title: 'Approval Pending',
            message:
              'Your account is still pending approval from the administrator. Please check back later.',
            type: 'info',
            confirmText: 'Go to Sign In',
            onConfirm: () => {
              setAlertVisible(false);
              onNavigateToSignIn();
            },
          });
          setAlertVisible(true);
          return;
        }
      } catch (err: any) {
        console.error('Failed to check approval status after signup:', err);
        await signOutUser(data.user.id);
        setAlertConfig({
          title: 'Approval Pending',
          message:
            'Your account is still pending approval from the administrator. Please check back later.',
          type: 'info',
          confirmText: 'Go to Sign In',
          onConfirm: () => {
            setAlertVisible(false);
            onNavigateToSignIn();
          },
        });
        setAlertVisible(true);
        return;
      }

      // Approved users can proceed to EULA
      setSignedUpUser(data.user);
      setShowEulaModal(true);
    } catch (err: any) {
      setAlertConfig({
        title: 'Error',
        message: err.message || 'Something went wrong.',
        type: 'error',
        confirmText: 'OK',
        onConfirm: () => setAlertVisible(false),
      });
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEulaAccept = async () => {
    if (!signedUpUser) return;

    setEulaLoading(true);
    try {
      const success = await acceptEula(signedUpUser.id);

      if (success) {
        // User accepted EULA, proceed to dashboard
        setShowEulaModal(false);
        setSignedUpUser(null);
        onSignUpSuccess(signedUpUser);
      } else {
        setAlertConfig({
          title: 'Error',
          message: 'Failed to accept EULA. Please try again.',
          type: 'error',
          confirmText: 'OK',
          onConfirm: () => setAlertVisible(false),
        });
        setAlertVisible(true);
      }
    } catch (err: any) {
      setAlertConfig({
        title: 'Error',
        message: 'An error occurred while accepting the EULA',
        type: 'error',
        confirmText: 'OK',
        onConfirm: () => setAlertVisible(false),
      });
      setAlertVisible(true);
      console.error('EULA accept error:', err);
    } finally {
      setEulaLoading(false);
    }
  };

  const handleEulaDecline = async () => {
    try {
      // Sign out the user since they declined EULA, and mark offline
      await signOutUser(signedUpUser?.id);

      setShowEulaModal(false);
      setSignedUpUser(null);

      // Reset form
      setFullName('');
      setEmail('');
      setPhoneNumber('');
      setPassword('');
      setConfirmPassword('');

      setAlertConfig({
        title: 'EULA Declined',
        message: 'You must accept the EULA to use this app. Please try signing up again.',
        type: 'warning',
        confirmText: 'Go to Sign In',
        onConfirm: () => {
          setAlertVisible(false);
          onNavigateToSignIn();
        },
      });
      setAlertVisible(true);
    } catch (err: any) {
      setAlertConfig({
        title: 'Error',
        message: 'An error occurred',
        type: 'error',
        confirmText: 'OK',
        onConfirm: () => setAlertVisible(false),
      });
      setAlertVisible(true);
      console.error('EULA decline error:', err);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <View className="items-center justify-center flex-1 px-4 py-8">
          {/* Responsive wrapper: no card on mobile, card styles only on larger screens */}
          <View className="w-full max-w-3xl p-0 sm:p-6 sm:bg-white sm:shadow-lg sm:rounded-2xl">
            {/* Header */}
            <View className="mb-6">
              <Text className="mb-2 text-3xl font-bold text-gray-900 sm:text-4xl">Create your account</Text>
              <Text className="text-sm text-gray-500 sm:text-base">Start communicating instantly with walkietalkie</Text>
            </View>

            {/* Full Name */}
            <View className="mb-4">
              <TextInput
                className="px-4 text-base border border-gray-200 h-14 rounded-2xl bg-gray-50"
                placeholder="Full name"
                placeholderTextColor="#9ca3af"
                autoCapitalize="words"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {/* Email */}
            <View className="mb-4">
              <TextInput
                className="px-4 text-base border border-gray-200 h-14 rounded-2xl bg-gray-50"
                placeholder="Email address"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Phone Number */}
            <View className="mb-4">
              <TextInput
                className="px-4 text-base border border-gray-200 h-14 rounded-2xl bg-gray-50"
                placeholder="Phone number"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>

            {/* Password */}
            <View className="flex-row items-center px-4 mb-4 border border-gray-200 rounded-2xl bg-gray-50">
              <TextInput
                className="flex-1 text-base h-14"
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={22}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <View className="flex-row items-center px-4 mb-6 border border-gray-200 rounded-2xl bg-gray-50">
              <TextInput
                className="flex-1 text-base h-14"
                placeholder="Confirm password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={22}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
            {/* Terms & Conditions checkbox */}
            <View className="flex-row items-center px-2 mb-4">
              <TouchableOpacity
                className="mr-3"
                onPress={() => setAgreeToTerms((v) => !v)}>
                <Ionicons
                  name={agreeToTerms ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={agreeToTerms ? '#237227' : '#9ca3af'}
                />
              </TouchableOpacity>
              <Text className="flex-1 text-sm text-gray-700">
                I agree to the{' '}
                <Text
                  className="text-[#237227] font-semibold"
                  onPress={() => {
                    setEulaForViewing(true);
                    setShowEulaModal(true);
                  }}>
                  Terms of Service
                </Text>
                {' '}and{' '}
                <Text
                  className="text-[#237227] font-semibold"
                  onPress={() => {
                    setEulaForViewing(true);
                    setShowEulaModal(true);
                  }}>
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>

            {/* Create Account Button */}
            <TouchableOpacity
              className="w-full items-center justify-center mb-4 bg-[#237227] shadow-sm h-14 rounded-2xl"
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator color="#f8f4fb" />
              ) : (
                <Text className="text-lg font-semibold text-white">Create account</Text>
              )}
            </TouchableOpacity>

            {/* Sign In Link */}
            <View className="flex-row justify-center">
              <Text className="text-sm text-gray-600">Already have an account? </Text>
              <TouchableOpacity onPress={onNavigateToSignIn}>
                <Text className="text-md font-semibold text-[#237227]">Sign in</Text>
              </TouchableOpacity>
            </View>
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

      <EulaModal
        visible={showEulaModal}
        onAccept={async () => {
          if (eulaForViewing) {
            setAgreeToTerms(true);
            setShowEulaModal(false);
            setEulaForViewing(false);
            return;
          }
          await handleEulaAccept();
        }}
        onDecline={() => {
          if (eulaForViewing) {
            setShowEulaModal(false);
            setEulaForViewing(false);
            return;
          }
          handleEulaDecline();
        }}
        loading={eulaLoading}
      />
    </View>
  );
}
