import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
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
  const { height: screenHeight } = Dimensions.get('window');

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept();
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onDecline}
    >
      <View className="flex-1 bg-black/40">
        <View className="flex-1 justify-end">
          <View className="bg-white rounded-t-4xl min-h-96 max-h-full shadow-2xl">
            {/* Header with Icon */}
            <View className="px-6 py-8 bg-gradient-to-b from-green-50 to-white rounded-t-4xl border-b border-green-100">
              <View className="flex-row items-center mb-4">
                <View className="w-14 h-14 rounded-full bg-green-100 items-center justify-center mr-4">
                  <Ionicons name="document-text-outline" size={28} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-gray-900">License Agreement</Text>
                  <Text className="text-xs text-green-600 font-semibold mt-1">Please review & accept</Text>
                </View>
              </View>
              <View className="h-1 bg-gradient-to-r from-green-400 to-green-600 rounded-full" />
            </View>

            {/* Content */}
            <ScrollView className="flex-1 px-6 py-6 bg-gray-50">
              {/* Intro Section */}
              <View className="bg-white rounded-2xl p-5 mb-5 border border-green-100 shadow-sm">
                <View className="flex-row items-start mb-3">
                  <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center mr-3 mt-0.5">
                    <Ionicons name="checkmark" size={16} color="#10b981" />
                  </View>
                  <Text className="flex-1 text-base font-bold text-gray-900">TERMS & CONDITIONS</Text>
                </View>
                <Text className="text-sm text-gray-600 leading-6">
                  By using SyncSpeak, you agree to these terms. Please read carefully before proceeding.
                </Text>
              </View>

              {/* Section 1 */}
              <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                <View className="flex-row items-center mb-3">
                  <Text className="text-lg font-bold text-green-600 mr-2">①</Text>
                  <Text className="text-base font-bold text-gray-900 flex-1">License Grant</Text>
                </View>
                <Text className="text-sm text-gray-700 leading-6">
                  We grant you a limited, non-exclusive license to use this Application for personal use only. You may not copy, modify, or distribute it.
                </Text>
              </View>

              {/* Section 2 */}
              <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                <View className="flex-row items-center mb-3">
                  <Text className="text-lg font-bold text-green-600 mr-2">②</Text>
                  <Text className="text-base font-bold text-gray-900 flex-1">Intellectual Property</Text>
                </View>
                <Text className="text-sm text-gray-700 leading-6">
                  All content, features, and functionality are owned by SyncSpeak and protected by copyright and trademark laws.
                </Text>
              </View>

              {/* Section 3 */}
              <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                <View className="flex-row items-center mb-3">
                  <Text className="text-lg font-bold text-green-600 mr-2">③</Text>
                  <Text className="text-base font-bold text-gray-900 flex-1">Restrictions</Text>
                </View>
                <Text className="text-sm text-gray-700 leading-6">
                  You may not rent, lease, modify, distribute, or reverse engineer the Application. Respect our intellectual property.
                </Text>
              </View>

              {/* Section 4 */}
              <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                <View className="flex-row items-center mb-3">
                  <Text className="text-lg font-bold text-green-600 mr-2">④</Text>
                  <Text className="text-base font-bold text-gray-900 flex-1">User Conduct</Text>
                </View>
                <Text className="text-sm text-gray-700 leading-6">
                  Use the Application lawfully and respectfully. Do not violate laws, harm others, or interfere with our systems.
                </Text>
              </View>

              {/* Section 5 */}
              <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                <View className="flex-row items-center mb-3">
                  <Text className="text-lg font-bold text-orange-500 mr-2">⚠</Text>
                  <Text className="text-base font-bold text-gray-900 flex-1">Disclaimer</Text>
                </View>
                <Text className="text-sm text-gray-700 leading-6">
                  The Application is provided "AS IS" without any warranties of any kind, express or implied.
                </Text>
              </View>

              {/* Section 6 */}
              <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                <View className="flex-row items-center mb-3">
                  <Text className="text-lg font-bold text-orange-500 mr-2">⚖</Text>
                  <Text className="text-base font-bold text-gray-900 flex-1">Limitation of Liability</Text>
                </View>
                <Text className="text-sm text-gray-700 leading-6">
                  SyncSpeak is not liable for indirect, incidental, or consequential damages from using the Application.
                </Text>
              </View>

              {/* Section 7 - Termination - Warning Style */}
              <View className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-5 mb-4 shadow-sm border border-red-100">
                <View className="flex-row items-start mb-3">
                  <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center mr-3">
                    <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-red-900">Termination</Text>
                    <Text className="text-xs text-red-600 font-semibold mt-1">Important Notice</Text>
                  </View>
                </View>
                <Text className="text-sm text-red-900 leading-6 pl-1">
                  We may terminate or suspend your access immediately, without prior notice, if you breach any terms or for any reason at our sole discretion.
                </Text>
              </View>

              {/* Section 8 - Modifications */}
              <View className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 mb-4 shadow-sm border border-amber-100">
                <View className="flex-row items-start mb-3">
                  <View className="w-10 h-10 rounded-full bg-amber-100 items-center justify-center mr-3">
                    <Ionicons name="pencil-outline" size={20} color="#d97706" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-amber-900">Modifications</Text>
                    <Text className="text-xs text-amber-600 font-semibold mt-1">Terms may change</Text>
                  </View>
                </View>
                <Text className="text-sm text-amber-900 leading-6 pl-1">
                  We reserve the right to modify these terms at any time. Material changes will have at least 30 days of notice prior to taking effect.
                </Text>
              </View>

              {/* Section 9 - Governing Law */}
              <View className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-5 mb-4 shadow-sm border border-slate-200">
                <View className="flex-row items-start mb-3">
                  <View className="w-10 h-10 rounded-full bg-slate-200 items-center justify-center mr-3">
                    <Ionicons name="document-lock-outline" size={20} color="#475569" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-slate-900">Governing Law</Text>
                    <Text className="text-xs text-slate-600 font-semibold mt-1">Legal jurisdiction</Text>
                  </View>
                </View>
                <Text className="text-sm text-slate-900 leading-6 pl-1">
                  These terms are governed by and construed in accordance with the laws of the jurisdiction in which SyncSpeak operates.
                </Text>
              </View>

              {/* Section 10 - Contact Support */}
              <View className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 mb-6 shadow-lg border border-blue-400">
                <View className="flex-row items-start mb-3">
                  <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3">
                    <Ionicons name="mail-outline" size={20} color="#ffffff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-white">Get Help</Text>
                    <Text className="text-xs text-blue-100 font-semibold mt-1">Questions or concerns?</Text>
                  </View>
                </View>
                <Text className="text-sm text-white leading-6 pl-1">
                  Have questions about this EULA? We're here to help.
                </Text>
                <View className="mt-4 bg-white/10 rounded-xl px-4 py-3 border border-white/20">
                  <Text className="text-white font-semibold text-center">sales.multifactors-sales@gmail.com</Text>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="border-t border-gray-100 bg-gradient-to-t from-gray-50 to-white py-6 px-5">
              {/* Buttons Container */}
              <View className="flex-row gap-3">
                {/* Decline Button */}
                <TouchableOpacity
                  className="flex-1 bg-red-50 border-2 border-red-300 rounded-2xl h-16 items-center justify-center active:border-red-400 active:bg-red-100"
                  onPress={onDecline}
                  disabled={isAccepting}
                >
                  <View className="flex-row items-center gap-2">
                    <View className="w-7 h-7 rounded-full bg-red-200 items-center justify-center">
                      <Ionicons name="close" size={18} color="#dc2626" />
                    </View>
                    <Text className="text-red-700 font-bold text-base">Decline</Text>
                  </View>
                </TouchableOpacity>

                {/* Accept Button */}
                <TouchableOpacity
                  className="flex-1 bg-gradient-to-br from-green-500 via-green-500 to-emerald-600 rounded-2xl h-16 items-center justify-center disabled:opacity-50 active:shadow-lg shadow-lg"
                  onPress={handleAccept}
                  disabled={isAccepting || loading}
                >
                  {isAccepting || loading ? (
                    <ActivityIndicator color="#ffffff" size="large" />
                  ) : (
                    <View className="flex-row items-center gap-3">
                      <View className="w-7 h-7 rounded-full bg-white/30 items-center justify-center">
                        <Ionicons name="checkmark" size={18} color="#ffffff" />
                      </View>
                      <Text className="text-white font-bold text-base">Accept</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Agreement Confirmation Text */}
              <Text className="text-xs text-gray-500 text-center mt-4 leading-5">
                By accepting, you agree to our Terms & Conditions
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
