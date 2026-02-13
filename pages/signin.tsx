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
        onSignInSuccess(data.user);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'An error occurred during sign in';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white overflow-hidden">
      {/* Background decorative elements */}
      <View className="absolute top-20 -left-20 w-48 h-48 rounded-full bg-[#34d399] opacity-10" />
      <View className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-[#10b981] opacity-10" />
      <View className="absolute bottom-40 -right-16 w-48 h-48 rounded-full bg-[#059669] opacity-10" />

      {/* Decorative rings */}
      <View className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full border-2 border-[#10b981]/15" />
      <View className="absolute bottom-48 -right-12 w-32 h-32 rounded-full border border-[#34d399]/20" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 overflow-hidden"
      >
        <View className="justify-center flex-1 px-8 overflow-hidden">
          {/* Logo */}
          <View className="items-center mb-10">
            <View className="w-20 h-20 bg-[#10b981] rounded-3xl items-center justify-center mb-6 shadow-lg shadow-[#10b981]/30">
              <Ionicons name="chatbubble" size={38} color="#ffffff" />
            </View>
            <Text className="text-[#111827] text-3xl font-bold italic tracking-wide">WalkieTalk</Text>
            <Text className="text-[#6b7280] text-base mt-2 tracking-wide">Connect instantly. Talk freely.</Text>
          </View>

          {/* Form */}
          <View className="mt-2">
            {/* Email Input */}
            <View className="flex-row items-center px-3 py-3 mb-4 bg-white border border-green-300 rounded-xl">
              <Ionicons name="mail-outline" size={20} color="#4ade80" />
              <TextInput
                className="flex-1 ml-2 text-base outline-none"
                placeholder="Email address"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password Input */}
            <View className="flex-row items-center px-3 py-3 mb-3 bg-white border border-green-300 rounded-xl">
              <Ionicons name="lock-closed-outline" size={20} color="#4ade80" />
              <TextInput
                className="flex-1 ml-2 text-base outline-none"
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
              <View className="bg-red-50 rounded-xl px-4 py-3 mt-2">
                <Text className="text-red-500 text-sm">{error}</Text>
              </View>
            ) : null}

            {/* Forgot Password */}
            <TouchableOpacity className="self-end mt-2 mb-8">
              <Text className="text-[#10b981] text-sm font-semibold">Forgot password?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              className="bg-[#10b981] rounded-2xl h-14 items-center justify-center mb-6 shadow-lg shadow-[#10b981]/30 active:opacity-90 disabled:opacity-50"
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-lg font-bold tracking-wide text-white">Sign In</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View className="flex-row items-center justify-center mt-2">
              <Text className="text-[#6b7280] text-base">{"Don't have an account?"} </Text>
              <TouchableOpacity onPress={onNavigateToSignUp}>
                <Text className="text-[#10b981] text-base font-bold">Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}