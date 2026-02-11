import React from 'react';
import { View, Text } from 'react-native';
import '../../global.css';

export default function EmployeeHome() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold text-[#111827]">Employee Home</Text>
      <Text className="mt-2 text-[#6b7280]">
        This is the main screen for the employee role.
      </Text>
    </View>
  );
}
