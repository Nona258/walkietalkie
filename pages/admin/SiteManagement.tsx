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
  // Removed members validation
  location?: string;
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

  // Real-time subscription to sites table
  useEffect(() => {
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
          try { markerRef.current.setMap(null); } catch (e) {}
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
        try { markerRef.current.setMap(null); } catch (e) {}
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
        <View className="bg-white px-6 pt-5 pb-4 border-b border-stone-100">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity
                className="lg:hidden w-9 h-9 items-center justify-center mr-3"
                onPress={() => setIsDrawerOpen(true)}
              >
                <Ionicons name="menu" size={22} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-xl font-bold text-stone-900 tracking-tight">Site Management</Text>
                <Text className="text-stone-400 text-xs mt-0.5 font-medium">Manage and monitor your sites</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                className="w-9 h-9 bg-stone-50 border border-stone-100 rounded-lg items-center justify-center"
                onPress={() => setIsNotificationOpen(true)}
                activeOpacity={0.7}
              >
                <View className="w-2 h-2 bg-red-400 rounded-full absolute top-1.5 right-1.5" />
                <Ionicons name="notifications-outline" size={17} color="#78716c" />
              </TouchableOpacity>
              {/* Notification Modal */}
              <Modal
                visible={isNotificationOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsNotificationOpen(false)}
              >
                <Pressable className="flex-1 bg-black/30 justify-center items-center px-5" onPress={() => setIsNotificationOpen(false)}>
                  <View className="bg-white w-full max-w-xs rounded-2xl overflow-hidden" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40 }}>
                    <View className="px-6 pt-6 pb-4 items-center border-b border-stone-100">
                      <View className="w-12 h-12 bg-emerald-50 rounded-xl items-center justify-center mb-3">
                        <Ionicons name="notifications" size={22} color="#10b981" />
                      </View>
                      <Text className="font-bold text-stone-900 text-base">Notifications</Text>
                    </View>
                    <View className="px-6 py-5 items-center">
                      <Text className="text-stone-400 text-sm text-center">You have no new notifications.</Text>
                    </View>
                    <View className="px-6 pb-6">
                      <TouchableOpacity className="bg-emerald-500 w-full py-3 rounded-lg items-center" onPress={() => setIsNotificationOpen(false)}>
                        <Text className="text-white font-semibold text-sm">Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Pressable>
              </Modal>
              <View className="flex-row items-center gap-2 bg-stone-50 border border-stone-100 rounded-lg px-2.5 py-1.5">
                <View className="w-6 h-6 bg-emerald-500 rounded-md items-center justify-center">
                  <Text className="text-white font-bold text-xs">AD</Text>
                </View>
                <View className="hidden lg:flex">
                  <Text className="text-xs font-semibold text-stone-800">Admin User</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Action Row */}
        <View className="px-6 pt-4 pb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 flex-row items-center gap-1.5">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <Text className="text-xs font-semibold text-emerald-700">{sites.length} Sites</Text>
            </View>
          </View>
          <TouchableOpacity
            className="flex-row items-center gap-1.5 bg-emerald-500 px-3.5 py-2 rounded-lg"
            style={{ shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 }}
            onPress={() => setIsAddModalOpen(true)}
          >
            <Ionicons name="add" size={16} color="white" />
            <Text className="text-white font-semibold text-sm">Add Site</Text>
          </TouchableOpacity>
        </View>

        {/* Desktop Table View */}
        <View className="hidden lg:flex px-6 pb-6">
          <View
            className="bg-white rounded-xl border border-stone-100 overflow-hidden"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}
          >
            {/* Table Header */}
            <View className="flex-row items-center px-6 py-3 bg-stone-50 border-b border-stone-100">
              <Text className="flex-1 text-xs font-semibold text-stone-400 uppercase tracking-widest">Site Name</Text>
              <Text className="flex-1 text-xs font-semibold text-stone-400 uppercase tracking-widest">Company</Text>
              <Text className="flex-1 text-xs font-semibold text-stone-400 uppercase tracking-widest">Branch</Text>
              <Text className="w-24 text-xs font-semibold text-stone-400 uppercase tracking-widest">Status</Text>
              <Text className="w-28 text-xs font-semibold text-stone-400 uppercase tracking-widest text-center">Actions</Text>
            </View>

            {/* Table Rows */}
            {sites.length === 0 ? (
              <View className="px-6 py-12 items-center">
                <View className="w-12 h-12 bg-stone-50 rounded-xl items-center justify-center mb-3">
                  <Ionicons name="location-outline" size={22} color="#d6d3d1" />
                </View>
                <Text className="text-stone-500 text-sm font-medium">No sites found</Text>
                <Text className="text-stone-400 text-xs mt-1">Click "Add Site" to create your first site</Text>
              </View>
            ) : (
              sites.map((site, index) => (
                <View
                  key={site.id}
                  className={`flex-row items-center px-6 py-3.5 ${index !== sites.length - 1 ? 'border-b border-stone-50' : ''}`}
                >
                  {/* Site Name with icon */}
                  <View className="flex-1 flex-row items-center gap-2.5">
                    <View className="w-8 h-8 bg-emerald-50 rounded-lg items-center justify-center">
                      <Ionicons name="location" size={14} color="#10b981" />
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
                    <View className="flex-row items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full self-start">
                      <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <Text className="text-emerald-700 text-xs font-semibold">{site.status || 'Active'}</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View className="w-28 flex-row items-center justify-center gap-1.5">
                    <TouchableOpacity
                      className="w-7 h-7 bg-stone-50 border border-stone-100 items-center justify-center rounded-lg"
                      onPress={() => handleEditSite(site)}
                    >
                      <Ionicons name="create-outline" size={14} color="#78716c" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="w-7 h-7 bg-stone-50 border border-stone-100 items-center justify-center rounded-lg"
                      onPress={() => handleViewLocation(site)}
                    >
                      <Ionicons name="eye-outline" size={14} color="#78716c" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="w-7 h-7 bg-red-50 border border-red-100 items-center justify-center rounded-lg"
                      onPress={() => handleDeleteSite(site)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#ef4444" />
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
            <View className="py-12 items-center">
              <View className="w-12 h-12 bg-stone-50 rounded-xl items-center justify-center mb-3">
                <Ionicons name="location-outline" size={22} color="#d6d3d1" />
              </View>
              <Text className="text-stone-500 text-sm font-medium">No sites found</Text>
              <Text className="text-stone-400 text-xs mt-1 text-center">Tap "Add Site" to create your first site</Text>
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
            <View className="bg-white px-6 pt-12 pb-5 border-b border-stone-100">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 bg-emerald-500 rounded-xl items-center justify-center">
                  <Ionicons name="radio" size={18} color="white" />
                </View>
                <View>
                  <Text className="text-base font-bold text-stone-900 tracking-tight">Admin Portal</Text>
                  <Text className="text-xs text-stone-400 font-medium">Monitoring System</Text>
                </View>
              </View>
            </View>

            {/* Menu Items */}
            <ScrollView className="flex-1 px-3 py-4">
              <Text className="text-xs font-semibold text-stone-400 uppercase tracking-widest px-3 mb-2">Navigation</Text>
              {/* Dashboard */}
              <TouchableOpacity
                className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg"
                onPress={() => { setIsDrawerOpen(false); onNavigate('dashboard'); }}
              >
                <Ionicons name="grid-outline" size={18} color="#78716c" />
                <Text className="ml-3 text-stone-600 font-medium text-sm">Dashboard</Text>
              </TouchableOpacity>

              {/* Site Management */}
              <TouchableOpacity
                className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg bg-emerald-50 relative overflow-hidden"
                onPress={() => { setIsDrawerOpen(false); onNavigate('siteManagement'); }}
              >
                <View className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-full" />
                <View className="w-7 h-7 bg-emerald-100 rounded-md items-center justify-center mr-3">
                  <Ionicons name="location" size={16} color="#10b981" />
                </View>
                <Text className="text-emerald-700 font-semibold text-sm">Site Management</Text>
              </TouchableOpacity>

              {/* Walkie Talkie */}
              <TouchableOpacity
                className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg"
                onPress={() => { setIsDrawerOpen(false); onNavigate('walkieTalkie'); }}
              >
                <Ionicons name="mic-outline" size={18} color="#78716c" />
                <Text className="ml-3 text-stone-600 font-medium text-sm">Walkie Talkie</Text>
              </TouchableOpacity>

              {/* Activity Logs */}
              <TouchableOpacity
                className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg"
                onPress={() => { setIsDrawerOpen(false); onNavigate('activityLogs'); }}
              >
                <Ionicons name="clipboard-outline" size={18} color="#78716c" />
                <Text className="ml-3 text-stone-600 font-medium text-sm">Activity Logs</Text>
              </TouchableOpacity>

              {/* Company Lists */}
              <TouchableOpacity
                className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg"
                onPress={() => { setIsDrawerOpen(false); onNavigate('companyList'); }}
              >
                <Ionicons name="business-outline" size={18} color="#78716c" />
                <Text className="ml-3 text-stone-600 font-medium text-sm">Company Lists</Text>
              </TouchableOpacity>

              {/* Employees */}
              <TouchableOpacity
                className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg"
                onPress={() => { setIsDrawerOpen(false); onNavigate('employee'); }}
              >
                <Ionicons name="people-outline" size={18} color="#78716c" />
                <Text className="ml-3 text-stone-600 font-medium text-sm">Employees</Text>
              </TouchableOpacity>

              <View className="border-t border-stone-100 my-3" />

              {/* Settings */}
              <TouchableOpacity className="flex-row items-center px-3 py-2.5 mb-1 rounded-lg" onPress={() => onNavigate('settings')}>
                <Ionicons name="settings-outline" size={18} color="#78716c" />
                <Text className="ml-3 text-stone-600 font-medium text-sm">Settings</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Sign Out */}
            <View className="px-3 pb-6 pt-3 border-t border-stone-100">
              <TouchableOpacity className="flex-row items-center px-3 py-2.5 rounded-lg bg-red-50">
                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                <Text className="ml-3 text-red-500 font-semibold text-sm">Sign Out</Text>
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
                <Text className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
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
                    <Text className="text-xs text-red-600 ml-1">{errors.siteName}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">Auto-filled from map coordinates</Text>
              </View>

              {/* Company */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                  Company Name <Text className="text-red-500">*</Text>
                </Text>
                <View className={`bg-stone-50 border ${
                  touched.company && errors.company ? 'border-red-400' : 'border-stone-100'
                } rounded-lg px-4 py-3`}>
                  <select
                    style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 14, color: '#44403c' }}
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
                    <Text className="text-xs text-red-500 ml-1">{errors.company}</Text>
                  </View>
                )}
              </View>

              {/* Branch */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                  Branch/Department
                </Text>
                <View className={`bg-stone-50 border ${
                  touched.branch_id && errors.branch_id ? 'border-red-400' : 'border-stone-100'
                } rounded-lg px-4 py-3`}>
                  <select
                    style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 14, color: '#44403c' }}
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
                    <Text className="text-xs text-red-500 ml-1">{errors.branch_id}</Text>
                  </View>
                )}
              </View>

              {/* Location Map */}
              <View className="mb-1">
                <Text className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
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
                  className="flex-1 bg-stone-50 border border-stone-100 py-3 rounded-lg active:opacity-70"
                  onPress={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                >
                  <Text className="text-center text-stone-600 font-semibold text-sm">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-emerald-500 py-3 rounded-lg active:opacity-80"
                  style={{ shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 }}
                  onPress={handleAddSite}
                >
                  <Text className="text-center text-white font-semibold text-sm">Add Site</Text>
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
                <Text className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
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
                    <Text className="text-xs text-red-600 ml-1">{errors.siteName}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">{siteName.length}/50 characters</Text>
              </View>

              {/* Company */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                  Company Name <Text className="text-red-500">*</Text>
                </Text>
                <View className={`bg-stone-50 border ${
                  touched.company && errors.company ? 'border-red-400' : 'border-stone-100'
                } rounded-lg px-4 py-3`}>
                  <select
                    style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 14, color: '#44403c' }}
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
                    <Text className="text-xs text-red-500 ml-1">{errors.company}</Text>
                  </View>
                )}
              </View>

              {/* Branch */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                  Branch/Department <Text className="text-red-500">*</Text>
                </Text>
                <View className={`bg-stone-50 border ${
                  touched.branch_id && errors.branch_id ? 'border-red-400' : 'border-stone-100'
                } rounded-lg px-4 py-3`}>
                  <select
                    style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 14, color: '#44403c' }}
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
                    <Text className="text-xs text-red-500 ml-1">{errors.branch_id}</Text>
                  </View>
                )}
              </View>

              {/* Location Map */}
              <View className="mb-1">
                <Text className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
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
                  className="flex-1 bg-stone-50 border border-stone-100 py-3 rounded-lg active:opacity-70"
                  onPress={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                >
                  <Text className="text-center text-stone-600 font-semibold text-sm">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-emerald-500 py-3 rounded-lg active:opacity-80"
                  style={{ shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 }}
                  onPress={handleUpdateSite}
                >
                  <Text className="text-center text-white font-semibold text-sm">Update Site</Text>
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
                className="bg-emerald-500 py-3 rounded-lg active:opacity-80"
                style={{ shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 }}
                onPress={() => {
                  setIsViewLocationOpen(false);
                  setSelectedSite(null);
                }}
              >
                <Text className="text-center text-white font-semibold text-sm">Close</Text>
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