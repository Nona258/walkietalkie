import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../../components/SimpleToast';
import '../../global.css';

interface Site {
  id: number;
  name: string;
  company: string;
  branch: string;
  members: number;
  status: string;
}

interface SiteManagementProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}

interface ValidationErrors {
  siteName?: string;
  company?: string;
  branch?: string;
  members?: string;
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
          },
          {
            id: 2,
            name: 'Warehouse B',
            company: 'Acme Corp',
            branch: 'Logistics',
            members: 18,
            status: 'Active',
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
        // Check for duplicate site names
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

    setErrors(newErrors);
    
    // Mark all fields as touched
    setTouched({
      siteName: true,
      company: true,
      branch: true,
      members: true,
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
            {sites.map((site, index) => (
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
                  <TouchableOpacity className="w-8 h-8 items-center justify-center hover:bg-stone-100 rounded-lg">
                    <Ionicons name="create-outline" size={18} color="#78716c" />
                  </TouchableOpacity>
                  <TouchableOpacity className="w-8 h-8 items-center justify-center hover:bg-stone-100 rounded-lg">
                    <Ionicons name="eye-outline" size={18} color="#78716c" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="w-8 h-8 items-center justify-center hover:bg-red-50 rounded-lg"
                    onPress={() => handleDeleteSite(site.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Mobile Card View - Hidden on desktop */}
        <View className="lg:hidden px-5 pb-6">
          <View className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            {/* Site Items */}
            {sites.map((site, index) => (
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
                    <TouchableOpacity className="w-8 h-8 items-center justify-center mb-1">
                      <Ionicons name="create-outline" size={16} color="#78716c" />
                    </TouchableOpacity>
                    <TouchableOpacity className="w-8 h-8 items-center justify-center mb-1">
                      <Ionicons name="eye-outline" size={16} color="#78716c" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="w-8 h-8 items-center justify-center"
                      onPress={() => handleDeleteSite(site.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
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
              <View className="mb-1">
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
    </View>
  );
}