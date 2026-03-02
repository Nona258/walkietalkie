import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native';
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
}

interface SiteManagementProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}

interface ValidationErrors {
  siteName?: string;
  company?: string;
  branch_id?: string;
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
  
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
  });
  
  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  const [siteName, setSiteName] = useState('');
  const [company, setCompany] = useState('');
  const [branch_id, setBranchId] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [branchOptions, setBranchOptions] = useState<{id: string, name: string, company_id?: string}[]>([]);
  const [companyOptions, setCompanyOptions] = useState<{id: string, name: string, industry: string}[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const viewMapRef = useRef<any>(null);
  const viewMarkerRef = useRef<any>(null);
  const editMapRef = useRef<any>(null);
  const editMarkerRef = useRef<any>(null);

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

  // Fetch branches
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

  // Initialize Google Maps for add modal
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

  // Initialize edit map
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

  // Initialize view map
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
        const isDuplicate = sites.some(site => 
          site.name.toLowerCase() === value.trim().toLowerCase() && 
          site.id !== selectedSite?.id
        );
        if (isDuplicate) {
          return 'A site with this name already exists';
        }
        return undefined;

      case 'company':
        return undefined;

      case 'branch':
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

    if (latitude === null || longitude === null) {
      newErrors.location = 'Please select a location on the map';
    }

    setErrors(newErrors);
    
    setTouched({
      siteName: true,
      company: true,
      branch_id: true,
      location: true,
    });

    return !Object.keys(newErrors).some((key: string) => (newErrors as any)[key] !== undefined);
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    switch (fieldName) {
      case 'siteName':
        setSiteName(value);
        break;
      case 'company':
        setCompany(value);
        if (value && companyOptions.some(opt => opt.id === value)) {
          setErrors(prev => ({ ...prev, company: undefined }));
        }
        break;
      case 'branch_id':
        setBranchId(value);
        break;
    }

    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  };

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
      await supabase.from('activity_logs').insert([
        {
          user_name: 'Admin User',
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
    const companyObj = companyOptions.find(opt => String(opt.id) === String(site.company));
    setSelectedSite({
      ...site,
      company: companyObj ? companyObj.name : site.company
    });
    setIsViewLocationOpen(true);
  };

  const handleDeleteSite = async (site: Site) => {
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
    <View className="flex-1" style={{ backgroundColor: '#f8fafb' }}>
      <ScrollView className="flex-1">
        {/* Minimalist Header */}
        <View className="px-6 py-5 bg-white border-b" style={{ borderBottomColor: '#e8f5e9' }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity 
                className="items-center justify-center w-10 h-10 mr-4 lg:hidden"
                onPress={() => setIsDrawerOpen(true)}
              >
                <Ionicons name="menu-outline" size={24} color="#237227" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-2xl font-light" style={{ color: '#000000' }}>Site Management</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                className="items-center justify-center w-10 h-10"
                onPress={() => setIsNotificationOpen(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={22} color="#237227" />
              </TouchableOpacity>
              <View className="items-center justify-center w-10 h-10 rounded-full" style={{ backgroundColor: '#e8f5e9' }}>
                <Text className="text-sm font-medium" style={{ color: '#237227' }}>AD</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Clean Action Bar */}
        <View className="px-6 py-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-light tracking-wide uppercase" style={{ color: '#000000' }}>
              All Sites ({sites.length})
            </Text>
            <TouchableOpacity 
              className="flex-row items-center px-4 py-2 rounded-lg"
              style={{ backgroundColor: '#237227' }}
              onPress={() => setIsAddModalOpen(true)}
            >
              <Ionicons name="add-outline" size={18} color="white" />
              <Text className="ml-2 text-sm font-medium text-white">Add Site</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Minimalist Desktop Table */}
        <View className="hidden px-6 pb-8 lg:flex">
          <View className="overflow-hidden bg-white" style={{ borderRadius: 8, borderWidth: 1, borderColor: '#e8f5e9' }}>
            {/* Clean Table Header */}
            <View className="flex-row items-center px-6 py-4 border-b" style={{ backgroundColor: '#f8fafb', borderBottomColor: '#e8f5e9' }}>
              <Text className="flex-1 text-xs font-medium tracking-wider uppercase" style={{ color: '#237227' }}>Site Name</Text>
              <Text className="flex-1 text-xs font-medium tracking-wider uppercase" style={{ color: '#237227' }}>Company</Text>
              <Text className="flex-1 text-xs font-medium tracking-wider uppercase" style={{ color: '#237227' }}>Branch</Text>
              <Text className="text-xs font-medium tracking-wider uppercase w-28" style={{ color: '#237227' }}>Status</Text>
              <Text className="w-32 text-xs font-medium tracking-wider text-center uppercase" style={{ color: '#237227' }}>Actions</Text>
            </View>

            {/* Table Rows */}
            {sites.length === 0 ? (
              <View className="items-center px-6 py-16">
                <Ionicons name="location-outline" size={48} color="#e8f5e9" />
                <Text className="mt-4 text-sm" style={{ color: '#237227' }}>No sites available</Text>
              </View>
            ) : (
              sites.map((site, index) => (
                <View 
                  key={site.id}
                  className={`flex-row items-center px-6 py-5 ${index !== sites.length - 1 ? 'border-b' : ''}`}
                  style={{ borderBottomColor: '#e8f5e9' }}
                >
                  {/* Site Name */}
                  <View className="flex-row items-center flex-1">
                    <View className="items-center justify-center w-8 h-8 mr-3 rounded" style={{ backgroundColor: '#e8f5e9' }}>
                      <Ionicons name="location-outline" size={16} color="#237227" />
                    </View>
                    <Text className="text-sm font-normal" style={{ color: '#237227' }}>{site.name}</Text>
                  </View>

                  {/* Company */}
                  <Text className="flex-1 text-sm" style={{ color: '#237227' }}>
                    {companyOptions.find(opt => String(opt.id) === String(site.company_id))?.name || '—'}
                  </Text>

                  {/* Branch */}
                  <Text className="flex-1 text-sm" style={{ color: '#237227' }}>
                    {branchOptions.find(opt => String(opt.id) === String(site.branch_id))?.name || '—'}
                  </Text>

                  {/* Status */}
                  <View className="w-28">
                    <View className="px-3 py-1 rounded" style={{ backgroundColor: '#e8f5e9', alignSelf: 'flex-start' }}>
                      <Text className="text-xs font-medium" style={{ color: '#237227' }}>{site.status}</Text>
                    </View>
                  </View>

                  {/* Flat Line Icon Actions */}
                  <View className="flex-row items-center justify-center w-32 gap-3">
                    <TouchableOpacity 
                      className="items-center justify-center w-8 h-8"
                      onPress={() => handleEditSite(site)}
                    >
                      <Ionicons name="create-outline" size={18} color="#237227" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="items-center justify-center w-8 h-8"
                      onPress={() => handleViewLocation(site)}
                    >
                      <Ionicons name="eye-outline" size={18} color="#237227" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="items-center justify-center w-8 h-8"
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

        {/* Mobile Card View */}
        <View className="px-5 pb-6 lg:hidden">
          {sites.length === 0 ? (
            <View className="items-center px-6 py-12">
              <Ionicons name="location-outline" size={48} color="#e8f5e9" />
              <Text className="mt-4 text-sm" style={{ color: '#237227' }}>No sites found</Text>
            </View>
          ) : (
            sites.map((site) => {
              const companyName = companyOptions.find(opt => String(opt.id) === String(site.company_id))?.name || '—';
              const branchName = branchOptions.find(opt => String(opt.id) === String(site.branch_id))?.name || '—';
              
              return (
                <TouchableOpacity
                  key={site.id}
                  className="p-5 mb-3 bg-white"
                  style={{ borderRadius: 8, borderWidth: 1, borderColor: '#e8f5e9' }}
                  onPress={() => handleViewLocation(site)}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className="mb-1 text-base font-normal" style={{ color: '#237227' }}>{site.name}</Text>
                      <Text className="text-sm mb-0.5" style={{ color: '#237227', opacity: 0.7 }}>{companyName}</Text>
                      <Text className="text-sm" style={{ color: '#237227', opacity: 0.7 }}>{branchName}</Text>
                    </View>
                    <View className="px-2 py-1 rounded" style={{ backgroundColor: '#e8f5e9' }}>
                      <Text className="text-xs font-medium" style={{ color: '#237227' }}>{site.status}</Text>
                    </View>
                  </View>
                  
                  <View className="flex-row gap-3 pt-3 border-t" style={{ borderTopColor: '#e8f5e9' }}>
                    <TouchableOpacity 
                      className="flex-row items-center justify-center flex-1 py-2"
                      onPress={(e) => {
                        e.stopPropagation();
                        handleEditSite(site);
                      }}
                    >
                      <Ionicons name="create-outline" size={16} color="#237227" />
                      <Text className="ml-1 text-xs" style={{ color: '#237227' }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="flex-row items-center justify-center flex-1 py-2"
                      onPress={(e) => {
                        e.stopPropagation();
                        handleViewLocation(site);
                      }}
                    >
                      <Ionicons name="eye-outline" size={16} color="#237227" />
                      <Text className="ml-1 text-xs" style={{ color: '#237227' }}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="flex-row items-center justify-center flex-1 py-2"
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteSite(site);
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#dc2626" />
                      <Text className="ml-1 text-xs text-red-600">Delete</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
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
        <View className="flex-row flex-1">
          <View className="h-full bg-white shadow-2xl w-72">
            <View className="px-6 pt-12 pb-6 border-b" style={{ backgroundColor: '#f8fafb', borderBottomColor: '#e8f5e9' }}>
              <View className="flex-row items-center gap-3">
                <View className="items-center justify-center w-12 h-12 rounded" style={{ backgroundColor: '#e8f5e9' }}>
                  <Ionicons name="business-outline" size={24} color="#237227" />
                </View>
                <View>
                  <Text className="text-base font-medium" style={{ color: '#237227' }}>Admin Portal</Text>
                  <Text className="text-xs" style={{ color: '#237227', opacity: 0.6 }}>Management System</Text>
                </View>
              </View>
            </View>

            <ScrollView className="flex-1 px-4 py-4">
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('dashboard');
                }}
              >
                <Ionicons name="grid-outline" size={20} color="#237227" />
                <Text className="ml-3 text-sm" style={{ color: '#237227' }}>Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded"
                style={{ backgroundColor: '#e8f5e9' }}
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('siteManagement');
                }}
              >
                <Ionicons name="location-outline" size={20} color="#237227" />
                <Text className="ml-3 text-sm font-medium" style={{ color: '#237227' }}>Site Management</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('walkieTalkie');
                }}
              >
                <Ionicons name="mic-outline" size={20} color="#237227" />
                <Text className="ml-3 text-sm" style={{ color: '#237227' }}>Walkie Talkie</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('activityLogs');
                }}
              >
                <Ionicons name="clipboard-outline" size={20} color="#237227" />
                <Text className="ml-3 text-sm" style={{ color: '#237227' }}>Activity Logs</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('companyList');
                }}
              >
                <Ionicons name="business-outline" size={20} color="#237227" />
                <Text className="ml-3 text-sm" style={{ color: '#237227' }}>Company Lists</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('employee');
                }}
              >
                <Ionicons name="people-outline" size={20} color="#237227" />
                <Text className="ml-3 text-sm" style={{ color: '#237227' }}>Employees</Text>
              </TouchableOpacity>

              <View className="my-4 border-t" style={{ borderTopColor: '#e8f5e9' }} />

              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded" 
                onPress={() => onNavigate('settings')}
              >
                <Ionicons name="settings-outline" size={20} color="#237227" />
                <Text className="ml-3 text-sm" style={{ color: '#237227' }}>Settings</Text>
              </TouchableOpacity>
            </ScrollView>

            <View className="px-4 pt-4 pb-6 border-t" style={{ borderTopColor: '#e8f5e9' }}>
              <TouchableOpacity className="flex-row items-center px-4 py-3 rounded">
                <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                <Text className="ml-3 text-sm text-red-600">Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Pressable 
            className="flex-1 bg-black/40" 
            onPress={() => setIsDrawerOpen(false)}
          />
        </View>
      </Modal>

      {/* Notification Modal */}
      <Modal
        visible={isNotificationOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNotificationOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setIsNotificationOpen(false)}
        >
          <View
            style={{
              width: 320,
              backgroundColor: 'white',
              borderRadius: 8,
              padding: 24,
              borderWidth: 1,
              borderColor: '#e8f5e9',
            }}
          >
            <Ionicons name="notifications-outline" size={32} color="#237227" style={{ marginBottom: 12, alignSelf: 'center' }} />
            <Text style={{ fontWeight: '500', fontSize: 18, color: '#237227', marginBottom: 8, textAlign: 'center' }}>Notifications</Text>
            <Text style={{ color: '#237227', opacity: 0.7, textAlign: 'center', marginBottom: 16 }}>
              You have no new notifications.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#237227', borderRadius: 6, paddingVertical: 10, paddingHorizontal: 24 }}
              onPress={() => setIsNotificationOpen(false)}
            >
              <Text style={{ color: 'white', fontWeight: '500', textAlign: 'center' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
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
          className="items-center justify-center flex-1 px-6 bg-black/40"
          onPress={() => {
            setIsAddModalOpen(false);
            resetForm();
          }}
        >
          <Pressable className="w-full max-w-md bg-white" style={{ borderRadius: 8 }} onPress={(e) => e.stopPropagation()}>
            <View className="px-6 pt-6 pb-4 border-b" style={{ borderBottomColor: '#e8f5e9' }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-light" style={{ color: '#237227' }}>Add New Site</Text>
                <TouchableOpacity 
                  className="items-center justify-center w-8 h-8"
                  onPress={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                >
                  <Ionicons name="close-outline" size={24} color="#237227" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView className="px-6 py-5 max-h-96">
              <View className="mb-4">
                <Text className="mb-2 text-sm" style={{ color: '#237227' }}>
                  Site Name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className="px-4 py-3 text-sm bg-white"
                  style={{ 
                    borderWidth: 1, 
                    borderColor: touched.siteName && errors.siteName ? '#dc2626' : '#e8f5e9',
                    borderRadius: 6,
                    color: '#237227'
                  }}
                  value={siteName}
                  editable={false}
                  selectTextOnFocus={false}
                />
                {touched.siteName && errors.siteName && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.siteName}</Text>
                  </View>
                )}
                <Text className="mt-1 text-xs" style={{ color: '#237227', opacity: 0.5 }}>Auto-filled from map coordinates</Text>
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-sm" style={{ color: '#237227' }}>
                  Company Name <Text className="text-red-500">*</Text>
                </Text>
                <View className="px-4 py-3 bg-white" style={{ 
                  borderWidth: 1, 
                  borderColor: touched.company && errors.company ? '#dc2626' : '#e8f5e9',
                  borderRadius: 6
                }}>
                  <select
                    style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 14, color: '#237227' }}
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
                    <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.company}</Text>
                  </View>
                )}
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-sm" style={{ color: '#237227' }}>Branch/Department</Text>
                <View className="px-4 py-3 bg-white" style={{ 
                  borderWidth: 1, 
                  borderColor: touched.branch_id && errors.branch_id ? '#dc2626' : '#e8f5e9',
                  borderRadius: 6
                }}>
                  <select
                    style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 14, color: '#237227' }}
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
                    <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.branch_id}</Text>
                  </View>
                )}
              </View>

              <View className="mb-1">
                <Text className="mb-2 text-sm" style={{ color: '#237227' }}>
                  Location <Text className="text-red-500">*</Text>
                </Text>
                <View 
                  id="leaflet-map" 
                  style={{ 
                    height: 200, 
                    width: '100%',
                    borderRadius: 6,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: touched.location && errors.location ? '#dc2626' : '#e8f5e9',
                    borderStyle: 'solid',
                  }}
                />
                {touched.location && errors.location && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.location}</Text>
                  </View>
                )}
                {latitude !== null && longitude !== null && (
                  <View className="px-3 py-2 mt-2" style={{ backgroundColor: '#f8fafb', borderRadius: 6 }}>
                    <Text className="text-xs" style={{ color: '#237227' }}>
                      <Text className="font-medium">Coordinates:</Text> {latitude.toFixed(6)}, {longitude.toFixed(6)}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View className="px-6 pt-4 pb-6 border-t" style={{ borderTopColor: '#e8f5e9' }}>
              <View className="flex-row gap-3">
                <TouchableOpacity 
                  className="flex-1 py-3"
                  style={{ backgroundColor: '#f8fafb', borderRadius: 6 }}
                  onPress={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                >
                  <Text className="text-sm font-medium text-center" style={{ color: '#237227' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-1 py-3"
                  style={{ backgroundColor: '#237227', borderRadius: 6 }}
                  onPress={handleAddSite}
                >
                  <Text className="text-sm font-medium text-center text-white">Add Site</Text>
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
          className="items-center justify-center flex-1 px-6 bg-black/40"
          onPress={() => {
            setIsEditModalOpen(false);
            resetForm();
          }}
        >
          <Pressable className="w-full max-w-md bg-white" style={{ borderRadius: 8 }} onPress={(e) => e.stopPropagation()}>
            <View className="px-6 pt-6 pb-4 border-b" style={{ borderBottomColor: '#e8f5e9' }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-light" style={{ color: '#237227' }}>Edit Site</Text>
                <TouchableOpacity 
                  className="items-center justify-center w-8 h-8"
                  onPress={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                >
                  <Ionicons name="close-outline" size={24} color="#237227" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView className="px-6 py-5 max-h-96">
              <View className="mb-4">
                <Text className="mb-2 text-sm" style={{ color: '#237227' }}>
                  Site Name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className="px-4 py-3 text-sm bg-white"
                  style={{ 
                    borderWidth: 1, 
                    borderColor: touched.siteName && errors.siteName ? '#dc2626' : '#e8f5e9',
                    borderRadius: 6,
                    color: '#237227'
                  }}
                  placeholder="e.g., Downtown Office"
                  placeholderTextColor="#a8a29e"
                  value={siteName}
                  onChangeText={(value) => handleFieldChange('siteName', value)}
                  onBlur={() => handleFieldBlur('siteName', siteName)}
                  maxLength={50}
                />
                {touched.siteName && errors.siteName && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.siteName}</Text>
                  </View>
                )}
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-sm" style={{ color: '#237227' }}>
                  Company Name <Text className="text-red-500">*</Text>
                </Text>
                <View className="px-4 py-3 bg-white" style={{ 
                  borderWidth: 1, 
                  borderColor: touched.company && errors.company ? '#dc2626' : '#e8f5e9',
                  borderRadius: 6
                }}>
                  <select
                    style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 14, color: '#237227' }}
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
                    <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.company}</Text>
                  </View>
                )}
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-sm" style={{ color: '#237227' }}>
                  Branch/Department <Text className="text-red-500">*</Text>
                </Text>
                <View className="px-4 py-3 bg-white" style={{ 
                  borderWidth: 1, 
                  borderColor: touched.branch_id && errors.branch_id ? '#dc2626' : '#e8f5e9',
                  borderRadius: 6
                }}>
                  <select
                    style={{ width: '100%', background: 'transparent', border: 'none', fontSize: 14, color: '#237227' }}
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
                    <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.branch_id}</Text>
                  </View>
                )}
              </View>

              <View className="mb-1">
                <Text className="mb-2 text-sm" style={{ color: '#237227' }}>
                  Location <Text className="text-red-500">*</Text>
                </Text>
                <View 
                  id="edit-leaflet-map" 
                  style={{ 
                    height: 200, 
                    width: '100%',
                    borderRadius: 6,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: touched.location && errors.location ? '#dc2626' : '#e8f5e9',
                    borderStyle: 'solid',
                  }}
                />
                {touched.location && errors.location && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{errors.location}</Text>
                  </View>
                )}
                {latitude !== null && longitude !== null && (
                  <View className="px-3 py-2 mt-2" style={{ backgroundColor: '#f8fafb', borderRadius: 6 }}>
                    <Text className="text-xs" style={{ color: '#237227' }}>
                      <Text className="font-medium">Coordinates:</Text> {latitude.toFixed(6)}, {longitude.toFixed(6)}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View className="px-6 pt-4 pb-6 border-t" style={{ borderTopColor: '#e8f5e9' }}>
              <View className="flex-row gap-3">
                <TouchableOpacity 
                  className="flex-1 py-3"
                  style={{ backgroundColor: '#f8fafb', borderRadius: 6 }}
                  onPress={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                >
                  <Text className="text-sm font-medium text-center" style={{ color: '#237227' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-1 py-3"
                  style={{ backgroundColor: '#237227', borderRadius: 6 }}
                  onPress={handleUpdateSite}
                >
                  <Text className="text-sm font-medium text-center text-white">Update Site</Text>
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
          className="items-center justify-center flex-1 px-6 bg-black/40"
          onPress={() => {
            setIsViewLocationOpen(false);
            setSelectedSite(null);
          }}
        >
          <Pressable className="w-full max-w-2xl bg-white" style={{ borderRadius: 8 }} onPress={(e) => e.stopPropagation()}>
            <View className="px-6 pt-6 pb-4 border-b" style={{ borderBottomColor: '#e8f5e9' }}>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-light" style={{ color: '#237227' }}>{selectedSite?.name}</Text>
                  <Text className="mt-1 text-xs" style={{ color: '#237227', opacity: 0.6 }}>Location on Map</Text>
                </View>
                <TouchableOpacity 
                  className="items-center justify-center w-8 h-8"
                  onPress={() => {
                    setIsViewLocationOpen(false);
                    setSelectedSite(null);
                  }}
                >
                  <Ionicons name="close-outline" size={24} color="#237227" />
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
                    borderRadius: 6,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#e8f5e9',
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
                    borderRadius: 8,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#e8f5e9',
                  }}>
                    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '500', color: '#237227' }}>{selectedSite.name}</Text>
                        <Text style={{ fontSize: 13, color: '#237227', opacity: 0.7, marginTop: 4 }}>{selectedSite.company}</Text>
                        <Text style={{ fontSize: 13, color: '#237227', opacity: 0.7, marginTop: 2 }}>
                          {branchOptions.find(opt => opt.id === selectedSite.branch_id)?.name || 'No branch selected'}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => {
                          if (typeof window !== 'undefined' && selectedSite && selectedSite.latitude && selectedSite.longitude) {
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedSite.latitude},${selectedSite.longitude}`;
                            window.open(url, '_blank');
                          }
                        }}
                        style={{ backgroundColor: '#237227', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '500', fontSize: 13 }}>Directions</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>

            <View className="px-6 pt-4 pb-6 border-t" style={{ borderTopColor: '#e8f5e9' }}>
              <TouchableOpacity 
                className="py-3"
                style={{ backgroundColor: '#237227', borderRadius: 6 }}
                onPress={() => {
                  setIsViewLocationOpen(false);
                  setSelectedSite(null);
                }}
              >
                <Text className="text-sm font-medium text-center text-white">Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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