// pages/signup.tsx
import React, { useRef, useState } from 'react';
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

interface SignUpProps {
  onNavigateToSignIn: () => void;
  onSignUpSuccess: (user: any) => void;
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

type FieldKey = 'fullName' | 'email' | 'phoneNumber' | 'password' | 'confirmPassword';
type FieldErrors = Partial<Record<FieldKey, string>>;

export default function SignUp({ onNavigateToSignIn, onSignUpSuccess }: SignUpProps) {
  const fullNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneNumberRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEulaModal, setShowEulaModal] = useState(false);
  const [eulaLoading, setEulaLoading] = useState(false);
  const [signedUpUser, setSignedUpUser] = useState<any>(null);

  const passwordStrength = getPasswordStrength(password);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    confirmText: 'OK',
    onConfirm: () => setAlertVisible(false),
  });

  const showFieldError = (
    field: FieldKey,
    label: string,
    message: string,
    ref?: React.RefObject<TextInput | null>
  ) => {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
    Alert.alert('Error', `${label}: ${message}`);
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

  const handleSignUp = async () => {
    setFieldErrors({});

    if (!fullName.trim()) {
      return showFieldError('fullName', 'Full Name', 'Please enter your full name.', fullNameRef);
    }

    if (!email.trim()) {
      return showFieldError('email', 'Email', 'Please enter your email.', emailRef);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return showFieldError('email', 'Email', 'Please enter a valid email address.', emailRef);
    }

    if (!phoneNumber.trim()) {
      return showFieldError(
        'phoneNumber',
        'Phone Number',
        'Please enter your phone number.',
        phoneNumberRef
      );
    }

    if (!/^\d{10,}$/.test(phoneNumber.trim())) {
      return showFieldError(
        'phoneNumber',
        'Phone Number',
        'Please enter a valid phone number (at least 10 digits).',
        phoneNumberRef
      );
    }

    if (!password) {
      return showFieldError('password', 'Password', 'Please enter a password.', passwordRef);
    }

    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      return showFieldError('password', 'Password', passwordError, passwordRef);
    }

    if (!confirmPassword) {
      return showFieldError(
        'confirmPassword',
        'Confirm Password',
        'Please confirm your password.',
        confirmPasswordRef
      );
    }

    if (password !== confirmPassword) {
      return showFieldError(
        'confirmPassword',
        'Confirm Password',
        'Passwords do not match.',
        confirmPasswordRef
      );
    }

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
    <View className="flex-1 overflow-hidden bg-white">
      {/* Background decorative elements */}
      <View className="absolute -left-20 top-20 h-48 w-48 rounded-full bg-[#34d399] opacity-10" />
      <View className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[#10b981] opacity-10" />
      <View className="absolute -right-16 bottom-40 h-48 w-48 rounded-full bg-[#059669] opacity-10" />

      {/* Decorative rings */}
      <View className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full border-2 border-[#10b981]/15" />
      <View className="absolute -right-12 bottom-48 h-32 w-32 rounded-full border border-[#34d399]/20" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 overflow-hidden">
        <View className="flex-1 justify-center overflow-hidden px-8">
          {/* Logo */}
          <View className="mb-10 items-center">
            <View className="mb-6 h-20 w-20 items-center justify-center rounded-3xl bg-[#10b981] shadow-lg shadow-[#10b981]/30">
              <Ionicons name="radio" size={38} color="#ffffff" />
            </View>
            <Text className="text-3xl font-bold italic text-[#111827]">SyncSpeak</Text>
            <Text className="mt-2 text-base text-[#6b7280]">Create your account</Text>
          </View>

          {/* Full Name */}
          <View
            className={`mb-1 flex-row items-center rounded-xl border px-3 py-3 ${
              fieldErrors.fullName ? 'border-red-300' : 'border-green-300'
            }`}>
            <Ionicons name="person-outline" size={20} color="#4ade80" />
            <TextInput
              className="ml-2 flex-1"
              placeholder="Full Name"
              autoCapitalize="words"
              ref={fullNameRef}
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                clearFieldError('fullName');
              }}
            />
          </View>
          {!!fieldErrors.fullName && (
            <Text className="mb-3 text-xs text-red-500">{fieldErrors.fullName}</Text>
          )}

          {/* Email */}
          <View
            className={`mb-1 flex-row items-center rounded-xl border px-3 py-3 ${
              fieldErrors.email ? 'border-red-300' : 'border-green-300'
            }`}>
            <Ionicons name="mail-outline" size={20} color="#4ade80" />
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
            <Text className="mb-3 text-xs text-red-500">{fieldErrors.email}</Text>
          )}

          {/* Phone Number */}
          <View
            className={`mb-1 flex-row items-center rounded-xl border px-3 py-3 ${
              fieldErrors.phoneNumber ? 'border-red-300' : 'border-green-300'
            }`}>
            <Ionicons name="call-outline" size={20} color="#4ade80" />
            <TextInput
              className="ml-2 flex-1"
              placeholder="Phone Number"
              keyboardType="phone-pad"
              ref={phoneNumberRef}
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                clearFieldError('phoneNumber');
              }}
            />
          </View>
          {!!fieldErrors.phoneNumber && (
            <Text className="mb-3 text-xs text-red-500">{fieldErrors.phoneNumber}</Text>
          )}

          {/* Password */}
          <View
            className={`mb-1 flex-row items-center rounded-xl border px-3 py-3 ${
              fieldErrors.password ? 'border-red-300' : 'border-green-300'
            }`}>
            <Ionicons name="lock-closed-outline" size={20} color="#4ade80" />
            <TextInput
              className="ml-2 flex-1"
              placeholder="Password"
              secureTextEntry={!showPassword}
              ref={passwordRef}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearFieldError('password');
              }}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#9ca3af"
              />
            </TouchableOpacity>
          </View>
          {!!password && (
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
          {!!fieldErrors.password && (
            <Text className="mb-3 text-xs text-red-500">{fieldErrors.password}</Text>
          )}

          {/* Confirm Password */}
          <View
            className={`mb-1 flex-row items-center rounded-xl border px-3 py-3 ${
              fieldErrors.confirmPassword ? 'border-red-300' : 'border-green-300'
            }`}>
            <Ionicons name="lock-closed-outline" size={20} color="#4ade80" />
            <TextInput
              className="ml-2 flex-1"
              placeholder="Confirm Password"
              secureTextEntry={!showConfirmPassword}
              ref={confirmPasswordRef}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                clearFieldError('confirmPassword');
              }}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons
                name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#9ca3af"
              />
            </TouchableOpacity>
          </View>
          {!!fieldErrors.confirmPassword && (
            <Text className="mb-6 text-xs text-red-500">{fieldErrors.confirmPassword}</Text>
          )}

          {!fieldErrors.confirmPassword && <View className="mb-6" />}

          {/* Button */}
          <TouchableOpacity
            className="h-14 items-center justify-center rounded-2xl bg-[#10b981]"
            onPress={handleSignUp}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-lg font-bold text-white">Sign Up</Text>
            )}
          </TouchableOpacity>

          {/* Sign In */}
          <View className="mt-4 flex-row justify-center">
            <Text>Already have an account? </Text>
            <TouchableOpacity onPress={onNavigateToSignIn}>
              <Text className="font-bold text-[#10b981]">Sign In</Text>
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
    </View>
  );
}
