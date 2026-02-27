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
  const iframeRef = React.useRef<any>(null);
  const searchTimeoutRef = React.useRef<any>(null);

  // Fetch and subscribe to real-time updates for sites
  useEffect(() => {
    const fetchAndSubscribeSites = async () => {
      // Initial fetch
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, latitude, longitude, company_id, branch_id, status')
        .eq('status', 'Active');
      
      if (!error && data) {
        setSitesData(data || []);
      }
      
      // Subscribe to real-time changes
      const subscription = supabase
        .channel('sites-channel')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'sites',
            filter: 'status=eq.Active' // Only listen to Active sites
          },
          async (payload) => {
            // Fetch fresh data whenever there's a change
            const { data: updatedData, error: fetchError } = await supabase
              .from('sites')
              .select('id, name, latitude, longitude, company_id, branch_id, status')
              .eq('status', 'Active');
            
            if (!fetchError && updatedData) {
              setSitesData(updatedData);
            }
          }
        )
        .subscribe();
      
      // Cleanup subscription on unmount
      return () => {
        subscription.unsubscribe();
      };
    };
    
    fetchAndSubscribeSites();
  }, []);

  // Send sites to iframe when sites data changes (real-time updates)
  useEffect(() => {
    if (sitesData.length >= 0 && iframeRef.current) {
      const timer = setTimeout(() => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            { type: 'loadSites', sites: sitesData },
            '*'
          );
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [sitesData]);

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
          @keyframes gpsFlashlight {
            0%, 100% {
              filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.6)) drop-shadow(0 0 16px rgba(59, 130, 246, 0.3));
            }
            50% {
              filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.8)) drop-shadow(0 0 24px rgba(59, 130, 246, 0.5));
            }
          }
          @keyframes gpsBlueZoom {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.4);
            }
          }
          .gps-marker {
            animation: gpsFlashlight 2s ease-in-out infinite;
          }
          .gps-blue-zoom {
            animation: gpsBlueZoom 1.5s ease-in-out infinite;
          }
        </style>
      </head>
      <body>
        <div id='map'></div>
        <script>
          // Suppress console warnings for deprecated APIs
          const originalWarn = console.warn;
          console.warn = function(...args) {
            if (args[0]?.includes('deprecated') || args[0]?.includes('Deprecation warning')) {
              return;
            }
            originalWarn.apply(console, args);
          };
          
          // Flag to track when Google Maps is loaded
          window.googleMapsReady = false;
          
          // Callback function when Maps API is loaded
          window.initGoogleMaps = function() {
            window.googleMapsReady = true;
            // Trigger initialization
            if (window.startMapInitialization) {
              window.startMapInitialization();
            }
          };
        </script>
        <script async src='https://maps.googleapis.com/maps/api/js?key=AIzaSyAq58TD9PputxnK8ZO9jRUX8KW7bTuPTPQ&libraries=places,routes&callback=initGoogleMaps'></script>
        <script>
          let isStreetViewActive = false;
          let userMarker = null;
          let searchMarker = null;
          let siteMarkers = [];
          let geocoder = null;
          let userProvince = 'Lanao del Norte'; // Default to Lanao del Norte
          let userLocation = null; // Store user's current location
          let hasUserMovedMap = false; // Track if user has manually moved the map
          let isInitialLoad = true; // Track if this is the first location update
          let userHeading = 0; // Track user's heading/direction
          let animationId = null; // For animation frame
          let startTime = Date.now(); // Track animation start time
          let map = null; // Will be initialized when Google Maps is loaded
          
          // Function to create a custom marker using Canvas with flashlight effect
          function createDirectionalMarker(heading, blueScale = 1) {
            const canvas = document.createElement('canvas');
            canvas.width = 120;
            canvas.height = 150;
            const ctx = canvas.getContext('2d');
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const centerX = 60;
            const centerY = 67.5;
            
            // Save context for rotation
            ctx.save();
            ctx.translate(centerX, centerY);
            // Convert compass heading to canvas rotation (subtract 90° to align north to up)
            const canvasRotation = heading - 90;
            ctx.rotate((canvasRotation * Math.PI) / 180);
            
            // Draw flashlight cone beam (outer light)
            const coneGradient = ctx.createLinearGradient(0, -45, 0, 0);
            coneGradient.addColorStop(0, 'rgba(59, 130, 246, 0)');
            coneGradient.addColorStop(0.7, 'rgba(59, 130, 246, 0.15)');
            coneGradient.addColorStop(1, 'rgba(59, 130, 246, 0.4)');
            ctx.fillStyle = coneGradient;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-30, -52.5);
            ctx.lineTo(30, -52.5);
            ctx.closePath();
            ctx.fill();
            
            // Draw flashlight cone beam (inner brighter)
            const innerGradient = ctx.createLinearGradient(0, -37.5, 0, 0);
            innerGradient.addColorStop(0, 'rgba(96, 165, 250, 0.3)');
            innerGradient.addColorStop(1, 'rgba(59, 130, 246, 0.5)');
            ctx.fillStyle = innerGradient;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-21, -42);
            ctx.lineTo(21, -42);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
            
            // Draw outer glow circle
            const glowGradient = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, 27);
            glowGradient.addColorStop(0, 'rgba(59, 130, 246, 1)');
            glowGradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.6)');
            glowGradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 27, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw white center dot (big) - fixed size
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 11, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw blue center core with animation scale
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 6 * blueScale, 0, Math.PI * 2);
            ctx.fill();
            
            return canvas.toDataURL('image/png');
          }
          
          // Initialize map when Google Maps API is ready
          window.startMapInitialization = function() {
            if (!window.googleMapsReady || map !== null) return;
            
            map = new google.maps.Map(document.getElementById('map'), {
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
                
                // Create new marker for user's location with flashlight effect
                userMarker = new google.maps.Marker({
                  position: userLocation,
                  map: map,
                  title: 'Your Location',
                  icon: {
                    url: createDirectionalMarker(userHeading),
                    scaledSize: new google.maps.Size(120, 150),
                    anchor: new google.maps.Point(60, 67.5)
                  }
                });
                
                // Start animation for blue zoom effect
                if (animationId) {
                  cancelAnimationFrame(animationId);
                }
                startTime = Date.now();
                const animateMarker = () => {
                  if (!userMarker || !userLocation) return;
                  
                  const elapsed = Date.now() - startTime;
                  const cycle = (elapsed % 1500) / 1500; // 1500ms cycle
                  let blueScale;
                  
                  if (cycle < 0.5) {
                    // Scale up from 1 to 1.4
                    blueScale = 1 + (cycle * 2) * 0.4;
                  } else {
                    // Scale down from 1.4 to 1
                    blueScale = 1.4 - ((cycle - 0.5) * 2) * 0.4;
                  }
                  
                  // Update marker icon with animation
                  userMarker.setIcon({
                    url: createDirectionalMarker(userHeading, blueScale),
                    scaledSize: new google.maps.Size(120, 150),
                    anchor: new google.maps.Point(60, 67.5)
                  });
                  
                  animationId = requestAnimationFrame(animateMarker);
                };
                
                animateMarker();
                
                // Center map on user location only on initial load
                if (isInitialLoad) {
                  map.setCenter(userLocation);
                  map.setZoom(16);
                  isInitialLoad = false;
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
        };
          
          // Fallback: Attempt to initialize immediately if API already loaded
          if (typeof google !== 'undefined' && google.maps) {
            window.googleMapsReady = true;
            setTimeout(() => window.startMapInitialization(), 100);
          }
          
          // Listen for search messages from React (setup before Map loads)
          window.addEventListener('message', function(event) {
            // Wait for map to be initialized if not ready
            if (!map) {
              if (event.data.type === 'search' || event.data.type === 'navigate' || event.data.type === 'loadSites') {
                setTimeout(() => {
                  // Resend the message after a delay
                  window.postMessage(event.data, '*');
                }, 500);
              }
              return;
            }
            
            if (event.data.type === 'search') {
              const query = event.data.query;
              if (!geocoder) return;
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
              // Clear existing site markers and polylines
              siteMarkers.forEach(marker => {
                if (marker.polyline) {
                  marker.polyline.setMap(null);
                }
                marker.setMap(null);
              });
              siteMarkers = [];
              
              const directionsService = new google.maps.DirectionsService();
              const sites = event.data.sites;
              
              // Create all markers first, then request routes
              sites.forEach(site => {
                if (site.latitude && site.longitude) {
                  const siteMarker = new google.maps.Marker({
                    position: { lat: site.latitude, lng: site.longitude },
                    map: map,
                    title: site.name
                  });
                  
                  // Add info window for each site
                  let infoContent = '<div style="font-family: sans-serif; padding: 12px; width: 220px;">' +
                    '<strong style="font-size: 16px; display: block; margin-bottom: 8px;">' + site.name + '</strong>' +
                    '<div style="text-align: center; color: #999; font-size: 12px;">Calculating route...</div>' +
                    '</div>';
                  
                  const infoWindow = new google.maps.InfoWindow({
                    content: infoContent,
                    closeButton: true
                  });
                  
                  siteMarker.addListener('click', function() {
                    map.infoWindows?.forEach(iw => iw.close());
                    infoWindow.open(map, siteMarker);
                  });
                  
                  siteMarkers.push(siteMarker);
                  
                  // Calculate route for this specific marker
                  if (userLocation) {
                    directionsService.route({
                      origin: userLocation,
                      destination: { lat: site.latitude, lng: site.longitude },
                      travelMode: google.maps.TravelMode.DRIVING
                    }, ((marker, infoWin, currentSite) => {
                      return (response, status) => {
                        if (status === google.maps.DirectionsStatus.OK) {
                          const route = response.routes[0];
                          const leg = route.legs[0];
                          const distanceInMeters = leg.distance.value;
                          const distanceInKm = distanceInMeters / 1000;
                          const durationInSeconds = leg.duration.value;
                          
                          // Format distance
                          let distanceText = '';
                          if (distanceInKm < 1) {
                            distanceText = Math.round(distanceInMeters) + 'm';
                          } else {
                            distanceText = distanceInKm.toFixed(1) + 'km';
                          }
                          
                          // Format duration
                          const hours = Math.floor(durationInSeconds / 3600);
                          const minutes = Math.floor((durationInSeconds % 3600) / 60);
                          let durationText = '';
                          if (hours > 0) {
                            durationText = hours + 'h ' + minutes + 'min';
                          } else {
                            durationText = minutes + 'min';
                          }
                          
                          // Update marker title
                          marker.setTitle(currentSite.name + ' - ' + durationText + ' - ' + distanceText);
                          
                          // Update info window content
                          const updatedContent = '<div style="font-family: sans-serif; padding: 12px; width: 220px;">' +
                            '<strong style="font-size: 16px; display: block; margin-bottom: 8px;">' + currentSite.name + '</strong>' +
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
                          infoWin.setContent(updatedContent);
                          
                          // Draw route polyline
                          const pathPoints = route.overview_path;
                          const fullPath = [
                            userLocation,
                            ...pathPoints,
                            { lat: currentSite.latitude, lng: currentSite.longitude }
                          ];
                          const sitePolyline = new google.maps.Polyline({
                            path: fullPath,
                            geodesic: true,
                            strokeColor: '#ef4444',
                            strokeOpacity: 0.7,
                            strokeWeight: 3,
                            map: map
                          });
                          
                          // Store polyline reference on marker
                          marker.polyline = sitePolyline;
                        }
                      };
                    })(siteMarker, infoWindow, site));
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
              
              // Setup street view (moved inside initialization)
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
              
              document.documentElement.setAttribute('data-street-view', streetViewPanorama.getVisible());
            }
          });
          
          // Removed street view code from here - it's now inside initialization function
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

  // Trigger map initialization if Google Maps is already loaded
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (iframeRef.current && typeof iframeRef.current.contentWindow?.initGoogleMaps === 'function') {
        iframeRef.current.contentWindow.initGoogleMaps();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
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
            sandbox: 'allow-same-origin allow-scripts allow-popups allow-forms',
            onLoad: handleIframeLoad,
          } as any)}
          {!isStreetViewActive && (
            <View className="absolute top-0 left-0 right-0 px-4 py-4 pt-4 mt-4 z-50">
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
              className="absolute bottom-3 right-3 bg-white rounded-full p-3 shadow-lg z-50 animate-bounce"
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
