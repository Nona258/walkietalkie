import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../global.css';

interface EulaModalProps {
  visible: boolean;
  onAccept: () => Promise<void>;
  onDecline: () => void;
  loading?: boolean;
}

export default function EulaModal({
  visible,
  onAccept,
  onDecline,
  loading = false,
}: EulaModalProps) {
  const [isAccepting, setIsAccepting] = React.useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept();
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onDecline}>
      <View className="flex-1 bg-black/40">
        <View className="flex-1 justify-end">
          <View className="rounded-t-4xl max-h-full min-h-96 bg-white shadow-2xl">
            {/* Header with Icon */}
            <View className="rounded-t-4xl border-b border-green-100 bg-gradient-to-b from-green-50 to-white px-6 py-8">
              <View className="mb-4 flex-row items-center">
                <View className="mr-4 h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <Ionicons name="document-text-outline" size={28} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-gray-900">License Agreement</Text>
                  <Text className="mt-1 text-xs font-semibold text-green-600">
                    Please review & accept
                  </Text>
                </View>
              </View>
              <View className="h-1 rounded-full bg-gradient-to-r from-green-400 to-green-600" />
            </View>

            {/* Content */}
            <ScrollView className="flex-1 bg-gray-50 px-6 py-6">
              {/* Intro Section */}
              <View className="mb-5 rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
                <View className="mb-3 flex-row items-start">
                  <View className="mr-3 mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-green-100">
                    <Ionicons name="checkmark" size={16} color="#10b981" />
                  </View>
                  <Text className="flex-1 text-base font-bold text-gray-900">
                    TERMS & CONDITIONS
                  </Text>
                </View>
                <Text className="text-sm leading-6 text-gray-600">
                  By using SyncSpeak, you agree to these terms. Please read carefully before
                  proceeding.
                </Text>
              </View>

              {/* Section 1 */}
              <View className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <View className="mb-3 flex-row items-center">
                  <Text className="mr-2 text-lg font-bold text-green-600">①</Text>
                  <Text className="flex-1 text-base font-bold text-gray-900">License Grant</Text>
                </View>
                <Text className="text-sm leading-6 text-gray-700">
                  We grant you a limited, non-exclusive license to use this Application for personal
                  use only. You may not copy, modify, or distribute it.
                </Text>
              </View>

              {/* Section 2 */}
              <View className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <View className="mb-3 flex-row items-center">
                  <Text className="mr-2 text-lg font-bold text-green-600">②</Text>
                  <Text className="flex-1 text-base font-bold text-gray-900">
                    Intellectual Property
                  </Text>
                </View>
                <Text className="text-sm leading-6 text-gray-700">
                  All content, features, and functionality are owned by SyncSpeak and protected by
                  copyright and trademark laws.
                </Text>
              </View>

              {/* Section 3 */}
              <View className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <View className="mb-3 flex-row items-center">
                  <Text className="mr-2 text-lg font-bold text-green-600">③</Text>
                  <Text className="flex-1 text-base font-bold text-gray-900">Restrictions</Text>
                </View>
                <Text className="text-sm leading-6 text-gray-700">
                  You may not rent, lease, modify, distribute, or reverse engineer the Application.
                  Respect our intellectual property.
                </Text>
              </View>

              {/* Section 4 */}
              <View className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <View className="mb-3 flex-row items-center">
                  <Text className="mr-2 text-lg font-bold text-green-600">④</Text>
                  <Text className="flex-1 text-base font-bold text-gray-900">User Conduct</Text>
                </View>
                <Text className="text-sm leading-6 text-gray-700">
                  Use the Application lawfully and respectfully. Do not violate laws, harm others,
                  or interfere with our systems.
                </Text>
              </View>

              {/* Section 5 */}
              <View className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <View className="mb-3 flex-row items-center">
                  <Text className="mr-2 text-lg font-bold text-orange-500">⚠</Text>
                  <Text className="flex-1 text-base font-bold text-gray-900">Disclaimer</Text>
                </View>
                <Text className="text-sm leading-6 text-gray-700">
                  The Application is provided {'"AS IS"'} without any warranties of any kind,
                  express or implied.
                </Text>
              </View>

              {/* Section 6 */}
              <View className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <View className="mb-3 flex-row items-center">
                  <Text className="mr-2 text-lg font-bold text-orange-500">⚖</Text>
                  <Text className="flex-1 text-base font-bold text-gray-900">
                    Limitation of Liability
                  </Text>
                </View>
                <Text className="text-sm leading-6 text-gray-700">
                  SyncSpeak is not liable for indirect, incidental, or consequential damages from
                  using the Application.
                </Text>
              </View>

              {/* Section 7 - Termination - Warning Style */}
              <View className="mb-4 rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-orange-50 p-5 shadow-sm">
                <View className="mb-3 flex-row items-start">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-red-900">Termination</Text>
                    <Text className="mt-1 text-xs font-semibold text-red-600">
                      Important Notice
                    </Text>
                  </View>
                </View>
                <Text className="pl-1 text-sm leading-6 text-red-900">
                  We may terminate or suspend your access immediately, without prior notice, if you
                  breach any terms or for any reason at our sole discretion.
                </Text>
              </View>

              {/* Section 8 - Modifications */}
              <View className="mb-4 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 shadow-sm">
                <View className="mb-3 flex-row items-start">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                    <Ionicons name="pencil-outline" size={20} color="#d97706" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-amber-900">Modifications</Text>
                    <Text className="mt-1 text-xs font-semibold text-amber-600">
                      Terms may change
                    </Text>
                  </View>
                </View>
                <Text className="pl-1 text-sm leading-6 text-amber-900">
                  We reserve the right to modify these terms at any time. Material changes will have
                  at least 30 days of notice prior to taking effect.
                </Text>
              </View>

              {/* Section 9 - Governing Law */}
              <View className="mb-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50 p-5 shadow-sm">
                <View className="mb-3 flex-row items-start">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                    <Ionicons name="document-lock-outline" size={20} color="#475569" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-slate-900">Governing Law</Text>
                    <Text className="mt-1 text-xs font-semibold text-slate-600">
                      Legal jurisdiction
                    </Text>
                  </View>
                </View>
                <Text className="pl-1 text-sm leading-6 text-slate-900">
                  These terms are governed by and construed in accordance with the laws of the
                  jurisdiction in which SyncSpeak operates.
                </Text>
              </View>

              {/* Section 10 - Contact Support */}
              <View className="mb-6 rounded-2xl border border-blue-400 bg-gradient-to-br from-blue-500 to-blue-600 p-5 shadow-lg">
                <View className="mb-3 flex-row items-start">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white/20">
                    <Ionicons name="mail-outline" size={20} color="#ffffff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-white">Get Help</Text>
                    <Text className="mt-1 text-xs font-semibold text-blue-100">
                      Questions or concerns?
                    </Text>
                  </View>
                </View>
                <Text className="pl-1 text-sm leading-6 text-white">
                  Have questions about this EULA? {"We're"} here to help.
                </Text>
                <View className="mt-4 rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                  <Text className="text-center font-semibold text-white">
                    sales.multifactors-sales@gmail.com
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="border-t border-gray-100 bg-gradient-to-t from-gray-50 to-white px-5 py-6">
              {/* Buttons Container */}
              <View className="flex-row gap-3">
                {/* Decline Button */}
                <TouchableOpacity
                  className="h-16 flex-1 items-center justify-center rounded-2xl border-2 border-red-300 bg-red-50 active:border-red-400 active:bg-red-100"
                  onPress={onDecline}
                  disabled={isAccepting}>
                  <View className="flex-row items-center gap-2">
                    <View className="h-7 w-7 items-center justify-center rounded-full bg-red-200">
                      <Ionicons name="close" size={18} color="#dc2626" />
                    </View>
                    <Text className="text-base font-bold text-red-700">Decline</Text>
                  </View>
                </TouchableOpacity>

                {/* Accept Button */}
                <TouchableOpacity
                  className="h-16 flex-1 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 via-green-500 to-emerald-600 shadow-lg active:shadow-lg disabled:opacity-50"
                  onPress={handleAccept}
                  disabled={isAccepting || loading}>
                  {isAccepting || loading ? (
                    <ActivityIndicator color="#ffffff" size="large" />
                  ) : (
                    <View className="flex-row items-center gap-3">
                      <View className="h-7 w-7 items-center justify-center rounded-full bg-white/30">
                        <Ionicons name="checkmark" size={18} color="#ffffff" />
                      </View>
                      <Text className="text-base font-bold text-white">Accept</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Agreement Confirmation Text */}
              <Text className="mt-4 text-center text-xs leading-5 text-gray-500">
                By accepting, you agree to our Terms & Conditions
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
