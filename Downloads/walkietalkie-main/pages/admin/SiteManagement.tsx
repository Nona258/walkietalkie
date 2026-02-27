import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SweetAlertModal from '../../components/SweetAlertModal';
import '../../global.css';
import supabase from '../../utils/supabase';

interface Site {
  id: string;
  name: string;
  company_id?: string; // foreign key to company
  company?: string; // optional company name (used when attaching display data)
  branch_id?: string;
  start_time?: string;
  end_time?: string;
  date_accomplished?: string;
  members_count?: number;
  // Removed members property
  status: string;
  latitude?: number;
  longitude?: number;
}

interface SiteManagementProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}

interface ValidationErrors {
  siteName?: string;
  company?: string;
  branch_id?: string;
  location?: string;
  membersCount?: string;
}

export default function SiteManagement({ onNavigate }: SiteManagementProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewLocationOpen, setIsViewLocationOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
  });
  
  // Helper function to show alert
  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };
  // Card gradient presets for mobile card styling
  // Use a single green gradient for all cards
  const CARD_GRADIENTS = [
    ['#059669', '#10b981'], // emerald dark -> emerald light
  ];
  
  // Form state
  const [siteName, setSiteName] = useState('');
  const [company, setCompany] = useState(''); // stores company id
    const [branch_id, setBranchId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [dateAccomplished, setDateAccomplished] = useState('');
  const [membersCount, setMembersCount] = useState('');
  // Removed members state
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  // Track what last changed the location/name to avoid overwriting user edits
  const [lastUpdateSource, setLastUpdateSource] = useState<'map' | 'places' | 'user' | null>(null);
  // Branch dropdown state
  const [branchOptions, setBranchOptions] = useState<{id: string, name: string, company_id?: string}[]>([]);

  // Company dropdown state
  const [companyOptions, setCompanyOptions] = useState<{id: string, name: string, industry: string}[]>([]);

  // Fetch companies for dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      const { data, error } = await supabase
        .from('company')
        .select('id, company_name, industry_or_sectors');
      if (!error && data) {
        setCompanyOptions(
          data.map((c: any) => ({
            id: c.id,
            name: c.company_name,
            industry: c.industry_or_sectors || '',
          }))
        );
      }
    };
    fetchCompanies();
  }, []);

  // Fetch all branches for table display
  useEffect(() => {
    const fetchBranches = async () => {
      const { data, error } = await supabase
        .from('branch')
        .select('id, branch_name, company_id');
      if (!error && data) {
        setBranchOptions(
          data.map((b: any) => ({
            id: b.id,
            name: b.branch_name,
            company_id: b.company_id,
          }))
        );
      } else {
        setBranchOptions([]);
      }
    };
    fetchBranches();
  }, []);
  
  // Validation state
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Map state
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const viewMapRef = useRef<any>(null);
  const viewMarkerRef = useRef<any>(null);
  const viewTrafficRef = useRef<any>(null);
  const viewTransitRef = useRef<any>(null);
  const viewBikeRef = useRef<any>(null);
  const viewStreetRef = useRef<any>(null);
  const editMapRef = useRef<any>(null);
  const editMarkerRef = useRef<any>(null);
  const [showMapControls, setShowMapControls] = useState(false);

  // Fetch sites from Supabase
  const fetchSites = async () => {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showAlert('Error fetching sites', error.message, 'error');
    } else {
      setSites(data || []);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  // Initialize Google Maps when add modal opens (replaces Leaflet)
  useEffect(() => {
    if (isAddModalOpen && typeof window !== 'undefined') {
      const API_KEY = 'AIzaSyAq58TD9PputxnK8ZO9jRUX8KW7bTuPTPQ';

      const loadGoogleMaps = () => {
        if ((window as any).google && (window as any).google.maps) {
          initMap();
          return;
        }

        const scriptId = 'gmaps-script';
        if (document.getElementById(scriptId)) {
          const check = setInterval(() => {
            if ((window as any).google && (window as any).google.maps) {
              clearInterval(check);
              initMap();
            }
          }, 100);
          return;
        }

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => initMap();
        document.head.appendChild(script);
      };

      const initMap = () => {
        const g = (window as any).google;
        if (!g || !g.maps || mapRef.current) return;

        const iliganLat = 8.2280;
        const iliganLng = 124.2452;

        const mapEl = document.getElementById('leaflet-map');
        if (!mapEl) return;

        const map = new g.maps.Map(mapEl, {
          center: { lat: iliganLat, lng: iliganLng },
          zoom: 13,
          mapTypeControl: false,
          zoomControl: true,
        });

        const marker = new g.maps.Marker({
          position: { lat: iliganLat, lng: iliganLng },
          map,
          draggable: true,
        });

        setLatitude(iliganLat);
        setLongitude(iliganLng);

        marker.addListener('dragend', (e: any) => {
          const pos = e.latLng;
          setLatitude(pos.lat());
          setLongitude(pos.lng());
          setLastUpdateSource('map');
        });

        map.addListener('click', (e: any) => {
          const pos = e.latLng;
          marker.setPosition(pos);
          setLatitude(pos.lat());
          setLongitude(pos.lng());
          setLastUpdateSource('map');
        });

        // Use default Google controls for Add map (advanced controls available only in full-screen view)

        mapRef.current = map;
        markerRef.current = marker;
      };

      loadGoogleMaps();
    }

    // Cleanup when modal closes
    return () => {
      if (markerRef.current) {
        try { markerRef.current.setMap(null); } catch (e) {}
        markerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current = null;
      }
    };
  }, [isAddModalOpen]);

  // Attach Google Places Autocomplete to Site Name input when Add modal opens
  useEffect(() => {
    if (!isAddModalOpen || typeof window === 'undefined') return;
    const g = (window as any).google;
    if (!g || !g.maps || !g.maps.places) return;

    const input = document.getElementById('site-name-input');
    if (!input) return;

    const autocomplete = new g.maps.places.Autocomplete(input, { types: ['geocode', 'establishment'] });
    const listener = () => {
      const place = autocomplete.getPlace();
      if (!place) return;
      if (place.formatted_address || place.name) {
        const name = place.formatted_address || place.name || '';
        setSiteName(name);
      }
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setLatitude(lat);
        setLongitude(lng);
        setLastUpdateSource('places');
        // move marker and center map if available
        try {
          if (markerRef.current && markerRef.current.setPosition) {
            markerRef.current.setPosition({ lat, lng });
          }
          if (mapRef.current && mapRef.current.setCenter) {
            mapRef.current.setCenter({ lat, lng });
          }
        } catch (e) {}
      }
    };

    autocomplete.addListener('place_changed', listener);

    return () => {
      try { g.maps.event.clearInstanceListeners(autocomplete); } catch {}
    };
  }, [isAddModalOpen]);

  // Initialize edit map using Google Maps
  useEffect(() => {
    if (isEditModalOpen && selectedSite && typeof window !== 'undefined') {
      const initEditMap = () => {
        const g = (window as any).google;
        if (!g || !g.maps || editMapRef.current) return;

        const lat = selectedSite.latitude || 8.2280;
        const lng = selectedSite.longitude || 124.2452;

        const mapEl = document.getElementById('edit-leaflet-map');
        if (!mapEl) return;

        const map = new g.maps.Map(mapEl, {
          center: { lat, lng },
          zoom: 13,
          mapTypeControl: false,
          zoomControl: true,
        });

        const marker = new g.maps.Marker({
          position: { lat, lng },
          map,
          draggable: true,
        });

        marker.addListener('dragend', (e: any) => {
          const pos = e.latLng;
          setLatitude(pos.lat());
          setLongitude(pos.lng());
          setLastUpdateSource('map');
        });

        map.addListener('click', (e: any) => {
          const pos = e.latLng;
          marker.setPosition(pos);
          setLatitude(pos.lat());
          setLongitude(pos.lng());
          setLastUpdateSource('map');
        });

        // Use default Google controls for Edit map (advanced controls available only in full-screen view)

        editMapRef.current = map;
        editMarkerRef.current = marker;
      };

      if ((window as any).google && (window as any).google.maps) {
        setTimeout(initEditMap, 100);
      } else {
        const check = setInterval(() => {
          if ((window as any).google && (window as any).google.maps) {
            clearInterval(check);
            initEditMap();
          }
        }, 100);
      }
    }

    return () => {
      if (editMarkerRef.current) {
        try { editMarkerRef.current.setMap(null); } catch { }
        editMarkerRef.current = null;
      }
      if (editMapRef.current) {
        editMapRef.current = null;
      }
    };
  }, [isEditModalOpen, selectedSite]);

  // Attach Google Places Autocomplete to Site Name input in Edit modal
  useEffect(() => {
    if (!isEditModalOpen || typeof window === 'undefined') return;
    const g = (window as any).google;
    if (!g || !g.maps || !g.maps.places) return;

    const input = document.getElementById('edit-site-name-input');
    if (!input) return;

    const autocomplete = new g.maps.places.Autocomplete(input, { types: ['geocode', 'establishment'] });
    const listener = () => {
      const place = autocomplete.getPlace();
      if (!place) return;
      if (place.formatted_address || place.name) {
        const name = place.formatted_address || place.name || '';
        setSiteName(name);
      }
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setLatitude(lat);
        setLongitude(lng);
        setLastUpdateSource('places');
        try {
          if (editMarkerRef.current && editMarkerRef.current.setPosition) {
            editMarkerRef.current.setPosition({ lat, lng });
          }
          if (editMapRef.current && editMapRef.current.setCenter) {
            editMapRef.current.setCenter({ lat, lng });
          }
        } catch (e) {}
      }
    };

    autocomplete.addListener('place_changed', listener);

    return () => {
      try { g.maps.event.clearInstanceListeners(autocomplete); } catch {}
    };
  }, [isEditModalOpen]);

  // Initialize view location map using Google Maps
  useEffect(() => {
    if (isViewLocationOpen && selectedSite && typeof window !== 'undefined') {
      const initViewMap = () => {
        const g = (window as any).google;
        if (!g || !g.maps || viewMapRef.current) return;

        const lat = selectedSite.latitude || 8.2280;
        const lng = selectedSite.longitude || 124.2452;

        const mapEl = document.getElementById('view-leaflet-map');
        if (!mapEl) return;

        const map = new g.maps.Map(mapEl, {
          center: { lat, lng },
          zoom: 15,
          mapTypeControl: false,
          zoomControl: false,
          fullscreenControl: true, // allow built-in fullscreen
        });

        const marker = new g.maps.Marker({
          position: { lat, lng },
          map,
          draggable: false,
        });

        const companyName = companyOptions.find(opt => String(opt.id) === String(selectedSite.company_id))?.name || 'No company selected';
        const branchName = branchOptions.find(opt => opt.id === selectedSite.branch_id)?.name || 'No branch selected';

        const infoContent = `
          <div style="font-family: sans-serif;">
            <strong style="font-size: 14px;">${selectedSite.name}</strong><br/>
            <span style="font-size: 12px; color: #666;">${companyName}</span><br/>
            <span style="font-size: 12px; color: #666;">${branchName}</span>
          </div>
        `;

        const infoWindow = new g.maps.InfoWindow({ content: infoContent });
        infoWindow.open(map, marker);

        viewMapRef.current = map;
        viewMarkerRef.current = marker;
        // Create layers and store refs; controls are shown via React toggle button
        try {
          viewTrafficRef.current = new g.maps.TrafficLayer();
          viewTransitRef.current = new g.maps.TransitLayer();
          viewBikeRef.current = new g.maps.BicyclingLayer();
          viewStreetRef.current = map.getStreetView();
        } catch (e) {}
      };

      if ((window as any).google && (window as any).google.maps) {
        setTimeout(initViewMap, 100);
      } else {
        const check = setInterval(() => {
          if ((window as any).google && (window as any).google.maps) {
            clearInterval(check);
            initViewMap();
          }
        }, 100);
      }
    }

    return () => {
      if (viewMarkerRef.current) {
        try { viewMarkerRef.current.setMap(null); } catch { }
        viewMarkerRef.current = null;
      }
      if (viewMapRef.current) {
        viewMapRef.current = null;
      }
    };
  }, [isViewLocationOpen, selectedSite, branchOptions, companyOptions]);

  // Validation functions
  const validateField = (fieldName: string, value: string): string | undefined => {
    switch (fieldName) {
      case 'siteName':
        // Site name validation removed per request (allow any value)
        return undefined;

      case 'company':
        // No validation for company name
        return undefined;

      case 'branch':
          // No validation for branch/department
          return undefined;

      case 'membersCount':
        if (value && value.trim() !== '') {
          const num = parseInt(value);
          if (isNaN(num)) {
            return 'Number of employees must be a valid number';
          }
          if (num < 0) {
            return 'Number of employees cannot be negative';
          }
          if (num > 10000) {
            return 'Number of employees seems too large';
          }
        }
        return undefined;

      default:
        return undefined;
    }
  };

  const validateForm = (requireMembers: boolean = false): boolean => {
    const newErrors: ValidationErrors = {
      siteName: validateField('siteName', siteName),
      company: validateField('company', company),
      branch_id: validateField('branch_id', branch_id),
      membersCount: validateField('membersCount', membersCount),
    };

    // Require membersCount when creating a new site
    if (requireMembers) {
      if (!membersCount || membersCount.trim() === '') {
        newErrors.membersCount = 'Please specify number of employees to deploy';
      }
    }

    // Validate location
    if (latitude === null || longitude === null) {
      newErrors.location = 'Please select a location on the map';
    }

    setErrors(newErrors);
    
    // Mark all fields as touched
    setTouched({
      siteName: true,
      company: true,
      branch_id: true,
      membersCount: true,
      location: true,
    });

    // Return true if no errors
    return !Object.keys(newErrors).some((key: string) => (newErrors as any)[key] !== undefined);
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    // Update the field value
    switch (fieldName) {
      case 'siteName':
        setSiteName(value);
        setLastUpdateSource('user');
        break;
      case 'company':
        setCompany(value);
        // Remove error if valid option selected
        if (value && companyOptions.some(opt => String(opt.id) === String(value))) {
          setErrors(prev => ({ ...prev, company: undefined }));
        }
        break;
      case 'branch_id':
        setBranchId(value);
        break;
      case 'startTime':
        setStartTime(value);
        break;
      case 'endTime':
        setEndTime(value);
        break;
      case 'dateAccomplished':
        setDateAccomplished(value);
        break;
      case 'membersCount':
        setMembersCount(value);
        break;
      // Removed members field change
    }

    // Validate the field if it's been touched
    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  };
  // Auto-fill site name with reverse-geocoded place (falls back to coordinates)
  useEffect(() => {
    const fillNameWithPlace = async () => {
      if (latitude === null || longitude === null) return;

      // Only auto-fill if the last action was a map change, or if siteName is empty
      if (!(lastUpdateSource === 'map' || !siteName || siteName.trim() === '')) return;

      const g = (window as any).google;

      if (g && g.maps && g.maps.Geocoder) {
        try {
          const geocoder = new g.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results: any, status: string) => {
            if (status === 'OK' && results && results[0]) {
              const placeName = results[0].formatted_address || results[0].name || '';
              const finalName = placeName ? placeName : 'Site';
              setSiteName(finalName);
              setLastUpdateSource(null);
            } else {
              setSiteName('Site');
              setLastUpdateSource(null);
            }
          });
        } catch (e) {
          setSiteName('Site');
          setLastUpdateSource(null);
        }
      } else {
        // If google maps not loaded yet, fall back to a generic label
        setSiteName('Site');
        setLastUpdateSource(null);
      }
    };

    fillNameWithPlace();
  }, [latitude, longitude, siteName, lastUpdateSource]);

  const handleFieldBlur = (fieldName: string, value: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    const error = validateField(fieldName, value);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const resetForm = () => {
    setSiteName('');
    setCompany('');
    setBranchId('');
    setStartTime('');
    setEndTime('');
    setDateAccomplished('');
    setMembersCount('');
    // Removed members reset
    setLatitude(null);
    setLongitude(null);
    setLastUpdateSource(null);
    setErrors({});
    setTouched({});
    setSelectedSite(null);
  };

  // Ensure site name fits DB varchar(50): truncate and add ellipsis if needed
  const sanitizeSiteName = (name: string) => {
    const trimmed = name.trim();
    if (trimmed.length <= 50) return trimmed;
    return `${trimmed.slice(0, 47)}...`;
  };

  // Format a geocoder result into a detailed, human-friendly string
  const formatGeocoderResult = (result: any, allResults: any[]): string => {
    if (!result) return '';

    // Try to get an establishment-like result if available
    let establishment = '';
    for (const r of allResults || []) {
      if (r.types && (r.types.includes('establishment') || r.types.includes('point_of_interest') || r.types.includes('premise'))) {
        establishment = r.formatted_address || '';
        break;
      }
    }

    const comp = (type: string) => {
      const c = (result.address_components || []).find((ac: any) => ac.types && ac.types.includes(type));
      return c ? c.long_name : '';
    };

    const streetNumber = comp('street_number');
    const route = comp('route');
    const street = [streetNumber, route].filter(Boolean).join(' ').trim();
    const sublocality = comp('sublocality_level_1') || comp('neighborhood') || comp('sublocality') || '';
    const locality = comp('locality') || comp('administrative_area_level_2') || '';
    const region = comp('administrative_area_level_1') || '';
    const postal = comp('postal_code') || '';

    const addressParts = [] as string[];
    if (street) addressParts.push(street);
    if (sublocality) addressParts.push(sublocality);
    if (locality) addressParts.push(locality);
    if (region) addressParts.push(region + (postal ? ` ${postal}` : ''));

    const address = addressParts.join(', ');

    if (establishment) {
      return `${establishment}${address ? ' — ' + address : ''}`;
    }

    // Prefer formatted_address if it looks complete
    if (result.formatted_address) return result.formatted_address;

    return address || 'Site';
  };

  const handleAddSite = async () => {
    if (!validateForm(true)) {
      showAlert('Validation Error', 'Please fix the errors before submitting', 'error');
      return;
    }

    const safeName = sanitizeSiteName(siteName);

    const { error } = await supabase
      .from('sites')
      .insert([
        {
          name: safeName,
          company_id: company || null,
          branch_id: branch_id || null,
          start_time: startTime || null,
          end_time: endTime || null,
          date_accomplished: dateAccomplished || null,
          members_count: membersCount ? parseInt(membersCount) : null,
          status: 'Active',
          latitude: latitude,
          longitude: longitude,
        },
      ]);
    if (error) {
      showAlert('Error', error.message, 'error');
    } else {
      // Insert activity log
      await supabase.from('activity_logs').insert([
        {
          user_name: 'Admin User', // Replace with actual user if available
          initials: 'AD',
          action: `Added New Site: ${safeName}`,
          description: 'New site location has been added to the system',
          location: 'System',
          type: 'system',
          color: '#d1fae5',
          icon: 'add-circle-outline',
        },
      ]);
      showAlert('Success!', `${safeName} has been added successfully`, 'success');
      resetForm();
      setIsAddModalOpen(false);
      fetchSites();
    }
  };

  const handleEditSite = (site: Site) => {
    setSelectedSite(site);
    setSiteName(site.name);
    setCompany((site as any).company_id ? String((site as any).company_id) : '');
    setBranchId(site.branch_id ? String(site.branch_id) : '');
    setStartTime((site as any).start_time || '');
    setEndTime((site as any).end_time || '');
    setDateAccomplished((site as any).date_accomplished || '');
    setMembersCount(site.members_count ? String(site.members_count) : '');
    setLatitude(site.latitude || null);
    setLongitude(site.longitude || null);
    setIsEditModalOpen(true);
  };

  const handleUpdateSite = async () => {
    if (!selectedSite) {
      showAlert('Error', 'No site selected', 'error');
      return;
    }

    if (!validateForm()) {
      showAlert('Validation Error', 'Please fix the errors before submitting', 'error');
      return;
    }

    const safeName = sanitizeSiteName(siteName);

    const { error } = await supabase
      .from('sites')
      .update({
        name: safeName,
        company_id: company || null,
        branch_id: branch_id || null,
        start_time: startTime || null,
        end_time: endTime || null,
        date_accomplished: dateAccomplished || null,
        members_count: membersCount ? parseInt(membersCount) : null,
        latitude: latitude,
        longitude: longitude,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedSite.id)
      .select();

    if (error) {
      showAlert('Update Error', error.message, 'error');
    } else {
      showAlert('Updated!', `${safeName} has been updated successfully`, 'success');
      resetForm();
      setIsEditModalOpen(false);
      fetchSites();
    }
  };

  const handleViewLocation = (site: Site) => {
    if (!site.latitude || !site.longitude) {
      showAlert('No Location', 'This site does not have location coordinates', 'error');
      return;
    }
    // Attach company name to site for modal
    const companyObj = companyOptions.find(opt => String(opt.id) === String(site.company));
    setSelectedSite({
      ...site,
      company: companyObj ? companyObj.name : site.company // fallback to id if not found
    });
    setIsViewLocationOpen(true);
  };

  const handleDeleteSite = async (site: Site) => {
    // Use window.confirm for web compatibility instead of Alert.alert
    const confirmed = window.confirm(
      `Are you sure you want to delete "${site.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from('sites')
      .delete()
      .eq('id', site.id);
    
    if (error) {
      showAlert('Delete Error', error.message, 'error');
    } else {
      showAlert('Deleted', `${site.name} has been removed successfully`, 'success');
      fetchSites();
    }
  };

  return (
    <View className="flex-1 bg-stone-50">
      {/* Main Content Area */}
      <ScrollView className="flex-1 bg-stone-50">
        {/* Header */}
        <View className="bg-white px-5 pt-4 pb-3 border-b border-stone-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              {/* Mobile Menu Button - Hidden on desktop */}
              <TouchableOpacity 
                className="lg:hidden w-9 h-9 items-center justify-center mr-3"
                onPress={() => setIsDrawerOpen(true)}
              >
                <Ionicons name="menu" size={24} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-lg lg:text-2xl font-bold text-stone-900">Site Management</Text>
                <Text className="text-stone-500 text-xs lg:text-sm mt-0.5">Welcome back, Administrator</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2.5">
              <TouchableOpacity
                className="w-9 h-9 bg-stone-100 rounded-full items-center justify-center"
                onPress={() => setIsNotificationOpen(true)}
                activeOpacity={0.7}
              >
                <View className="w-2 h-2 bg-red-500 rounded-full absolute top-1.5 right-1.5" />
                <Ionicons name="notifications-outline" size={18} color="#57534e" />
              </TouchableOpacity>
              {/* Notification Modal */}
              <Modal
                visible={isNotificationOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsNotificationOpen(false)}
              >
                <Pressable
                  style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => setIsNotificationOpen(false)}
                >
                  <View
                    style={{
                      width: 320,
                      backgroundColor: 'rgba(255,255,255,0.85)',
                      borderRadius: 16,
                      padding: 24,
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons name="notifications-outline" size={32} color="#10b981" style={{ marginBottom: 12 }} />
                    <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#44403c', marginBottom: 8 }}>Notifications</Text>
                    <Text style={{ color: '#57534e', textAlign: 'center', marginBottom: 16 }}>
                      You have no new notifications.
                    </Text>
                    <TouchableOpacity
                      style={{ backgroundColor: '#10b981', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24 }}
                      onPress={() => setIsNotificationOpen(false)}
                    >
                      <Text style={{ color: 'white', fontWeight: 'bold' }}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Modal>
              <View className="w-9 h-9 bg-emerald-100 rounded-full items-center justify-center">
                <Text className="text-emerald-700 font-semibold text-xs">AD</Text>
              </View>
              {/* Desktop User Info - Hidden on mobile */}
              <View className="hidden lg:flex ml-2">
                <Text className="text-sm font-semibold text-stone-900">Admin User</Text>
                <Text className="text-xs text-stone-500">Super Admin</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Page Title & Add Button */}
        <View className="px-5 lg:px-8 pt-4 lg:pt-6 pb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-lg lg:text-xl font-bold text-stone-900 mb-0.5">Site Management</Text>
            </View>
            <TouchableOpacity 
              className="bg-emerald-600 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl flex-row items-center ml-2"
              onPress={() => setIsAddModalOpen(true)}
            >
              <Ionicons name="add" size={18} color="white" />
              <Text className="text-white font-semibold text-xs lg:text-sm ml-1">Add Site</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Desktop Table View - Hidden on mobile */}
        <View className="hidden lg:flex px-8 pb-6">
          <View className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            {/* Table Header */}
            <View className="flex-row items-center px-6 py-4 bg-stone-50 border-b border-stone-200">
              <Text className="flex-1 text-xs font-semibold text-stone-600 uppercase tracking-wide">Site Name</Text>
              <Text className="flex-1 text-xs font-semibold text-stone-600 uppercase tracking-wide">Company</Text>
              <Text className="flex-1 text-xs font-semibold text-stone-600 uppercase tracking-wide">Branch</Text>
              {/* Removed Members column header */}
              <Text className="w-28 text-xs font-semibold text-stone-600 uppercase tracking-wide">Status</Text>
              <Text className="w-32 text-xs font-semibold text-stone-600 uppercase tracking-wide text-center">Actions</Text>
            </View>

            {/* Table Rows */}
            {sites.length === 0 ? (
              <View className="px-6 py-12 items-center">
                <Ionicons name="location-outline" size={48} color="#d6d3d1" />
                <Text className="text-stone-500 text-sm mt-4">No sites found</Text>
                <Text className="text-stone-400 text-xs mt-1">Click &quot;Add Site&quot; to create your first site</Text>
              </View>
            ) : (
              sites.map((site, index) => (
                <View 
                  key={site.id}
                  className={`flex-row items-center px-6 py-4 ${index !== sites.length - 1 ? 'border-b border-stone-100' : ''}`}
                >
                  {/* Site Name */}
                  <View className="flex-1 flex-row items-center">
                    <View className="w-10 h-10 bg-emerald-100 rounded-xl items-center justify-center mr-3">
                      <Ionicons name="location" size={18} color="#10b981" />
                    </View>
                    <Text className="text-sm font-semibold text-stone-900">{site.name}</Text>
                  </View>

                  {/* Company */}
                  <Text className="flex-1 text-sm text-stone-600">{companyOptions.find(opt => String(opt.id) === String(site.company_id))?.name || 'No company selected'}</Text>

                  {/* Branch */}
                  <Text className="flex-1 text-sm text-stone-600">{branchOptions.find(opt => String(opt.id) === String(site.branch_id))?.name || 'No branch selected'}</Text>

                  {/* Members */}
                  {/* Removed Members column value */}

                  {/* Status */}
                  <View className="w-28">
                    <View className="bg-emerald-50 px-3 py-1.5 rounded-lg inline-flex self-start">
                      <Text className="text-emerald-700 text-xs font-semibold">{site.status}</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View className="w-32 flex-row items-center justify-center gap-2">
                    <TouchableOpacity 
                      className="w-8 h-8 items-center justify-center hover:bg-stone-100 rounded-lg"
                      onPress={() => handleEditSite(site)}
                    >
                      <Ionicons name="create-outline" size={18} color="#78716c" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="w-8 h-8 items-center justify-center hover:bg-stone-100 rounded-lg"
                      onPress={() => handleViewLocation(site)}
                    >
                      <Ionicons name="eye-outline" size={18} color="#78716c" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="w-8 h-8 items-center justify-center hover:bg-red-50 rounded-lg"
                      onPress={() => handleDeleteSite(site)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Mobile Card View - Hidden on desktop */}
        <View className="lg:hidden px-5 pb-6">
          {sites.length === 0 ? (
            <View className="px-6 py-12 items-center">
              <Ionicons name="location-outline" size={48} color="#d6d3d1" />
              <Text className="text-stone-500 text-sm mt-4">No sites found</Text>
              <Text className="text-stone-400 text-xs mt-1 text-center">Click &quot;Add Site&quot; to create your first site</Text>
            </View>
          ) : (
            sites.map((site, index) => {
              const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
              const companyName = companyOptions.find(opt => String(opt.id) === String(site.company_id))?.name || String(site.company || '');
              const branchName = branchOptions.find(opt => String(opt.id) === String(site.branch_id))?.name || 'No branch selected';
              const code = site.id ? String(site.id).slice(0, 5).toUpperCase() : `#${index + 1}`;
              const hasCoords = site.latitude !== null && site.latitude !== undefined && site.longitude !== null && site.longitude !== undefined;
              const lat = hasCoords ? Number(site.latitude).toFixed(4) : '';
              const lng = hasCoords ? Number(site.longitude).toFixed(4) : '';
              return (
                <View key={site.id} className="mb-4">
                  <TouchableOpacity
                    onPress={() => handleViewLocation(site)}
                    activeOpacity={0.9}
                    style={{ borderRadius: 16, overflow: 'hidden' }}
                  >
                    <View
                      style={{
                        borderRadius: 16,
                        padding: 16,
                        overflow: 'hidden',
                        backgroundColor: gradient[0],
                      }}
                    >
                    {/* Decorative circle */}
                    <View style={{ position: 'absolute', top: -18, right: -18, width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.08)' }} />

                    {/* Menu dots */}
                    <TouchableOpacity style={{ position: 'absolute', top: 10, right: 10 }} onPress={() => {}}>
                      <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.95)" />
                    </TouchableOpacity>

                    {/* Desired order: Company name, Branch name, Coordinates */}
                    <Text className="text-white text-sm font-semibold" numberOfLines={2} ellipsizeMode="tail">{companyName}</Text>
                    <Text className="text-white text-xs opacity-90 mt-1">{branchName}</Text>
                    <Text className="text-white text-xs opacity-90 mt-1">{hasCoords ? `${lat}, ${lng}` : code}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Mobile Drawer Modal */}
      <Modal
        visible={isDrawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <View className="flex-1 flex-row">
          {/* Drawer Content */}
          <View className="w-72 bg-white h-full shadow-2xl">
            {/* Drawer Header */}
            <View className="bg-emerald-50 px-6 pt-12 pb-6 border-b border-emerald-100">
              <View className="flex-row items-center gap-3 mb-3">
                <View className="w-14 h-14 bg-emerald-100 rounded-2xl items-center justify-center">
                  <Ionicons name="chatbubble" size={24} color="#10b981" />
                </View>
                <View>
                  <Text className="text-base font-bold text-stone-900">Admin Portal</Text>
                  <Text className="text-xs text-stone-500">Monitoring System</Text>
                </View>
              </View>
            </View>

            {/* Menu Items */}
            <ScrollView className="flex-1 px-4 py-4">
              {/* Dashboard */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('dashboard');
                }}
              >
                <Ionicons name="grid-outline" size={20} color="#78716c" />
                <Text className="ml-3 text-stone-700 font-medium">Dashboard</Text>
              </TouchableOpacity>

              {/* Site Management */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl bg-emerald-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('siteManagement');
                }}
              >
                <Ionicons name="location-outline" size={20} color="#10b981" />
                <Text className="ml-3 text-emerald-700 font-medium">Site Management</Text>
              </TouchableOpacity>

              {/* Walkie Talkie */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('walkieTalkie');
                }}
              >
                <Ionicons name="mic-outline" size={20} color="#78716c" />
                <Text className="ml-3 text-stone-700 font-medium">Walkie Talkie</Text>
              </TouchableOpacity>

              {/* Activity Logs */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('activityLogs');
                }}
              >
                <Ionicons name="clipboard-outline" size={20} color="#78716c" />
                <Text className="ml-3 text-stone-700 font-medium">Activity Logs</Text>
              </TouchableOpacity>

              {/* Company Lists */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('companyList');
                }}
              >
                <Ionicons name="business-outline" size={20} color="#78716c" />
                <Text className="ml-3 text-stone-700 font-medium">Company Lists</Text>
              </TouchableOpacity>

              {/* Employees */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('employee');
                }}
              >
                <Ionicons name="people-outline" size={20} color="#78716c" />
                <Text className="ml-3 text-stone-700 font-medium">Employees</Text>
              </TouchableOpacity>

              <View className="border-t border-stone-200 my-4" />

              {/* Settings */}
              <TouchableOpacity className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50" onPress={() => onNavigate('settings')}>
                <Ionicons name="settings-outline" size={20} color="#78716c" />
                <Text className="ml-3 text-stone-700 font-medium">Settings</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Sign Out */}
            <View className="px-4 pb-6 pt-4 border-t border-stone-200">
              <TouchableOpacity className="flex-row items-center px-4 py-3 rounded-xl">
                <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                <Text className="ml-3 text-red-600 font-medium">Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Overlay - Close drawer when tapped */}
          <Pressable 
            className="flex-1 bg-black/40" 
            onPress={() => setIsDrawerOpen(false)}
          />
        </View>
      </Modal>

      {/* Add Site Modal */}
      <Modal
        visible={isAddModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
      >
        <Pressable 
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => {
            setIsAddModalOpen(false);
            resetForm();
          }}
        >
          <Pressable className="bg-white rounded-2xl w-full max-w-md" onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <View className="px-6 pt-6 pb-4 border-b border-stone-100">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold text-stone-900">Add New Site</Text>
                  <Text className="text-xs text-stone-500 mt-1">Fill in the site details below</Text>
                </View>
                <TouchableOpacity 
                  className="w-8 h-8 items-center justify-center"
                  onPress={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                >
                  <Ionicons name="close" size={24} color="#78716c" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Form Content */}
            <ScrollView className="px-6 py-5 max-h-96">
              {/* Site Name */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Site Name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${
                    touched.siteName && errors.siteName ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                    id="site-name-input"
                    nativeID="site-name-input"
                    value={siteName}
                    editable={true}
                    selectTextOnFocus={true}
                    onChangeText={(value) => handleFieldChange('siteName', value)}
                    onBlur={() => handleFieldBlur('siteName', siteName)}
                />
                {touched.siteName && errors.siteName && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.siteName}</Text>
                  </View>
                )}
                {latitude !== null && longitude !== null && (
                  <View className="mt-2">
                    <Text className="text-xs text-stone-500">
                      <Text className="font-semibold">Coordinates:</Text> {latitude.toFixed(6)}, {longitude.toFixed(6)}
                    </Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">Auto-filled from map place (coordinates shown above)</Text>
              </View>

              {/* Company */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Company Name <Text className="text-red-500">*</Text>
                </Text>
                <View className={`bg-white border ${
                  touched.company && errors.company ? 'border-red-500' : 'border-stone-300'
                } rounded-xl px-4 py-3`}>
                  <select
                    style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 16, color: '#44403c' }}
                    value={company}
                    onChange={e => handleFieldChange('company', e.target.value)}
                    onBlur={() => handleFieldBlur('company', company)}
                  >
                    <option value="">Select a company</option>
                    {companyOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name} {opt.industry ? `(${opt.industry})` : ''}
                      </option>
                    ))}
                  </select>
                </View>
                {touched.company && errors.company && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.company}</Text>
                  </View>
                )}
              </View>

              {/* Branch */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Branch/Department
                </Text>
                <View className={`bg-white border ${
                  touched.branch_id && errors.branch_id ? 'border-red-500' : 'border-stone-300'
                } rounded-xl px-4 py-3`}>
                  <select
                    style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 16, color: '#44403c' }}
                    value={branch_id}
                    onChange={e => handleFieldChange('branch_id', e.target.value)}
                    onBlur={() => handleFieldBlur('branch_id', branch_id)}
                  >
                    <option value="">Select a branch</option>
                    {branchOptions
                      .filter(opt => !company || String(opt.company_id) === String(company))
                      .map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                  </select>
                </View>
                {touched.branch_id && errors.branch_id && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.branch_id}</Text>
                  </View>
                )}
              </View>

              {/* Working Hours, Date, Employees — 2x2 layout */}
              <View className="flex-row flex-wrap -mx-2">
                <View className="w-1/2 px-2 mb-4">
                  <Text className="text-sm font-medium text-stone-700 mb-2">Start Time</Text>
                  <div className={`bg-white border rounded-xl px-4 py-3`}>
                    <input
                      type="time"
                      style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 16, color: '#44403c' }}
                      value={startTime}
                      onChange={e => handleFieldChange('startTime', e.target.value)}
                    />
                  </div>
                </View>

                <View className="w-1/2 px-2 mb-4">
                  <Text className="text-sm font-medium text-stone-700 mb-2">End Time</Text>
                  <div className={`bg-white border rounded-xl px-4 py-3`}>
                    <input
                      type="time"
                      style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 16, color: '#44403c' }}
                      value={endTime}
                      onChange={e => handleFieldChange('endTime', e.target.value)}
                    />
                  </div>
                </View>

                <View className="w-1/2 px-2 mb-4">
                  <Text className="text-sm font-medium text-stone-700 mb-2">Date Accomplished</Text>
                  <div className={`bg-white border rounded-xl px-4 py-3`}>
                    <input
                      type="date"
                      style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 16, color: '#44403c' }}
                      value={dateAccomplished}
                      onChange={e => handleFieldChange('dateAccomplished', e.target.value)}
                    />
                  </div>
                </View>

                <View className="w-1/2 px-2 mb-4">
                  <Text className="text-sm font-medium text-stone-700 mb-2">Employees to Deploy <Text className="text-red-500">*</Text></Text>
                  <div className={`bg-white border ${
                    touched.membersCount && errors.membersCount ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3`}>
                    <input
                      list="members-list"
                      type="number"
                      min={0}
                      style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 16, color: '#44403c' }}
                      value={membersCount}
                      onChange={e => handleFieldChange('membersCount', e.target.value)}
                      onBlur={() => handleFieldBlur('membersCount', membersCount)}
                    />
                    <datalist id="members-list">
                      {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </datalist>
                  </div>
                  {touched.membersCount && errors.membersCount && (
                    <View className="flex-row items-center mt-1.5">
                      <Ionicons name="alert-circle" size={14} color="#dc2626" />
                      <Text className="text-xs text-red-600 ml-1">{errors.membersCount}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Location Map */}

              {/* Location Map */}
              <View className="mb-1">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Location <Text className="text-red-500">*</Text>
                </Text>
                <View 
                  id="leaflet-map" 
                  style={{ 
                    height: 200, 
                    width: '100%',
                    borderRadius: 12,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: touched.location && errors.location ? '#dc2626' : '#d6d3d1',
                    borderStyle: 'solid',
                  }}
                />
                {touched.location && errors.location && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.location}</Text>
                  </View>
                )}
                {latitude !== null && longitude !== null && (
                  <View className="mt-2 bg-stone-50 px-3 py-2 rounded-lg">
                    <Text className="text-xs text-stone-600">
                      <Text className="font-semibold">Coordinates:</Text> {latitude.toFixed(6)}, {longitude.toFixed(6)}
                    </Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">
                  Click on the map or drag the marker to set the location
                </Text>
              </View>

              <Text className="text-xs text-stone-400 mt-3">
                <Text className="text-red-500">*</Text> Required fields
              </Text>
            </ScrollView>

            {/* Action Buttons */}
            <View className="px-6 pb-6 pt-4 border-t border-stone-100">
              <View className="flex-row gap-3">
                <TouchableOpacity 
                  className="flex-1 bg-stone-100 py-3 rounded-xl active:opacity-70"
                  onPress={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                >
                  <Text className="text-center text-stone-700 font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-1 bg-emerald-600 py-3 rounded-xl active:opacity-80"
                  onPress={handleAddSite}
                >
                  <Text className="text-center text-white font-semibold">Add Site</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Site Modal */}
      <Modal
        visible={isEditModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
      >
        <Pressable 
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => {
            setIsEditModalOpen(false);
            resetForm();
          }}
        >
          <Pressable className="bg-white rounded-2xl w-full max-w-md" onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <View className="px-6 pt-6 pb-4 border-b border-stone-100">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold text-stone-900">Edit Site</Text>
                  <Text className="text-xs text-stone-500 mt-1">Update the site details below</Text>
                </View>
                <TouchableOpacity 
                  className="w-8 h-8 items-center justify-center"
                  onPress={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                >
                  <Ionicons name="close" size={24} color="#78716c" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Form Content */}
            <ScrollView className="px-6 py-5 max-h-96">
              {/* Site Name */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Site Name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${
                    touched.siteName && errors.siteName ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., Downtown Office"
                  placeholderTextColor="#a8a29e"
                  value={siteName}
                    id="edit-site-name-input"
                    nativeID="edit-site-name-input"
                    onChangeText={(value) => handleFieldChange('siteName', value)}
                    onBlur={() => handleFieldBlur('siteName', siteName)}
                  maxLength={50}
                />
                {touched.siteName && errors.siteName && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.siteName}</Text>
                  </View>
                )}
                {latitude !== null && longitude !== null && (
                  <View className="mt-2">
                    <Text className="text-xs text-stone-500">
                      <Text className="font-semibold">Coordinates:</Text> {latitude.toFixed(6)}, {longitude.toFixed(6)}
                    </Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">{siteName.length}/50 characters</Text>
              </View>

              {/* Company */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Company Name <Text className="text-red-500">*</Text>
                </Text>
                <View className={`bg-white border ${
                  touched.company && errors.company ? 'border-red-500' : 'border-stone-300'
                } rounded-xl px-4 py-3`}>
                  <select
                    style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 16, color: '#44403c' }}
                    value={company}
                    onChange={e => handleFieldChange('company', e.target.value)}
                    onBlur={() => handleFieldBlur('company', company)}
                  >
                    <option value="">Select a company</option>
                    {companyOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name} {opt.industry ? `(${opt.industry})` : ''}
                      </option>
                    ))}
                  </select>
                </View>
                {touched.company && errors.company && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.company}</Text>
                  </View>
                )}
              </View>

              {/* Branch */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Branch/Department <Text className="text-red-500">*</Text>
                </Text>
                <View className={`bg-white border ${
                  touched.branch_id && errors.branch_id ? 'border-red-500' : 'border-stone-300'
                } rounded-xl px-4 py-3`}>
                  <select
                    style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 16, color: '#44403c' }}
                    value={branch_id}
                    onChange={e => handleFieldChange('branch_id', e.target.value)}
                    onBlur={() => handleFieldBlur('branch_id', branch_id)}
                  >
                    <option value="">Select a branch</option>
                    {branchOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </View>
                {touched.branch_id && errors.branch_id && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.branch_id}</Text>
                  </View>
                )}
              </View>

              {/* Working Hours, Date, Employees — 2x2 layout for Edit modal */}
              <View className="flex-row flex-wrap -mx-2">
                <View className="w-1/2 px-2 mb-4">
                  <Text className="text-sm font-medium text-stone-700 mb-2">Start Time</Text>
                  <div className={`bg-white border rounded-xl px-4 py-3`}>
                    <input
                      type="time"
                      style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 16, color: '#44403c' }}
                      value={startTime}
                      onChange={e => handleFieldChange('startTime', e.target.value)}
                    />
                  </div>
                </View>

                <View className="w-1/2 px-2 mb-4">
                  <Text className="text-sm font-medium text-stone-700 mb-2">End Time</Text>
                  <div className={`bg-white border rounded-xl px-4 py-3`}>
                    <input
                      type="time"
                      style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 16, color: '#44403c' }}
                      value={endTime}
                      onChange={e => handleFieldChange('endTime', e.target.value)}
                    />
                  </div>
                </View>

                <View className="w-1/2 px-2 mb-4">
                  <Text className="text-sm font-medium text-stone-700 mb-2">Date Accomplished</Text>
                  <div className={`bg-white border rounded-xl px-4 py-3`}>
                    <input
                      type="date"
                      style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 16, color: '#44403c' }}
                      value={dateAccomplished}
                      onChange={e => handleFieldChange('dateAccomplished', e.target.value)}
                    />
                  </div>
                </View>

                <View className="w-1/2 px-2 mb-4">
                  <Text className="text-sm font-medium text-stone-700 mb-2">Employees to Deploy</Text>
                  <div className={`bg-white border ${
                    touched.membersCount && errors.membersCount ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3`}>
                    <input
                      list="members-list"
                      type="number"
                      min={0}
                      style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 16, color: '#44403c' }}
                      value={membersCount}
                      onChange={e => handleFieldChange('membersCount', e.target.value)}
                      onBlur={() => handleFieldBlur('membersCount', membersCount)}
                    />
                    <datalist id="members-list">
                      {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </datalist>
                  </div>
                  {touched.membersCount && errors.membersCount && (
                    <View className="flex-row items-center mt-1.5">
                      <Ionicons name="alert-circle" size={14} color="#dc2626" />
                      <Text className="text-xs text-red-600 ml-1">{errors.membersCount}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Location Map */}
              <View className="mb-1">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Location <Text className="text-red-500">*</Text>
                </Text>
                <View 
                  id="edit-leaflet-map" 
                  style={{ 
                    height: 200, 
                    width: '100%',
                    borderRadius: 12,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: touched.location && errors.location ? '#dc2626' : '#d6d3d1',
                    borderStyle: 'solid',
                  }}
                />
                {touched.location && errors.location && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.location}</Text>
                  </View>
                )}
                {latitude !== null && longitude !== null && (
                  <View className="mt-2 bg-stone-50 px-3 py-2 rounded-lg">
                    <Text className="text-xs text-stone-600">
                      <Text className="font-semibold">Coordinates:</Text> {latitude.toFixed(6)}, {longitude.toFixed(6)}
                    </Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">
                  Click on the map or drag the marker to update the location
                </Text>
              </View>

              <Text className="text-xs text-stone-400 mt-3">
                <Text className="text-red-500">*</Text> Required fields
              </Text>
            </ScrollView>

            {/* Action Buttons */}
            <View className="px-6 pb-6 pt-4 border-t border-stone-100">
              <View className="flex-row gap-3">
                <TouchableOpacity 
                  className="flex-1 bg-stone-100 py-3 rounded-xl active:opacity-70"
                  onPress={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                >
                  <Text className="text-center text-stone-700 font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-1 bg-emerald-600 py-3 rounded-xl active:opacity-80"
                  onPress={handleUpdateSite}
                >
                  <Text className="text-center text-white font-semibold">Update Site</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* View Location Modal */}
      <Modal
        visible={isViewLocationOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsViewLocationOpen(false);
          setSelectedSite(null);
        }}
      >
        <Pressable 
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => {
            setIsViewLocationOpen(false);
            setSelectedSite(null);
          }}
        >
          <Pressable className="bg-white rounded-2xl w-full max-w-2xl" onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <View className="px-6 pt-6 pb-4 border-b border-stone-100">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold text-stone-900">{selectedSite?.name}</Text>
                  <Text className="text-xs text-stone-500 mt-1">Location on Map</Text>
                </View>
                <TouchableOpacity 
                  className="w-8 h-8 items-center justify-center"
                  onPress={() => {
                    setIsViewLocationOpen(false);
                    setSelectedSite(null);
                  }}
                >
                  <Ionicons name="close" size={24} color="#78716c" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Map Content with overlay info card */}
            <View className="px-6 py-5">
              <View style={{ position: 'relative' }}>
                <View 
                  id="view-leaflet-map" 
                  style={{ 
                    height: 400, 
                    width: '100%',
                    borderRadius: 12,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#d6d3d1',
                    borderStyle: 'solid',
                  }}
                />

                {selectedSite && selectedSite.latitude && selectedSite.longitude && (
                  <View style={{
                    position: 'absolute',
                    left: 16,
                    right: 16,
                    bottom: 16,
                    backgroundColor: '#ffffff',
                    borderRadius: 12,
                    padding: 12,
                    boxShadow: '0 6px 18px rgba(0,0,0,0.12)'
                  }}>
                    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{selectedSite.name}</Text>
                        <Text style={{ fontSize: 13, color: '#4b5563', marginTop: 4 }}>{selectedSite.company}</Text>
                        <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{branchOptions.find(opt => opt.id === selectedSite.branch_id)?.name || 'No branch selected'}</Text>
                        {(selectedSite as any).date_accomplished && (
                          <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Date: {(selectedSite as any).date_accomplished}</Text>
                        )}
                        {((selectedSite as any).start_time || (selectedSite as any).end_time) && (
                          <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{`Hours: ${((selectedSite as any).start_time || '')} — ${((selectedSite as any).end_time || '')}`}</Text>
                        )}
                        {(selectedSite as any).members_count !== undefined && (
                          <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{`Employees: ${(selectedSite as any).members_count}`}</Text>
                        )}
                      </View>

                      <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <TouchableOpacity
                          onPress={() => {
                            if (typeof window !== 'undefined' && selectedSite && selectedSite.latitude && selectedSite.longitude) {
                              const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedSite.latitude},${selectedSite.longitude}`;
                              window.open(url, '_blank');
                            }
                          }}
                          style={{ backgroundColor: '#0369a1', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginBottom: 8 }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '700' }}>Directions</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            // Placeholder: Save or Start action
                          }}
                          style={{ backgroundColor: '#f3f4f6', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 }}
                        >
                          <Text style={{ color: '#111827', fontWeight: '600' }}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Close Button */}
            <View className="px-6 pb-6 pt-4 border-t border-stone-100">
              <TouchableOpacity 
                className="bg-emerald-600 py-3 rounded-xl active:opacity-80"
                onPress={() => {
                  setIsViewLocationOpen(false);
                  setSelectedSite(null);
                }}
              >
                <Text className="text-center text-white font-semibold">Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sweet Alert Modal */}
      <SweetAlertModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText="OK"
        onConfirm={() => setAlertVisible(false)}
      />
    </View>
  );
}