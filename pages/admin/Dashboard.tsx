import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../utils/supabase';
import AdminNavbar from '../../components/AdminNavbar';
import SiteManagement from './SiteManagement';
import ContactManagement from './ContactManagement';
import ActivityLogs from './ActivityLogs';
import CompanyList from './CompanyList';
import Employees from './Employees';
import Settings from './Settings';
import '../../global.css';

// Only import WebView for native platforms
let WebView: any = null;
if (Platform.OS !== 'web') {
  const WebViewImport = require('react-native-webview').WebView;
  WebView = WebViewImport;
}

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? 'AIzaSyAq58TD9PputxnK8ZO9jRUX8KW7bTuPTPQ';

function safeJsonForHtml(value: unknown) {
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}

type OnlineUserHistoryRow = {
  user_id: string;
  latitude: number;
  longitude: number;
  recorded_at?: string;
};

function buildLiveLocationMapHtml(
  sites: Site[],
  onlineUsers: User[] = [],
  onlineUserHistory: OnlineUserHistoryRow[] = []
) {
  const sitesForMap = (sites ?? []).map(s => ({
    id: s.id,
    name: s.name,
    status: s.status,
    created_at: s.created_at,
    updated_at: s.updated_at,
    latitude: s.latitude,
    longitude: s.longitude,
    company_id: s.company_id,
    branch_id: s.branch_id,
    start_time: s.start_time,
    end_time: s.end_time,
    date_accomplished: s.date_accomplished,
    members_count: s.members_count,
  }));

  const onlineUsersForMap = (onlineUsers ?? [])
    .filter(
      u =>
        u && (String(u.status || '').toLowerCase() === 'online' || String(u.status || '').toLowerCase() === 'lost_connection' || String(u.status || '').toLowerCase() === 'lost connection') &&
        u.latitude !== null && u.latitude !== undefined &&
        u.longitude !== null && u.longitude !== undefined &&
        !Number.isNaN(Number(u.latitude)) && !Number.isNaN(Number(u.longitude))
    )
    .map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      status: (() => {
        const s = String(u.status || '').toLowerCase();
        if (s === 'lost connection') return 'lost_connection';
        return s || 'offline';
      })(),
      latitude: Number(u.latitude),
      longitude: Number(u.longitude),
    }));

  const historyForMap = (onlineUserHistory ?? [])
    .filter(r => !!r && !!r.user_id && r.latitude !== null && r.latitude !== undefined && r.longitude !== null && r.longitude !== undefined && !Number.isNaN(Number(r.latitude)) && !Number.isNaN(Number(r.longitude)))
    .map(r => ({
      user_id: r.user_id,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      recorded_at: r.recorded_at,
    }));

  return LIVE_LOCATION_MAP_HTML
    .replace('__SITES_JSON__', safeJsonForHtml(sitesForMap))
    .replace('__ONLINE_USERS_JSON__', safeJsonForHtml(onlineUsersForMap))
    .replace('__ONLINE_USER_HISTORY_JSON__', safeJsonForHtml(historyForMap));
}

const LIVE_LOCATION_MAP_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset='utf-8' />
    <meta name='viewport' content='initial-scale=1,maximum-scale=1,user-scalable=no' />
    <style>
      body { margin: 0; padding: 0; }
      #map { position: absolute; top: 0; bottom: 0; width: 100%; }
      .gm-fullscreen-control { display: none !important; }
      button[aria-label*='fullscreen'] { display: none !important; }
      button[aria-label*='Full screen'] { display: none !important; }
      /* Hide Google's bundled pan arrows */
      .gm-bundled-control { display: none !important; }
      .gm-svpc { display: none !important; }
      button[aria-label='Pan left'] { display: none !important; }
      button[aria-label='Pan right'] { display: none !important; }
      button[aria-label='Pan up'] { display: none !important; }
      button[aria-label='Pan down'] { display: none !important; }
      div[aria-label='Map pan controls'] { display: none !important; }

      /* Controls panel (pill card slides up when visible) */
      #controlsPanel {
        position: absolute;
        bottom: 60px;
        right: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0;
        background: #ffffff;
        border-radius: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        overflow: hidden;
        z-index: 5;
        opacity: 0;
        transform: translateY(16px) scale(0.96);
        pointer-events: none;
        transition: opacity 0.22s cubic-bezier(.4,0,.2,1),
                    transform 0.22s cubic-bezier(.4,0,.2,1);
      }
      #controlsPanel.visible {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }
      .ctrl-btn {
        width: 40px;
        height: 40px;
        border: none;
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s;
      }
      .ctrl-btn:hover { background: #f3f4f6; }
      .ctrl-btn:active { background: #e5e7eb; }
      .ctrl-btn svg { width: 20px; height: 20px; fill: #374151; }
      .ctrl-divider {
        width: 24px;
        height: 1px;
        background: #e5e7eb;
        margin: 0 auto;
      }

      /* Toggle button (always visible) */
      #controlsToggle {
        position: absolute;
        bottom: 12px;
        right: 12px;
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 6;
        transition: background 0.15s, box-shadow 0.15s;
      }
      #controlsToggle:hover { background: #f3f4f6; }
      #controlsToggle:active { background: #e5e7eb; }
      #controlsToggle svg {
        width: 20px;
        height: 20px;
        fill: #374151;
        transition: transform 0.22s cubic-bezier(.4,0,.2,1);
      }
      #controlsToggle.open svg { transform: rotate(90deg); }
    </style>
  </head>
  <body>
    <div id='map'></div>
    <script>
      window.__SITES__ = __SITES_JSON__;
      window.__ONLINE_USERS__ = __ONLINE_USERS_JSON__;
      window.__ONLINE_USER_HISTORY__ = __ONLINE_USER_HISTORY_JSON__;
    </script>
    <!-- Controls pill panel -->
    <div id='controlsPanel'>
      <!-- Recenter / track location -->
      <button class='ctrl-btn' id='recenter' aria-label='Track current location' title='Track my location'>
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <path d='M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.94 3A9 9 0 0 0 13 3.06V1h-2v2.06A9 9 0 0 0 3.06 11H1v2h2.06A9 9 0 0 0 11 20.94V23h2v-2.06A9 9 0 0 0 20.94 13H23v-2h-2.06zM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14z'/>
        </svg>
      </button>
      <div class='ctrl-divider'></div>
      <!-- Zoom in -->
      <button class='ctrl-btn' id='zoomIn' aria-label='Zoom in'>
        <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'/></svg>
      </button>
      <div class='ctrl-divider'></div>
      <!-- Zoom out -->
      <button class='ctrl-btn' id='zoomOut' aria-label='Zoom out'>
        <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M19 13H5v-2h14v2z'/></svg>
      </button>
      <div class='ctrl-divider'></div>
      <!-- Fullscreen -->
      <button class='ctrl-btn' id='goFullscreen' aria-label='Fullscreen'>
        <svg id='fsIconExpand' viewBox='0 0 24 24' aria-hidden='true'><path d='M7 14H5v5h5v-2H7v-3zm0-4h2V7h3V5H5v5zm10 7h-3v2h5v-5h-2v3zm0-12V5h-5v2h3v3h2V5z'/></svg>
        <svg id='fsIconCollapse' viewBox='0 0 24 24' aria-hidden='true' style='display:none'><path d='M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z'/></svg>
      </button>
      <div class='ctrl-divider'></div>
      <!-- Street View -->
      <button class='ctrl-btn' id='goStreetView' aria-label='Street View' title='Street View'>
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <path d='M12 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 10c-4 0-7 1.79-7 4v1h14v-1c0-2.21-3-4-7-4z'/>
        </svg>
      </button>
    </div>

    <!-- Toggle button -->
    <button id='controlsToggle' aria-label='Toggle controls' title='Map controls'>
      <svg viewBox='0 0 24 24' aria-hidden='true'>
        <path d='M4 7h16v2H4V7zm0 8h16v2H4v-2zm0-4h16v2H4v-2z'/>
      </svg>
    </button>
    <script src='https://maps.googleapis.com/maps/api/js?key=AIzaSyAq58TD9PputxnK8ZO9jRUX8KW7bTuPTPQ&libraries=places,routes'></script>
    <script>
      let userMarker = null;
      let haloMarker = null;
      let accuracyCircle = null;
      let directionCone = null;
      let isInitialLoad = true;
      let followUser = false;
      let lastUserLocation = null;
      let controlsVisible = false;

      let siteMarkers = [];
      let siteInfoWindow = null;

      let onlineUserInfoWindow = null;
      let onlineUserMarkersById = {};
      let onlineUserPolylinesById = {};
      let onlineUserLastPosById = {};
      let onlineUserDataById = {};
      let openOnlineUserId = null;

      // Marker color is based on the user's persisted status from the database.
      const ONLINE_MARKER_COLOR = '#10b981';
      // Reuse an existing neutral tone already used elsewhere in this file (stone-400).
      const LOST_CONNECTION_MARKER_COLOR = '#a8a29e';

      function markerFillForStatus(status) {
        const s = String(status || '').toLowerCase();
        if (s === 'lost_connection' || s === 'lost connection') return LOST_CONNECTION_MARKER_COLOR;
        return ONLINE_MARKER_COLOR;
      }

      function setMarkerStatus(marker, status) {
        if (!marker) return;
        const icon = marker.getIcon && marker.getIcon();
        const fillColor = markerFillForStatus(status);
        const nextIcon = {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        };
        // Ensure we always have a predictable icon object.
        if (!icon) {
          marker.setIcon(nextIcon);
        } else {
          marker.setIcon(nextIcon);
        }
      }

      const map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 8.2256, lng: 124.2319 },
        zoom: 12,
        mapTypeId: 'roadmap',
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        rotateControl: false,
        panControl: false,
        gestureHandling: 'greedy',
        zoomControl: false,   // using custom zoom buttons inside the pill
      });

      function escHtml(s) {
        return String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function fmt(v) {
        if (v === null || v === undefined || v === '') return '—';
        return escHtml(v);
      }

      function clearSiteMarkers() {
        siteMarkers.forEach(m => m.setMap(null));
        siteMarkers = [];
      }

      function clearOnlineUserMarkers() {
        Object.keys(onlineUserMarkersById).forEach(id => {
          const m = onlineUserMarkersById[id];
          if (m) m.setMap(null);
        });
        Object.keys(onlineUserPolylinesById).forEach(id => {
          const p = onlineUserPolylinesById[id];
          if (p) p.setMap(null);
        });
        onlineUserMarkersById = {};
        onlineUserPolylinesById = {};
        onlineUserLastPosById = {};
      }

      function setPolylinePath(userId, positions) {
        const id = String(userId);
        if (!Array.isArray(positions) || positions.length === 0) return;
        let poly = onlineUserPolylinesById[id];
        if (!poly) {
          poly = new google.maps.Polyline({
            map,
            path: positions,
            geodesic: true,
            strokeColor: '#10b981',
            strokeOpacity: 0.65,
            strokeWeight: 5,
          });
          onlineUserPolylinesById[id] = poly;
        } else {
          poly.setPath(positions);
        }
      }

      function applyOnlineUserHistory(rows) {
        if (!Array.isArray(rows) || rows.length === 0) return;
        const byUser = {};
        rows.forEach(r => {
          if (!r || !r.user_id) return;
          const id = String(r.user_id);
          const lat = (r.latitude !== null && r.latitude !== undefined) ? Number(r.latitude) : null;
          const lng = (r.longitude !== null && r.longitude !== undefined) ? Number(r.longitude) : null;
          if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) return;
          if (!byUser[id]) byUser[id] = [];
          byUser[id].push({ lat, lng });
        });

        Object.keys(byUser).forEach(id => {
          // cap to last 300 points to keep the map fast
          const pts = byUser[id];
          const capped = pts.length > 300 ? pts.slice(pts.length - 300) : pts;
          setPolylinePath(id, capped);
          const last = capped[capped.length - 1];
          if (last) onlineUserLastPosById[id] = last;
        });
      }

      function renderSites(sites) {
        clearSiteMarkers();
        if (!Array.isArray(sites) || sites.length === 0) return;
        if (!siteInfoWindow) siteInfoWindow = new google.maps.InfoWindow();

        sites.forEach(site => {
          const lat = (site.latitude !== null && site.latitude !== undefined) ? Number(site.latitude) : null;
          const lng = (site.longitude !== null && site.longitude !== undefined) ? Number(site.longitude) : null;
          if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) return;

          const marker = new google.maps.Marker({
            position: { lat, lng },
            map,
            title: site.name || 'Site',
          });

          marker.addListener('click', () => {
            // If Street View pick mode is active, open Street View at this site's location.
            if (typeof streetViewPickMode !== 'undefined' && streetViewPickMode) {
              openStreetViewAt(marker.getPosition());
              return;
            }
            const html =
              '<div style="min-width:220px;max-width:300px;font-family:Arial,sans-serif;">' +
                '<div style="font-weight:700;font-size:14px;margin-bottom:6px;">' + fmt(site.name) + '</div>' +
                '<div style="font-size:12px;line-height:1.4;color:#374151;">' +
                  '<div><b>ID:</b> ' + fmt(site.id) + '</div>' +
                  '<div><b>Status:</b> ' + fmt(site.status) + '</div>' +
                  '<div><b>Company ID:</b> ' + fmt(site.company_id) + '</div>' +
                  '<div><b>Branch ID:</b> ' + fmt(site.branch_id) + '</div>' +
                  '<div><b>Start Time:</b> ' + fmt(site.start_time) + '</div>' +
                  '<div><b>End Time:</b> ' + fmt(site.end_time) + '</div>' +
                  '<div><b>Date Accomplished:</b> ' + fmt(site.date_accomplished) + '</div>' +
                  '<div><b>Members Count:</b> ' + fmt(site.members_count) + '</div>' +
                  '<div><b>Latitude:</b> ' + fmt(site.latitude) + '</div>' +
                  '<div><b>Longitude:</b> ' + fmt(site.longitude) + '</div>' +
                  '<div><b>Created:</b> ' + fmt(site.created_at) + '</div>' +
                  '<div><b>Updated:</b> ' + fmt(site.updated_at) + '</div>' +
                '</div>' +
              '</div>';
            siteInfoWindow.setContent(html);
            siteInfoWindow.open({ map, anchor: marker });
            map.panTo(marker.getPosition());
          });

          siteMarkers.push(marker);
        });
      }

      function upsertOnlineUsers(users) {
        if (!Array.isArray(users)) users = [];
        if (!onlineUserInfoWindow) onlineUserInfoWindow = new google.maps.InfoWindow();

        function buildOnlineUserHtml(user) {
          const u = user || {};
          return (
            '<div style="min-width:220px;max-width:300px;font-family:Arial,sans-serif;">' +
              '<div style="font-weight:700;font-size:14px;margin-bottom:6px;">' + fmt(u.full_name || 'Online User') + '</div>' +
              '<div style="font-size:12px;line-height:1.4;color:#374151;">' +
                '<div><b>User ID:</b> ' + fmt(u.id) + '</div>' +
                '<div><b>Email:</b> ' + fmt(u.email) + '</div>' +
                '<div><b>Role:</b> ' + fmt(u.role) + '</div>' +
                '<div><b>Status:</b> ' + fmt(u.status) + '</div>' +
                '<div><b>Latitude:</b> ' + fmt(u.latitude) + '</div>' +
                '<div><b>Longitude:</b> ' + fmt(u.longitude) + '</div>' +
              '</div>' +
            '</div>'
          );
        }

        const incomingIds = {};
        users.forEach(u => {
          if (!u || !u.id) return;
          incomingIds[String(u.id)] = true;

          const lat = (u.latitude !== null && u.latitude !== undefined) ? Number(u.latitude) : null;
          const lng = (u.longitude !== null && u.longitude !== undefined) ? Number(u.longitude) : null;
          if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) return;

          const id = String(u.id);
          onlineUserDataById[id] = u;
          const pos = { lat, lng };

          let marker = onlineUserMarkersById[id];
          if (!marker) {
            marker = new google.maps.Marker({
              position: pos,
              map,
              title: (u.full_name || u.email || 'Online user'),
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: markerFillForStatus(u.status),
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              },
            });

            marker.addListener('click', () => {
              openOnlineUserId = id;
              // If Street View pick mode is active, open Street View at this user's location.
              if (typeof streetViewPickMode !== 'undefined' && streetViewPickMode) {
                openStreetViewAt(marker.getPosition());
                return;
              }
              const current = onlineUserDataById[id] || u;
              const html = buildOnlineUserHtml(current);
              onlineUserInfoWindow.setContent(html);
              onlineUserInfoWindow.open({ map, anchor: marker });
              map.panTo(marker.getPosition());
            });

            onlineUserMarkersById[id] = marker;
          } else {
            marker.setPosition(pos);
            // Keep marker style in sync with status changes.
            try {
              setMarkerStatus(marker, u.status);
            } catch (e) {
              // ignore
            }
          }

          // If the info window is currently open for this user, refresh its content live.
          if (openOnlineUserId === id && onlineUserInfoWindow) {
            try {
              const current = onlineUserDataById[id] || u;
              onlineUserInfoWindow.setContent(buildOnlineUserHtml(current));
              onlineUserInfoWindow.open({ map, anchor: marker });
            } catch (e) {
              // ignore
            }
          }

          const prev = onlineUserLastPosById[id];
          const moved = !prev || prev.lat !== pos.lat || prev.lng !== pos.lng;
          if (moved) {
            onlineUserLastPosById[id] = pos;
            let poly = onlineUserPolylinesById[id];
            if (!poly) {
              poly = new google.maps.Polyline({
                map,
                path: [pos],
                geodesic: true,
                strokeColor: '#10b981',
                strokeOpacity: 0.55,
                strokeWeight: 3,
              });
              onlineUserPolylinesById[id] = poly;
            } else {
              const path = poly.getPath();
              path.push(pos);
            }
          }
        });

        // Remove markers/polylines for users that are no longer online.
        Object.keys(onlineUserMarkersById).forEach(id => {
          if (incomingIds[id]) return;
          const m = onlineUserMarkersById[id];
          if (m) m.setMap(null);
          delete onlineUserMarkersById[id];

          const p = onlineUserPolylinesById[id];
          if (p) p.setMap(null);
          delete onlineUserPolylinesById[id];
          delete onlineUserLastPosById[id];
          delete onlineUserDataById[id];

          if (openOnlineUserId === id && onlineUserInfoWindow) {
            try { onlineUserInfoWindow.close(); } catch (e) {}
            openOnlineUserId = null;
          }
        });
      }

      // Initial site markers
      renderSites(window.__SITES__ || []);

      // Initial online user markers
      upsertOnlineUsers(window.__ONLINE_USERS__ || []);

      // Initial online user history paths
      applyOnlineUserHistory(window.__ONLINE_USER_HISTORY__ || []);

      // Live updates from parent (React Native WebView or web iframe)
      function handleIncomingMessage(event) {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (!data || !data.type) return;
          if (data.type === 'ONLINE_USERS_UPDATE') {
            upsertOnlineUsers(data.users || []);
          }
          if (data.type === 'ONLINE_USER_HISTORY_UPDATE') {
            applyOnlineUserHistory(data.rows || []);
          }
          if (data.type === 'ONLINE_SITES_UPDATE') {
            renderSites(data.sites || []);
          }
        } catch (e) {
          // ignore
        }
      }

      window.addEventListener('message', handleIncomingMessage);
      document.addEventListener('message', handleIncomingMessage);

      // If user manually moves the map, stop following until they press recenter
      map.addListener('dragstart', function() {
        followUser = false;
      });

      const panel = document.getElementById('controlsPanel');
      const controlsToggleBtn = document.getElementById('controlsToggle');
      const recenterBtn = document.getElementById('recenter');
      const zoomInBtn = document.getElementById('zoomIn');
      const zoomOutBtn = document.getElementById('zoomOut');

      controlsToggleBtn.addEventListener('click', function() {
        controlsVisible = !controlsVisible;
        panel.classList.toggle('visible', controlsVisible);
        controlsToggleBtn.classList.toggle('open', controlsVisible);
      });

      recenterBtn.addEventListener('click', function() {
        followUser = true;
        if (lastUserLocation) {
          if (map.getZoom() < 16) map.setZoom(16);
        }
      });

      zoomInBtn.addEventListener('click', function() {
        map.setZoom(map.getZoom() + 1);
      });

      zoomOutBtn.addEventListener('click', function() {
        map.setZoom(map.getZoom() - 1);
      });

      const goFullscreenBtn = document.getElementById('goFullscreen');
      const fsIconExpand = document.getElementById('fsIconExpand');
      const fsIconCollapse = document.getElementById('fsIconCollapse');
      const mapEl = document.documentElement;

      function updateFsIcon() {
        const isFs = !!document.fullscreenElement;
        fsIconExpand.style.display = isFs ? 'none' : '';
        fsIconCollapse.style.display = isFs ? '' : 'none';
      }

      document.addEventListener('fullscreenchange', updateFsIcon);

      goFullscreenBtn.addEventListener('click', function() {
        if (!document.fullscreenElement) {
          mapEl.requestFullscreen && mapEl.requestFullscreen();
        } else {
          document.exitFullscreen && document.exitFullscreen();
        }
      });

      // Street View
      const goStreetViewBtn = document.getElementById('goStreetView');
      let streetViewActive = false;
      let streetViewPickMode = false;
      let panorama = null;
      let streetViewService = null;
      let streetViewPin = null;
      let panoramaListenersAttached = false;

      function syncMarkersForStreetView() {
        if (!panorama) return;

        if (streetViewActive) {
          // Show the user's dot inside Street View.
          if (userMarker) userMarker.setMap(panorama);
          if (haloMarker) haloMarker.setMap(panorama);
          // Accuracy circle isn't supported in panorama; hide it while in Street View.
          if (accuracyCircle) accuracyCircle.setMap(null);
        } else {
          // Restore markers to the normal map.
          if (userMarker) userMarker.setMap(map);
          if (haloMarker) haloMarker.setMap(map);
          if (accuracyCircle && lastUserLocation) accuracyCircle.setMap(map);
        }
      }

      function setStreetViewBtnOn(isOn) {
        goStreetViewBtn.style.background = isOn ? '#e0f0ff' : '';
        const svg = goStreetViewBtn.querySelector('svg');
        if (svg) svg.style.fill = isOn ? '#1a73e8' : '';
      }

      function ensurePanorama() {
        if (panorama) return panorama;
        panorama = map.getStreetView();
        panorama.setOptions({
          pov: { heading: 0, pitch: 0 },
          addressControl: false,
          fullscreenControl: false,
          panControl: false,
          linksControl: true,
          enableCloseButton: false,
        });
        panorama.setVisible(false);

        if (!panoramaListenersAttached) {
          panoramaListenersAttached = true;
          panorama.addListener('position_changed', function() {
            if (!streetViewActive) return;
            const pos = panorama.getPosition && panorama.getPosition();
            if (pos) setStreetViewPin(pos);
          });
        }
        return panorama;
      }

      function setStreetViewPin(latLng) {
        const pano = ensurePanorama();
        if (!streetViewPin) {
          streetViewPin = new google.maps.Marker({
            position: latLng,
            map: pano,
            clickable: false,
            title: 'Street View location',
          });
        } else {
          streetViewPin.setMap(pano);
          streetViewPin.setPosition(latLng);
        }
      }

      function clearStreetViewPin() {
        if (!streetViewPin) return;
        streetViewPin.setMap(null);
      }

      function openStreetViewAt(latLng) {
        if (!streetViewService) streetViewService = new google.maps.StreetViewService();
        streetViewService.getPanorama(
          {
            location: latLng,
            radius: 80,
            source: google.maps.StreetViewSource.OUTDOOR,
          },
          function(data, status) {
            if (status !== google.maps.StreetViewStatus.OK || !data || !data.location) {
              console.log('Street View not available here');
              // keep pick mode enabled so the user can try another spot
              streetViewPickMode = true;
              setStreetViewBtnOn(true);
              return;
            }

            const pano = ensurePanorama();
            if (data.location.pano) {
              pano.setPano(data.location.pano);
            } else {
              pano.setPosition(data.location.latLng);
            }

            pano.setVisible(true);
            streetViewActive = true;
            streetViewPickMode = false;
            // Wait until panorama is visible before attaching the pin (more reliable in embeds)
            setTimeout(function() {
              setStreetViewPin(data.location.latLng);
            }, 0);
            setStreetViewBtnOn(true);
            syncMarkersForStreetView();
          }
        );
      }

      goStreetViewBtn.addEventListener('click', function() {
        // If Street View is currently showing, clicking again exits it.
        if (streetViewActive) {
          if (panorama) panorama.setVisible(false);
          streetViewActive = false;
          streetViewPickMode = false;
          clearStreetViewPin();
          setStreetViewBtnOn(false);
          syncMarkersForStreetView();
          return;
        }

        // Toggle pick mode (tap icon then tap a street)
        streetViewPickMode = !streetViewPickMode;
        setStreetViewBtnOn(streetViewPickMode);
      });

      // When pick mode is enabled, the next map click opens Street View.
      map.addListener('click', function(e) {
        if (!streetViewPickMode) return;
        if (!e || !e.latLng) return;
        openStreetViewAt(e.latLng);
      });

      function updateMarker(position) {
        const userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        const accuracyMeters = Number(position.coords.accuracy) || 0;
        const headingDegrees = typeof position.coords.heading === 'number' ? position.coords.heading : null;
        lastUserLocation = userLocation;

        if (userMarker) {
          userMarker.setPosition(userLocation);
        } else {
          userMarker = new google.maps.Marker({
            position: userLocation,
            map: map,
            title: 'Current Location',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 5,
              fillColor: '#1a73e8',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2
            }
          });
        }

        // Soft halo behind the dot (pixel-based)
        if (haloMarker) {
          haloMarker.setPosition(userLocation);
        } else {
          haloMarker = new google.maps.Marker({
            position: userLocation,
            map: map,
            clickable: false,
            zIndex: 1,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#1a73e8',
              fillOpacity: 0.22,
              strokeWeight: 0
            }
          });
        }

        if (accuracyCircle) {
          accuracyCircle.setCenter(userLocation);
          if (accuracyMeters > 0) {
            const displayRadius = Math.max(8, Math.min(accuracyMeters, 35));
            accuracyCircle.setRadius(displayRadius);
          }
        } else {
          accuracyCircle = new google.maps.Circle({
            map,
            center: userLocation,
            radius: accuracyMeters > 0 ? Math.max(8, Math.min(accuracyMeters, 35)) : 0,
            strokeColor: '#1a73e8',
            strokeOpacity: 0.22,
            strokeWeight: 1,
            fillColor: '#1a73e8',
            fillOpacity: 0.10,
            clickable: false
          });
        }

        // Forward direction cone (Google Maps-style) when heading is available
        if (headingDegrees !== null && !Number.isNaN(headingDegrees)) {
          const R = 6378137; // meters
          const toRad = (deg) => deg * Math.PI / 180;
          const toDeg = (rad) => rad * 180 / Math.PI;
          const offset = (origin, distanceMeters, bearingDegrees) => {
            const bearing = toRad(bearingDegrees);
            const lat1 = toRad(origin.lat);
            const lng1 = toRad(origin.lng);
            const dr = distanceMeters / R;

            const lat2 = Math.asin(Math.sin(lat1) * Math.cos(dr) + Math.cos(lat1) * Math.sin(dr) * Math.cos(bearing));
            const lng2 = lng1 + Math.atan2(
              Math.sin(bearing) * Math.sin(dr) * Math.cos(lat1),
              Math.cos(dr) - Math.sin(lat1) * Math.sin(lat2)
            );
            return { lat: toDeg(lat2), lng: toDeg(lng2) };
          };

          const coneLength = 55;
          const coneWidthDeg = 18;
          const left = offset(userLocation, coneLength, headingDegrees - coneWidthDeg);
          const right = offset(userLocation, coneLength, headingDegrees + coneWidthDeg);

          const path = [userLocation, left, right];
          if (directionCone) {
            directionCone.setPath(path);
          } else {
            directionCone = new google.maps.Polygon({
              map,
              paths: path,
              strokeColor: '#1a73e8',
              strokeOpacity: 0.10,
              strokeWeight: 1,
              fillColor: '#1a73e8',
              fillOpacity: 0.18,
              clickable: false,
              zIndex: 2
            });
          }
        } else if (directionCone) {
          directionCone.setMap(null);
          directionCone = null;
        }

        if (isInitialLoad) {
          map.setCenter(userLocation);
          map.setZoom(16);
          isInitialLoad = false;
        }

        if (followUser) {
          map.panTo(userLocation);
        }
      }

      if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
          updateMarker,
          function(error) { console.log('Geolocation error: ' + error.message); },
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
        );
      }
    </script>
  </body>
</html>
`;

function MapEmbed({
  heightClassName,
  sites,
  onlineUsers,
  onlineUserHistory,
}: {
  heightClassName: string;
  sites: Site[];
  onlineUsers: User[];
  onlineUserHistory: OnlineUserHistoryRow[];
}) {
  const iframeRef = React.useRef<any>(null);
  const webViewRef = React.useRef<any>(null);
  const [ready, setReady] = React.useState(false);

  // Build initial HTML once for the iframe so we don't reload it when onlineUsers change.
  const initialHtmlRef = React.useRef(buildLiveLocationMapHtml(sites, [], []));

  React.useEffect(() => {
    if (!ready) return;

    const usersPayload = JSON.stringify({ type: 'ONLINE_USERS_UPDATE', users: onlineUsers ?? [] });
    const historyPayload = JSON.stringify({ type: 'ONLINE_USER_HISTORY_UPDATE', rows: onlineUserHistory ?? [] });
    const sitesPayload = JSON.stringify({ type: 'ONLINE_SITES_UPDATE', sites: sites ?? [] });

    if (Platform.OS === 'web') {
      const win = iframeRef.current?.contentWindow;
      if (win) {
        // Post sites first (in case map needs to render site markers)
        win.postMessage(sitesPayload, '*');
        win.postMessage(usersPayload, '*');
        win.postMessage(historyPayload, '*');
      }
    } else {
      if (webViewRef.current?.postMessage) {
        webViewRef.current.postMessage(usersPayload);
        webViewRef.current.postMessage(historyPayload);
      }
    }
  }, [ready, onlineUsers, onlineUserHistory, sites]);

  if (Platform.OS === 'web') {
    return (
      <View className={`bg-stone-100 rounded-xl overflow-hidden ${heightClassName}`}>
        {React.createElement('iframe', {
          ref: iframeRef,
          srcDoc: initialHtmlRef.current,
          allow: 'geolocation *; fullscreen *',
          allowFullScreen: true,
          onLoad: () => setReady(true),
          style: {
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
          },
          sandbox: 'allow-same-origin allow-scripts allow-popups allow-presentation',
        } as any)}
      </View>
    );
  }

  return (
    <View className={`bg-stone-100 rounded-xl overflow-hidden ${heightClassName}`}>
      {WebView ? (
        <WebView
          ref={webViewRef}
          source={{ html: buildLiveLocationMapHtml(sites, onlineUsers, onlineUserHistory) }}
          style={{ flex: 1 }}
          geolocationEnabled
          onLoadEnd={() => setReady(true)}
        />
      ) : (
        <View className="items-center justify-center flex-1">
          <Ionicons name="map-outline" size={48} color="#a8a29e" />
          <Text className="mt-2 text-stone-400">Map not available</Text>
        </View>
      )}
    </View>
  );
}

function LiveLocationMap({
  heightClassName,
  sites,
  onlineUsers,
  onlineUserHistory,
}: {
  heightClassName: string;
  sites: Site[];
  onlineUsers: User[];
  onlineUserHistory: OnlineUserHistoryRow[];
}) {
  return (
    <MapEmbed
      heightClassName={heightClassName}
      sites={sites}
      onlineUsers={onlineUsers}
      onlineUserHistory={onlineUserHistory}
    />
  );
}

interface AdminDashboardProps {
  onLogout: () => void;
  onNavigate?: (page: string) => void;
}

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface Site {
  id: string;
  name: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  latitude?: number | null;
  longitude?: number | null;
  company_id?: number | null;
  branch_id?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  date_accomplished?: string | null;
  members_count?: number | null;
  // Backward compatibility (older UI fields)
  location?: string;
}

interface Activity {
  id: number;
  user_name: string;
  initials?: string | null;
  action: string;
  description?: string | null;
  location?: string | null;
  time?: string | null;
  type?: string | null;
  color?: string | null;
  icon?: string | null;
}

export default function AdminDashboard({ onLogout, onNavigate }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings'>('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [onlineUserHistoryRows, setOnlineUserHistoryRows] = useState<OnlineUserHistoryRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const colors = {
    green: '#237227',
    greenLight: '#237227',
    greenPale: '#e8f5e9',
    cloudMist: '#f8fafb',
    white: '#ffffff',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    border: '#e2e8f0',
    black: '#000000',
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data?.session?.user?.id ?? null);
    });
  }, []);

  const normalizePresenceStatus = React.useCallback((raw: unknown) => {
    const s = String(raw || '').toLowerCase();
    if (s === 'lost connection' || s === 'lost_connection') return 'lost_connection';
    if (s === 'online') return 'online';
    if (s === 'busy') return 'busy';
    if (s === 'offline') return 'offline';
    return s || 'offline';
  }, []);

  const windowWidth = Dimensions.get('window').width;
  const isWebView = windowWidth > 900;

  const onlineUsersForMap = React.useMemo(
    () =>
      users.filter(
        u =>
          u && u.role !== 'admin' &&
          (currentUserId === null || u.id !== currentUserId) &&
          (normalizePresenceStatus(u.status) === 'online' || normalizePresenceStatus(u.status) === 'lost_connection') &&
          u.latitude !== null && u.latitude !== undefined &&
          u.longitude !== null && u.longitude !== undefined &&
          !Number.isNaN(Number(u.latitude)) && !Number.isNaN(Number(u.longitude))
      ).map(u => ({
        ...u,
        status: normalizePresenceStatus(u.status),
        latitude: Number(u.latitude),
        longitude: Number(u.longitude),
      })),
    [users, normalizePresenceStatus]
  );

  const onlineUserIdsForMap = React.useMemo(() => {
    const ids = onlineUsersForMap.map(u => u.id).filter(Boolean);
    ids.sort();
    return ids;
  }, [onlineUsersForMap]);

  const onlineUserIdsKey = React.useMemo(() => onlineUserIdsForMap.join('|'), [onlineUserIdsForMap]);

  // Load recent movement history for currently-online users
  useEffect(() => {
    const run = async () => {
      if (!onlineUserIdsForMap.length) {
        setOnlineUserHistoryRows([]);
        return;
      }

      // Pull recent history rows for these users; cap to keep it fast.
      const limit = Math.min(6000, onlineUserIdsForMap.length * 300);
      const { data, error } = await supabase
        .from('user_location_history')
        .select('user_id, latitude, longitude, recorded_at')
        .in('user_id', onlineUserIdsForMap)
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching user location history:', error);
        return;
      }

      const rows = (data ?? []) as OnlineUserHistoryRow[];
      // Sort ascending for correct path direction, then cap per user
      rows.sort((a, b) => {
        const at = a.recorded_at ? Date.parse(a.recorded_at) : 0;
        const bt = b.recorded_at ? Date.parse(b.recorded_at) : 0;
        return at - bt;
      });

      const byUser: Record<string, OnlineUserHistoryRow[]> = {};
      for (const r of rows) {
        const id = String(r.user_id);
        if (!byUser[id]) byUser[id] = [];
        byUser[id].push(r);
      }
      const flattened: OnlineUserHistoryRow[] = [];
      for (const id of Object.keys(byUser)) {
        const pts = byUser[id];
        const capped = pts.length > 300 ? pts.slice(pts.length - 300) : pts;
        flattened.push(...capped);
      }
      setOnlineUserHistoryRows(flattened);
    };

    run();
  }, [onlineUserIdsKey, onlineUserIdsForMap]);

  // Live append history points when movement is recorded
  useEffect(() => {
    const channel = supabase
      .channel('admin_user_location_history_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_location_history' },
        payload => {
          const eventType = (payload as any).eventType as string | undefined;
          const newRow = (payload as any).new as OnlineUserHistoryRow | undefined;
          if (!newRow?.user_id) return;
          if (onlineUserIdsForMap.indexOf(String(newRow.user_id)) === -1) return;

          setOnlineUserHistoryRows(prev => {
            // If rows are being UPDATED (single-row-per-user approach), replace the latest point for that user.
            // If rows are being INSERTED (true history), append.
            let next: OnlineUserHistoryRow[];
            if (eventType === 'UPDATE') {
              const userId = String(newRow.user_id);
              const filtered = prev.filter(r => String(r.user_id) !== userId);
              next = filtered.concat([newRow]);
            } else {
              next = prev.concat([newRow]);
            }
            // cap per user to 300 points
            const byUser: Record<string, OnlineUserHistoryRow[]> = {};
            for (const r of next) {
              const id = String(r.user_id);
              if (onlineUserIdsForMap.indexOf(id) === -1) continue;
              if (!byUser[id]) byUser[id] = [];
              byUser[id].push(r);
            }
            const flattened: OnlineUserHistoryRow[] = [];
            for (const id of Object.keys(byUser)) {
              const pts = byUser[id];
              const capped = pts.length > 300 ? pts.slice(pts.length - 300) : pts;
              flattened.push(...capped);
            }
            return flattened;
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [onlineUserIdsKey, onlineUserIdsForMap]);

  useEffect(() => {
    fetchData();
  }, []);

  // Live updates for online/offline + movement (users.latitude/longitude updates)
  useEffect(() => {
    const channel = supabase
      .channel('admin_users_live_locations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        payload => {
          const eventType = (payload as any).eventType;
          const newRow = (payload as any).new as any;
          const oldRow = (payload as any).old as any;
          const id = (newRow?.id || oldRow?.id) as string | undefined;
          if (!id) return;

          setUsers(prev => {
            if (eventType === 'DELETE') {
              return prev.filter(u => u.id !== id);
            }

            const nextUser: User = {
              id: newRow.id,
              email: newRow.email,
              full_name: newRow.full_name,
              role: newRow.role,
              status: newRow.status,
              latitude: newRow.latitude,
              longitude: newRow.longitude,
            };

            const idx = prev.findIndex(u => u.id === id);
            if (idx === -1) return [nextUser, ...prev];
            const copy = prev.slice();
            copy[idx] = { ...copy[idx], ...nextUser };
            return copy;
          });

          setEmployees(prev => {
            // Keep employees list in sync for existing UI
            if (eventType === 'DELETE') {
              return prev.filter(u => u.id !== id);
            }
            if (newRow?.role === 'admin') {
              return prev.filter(u => u.id !== id);
            }
            const nextUser: User = {
              id: newRow.id,
              email: newRow.email,
              full_name: newRow.full_name,
              role: newRow.role,
              status: newRow.status,
              latitude: newRow.latitude,
              longitude: newRow.longitude,
            };
            const idx = prev.findIndex(u => u.id === id);
            if (idx === -1) return [nextUser, ...prev];
            const copy = prev.slice();
            copy[idx] = { ...copy[idx], ...nextUser };
            return copy;
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Set up real-time subscription for pending users
  useEffect(() => {
    // Initial fetch of pending users count
    const fetchPendingCount = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id', { count: 'exact' })
          .eq('is_approved', false)
          .neq('role', 'admin');
        
        if (error) {
          console.error('Error fetching pending users count:', error);
        } else {
          setPendingUsersCount(data?.length || 0);
        }
      } catch (error) {
        console.error('Error in fetchPendingCount:', error);
      }
    };

    fetchPendingCount();

    // Subscribe to real-time changes on the users table
    const subscription = supabase
      .channel('pending_users')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
        },
        (payload) => {
          // Recalculate pending users count on any user table change
          fetchPendingCount();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch users
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Fetch sites
      const { data: sitesData } = await supabase
        .from('sites')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Count employees (non-admin users)
      const employeesCount = usersData?.filter(u => u.role !== 'admin').length || 0;
      const adminCount = usersData?.filter(u => u.role === 'admin').length || 0;
      const onlineCount = usersData?.filter(u => u.status === 'online').length || 0;
      const sitesCount = sitesData?.length || 0;
      
      // Set statistics
      setStats([
        { label: 'Total Employees', value: employeesCount, icon: 'people', color: '#10b981' },
        { label: 'Active Sites', value: sitesCount, icon: 'location', color: '#14b8a6' },
        { label: 'Messages Today', value: '1,847', icon: 'chatbubbles', color: '#f59e0b' },
        { label: 'Active Tracking', value: onlineCount, icon: 'map', color: '#3b82f6' },
      ]);

      if (usersData) {
        setUsers(usersData);
        setEmployees(usersData.filter(u => u.role !== 'admin'));
      }
      
      if (sitesData) {
        setSites(sitesData);
      }

      // Fetch recent activities
      const { data: logsData } = await supabase
        .from('activity_logs')
        .select('*')
        .order('time', { ascending: false })
        .limit(10);
      
      if (logsData) {
        setActivities((logsData as Activity[]) || []);
      }
    } catch (error) {
      console.error('Error fetching admin dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchData().then(() => setRefreshing(false));
  }, []);

  const StatCard = ({ item }: { item: StatCard }) => (
    <View
      className={`bg-[#e8f5e9] rounded-xl shadow-lg ${isWebView ? 'p-6' : 'p-4'}`}
    >
      <View
        className={`flex-row items-center justify-between ${isWebView ? 'mb-3' : 'mb-2'}`}
      >
        <View
          className={`bg-[#237227] items-center justify-center rounded-full ${isWebView ? 'w-[44px] h-[44px]' : 'w-10 h-10'}`}
        >
          <Ionicons name={item.icon as any} size={isWebView ? 22 : 18} color="#f8fafb" />
        </View>
      </View>
      <Text
        className={`text-[#237227] font-light mb-1 ${isWebView ? 'text-4xl' : 'text-2xl'}`}
      >
        {item.value}
      </Text>
      <Text
        className={`text-[#237227] opacity-70 font-medium tracking-[0.5px] ${isWebView ? 'text-sm' : 'text-[11px]'}`}
      >
        {item.label.toUpperCase()}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f8fafb]">
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  // Render SiteManagement if selected
  if (activeTab === 'siteManagement') {
    return (
      <View className="flex-row flex-1 bg-[#f8fafb]">
        <AdminNavbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onNavigate={onNavigate}
          onLogout={onLogout}
          pendingUsersCount={pendingUsersCount}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
        <SiteManagement
          onNavigate={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
      </View>
    );
  }

  // Render ContactManagement if selected
  if (activeTab === 'walkieTalkie') {
    return (
      <View className="flex-row flex-1 bg-[#f8fafb]">
        <AdminNavbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onNavigate={onNavigate}
          onLogout={onLogout}
          pendingUsersCount={pendingUsersCount}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
        <ContactManagement
          onNavigate={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
      </View>
    );
  }

  // Render ActivityLogs if selected
  if (activeTab === 'activityLogs') {
    return (
      <View className="flex-row flex-1 bg-[#f8fafb]">
        <AdminNavbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onNavigate={onNavigate}
          onLogout={onLogout}
          pendingUsersCount={pendingUsersCount}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
        <ActivityLogs
          onNavigate={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
      </View>
    );
  }

  // Render CompanyList if selected
  if (activeTab === 'companyList') {
    return (
      <View className="flex-row flex-1 bg-[#f8fafb]">
        <AdminNavbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onNavigate={onNavigate}
          onLogout={onLogout}
          pendingUsersCount={pendingUsersCount}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
        <CompanyList
          onNavigate={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
      </View>
    );
  }

  // Render Employees if selected
  if (activeTab === 'employee') {
    return (
      <View className="flex-row flex-1 bg-[#f8fafb]">
        <AdminNavbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onNavigate={onNavigate}
          onLogout={onLogout}
          pendingUsersCount={pendingUsersCount}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
        <Employees
          onNavigate={setActiveTab}
          pendingUsersCount={pendingUsersCount}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
      </View>
    );
  }

  // Render Settings if selected
  if (activeTab === 'settings') {
    return (
      <View className="flex-row flex-1 bg-[#f8fafb]">
        <AdminNavbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onNavigate={onNavigate}
          onLogout={onLogout}
          pendingUsersCount={pendingUsersCount}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
        <Settings
          onNavigate={setActiveTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
      </View>
    );
  }

  return (
    <View className="flex-row flex-1 bg-[#f8fafb]">
      <AdminNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNavigate={onNavigate}
        onLogout={onLogout}
        pendingUsersCount={pendingUsersCount}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <ScrollView
        className="flex-1 bg-[#f8fafb]"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
      >
        {/* Header - Minimalist */}
        <View
          className={`bg-[#f8fafb] border-b border-slate-200 ${isWebView ? 'px-6 pt-8 pb-6' : 'px-4 pt-4 pb-4'}`}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              {!isWebView && (
                <TouchableOpacity
                  onPress={() => setIsMobileMenuOpen(true)}
                  className="items-center justify-center w-10 h-10 mr-3"
                >
                  <Ionicons name="menu" size={28} color={colors.green} />
                </TouchableOpacity>
              )}
              <View className="flex-1">
                <Text
                  className="mb-1 text-xl font-light text-black lg:text-3xl"
                >
                  Dashboard
                </Text>
                <Text
                  className="text-xs text-black lg:text-base"
                >
                  Welcome back, Administrator
                </Text>
              </View>
            </View>
            <View className={`flex-row items-center ${isWebView ? 'space-x-3' : 'space-x-2'}`}>
              <TouchableOpacity
                className="relative items-center justify-center w-10 h-10 rounded-full bg-[#f8fafb]"
              >
                <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
                <View
                  className="absolute w-2 h-2 rounded-full top-2 right-2 bg-[#237227]"
                />
              </TouchableOpacity>
              <View
                className="items-center justify-center w-10 h-10 rounded-full bg-[#237227]"
              >
                <Text className="text-sm font-medium text-[#f8fafb]">AD</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Grid - Clean spacing */}
        <View className={isWebView ? 'px-6 py-8' : 'px-4 py-5'}>
          <View className={`flex-row flex-wrap ${isWebView ? '-mx-2' : '-mx-[6px]'}`}>
            {stats.map((stat, index) => (
              <View
                key={index}
                className={`${isWebView ? 'w-1/4 px-2 mb-4' : 'w-1/2 px-[6px] mb-3'}`}
              >
                <StatCard item={stat} />
              </View>
            ))}
          </View>
        </View>

        <View className={isWebView ? 'px-6 pb-8 flex-row' : 'px-4 pb-5 flex-col'}>
          {/* Left Column */}
          <View className={`flex-1 ${isWebView ? 'mb-0 mr-6' : 'mb-4 mr-0'}`}>
            {/* Communication Activity */}
            <View
              className={`bg-white rounded-xl shadow-sm ${isWebView ? 'p-7 mb-6' : 'p-4 mb-4'}`}
            >
              <View
                className={`flex-row items-center justify-between ${isWebView ? 'mb-6' : 'mb-4'}`}
              >
                <Text
                  className={`text-slate-800 font-light ${isWebView ? 'text-xl' : 'text-base'}`}
                >
                  Communication Activity
                </Text>
                <TouchableOpacity
                  className={`flex-row items-center rounded-lg bg-[#f8fafb] ${isWebView ? 'px-3 py-2' : 'px-2 py-1.5'}`}
                >
                  <Text className="mr-1 text-xs text-slate-500">7 Days</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View
                className="flex-row items-end space-x-2 h-44"
              >
                {[45, 60, 75, 55, 85, 95, 70].map((h, i) => (
                  <View
                    key={i}
                    className={`flex-1 rounded-t ${i === 5 ? 'bg-[#237227]' : 'bg-[#e8f5e9]'}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </View>
              <View className="flex-row justify-between mt-3">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <Text
                    key={i}
                    className="flex-1 text-xs text-center text-slate-400"
                  >
                    {day}
                  </Text>
                ))}
              </View>
            </View>

            {/* Live Location Map */}
            <View
              className={`bg-white rounded-xl shadow-sm ${isWebView ? 'p-7' : 'p-4'}`}
            >
              <Text
                className={`text-slate-800 font-light ${isWebView ? 'text-xl mb-5' : 'text-base mb-4'}`}
              >
                Live Location Tracking
              </Text>
              <LiveLocationMap
                heightClassName={isWebView ? 'h-64' : 'h-48'}
                sites={sites}
                onlineUsers={onlineUsersForMap}
                onlineUserHistory={onlineUserHistoryRows}
              />
            </View>
          </View>

          {/* Right Column - Recent Activity */}
          <View className={`${isWebView ? 'w-96 mt-0' : 'w-full mt-4'}`}>
            <View
              className={`bg-white rounded-xl shadow-sm ${isWebView ? 'p-7' : 'p-4'}`}
            >
              <Text
                className={`text-slate-800 font-light ${isWebView ? 'text-xl mb-5' : 'text-base mb-4'}`}
              >
                Recent Activity
              </Text>
              {activities.length === 0 ? (
                <Text className="text-sm text-slate-500">No activities yet.</Text>
              ) : (
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  persistentScrollbar
                  className={isWebView ? 'max-h-[420px]' : 'max-h-80'}
                >
                  {activities.map((activity, idx) => (
                    <View
                      key={activity.id}
                      className={`flex-row items-start ${
                        idx !== activities.length - 1
                          ? isWebView
                            ? 'mb-5 pb-5 border-b border-slate-200'
                            : 'mb-4 pb-4 border-b border-slate-200'
                          : ''
                      }`}
                    >
                      <View
                        className="items-center justify-center w-10 h-10 mr-4 rounded-full bg-[#237227]"
                      >
                        <Ionicons name={(activity.icon || 'notifications-outline') as any} size={18} color={colors.cloudMist} />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="mb-1 text-sm font-medium text-slate-800"
                        >
                          {activity.action}
                        </Text>
                        {activity.description ? (
                          <Text className="text-xs text-slate-500">
                            {activity.description}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}