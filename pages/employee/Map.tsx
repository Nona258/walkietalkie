import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StatusBar, Modal, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../utils/supabase';
import { googleMapHtml } from '../../components/GoogleMapHTML';

// Only import WebView for native platforms
let WebView: any = null;
if (Platform.OS !== 'web') {
  const WebViewImport = require('react-native-webview').WebView;
  WebView = WebViewImport;
}

interface Site {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  company_id?: string;
  branch_id?: string;
  status?: string;
}


export default function Map({ onBack, selectedSite }: { onBack?: () => void; selectedSite?: any }) {
  const [searchText, setSearchText] = useState('');
  const [isStreetViewActive, setIsStreetViewActive] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [sitesData, setSitesData] = useState<Site[]>([]);
  const [isIframeReady, setIsIframeReady] = useState(false);
  const iframeRef = React.useRef<any>(null);
  const searchTimeoutRef = React.useRef<any>(null);
  const streetViewIntervalRef = React.useRef<any>(null);
  const iframeReadyTimeoutRef = React.useRef<any>(null);

  // Fetch sites from Supabase and subscribe to real-time updates
  useEffect(() => {
    const fetchSites = async () => {
      // If a specific site is selected, only load that site
      if (selectedSite) {
        setSitesData([selectedSite]);
        return;
      }

      const { data, error } = await supabase
        .from('sites')
        .select('id, name, latitude, longitude, company_id, branch_id, status')
        .eq('status', 'Active');
      
      if (!error && data) {
        setSitesData(data || []);
      }
    };
    
    fetchSites();

    // Only subscribe to real-time updates if not showing a specific site
    if (selectedSite) {
      return;
    }

    // Subscribe to real-time updates on sites table
    const subscription = supabase
      .channel('public:sites')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sites',
        },
        (payload) => {
          // Handle INSERT, UPDATE, DELETE events
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newSite = payload.new as Site;
            // Only add if status is Active
            if (newSite.status === 'Active') {
              setSitesData((prevSites) => {
                // Check if site already exists
                const siteExists = prevSites.some(s => s.id === newSite.id);
                if (siteExists) {
                  // Update existing site
                  return prevSites.map(s => s.id === newSite.id ? newSite : s);
                } else {
                  // Add new site
                  return [...prevSites, newSite];
                }
              });
            } else {
              // If status is not Active, remove it if it exists
              setSitesData((prevSites) =>
                prevSites.filter(s => s.id !== newSite.id)
              );
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedSite = payload.old as Site;
            // Remove deleted site from state
            setSitesData((prevSites) =>
              prevSites.filter(s => s.id !== deletedSite.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedSite]);

  // Send sites to iframe when sites data changes and iframe is ready
  useEffect(() => {
    if (sitesData.length > 0 && iframeRef.current && isIframeReady) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'loadSites', sites: sitesData },
        '*'
      );
    }
  }, [sitesData, isIframeReady]);

  const handleSearch = (query: string) => {
    if (iframeRef.current && query.trim().length > 0) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'search', query: query },
        '*'
      );
    }
  };

  const handleSelectResult = (location: any, address: string) => {
    setSearchResults([]);
    setShowResults(false);
    if (iframeRef.current) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'navigate', location: location, address: address },
        '*'
      );
    }
  };

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'searchResults') {
        setSearchResults(event.data.results);
        setShowResults(event.data.results.length > 0);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Debounce search input
  React.useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchText.trim().length > 0) {
      // Set new timeout for search
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(searchText);
      }, 500);
    } else {
      setShowResults(false);
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText]);

  // Remove search marker when search text is cleared and return to user location
  React.useEffect(() => {
    if (searchText.trim().length === 0 && iframeRef.current) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'returnToUserLocation' },
        '*'
      );
    }
  }, [searchText]);



  const handleIframeLoad = () => {
    if (iframeRef.current) {
      // Clear any existing timeout
      if (iframeReadyTimeoutRef.current) {
        clearTimeout(iframeReadyTimeoutRef.current);
      }

      // Give the iframe time to initialize geolocation before marking as ready
      // This ensures user location will be available for distance calculations
      iframeReadyTimeoutRef.current = setTimeout(() => {
        setIsIframeReady(true);
      }, 2000);
    }
  };

  // Set up street view polling with proper cleanup
  React.useEffect(() => {
    if (!iframeRef.current || !isIframeReady) return;

    const checkStreetView = () => {
      try {
        const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
        const streetViewActive = iframeDoc.documentElement.getAttribute('data-street-view') === 'true';
        setIsStreetViewActive(streetViewActive);
      } catch (e) {
        // Silently handle errors from iframe access
      }
    };

    // Check immediately once
    checkStreetView();

    // Clear any existing interval
    if (streetViewIntervalRef.current) {
      clearInterval(streetViewIntervalRef.current);
    }

    // Set up polling interval only once
    streetViewIntervalRef.current = setInterval(checkStreetView, 500);

    return () => {
      if (streetViewIntervalRef.current) {
        clearInterval(streetViewIntervalRef.current);
        streetViewIntervalRef.current = null;
      }
    };
  }, [isIframeReady]);

  // Cleanup component timers on unmount
  React.useEffect(() => {
    return () => {
      if (iframeReadyTimeoutRef.current) {
        clearTimeout(iframeReadyTimeoutRef.current);
      }
      if (streetViewIntervalRef.current) {
        clearInterval(streetViewIntervalRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

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
            <View className="absolute top-4 left-0 right-0 px-4 py-4 pt-4 z-50">
              <View className="flex-1 flex-row items-center rounded-2xl bg-white bg-opacity-95 px-4 py-3 border border-gray-300 shadow-lg">
                <TouchableOpacity onPress={onBack}>
                  <Ionicons name="arrow-back" size={20} color="#10b981" />
                </TouchableOpacity>
                <TextInput
                  placeholder="Search locations..."
                  value={searchText}
                  onChangeText={setSearchText}
                  onSubmitEditing={() => handleSearch(searchText)}
                  className="flex-1 ml-3 text-gray-900 text-base font-medium"
                  placeholderTextColor="#9ca3af"
                  returnKeyType="search"
                />
                <Ionicons name="location" size={20} color="#10b981" />
              </View>
              {showResults && searchResults.length > 0 && searchText.trim().length > 0 && (
                <View className="mt-1 bg-white rounded-2xl border border-gray-300 shadow-lg overflow-hidden">
                  <ScrollView style={{ maxHeight: searchResults.length > 4 ? 280 : undefined }} scrollEnabled={searchResults.length > 4}>
                    {searchResults.map((result, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleSelectResult(result.location, result.address)}
                        className="px-4 py-2 border-b border-gray-200 last:border-b-0"
                      >
                        <View className="flex-row items-start gap-2">
                          <Ionicons name="location" size={16} color="#6b7280" style={{ marginTop: 1 }} />
                          <View className="flex-1">
                            <Text className="text-gray-900 text-sm font-semibold">
                              {result.placeName}
                            </Text>
                            <Text className="text-gray-500 text-xs mt-0.5">
                              {result.city}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}
          {selectedSite && !isStreetViewActive && (
            <View className="absolute bottom-4 left-4 right-0 px-0">
              <View className="bg-green-50 bg-opacity-90 rounded-2xl px-4 py-3 border border-green-200 shadow-lg" style={{ maxWidth: '70%' }}>
                <View>
                  <Text className="text-gray-600 text-xs font-semibold uppercase">Site Location</Text>
                  <Text className="text-gray-900 text-lg font-bold mt-1" numberOfLines={2}>{selectedSite.name}</Text>
                </View>
              </View>
            </View>
          )}
          {isStreetViewActive && (
            <TouchableOpacity 
              onPress={() => {
                if (iframeRef.current) {
                  iframeRef.current.contentWindow.postMessage(
                    { type: 'exitStreetView' },
                    '*'
                  );
                }
              }}
              className="absolute bottom-16 right-3 bg-white rounded-full p-3 shadow-lg z-50 animate-bounce"
            >
              <Ionicons name="map" size={24} color="#10b981" />
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