import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StatusBar, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Only import WebView for native platforms
let WebView: any = null;
if (Platform.OS !== 'web') {
  const WebViewImport = require('react-native-webview').WebView;
  WebView = WebViewImport;
}

interface Site {
  id: string;
  name: string;
  location: string;
  address: string;
  status: 'active' | 'inactive';
  securityLevel: 'high' | 'medium' | 'low';
  staffCount: number;
}

const MOCK_SITES: Site[] = [
  {
    id: '1',
    name: 'Main Headquarters',
    location: 'Downtown',
    address: '123 Main Street, City Center',
    status: 'active',
    securityLevel: 'high',
    staffCount: 12,
  },
  {
    id: '2',
    name: 'North Building',
    location: 'North District',
    address: '456 North Avenue, Industrial Zone',
    status: 'active',
    securityLevel: 'medium',
    staffCount: 8,
  },
  {
    id: '3',
    name: 'South Warehouse',
    location: 'South Suburb',
    address: '789 South Road, Warehouse Area',
    status: 'active',
    securityLevel: 'medium',
    staffCount: 6,
  },
  {
    id: '4',
    name: 'East Facility',
    location: 'East Side',
    address: '321 East Boulevard, Commercial Zone',
    status: 'inactive',
    securityLevel: 'low',
    staffCount: 0,
  },
  {
    id: '5',
    name: 'West Branch',
    location: 'West End',
    address: '654 West Street, Business District',
    status: 'active',
    securityLevel: 'high',
    staffCount: 10,
  },
];

export default function Map({ onBack }: { onBack?: () => void }) {
  const [searchText, setSearchText] = useState('');
  const [isStreetViewActive, setIsStreetViewActive] = useState(false);
  const iframeRef = React.useRef<any>(null);

  const googleMapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset='utf-8' />
        <title>Philippines Map</title>
        <meta name='viewport' content='initial-scale=1,maximum-scale=1,user-scalable=no' />
        <style>
          body { margin: 0; padding: 0; }
          #map { position: absolute; top: 0; bottom: 0; width: 100%; }
          .gm-style-cc { display: none !important; }
          a[href*="google.com/maps"] { display: none !important; }
          div[aria-label*="Keyboard"] { display: none !important; }
          .gm-fullscreen-control { display: none !important; }
          button[aria-label*="fullscreen"] { display: none !important; }
          button[aria-label*="Full screen"] { display: none !important; }
          .gm-iv-address { display: none !important; }
          .gm-iv-container { margin-left: 10px !important; }
          button[aria-label*="Back"] { 
            margin-left: 32px !important;
            margin-top: 12px !important;
            background-color: rgba(60, 60, 60, 0.9) !important;
            border-radius: 8px !important;
            padding: 10px 12px !important;
            border: none !important;
            pointer-events: auto !important;
            cursor: pointer !important;
          }
        </style>
      </head>
      <body>
        <div id='map'></div>
        <script src='https://maps.googleapis.com/maps/api/js?key=AIzaSyAq58TD9PputxnK8ZO9jRUX8KW7bTuPTPQ'></script>
        <script>
          let isStreetViewActive = false;
          const map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 8.2256, lng: 124.2319 },
            zoom: 13,
            mapTypeId: 'roadmap',
            mapTypeControl: false,
            fullscreenControl: false
          });
          
          const streetViewPanorama = map.getStreetView();
          
          streetViewPanorama.addListener('visible_changed', function() {
            isStreetViewActive = streetViewPanorama.getVisible();
            document.documentElement.setAttribute('data-street-view', isStreetViewActive);
          });
          
          // Initial check
          document.documentElement.setAttribute('data-street-view', streetViewPanorama.getVisible());
        </script>
      </body>
    </html>
  `;

  const handleIframeLoad = () => {
    if (iframeRef.current) {
      const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
      const checkStreetView = () => {
        const streetViewActive = iframeDoc.documentElement.getAttribute('data-street-view') === 'true';
        setIsStreetViewActive(streetViewActive);
      };
      
      // Check immediately
      checkStreetView();
      
      // Poll for changes
      const interval = setInterval(checkStreetView, 500);
      return () => clearInterval(interval);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />
      
      {Platform.OS === 'web' ? (
        <View style={{ flex: 1, width: '100%', height: '100%', position: 'relative' } as any}>
          {React.createElement('iframe', {
            ref: iframeRef,
            srcDoc: googleMapHtml,
            style: {
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            },
            sandbox: 'allow-same-origin allow-scripts allow-popups allow-presentation',
            onLoad: handleIframeLoad,
          } as any)}
          {!isStreetViewActive && (
            <View className="absolute top-0 left-0 right-0 px-6 py-4 pt-12 flex-row items-center justify-between gap-3">
              <View className="flex-1 flex-row items-center rounded-2xl bg-white bg-opacity-95 px-4 py-3 border border-gray-300 shadow-lg">
                <Ionicons name="location" size={20} color="#10b981" />
                <TextInput
                  placeholder="Search locations..."
                  value={searchText}
                  onChangeText={setSearchText}
                  className="flex-1 ml-3 text-gray-900 text-base font-medium"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
          )}
          {!isStreetViewActive && (
            <TouchableOpacity onPress={onBack} className="absolute bottom-6 left-6">
              <View className="bg-black bg-opacity-70 rounded-lg p-2">
                <Ionicons name="arrow-back" size={20} color="white" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View className="flex-1 bg-gray-50">
          {WebView ? (
            <WebView
              source={{ html: googleMapHtml }}
              style={{ flex: 1 }}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-500 text-base font-semibold">Map not available</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
