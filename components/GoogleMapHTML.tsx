export const googleMapHtml = `
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
          let pendingSitesData = null; // Store sites to reload when user location becomes available
          let currentSitesData = null; // Store current sites data for polyline redraw
          let lastPolylineUpdate = 0; // Track last polyline update time to avoid excessive redraws
          let lastUserLocation = null; // Track last user location used for polyline
          let minDistanceForRedraw = 100; // Increased from 50 to 100 meters to reduce redraws
          let lastPositionUpdate = 0; // Track last position update to debounce
          let locationUpdateThrottle = 1000; // Only update positions once per second
          
          // Animation time for the pulsing effect
          let animationTime = 0;
          let animationInterval = null;
          let animationFrameId = null;
          
          // Helper function to calculate distance between two coordinates in meters
          function calculateDistance(lat1, lng1, lat2, lng2) {
            const R = 6371000; // Earth's radius in meters
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
          }
          
          // Function to create a static directional marker without pulsing
          function createDirectionalMarker(heading) {
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
            
            // Draw inner dot (static size)
            ctx.fillStyle = '#3b82f6';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(20, 20, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            return canvas.toDataURL('image/png');
          }
          
          let pulseCircle = null;
          
          // Create pulsing circle overlay separate from marker
          function startPulseAnimation() {
            // Don't start if already running
            if (animationInterval || animationFrameId) {
              return;
            }
            
            let startTime = Date.now();
            const updatePulse = () => {
              const elapsed = Date.now() - startTime;
              // Create smooth pulsing effect: oscillate between 25 and 45 meters radius
              const radius = 35 + 10 * Math.sin((elapsed / 1500) * Math.PI);
              const opacity = 0.4 - 0.2 * Math.cos((elapsed / 1500) * Math.PI);
              
              if (!pulseCircle && userLocation) {
                // Create circle on first animation frame
                pulseCircle = new google.maps.Circle({
                  center: userLocation,
                  radius: radius,
                  map: map,
                  fillColor: '#3b82f6',
                  fillOpacity: opacity,
                  strokeColor: '#3b82f6',
                  strokeOpacity: 0.6,
                  strokeWeight: 1
                });
              } else if (pulseCircle && userLocation) {
                // Update circle position and size
                pulseCircle.setCenter(userLocation);
                pulseCircle.setRadius(radius);
                pulseCircle.setOptions({
                  fillOpacity: opacity
                });
              }
              
              animationFrameId = requestAnimationFrame(updatePulse);
            };
            animationFrameId = requestAnimationFrame(updatePulse);
          }
          
          function stopPulseAnimation() {
            if (animationInterval) {
              clearInterval(animationInterval);
              animationInterval = null;
            }
            if (animationFrameId) {
              cancelAnimationFrame(animationFrameId);
              animationFrameId = null;
            }
            if (pulseCircle) {
              pulseCircle.setMap(null);
              pulseCircle = null;
            }
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
                const now = Date.now();
                // Throttle position updates to avoid excessive marker updates and flickering
                if (now - lastPositionUpdate < locationUpdateThrottle) {
                  return;
                }
                lastPositionUpdate = now;
                
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
                
                // Create marker on first location update only
                if (!userMarker) {
                  userMarker = new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: 'Your Location',
                    icon: {
                      url: createDirectionalMarker(userHeading),
                      scaledSize: new google.maps.Size(40, 40),
                      anchor: new google.maps.Point(20, 20)
                    }
                  });
                  // Start pulsing animation only once
                  startPulseAnimation();
                } else {
                  // Update existing marker position without recreating it
                  userMarker.setPosition(userLocation);
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
                  // Update polyline every 2 seconds to keep it connected to GPS marker
                  if (now - lastPolylineUpdate > 2000) {
                    // Always redraw when enough time has passed (no distance check needed)
                    lastPolylineUpdate = now;
                    lastUserLocation = { ...userLocation };
                    window.setTimeout(() => {
                      window.dispatchEvent(new MessageEvent('message', {
                        data: { type: 'loadSites', sites: currentSitesData }
                      }));
                    }, 100);
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
              
              // Check if sites data actually changed (compare IDs)
              const sitesChanged = !currentSitesData || 
                currentSitesData.length !== sites.length ||
                sites.some((site, idx) => !currentSitesData[idx] || currentSitesData[idx].id !== site.id);
              
              // Only redraw if sites changed or this is the first load
              if (!sitesChanged) {
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
                    // Capture current user location for this route calculation
                    const currentUserLocation = { ...userLocation };
                    
                    directionsService.route({
                      origin: currentUserLocation,
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
                          '    <div style="font-size: 18px; font-weight: 700; color: #ef4444;">' + distanceText + '</div>' +
                          '    <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">distance</div>' +
                          '  </div>' +
                          '</div>' +
                          '</div>';
                        infoWindow.setContent(infoContent);
                        
                        // Draw route polyline for this site
                        // Use the ORIGINAL calculated route from Google Directions
                        const pathPoints = route.overview_path;
                        
                        // Start polyline from current user location (always the latest)
                        const fullPath = [currentUserLocation, ...pathPoints];
                        
                        // Ensure destination is included
                        const lastPoint = fullPath[fullPath.length - 1];
                        if (!lastPoint || lastPoint.lat() !== site.latitude || lastPoint.lng() !== site.longitude) {
                          fullPath.push({ lat: site.latitude, lng: site.longitude });
                        }
                        
                        // Remove old polyline for this site if exists
                        if (sitePolylines.length > sites.indexOf(site)) {
                          sitePolylines[sites.indexOf(site)]?.setMap(null);
                        }
                        
                        const sitePolyline = new google.maps.Polyline({
                          path: fullPath,
                          geodesic: true,
                          strokeColor: '#ef4444',
                          strokeOpacity: 1,
                          strokeWeight: 6,
                          map: map,
                          zIndex: 5  // Ensure polyline is visible
                        });
                        
                        // Store polyline reference - update or append
                        const siteIndex = sites.indexOf(site);
                        if (siteIndex < sitePolylines.length) {
                          sitePolylines[siteIndex] = sitePolyline;
                        } else {
                          sitePolylines.push(sitePolyline);
                        }
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
          
          // Cleanup on page unload
          window.addEventListener('beforeunload', function() {
            stopPulseAnimation();
          });
        </script>
      </body>
    </html>
  `;
