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
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../utils/supabase";
import { acceptEula, signOutUser } from "../utils/eula";
import SweetAlertModal from "../components/SweetAlertModal";
import EulaModal from "../components/EulaModal";
import "../global.css";

interface SignUpProps {
  onNavigateToSignIn: () => void;
  onSignUpSuccess: (user: any) => void;
}

export default function SignUp({ onNavigateToSignIn, onSignUpSuccess }: SignUpProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEulaModal, setShowEulaModal] = useState(false);
  const [eulaLoading, setEulaLoading] = useState(false);
  const [signedUpUser, setSignedUpUser] = useState<any>(null);
  const [showApprovalWaitingModal, setShowApprovalWaitingModal] = useState(false);

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
    if (!phoneNumber.trim())
      return Alert.alert("Error", "Please enter your phone number.");
    if (!/^\d{10,}$/.test(phoneNumber.trim()))
      return Alert.alert("Error", "Please enter a valid phone number (at least 10 digits).");
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
        // Check for specific error cases
        if (error.message && error.message.includes("already registered")) {
          setAlertConfig({
            title: "Email Already Registered",
            message: "This email is already registered. Please sign in with your existing account instead.",
            type: "warning",
            confirmText: "Go to Sign In",
            onConfirm: () => {
              setAlertVisible(false);
              onNavigateToSignIn();
            },
          });
        } else {
          setAlertConfig({
            title: "Sign Up Error",
            message: error.message || "Failed to create account. Please try again.",
            type: "error",
            confirmText: "OK",
            onConfirm: () => setAlertVisible(false),
          });
        }
        setAlertVisible(true);
        return;
      }

      if (!data.user) {
        throw new Error("User creation failed.");
      }

      // ✅ Insert into your public users table using upsert to handle conflicts
      const phoneNum = phoneNumber.trim() || null;
      
      const { error: insertError } = await supabase
        .from("users")
        .upsert({
          id: data.user.id,
          email: email.trim(),
          full_name: fullName.trim(),
          phone_number: phoneNum,
          is_approved: false,
        }, { 
          onConflict: 'id' 
        });

      if (insertError) {
        throw insertError;
      }

      // Show approval waiting modal instead of EULA modal
      setSignedUpUser(data.user);
      setShowApprovalWaitingModal(true);
    } catch (err: any) {
      const errorMessage = err.message || "Something went wrong. Please try again.";
      setAlertConfig({
        title: "Error",
        message: errorMessage,
        type: "error",
        confirmText: "OK",
        onConfirm: () => setAlertVisible(false),
      });
      setAlertVisible(true);
      console.error('Sign up error:', err);
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
        // Fetch user role from database
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', signedUpUser.id)
          .single();
        
        const userRole = userData?.role || 'employee';
        
        // Update auth user metadata with role to persist it
        await supabase.auth.updateUser({
          data: {
            full_name: signedUpUser.user_metadata?.full_name,
            role: userRole,
          },
        });
        
        // Refresh session to get updated user metadata
        const { data: updatedSession } = await supabase.auth.getSession();
        const userWithRole = updatedSession?.session?.user || signedUpUser;
        
        setShowEulaModal(false);
        setSignedUpUser(null);
        // Navigate to dashboard - user is already signed in
        onSignUpSuccess(userWithRole);
      } else {
        setAlertConfig({
          title: "Error",
          message: "Failed to accept EULA. Please try again.",
          type: "error",
          confirmText: "OK",
          onConfirm: () => setAlertVisible(false),
        });
        setAlertVisible(true);
      }
    } catch (err: any) {
      setAlertConfig({
        title: "Error",
        message: "An error occurred while accepting the EULA",
        type: "error",
        confirmText: "OK",
        onConfirm: () => setAlertVisible(false),
      });
      setAlertVisible(true);
      console.error('EULA accept error:', err);
    } finally {
      setEulaLoading(false);
    }
  };

  const handleApprovalWaitingClose = async () => {
    try {
      // Sign out the user since they're waiting for approval
      await signOutUser(signedUpUser?.id);
      
      setShowApprovalWaitingModal(false);
      setSignedUpUser(null);
      
      // Reset form
      setFullName('');
      setEmail('');
      setPhoneNumber('');
      setPassword('');
      setConfirmPassword('');
      
      // Navigate to sign in
      onNavigateToSignIn();
    } catch (err: any) {
      console.error('Error closing approval modal:', err);
      onNavigateToSignIn();
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
        title: "EULA Declined",
        message: "You must accept the EULA to use this app. Please try signing up again.",
        type: "warning",
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
        message: "An error occurred",
        type: "error",
        confirmText: "OK",
        onConfirm: () => setAlertVisible(false),
      });
      setAlertVisible(true);
      console.error('EULA decline error:', err);
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 overflow-hidden"
      >
        <View className="justify-center flex-1 px-8 overflow-hidden">
          {/* Logo */}
          <View className="items-center mb-10">
          <View className="w-20 h-20 bg-[#10b981] rounded-3xl items-center justify-center mb-6 shadow-lg shadow-[#10b981]/30">
            <Ionicons name="radio" size={38} color="#ffffff" />
          </View>
          <Text className="text-[#111827] text-3xl font-bold italic">
            SyncSpeak
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

        {/* Phone Number */}
        <View className="flex-row items-center px-3 py-3 mb-4 border border-green-300 rounded-xl">
          <Ionicons name="call-outline" size={20} color="#4ade80" />
          <TextInput
            className="flex-1 ml-2"
            placeholder="Phone Number"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
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
        onAccept={handleEulaAccept}
        onDecline={handleEulaDecline}
        loading={eulaLoading}
      />

      {/* Approval Waiting Modal */}
      <Modal visible={showApprovalWaitingModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl w-full max-w-sm p-8 items-center">
            <View className="mb-4">
              <Ionicons name="checkmark-circle-outline" size={56} color="#10b981" />
            </View>
            <Text className="text-2xl font-bold text-stone-900 text-center mb-3">
              Account Created
            </Text>
            <Text className="text-stone-600 text-center mb-6 leading-6">
              Your account has been created successfully. Please wait for the approval of the admin before you can access the app.
            </Text>
            <View className="w-full bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-6">
              <Text className="text-yellow-800 text-xs font-semibold text-center">
                ⏱️ You will be notified once your account is approved
              </Text>
            </View>
            <TouchableOpacity
              className="bg-[#10b981] rounded-xl w-full py-3 items-center"
              onPress={handleApprovalWaitingClose}
            >
              <Text className="text-white font-bold">Go to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
