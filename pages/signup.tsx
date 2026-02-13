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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../utils/supabase";
import SweetAlertModal from "../components/SweetAlertModal";
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

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    type: "info" as "success" | "error" | "warning" | "info",
    confirmText: "OK",
    onConfirm: () => setAlertVisible(false),
  });

  const handleSignUp = async () => {
    if (!fullName.trim())
      return Alert.alert("Error", "Please enter your full name.");
    if (!email.trim())
      return Alert.alert("Error", "Please enter your email.");
    if (!password)
      return Alert.alert("Error", "Please enter a password.");
    if (password.length < 6)
      return Alert.alert("Error", "Password must be at least 6 characters.");
    if (password !== confirmPassword)
      return Alert.alert("Error", "Passwords do not match.");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim()))
      return Alert.alert("Error", "Please enter a valid email address.");

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
          title: "Sign Up Error",
          message: error.message,
          type: "error",
          confirmText: "OK",
          onConfirm: () => setAlertVisible(false),
        });
        setAlertVisible(true);
        return;
      }

      if (!data.user) {
        throw new Error("User creation failed.");
      }

      // ✅ Insert into your public users table
      const { error: insertError } = await supabase
        .from("users")
        .insert({
          id: data.user.id,
          email: email.trim(),
          full_name: fullName.trim(),
        });

      if (insertError) {
        throw insertError;
      }

      setAlertConfig({
        title: "Success!",
        message: "Your account has been created successfully!",
        type: "success",
        confirmText: "Go to Sign In",
        onConfirm: () => {
          setAlertVisible(false);
          onNavigateToSignIn();
        },
      });
      setAlertVisible(true);
    } catch (err: any) {
      setAlertConfig({
        title: "Error",
        message: err.message || "Something went wrong.",
        type: "error",
        confirmText: "OK",
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-center px-8"
      >
        {/* Logo */}
        <View className="items-center mb-10">
          <View className="w-20 h-20 bg-[#10b981] rounded-3xl items-center justify-center mb-6 shadow-lg shadow-[#10b981]/30">
            <Ionicons name="chatbubble" size={38} color="#ffffff" />
          </View>
          <Text className="text-[#111827] text-3xl font-bold italic">
            WalkieTalk
          </Text>
          <Text className="text-[#6b7280] text-base mt-2">
            Create your account
          </Text>
        </View>

        {/* Full Name */}
        <View className="flex-row items-center px-3 py-3 mb-4 border border-green-300 rounded-xl">
          <Ionicons name="person-outline" size={20} color="#4ade80" />
          <TextInput
            className="flex-1 ml-2"
            placeholder="Full Name"
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        {/* Email */}
        <View className="flex-row items-center px-3 py-3 mb-4 border border-green-300 rounded-xl">
          <Ionicons name="mail-outline" size={20} color="#4ade80" />
          <TextInput
            className="flex-1 ml-2"
            placeholder="Email address"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password */}
        <View className="flex-row items-center px-3 py-3 mb-4 border border-green-300 rounded-xl">
          <Ionicons name="lock-closed-outline" size={20} color="#4ade80" />
          <TextInput
            className="flex-1 ml-2"
            placeholder="Password"
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

        {/* Confirm Password */}
        <View className="flex-row items-center px-3 py-3 mb-6 border border-green-300 rounded-xl">
          <Ionicons name="lock-closed-outline" size={20} color="#4ade80" />
          <TextInput
            className="flex-1 ml-2"
            placeholder="Confirm Password"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons
              name={
                showConfirmPassword ? "eye-outline" : "eye-off-outline"
              }
              size={20}
              color="#9ca3af"
            />
          </TouchableOpacity>
        </View>

        {/* Button */}
        <TouchableOpacity
          className="bg-[#10b981] rounded-2xl h-14 items-center justify-center"
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-lg font-bold text-white">Sign Up</Text>
          )}
        </TouchableOpacity>

        {/* Sign In */}
        <View className="flex-row justify-center mt-4">
          <Text>Already have an account? </Text>
          <TouchableOpacity onPress={onNavigateToSignIn}>
            <Text className="text-[#10b981] font-bold">Sign In</Text>
          </TouchableOpacity>
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
