import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../../components/SimpleToast';
import '../../global.css';

type Company = {
  id: string;
  name: string;
  industry: string;
  branches: number;
  employees: number;
  initials: string;
  color: string;
};

interface CompanyListProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}

interface ValidationErrors {
  companyName?: string;
  industry?: string;
  branches?: string;
  employees?: string;
}

export default function CompanyList({ onNavigate }: CompanyListProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  
  // Form state
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [branches, setBranches] = useState('');
  const [employees, setEmployees] = useState('');

  // Validation state
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Load companies from AsyncStorage
  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const storedCompanies = await AsyncStorage.getItem('companies');
      if (storedCompanies) {
        setCompanies(JSON.parse(storedCompanies));
      } else {
        // Default companies if none exist
        const initialCompanies = [
          {
            id: '1',
            name: 'Acme Corporation',
            industry: 'Technology & Security',
            branches: 3,
            employees: 86,
            initials: 'AC',
            color: '#ccfbf1',
          },
          {
            id: '2',
            name: 'Global Logistics',
            industry: 'Shipping & Warehousing',
            branches: 5,
            employees: 124,
            initials: 'GL',
            color: '#ccfbf1',
          },
          {
            id: '3',
            name: 'BuildRight Construction',
            industry: 'Infrastructure',
            branches: 2,
            employees: 45,
            initials: 'BR',
            color: '#ccfbf1',
          },
        ];
        setCompanies(initialCompanies);
        await AsyncStorage.setItem('companies', JSON.stringify(initialCompanies));
      }
    } catch (error) {
      console.log('Error loading companies:', error);
    }
  };

  const saveCompanies = async (updatedCompanies: Company[]) => {
    try {
      await AsyncStorage.setItem('companies', JSON.stringify(updatedCompanies));
      setCompanies(updatedCompanies);
    } catch (error) {
      console.log('Error saving companies:', error);
    }
  };

  // Validation functions
  const validateField = (fieldName: string, value: string): string | undefined => {
    switch (fieldName) {
      case 'companyName':
        if (!value.trim()) {
          return 'Company name is required';
        }
        if (value.trim().length < 2) {
          return 'Company name must be at least 2 characters';
        }
        if (value.trim().length > 100) {
          return 'Company name must not exceed 100 characters';
        }
        // Check for duplicate company names
        if (companies.some(company => company.name.toLowerCase() === value.trim().toLowerCase())) {
          return 'A company with this name already exists';
        }
        return undefined;

      case 'industry':
        if (!value.trim()) {
          return 'Industry/Sector is required';
        }
        if (value.trim().length < 2) {
          return 'Industry must be at least 2 characters';
        }
        if (value.trim().length > 100) {
          return 'Industry must not exceed 100 characters';
        }
        return undefined;

      case 'branches':
        if (value && value.trim() !== '') {
          const num = parseInt(value);
          if (isNaN(num)) {
            return 'Branches must be a valid number';
          }
          if (num < 0) {
            return 'Branches cannot be negative';
          }
          if (num > 1000) {
            return 'Branches cannot exceed 1000';
          }
        }
        return undefined;

      case 'employees':
        if (value && value.trim() !== '') {
          const num = parseInt(value);
          if (isNaN(num)) {
            return 'Employees must be a valid number';
          }
          if (num < 0) {
            return 'Employees cannot be negative';
          }
          if (num > 1000000) {
            return 'Employees cannot exceed 1,000,000';
          }
        }
        return undefined;

      default:
        return undefined;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {
      companyName: validateField('companyName', companyName),
      industry: validateField('industry', industry),
      branches: validateField('branches', branches),
      employees: validateField('employees', employees),
    };

    setErrors(newErrors);
    
    // Mark all fields as touched
    setTouched({
      companyName: true,
      industry: true,
      branches: true,
      employees: true,
    });

    // Return true if no errors
    return !Object.values(newErrors).some(error => error !== undefined);
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    // Update the field value
    switch (fieldName) {
      case 'companyName':
        setCompanyName(value);
        break;
      case 'industry':
        setIndustry(value);
        break;
      case 'branches':
        setBranches(value);
        break;
      case 'employees':
        setEmployees(value);
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
    setCompanyName('');
    setIndustry('');
    setBranches('');
    setEmployees('');
    setErrors({});
    setTouched({});
  };

  const handleAddCompany = async () => {
    if (!validateForm()) {
      showToast({ 
        type: 'error', 
        text1: 'Validation Error', 
        text2: 'Please fix the errors before submitting' 
      });
      return;
    }

    // Generate initials from company name
    const words = companyName.trim().split(' ');
    const initials = words
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase();

    const newCompany: Company = {
      id: Date.now().toString(),
      name: companyName.trim(),
      industry: industry.trim(),
      branches: parseInt(branches) || 0,
      employees: parseInt(employees) || 0,
      initials: initials,
      color: '#ccfbf1',
    };

    const updatedCompanies = [...companies, newCompany];
    await saveCompanies(updatedCompanies);
    
    resetForm();
    setIsAddModalOpen(false);
    showToast({ 
      type: 'success', 
      text1: 'Success!', 
      text2: `${companyName.trim()} has been added successfully` 
    });
  };

  const handleDeleteCompany = async (id: string) => {
    const company = companies.find(c => c.id === id);
    Alert.alert(
      'Delete Company',
      `Are you sure you want to delete ${company?.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedCompanies = companies.filter(c => c.id !== id);
            await saveCompanies(updatedCompanies);
            showToast({ type: 'success', text1: 'Deleted', text2: `${company?.name} has been removed` });
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
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('siteManagement')}
          >
            <Ionicons name="location-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Site Management</Text>
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
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl bg-emerald-50"
            onPress={() => onNavigate('companyList')}
          >
            <Ionicons name="business-outline" size={20} color="#10b981" />
            <Text className="ml-3 text-emerald-700 font-medium">Company Lists</Text>
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
                <Text className="text-lg lg:text-2xl font-bold text-stone-900">Company Management</Text>
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
              <Text className="text-lg lg:text-xl font-bold text-stone-900 mb-0.5">Company Management</Text>
              <Text className="text-stone-500 text-xs lg:text-sm">Manage companies and their branches</Text>
            </View>
            <TouchableOpacity 
              className="bg-emerald-600 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl flex-row items-center ml-2"
              onPress={() => setIsAddModalOpen(true)}
            >
              <Ionicons name="add" size={18} color="white" />
              <Text className="text-white font-semibold text-xs lg:text-sm ml-1">Add Company</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Desktop Grid View - Hidden on mobile */}
        <View className="hidden lg:flex px-8 pb-6">
          <View className="flex-row flex-wrap gap-6">
            {companies.map((company) => (
              <View 
                key={company.id}
                className="bg-white rounded-2xl border border-stone-200 p-6 w-[calc(50%-12px)]"
              >
                {/* Card Header */}
                <View className="flex-row items-start justify-between mb-4">
                  <View 
                    className="w-16 h-16 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: company.color }}
                  >
                    <Text className="text-xl font-bold text-emerald-700">{company.initials}</Text>
                  </View>
                  <TouchableOpacity 
                    className="w-8 h-8 items-center justify-center hover:bg-red-50 rounded-lg"
                    onPress={() => handleDeleteCompany(company.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                  </TouchableOpacity>
                </View>

                {/* Company Info */}
                <Text className="text-lg font-bold text-stone-900 mb-1">{company.name}</Text>
                <Text className="text-sm text-stone-500 mb-4">{company.industry}</Text>

                {/* Stats */}
                <View className="flex-row items-center gap-4">
                  <View className="flex-row items-center">
                    <Ionicons name="business-outline" size={16} color="#78716c" />
                    <Text className="text-sm text-stone-600 ml-1.5">{company.branches} branches</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="people-outline" size={16} color="#78716c" />
                    <Text className="text-sm text-stone-600 ml-1.5">{company.employees} employees</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Mobile List View - Hidden on desktop */}
        <View className="lg:hidden px-5 pb-6">
          {companies.map((company) => (
            <View 
              key={company.id}
              className="bg-white rounded-2xl border border-stone-200 p-4 mb-3"
            >
              <View className="flex-row items-start">
                {/* Icon */}
                <View 
                  className="w-14 h-14 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: company.color }}
                >
                  <Text className="text-lg font-bold text-emerald-700">{company.initials}</Text>
                </View>

                {/* Content */}
                <View className="flex-1">
                  <Text className="text-base font-bold text-stone-900 mb-1">{company.name}</Text>
                  <Text className="text-xs text-stone-500 mb-2">{company.industry}</Text>
                  
                  <View className="flex-row items-center gap-3">
                    <View className="bg-stone-100 px-2 py-1 rounded">
                      <Text className="text-xs font-medium text-stone-600">{company.branches} branches</Text>
                    </View>
                    <Text className="text-xs text-stone-400">•</Text>
                    <Text className="text-xs font-medium text-stone-500">{company.employees} employees</Text>
                  </View>
                </View>

                {/* Delete Button */}
                <TouchableOpacity 
                  className="w-8 h-8 items-center justify-center"
                  onPress={() => handleDeleteCompany(company.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
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
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('siteManagement');
                }}
              >
                <Ionicons name="location-outline" size={20} color="#78716c" />
                <Text className="ml-3 text-stone-700 font-medium">Site Management</Text>
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
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl bg-emerald-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('companyList');
                }}
              >
                <Ionicons name="business-outline" size={20} color="#10b981" />
                <Text className="ml-3 text-emerald-700 font-medium">Company Lists</Text>
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

      {/* Add Company Modal */}
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
                  <Text className="text-xl font-bold text-stone-900">Add New Company</Text>
                  <Text className="text-xs text-stone-500 mt-1">Fill in the company details below</Text>
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
              {/* Company Name */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Company Name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${
                    touched.companyName && errors.companyName ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., Acme Corporation"
                  placeholderTextColor="#a8a29e"
                  value={companyName}
                  onChangeText={(value) => handleFieldChange('companyName', value)}
                  onBlur={() => handleFieldBlur('companyName', companyName)}
                  maxLength={100}
                />
                {touched.companyName && errors.companyName && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.companyName}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">{companyName.length}/100 characters</Text>
              </View>

              {/* Industry */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Industry/Sector <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${
                    touched.industry && errors.industry ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., Technology & Security"
                  placeholderTextColor="#a8a29e"
                  value={industry}
                  onChangeText={(value) => handleFieldChange('industry', value)}
                  onBlur={() => handleFieldBlur('industry', industry)}
                  maxLength={100}
                />
                {touched.industry && errors.industry && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.industry}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">{industry.length}/100 characters</Text>
              </View>

              {/* Number of Branches */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">Number of Branches</Text>
                <TextInput
                  className={`bg-white border ${
                    touched.branches && errors.branches ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., 3"
                  placeholderTextColor="#a8a29e"
                  keyboardType="numeric"
                  value={branches}
                  onChangeText={(value) => handleFieldChange('branches', value)}
                  onBlur={() => handleFieldBlur('branches', branches)}
                />
                {touched.branches && errors.branches && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.branches}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">Maximum 1000 branches</Text>
              </View>

              {/* Number of Employees */}
              <View className="mb-1">
                <Text className="text-sm font-medium text-stone-700 mb-2">Number of Employees</Text>
                <TextInput
                  className={`bg-white border ${
                    touched.employees && errors.employees ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., 86"
                  placeholderTextColor="#a8a29e"
                  keyboardType="numeric"
                  value={employees}
                  onChangeText={(value) => handleFieldChange('employees', value)}
                  onBlur={() => handleFieldBlur('employees', employees)}
                />
                {touched.employees && errors.employees && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.employees}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">Maximum 1,000,000 employees</Text>
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
                  onPress={handleAddCompany}
                >
                  <Text className="text-center text-white font-semibold">Add Company</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}