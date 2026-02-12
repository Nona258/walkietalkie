import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LiveLocationMapMobile() {
  return (
    <View className="px-6 pb-8 lg:hidden">
      <View className="p-5 bg-white border rounded-2xl border-stone-200">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-semibold text-stone-900">Live Location Map</Text>
          <View className="flex-row items-center">
            <View className="w-2 h-2 mr-2 rounded-full bg-emerald-500" />
            <Text className="text-sm text-stone-600">186 Online</Text>
          </View>
        </View>
        <View className="items-center justify-center h-48 bg-stone-100 rounded-xl">
          <Ionicons name="map-outline" size={48} color="#a8a29e" />
          <Text className="mt-2 text-stone-400">Map View</Text>
        </View>
        <View className="flex-row justify-between mt-4">
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-stone-900">32</Text>
            <Text className="text-xs text-stone-500">Active Sites</Text>
          </View>
          <View className="w-px bg-stone-200" />
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-stone-900">186</Text>
            <Text className="text-xs text-stone-500">Employees</Text>
          </View>
          <View className="w-px bg-stone-200" />
          <View className="items-center flex-1">
            <Text className="text-2xl font-bold text-stone-900">12</Text>
            <Text className="text-xs text-stone-500">Alerts</Text>
          </View>
        </View>
      </View>
    </View>
  );
}