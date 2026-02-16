import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StatusBar, Modal, Platform, ScrollView } from 'react-native';
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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const iframeRef = React.useRef<any>(null);
  const searchTimeoutRef = React.useRef<any>(null);

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
        <script src='https://maps.googleapis.com/maps/api/js?key=AIzaSyAq58TD9PputxnK8ZO9jRUX8KW7bTuPTPQ&libraries=places'></script>
        <script>
          let isStreetViewActive = false;
          let userMarker = null;
          let searchMarker = null;
          let geocoder = null;
          let userProvince = 'Lanao del Norte'; // Default to Lanao del Norte
          let userLocation = null; // Store user's current location
          
          const map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 8.2256, lng: 124.2319 },
            zoom: 12,
            mapTypeId: 'roadmap',
            mapTypeControl: false,
            fullscreenControl: false
          });
          
          // Initialize geocoder
          geocoder = new google.maps.Geocoder();
          
          // Get user's geolocation
          if (navigator.geolocation) {
            navigator.geolocation.watchPosition(
              function(position) {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                userLocation = { lat: userLat, lng: userLng }; // Update global userLocation
                
                // Reverse geocode to get user's province
                geocoder.geocode({ location: userLocation }, function(results, status) {
                  if (status === 'OK' && results.length > 0) {
                    results[0].address_components.forEach(comp => {
                      if (comp.types.includes('administrative_area_level_1')) {
                        userProvince = comp.long_name;
                      }
                    });
                  }
                });
                
                // Remove old marker if exists
                if (userMarker) {
                  userMarker.setMap(null);
                }
                
                // Create new marker for user's location
                userMarker = new google.maps.Marker({
                  position: userLocation,
                  map: map,
                  title: 'Your Location',
                  icon: {
                    path: 'M12 0C5.383 0 0 5.383 0 12c0 7 12 20 12 20s12-13 12-20c0-6.617-5.383-12-12-12zm0 16c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z',
                    scale: 1.5,
                    fillColor: '#22c55e',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 1,
                    anchor: { x: 12, y: 20 }
                  }
                });
                
                // Center map on user location and zoom in
                map.setCenter(userLocation);
                map.setZoom(16);
              },
              function(error) {
                console.log('Geolocation error: ' + error.message);
              },
              {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 0
              }
            );
          }
          
          // Listen for search messages from React
          window.addEventListener('message', function(event) {
            if (event.data.type === 'search') {
              const query = event.data.query;
              geocoder.geocode({ address: query, componentRestrictions: { country: 'PH' }, region: 'PH' }, function(results, status) {
                if (status === 'OK' && results.length > 0) {
                  // Filter results to only include those in the Philippines and sort by relevance
                  const filteredResults = results
                    .filter(result => {
                      // Check if Philippines is in the address components or formatted address
                      const hasPhilippines = result.formatted_address.toLowerCase().includes('philippines') || 
                                            result.address_components.some(comp => comp.short_name === 'PH');
                      // Exclude if the result is just "Philippines" country itself
                      const isCountryOnly = result.address_components.length === 1 && 
                                           result.address_components[0].types.includes('country');
                      return hasPhilippines && !isCountryOnly;
                    })
                    .map(result => {
                      // Extract relevant address components
                      let placeName = '';
                      let city = '';
                      let province = '';
                      
                      result.address_components.forEach(comp => {
                        if (comp.types.includes('street_address') || comp.types.includes('route')) {
                          placeName = comp.long_name;
                        }
                        if (comp.types.includes('locality')) {
                          city = comp.long_name;
                        }
                        if (comp.types.includes('administrative_area_level_1')) {
                          province = comp.long_name;
                        }
                      });
                      
                      // If no specific place name, use the main formatted address without "Philippines"
                      if (!placeName) {
                        placeName = result.formatted_address.replace(', Philippines', '').split(',')[0];
                      }
                      
                      // Create city/area display
                      const cityDisplay = city || province || 'Philippines';
                      
                      return {
                        placeName: placeName,
                        city: cityDisplay,
                        address: result.formatted_address,
                        location: {
                          lat: result.geometry.location.lat(),
                          lng: result.geometry.location.lng()
                        },
                        placeType: result.types[0] // for prioritization
                      };
                    })
                    // Remove duplicates based on place name and city
                    .filter((result, index, self) => {
                      return index === self.findIndex(r => 
                        r.placeName === result.placeName && r.city === result.city
                      );
                    })  
                    // Pro-sort by province proximity + type relevance
                    .sort((a, b) => {
                      // Check if results are in the same province as user
                      const aInUserProvince = a.city.toLowerCase().includes(userProvince.toLowerCase()) || 
                                            a.address.toLowerCase().includes(userProvince.toLowerCase());
                      const bInUserProvince = b.city.toLowerCase().includes(userProvince.toLowerCase()) || 
                                            b.address.toLowerCase().includes(userProvince.toLowerCase());
                      
                      // Prioritize results in the user's province
                      if (aInUserProvince && !bInUserProvince) return -1;
                      if (!aInUserProvince && bInUserProvince) return 1;
                      
                      // If both or neither are in user province, sort by type
                      const typeOrder = { 'establishment': 0, 'point_of_interest': 1, 'street_address': 2, 'route': 3 };
                      const orderA = typeOrder[a.placeType] ?? 99;
                      const orderB = typeOrder[b.placeType] ?? 99;
                      return orderA - orderB;
                    })
                    // Limit to top 10 results
                    .slice(0, 10);
                  
                  window.parent.postMessage({ type: 'searchResults', results: filteredResults }, '*');
                } else {
                  window.parent.postMessage({ type: 'searchResults', results: [] }, '*');
                }
              });
            } else if (event.data.type === 'navigate') {
              const location = event.data.location;
              
              // Remove old search marker if exists
              if (searchMarker) {
                searchMarker.setMap(null);
              }
              
              // Create marker for search result
              searchMarker = new google.maps.Marker({
                position: location,
                map: map,
                title: event.data.address,
                icon: {
                  path: 'M12 0C5.383 0 0 5.383 0 12c0 7 12 20 12 20s12-13 12-20c0-6.617-5.383-12-12-12zm0 16c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z',
                  scale: 1.5,
                  fillColor: '#f97316',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 1,
                  anchor: { x: 12, y: 20 }
                }
              });
              
              // Center map on search result and zoom in
              map.setCenter(location);
              map.setZoom(16);
            } else if (event.data.type === 'returnToUserLocation') {
              // Remove search marker and return to user location
              if (searchMarker) {
                searchMarker.setMap(null);
                searchMarker = null;
              }
              // Return to user location if available
              if (userLocation) {
                map.setCenter(userLocation);
                map.setZoom(16);
              }
            }
          });
          
          // Get user's geolocation
          if (navigator.geolocation) {
            navigator.geolocation.watchPosition(
              function(position) {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                const userLocation = { lat: userLat, lng: userLng };
                
                // Remove old marker if exists
                if (userMarker) {
                  userMarker.setMap(null);
                }
                
                // Create new marker for user's location
                userMarker = new google.maps.Marker({
                  position: userLocation,
                  map: map,
                  title: 'Your Location',
                  icon: {
                    path: 'M12 0C5.383 0 0 5.383 0 12c0 7 12 20 12 20s12-13 12-20c0-6.617-5.383-12-12-12zm0 16c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z',
                    scale: 1.5,
                    fillColor: '#22c55e',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 1,
                    anchor: { x: 12, y: 20 }
                  }
                });
                
                // Center map on user location and zoom in
                map.setCenter(userLocation);
                map.setZoom(16);
              },
              function(error) {
                console.log('Geolocation error: ' + error.message);
              },
              {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 0
              }
            );
          }
          
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
            <View className="absolute top-0 left-0 right-0 px-6 py-4 pt-12 z-50">
              <View className="flex-1 flex-row items-center rounded-2xl bg-white bg-opacity-95 px-4 py-3 border border-gray-300 shadow-lg">
                <Ionicons name="location" size={20} color="#10b981" />
                <TextInput
                  placeholder="Search locations..."
                  value={searchText}
                  onChangeText={setSearchText}
                  onSubmitEditing={() => handleSearch(searchText)}
                  className="flex-1 ml-3 text-gray-900 text-base font-medium"
                  placeholderTextColor="#9ca3af"
                  returnKeyType="search"
                />
                <TouchableOpacity onPress={() => handleSearch(searchText)}>
                  <Ionicons name="search" size={20} color="#10b981" />
                </TouchableOpacity>
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
