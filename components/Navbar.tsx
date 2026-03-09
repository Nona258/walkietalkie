import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMicPress?: () => void;
  isRecording?: boolean;
}

export default function Navbar({ activeTab, onTabChange, onMicPress, isRecording }: NavbarProps) {
  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-green-100 shadow-lg">
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
        <View className="flex-1 items-center py-2">
          <TouchableOpacity
            onPress={onMicPress}
            activeOpacity={0.85}
            style={{
              marginTop: -48,
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: isRecording ? '#ef4444' : '#10b981',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 4,
              borderColor: '#ffffff',
              elevation: 8,
              shadowColor: isRecording ? '#ef4444' : '#10b981',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 6,
            }}
          >
            <Ionicons name="mic" size={30} color="#ffffff" />
          </TouchableOpacity>
          <Text className="text-xs mt-1.5 font-semibold text-gray-500">{isRecording ? 'Tap to Stop' : 'Tap to Talk'}</Text>
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
    </View>
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
      className="flex-1 items-center justify-center py-2 rounded-xl"
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={26}
        color={active ? '#10b981' : '#9ca3af'}
      />
      <Text
        className={`text-xs mt-1.5 font-semibold ${
          active ? 'text-green-600' : 'text-gray-500'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}