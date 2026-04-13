import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../utils/supabase';
import MapIframe from '../../components/MapIframe';
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
  const lastSitesDataRef = React.useRef<Site[]>([]);

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
        .in('status', ['Active', 'Pending']);

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
            // Show both Active and Pending sites on the map
            if (newSite.status === 'Active' || newSite.status === 'Pending') {
              setSitesData((prevSites) => {
                // Check if site already exists
                const siteExists = prevSites.some((s) => s.id === newSite.id);
                if (siteExists) {
                  // Update existing site
                  return prevSites.map((s) => (s.id === newSite.id ? newSite : s));
                } else {
                  // Add new site
                  return [...prevSites, newSite];
                }
              });
            } else {
              // If status is not Active/Pending, remove it if it exists
              setSitesData((prevSites) => prevSites.filter((s) => s.id !== newSite.id));
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedSite = payload.old as Site;
            // Remove deleted site from state
            setSitesData((prevSites) => prevSites.filter((s) => s.id !== deletedSite.id));
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
      // Check if sites actually changed before sending
      const sitesChanged =
        sitesData.length !== lastSitesDataRef.current.length ||
        sitesData.some(
          (site, idx) =>
            !lastSitesDataRef.current[idx] || lastSitesDataRef.current[idx].id !== site.id
        );

      if (sitesChanged) {
        try {
          iframeRef.current.contentWindow.postMessage({ type: 'loadSites', sites: sitesData }, '*');
          lastSitesDataRef.current = sitesData;
        } catch (e) {
          // Silently handle iframe access errors
        }
      }
    }
  }, [sitesData, isIframeReady]);

  const handleSearch = React.useCallback((query: string) => {
    if (iframeRef.current && query.trim().length > 0) {
      iframeRef.current.contentWindow.postMessage({ type: 'search', query: query }, '*');
    }
  }, []);

  const handleSelectResult = React.useCallback((location: any, address: string) => {
    setSearchResults([]);
    setShowResults(false);
    if (iframeRef.current) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'navigate', location: location, address: address },
        '*'
      );
    }
  }, []);

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
      try {
        iframeRef.current.contentWindow.postMessage({ type: 'returnToUserLocation' }, '*');
      } catch (e) {
        // Silently handle iframe access errors
      }
    }
  }, [searchText]);

  const handleIframeLoad = React.useCallback(() => {
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
  }, []);

  // Set up street view polling with proper cleanup
  React.useEffect(() => {
    // Don't even try to check street view until iframe is ready
    if (!isIframeReady) {
      return;
    }

    // Check street view state once
    const checkStreetView = () => {
      try {
        if (!iframeRef.current) return;
        const iframeDoc =
          iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
        if (!iframeDoc) return;
        const streetViewActive =
          iframeDoc.documentElement.getAttribute('data-street-view') === 'true';
        setIsStreetViewActive(streetViewActive);
      } catch (e) {
        // Silently handle errors from iframe access
      }
    };

    // Check immediately
    checkStreetView();

    // Clear any existing interval before setting a new one
    if (streetViewIntervalRef.current) {
      clearInterval(streetViewIntervalRef.current);
    }

    // Set up polling interval - only check every 1000ms to reduce CPU usage
    streetViewIntervalRef.current = setInterval(checkStreetView, 1000);

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
          <MapIframe iframeRef={iframeRef} onIframeReady={handleIframeLoad} />
          {!isStreetViewActive && (
            <View className="absolute left-0 right-0 z-50 px-4 py-4 pt-4 top-4">
              <View className="flex-row items-center flex-1 px-4 py-3 bg-white border border-gray-300 shadow-lg rounded-2xl bg-opacity-95">
                <TouchableOpacity onPress={onBack}>
                  <Ionicons name="arrow-back" size={20} color="#237227" />
                </TouchableOpacity>
                <TextInput
                  placeholder="Search locations..."
                  value={searchText}
                  onChangeText={setSearchText}
                  onSubmitEditing={() => handleSearch(searchText)}
                  className="flex-1 ml-3 text-base font-medium text-gray-900"
                  placeholderTextColor="#9ca3af"
                  returnKeyType="search"
                />
                <Ionicons name="location" size={20} color="#237227" />
              </View>
              {showResults && searchResults.length > 0 && searchText.trim().length > 0 && (
                <View className="mt-1 overflow-hidden bg-white border border-gray-300 shadow-lg rounded-2xl">
                  <ScrollView
                    style={{ maxHeight: searchResults.length > 4 ? 280 : undefined }}
                    scrollEnabled={searchResults.length > 4}>
                    {searchResults.map((result, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleSelectResult(result.location, result.address)}
                        className="px-4 py-2 border-b border-gray-200 last:border-b-0">
                        <View className="flex-row items-start gap-2">
                          <Ionicons
                            name="location"
                            size={16}
                            color="#6b7280"
                            style={{ marginTop: 1 }}
                          />
                          <View className="flex-1">
                            <Text className="text-sm font-semibold text-gray-900">
                              {result.placeName}
                            </Text>
                            <Text className="mt-0.5 text-xs text-gray-500">{result.city}</Text>
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
            <View className="absolute right-0 px-0 bottom-4 left-4">
              <View
                className="px-4 py-3 shadow-lg rounded-2xl bg-[#e8f5e9] bg-opacity-90"
                style={{ maxWidth: '70%' }}>
                <View>
                  <Text className="text-xs font-semibold text-[#237227] uppercase">
                    Site Location
                  </Text>
                  <Text className="mt-1 text-lg font-bold text-[#237227]" numberOfLines={2}>
                    {selectedSite.name}
                  </Text>
                </View>
              </View>
            </View>
          )}
          {isStreetViewActive && (
            <TouchableOpacity
              onPress={() => {
                if (iframeRef.current) {
                  iframeRef.current.contentWindow.postMessage({ type: 'exitStreetView' }, '*');
                }
              }}
              className="absolute z-50 p-3 bg-white rounded-full shadow-lg bottom-16 right-3 animate-bounce">
              <Ionicons name="map" size={24} color="#10b981" />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View className="flex-1 bg-gray-50">
          {WebView ? (
            <WebView source={{ html: googleMapHtml }} style={{ flex: 1 }} />
          ) : (
            <View className="items-center justify-center flex-1">
              <Text className="text-base font-semibold text-gray-500">Map not available</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}