import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
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
        <View className="justify-end flex-1">
          <View className="max-h-full bg-white rounded-t-4xl min-h-96">
            {/* Header with Icon */}
            <View className="px-6 py-8 border-b border-green-100 rounded-t-4xl bg-gradient-to-b from-green-50 to-white">
              <View className="flex-row items-center mb-4">
                <View className="mr-4 h-14 w-14 items-center justify-center rounded-full bg-[#237227]">
                  <Ionicons name="document-text-outline" size={28} color="#f8fafb" />
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-gray-900">License Agreement</Text>
                  <Text className="mt-1 text-xs font-semibold text-[#237227]">
                    Please review & accept
                  </Text>
                </View>
              </View>
              <View className="h-1 rounded-full bg-gradient-to-r from-[#e8f5e9] to-[#237227]" />
            </View>

            {/* Content */}
            <ScrollView className="flex-1 px-6 py-6 bg-gray-50">
              {/* Intro Section */}
              <View className="p-5 mb-5 bg-white border border-green-100 shadow-sm rounded-2xl">
                <View className="flex-row items-start mb-3">
                  <View className="mr-3 mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-[#237227]">
                    <Ionicons name="checkmark" size={16} color="#f8fafb" />
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
              <View className="p-5 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <View className="flex-row items-center mb-3">
                  <Text className="mr-2 text-lg font-bold text-[#237227]">①</Text>
                  <Text className="flex-1 text-base font-bold text-gray-900">License Grant</Text>
                </View>
                <Text className="text-sm leading-6 text-gray-700">
                  We grant you a limited, non-exclusive license to use this Application for personal
                  use only. You may not copy, modify, or distribute it.
                </Text>
              </View>

              {/* Section 2 */}
              <View className="p-5 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <View className="flex-row items-center mb-3">
                  <Text className="mr-2 text-lg font-bold text-[#237227]">②</Text>
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
              <View className="p-5 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <View className="flex-row items-center mb-3">
                  <Text className="mr-2 text-lg font-bold text-[#237227]">③</Text>
                  <Text className="flex-1 text-base font-bold text-gray-900">Restrictions</Text>
                </View>
                <Text className="text-sm leading-6 text-gray-700">
                  You may not rent, lease, modify, distribute, or reverse engineer the Application.
                  Respect our intellectual property.
                </Text>
              </View>

              {/* Section 4 */}
              <View className="p-5 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <View className="flex-row items-center mb-3">
                  <Text className="mr-2 text-lg font-bold text-[#237227]">④</Text>
                  <Text className="flex-1 text-base font-bold text-gray-900">User Conduct</Text>
                </View>
                <Text className="text-sm leading-6 text-gray-700">
                  Use the Application lawfully and respectfully. Do not violate laws, harm others,
                  or interfere with our systems.
                </Text>
              </View>

              {/* Section 5 */}
              <View className="p-5 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <View className="flex-row items-center mb-3">
                  <Text className="mr-2 text-lg font-bold text-[#237227]">⑤</Text>
                  <Text className="flex-1 text-base font-bold text-gray-900">Disclaimer</Text>
                </View>
                <Text className="text-sm leading-6 text-gray-700">
                  The Application is provided {'"AS IS"'} without any warranties of any kind,
                  express or implied.
                </Text>
              </View>

              {/* Section 6 */}
              <View className="p-5 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
                <View className="flex-row items-center mb-3">
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
              <View className="p-5 mb-4 border border-red-100 shadow-sm rounded-2xl bg-gradient-to-br from-red-50 to-orange-50">
                <View className="flex-row items-start mb-3">
                  <View className="items-center justify-center w-10 h-10 mr-3 bg-red-100 rounded-full">
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
              <View className="p-5 mb-4 border shadow-sm rounded-2xl border-amber-100 bg-gradient-to-br from-amber-50 to-yellow-50">
                <View className="flex-row items-start mb-3">
                  <View className="items-center justify-center w-10 h-10 mr-3 rounded-full bg-amber-100">
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
              <View className="p-5 mb-4 border shadow-sm rounded-2xl border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50">
                <View className="flex-row items-start mb-3">
                  <View className="items-center justify-center w-10 h-10 mr-3 rounded-full bg-slate-200">
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
              <View className="p-5 mb-6 border-transparent rounded-2xl bg-gradient-to-br from-[#e8f5e9] to-[#237227]">
                <View className="flex-row items-start mb-3">
                  <View className="items-center justify-center w-10 h-10 mr-3 rounded-full bg-[#237227]">
                    <Ionicons name="mail-outline" size={20} color="#f8fafb" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-stone-800">Get Help</Text>
                    <Text className="mt-1 text-xs font-semibold text-stone-800">
                      Questions or concerns?
                    </Text>
                  </View>
                </View>
                <Text className="pl-1 text-sm leading-6 text-stone-800">
                  Have questions about this EULA? {"We're"} here to help.
                </Text>
                <View className="px-4 py-3 mt-4 border rounded-xl">
                  <Text className="font-semibold text-center text-stone-900">
                    sales.multifactors-sales@gmail.com
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="px-5 py-6 border-t border-gray-100 bg-gradient-to-t from-gray-50 to-white">
              {/* Buttons Container */}
              <View className="flex-row gap-3">
                {/* Decline Button */}
                <TouchableOpacity
                  className="items-center justify-center flex-1 h-16 border-2 border-red-300 rounded-2xl bg-red-50 active:border-red-400 active:bg-red-100"
                  onPress={onDecline}
                  disabled={isAccepting}>
                  <View className="flex-row items-center gap-2">
                    <View className="items-center justify-center bg-red-200 rounded-full h-7 w-7">
                      <Ionicons name="close" size={18} color="#dc2626" />
                    </View>
                    <Text className="text-base font-bold text-red-700">Decline</Text>
                  </View>
                </TouchableOpacity>

                {/* Accept Button */}
                <TouchableOpacity
                  className="items-center justify-center flex-1 h-16 shadow-lg rounded-2xl bg-[#237227] active:shadow-lg disabled:opacity-50"
                  onPress={handleAccept}
                  disabled={isAccepting || loading}>
                  {isAccepting || loading ? (
                    <ActivityIndicator color="#f8fafb" size="large" />
                  ) : (
                    <View className="flex-row items-center gap-3">
                      <View className="items-center justify-center rounded-full h-7 w-7 bg-white/30">
                        <Ionicons name="checkmark" size={18} color="#f8fafb" />
                      </View>
                      <Text className="text-base font-bold text-white">Accept</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Agreement Confirmation Text */}
              <Text className="mt-4 text-xs leading-5 text-center text-gray-500">
                By accepting, you agree to our Terms & Conditions
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
