import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StatusBar, Modal, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../utils/supabase';

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


export default function Map({ onBack }: { onBack?: () => void }) {
  const [searchText, setSearchText] = useState('');
  const [isStreetViewActive, setIsStreetViewActive] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [sitesData, setSitesData] = useState<Site[]>([]);
  const [isIframeReady, setIsIframeReady] = useState(false);
  const iframeRef = React.useRef<any>(null);
  const searchTimeoutRef = React.useRef<any>(null);

  // Fetch sites from Supabase and subscribe to real-time updates
  useEffect(() => {
    const fetchSites = async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, latitude, longitude, company_id, branch_id, status')
        .eq('status', 'Active');
      
      if (!error && data) {
        setSitesData(data || []);
      }
    };
    
    fetchSites();

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
  }, []);

  // Send sites to iframe when sites data changes and iframe is ready
  useEffect(() => {
    if (sitesData.length >= 0 && iframeRef.current && isIframeReady) {
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
          button[aria-label="Map camera controls"] { display: none !important; }
          .gm-iv-address { display: none !important; }
          .gm-iv-container { display: none !important; }
          button[aria-label*="Back"] { display: none !important; }
        </style>
      </head>
      <body>
        <div id='map'></div>
        <script src='https://maps.googleapis.com/maps/api/js?key=AIzaSyAq58TD9PputxnK8ZO9jRUX8KW7bTuPTPQ&libraries=places,routes'></script>
        <script>
          let isStreetViewActive = false;
          let userMarker = null;
          let searchMarker = null;
          let siteMarkers = [];
          let sitePolylines = [];
          let geocoder = null;
          let userProvince = 'Lanao del Norte'; // Default to Lanao del Norte
          let userLocation = null; // Store user's current location
          let hasUserMovedMap = false; // Track if user has manually moved the map
          let isInitialLoad = true; // Track if this is the first location update
          let userHeading = 0; // Track user's heading/direction
          let hasUserLocationBeenSet = false; // Track if user location has been set
          let pendingSitesData = null; // Store sites to reload when user location becomes available
          let currentSitesData = null; // Store current sites data for polyline redraw
          let lastPolylineUpdate = 0; // Track last polyline update time to avoid excessive redraws
          
          // Animation time for the pulsing effect
          let animationTime = 0;
          let animationInterval = null;
          
          // Function to create a custom marker using Canvas with pulsing effect
          function createDirectionalMarker(heading, pulse = 8) {
            const canvas = document.createElement('canvas');
            canvas.width = 40;
            canvas.height = 40;
            const ctx = canvas.getContext('2d');
            
            // Draw outer glow circle
            const gradient = ctx.createRadialGradient(20, 20, 0, 20, 20, 18);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(20, 20, 18, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw inner dot with pulsing size
            ctx.fillStyle = '#3b82f6';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(20, 20, pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            return canvas.toDataURL('image/png');
          }
          
          // Start animation loop for pulsing effect
          function startPulseAnimation() {
            if (animationInterval) clearInterval(animationInterval);
            animationInterval = setInterval(() => {
              animationTime += 50;
              // Create pulsing effect: oscillate between 6 and 10 pixels
              const pulse = 8 + 2 * Math.sin(animationTime / 1000 * Math.PI);
              if (userMarker) {
                userMarker.setIcon({
                  url: createDirectionalMarker(userHeading, pulse),
                  scaledSize: new google.maps.Size(40, 40),
                  anchor: new google.maps.Point(20, 20)
                });
              }
            }, 50);
          }
          
          const map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 8.2256, lng: 124.2319 },
            zoom: 12,
            mapTypeId: 'roadmap',
            mapTypeControl: false,
            fullscreenControl: false,
            gestureHandling: 'greedy',
            zoomControl: false
          });
          
          // Track when user manually drags/moves the map
          map.addListener('drag', function() {
            hasUserMovedMap = true;
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
                
                // Get heading/bearing if available
                if (position.coords.heading !== null && position.coords.heading !== undefined) {
                  userHeading = position.coords.heading;
                }
                
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
                
                // Create new marker for user's location with directional indicator
                userMarker = new google.maps.Marker({
                  position: userLocation,
                  map: map,
                  title: 'Your Location',
                  icon: {
                    url: createDirectionalMarker(userHeading, 8),
                    scaledSize: new google.maps.Size(40, 40),
                    anchor: new google.maps.Point(20, 20)
                  }
                });
                
                // Start pulsing animation on first marker creation
                if (!animationInterval) {
                  startPulseAnimation();
                }
                
                // Center map on user location only on initial load
                if (isInitialLoad) {
                  map.setCenter(userLocation);
                  map.setZoom(16);
                  isInitialLoad = false;
                  
                  // If we have pending sites to load, load them now that we have user location
                  if (pendingSitesData && pendingSitesData.length > 0) {
                    window.setTimeout(() => {
                      // Trigger loadSites handler with pending data
                      window.dispatchEvent(new MessageEvent('message', {
                        data: { type: 'loadSites', sites: pendingSitesData }
                      }));
                    }, 100);
                  }
                }
                
                // Redraw polylines to keep them connected to current employee location
                if (currentSitesData && currentSitesData.length > 0) {
                  const now = Date.now();
                  // Throttle polyline redraws to prevent excessive updates (max once per 2 seconds)
                  if (now - lastPolylineUpdate > 2000) {
                    lastPolylineUpdate = now;
                    window.setTimeout(() => {
                      window.dispatchEvent(new MessageEvent('message', {
                        data: { type: 'loadSites', sites: currentSitesData }
                      }));
                    }, 300);
                  }
                }
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
                title: event.data.address
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
            } else if (event.data.type === 'loadSites') {
              // Store sites data in case we need to reload later when user location becomes available
              const sites = event.data.sites;
              
              // If user location is not set yet, store sites and wait for location
              if (!userLocation && sites.length > 0) {
                pendingSitesData = sites;
                // Return early, sites will be loaded once user location is available
                return;
              }
              
              // Store current sites for polyline redraw when user location changes
              currentSitesData = sites;
              
              // Clear existing site markers
              siteMarkers.forEach(marker => marker.setMap(null));
              siteMarkers = [];
              
              // Clear existing polylines
              sitePolylines.forEach(polyline => polyline.setMap(null));
              sitePolylines = [];
              
              const directionsService = new google.maps.DirectionsService();
              
              // Add markers for each site
              sites.forEach(site => {
                if (site.latitude && site.longitude) {
                  // Create site marker first
                  const siteMarker = new google.maps.Marker({
                    position: { lat: site.latitude, lng: site.longitude },
                    map: map,
                    title: site.name
                  });
                  
                  // Add info window for each site with distance and duration
                  let infoContent = '<div style="font-family: sans-serif; padding: 12px; width: 220px;">' +
                    '<strong style="font-size: 16px; display: block; margin-bottom: 8px;">' + site.name + '</strong>' +
                    '<div style="text-align: center; color: #999; font-size: 12px;">Calculating route...</div>' +
                    '</div>';
                  
                  const infoWindow = new google.maps.InfoWindow({
                    content: infoContent,
                    closeButton: true
                  });
                  
                  siteMarker.addListener('click', function() {
                    // Close all other info windows
                    map.infoWindows?.forEach(iw => iw.close());
                    infoWindow.open(map, siteMarker);
                  });
                  
                  siteMarkers.push(siteMarker);
                  
                  let distanceText = '';
                  let durationText = '';
                  
                  // Calculate road distance if user location is available
                  if (userLocation) {
                    directionsService.route({
                      origin: userLocation,
                      destination: { lat: site.latitude, lng: site.longitude },
                      travelMode: google.maps.TravelMode.DRIVING
                    }, function(response, status) {
                      if (status === google.maps.DirectionsStatus.OK) {
                        const route = response.routes[0];
                        const leg = route.legs[0];
                        const distanceInMeters = leg.distance.value;
                        const distanceInKm = distanceInMeters / 1000;
                        const durationInSeconds = leg.duration.value;
                        
                        // Format distance
                        if (distanceInKm < 1) {
                          distanceText = Math.round(distanceInMeters) + 'm';
                        } else {
                          distanceText = distanceInKm.toFixed(1) + 'km';
                        }
                        
                        // Format duration
                        const hours = Math.floor(durationInSeconds / 3600);
                        const minutes = Math.floor((durationInSeconds % 3600) / 60);
                        if (hours > 0) {
                          durationText = hours + 'h ' + minutes + 'min';
                        } else {
                          durationText = minutes + 'min';
                        }
                        
                        // Update marker title with distance and duration
                        siteMarker.setTitle(site.name + ' - ' + durationText + ' - ' + distanceText);
                        
                        // Update info window with styled card
                        infoContent = '<div style="font-family: sans-serif; padding: 12px; width: 220px;">' +
                          '<strong style="font-size: 16px; display: block; margin-bottom: 8px;">' + site.name + '</strong>' +
                          '<div style="display: flex; gap: 16px; align-items: center;">' +
                          '  <div style="flex: 1;">' +
                          '    <div style="font-size: 18px; font-weight: 700; color: #1f2937;">' + durationText + '</div>' +
                          '    <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">travel time</div>' +
                          '  </div>' +
                          '  <div style="flex: 1;">' +
                          '    <div style="font-size: 18px; font-weight: 700; color: #1f2937;">' + distanceText + '</div>' +
                          '    <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">distance</div>' +
                          '  </div>' +
                          '</div>' +
                          '</div>';
                        infoWindow.setContent(infoContent);
                        
                        // Draw route polyline for this site
                        const pathPoints = route.overview_path;
                        // Ensure polyline connects from user location to site location
                        const fullPath = [
                          userLocation,
                          ...pathPoints,
                          { lat: site.latitude, lng: site.longitude }
                        ];
                        const sitePolyline = new google.maps.Polyline({
                          path: fullPath,
                          geodesic: true,
                          strokeColor: '#ef4444',
                          strokeOpacity: 0.7,
                          strokeWeight: 6,
                          map: map
                        });
                        
                        // Store polyline reference
                        sitePolylines.push(sitePolyline);
                      }
                    });
                  }
                }
              });
            } else if (event.data.type === 'exitStreetView') {
              // Exit street view and return to map
              streetViewPanorama.setVisible(false);
              if (userLocation) {
                map.setCenter(userLocation);
                map.setZoom(16);
              }
            }
          });
          
          const streetViewPanorama = map.getStreetView();
          streetViewPanorama.setOptions({
            zoomControl: false,
            panControl: false,
            fullscreenControl: false,
            addressControl: false,
            showRoadLabels: false
          });
          
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
      // Give the iframe time to initialize geolocation before marking as ready
      // This ensures user location will be available for distance calculations
      setTimeout(() => {
        setIsIframeReady(true);
      }, 2000);

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