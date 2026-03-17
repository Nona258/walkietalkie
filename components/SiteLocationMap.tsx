import React from 'react';
import { View, Text, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

let WebView: any = null;
if (Platform.OS !== 'web') {
  const WebViewImport = require('react-native-webview').WebView;
  WebView = WebViewImport;
}

interface SiteLocationMapProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  siteName?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function SiteLocationMap({
  latitude,
  longitude,
  siteName,
  showBackButton = false,
  onBack,
}: SiteLocationMapProps) {
  if (latitude == null || longitude == null) {
    return (
      <View className="flex-1 bg-green-50" style={{ position: 'relative' }}>
        {showBackButton && onBack && (
          <View style={{ position: 'absolute', top: 12, left: 12, zIndex: 20, elevation: 20 }}>
            <TouchableOpacity
              onPress={onBack}
              className="h-10 w-10 items-center justify-center rounded-full border border-green-100 bg-white">
              <Ionicons name="arrow-back" size={22} color="#10b981" />
            </TouchableOpacity>
          </View>
        )}

        <View className="flex-1 items-center justify-center">
          <View className="mb-2 h-20 w-20 items-center justify-center rounded-3xl bg-green-100">
            <Ionicons name="map" size={36} color="#10b981" />
          </View>
          <Text className="text-xs font-semibold text-gray-500">Location not set</Text>
        </View>
      </View>
    );
  }

  const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`;

  const BackOverlay =
    showBackButton && onBack ? (
      <View style={{ position: 'absolute', top: 12, left: 12, zIndex: 20, elevation: 20 }}>
        <TouchableOpacity
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-full border border-green-100 bg-white">
          <Ionicons name="arrow-back" size={22} color="#10b981" />
        </TouchableOpacity>
      </View>
    ) : null;

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, position: 'relative' }}>
        {BackOverlay}
        {React.createElement('iframe', {
          src: mapUrl,
          title: siteName || 'Site map',
          style: {
            width: '100%',
            height: '100%',
            border: '0',
            display: 'block',
          },
          loading: 'lazy',
          referrerPolicy: 'no-referrer-when-downgrade',
        } as any)}
      </View>
    );
  }

  if (!WebView) {
    return (
      <View className="flex-1 bg-green-50" style={{ position: 'relative' }}>
        {BackOverlay}
        <View className="flex-1 items-center justify-center">
          <Text className="text-xs font-semibold text-gray-500">Map not available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {BackOverlay}
      <WebView source={{ uri: mapUrl }} style={{ flex: 1 }} />
    </View>
  );
}
