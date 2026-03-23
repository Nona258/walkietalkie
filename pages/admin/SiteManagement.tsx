import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SweetAlertModal from '../../components/SweetAlertModal';
import '../../global.css';
import supabase from '../../utils/supabase';

interface Site {
  id: string;
  name: string;
  company_id?: string; 
  company?: string; 
  branch_id?: string;
  
  status: string;
  latitude?: number;
  longitude?: number;
  members_count?: number | null;
}

interface SiteManagementProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

interface ValidationErrors {
  siteName?: string;
  company?: string;
  branch_id?: string;
  // Removed members validation
  location?: string;
}

export default function SiteManagement({ onNavigate, setIsMobileMenuOpen }: SiteManagementProps) {
  const PAGE_SIZE = 10;

  const windowWidth = Dimensions.get('window').width;
  const isWebView = windowWidth > 900;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const openMenu = () => {
    if (setIsMobileMenuOpen) return setIsMobileMenuOpen(true);
    return setIsDrawerOpen(true);
  };
  const closeMenu = () => {
    if (setIsMobileMenuOpen) return setIsMobileMenuOpen(false);
    return setIsDrawerOpen(false);
  };
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewLocationOpen, setIsViewLocationOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Pagination (desktop table only)
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(sites.length / PAGE_SIZE));
  }, [sites.length]);

  useEffect(() => {
    // Clamp to valid page whenever site count changes
    setCurrentPage((p) => Math.min(Math.max(p, 1), totalPages));
  }, [totalPages]);

  const paginatedSites = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sites.slice(start, start + PAGE_SIZE);
  }, [sites, currentPage]);

  const showingCount = useMemo(() => {
    if (sites.length === 0) return 0;
    const end = currentPage * PAGE_SIZE;
    return Math.min(end, sites.length);
  }, [sites.length, currentPage]);
  
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
  
  // Form state
  const [siteName, setSiteName] = useState('');
  const [company, setCompany] = useState(''); // stores company id
    const [branch_id, setBranchId] = useState('');
  // Removed members state
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
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
  const editMapRef = useRef<any>(null);
  const editMarkerRef = useRef<any>(null);

  // Real-time subscription to sites table
  useEffect(() => {
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

    fetchSites();

    // Subscribe to real-time changes using modern Supabase API
    const channel = supabase
      .channel('public:sites')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sites' },
        (payload: any) => {
          // Update sites list in real-time
          if (payload.eventType === 'INSERT') {
            setSites(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setSites(prev =>
              prev.map(site => (site.id === payload.new.id ? payload.new : site))
            );
          } else if (payload.eventType === 'DELETE') {
            setSites(prev => prev.filter(site => site.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
        if (!g || !g.maps) return;

        // Clear existing map
        if (mapRef.current) {
          mapRef.current = null;
        }
        if (markerRef.current) {
          try { markerRef.current.setMap(null); } catch {}
          markerRef.current = null;
        }

        const iliganLat = 8.2280;
        const iliganLng = 124.2452;

        const mapEl = document.getElementById('leaflet-map');
        if (!mapEl) return;

        const map = new g.maps.Map(mapEl, {
          center: { lat: iliganLat, lng: iliganLng },
          zoom: 13,
          mapTypeControl: false,
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
        });

        map.addListener('click', (e: any) => {
          const pos = e.latLng;
          marker.setPosition(pos);
          setLatitude(pos.lat());
          setLongitude(pos.lng());
        });

        mapRef.current = map;
        markerRef.current = marker;
      };

      loadGoogleMaps();
    }

    // Cleanup when modal closes
    return () => {
      if (markerRef.current) {
        try { markerRef.current.setMap(null); } catch {}
        markerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current = null;
      }
    };
  }, [isAddModalOpen]);

  // Initialize edit map using Google Maps
  useEffect(() => {
    if (isEditModalOpen && selectedSite && typeof window !== 'undefined') {
      const API_KEY = 'AIzaSyAq58TD9PputxnK8ZO9jRUX8KW7bTuPTPQ';

      const loadGoogleMaps = () => {
        if ((window as any).google && (window as any).google.maps) {
          initEditMap();
          return;
        }

        const scriptId = 'gmaps-script';
        if (document.getElementById(scriptId)) {
          const check = setInterval(() => {
            if ((window as any).google && (window as any).google.maps) {
              clearInterval(check);
              initEditMap();
            }
          }, 100);
          return;
        }

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => initEditMap();
        document.head.appendChild(script);
      };

      const initEditMap = () => {
        const g = (window as any).google;
        if (!g || !g.maps) return;

        // Clear existing map
        if (editMapRef.current) {
          editMapRef.current = null;
        }
        if (editMarkerRef.current) {
          try { editMarkerRef.current.setMap(null); } catch { }
          editMarkerRef.current = null;
        }

        const lat = selectedSite.latitude || 8.2280;
        const lng = selectedSite.longitude || 124.2452;

        const mapEl = document.getElementById('edit-leaflet-map');
        if (!mapEl) return;

        const map = new g.maps.Map(mapEl, {
          center: { lat, lng },
          zoom: 13,
          mapTypeControl: false,
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
        });

        map.addListener('click', (e: any) => {
          const pos = e.latLng;
          marker.setPosition(pos);
          setLatitude(pos.lat());
          setLongitude(pos.lng());
        });

        editMapRef.current = map;
        editMarkerRef.current = marker;
      };

      loadGoogleMaps();
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

  // Initialize view location map using Google Maps
  useEffect(() => {
    if (isViewLocationOpen && selectedSite && typeof window !== 'undefined') {
      const initViewMap = () => {
        const g = (window as any).google;
        if (!g || !g.maps) return;

        // Clear existing map
        if (viewMapRef.current) {
          viewMapRef.current = null;
        }
        if (viewMarkerRef.current) {
          try { viewMarkerRef.current.setMap(null); } catch { }
          viewMarkerRef.current = null;
        }

        const lat = selectedSite.latitude || 8.2280;
        const lng = selectedSite.longitude || 124.2452;

        const mapEl = document.getElementById('view-leaflet-map');
        if (!mapEl) return;

        const map = new g.maps.Map(mapEl, {
          center: { lat, lng },
          zoom: 15,
          mapTypeControl: false,
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
        if (!value.trim()) {
          return 'Site name is required';
        }
        if (value.trim().length < 3) {
          return 'Site name must be at least 3 characters';
        }
        if (value.trim().length > 50) {
          return 'Site name must not exceed 50 characters';
        }
        // Check for duplicate site names (exclude current site when editing)
        const isDuplicate = sites.some(site => 
          site.name.toLowerCase() === value.trim().toLowerCase() && 
          site.id !== selectedSite?.id
        );
        if (isDuplicate) {
          return 'A site with this name already exists';
        }
        return undefined;

      case 'company':
        // No validation for company name
        return undefined;

      case 'branch':
          // No validation for branch/department
          return undefined;

      case 'members':
        if (value && value.trim() !== '') {
          const num = parseInt(value);
          if (isNaN(num)) {
            return 'Members must be a valid number';
          }
          if (num < 0) {
            return 'Members cannot be negative';
          }
          if (num > 1000) {
            return 'Members cannot exceed 1000';
          }
        }
        return undefined;

      default:
        return undefined;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {
      siteName: validateField('siteName', siteName),
      company: validateField('company', company),
      branch_id: validateField('branch_id', branch_id),
    };

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
        break;
      case 'company':
        setCompany(value);
        // Remove error if valid option selected
        if (value && companyOptions.some(opt => opt.id === value)) {
          setErrors(prev => ({ ...prev, company: undefined }));
        }
        break;
      case 'branch_id':
        setBranchId(value);
        break;
      // Removed members field change
    }

    // Validate the field if it's been touched
    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  };
  // Auto-fill site name with coordinates when map is clicked or marker is dragged
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      setSiteName(`Site (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
    }
  }, [latitude, longitude]);

  const handleFieldBlur = (fieldName: string, value: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    const error = validateField(fieldName, value);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const resetForm = () => {
    setSiteName('');
    setCompany('');
    setBranchId('');
    // Removed members reset
    setLatitude(null);
    setLongitude(null);
    setErrors({});
    setTouched({});
    setSelectedSite(null);
  };

  const handleAddSite = async () => {
    if (!validateForm()) {
      showAlert('Validation Error', 'Please fix the errors before submitting', 'error');
      return;
    }

    const { error } = await supabase
      .from('sites')
      .insert([
        {
          name: siteName.trim(),
          company_id: company || null,
          branch_id: branch_id || null,
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
          action: `Added New Site: ${siteName.trim()}`,
          description: 'New site location has been added to the system',
          location: 'System',
          type: 'system',
          color: '#d1fae5',
          icon: 'add-circle-outline',
        },
      ]);
      showAlert('Success!', `${siteName.trim()} has been added successfully`, 'success');
      resetForm();
      setIsAddModalOpen(false);
      // Real-time subscription will handle the update automatically
    }
  };

  const handleEditSite = (site: Site) => {
    setSelectedSite(site);
    setSiteName(site.name);
    setCompany(site.company_id || '');
    setBranchId(site.branch_id || '');
    // Removed members edit
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

    const { error } = await supabase
      .from('sites')
      .update({
        name: siteName.trim(),
        company_id: company || null,
        branch_id: branch_id || null,
        latitude: latitude,
        longitude: longitude,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedSite.id)
      .select();

    if (error) {
      showAlert('Update Error', error.message, 'error');
    } else {
      showAlert('Updated!', `${siteName.trim()} has been updated successfully`, 'success');
      resetForm();
      setIsEditModalOpen(false);
      // Real-time subscription will handle the update automatically
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
      // Real-time subscription will handle the update automatically
    }
  };

  return (
    <View className="flex-1 bg-stone-50">
      {/* Main Content Area */}
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View
          className="px-6 pt-5 pb-4 border-b bg-[#f8fafb] border-slate-200"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity
                className="items-center justify-center mr-3 lg:hidden w-9 h-9"
                onPress={openMenu}
              >
                <Ionicons name="menu" size={28} color="#237227" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="mb-1 text-xl font-light lg:text-3xl text-stone-900">Site Management</Text>
                <Text className="text-xs lg:text-base text-stone-900">Welcome back, Administrator</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                className="relative items-center justify-center w-10 h-10 rounded-full bg-[#f8fafb]"
                onPress={() => setIsNotificationOpen(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={20} color="#4b5563" />
                <View className="absolute w-2 h-2 rounded-full top-2 right-2 bg-[#237227]" />
              </TouchableOpacity>
              {/* Notification Modal */}
              <Modal
                visible={isNotificationOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsNotificationOpen(false)}
              >
                <Pressable className="items-center justify-center flex-1 px-5 bg-black/30" onPress={() => setIsNotificationOpen(false)}>
                  <View className="w-full max-w-xs overflow-hidden bg-white shadow-2xl rounded-2xl">
                    <View className="items-center px-6 pt-6 pb-4 border-b border-stone-100">
                      <View className="items-center justify-center w-12 h-12 mb-3 rounded-full bg-[#237227]">
                        <Ionicons name="notifications" size={22} color="#f8fafb" />
                      </View>
                      <Text className="text-base font-bold text-stone-900">Notifications</Text>
                    </View>
                    <View className="items-center px-6 py-5">
                      <Text className="text-sm text-center text-stone-400">You have no new notifications.</Text>
                    </View>
                    <View className="px-6 pb-6">
                      <TouchableOpacity
                        className="items-center w-full py-3 rounded-lg bg-[#237227] shadow-sm"
                        onPress={() => setIsNotificationOpen(false)}
                      >
                        <Text className="text-sm font-semibold text-white">Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Pressable>
              </Modal>
              <View
                className="items-center justify-center w-10 h-10 rounded-full bg-[#237227]"
              >
                <Text className="text-sm font-medium text-[#f8fafb]">
                  AD
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Row */}
        <View className="flex-row items-center justify-between px-6 pt-4 pb-3">
          <View className="flex-row items-center gap-2">
            <View className="rounded-lg px-3 py-1.5 flex-row items-center gap-1.5 bg-[#e8f5e9] border border-[#e8f5e9]">
              <View className="w-1.5 h-1.5 rounded-full bg-[#237227]" />
              <Text className="text-xs font-semibold text-[#237227]">{sites.length} Sites</Text>
            </View>
          </View>
          <TouchableOpacity
            className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#237227] shadow-sm"
            onPress={() => setIsAddModalOpen(true)}
          >
            <Ionicons name="add" size={16} color="white" />
            <Text className="text-sm font-semibold text-white">Add Site</Text>
          </TouchableOpacity>
        </View>

        {/* Desktop Table View */}
        <View className="hidden px-6 pb-6 lg:flex">
          <View
            className="overflow-hidden bg-white border shadow-sm rounded-xl border-stone-100"
          >
            {/* Table Header */}
            <View className="flex-row items-center px-6 py-3 border-b border-gray-200 bg-gray-50">
              <Text className="flex-1 text-sm font-semibold text-gray-700">Site Name</Text>
              <Text className="flex-1 text-sm font-semibold text-gray-700">Company</Text>
              <Text className="w-32 text-sm font-semibold text-center text-gray-700">Actions</Text>
            </View>

            {/* Table Rows */}
            {sites.length === 0 ? (
              <View className="items-center px-6 py-12">
                <View className="items-center justify-center w-12 h-12 mb-3 rounded-full bg-[#237227]">
                  <Ionicons name="location-outline" size={22} color="#f8fafb" />
                </View>
                <Text className="text-sm font-medium text-stone-500">No sites found</Text>
                <Text className="mt-1 text-xs text-stone-400">Click &quot;Add Site&quot; to create your first site</Text>
              </View>
            ) : (
              paginatedSites.map((site, index) => (
                <View
                  key={site.id}
                  className={`flex-row items-center px-6 py-3.5 ${index !== paginatedSites.length - 1 ? 'border-b border-stone-50' : ''}`}
                >
                  {/* Site Name with icon */}
                  <View className="flex-1 flex-row items-center gap-2.5">
                    <View
                      className="items-center justify-center w-8 h-8 rounded-full bg-[#237227]"
                    >
                      <Ionicons name="location" size={18} color="#f8fafb" />
                    </View>
                    <Text className="text-sm font-semibold text-stone-900" numberOfLines={1}>{site.name}</Text>
                  </View>

                  {/* Company */}
                  <Text className="flex-1 text-sm text-stone-500" numberOfLines={1}>
                    {companyOptions.find(opt => String(opt.id) === String(site.company_id))?.name || '—'}
                  </Text>

                  {/* Branch */}
                  <Text className="flex-1 text-sm text-stone-500" numberOfLines={1}>
                    {branchOptions.find(opt => String(opt.id) === String(site.branch_id))?.name || '—'}
                  </Text>

                  {/* Status */}
                  <View className="w-24">
                    <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full self-start bg-[#e8f5e9] border border-[#e8f5e9]">
                      <View className="w-1.5 h-1.5 rounded-full bg-[#237227]" />
                      <Text className="text-xs font-semibold text-[#237227]">{site.status || 'Active'}</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View className="w-28 flex-row items-center justify-center gap-1.5">
                    <TouchableOpacity
                      className="items-center justify-center rounded-full w-7 h-7 bg-[#237227]"
                      onPress={() => handleEditSite(site)}
                    >
                      <Ionicons name="create-outline" size={14} color="#f8fafb" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="items-center justify-center rounded-full w-7 h-7 bg-[#237227]"
                      onPress={() => handleViewLocation(site)}
                    >
                      <Ionicons name="eye-outline" size={14} color="#f8fafb" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="items-center justify-center rounded-full w-7 h-7 bg-[#ef4444]"
                      onPress={() => handleDeleteSite(site)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#f8fafb" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {/* Table Footer */}
            {sites.length > 0 && (
              <View className="flex-row items-center justify-between px-6 py-3 border-t border-stone-100 bg-stone-50">
                <Text className="text-xs text-stone-900">
                  Showing {showingCount} of {sites.length} sites
                </Text>
                <View className="flex-row gap-1.5">
                  <TouchableOpacity
                    onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className={
                      "items-center justify-center bg-white border rounded-lg w-7 h-7 border-stone-200 " +
                      (currentPage <= 1 ? 'opacity-50' : '')
                    }
                  >
                    <Ionicons name={'chevron-back-outline' as any} size={13} color="#78716c" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className={
                      "items-center justify-center bg-white border rounded-lg w-7 h-7 border-stone-200 " +
                      (currentPage >= totalPages ? 'opacity-50' : '')
                    }
                  >
                    <Ionicons name={'chevron-forward-outline' as any} size={13} color="#78716c" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Mobile Card View - Hidden on desktop */}
        <View className="px-5 pb-6 lg:hidden">
          {sites.length === 0 ? (
            <View className="items-center py-12">
              <View className="items-center justify-center w-12 h-12 mb-3 rounded-full bg-[#237227]">
                <Ionicons name="location-outline" size={22} color="#f8fafb" />
              </View>
              <Text className="text-sm font-medium text-stone-500">No sites found</Text>
              <Text className="mt-1 text-xs text-center text-stone-400">Tap &quot;Add Site&quot; to create your first site</Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap -mx-2">
              {sites.map((site, index) => {
                const companyName = companyOptions.find(opt => String(opt.id) === String(site.company_id))?.name || String(site.company || '');
                return (
                  <View key={site.id} className="w-full px-2 mb-4 sm:w-1/2">
                    <TouchableOpacity
                      onPress={() => handleViewLocation(site)}
                      activeOpacity={0.8}
                      className="overflow-hidden bg-white border-l-4 border-r-4 border-[#237227] shadow-sm rounded-xl"
                    >
                      <View className="p-4">
                        {/* Header with site icon and menu */}
                        <View className="flex-row items-center justify-between mb-3">
                          <View className="flex-row items-center gap-3">
                            <View className="items-center justify-center w-10 h-10 rounded-full bg-[#237227]">
                              <Ionicons name="location" size={20} color="#f8fafb" />
                            </View>
                            <Text className="flex-1 text-lg font-semibold text-gray-900" numberOfLines={1}>
                              {site.name}
                            </Text>
                          </View>
                          <TouchableOpacity
                            className="p-2 rounded-full hover:bg-gray-50"
                            onPress={() => {
                              // Show action menu - you can expand this
                            }}
                          >
                            <Ionicons name="ellipsis-horizontal" size={20} color="#6b7280" />
                          </TouchableOpacity>
                        </View>

                        {/* Company info */}
                        <View className="flex-row items-center gap-2 mb-3">
                          <Ionicons name="business" size={16} color="#6b7280" />
                          <Text className="text-sm text-gray-600" numberOfLines={1}>
                            {companyName || 'No company assigned'}
                          </Text>
                        </View>

                        {/* Action buttons */}
                        <View className="flex-row gap-2 mt-2">
                          <TouchableOpacity
                            onPress={() => handleViewLocation(site)}
                            className="flex-row items-center justify-center flex-1 gap-2 px-3 py-2 rounded-lg"
                            style={{ backgroundColor: '#237227' }}
                          >
                            <Ionicons name="eye-outline" size={16} color="#f8fafb" />
                            <Text className="text-sm font-medium" style={{ color: '#f8fafb' }}>View</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteSite(site)}
                            className="flex-row items-center justify-center px-3 py-2 rounded-lg bg-red-50"
                          >
                            <Ionicons name="trash-outline" size={16} color="#dc2626" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Mobile Drawer Modal (fallback when not using AdminNavbar mobile menu) */}
      {!setIsMobileMenuOpen && (
        <Modal
          visible={isDrawerOpen}
          transparent
          animationType="fade"
          onRequestClose={closeMenu}
        >
          <View className="flex-row flex-1">
            {/* Drawer Content */}
            <View className="h-full bg-white shadow-2xl w-72">
            {/* Drawer Header */}
            <View className="px-6 pt-12 pb-5 bg-white border-b border-stone-100">
              <View className="flex-row items-center gap-3">
                <View className="items-center justify-center w-10 h-10 rounded-full bg-[#237227]">
                  <Ionicons name="radio" size={18} color="#f8fafb" />
                </View>
                <View>
                  <Text className="text-base font-bold tracking-tight text-stone-900">Admin Portal</Text>
                  <Text className="text-xs font-medium text-stone-400">Monitoring System</Text>
                </View>
              </View>
            </View>

            {/* Menu Items */}
            <ScrollView className="flex-1 px-3 py-4">
              <Text className="px-3 mb-2 text-xs font-semibold tracking-widest uppercase text-stone-400">Navigation</Text>
              {/* Dashboard */}
              <TouchableOpacity
                className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg"
                onPress={() => { closeMenu(); onNavigate('dashboard'); }}
              >
                <Ionicons name="grid-outline" size={18} color="#78716c" />
                <Text className="ml-3 text-sm font-medium text-stone-600">Dashboard</Text>
              </TouchableOpacity>

              {/* Site Management */}
              <TouchableOpacity
                className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg relative overflow-hidden"
                onPress={() => { closeMenu(); onNavigate('siteManagement'); }}
              >
                <View className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-[#237227]" />
                <View className="items-center justify-center mr-3 rounded-full w-7 h-7 bg-[#237227]">
                  <Ionicons name="location" size={16} color="#f8fafb" />
                </View>
                <Text className="text-sm font-semibold text-[#237227]">Site Management</Text>
              </TouchableOpacity>

              {/* Walkie Talkie */}
              <TouchableOpacity
                className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg"
                onPress={() => { closeMenu(); onNavigate('walkieTalkie'); }}
              >
                <Ionicons name="mic-outline" size={18} color="#78716c" />
                <Text className="ml-3 text-sm font-medium text-stone-600">Walkie Talkie</Text>
              </TouchableOpacity>

              {/* Activity Logs */}
              <TouchableOpacity
                className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg"
                onPress={() => { closeMenu(); onNavigate('activityLogs'); }}
              >
                <Ionicons name="clipboard-outline" size={18} color="#78716c" />
                <Text className="ml-3 text-sm font-medium text-stone-600">Activity Logs</Text>
              </TouchableOpacity>

              {/* Company Lists */}
              <TouchableOpacity
                className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg"
                onPress={() => { closeMenu(); onNavigate('companyList'); }}
              >
                <Ionicons name="business-outline" size={18} color="#78716c" />
                <Text className="ml-3 text-sm font-medium text-stone-600">Company Lists</Text>
              </TouchableOpacity>

              {/* Employees */}
              <TouchableOpacity
                className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg"
                onPress={() => { closeMenu(); onNavigate('employee'); }}
              >
                <Ionicons name="people-outline" size={18} color="#78716c" />
                <Text className="ml-3 text-sm font-medium text-stone-600">Employees</Text>
              </TouchableOpacity>

              <View className="my-3 border-t border-stone-100" />

              {/* Settings */}
              <TouchableOpacity className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg" onPress={() => { closeMenu(); onNavigate('settings'); }}>
                <Ionicons name="settings-outline" size={18} color="#78716c" />
                <Text className="ml-3 text-sm font-medium text-stone-600">Settings</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Sign Out */}
            <View className="px-3 pt-3 pb-6 border-t border-stone-100">
              <TouchableOpacity className="flex-row items-center px-3 py-2.5 rounded-lg bg-red-50">
                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                <Text className="ml-3 text-sm font-semibold text-red-500">Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Overlay - Close drawer when tapped */}
          <Pressable 
            className="flex-1 bg-black/40" 
            onPress={closeMenu}
          />
          </View>
        </Modal>
      )}

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
          className="items-center justify-center flex-1 px-6 bg-black/50"
          onPress={() => {
            setIsAddModalOpen(false);
            resetForm();
          }}
        >
          <Pressable className="w-full max-w-md bg-white rounded-2xl" onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <View className="px-6 pt-6 pb-4 border-b border-stone-100">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold text-stone-900">Add New Site</Text>
                  <Text className="mt-1 text-xs text-stone-500">Fill in the site details below</Text>
                </View>
                <TouchableOpacity 
                  className="items-center justify-center w-8 h-8"
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
                <Text className="mb-2 text-xs font-semibold tracking-wide uppercase text-stone-500">
                  Site Name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-stone-50 border ${
                    touched.siteName && errors.siteName ? 'border-red-400' : 'border-stone-100'
                  } rounded-lg px-4 py-3 text-stone-900 text-sm`}
                  value={siteName}
                  editable={false}
                  selectTextOnFocus={false}
                />
                {touched.siteName && errors.siteName && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.siteName}</Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">Auto-filled from map coordinates</Text>
              </View>

              {/* Company */}
              <View className="mb-4">
                <Text className="mb-2 text-xs font-semibold tracking-wide uppercase text-stone-500">
                  Company Name <Text className="text-red-500">*</Text>
                </Text>
                <View className={`bg-stone-50 border ${
                  touched.company && errors.company ? 'border-red-400' : 'border-stone-100'
                } rounded-lg px-4 py-3`}>
                  <select
                    className="w-full text-sm bg-transparent border-0 outline-none text-stone-700"
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
                    <Ionicons name="alert-circle" size={14} color="#ef4444" />
                    <Text className="ml-1 text-xs text-red-500">{errors.company}</Text>
                  </View>
                )}
              </View>

              {/* Branch */}
              <View className="mb-4">
                <Text className="mb-2 text-xs font-semibold tracking-wide uppercase text-stone-500">
                  Branch/Department
                </Text>
                <View className={`bg-stone-50 border ${
                  touched.branch_id && errors.branch_id ? 'border-red-400' : 'border-stone-100'
                } rounded-lg px-4 py-3`}>
                  <select
                    className="w-full text-sm bg-transparent border-0 outline-none text-stone-700"
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
                    <Ionicons name="alert-circle" size={14} color="#ef4444" />
                    <Text className="ml-1 text-xs text-red-500">{errors.branch_id}</Text>
                  </View>
                )}
              </View>

              {/* Location Map */}
              <View className="mb-1">
                <Text className="mb-2 text-xs font-semibold tracking-wide uppercase text-stone-500">
                  Location <Text className="text-red-500">*</Text>
                </Text>
                <View 
                  id="leaflet-map" 
                  className={`h-[200px] w-full rounded-xl overflow-hidden border ${touched.location && errors.location ? 'border-red-600' : 'border-stone-300'}`}
                />
                {touched.location && errors.location && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.location}</Text>
                  </View>
                )}
                {latitude !== null && longitude !== null && (
                  <View className="px-3 py-2 mt-2 rounded-lg bg-stone-50">
                    <Text className="text-xs text-stone-600">
                      <Text className="font-semibold">Coordinates:</Text> {latitude.toFixed(6)}, {longitude.toFixed(6)}
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

            {/* Action Buttons */}
            <View className="px-6 pt-4 pb-6 border-t border-stone-100">
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 py-3 rounded-lg bg-[#f8fafb] border border-[#237227] active:opacity-80"
                  onPress={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                >
                  <Text className="text-sm font-semibold text-center text-black">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-3 rounded-lg bg-[#237227]  active:opacity-80"
                  onPress={handleAddSite}
                >
                  <Text className="text-sm font-semibold text-center text-white">Add Site</Text>
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
          className="items-center justify-center flex-1 px-6 bg-black/50"
          onPress={() => {
            setIsEditModalOpen(false);
            resetForm();
          }}
        >
          <Pressable className="w-full max-w-md bg-white rounded-2xl" onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
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
                <Text className="mb-2 text-xs font-semibold tracking-wide uppercase text-stone-500">
                  Site Name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-stone-50 border ${
                    touched.siteName && errors.siteName ? 'border-red-400' : 'border-stone-100'
                  } rounded-lg px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., Downtown Office"
                  placeholderTextColor="#a8a29e"
                  value={siteName}
                  onChangeText={(value) => handleFieldChange('siteName', value)}
                  onBlur={() => handleFieldBlur('siteName', siteName)}
                  maxLength={50}
                />
                {touched.siteName && errors.siteName && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.siteName}</Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">{siteName.length}/50 characters</Text>
              </View>

              {/* Company */}
              <View className="mb-4">
                <Text className="mb-2 text-xs font-semibold tracking-wide uppercase text-stone-500">
                  Company Name <Text className="text-red-500">*</Text>
                </Text>
                <View className={`bg-stone-50 border ${
                  touched.company && errors.company ? 'border-red-400' : 'border-stone-100'
                } rounded-lg px-4 py-3`}>
                  <select
                    className="w-full text-sm bg-transparent border-0 outline-none text-stone-700"
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
                    <Ionicons name="alert-circle" size={14} color="#ef4444" />
                    <Text className="ml-1 text-xs text-red-500">{errors.company}</Text>
                  </View>
                )}
              </View>

              {/* Branch */}
              <View className="mb-4">
                <Text className="mb-2 text-xs font-semibold tracking-wide uppercase text-stone-500">
                  Branch/Department <Text className="text-red-500">*</Text>
                </Text>
                <View className={`bg-stone-50 border ${
                  touched.branch_id && errors.branch_id ? 'border-red-400' : 'border-stone-100'
                } rounded-lg px-4 py-3`}>
                  <select
                    className="w-full text-sm bg-transparent border-0 outline-none text-stone-700"
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
                    <Ionicons name="alert-circle" size={14} color="#ef4444" />
                    <Text className="ml-1 text-xs text-red-500">{errors.branch_id}</Text>
                  </View>
                )}
              </View>

              {/* Location Map */}
              <View className="mb-1">
                <Text className="mb-2 text-xs font-semibold tracking-wide uppercase text-stone-500">
                  Location <Text className="text-red-500">*</Text>
                </Text>
                <View 
                  id="edit-leaflet-map" 
                  className={`h-[200px] w-full rounded-xl overflow-hidden border ${touched.location && errors.location ? 'border-red-600' : 'border-stone-300'}`}
                />
                {touched.location && errors.location && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.location}</Text>
                  </View>
                )}
                {latitude !== null && longitude !== null && (
                  <View className="px-3 py-2 mt-2 rounded-lg bg-stone-50">
                    <Text className="text-xs text-stone-600">
                      <Text className="font-semibold">Coordinates:</Text> {latitude.toFixed(6)}, {longitude.toFixed(6)}
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

            {/* Action Buttons */}
            <View className="px-6 pt-4 pb-6 border-t border-stone-100">
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 py-3 rounded-lg bg-[#f8fafb] border border-[#237227] active:opacity-80"
                  onPress={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                >
                  <Text className="text-sm font-semibold text-center text-black">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-3 rounded-lg bg-[#237227] shadow-sm active:opacity-80"
                  onPress={handleUpdateSite}
                >
                  <Text className="text-sm font-semibold text-center text-white">Update Site</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* View Location Modal */}
      <Modal
        visible={isViewLocationOpen}
        transparent={isWebView}
        animationType={isWebView ? "fade" : "slide"}
        onRequestClose={() => {
          setIsViewLocationOpen(false);
          setSelectedSite(null);
        }}
      >
        {isWebView ? (
          // Desktop view - centered modal
          <Pressable
            className="items-center justify-center flex-1 px-6 bg-black/50"
            onPress={() => {
              setIsViewLocationOpen(false);
              setSelectedSite(null);
            }}
          >
            <Pressable className="w-full max-w-2xl bg-white rounded-2xl" onPress={(e) => e.stopPropagation()}>
              {/* Modal Header */}
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
                    }}
                  >
                    <Ionicons name="close" size={24} color="#78716c" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Map Content */}
              <View className="px-6 py-5">
                <View className="relative">
                  <View
                    id="view-leaflet-map"
                    className="h-[400px] w-full rounded-xl overflow-hidden border border-stone-300"
                  />
                </View>
              </View>

              {/* Close Button */}
              <View className="px-6 pt-4 pb-6 border-t border-stone-100">
                <TouchableOpacity
                  className="py-3 rounded-lg bg-[#237227] shadow-sm active:opacity-80"
                  onPress={() => {
                    setIsViewLocationOpen(false);
                    setSelectedSite(null);
                  }}
                >
                  <Text className="text-sm font-semibold text-center text-white">Close</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        ) : (
          // Mobile view - full screen with enhanced design
          <View className="flex-1 bg-[#f8fafb]">
            {/* Enhanced Header with Gradient */}
            <View className="px-4 pt-12 pb-4 border-b border-stone-200" style={{backgroundColor: '#f8fafb'}}>
              <View className="flex-row items-center justify-between">
                <TouchableOpacity
                  onPress={() => {
                    setIsViewLocationOpen(false);
                    setSelectedSite(null);
                  }}
                  className="items-center justify-center w-10 h-10 rounded-full bg-[#237227]"
                >
                  <Ionicons name="arrow-back" size={22} color="#f8fafb" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-black">Site Details</Text>
                <View className="w-10 h-10" />
              </View>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {/* Map Section with Floating Card */}
              <View className="relative bg-white">
                <View
                  id="view-leaflet-map"
                  className="h-[320px] w-full"
                />

                {/* Floating Quick Stats Card */}
                <View className="absolute bottom-4 left-4 right-4">
                  <View className="p-4 border shadow-lg bg-white/95 backdrop-blur-lg rounded-2xl border-white/50">
                    <View className="flex-row items-center">
                      <View className="items-center justify-center w-10 h-10 rounded-full bg-[#237227] mr-3">
                        <Ionicons name="location" size={20} color="#f8fafb" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs font-semibold tracking-wide uppercase text-stone-400">Coordinates</Text>
                        <Text className="text-sm font-bold text-stone-900 mt-0.5">
                          {selectedSite?.latitude?.toFixed(4)}, {selectedSite?.longitude?.toFixed(4)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Site Details */}
              <View className="px-4 pt-6 pb-4 bg-[#f8fafb]">
                <Text className="text-2xl font-bold text-stone-900">{selectedSite?.name}</Text>
                <View className="flex-row items-center mt-2">
                  <Ionicons name="business-outline" size={16} color="#64748b" />
                  <Text className="ml-2 text-sm text-stone-500">
                    {companyOptions.find(opt => String(opt.id) === String(selectedSite?.company_id))?.name || 'No company'}
                  </Text>
                </View>
              </View>

              {/* Information Cards */}
              <View className="gap-3 px-4 pb-6">
                {/* Branch Card */}
                <View className="bg-white rounded-xl shadow-sm overflow-hidden border-l-4 border-r-4 border-[#237227]">
                  <View className="flex-row items-center p-4">
                    <View className="items-center justify-center w-12 h-12 rounded-full bg-[#237227] mr-4">
                      <Ionicons name="git-branch-outline" size={22} color="#f8fafb" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-semibold tracking-wider uppercase text-stone-400">Main Branch</Text>
                      <Text className="mt-1.5 text-base font-semibold text-stone-900">
                        {branchOptions.find(opt => String(opt.id) === String(selectedSite?.branch_id))?.name || 'No branch selected'}
                      </Text>
                    </View>
                  </View>
                </View>

              
                {/* Status Card */}
                <View className="bg-white rounded-xl shadow-sm overflow-hidden border-l-4 border-r-4 border-[#237227]">
                  <View className="flex-row items-center p-4">
                    <View className="items-center justify-center w-12 h-12 rounded-full bg-[#237227] mr-4">
                      <Ionicons name="checkmark-circle-outline" size={22} color="#f8fafb" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-semibold tracking-wider uppercase text-stone-400">Status</Text>
                      <Text className="mt-1.5 text-base font-semibold text-stone-900">
                        {selectedSite?.status ? selectedSite.status.charAt(0).toUpperCase() + selectedSite.status.slice(1) : 'Active'}
                      </Text>
                    </View>
                    <View className="w-2 h-2 rounded-full bg-[#237227] animate-pulse" />
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View className="px-4 pb-8">
                <TouchableOpacity
                  className="flex-row items-center justify-center py-4 bg-[#237227] rounded-xl shadow-sm active:opacity-80"
                  onPress={() => {
                    handleEditSite(selectedSite as Site);
                    setIsViewLocationOpen(false);
                  }}
                >
                  <Ionicons name="create-outline" size={20} color="#ffffff" />
                  <Text className="ml-2 text-base font-semibold text-white">Edit Site</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
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