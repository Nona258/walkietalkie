import React, { useState } from 'react';
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
import supabase from '../utils/supabase';
import { hasAcceptedEula, acceptEula } from '../utils/eula';
import EulaModal from '../components/EulaModal';
import '../global.css';

interface SignInProps {
  onNavigateToSignUp: () => void;
  onSignInSuccess: (user: any) => void;
}

export default function SignIn({ onNavigateToSignUp, onSignInSuccess }: SignInProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEulaModal, setShowEulaModal] = useState(false);
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
        // Mark user as online and fetch their role
        try {
          const { data: userData } = await supabase
            .from('users')
            .update({ status: 'online' })
            .eq('id', data.user.id)
            .select('role')
            .single();
          
          const userRole = userData?.role || 'employee';
          
          // Update auth user metadata with role to persist it
          await supabase.auth.updateUser({
            data: {
              full_name: data.user.user_metadata?.full_name,
              role: userRole,
            },
          });
          
          // Refresh session to get updated user metadata
          const { data: updatedSession } = await supabase.auth.getSession();
          const userWithRole = updatedSession?.session?.user || data.user;
          
          // Check if user has accepted EULA
          const eulaAccepted = await hasAcceptedEula(data.user.id);
          
          if (eulaAccepted) {
            // User has accepted EULA, proceed to dashboard
            onSignInSuccess(userWithRole);
          } else {
            // User hasn't accepted EULA, show modal
            setSignedInUser(userWithRole);
            setShowEulaModal(true);
          }
        } catch (err) {
          console.error('Failed to set user status to online or fetch role:', err);
          // Continue anyway with the original user
          const eulaAccepted = await hasAcceptedEula(data.user.id);
          if (eulaAccepted) {
            onSignInSuccess(data.user);
          } else {
            setSignedInUser(data.user);
            setShowEulaModal(true);
          }
        }
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'An error occurred during sign in';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

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
      // Attempt to mark the user offline first (if we have their id)
      const userId = signedInUser?.id;
      if (userId) {
        try {
          await supabase
            .from('users')
            .update({ status: 'offline' })
            .eq('id', userId);
        } catch (err) {
          console.error('Failed to set user status to offline:', err);
        }
      }

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
    <View className="flex-1 overflow-hidden bg-white md:bg-gray-50">
      {/* Background decorative elements */}
      <View className="absolute top-20 -left-20 w-48 h-48 rounded-full bg-[#34d399] opacity-10 md:w-64 md:h-64 md:top-10 md:-left-10" />
      <View className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-[#10b981] opacity-10 md:w-96 md:h-96" />
      <View className="absolute bottom-40 -right-16 w-48 h-48 rounded-full bg-[#059669] opacity-10 md:w-72 md:h-72 md:bottom-20 md:-right-20" />

      {/* Decorative rings */}
      <View className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full border-2 border-[#10b981]/15 md:w-72 md:h-72" />
      <View className="absolute bottom-48 -right-12 w-32 h-32 rounded-full border border-[#34d399]/20 md:w-48 md:h-48" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 overflow-hidden"
      >
        {/* Desktop: Center the form card */}
        <View className="justify-center flex-1 px-8 overflow-hidden md:items-center md:px-4">
          {/* Form Card - On desktop it becomes a centered card with shadow */}
          <View className="w-full md:max-w-md md:bg-white md:rounded-3xl md:shadow-xl md:p-10 md:border md:border-gray-100 lg:max-w-lg">
            {/* Logo */}
            <View className="items-center mb-10 md:mb-8">
              <View className="w-20 h-20 bg-[#10b981] rounded-3xl items-center justify-center mb-6 shadow-lg shadow-[#10b981]/30 md:w-24 md:h-24">
                <Ionicons name="radio" size={38} color="#ffffff" />
              </View>
              <Text className="text-[#111827] text-3xl font-bold italic tracking-wide md:text-4xl">SyncSpeak</Text>
              <Text className="text-[#6b7280] text-base mt-2 tracking-wide md:text-lg">Connect instantly. Talk freely.</Text>
            </View>

            {/* Form */}
            <View className="mt-2">
              {/* Email Input */}
              <View className="flex-row items-center px-3 py-3 mb-4 bg-white border border-green-300 rounded-xl md:px-4 md:py-4 md:rounded-2xl md:border-green-400/50 md:hover:border-green-500 md:transition-colors">
                <Ionicons name="mail-outline" size={20} color="#4ade80" />
                <TextInput
                  className="flex-1 ml-2 text-base outline-none md:text-lg md:ml-3"
                  placeholder="Email address"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* Password Input */}
              <View className="flex-row items-center px-3 py-3 mb-3 bg-white border border-green-300 rounded-xl md:px-4 md:py-4 md:rounded-2xl md:border-green-400/50 md:hover:border-green-500 md:transition-colors">
                <Ionicons name="lock-closed-outline" size={20} color="#4ade80" />
                <TextInput
                  className="flex-1 ml-2 text-base outline-none md:text-lg md:ml-3"
                  placeholder="Password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>

              {/* Error Message */}
              {error ? (
                <View className="px-4 py-3 mt-2 bg-red-50 rounded-xl">
                  <Text className="text-sm text-red-500 md:text-base">{error}</Text>
                </View>
              ) : null}

              {/* Forgot Password */}
              <TouchableOpacity className="self-end mt-2 mb-8 md:mb-6">
                <Text className="text-[#10b981] text-sm font-semibold md:text-base md:hover:underline">Forgot password?</Text>
              </TouchableOpacity>

              {/* Sign In Button */}
              <TouchableOpacity
                className="bg-[#10b981] rounded-2xl h-14 items-center justify-center mb-6 shadow-lg shadow-[#10b981]/30 active:opacity-90 disabled:opacity-50 md:h-16 md:rounded-2xl md:hover:bg-[#059669] md:transition-colors"
                onPress={handleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View className="flex-row items-center">
                    <Text className="text-lg font-bold tracking-wide text-white md:text-xl">Sign In</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Sign Up Link */}
              <View className="flex-row items-center justify-center mt-2">
                <Text className="text-[#6b7280] text-base md:text-lg">{"Don't have an account?"} </Text>
                <TouchableOpacity onPress={onNavigateToSignUp}>
                  <Text className="text-[#10b981] text-base font-bold md:text-lg md:hover:underline">Sign Up</Text>
                </TouchableOpacity>
              </View>
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
    </View>
  );
}