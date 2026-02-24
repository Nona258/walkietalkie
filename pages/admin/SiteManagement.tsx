import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../../components/SimpleToast';
import AdminSidebar from '../../components/AdminSidebar';
import AdminSidebarMobile from '../../components/AdminSidebarMobile'; 
import AdminHeader from '../../components/AdminHeader'; 
import SiteManagementCardMobile from '../../components/SiteManagementCardMobile'; 
import '../../global.css';

interface Site {
  id: number;
  name: string;
  company: string;
  branch: string;
  members: number;
  status: string;
  longitude: string;
  latitude: string;
}

interface SiteManagementProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}

interface ValidationErrors {
  siteName?: string;
  company?: string;
  branch?: string;
  members?: string;
  longitude?: string;
  latitude?: string;
}

export default function SiteManagement({ onNavigate }: SiteManagementProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Form state
  const [siteName, setSiteName] = useState('');
  const [company, setCompany] = useState('');
  const [branch, setBranch] = useState('');
  const [members, setMembers] = useState('');
  const [longitude, setLongitude] = useState('');
  const [latitude, setLatitude] = useState('');

  // Validation state
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Load sites from AsyncStorage
  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      const storedSites = await AsyncStorage.getItem('sites');
      if (storedSites) {
        setSites(JSON.parse(storedSites));
      } else {
        // Default sites if none exist
        const defaultSites = [
          {
            id: 1,
            name: 'Downtown HQ',
            company: 'Acme Corp',
            branch: 'Main Branch',
            members: 24,
            status: 'Active',
            longitude: '120.9842',
            latitude: '14.5995',
          },
          {
            id: 2,
            name: 'Warehouse B',
            company: 'Acme Corp',
            branch: 'Logistics',
            members: 18,
            status: 'Active',
            longitude: '121.0437',
            latitude: '14.6760',
          },
        ];
        setSites(defaultSites);
        await AsyncStorage.setItem('sites', JSON.stringify(defaultSites));
      }
    } catch (error) {
      console.log('Error loading sites:', error);
    }
  };

  const saveSites = async (updatedSites: Site[]) => {
    try {
      await AsyncStorage.setItem('sites', JSON.stringify(updatedSites));
      setSites(updatedSites);
    } catch (error) {
      console.log('Error saving sites:', error);
    }
  };

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
        if (sites.some(site => site.name.toLowerCase() === value.trim().toLowerCase())) {
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
      case 'longitude':
        if (!value.trim()) return 'Longitude is required';
        if (isNaN(Number(value)) || Number(value) < -180 || Number(value) > 180) return 'Longitude must be between -180 and 180';
        return undefined;
      case 'latitude':
        if (!value.trim()) return 'Latitude is required';
        if (isNaN(Number(value)) || Number(value) < -90 || Number(value) > 90) return 'Latitude must be between -90 and 90';
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
      longitude: validateField('longitude', longitude),
      latitude: validateField('latitude', latitude),
    };

    setErrors(newErrors);

    setTouched({
      siteName: true,
      company: true,
      branch: true,
      members: true,
      longitude: true,
      latitude: true,
    });

    return !Object.values(newErrors).some(error => error !== undefined);
  };

  const handleFieldChange = (fieldName: string, value: string) => {
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
      case 'longitude':
        setLongitude(value);
        break;
      case 'latitude':
        setLatitude(value);
        break;
    }
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
    setLongitude('');
    setLatitude('');
    setErrors({});
    setTouched({});
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

    const newSite: Site = {
      id: Date.now(),
      name: siteName.trim(),
      company: company.trim(),
      branch: branch.trim(),
      members: parseInt(members) || 0,
      status: 'Active',
      longitude: longitude.trim(),
      latitude: latitude.trim(),
    };

    const updatedSites = [...sites, newSite];
    await saveSites(updatedSites);

    resetForm();
    setIsAddModalOpen(false);
    showToast({
      type: 'success',
      text1: 'Success!',
      text2: `${siteName.trim()} has been added successfully`
    });
  };

  const handleDeleteSite = async (id: number) => {
    const site = sites.find(s => s.id === id);
    Alert.alert(
      'Delete Site',
      `Are you sure you want to delete ${site?.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedSites = sites.filter(site => site.id !== id);
            await saveSites(updatedSites);
            showToast({ type: 'success', text1: 'Deleted', text2: `${site?.name} has been removed` });
          },
        },
      ]
    );
  };

  // Sign out handler (dummy for now)
  const handleSignOut = () => {
    showToast({ type: 'info', text1: 'Signed Out', text2: 'You have been signed out.' });
    // Add your sign out logic here
  };

  return (
    <View className="flex-row flex-1 bg-stone-50">
      {/* Desktop Sidebar - */}
      <AdminSidebar onNavigate={onNavigate} activeRoute="siteManagement" />
      <ScrollView className="flex-1 bg-stone-50">
        {/* Header */}
        <AdminHeader
          title="Site Management"
          subtitle="Welcome back, Administrator"
           onMenuPress={() => setIsDrawerOpen(true)}
          isNotificationOpen={isNotificationOpen}
          setIsNotificationOpen={setIsNotificationOpen}
          onNavigate={onNavigate}
        />
        {/* Page Title & Add Button */}
        <View className="px-5 pt-4 pb-3 lg:px-8 lg:pt-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-lg lg:text-xl font-bold text-stone-900 mb-0.5">Site Management</Text>
              <Text className="text-xs text-stone-900 lg:text-lg">Manage all company sites and branches</Text>
            </View>
            <TouchableOpacity 
              className="bg-emerald-600 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl flex-row items-center ml-2"
              onPress={() => setIsAddModalOpen(true)}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text className="ml-1 text-xs font-semibold text-white lg:text-lg">Add Site</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Desktop Table View -  */}
        <View className="hidden px-8 pb-6 lg:flex">
          <View className="overflow-hidden bg-white border rounded-2xl border-stone-200">
            {/* Table Header */}
            <View className="flex-row items-center px-6 py-4 border-b bg-stone-50 border-stone-200">
              <Text className="flex-1 text-xs font-semibold tracking-wide uppercase text-stone-600">Site Name</Text>
              <Text className="flex-1 text-xs font-semibold tracking-wide uppercase text-stone-600">Company</Text>
              <Text className="flex-1 text-xs font-semibold tracking-wide uppercase text-stone-600">Branch</Text>
              <Text className="text-xs font-semibold tracking-wide uppercase w-28 text-stone-600">Status</Text>
              <Text className="w-32 text-xs font-semibold tracking-wide text-center uppercase text-stone-600">Actions</Text>
            </View>

            {/* Table Rows */}
            {sites.map((site, index) => (
              <View
                key={site.id}
                className={`flex-row items-center px-6 py-4 ${index !== sites.length - 1 ? 'border-b border-stone-100' : ''}`}
              >
                {/* Site Name */}
                <View className="flex-row items-center flex-1">
                  <View className="items-center justify-center w-10 h-10 mr-3 bg-emerald-100 rounded-xl">
                    <Ionicons name="location" size={18} color="#10b981" />
                  </View>
                  <Text className="text-sm font-semibold text-stone-900">{site.name}</Text>
                </View>

                {/* Company */}
                <Text className="flex-1 text-sm text-stone-600">{site.company}</Text>

                {/* Branch */}
                <Text className="flex-1 text-sm text-stone-600">{site.branch}</Text>
                {/* Status */}
                <View className="w-28">
                  <View className="bg-emerald-50 px-3 py-1.5 rounded-lg inline-flex self-start">
                    <Text className="text-xs font-semibold text-emerald-700">{site.status}</Text>
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row items-center justify-center w-32 gap-2">
                  <TouchableOpacity className="items-center justify-center w-8 h-8 rounded-lg hover:bg-stone-100">
                    <Ionicons name="create-outline" size={18} color="#78716c" />
                  </TouchableOpacity>
                  <TouchableOpacity className="items-center justify-center w-8 h-8 rounded-lg hover:bg-stone-100">
                    <Ionicons name="eye-outline" size={18} color="#78716c" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="items-center justify-center w-8 h-8 rounded-lg hover:bg-red-50"
                    onPress={() => handleDeleteSite(site.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Mobile Card View*/}
       <SiteManagementCardMobile sites={sites} handleDeleteSite={handleDeleteSite} />
      </ScrollView>

      {/* Mobile Drawer Modal */}
      <AdminSidebarMobile
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={(route) => {
          setIsDrawerOpen(false);
          onNavigate(route);
        }}
        activeRoute="siteManagement"
        onSignOut={handleSignOut}
      />

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
                <Text className="mb-2 text-sm font-medium text-stone-700">
                  Site Name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${touched.siteName && errors.siteName ? 'border-red-500' : 'border-stone-300'
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
                    <Text className="ml-1 text-xs text-red-600">{errors.siteName}</Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">{siteName.length}/50 characters</Text>
              </View>

              {/* Company */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-stone-700">
                  Company Name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${touched.company && errors.company ? 'border-red-500' : 'border-stone-300'
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
                    <Text className="ml-1 text-xs text-red-600">{errors.company}</Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">{company.length}/50 characters</Text>
              </View>

              {/* Branch */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-stone-700">
                  Branch/Department <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${touched.branch && errors.branch ? 'border-red-500' : 'border-stone-300'
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
                    <Text className="ml-1 text-xs text-red-600">{errors.branch}</Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">{branch.length}/50 characters</Text>
              </View>

                  
              <Text className="mt-3 text-xs text-stone-400">
                <Text className="text-red-500">*</Text> Required fields
              </Text>
            </ScrollView>

            {/* Action Buttons */}
            <View className="px-6 pt-4 pb-6 border-t border-stone-100">
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 py-3 bg-stone-100 rounded-xl active:opacity-70"
                  onPress={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                >
                  <Text className="font-semibold text-center text-stone-700">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-3 bg-emerald-600 rounded-xl active:opacity-80"
                  onPress={handleAddSite}
                >
                  <Text className="font-semibold text-center text-white">Add Site</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}