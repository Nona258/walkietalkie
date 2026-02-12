// Add Leaflet CSS for web support
// import 'leaflet/dist/leaflet.css'; // Moved to public/index.html for web

import React, { useState } from 'react';
import { View, Platform } from 'react-native';

// Only import react-leaflet for web
let MapContainer, TileLayer, Marker, useMapEvents;
if (Platform.OS === 'web') {
  const leaflet = require('react-leaflet');
  MapContainer = leaflet.MapContainer;
  TileLayer = leaflet.TileLayer;
  Marker = leaflet.Marker;
  useMapEvents = leaflet.useMapEvents;
}

export default function LeafletMap({ onLocationSelect, initialPosition }) {
  const [position, setPosition] = useState(initialPosition || [14.5995, 120.9842]); // Default: Manila

  if (Platform.OS !== 'web') {
    return <View style={{ height: 200, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}><Text>Map only available on web</Text></View>;
  }

  function LocationMarker() {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
        onLocationSelect && onLocationSelect([e.latlng.lat, e.latlng.lng]);
      },
    });
    return <Marker position={position} />;
  }

  return (
    <MapContainer center={position} zoom={13} style={{ height: 300, width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LocationMarker />
    </MapContainer>
  );
}
