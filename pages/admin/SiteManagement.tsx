import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '../../components/SimpleToast';
import '../../global.css';
import { supabase } from '../../utils/supabase';

interface Site {
  id: string; 
  name: string;
  company: string;
  branch: string;
  members: number;
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
  branch?: string;
  members?: string;
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
  
  // Form state
  const [siteName, setSiteName] = useState('');
  const [company, setCompany] = useState('');
  const [branch, setBranch] = useState('');
  const [members, setMembers] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  
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
      showToast({ type: 'error', text1: 'Error fetching sites', text2: error.message });
    } else {
      setSites(data || []);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  // Initialize Leaflet map when add modal opens
  useEffect(() => {
    if (isAddModalOpen && typeof window !== 'undefined') {
      // Load Leaflet CSS and JS
      const loadLeaflet = async () => {
        // Check if Leaflet is already loaded
        if (!(window as any).L) {
          // Add Leaflet CSS
          const cssLink = document.createElement('link');
          cssLink.rel = 'stylesheet';
          cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(cssLink);

          // Add Leaflet JS
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.async = true;
          
          script.onload = () => {
            initMap();
          };
          
          document.head.appendChild(script);
        } else {
          // Leaflet already loaded
          setTimeout(initMap, 100);
        }
      };

      const initMap = () => {
        const L = (window as any).L;
        if (!L || mapRef.current) return;

        // Iligan City coordinates
        const iliganLat = 8.2280;
        const iliganLng = 124.2452;

        const map = L.map('leaflet-map').setView([iliganLat, iliganLng], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        // Create a marker
        const marker = L.marker([iliganLat, iliganLng], {
          draggable: true
        }).addTo(map);

        // Set initial coordinates
        setLatitude(iliganLat);
        setLongitude(iliganLng);

        // Update coordinates when marker is dragged
        marker.on('dragend', function(e: any) {
          const position = e.target.getLatLng();
          setLatitude(position.lat);
          setLongitude(position.lng);
        });

        // Update marker position when map is clicked
        map.on('click', function(e: any) {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setLatitude(lat);
          setLongitude(lng);
        });

        mapRef.current = map;
        markerRef.current = marker;
      };

      loadLeaflet();
    }

    // Cleanup when modal closes
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isAddModalOpen]);

  // Initialize edit map
  useEffect(() => {
    if (isEditModalOpen && selectedSite && typeof window !== 'undefined') {
      const initEditMap = () => {
        const L = (window as any).L;
        if (!L || editMapRef.current) return;

        const lat = selectedSite.latitude || 8.2280;
        const lng = selectedSite.longitude || 124.2452;

        const map = L.map('edit-leaflet-map').setView([lat, lng], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        const marker = L.marker([lat, lng], {
          draggable: true
        }).addTo(map);

        marker.on('dragend', function(e: any) {
          const position = e.target.getLatLng();
          setLatitude(position.lat);
          setLongitude(position.lng);
        });

        map.on('click', function(e: any) {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setLatitude(lat);
          setLongitude(lng);
        });

        editMapRef.current = map;
        editMarkerRef.current = marker;
      };

      if ((window as any).L) {
        setTimeout(initEditMap, 100);
      } else {
        const checkLeaflet = setInterval(() => {
          if ((window as any).L) {
            clearInterval(checkLeaflet);
            initEditMap();
          }
        }, 100);
      }
    }

    return () => {
      if (editMapRef.current) {
        editMapRef.current.remove();
        editMapRef.current = null;
        editMarkerRef.current = null;
      }
    };
  }, [isEditModalOpen, selectedSite]);

  // Initialize view location map
  useEffect(() => {
    if (isViewLocationOpen && selectedSite && typeof window !== 'undefined') {
      const initViewMap = () => {
        const L = (window as any).L;
        if (!L || viewMapRef.current) return;

        // Use site's coordinates or default to Iligan City
        const lat = selectedSite.latitude || 8.2280;
        const lng = selectedSite.longitude || 124.2452;

        const map = L.map('view-leaflet-map').setView([lat, lng], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        // Create a marker (non-draggable for view mode)
        const marker = L.marker([lat, lng]).addTo(map);
        
        // Add popup with site info
        marker.bindPopup(`
          <div style="font-family: sans-serif;">
            <strong style="font-size: 14px;">${selectedSite.name}</strong><br/>
            <span style="font-size: 12px; color: #666;">${selectedSite.company}</span><br/>
            <span style="font-size: 12px; color: #666;">${selectedSite.branch}</span>
          </div>
        `).openPopup();

        viewMapRef.current = map;
        viewMarkerRef.current = marker;
      };

      // If Leaflet is already loaded, initialize immediately
      if ((window as any).L) {
        setTimeout(initViewMap, 100);
      } else {
        // Wait for Leaflet to load
        const checkLeaflet = setInterval(() => {
          if ((window as any).L) {
            clearInterval(checkLeaflet);
            initViewMap();
          }
        }, 100);
      }
    }

    // Cleanup when modal closes
    return () => {
      if (viewMapRef.current) {
        viewMapRef.current.remove();
        viewMapRef.current = null;
        viewMarkerRef.current = null;
      }
    };
  }, [isViewLocationOpen, selectedSite]);

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
        if (!value.trim()) {
          return 'Company name is required';
        }
        if (value.trim().length < 2) {
          return 'Company name must be at least 2 characters';
        }
        if (value.trim().length > 50) {
          return 'Company name must not exceed 50 characters';
        }
        return undefined;

      case 'branch':
        if (!value.trim()) {
          return 'Branch/Department is required';
        }
        if (value.trim().length < 2) {
          return 'Branch name must be at least 2 characters';
        }
        if (value.trim().length > 50) {
          return 'Branch name must not exceed 50 characters';
        }
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
      branch: validateField('branch', branch),
      members: validateField('members', members),
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
      branch: true,
      members: true,
      location: true,
    });

    // Return true if no errors
    return !Object.values(newErrors).some(error => error !== undefined);
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    // Update the field value
    switch (fieldName) {
      case 'siteName':
        setSiteName(value);
        break;
      case 'company':
        setCompany(value);
        break;
      case 'branch':
        setBranch(value);
        break;
      case 'members':
        setMembers(value);
        break;
    }

    // Validate the field if it's been touched
    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  };

  const handleFieldBlur = (fieldName: string, value: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    const error = validateField(fieldName, value);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const resetForm = () => {
    setSiteName('');
    setCompany('');
    setBranch('');
    setMembers('');
    setLatitude(null);
    setLongitude(null);
    setErrors({});
    setTouched({});
    setSelectedSite(null);
  };

  const handleAddSite = async () => {
    if (!validateForm()) {
      showToast({ 
        type: 'error', 
        text1: 'Validation Error', 
        text2: 'Please fix the errors before submitting' 
      });
      return;
    }

    const { error } = await supabase
      .from('sites')
      .insert([
        {
          name: siteName.trim(),
          company: company.trim(),
          branch: branch.trim(),
          members: parseInt(members) || 0,
          status: 'Active',
          latitude: latitude,
          longitude: longitude,
        },
      ]);
    if (error) {
      showToast({ type: 'error', text1: 'Error', text2: error.message });
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
      showToast({ type: 'success', text1: 'Success!', text2: `${siteName.trim()} has been added successfully` });
      resetForm();
      setIsAddModalOpen(false);
      fetchSites();
    }
  };

  const handleEditSite = (site: Site) => {
    setSelectedSite(site);
    setSiteName(site.name);
    setCompany(site.company);
    setBranch(site.branch);
    setMembers(site.members.toString());
    setLatitude(site.latitude || null);
    setLongitude(site.longitude || null);
    setIsEditModalOpen(true);
  };

  const handleUpdateSite = async () => {
    if (!selectedSite) {
      showToast({ type: 'error', text1: 'Error', text2: 'No site selected' });
      return;
    }

    if (!validateForm()) {
      showToast({ 
        type: 'error', 
        text1: 'Validation Error', 
        text2: 'Please fix the errors before submitting' 
      });
      return;
    }

    const { error } = await supabase
      .from('sites')
      .update({
        name: siteName.trim(),
        company: company.trim(),
        branch: branch.trim(),
        members: parseInt(members) || 0,
        latitude: latitude,
        longitude: longitude,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedSite.id)
      .select(); // Added .select() to ensure the query completes properly

    if (error) {
      showToast({ type: 'error', text1: 'Update Error', text2: error.message });
    } else {
      showToast({ type: 'success', text1: 'Updated!', text2: `${siteName.trim()} has been updated successfully` });
      resetForm();
      setIsEditModalOpen(false);
      fetchSites();
    }
  };

  const handleViewLocation = (site: Site) => {
    if (!site.latitude || !site.longitude) {
      showToast({ 
        type: 'error', 
        text1: 'No Location', 
        text2: 'This site does not have location coordinates' 
      });
      return;
    }
    setSelectedSite(site);
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
      showToast({ type: 'error', text1: 'Delete Error', text2: error.message });
    } else {
      showToast({ type: 'success', text1: 'Deleted', text2: `${site.name} has been removed successfully` });
      fetchSites();
    }
  };

  return (
    <View className="flex-1 flex-row bg-stone-50">
      {/* Desktop Sidebar - Hidden on mobile */}
      <View className="hidden lg:flex w-72 bg-white border-r border-stone-200">
        {/* Sidebar Header */}
        <View className="bg-emerald-50 px-6 pt-8 pb-6 border-b border-emerald-100">
          <View className="flex-row items-center gap-3">
            <View className="w-14 h-14 bg-emerald-100 rounded-2xl items-center justify-center">
              <Ionicons name="chatbubble" size={24} color="#10b981" />
            </View>
            <View>
              <Text className="text-base font-bold text-stone-900">Admin Portal</Text>
              <Text className="text-xs text-stone-500">Monitoring System</Text>
            </View>
          </View>
        </View>

        {/* Desktop Menu Items */}
        <ScrollView className="flex-1 px-4 py-4">
          {/* Dashboard */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('dashboard')}
          >
            <Ionicons name="grid-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Dashboard</Text>
          </TouchableOpacity>

          {/* Site Management */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl bg-emerald-50"
            onPress={() => onNavigate('siteManagement')}
          >
            <Ionicons name="location-outline" size={20} color="#10b981" />
            <Text className="ml-3 text-emerald-700 font-medium">Site Management</Text>
          </TouchableOpacity>

          {/* Walkie Talkie */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('walkieTalkie')}
          >
            <Ionicons name="mic-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Walkie Talkie</Text>
          </TouchableOpacity>

          {/* Activity Logs */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('activityLogs')}
          >
            <Ionicons name="clipboard-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Activity Logs</Text>
          </TouchableOpacity>

          {/* Company Lists */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('companyList')}
          >
            <Ionicons name="business-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Company Lists</Text>
          </TouchableOpacity>

          {/* Employees */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('employee')}
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
              <Text className="text-stone-500 text-xs lg:text-sm">Manage all company sites and branches</Text>
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
              <Text className="w-24 text-xs font-semibold text-stone-600 uppercase tracking-wide">Members</Text>
              <Text className="w-28 text-xs font-semibold text-stone-600 uppercase tracking-wide">Status</Text>
              <Text className="w-32 text-xs font-semibold text-stone-600 uppercase tracking-wide text-center">Actions</Text>
            </View>

            {/* Table Rows */}
            {sites.length === 0 ? (
              <View className="px-6 py-12 items-center">
                <Ionicons name="location-outline" size={48} color="#d6d3d1" />
                <Text className="text-stone-500 text-sm mt-4">No sites found</Text>
                <Text className="text-stone-400 text-xs mt-1">Click "Add Site" to create your first site</Text>
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
                  <Text className="flex-1 text-sm text-stone-600">{site.company}</Text>

                  {/* Branch */}
                  <Text className="flex-1 text-sm text-stone-600">{site.branch}</Text>

                  {/* Members */}
                  <Text className="w-24 text-sm text-stone-600">{site.members}</Text>

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
          <View className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            {/* Site Items */}
            {sites.length === 0 ? (
              <View className="px-6 py-12 items-center">
                <Ionicons name="location-outline" size={48} color="#d6d3d1" />
                <Text className="text-stone-500 text-sm mt-4">No sites found</Text>
                <Text className="text-stone-400 text-xs mt-1 text-center">Click "Add Site" to create your first site</Text>
              </View>
            ) : (
              sites.map((site, index) => (
                <View 
                  key={site.id}
                  className={`px-3 py-3 ${index !== sites.length - 1 ? 'border-b border-stone-100' : ''}`}
                >
                  {/* Mobile Card Layout */}
                  <View className="flex-row items-start">
                    {/* Icon */}
                    <View className="w-10 h-10 bg-emerald-100 rounded-xl items-center justify-center mr-3">
                      <Ionicons name="location" size={18} color="#10b981" />
                    </View>

                    {/* Content */}
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-stone-900 mb-1">{site.name}</Text>
                      
                      <View className="flex-row items-center mb-0.5">
                        <Ionicons name="business-outline" size={12} color="#78716c" />
                        <Text className="text-xs text-stone-600 ml-1.5">{site.company}</Text>
                      </View>
                      
                      <View className="flex-row items-center mb-1.5">
                        <Ionicons name="git-branch-outline" size={12} color="#78716c" />
                        <Text className="text-xs text-stone-600 ml-1.5">{site.branch}</Text>
                      </View>

                      <View className="flex-row items-center gap-3 mt-1">
                        <View className="flex-row items-center">
                          <Ionicons name="people-outline" size={12} color="#78716c" />
                          <Text className="text-xs text-stone-600 ml-1">{site.members} Members</Text>
                        </View>
                        
                        <View className="bg-emerald-50 px-2 py-0.5 rounded-lg">
                          <Text className="text-emerald-700 text-xs font-semibold">{site.status}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Actions - Vertical on mobile */}
                    <View className="ml-2">
                      <TouchableOpacity 
                        className="w-8 h-8 items-center justify-center mb-1"
                        onPress={() => handleEditSite(site)}
                      >
                        <Ionicons name="create-outline" size={16} color="#78716c" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        className="w-8 h-8 items-center justify-center mb-1"
                        onPress={() => handleViewLocation(site)}
                      >
                        <Ionicons name="eye-outline" size={16} color="#78716c" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        className="w-8 h-8 items-center justify-center"
                        onPress={() => handleDeleteSite(site)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
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
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Company Name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${
                    touched.company && errors.company ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., Acme Corporation"
                  placeholderTextColor="#a8a29e"
                  value={company}
                  onChangeText={(value) => handleFieldChange('company', value)}
                  onBlur={() => handleFieldBlur('company', company)}
                  maxLength={50}
                />
                {touched.company && errors.company && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.company}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">{company.length}/50 characters</Text>
              </View>

              {/* Branch */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Branch/Department <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${
                    touched.branch && errors.branch ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., Main Branch, Logistics"
                  placeholderTextColor="#a8a29e"
                  value={branch}
                  onChangeText={(value) => handleFieldChange('branch', value)}
                  onBlur={() => handleFieldBlur('branch', branch)}
                  maxLength={50}
                />
                {touched.branch && errors.branch && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.branch}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">{branch.length}/50 characters</Text>
              </View>

              {/* Members */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">Number of Members</Text>
                <TextInput
                  className={`bg-white border ${
                    touched.members && errors.members ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., 24"
                  placeholderTextColor="#a8a29e"
                  keyboardType="numeric"
                  value={members}
                  onChangeText={(value) => handleFieldChange('members', value)}
                  onBlur={() => handleFieldBlur('members', members)}
                />
                {touched.members && errors.members && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.members}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">Maximum 1000 members</Text>
              </View>

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
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Company Name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${
                    touched.company && errors.company ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., Acme Corporation"
                  placeholderTextColor="#a8a29e"
                  value={company}
                  onChangeText={(value) => handleFieldChange('company', value)}
                  onBlur={() => handleFieldBlur('company', company)}
                  maxLength={50}
                />
                {touched.company && errors.company && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.company}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">{company.length}/50 characters</Text>
              </View>

              {/* Branch */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Branch/Department <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${
                    touched.branch && errors.branch ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., Main Branch, Logistics"
                  placeholderTextColor="#a8a29e"
                  value={branch}
                  onChangeText={(value) => handleFieldChange('branch', value)}
                  onBlur={() => handleFieldBlur('branch', branch)}
                  maxLength={50}
                />
                {touched.branch && errors.branch && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.branch}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">{branch.length}/50 characters</Text>
              </View>

              {/* Members */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">Number of Members</Text>
                <TextInput
                  className={`bg-white border ${
                    touched.members && errors.members ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., 24"
                  placeholderTextColor="#a8a29e"
                  keyboardType="numeric"
                  value={members}
                  onChangeText={(value) => handleFieldChange('members', value)}
                  onBlur={() => handleFieldBlur('members', members)}
                />
                {touched.members && errors.members && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.members}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">Maximum 1000 members</Text>
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

            {/* Map Content */}
            <View className="px-6 py-5">
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
                <View className="mt-4 bg-stone-50 px-4 py-3 rounded-lg">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="business-outline" size={16} color="#78716c" />
                    <Text className="text-sm text-stone-700 ml-2 font-medium">{selectedSite.company}</Text>
                  </View>
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="git-branch-outline" size={16} color="#78716c" />
                    <Text className="text-sm text-stone-600 ml-2">{selectedSite.branch}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="location-outline" size={16} color="#78716c" />
                    <Text className="text-sm text-stone-600 ml-2">
                      {selectedSite.latitude.toFixed(6)}, {selectedSite.longitude.toFixed(6)}
                    </Text>
                  </View>
                </View>
              )}
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
    </View>
  );
}