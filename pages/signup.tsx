// pages/signup.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
// import { supabase } from '../utils/supabase';  // <-- uncomment once supabase is configured
import "../global.css";

interface SignUpProps {
  onNavigateToSignIn: () => void;
}

export default function SignUp({ onNavigateToSignIn }: SignUpProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email.");
      return;
    }
    if (!password) {
      Alert.alert("Error", "Please enter a password.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // TODO: Uncomment when supabase is properly configured
      // const { error } = await supabase.auth.signUp({
      //   email: email.trim(),
      //   password,
      //   options: {
      //     data: {
      //       full_name: fullName.trim(),
      //     },
      //   },
      // });
      // if (error) {
      //   Alert.alert('Sign Up Error', error.message);
      // } else {
      //   Alert.alert('Success', 'Account created!', [
      //     { text: 'OK', onPress: onNavigateToSignIn },
      //   ]);
      // }

      // Temporary stub:
      console.log("Sign up with:", fullName, email, password);
      Alert.alert("Success", "Account created successfully!", [
        { text: "OK", onPress: onNavigateToSignIn },
      ]);
    } catch {
      Alert.alert("Error", "Something went wrong.");
    }
    setLoading(false);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Background decorative elements */}
      <View className="absolute top-20 -left-20 w-48 h-48 rounded-full bg-[#34d399] opacity-10" />
      <View className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-[#10b981] opacity-10" />
      <View className="absolute bottom-40 -right-16 w-48 h-48 rounded-full bg-[#059669] opacity-10" />

      {/* Decorative rings */}
      <View className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full border-2 border-[#10b981]/15" />
      <View className="absolute bottom-48 -right-12 w-32 h-32 rounded-full border border-[#34d399]/20" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="justify-center flex-1 px-8">
            {/* Logo */}
            <View className="items-center mb-10">
              <View className="w-20 h-20 bg-[#10b981] rounded-3xl items-center justify-center mb-6 shadow-lg shadow-[#10b981]/30">
                <Ionicons name="chatbubble" size={38} color="#ffffff" />
              </View>
              <Text className="text-[#111827] text-3xl font-bold italic tracking-wide">
                WalkieTalk
              </Text>
              <Text className="text-[#6b7280] text-base mt-2 tracking-wide">
                Create your account
              </Text>
            </View>

            {/* Form */}
            <View className="mt-2">
              {/* Full Name Input */}
              <View className="flex-row items-center px-3 py-3 mb-4 bg-white border border-green-300 rounded-xl">
                <Ionicons name="person-outline" size={20} color="#4ade80" />
                <TextInput
                  className="flex-1 ml-2 text-base outline-none"
                  placeholder="Full Name"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="words"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

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
              <View className="flex-row items-center px-3 py-3 mb-4 bg-white border border-green-300 rounded-xl">
                <Ionicons name="lock-closed-outline" size={20} color="#4ade80" />
                <TextInput
                  className="flex-1 ml-2 text-base outline-none"
                  placeholder="Password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password Input */}
              <View className="flex-row items-center px-3 py-3 mb-8 bg-white border border-green-300 rounded-xl">
                <Ionicons name="lock-closed-outline" size={20} color="#4ade80" />
                <TextInput
                  className="flex-1 ml-2 text-base outline-none"
                  placeholder="Confirm Password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                className="bg-[#10b981] rounded-2xl h-14 items-center justify-center mb-6 shadow-lg shadow-[#10b981]/30 active:opacity-90"
                onPress={handleSignUp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View className="flex-row items-center">
                    <Text className="text-lg font-bold tracking-wide text-white">
                      Sign Up
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Sign In Link */}
              <View className="flex-row items-center justify-center mt-2">
                <Text className="text-[#6b7280] text-base">
                  Already have an account?{" "}
                </Text>
                <TouchableOpacity onPress={onNavigateToSignIn}>
                  <Text className="text-[#10b981] text-base font-bold">
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}