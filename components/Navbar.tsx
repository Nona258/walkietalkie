import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-green-100 flex-row justify-around px-4 py-2 shadow-lg" style={{ zIndex: 50 }}>
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
      className="items-center justify-center px-4 py-2 rounded-xl transition-all"
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