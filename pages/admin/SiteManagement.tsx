import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Image,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SweetAlertModal from '../../components/SweetAlertModal';
import '../../global.css';
import supabase from '../../utils/supabase';

interface Site {
  id: string;
  name: string;
  company_id?: string | number | null;
  company?: string; // optional company name (used when attaching display data)
  branch?: string;  // optional branch name (used when attaching display data)
  branch_id?: string | number | null;
  start_time?: string | null;
  end_time?: string | null;
  members_count?: number | null;
  status: string;
  leader_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  starlink_serial?: string | null;
  technical_issue?: string | null;
  issue_description?: string | null;
  evidence_urls?: string[];
  finished_by?: string | null;
  finished_at?: string | null;
}

interface SiteManagementProps {
  onNavigate: (
    page:
      | 'dashboard'
      | 'siteManagement'
      | 'walkieTalkie'
      | 'activityLogs'
      | 'companyList'
      | 'employee'
      | 'settings'
  ) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

interface ValidationErrors {
  siteName?: string;
  company?: string;
  branch_id?: string;
  location?: string;
  membersCount?: string;
}

export default function SiteManagement({ onNavigate, isMobileMenuOpen, setIsMobileMenuOpen }: SiteManagementProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewLocationOpen, setIsViewLocationOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Image modal state for evidence
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
  });

  // Helper function to show alert
  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ) => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  // Card gradient presets for mobile card styling
  const CARD_GRADIENTS = [
    ['#059669', '#10b981'], // emerald dark -> emerald light
  ];

  // Form state
  const [siteName, setSiteName] = useState('');
  const [company, setCompany] = useState(''); // stores company id
  const [branch_id, setBranchId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [membersCount, setMembersCount] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [leaderId, setLeaderId] = useState('');
  const [lastUpdateSource, setLastUpdateSource] = useState<'map' | 'places' | 'user' | null>(null);

  // Branch dropdown state
  const [branchOptions, setBranchOptions] = useState<
    { id: string; name: string; company_id?: string }[]
  >([]);

  // Company dropdown state
  const [companyOptions, setCompanyOptions] = useState<
    { id: string; name: string; industry: string }[]
  >([]);

  const [leaderOptions, setLeaderOptions] = useState<{ id: string; name: string; email: string }[]>(
    []
  );

  // UI: archived details modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedArchivedSite, setSelectedArchivedSite] = useState<any>(null);

  // Mobile card expansion state - track which card shows the map
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Helper function to convert a stored path to a public URL
  const getPublicImageUrl = (path: string): string => {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const relativePath = path.replace(/^site_evidence\//, '');
    const { data } = supabase.storage
      .from('site_evidence')
      .getPublicUrl(relativePath);
    return data.publicUrl;
  };

  // Normalize evidence_urls from any format into an array of public URLs
  const normalizeEvidenceUrls = (raw: any): string[] => {
    let urls: string[] = [];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          urls = parsed;
        } else {
          urls = [raw];
        }
      } catch (e) {
        urls = [raw];
      }
    } else if (Array.isArray(raw)) {
      urls = raw;
    } else {
      return [];
    }
    return urls.map(getPublicImageUrl);
  };

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
      const { data, error } = await supabase.from('branch').select('id, branch_name, company_id');
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

  // Map refs
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

  // Fetch sites from Supabase (active or archived)
  const fetchSites = async () => {
    if (!showArchived) {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        showAlert('Error fetching sites', error.message, 'error');
      } else {
        setSites(data || []);
      }
    } else {
      const { data, error } = await supabase
        .from('archived_sitegroup')
        .select(
          `*,
           company:company_id ( company_name ),
           branch:branch_id ( branch_name ),
           leader:leader_id ( full_name ),
           finisher:finished_by ( full_name )`
        )
        .order('created_at', { ascending: false });
      if (error) {
        showAlert('Error fetching archived sites', error.message, 'error');
      } else {
        // Normalize naming and evidence URLs
        const mapped = (data || []).map((r: any) => ({
          ...r,
          company: r?.company?.company_name || undefined,
          branch: r?.branch?.branch_name || undefined,
          leaderName: r?.leader?.full_name || (r?.leader_id || null),
          finishedByName: r?.finisher?.full_name || (r?.finished_by || null),
          evidence_urls: normalizeEvidenceUrls(r.evidence_urls),
        }));
        setSites(mapped as any[]);
      }
    }
  };

  useEffect(() => {
    fetchSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  useEffect(() => {
    if (!isAddModalOpen) return;

    const fetchLeaders = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, status')
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching leaders:', error);
        setLeaderOptions([]);
        return;
      }

      const mapped = (data || [])
        .filter((u: any) => {
          const role = String(u?.role || '').toLowerCase();
          if (role.includes('admin')) return false;
          if (String(u?.status || '').toLowerCase() === 'inactive') return false;
          return true;
        })
        .map((u: any) => ({
          id: String(u.id),
          name: String(u.full_name || u.email || 'Unnamed'),
          email: String(u.email || ''),
        }));

      setLeaderOptions(mapped);
    };

    fetchLeaders();
  }, [isAddModalOpen]);

  // Initialize Google Maps when add modal opens
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

        const iliganLat = 8.228;
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
          setErrors((prev) => ({ ...prev, location: undefined }));
          setLastUpdateSource('map');
        });

        map.addListener('click', (e: any) => {
          const pos = e.latLng;
          marker.setPosition(pos);
          setLatitude(pos.lat());
          setLongitude(pos.lng());
          setErrors((prev) => ({ ...prev, location: undefined }));
          setLastUpdateSource('map');
        });

        mapRef.current = map;
        markerRef.current = marker;
      };

      loadGoogleMaps();
    }

    return () => {
      if (markerRef.current) {
        try {
          markerRef.current.setMap(null);
        } catch (e) {}
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

    const autocomplete = new g.maps.places.Autocomplete(input, {
      types: ['geocode', 'establishment'],
    });
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
        setErrors((prev) => ({ ...prev, location: undefined }));
        setLastUpdateSource('places');
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
      try {
        g.maps.event.clearInstanceListeners(autocomplete);
      } catch {}
    };
  }, [isAddModalOpen]);

  // Initialize edit map using Google Maps
  useEffect(() => {
    if (!isEditModalOpen || !selectedSite || typeof window === 'undefined') {
      // Clean up when modal closes
      if (editMarkerRef.current) {
        try {
          editMarkerRef.current.setMap(null);
        } catch {}
        editMarkerRef.current = null;
      }
      if (editMapRef.current) {
        editMapRef.current = null;
      }
      return;
    }

    const ensureGoogleMapsScript = () => {
      const w = window as any;
      if (w.google && w.google.maps) {
        return;
      }

      const scriptId = 'gmaps-script';
      if (document.getElementById(scriptId)) {
        return;
      }

      const API_KEY = 'AIzaSyAq58TD9PputxnK8ZO9jRUX8KW7bTuPTPQ';
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };

    ensureGoogleMapsScript();

    let retryCount = 0;
    const maxRetries = 20;

    const initEditMap = () => {
      const g = (window as any).google;
      if (!g || !g.maps) return;

      const mapEl = document.getElementById('edit-leaflet-map') as HTMLElement;
      if (!mapEl) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(initEditMap, 100);
        }
        return;
      }

      // Check if element has dimensions
      const rect = mapEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(initEditMap, 100);
        }
        return;
      }

      // Clean up any existing map first
      if (editMarkerRef.current) {
        try {
          editMarkerRef.current.setMap(null);
        } catch {}
        editMarkerRef.current = null;
      }
      if (editMapRef.current) {
        editMapRef.current = null;
      }

      try {
        const lat = selectedSite.latitude || 8.228;
        const lng = selectedSite.longitude || 124.2452;

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
          setErrors((prev) => ({ ...prev, location: undefined }));
          setLastUpdateSource('map');
        });

        map.addListener('click', (e: any) => {
          const pos = e.latLng;
          marker.setPosition(pos);
          setLatitude(pos.lat());
          setLongitude(pos.lng());
          setErrors((prev) => ({ ...prev, location: undefined }));
          setLastUpdateSource('map');
        });

        editMapRef.current = map;
        editMarkerRef.current = marker;

        // Force resize after initialization
        setTimeout(() => {
          try {
            g.maps.event.trigger(map, 'resize');
            map.setCenter({ lat, lng });
          } catch {}
        }, 200);
      } catch (error) {
        console.error('Error initializing edit map:', error);
      }
    };

    if ((window as any).google && (window as any).google.maps) {
      // Use requestAnimationFrame to ensure DOM is painted
      requestAnimationFrame(() => {
        setTimeout(initEditMap, 500);
      });
    } else {
      const check = setInterval(() => {
        if ((window as any).google && (window as any).google.maps) {
          clearInterval(check);
          requestAnimationFrame(() => {
            setTimeout(initEditMap, 500);
          });
        }
      }, 100);
      return () => clearInterval(check);
    }

    return () => {
      if (editMarkerRef.current) {
        try {
          editMarkerRef.current.setMap(null);
        } catch {}
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

    const autocomplete = new g.maps.places.Autocomplete(input, {
      types: ['geocode', 'establishment'],
    });
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
        setErrors((prev) => ({ ...prev, location: undefined }));
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
      try {
        g.maps.event.clearInstanceListeners(autocomplete);
      } catch {}
    };
  }, [isEditModalOpen]);

  // Initialize view location map using Google Maps
  useEffect(() => {
    if (!isViewLocationOpen || !selectedSite || typeof window === 'undefined') {
      // Clean up when modal closes
      if (viewMarkerRef.current) {
        try {
          viewMarkerRef.current.setMap(null);
        } catch {}
        viewMarkerRef.current = null;
      }
      if (viewMapRef.current) {
        viewMapRef.current = null;
      }
      return;
    }

    const ensureGoogleMapsScript = () => {
      const w = window as any;
      if (w.google && w.google.maps) {
        return;
      }

      const scriptId = 'gmaps-script';
      if (document.getElementById(scriptId)) {
        return;
      }

      const API_KEY = 'AIzaSyAq58TD9PputxnK8ZO9jRUX8KW7bTuPTPQ';
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };

    ensureGoogleMapsScript();

    let retryCount = 0;
    const maxRetries = 20;

    const initViewMap = () => {
      const g = (window as any).google;
      if (!g || !g.maps) return;

      const mapEl = document.getElementById('view-leaflet-map') as HTMLElement;
      if (!mapEl) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(initViewMap, 100);
        }
        return;
      }

      // Check if element has dimensions
      const rect = mapEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(initViewMap, 100);
        }
        return;
      }

      // Clean up any existing map first
      if (viewMarkerRef.current) {
        try {
          viewMarkerRef.current.setMap(null);
        } catch {}
        viewMarkerRef.current = null;
      }
      if (viewMapRef.current) {
        viewMapRef.current = null;
      }

      try {
        const lat = selectedSite.latitude || 8.228;
        const lng = selectedSite.longitude || 124.2452;

        const map = new g.maps.Map(mapEl, {
          center: { lat, lng },
          zoom: 15,
          mapTypeControl: false,
          zoomControl: false,
          fullscreenControl: true,
        });

        const marker = new g.maps.Marker({
          position: { lat, lng },
          map,
          draggable: false,
        });

        const companyName = selectedSite.company ||
          (companyOptions.find((opt) => String(opt.id) === String(selectedSite.company_id))?.name ||
          'No company selected');
        const branchName = selectedSite.branch ||
          (branchOptions.find((opt) => opt.id === selectedSite.branch_id)?.name ||
          'No branch selected');

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
        try {
          viewTrafficRef.current = new g.maps.TrafficLayer();
          viewTransitRef.current = new g.maps.TransitLayer();
          viewBikeRef.current = new g.maps.BicyclingLayer();
          viewStreetRef.current = map.getStreetView();
        } catch (e) {}

        // Force resize after initialization
        setTimeout(() => {
          try {
            g.maps.event.trigger(map, 'resize');
            map.setCenter({ lat, lng });
          } catch {}
        }, 200);
      } catch (error) {
        console.error('Error initializing view map:', error);
      }
    };

    if ((window as any).google && (window as any).google.maps) {
      // Use requestAnimationFrame to ensure DOM is painted
      requestAnimationFrame(() => {
        setTimeout(initViewMap, 500);
      });
    } else {
      const check = setInterval(() => {
        if ((window as any).google && (window as any).google.maps) {
          clearInterval(check);
          requestAnimationFrame(() => {
            setTimeout(initViewMap, 500);
          });
        }
      }, 100);
      return () => clearInterval(check);
    }

    return () => {
      if (viewMarkerRef.current) {
        try {
          viewMarkerRef.current.setMap(null);
        } catch {}
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
        return undefined;
      case 'company':
        return undefined;
      case 'branch':
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

    if (requireMembers) {
      if (!membersCount || membersCount.trim() === '') {
        newErrors.membersCount = 'Please specify number of employees to deploy';
      }
    }

    if (latitude === null || longitude === null) {
      newErrors.location = 'Please select a location on the map';
    }

    setErrors(newErrors);
    setTouched({
      siteName: true,
      company: true,
      branch_id: true,
      membersCount: true,
      location: true,
    });

    return !Object.keys(newErrors).some((key: string) => (newErrors as any)[key] !== undefined);
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    switch (fieldName) {
      case 'siteName':
        setSiteName(value);
        setLastUpdateSource('user');
        break;
      case 'company':
        setCompany(value);
        if (value && companyOptions.some((opt) => String(opt.id) === String(value))) {
          setErrors((prev) => ({ ...prev, company: undefined }));
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
      case 'membersCount':
        setMembersCount(value);
        break;
    }

    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setErrors((prev) => ({ ...prev, [fieldName]: error }));
    }
  };

  // Auto-fill site name with reverse-geocoded place (falls back to coordinates)
  useEffect(() => {
    const fillNameWithPlace = async () => {
      if (latitude === null || longitude === null) return;
      if (!(lastUpdateSource === 'map' || !siteName || siteName.trim() === '')) return;

      const g = (window as any).google;
      if (g && g.maps && g.maps.Geocoder) {
        try {
          const geocoder = new g.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results: any, status: string) => {
              if (status === 'OK' && results && results[0]) {
                const placeName = results[0].formatted_address || results[0].name || '';
                const finalName = placeName ? placeName : 'Site';
                setSiteName(finalName);
                setLastUpdateSource(null);
              } else {
                setSiteName('Site');
                setLastUpdateSource(null);
              }
            }
          );
        } catch (e) {
          setSiteName('Site');
          setLastUpdateSource(null);
        }
      } else {
        setSiteName('Site');
        setLastUpdateSource(null);
      }
    };

    fillNameWithPlace();
  }, [latitude, longitude, siteName, lastUpdateSource]);

  const handleFieldBlur = (fieldName: string, value: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    const error = validateField(fieldName, value);
    setErrors((prev) => ({ ...prev, [fieldName]: error }));
  };

  const resetForm = () => {
    setSiteName('');
    setCompany('');
    setBranchId('');
    setStartTime('');
    setEndTime('');
    setMembersCount('');
    setLeaderId('');
    setLatitude(null);
    setLongitude(null);
    setLastUpdateSource(null);
    setErrors({});
    setTouched({});
    setSelectedSite(null);
  };

  const sanitizeSiteName = (name: string) => {
    const trimmed = name.trim();
    if (trimmed.length <= 50) return trimmed;
    return `${trimmed.slice(0, 47)}...`;
  };

  const formatGeocoderResult = (result: any, allResults: any[]): string => {
    if (!result) return '';
    let establishment = '';
    for (const r of allResults || []) {
      if (
        r.types &&
        (r.types.includes('establishment') ||
          r.types.includes('point_of_interest') ||
          r.types.includes('premise'))
      ) {
        establishment = r.formatted_address || '';
        break;
      }
    }
    const comp = (type: string) => {
      const c = (result.address_components || []).find(
        (ac: any) => ac.types && ac.types.includes(type)
      );
      return c ? c.long_name : '';
    };
    const streetNumber = comp('street_number');
    const route = comp('route');
    const street = [streetNumber, route].filter(Boolean).join(' ').trim();
    const sublocality =
      comp('sublocality_level_1') || comp('neighborhood') || comp('sublocality') || '';
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
    if (result.formatted_address) return result.formatted_address;
    return address || 'Site';
  };

  const geocodeSiteNameToLocation = (mode: 'add' | 'edit') => {
    if (typeof window === 'undefined') return;
    const query = (siteName || '').trim();
    if (!query) return;
    if (lastUpdateSource !== 'user') return;
    const g = (window as any).google;
    if (!g || !g.maps || !g.maps.Geocoder) return;
    try {
      const geocoder = new g.maps.Geocoder();
      geocoder.geocode({ address: query }, (results: any, status: string) => {
        if (
          status !== 'OK' ||
          !results ||
          !results[0] ||
          !results[0].geometry ||
          !results[0].geometry.location
        ) {
          return;
        }
        const loc = results[0].geometry.location;
        const lat = typeof loc.lat === 'function' ? loc.lat() : null;
        const lng = typeof loc.lng === 'function' ? loc.lng() : null;
        if (typeof lat !== 'number' || typeof lng !== 'number') return;
        const newName = formatGeocoderResult(results[0], results);
        if (newName) setSiteName(sanitizeSiteName(newName));
        setLatitude(lat);
        setLongitude(lng);
        setErrors((prev) => ({ ...prev, location: undefined }));
        setLastUpdateSource('places');
        try {
          if (mode === 'edit') {
            if (editMarkerRef.current && editMarkerRef.current.setPosition) {
              editMarkerRef.current.setPosition({ lat, lng });
            }
            if (editMapRef.current && editMapRef.current.setCenter) {
              editMapRef.current.setCenter({ lat, lng });
            }
          } else {
            if (markerRef.current && markerRef.current.setPosition) {
              markerRef.current.setPosition({ lat, lng });
            }
            if (mapRef.current && mapRef.current.setCenter) {
              mapRef.current.setCenter({ lat, lng });
            }
          }
        } catch {}
      });
    } catch {}
  };

  const handleAddSite = async () => {
    if (!validateForm(true)) {
      showAlert('Validation Error', 'Please fix the errors before submitting', 'error');
      return;
    }
    const safeName = sanitizeSiteName(siteName);
    const selectedLeaderId = leaderId && leaderId.trim() ? leaderId.trim() : null;
    if (selectedLeaderId) {
      const { data: leaderSites, error: leaderSitesError } = await supabase
        .from('sites')
        .select('id, status')
        .eq('leader_id', selectedLeaderId);
      if (leaderSitesError) {
        showAlert('Error', 'Unable to verify leader availability. Please try again.', 'error');
        return;
      }
      const leaderHasNonFinishedSite = (leaderSites || []).some(
        (s: any) => String(s?.status || '') !== 'Finished'
      );
      if (leaderHasNonFinishedSite) {
        showAlert(
          'Leader Unavailable',
          'This employee is already assigned as a site leader. Choose another leader.',
          'error'
        );
        return;
      }
    }
    const { data: insertedSite, error } = await supabase
      .from('sites')
      .insert([
        {
          name: safeName,
          company_id: company || null,
          branch_id: branch_id || null,
          start_time: startTime || null,
          end_time: endTime || null,
          members_count: membersCount ? parseInt(membersCount) : null,
          leader_id: selectedLeaderId,
          status: selectedLeaderId ? 'Pending' : 'Active',
          latitude: latitude,
          longitude: longitude,
        },
      ])
      .select('id, name')
      .single();
    if (error) {
      showAlert('Error', error.message, 'error');
    } else {
      if (selectedLeaderId && insertedSite?.id) {
        const { error: leaderAssignError } = await supabase
          .from('users')
          .update({ site_id: insertedSite.id, updated_at: new Date().toISOString() })
          .eq('id', selectedLeaderId);
        if (leaderAssignError) {
          console.error('Error assigning leader to site:', leaderAssignError);
        }
        const { error: memberInsertError } = await supabase
          .from('group_members')
          .insert([{ site_id: insertedSite.id, user_id: selectedLeaderId }]);
        if (memberInsertError) {
          console.error('Error inserting leader into group_members:', memberInsertError);
        }
      }
      await supabase.from('activity_logs').insert([
        {
          user_name: 'Admin User',
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

    // Prepare display names – archived sites already have strings, active need lookup
    let companyDisplay = site.company as string;
    let branchDisplay = site.branch as string;

    if (!companyDisplay && site.company_id) {
      const companyObj = companyOptions.find((opt) => String(opt.id) === String(site.company_id));
      companyDisplay = companyObj ? companyObj.name : 'No company selected';
    }

    if (!branchDisplay && site.branch_id) {
      const branchObj = branchOptions.find((opt) => opt.id === site.branch_id);
      branchDisplay = branchObj ? branchObj.name : 'No branch selected';
    }

    setSelectedSite({
      ...site,
      company: companyDisplay,
      branch: branchDisplay,
    });
    setIsViewLocationOpen(true);
  };

  const handleDeleteSite = async (site: Site) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${site.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    const { error } = await supabase.from('sites').delete().eq('id', site.id);
    if (error) {
      showAlert('Delete Error', error.message, 'error');
    } else {
      showAlert('Deleted', `${site.name} has been removed successfully`, 'success');
      fetchSites();
    }
  };

  const openArchivedDetail = (site: any) => {
    setSelectedArchivedSite(site);
    setDetailModalVisible(true);
  };

  return (
    <View className="flex-1 bg-stone-50">
      {/* Main Content Area */}
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-5 pb-4 border-b bg-[#f8fafb] border-slate-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity
                className="items-center justify-center mr-3 lg:hidden w-9 h-9"
                onPress={() => setIsMobileMenuOpen?.(true)}>
                <Ionicons name="menu" size={28} color="#237227" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="mb-1 text-xl font-light lg:text-3xl text-stone-900">Site Management</Text>
                <Text className="text-xs lg:text-base text-stone-900">Welcome back, Administrator</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Page Title & Add Button */}
        <View className="px-6 pt-4 pb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 gap-3">
              <Text className="mb-0.5 text-lg font-bold text-stone-900 lg:text-xl">
                {showArchived ? 'Archived Sites' : 'Site Management'}
              </Text>
              <TouchableOpacity
                className={`ml-2 px-2 py-1 rounded transition-colors duration-150 ${!showArchived ? 'bg-[#237227]' : 'bg-stone-200'} ${!showArchived ? 'shadow-md' : ''}`}
                style={{ minWidth: 70, alignItems: 'center' }}
                onPress={() => setShowArchived(false)}
                activeOpacity={0.85}
              >
                <Text className={`text-xs font-semibold ${!showArchived ? 'text-white' : 'text-[#237227]'}`}>Active</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`ml-1 px-2 py-1 rounded transition-colors duration-150 ${showArchived ? 'bg-[#237227]' : 'bg-stone-200'} ${showArchived ? 'shadow-md' : ''}`}
                style={{ minWidth: 70, alignItems: 'center' }}
                onPress={() => setShowArchived(true)}
                activeOpacity={0.85}
              >
                <Text className={`text-xs font-semibold ${showArchived ? 'text-white' : 'text-[#237227]'}`}>Archived</Text>
              </TouchableOpacity>
            </View>
            {!showArchived && (
              <TouchableOpacity
                className="ml-2 flex-row items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#237227] shadow-sm"
                onPress={() => setIsAddModalOpen(true)}
              >
                <Ionicons name="add" size={16} color="white" />
                <Text className="text-sm font-semibold text-white">Add Site</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Desktop Table View - Hidden on mobile */}
        <View className="hidden px-6 pb-6 lg:flex">
          <View className="overflow-hidden bg-white border shadow-sm rounded-xl border-stone-100">
            {/* Table Header */}
            <View className="flex-row items-center px-6 py-3 border-b border-gray-200 bg-gray-50">
              <Text className="flex-1 text-sm font-semibold text-gray-700">Site Name</Text>
              <Text className="flex-1 text-sm font-semibold text-center text-gray-700">Company</Text>
              <Text className="flex-1 text-sm font-semibold text-gray-700">Branch</Text>
              <Text className="w-24 text-sm font-semibold text-gray-700">Status</Text>
              <Text className="text-sm font-semibold text-center text-gray-700 w-28">Actions</Text>
            </View>

            {/* Table Rows */}
            {sites.length === 0 ? (
              <View className="items-center px-6 py-12">
                <View className="items-center justify-center w-12 h-12 mb-3 rounded-full bg-[#237227]">
                  <Ionicons name="location-outline" size={22} color="#f8fafb" />
                </View>
                <Text className="text-sm font-medium text-stone-500">No sites found</Text>
                <Text className="mt-1 text-xs text-stone-400">Click Add Site to create your first site</Text>
              </View>
            ) : (
              sites.map((site, index) => (
                <View
                  key={site.id}
                  className={`flex-row items-center px-6 py-3.5 ${index !== sites.length - 1 ? 'border-b border-stone-50' : ''}`}
                >
                  <View className="flex-1 flex-row items-center gap-2.5">
                    <View className="items-center justify-center w-8 h-8 rounded-full bg-[#f8fafb] border border-[#237227]">
                      <Ionicons name="location" size={18} color="#237227" />
                    </View>
                    <Text className="text-sm font-semibold text-stone-900" numberOfLines={1}>{site.name}</Text>
                  </View>

                  <Text className="flex-1 text-sm text-center text-stone-700" numberOfLines={1}>
                    {companyOptions.find(opt => String(opt.id) === String(site.company_id))?.name || '—'}
                  </Text>

                  <Text className="flex-1 text-sm text-stone-700" numberOfLines={1}>
                    {branchOptions.find(opt => String(opt.id) === String(site.branch_id))?.name || '—'}
                  </Text>

                  <View className="w-24">
                    <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full self-start  border border-[#237227]">
                      <View className="w-1.5 h-1.5 rounded-full bg-[#237227]" />
                      <Text className="text-xs font-semibold text-stone-900">{site.status || 'Active'}</Text>
                    </View>
                  </View>

                  <View className="w-28 flex-row items-center justify-center gap-1.5">
                    <TouchableOpacity
                      className="items-center justify-center rounded-full w-8 h-8 bg-[#f8fafb] border border-[#237227]"
                      onPress={() => handleEditSite(site)}
                    >
                      <Ionicons name="create-outline" size={14} color="#237227" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="items-center justify-center rounded-full w-8 h-8 bg-[#f8fafb] border border-[#237227]"
                      onPress={() => handleViewLocation(site)}
                    >
                      <Ionicons name="map-outline" size={14} color="#237227" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="items-center justify-center rounded-full w-8 h-8 bg-[#f8fafb] border border-[#ef4444]"
                      onPress={() => handleDeleteSite(site)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            {sites.length > 0 && (
              <View className="flex-row items-center justify-between px-6 py-3 border-t border-stone-100 bg-stone-50">
                <Text className="text-xs text-stone-900">Showing {sites.length} sites</Text>
                <View />
              </View>
            )}
          </View>
        </View>

        {/* Mobile Card View - Hidden on desktop */}
        <View className="px-5 pb-6 lg:hidden">
          {sites.length === 0 ? (
            <View className="items-center px-6 py-12">
              <Ionicons name="location-outline" size={48} color="#d6d3d1" />
              <Text className="mt-4 text-sm text-stone-500">No sites found</Text>
              {!showArchived && (
                <Text className="mt-1 text-xs text-center text-stone-400">
                  Click &quot;Add Site&quot; to create your first site
                </Text>
              )}
            </View>
          ) : (
            sites.map((site, index) => {
              const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
              const companyName =
                companyOptions.find((opt) => String(opt.id) === String(site.company_id))?.name ||
                site.company ||
                '';
              const branchName =
                branchOptions.find((opt) => String(opt.id) === String(site.branch_id))?.name ||
                site.branch ||
                'No branch selected';
              const code = site.id ? String(site.id).slice(0, 5).toUpperCase() : `#${index + 1}`;
              const hasCoords =
                site.latitude !== null &&
                site.latitude !== undefined &&
                site.longitude !== null &&
                site.longitude !== undefined;
              const lat = hasCoords ? Number(site.latitude).toFixed(4) : '';
              const lng = hasCoords ? Number(site.longitude).toFixed(4) : '';
              return (
                <View key={site.id} className="mb-4">
                  <TouchableOpacity
                    onPress={() => handleViewLocation(site)}
                    activeOpacity={0.9}
                    style={{ borderRadius: 16, overflow: 'hidden' }}>
                    <View
                      style={{
                        borderRadius: 16,
                        padding: 16,
                        overflow: 'hidden',
                        backgroundColor: gradient[0],
                      }}>
                      <View
                        style={{
                          position: 'absolute',
                          top: -18,
                          right: -18,
                          width: 96,
                          height: 96,
                          borderRadius: 48,
                          backgroundColor: 'rgba(255,255,255,0.08)',
                        }}
                      />

                      {!showArchived && (
                        <TouchableOpacity
                          style={{ position: 'absolute', top: 10, right: 10 }}
                          onPress={() => {}}>
                          <Ionicons
                            name="ellipsis-vertical"
                            size={20}
                            color="rgba(255,255,255,0.95)"
                          />
                        </TouchableOpacity>
                      )}

                      {/* Icons row for archived sites */}
                      {showArchived ? (
                        <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', gap: 12 }}>
                          <TouchableOpacity onPress={() => handleViewLocation(site)}>
                            <Ionicons name="location-outline" size={18} color="rgba(255,255,255,0.95)" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => openArchivedDetail(site)}>
                            <Ionicons name="eye-outline" size={18} color="rgba(255,255,255,0.95)" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        // Active site: only one eye icon (positioned to leave space for the menu)
                        <TouchableOpacity
                          style={{ position: 'absolute', top: 10, right: 50 }}
                          onPress={() => handleViewLocation(site)}>
                          <Ionicons name="eye-outline" size={18} color="rgba(255,255,255,0.95)" />
                        </TouchableOpacity>
                      )}

                      <Text
                        className="text-sm font-semibold text-white"
                        numberOfLines={2}
                        ellipsizeMode="tail">
                        {companyName}
                      </Text>
                      <Text className="mt-1 text-xs text-white opacity-90">{branchName}</Text>
                      <Text className="mt-1 text-xs text-white opacity-90">
                        {hasCoords ? `${lat}, ${lng}` : code}
                      </Text>

                      {showArchived && (
                        <View className="px-3 py-2 mt-3 rounded-md bg-white/10">
                          <Text className="text-xs font-semibold text-white">
                            Members: {site.members_count ?? '—'}
                          </Text>
                          <Text className="mt-1 text-xs text-white">
                            Starlink: {site.starlink_serial || '—'}
                          </Text>
                          <Text className="mt-1 text-xs text-white line-clamp-2">
                            Issue: {site.technical_issue || site.issue_description || '—'}
                          </Text>
                          <Text className="mt-1 text-xs text-white">
                            Leader: {(site as any).leaderName || '—'}
                          </Text>
                          <Text className="mt-1 text-xs text-white">
                            Finished: {site.finished_at ? new Date(site.finished_at).toLocaleString() : '—'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Detail Modal for Archived Sites */}
      <Modal visible={detailModalVisible} animationType="slide" transparent={true}>
        <View className="items-center justify-center flex-1 px-6 bg-black/40">
          <View className="w-full max-w-2xl p-6 bg-white rounded-2xl">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-lg font-extrabold text-gray-900">
                  {selectedArchivedSite?.name || 'Archived Site Detail'}
                </Text>
                <Text className="mt-2 text-sm text-gray-600">Full details and evidence</Text>
              </View>
              <Pressable onPress={() => setDetailModalVisible(false)} className="ml-4">
                <Ionicons name="close" size={20} color="#111827" />
              </Pressable>
            </View>
            <ScrollView className="mt-4 max-h-80">
              <View className="mb-4">
                <View className="flex-row justify-between py-2 border-b border-stone-100">
                  <Text className="font-semibold text-stone-700">Company:</Text>
                  <Text className="text-stone-600">{selectedArchivedSite?.company || '—'}</Text>
                </View>
                <View className="flex-row justify-between py-2 border-b border-stone-100">
                  <Text className="font-semibold text-stone-700">Branch:</Text>
                  <Text className="text-stone-600">{selectedArchivedSite?.branch || '—'}</Text>
                </View>
                <View className="flex-row justify-between py-2 border-b border-stone-100">
                  <Text className="font-semibold text-stone-700">Members:</Text>
                  <Text className="text-stone-600">{selectedArchivedSite?.members_count ?? '—'}</Text>
                </View>
                <View className="flex-row justify-between py-2 border-b border-stone-100">
                  <Text className="font-semibold text-stone-700">Starlink Serial:</Text>
                  <Text className="text-stone-600">{selectedArchivedSite?.starlink_serial || '—'}</Text>
                </View>
                <View className="flex-row justify-between py-2 border-b border-stone-100">
                  <Text className="font-semibold text-stone-700">Technical Issue:</Text>
                  <Text className="text-stone-600">{selectedArchivedSite?.technical_issue || selectedArchivedSite?.issue_description || '—'}</Text>
                </View>
                <View className="flex-row justify-between py-2 border-b border-stone-100">
                  <Text className="font-semibold text-stone-700">Leader:</Text>
                  <Text className="text-stone-600">{selectedArchivedSite?.leaderName || selectedArchivedSite?.leader_id || '—'}</Text>
                </View>
                <View className="flex-row justify-between py-2 border-b border-stone-100">
                  <Text className="font-semibold text-stone-700">Finished At:</Text>
                  <Text className="text-stone-600">
                    {selectedArchivedSite?.finished_at ? new Date(selectedArchivedSite.finished_at).toLocaleString() : '—'}
                  </Text>
                </View>
              </View>

              {/* Evidence Images */}
              {selectedArchivedSite?.evidence_urls && selectedArchivedSite.evidence_urls.length > 0 && (
                <View className="mt-2">
                  <Text className="mb-2 font-semibold text-stone-700">Evidence Images:</Text>
                  <FlatList
                    data={selectedArchivedSite.evidence_urls}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item, idx) => idx.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        className="w-24 h-24 mr-2 overflow-hidden border rounded-md border-stone-200"
                        onPress={() => {
                          setActiveImage(item);
                          setImageModalVisible(true);
                        }}>
                        <Image
                          source={{ uri: item }}
                          className="w-full h-full"
                          resizeMode="cover"
                          onError={(e) => console.warn('Failed to load evidence', e.nativeEvent.error)}
                        />
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {(!selectedArchivedSite?.evidence_urls || selectedArchivedSite.evidence_urls.length === 0) && (
                <Text className="mt-2 text-sm text-stone-500">No evidence images.</Text>
              )}
            </ScrollView>
          </View>
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
        }}>
        <Pressable
          className="items-center justify-center flex-1 px-6 bg-black/50"
          onPress={() => {
            setIsAddModalOpen(false);
            resetForm();
          }}>
          <Pressable
            className="w-full max-w-md bg-white rounded-2xl"
            onPress={(e) => e.stopPropagation()}>
            <View className="px-6 pt-6 pb-4 border-b border-stone-100">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold text-stone-900">Add New Site</Text>
                  <Text className="mt-1 text-xs text-stone-500">
                    Fill in the site details below
                  </Text>
                </View>
                <TouchableOpacity
                  className="items-center justify-center w-8 h-8"
                  onPress={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}>
                  <Ionicons name="close" size={24} color="#78716c" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView className="px-6 py-5 max-h-96">
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-stone-700">
                  Site Name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`border bg-white ${
                    touched.siteName && errors.siteName ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-sm text-stone-900`}
                  id="site-name-input"
                  nativeID="site-name-input"
                  value={siteName}
                  editable={true}
                  selectTextOnFocus={true}
                  onChangeText={(value) => handleFieldChange('siteName', value)}
                  onBlur={() => {
                    handleFieldBlur('siteName', siteName);
                    geocodeSiteNameToLocation('add');
                  }}
                  onSubmitEditing={() => geocodeSiteNameToLocation('add')}
                />
                {touched.siteName && errors.siteName && (
                  <View className="mt-1.5 flex-row items-center">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.siteName}</Text>
                  </View>
                )}
                {latitude !== null && longitude !== null && (
                  <View className="mt-2">
                    <Text className="text-xs text-stone-500">
                      <Text className="font-semibold">Coordinates:</Text> {latitude.toFixed(6)},{' '}
                      {longitude.toFixed(6)}
                    </Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">
                  Auto-filled from map place (coordinates shown above)
                </Text>
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-stone-700">
                  Company Name <Text className="text-red-500">*</Text>
                </Text>
                <View
                  className={`border bg-white ${
                    touched.company && errors.company ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3`}>
                  <select
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      fontSize: 16,
                      color: '#44403c',
                    }}
                    value={company}
                    onChange={(e) => handleFieldChange('company', e.target.value)}
                    onBlur={() => handleFieldBlur('company', company)}>
                    <option value="">Select a company</option>
                    {companyOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name} {opt.industry ? `(${opt.industry})` : ''}
                      </option>
                    ))}
                  </select>
                </View>
                {touched.company && errors.company && (
                  <View className="mt-1.5 flex-row items-center">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.company}</Text>
                  </View>
                )}
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-stone-700">Branch/Department</Text>
                <View
                  className={`border bg-white ${
                    touched.branch_id && errors.branch_id ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3`}>
                  <select
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      fontSize: 16,
                      color: '#44403c',
                    }}
                    value={branch_id}
                    onChange={(e) => handleFieldChange('branch_id', e.target.value)}
                    onBlur={() => handleFieldBlur('branch_id', branch_id)}>
                    <option value="">Select a branch</option>
                    {branchOptions
                      .filter((opt) => !company || String(opt.company_id) === String(company))
                      .map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                  </select>
                </View>
                {touched.branch_id && errors.branch_id && (
                  <View className="mt-1.5 flex-row items-center">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.branch_id}</Text>
                  </View>
                )}
              </View>

              <View className="flex-row flex-wrap -mx-2">
                <View className="w-1/2 px-2 mb-4">
                  <Text className="mb-2 text-sm font-medium text-stone-700">Start Time</Text>
                  <div className={`rounded-xl border border-stone-300 bg-white px-4 py-3`}>
                    <input
                      type="time"
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        fontSize: 16,
                        color: '#44403c',
                      }}
                      value={startTime}
                      onChange={(e) => handleFieldChange('startTime', e.target.value)}
                    />
                  </div>
                </View>

                <View className="w-1/2 px-2 mb-4">
                  <Text className="mb-2 text-sm font-medium text-stone-700">End Time</Text>
                  <div className={`rounded-xl border border-stone-300 bg-white px-4 py-3`}>
                    <input
                      type="time"
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        fontSize: 16,
                        color: '#44403c',
                      }}
                      value={endTime}
                      onChange={(e) => handleFieldChange('endTime', e.target.value)}
                    />
                  </div>
                </View>

                <View className="w-full px-2 mb-4">
                  <Text className="mb-2 text-sm font-medium text-stone-700">
                    Employees to Deploy <Text className="text-red-500">*</Text>
                  </Text>
                  <div
                    className={`border bg-white ${
                      touched.membersCount && errors.membersCount
                        ? 'border-red-500'
                        : 'border-stone-300'
                    } rounded-xl px-4 py-3`}>
                    <input
                      list="members-list"
                      type="number"
                      min={0}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        fontSize: 16,
                        color: '#44403c',
                      }}
                      value={membersCount}
                      onChange={(e) => handleFieldChange('membersCount', e.target.value)}
                      onBlur={() => handleFieldBlur('membersCount', membersCount)}
                    />
                    <datalist id="members-list">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  {touched.membersCount && errors.membersCount && (
                    <View className="mt-1.5 flex-row items-center">
                      <Ionicons name="alert-circle" size={14} color="#dc2626" />
                      <Text className="ml-1 text-xs text-red-600">{errors.membersCount}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-stone-700">
                  Group Leader (Optional)
                </Text>
                <View className="px-4 py-3 bg-white border rounded-xl border-stone-300">
                  <select
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      fontSize: 16,
                      color: '#44403c',
                    }}
                    value={leaderId}
                    onChange={(e) => setLeaderId(e.target.value)}>
                    <option value="">No leader assigned</option>
                    {leaderOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                        {opt.email ? ` — ${opt.email}` : ''}
                      </option>
                    ))}
                  </select>
                </View>
                <Text className="mt-1 text-xs text-stone-400">
                  If a leader is selected, the site will be created as Pending.
                </Text>
              </View>

              <View className="mb-1">
                <Text className="mb-2 text-sm font-medium text-stone-700">
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
                  <View className="mt-1.5 flex-row items-center">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.location}</Text>
                  </View>
                )}
                {latitude !== null && longitude !== null && (
                  <View className="px-3 py-2 mt-2 rounded-lg bg-stone-50">
                    <Text className="text-xs text-stone-600">
                      <Text className="font-semibold">Coordinates:</Text> {latitude.toFixed(6)},{' '}
                      {longitude.toFixed(6)}
                    </Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">
                  Click on the map or drag the marker to set the location
                </Text>
              </View>

              <Text className="mt-3 text-xs text-stone-400">
                <Text className="text-red-500">*</Text> Required fields
              </Text>
            </ScrollView>

            <View className="px-6 pt-4 pb-6 border-t border-stone-100">
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 py-3 rounded-xl  bg-[#f8fafb] border border-[#237227] active:opacity-70"
                  onPress={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}>
                  <Text className="font-semibold text-center text-stone-900">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-3 rounded-xl bg-[#237227] active:opacity-80"
                  onPress={handleAddSite}>
                  <Text className="font-semibold text-center text-white">Add Site</Text>
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
        }}>
        <Pressable
          className="items-center justify-center flex-1 px-6 bg-black/50"
          onPress={() => {
            setIsEditModalOpen(false);
            resetForm();
          }}>
          <Pressable
            className="w-full max-w-md bg-white rounded-2xl"
            onPress={(e) => e.stopPropagation()}>
            <View className="px-6 pt-6 pb-4 border-b border-stone-100">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold text-stone-900">Edit Site</Text>
                  <Text className="mt-1 text-xs text-stone-500">Update the site details below</Text>
                </View>
                <TouchableOpacity
                  className="items-center justify-center w-8 h-8"
                  onPress={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                  }}>
                  <Ionicons name="close" size={24} color="#78716c" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView className="px-6 py-5 max-h-96">
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-stone-700">
                  Site Name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`border bg-white ${
                    touched.siteName && errors.siteName ? 'border-red-500' : 'border-stone-300' 
                  } rounded-xl px-4 py-3 text-sm text-stone-900`}
                  placeholder="e.g., Downtown Office"
                  placeholderTextColor="#a8a29e"
                  value={siteName}
                  id="edit-site-name-input"
                  nativeID="edit-site-name-input"
                  onChangeText={(value) => handleFieldChange('siteName', value)}
                  onBlur={() => {
                    handleFieldBlur('siteName', siteName);
                    geocodeSiteNameToLocation('edit');
                  }}
                  onSubmitEditing={() => geocodeSiteNameToLocation('edit')}
                  maxLength={50}
                />
                {touched.siteName && errors.siteName && (
                  <View className="mt-1.5 flex-row items-center">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.siteName}</Text>
                  </View>
                )}
                {latitude !== null && longitude !== null && (
                  <View className="mt-2">
                    <Text className="text-xs text-stone-500">
                      <Text className="font-semibold">Coordinates:</Text> {latitude.toFixed(6)},{' '}
                      {longitude.toFixed(6)}
                    </Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">{siteName.length}/50 characters</Text>
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-stone-700">
                  Company Name <Text className="text-red-500">*</Text>
                </Text>
                <View
                  className={`border bg-white ${
                    touched.company && errors.company ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3`}>
                  <select
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      fontSize: 16,
                      color: '#44403c',
                    }}
                    value={company}
                    onChange={(e) => handleFieldChange('company', e.target.value)}
                    onBlur={() => handleFieldBlur('company', company)}>
                    <option value="">Select a company</option>
                    {companyOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name} {opt.industry ? `(${opt.industry})` : ''}
                      </option>
                    ))}
                  </select>
                </View>
                {touched.company && errors.company && (
                  <View className="mt-1.5 flex-row items-center">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.company}</Text>
                  </View>
                )}
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-stone-700">
                  Branch/Department <Text className="text-red-500">*</Text>
                </Text>
                <View
                  className={`border bg-white ${
                    touched.branch_id && errors.branch_id ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3`}>
                  <select
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      fontSize: 16,
                      color: '#44403c',
                    }}
                    value={branch_id}
                    onChange={(e) => handleFieldChange('branch_id', e.target.value)}
                    onBlur={() => handleFieldBlur('branch_id', branch_id)}>
                    <option value="">Select a branch</option>
                    {branchOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </View>
                {touched.branch_id && errors.branch_id && (
                  <View className="mt-1.5 flex-row items-center">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.branch_id}</Text>
                  </View>
                )}
              </View>

              <View className="flex-row flex-wrap -mx-2">
                <View className="w-1/2 px-2 mb-4">
                  <Text className="mb-2 text-sm font-medium text-stone-700">Start Time</Text>
                  <div className={`rounded-xl border border-stone-300 bg-white px-4 py-3`}>
                    <input
                      type="time"
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        fontSize: 16,
                        color: '#44403c',
                      }}
                      value={startTime}
                      onChange={(e) => handleFieldChange('startTime', e.target.value)}
                    />
                  </div>
                </View>

                <View className="w-1/2 px-2 mb-4">
                  <Text className="mb-2 text-sm font-medium text-stone-700">End Time</Text>
                  <div className={`rounded-xl border border-stone-300 bg-white px-4 py-3`}>
                    <input
                      type="time"
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        fontSize: 16,
                        color: '#44403c',
                      }}
                      value={endTime}
                      onChange={(e) => handleFieldChange('endTime', e.target.value)}
                    />
                  </div>
                </View>

                <View className="w-1/2 px-2 mb-4">
                  <Text className="mb-2 text-sm font-medium text-stone-700">
                    Employees to Deploy
                  </Text>
                  <div
                    className={`border bg-white ${
                      touched.membersCount && errors.membersCount
                        ? 'border-red-500'
                        : 'border-stone-300'
                    } rounded-xl px-4 py-3`}>
                    <input
                      list="members-list"
                      type="number"
                      min={0}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        fontSize: 16,
                        color: '#44403c',
                      }}
                      value={membersCount}
                      onChange={(e) => handleFieldChange('membersCount', e.target.value)}
                      onBlur={() => handleFieldBlur('membersCount', membersCount)}
                    />
                    <datalist id="members-list">
                      {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  {touched.membersCount && errors.membersCount && (
                    <View className="mt-1.5 flex-row items-center">
                      <Ionicons name="alert-circle" size={14} color="#dc2626" />
                      <Text className="ml-1 text-xs text-red-600">{errors.membersCount}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View className="mb-1">
                <Text className="mb-2 text-sm font-medium text-stone-700">
                  Location <Text className="text-red-500">*</Text>
                </Text>
                <View
                  id="edit-leaflet-map"
                  style={{
                    height: 200,
                    width: '100%',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: touched.location && errors.location ? '#dc2626' : '#d6d3d1',
                    borderStyle: 'solid',
                  }}
                />
                {touched.location && errors.location && (
                  <View className="mt-1.5 flex-row items-center">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.location}</Text>
                  </View>
                )}
                {latitude !== null && longitude !== null && (
                  <View className="px-3 py-2 mt-2 rounded-lg bg-stone-50">
                    <Text className="text-xs text-stone-600">
                      <Text className="font-semibold">Coordinates:</Text> {latitude.toFixed(6)},{' '}
                      {longitude.toFixed(6)}
                    </Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">
                  Click on the map or drag the marker to update the location
                </Text>
              </View>

              <Text className="mt-3 text-xs text-stone-400">
                <Text className="text-red-500">*</Text> Required fields
              </Text>
            </ScrollView>

            <View className="px-6 pt-4 pb-6 border-t border-stone-100">
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 py-3 rounded-xl  bg-[#f8fafb] border border-[#237227]"
                  onPress={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                  }}>
                  <Text className="font-semibold text-center text-stone-900">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-3 rounded-xl bg-[#237227] active:opacity-80"
                  onPress={handleUpdateSite}>
                  <Text className="font-semibold text-center text-white">Update Site</Text>
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
        }}>
        <Pressable
          className="items-center justify-center flex-1 px-6 bg-black/50"
          onPress={() => {
            setIsViewLocationOpen(false);
            setSelectedSite(null);
          }}>
          <Pressable
            className="w-full max-w-2xl bg-white rounded-2xl"
            onPress={(e) => e.stopPropagation()}>
            <View className="px-6 pt-6 pb-4 border-b border-stone-100">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold text-stone-900">{selectedSite?.name}</Text>
                  <Text className="mt-1 text-xs text-stone-500">Location on Map</Text>
                </View>
                <TouchableOpacity
                  className="items-center justify-center w-8 h-8"
                  onPress={() => {
                    setIsViewLocationOpen(false);
                    setSelectedSite(null);
                  }}>
                  <Ionicons name="close" size={24} color="#78716c" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="px-6 py-5">
              <View style={{ position: 'relative' }}>
                <View
                  id="view-leaflet-map"
                  style={{
                    height: 400,
                    width: '100%',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#d6d3d1',
                    borderStyle: 'solid',
                  }}
                />

                {selectedSite && selectedSite.latitude && selectedSite.longitude && (
                  <View
                    style={{
                      position: 'absolute',
                      left: 16,
                      right: 16,
                      bottom: 16,
                      backgroundColor: '#ffffff',
                      borderRadius: 12,
                      padding: 12,
                      boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                    }}>
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                          {selectedSite.name}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#4b5563', marginTop: 4 }}>
                          {selectedSite.company || 'No company selected'}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                          {selectedSite.branch || 'No branch selected'}
                        </Text>
                        {((selectedSite as any).start_time || (selectedSite as any).end_time) && (
                          <Text
                            style={{
                              fontSize: 13,
                              color: '#6b7280',
                              marginTop: 2,
                            }}>{`Hours: ${(selectedSite as any).start_time || ''} — ${(selectedSite as any).end_time || ''}`}</Text>
                        )}
                        {(selectedSite as any).members_count !== undefined && (
                          <Text
                            style={{
                              fontSize: 13,
                              color: '#6b7280',
                              marginTop: 2,
                            }}>{`Employees: ${(selectedSite as any).members_count}`}</Text>
                        )}
                      </View>

                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                        }}>
                        <TouchableOpacity
                          onPress={() => {
                            if (
                              typeof window !== 'undefined' &&
                              selectedSite &&
                              selectedSite.latitude &&
                              selectedSite.longitude
                            ) {
                              const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedSite.latitude},${selectedSite.longitude}`;
                              window.open(url, '_blank');
                            }
                          }}
                          style={{
                            backgroundColor: '#0369a1',
                            paddingVertical: 8,
                            paddingHorizontal: 14,
                            borderRadius: 8,
                            marginBottom: 8,
                          }}>
                          <Text style={{ color: '#fff', fontWeight: '700' }}>Directions</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {}}
                          style={{
                            backgroundColor: '#f3f4f6',
                            paddingVertical: 8,
                            paddingHorizontal: 14,
                            borderRadius: 8,
                          }}>
                          <Text style={{ color: '#111827', fontWeight: '600' }}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>

            <View className="px-6 pt-4 pb-6 border-t border-stone-100">
              <TouchableOpacity
                className="py-3 rounded-xl  bg-[#f8fafb] border border-[#237227] active:opacity-80"
                onPress={() => {
                  setIsViewLocationOpen(false);
                  setSelectedSite(null);
                }}>
                <Text className="font-semibold text-center text-stone-900">Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Image Modal for Evidence */}
      <Modal visible={imageModalVisible} transparent animationType="fade">
        <View className="items-center justify-center flex-1 p-6 bg-black/60">
          <View className="w-full max-w-3xl p-4 bg-white rounded-2xl">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-stone-900">Evidence Photo</Text>
              <Pressable onPress={() => setImageModalVisible(false)}>
                <Ionicons name="close" size={20} color="#111827" />
              </Pressable>
            </View>
            {activeImage ? (
              <Image source={{ uri: activeImage }} className="w-full mt-4 rounded-md h-96" resizeMode="contain" />
            ) : (
              <Text className="mt-4 text-sm text-stone-500">No image</Text>
            )}
          </View>
        </View>
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