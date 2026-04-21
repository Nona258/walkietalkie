import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMicPress?: () => void;
  isRecording?: boolean;
}

export default function Navbar({ activeTab, onTabChange, onMicPress, isRecording }: NavbarProps) {
  return (
    <SafeAreaView
      edges={["bottom"]}
      className="absolute bottom-0 left-0 right-0 border-t-2 border-[#237227] bg-white shadow-lg"
      style={{ zIndex: 50 }}>
      <View className="flex-row items-end px-2 py-2">
        <NavbarIcon
          icon="home-outline"
          label="Home"
          active={activeTab === 'dashboard'}
          onPress={() => onTabChange('dashboard')}
        />
        <NavbarIcon
          icon="map-outline"
          label="Sites"
          active={activeTab === 'sites'}
          onPress={() => onTabChange('sites')}
        />

        {/* Floating center mic button */}
        <View className="items-center flex-1 py-2">
          <TouchableOpacity
            onPress={onMicPress}
            activeOpacity={0.85}
            style={{
              marginTop: -48,
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: isRecording ? '#ef4444' : '#237227',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 4,
              borderColor: '#ffffff',
              elevation: 8,
              shadowColor: isRecording ? '#ef4444' : '#237227',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 6,
            }}>
            <Ionicons name="mic" size={30} color="#f8f4fb" />
          </TouchableOpacity>
          <Text className="mt-1.5 text-xs font-semibold text-gray-500">
            {isRecording ? 'Tap to Stop' : 'Tap to Talk'}
          </Text>
        </View>

        <NavbarIcon
          icon="people-outline"
          label="Contacts"
          active={activeTab === 'contacts'}
          onPress={() => onTabChange('contacts')}
        />
        <NavbarIcon
          icon="document-text-outline"
          label="Logs"
          active={activeTab === 'logs'}
          onPress={() => onTabChange('logs')}
        />
      </View>
    </SafeAreaView>
  );
}

function NavbarIcon({
  icon,
  label,
  active,
  onPress,
}: {
  icon: any;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="items-center justify-center flex-1 py-2 rounded-xl"
      onPress={onPress}>
      <Ionicons name={icon} size={26} color={active ? '#237227' : '#9ca3af'} />
      <Text
        className={`mt-1.5 text-xs font-semibold ${active ? 'text-[#237227]' : 'text-gray-500'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
