import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../../components/SimpleToast';
import '../../global.css';
import AdminSidebar from '../../components/AdminSidebar';
import AdminHeader from 'components/AdminHeader';
import AdminSidebarMobile from '../../components/AdminSidebarMobile'; // <-- Import mobile sidebar

// ---------- Type Definitions ----------
type Branch = { id: number; name: string };
type Company = {
  id: number;
  name: string;
  industry: string;
  branches: number;
  initials: string;
  color: string;
  branchList: Branch[];
};

interface CompanyListProps {
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
}

interface ValidationErrors {
  companyName?: string;
  industry?: string;
  branches?: string;
  branchNames?: string;
}

// ---------- Main Component ----------
export default function CompanyList({ onNavigate }: CompanyListProps) {
  // ---------- UI States ----------
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);

  // ---------- Add Company Form States ----------
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [branches, setBranches] = useState('');
  const [branchNames, setBranchNames] = useState<string[]>([]);

  // Validation
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // ---------- Branch Management Modal States ----------
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [branchesList, setBranchesList] = useState<Branch[]>([]);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [newBranchName, setNewBranchName] = useState('');
  const [branchFormError, setBranchFormError] = useState('');

  // ---------- Load Companies from AsyncStorage ----------
  useEffect(() => {
    loadCompaniesFromCache();
  }, []);

  const loadCompaniesFromCache = async () => {
    try {
      const stored = await AsyncStorage.getItem('companies');
      if (stored) {
        setCompanies(JSON.parse(stored));
      }
    } catch (err) {
      console.log('Cache load failed:', err);
    }
  };

  // ---------- Helper: Update cache after any local change ----------
  const saveCompaniesToCache = async (updatedCompanies: Company[]) => {
    try {
      await AsyncStorage.setItem('companies', JSON.stringify(updatedCompanies));
      setCompanies(updatedCompanies);
    } catch (error) {
      console.log('Error saving to cache:', error);
    }
  };

  // ---------- Form Validation ----------
  const validateField = (fieldName: string, value: string): string | undefined => {
    switch (fieldName) {
      case 'companyName':
        if (!value.trim()) return 'Company name is required';
        if (value.trim().length < 2) return 'Company name must be at least 2 characters';
        if (value.trim().length > 100) return 'Company name must not exceed 100 characters';
        if (companies.some((company) => company.name.toLowerCase() === value.trim().toLowerCase()))
          return 'A company with this name already exists';
        return undefined;
      case 'industry':
        if (!value.trim()) return 'Industry/Sector is required';
        if (value.trim().length < 2) return 'Industry must be at least 2 characters';
        if (value.trim().length > 100) return 'Industry must not exceed 100 characters';
        return undefined;
      case 'branches':
        if (value && value.trim() !== '') {
          const num = parseInt(value);
          if (isNaN(num)) return 'Branches must be a valid number';
          if (num < 0) return 'Branches cannot be negative';
          if (num > 1000) return 'Branches cannot exceed 1000';
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
      branchNames: undefined,
    };

    const num = parseInt(branches) || 0;
    if (num > 0) {
      if (branchNames.length !== num || branchNames.some((b) => !b || !b.trim())) {
        newErrors.branchNames = 'Please provide a name for each branch';
      }
    }

    setErrors(newErrors);
    setTouched({
      companyName: true,
      industry: true,
      branches: true,
      branchNames: true,
    });

    return !Object.values(newErrors).some((error) => error !== undefined);
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    switch (fieldName) {
      case 'companyName':
        setCompanyName(value);
        break;
      case 'industry':
        setIndustry(value);
        break;
      case 'branches':
        setBranches(value);
        const num = parseInt(value) || 0;
        setBranchNames((prev) => {
          const next = [...prev];
          if (num > next.length) {
            for (let i = next.length; i < num; i++) next.push('');
          } else if (num < next.length) {
            next.length = num;
          }
          return next;
        });
        break;
    }

    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setErrors((prev) => ({ ...prev, [fieldName]: error }));
    }
  };

  const handleFieldBlur = (fieldName: string, value: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    const error = validateField(fieldName, value);
    setErrors((prev) => ({ ...prev, [fieldName]: error }));
  };

  const handleBranchNameChange = (index: number, value: string) => {
    setBranchNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (touched.branchNames) {
      const num = parseInt(branches) || 0;
      if (num !== branchNames.length || branchNames.some((b) => !b || !b.trim())) {
        setErrors((prev) => ({ ...prev, branchNames: 'Please provide a name for each branch' }));
      } else {
        setErrors((prev) => ({ ...prev, branchNames: undefined }));
      }
    }
  };

  const resetForm = () => {
    setCompanyName('');
    setIndustry('');
    setBranches('');
    setBranchNames([]);
    setErrors({});
    setTouched({});
  };

  // ---------- Add Company ----------
  const handleAddCompany = async () => {
    if (!validateForm()) {
      showToast({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fix the errors before submitting',
      });
      return;
    }

    try {
      // Generate new company ID
      const companyId = Date.now();
      const branchCount = parseInt(branches) || 0;

      // Create branch list
      const branchList: Branch[] = branchNames.slice(0, branchCount).map((name, idx) => ({
        id: companyId + idx + 1,
        name: name.trim(),
      }));

      // Create local company object
      const words = companyName.trim().split(' ');
      const initials = words
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();

      const newCompany: Company = {
        id: companyId,
        name: companyName.trim(),
        industry: industry.trim(),
        branches: branchCount,
        initials,
        color: '#ccfbf1',
        branchList,
      };

      // Update local state and cache
      const updatedCompanies = [...companies, newCompany];
      await saveCompaniesToCache(updatedCompanies);

      resetForm();
      setIsAddModalOpen(false);
      showToast({
        type: 'success',
        text1: 'Success!',
        text2: `${companyName.trim()} has been added successfully`,
      });
    } catch (err: any) {
      console.log('Error saving:', err);
      showToast({
        type: 'error',
        text1: 'Error',
        text2: err?.message || 'Failed to save company',
      });
    }
  };

  // ---------- Delete Company ----------
  const handleDeleteCompany = async (id: number) => {
    const company = companies.find((c) => c.id === id);
    Alert.alert(
      'Delete Company',
      `Are you sure you want to delete ${company?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from local state and cache
              const updatedCompanies = companies.filter((c) => c.id !== id);
              await saveCompaniesToCache(updatedCompanies);

              showToast({
                type: 'success',
                text1: 'Deleted',
                text2: `${company?.name} has been removed`,
              });
            } catch (err: any) {
              console.error('Delete error:', err);
              showToast({
                type: 'error',
                text1: 'Error',
                text2: err?.message || 'Failed to delete company',
              });
            }
          },
        },
      ]
    );
  };

  // ---------- Branch Management Functions ----------
  const fetchBranches = (companyId: number) => {
    const company = companies.find((c) => c.id === companyId);
    setBranchesList(company?.branchList || []);
  };

  const handleCompanyPress = (company: Company) => {
    setSelectedCompany(company);
    fetchBranches(company.id);
    setIsBranchModalOpen(true);
    setEditingBranch(null);
    setNewBranchName('');
    setBranchFormError('');
  };

  // Update company branch count in local state
  const updateCompanyBranchCount = async (companyId: number, newCount: number, branchList: Branch[]) => {
    const updatedCompanies = companies.map((c) =>
      c.id === companyId ? { ...c, branches: newCount, branchList } : c
    );
    await saveCompaniesToCache(updatedCompanies);
    setSelectedCompany((prev) => (prev ? { ...prev, branches: newCount, branchList } : null));
  };

  const handleAddBranch = async () => {
    if (!newBranchName.trim()) {
      setBranchFormError('Branch name is required');
      return;
    }
    if (!selectedCompany) return;

    try {
      // Insert branch
      const newBranch: Branch = {
        id: Date.now(),
        name: newBranchName.trim(),
      };
      const updatedBranchList = [...branchesList, newBranch];
      setBranchesList(updatedBranchList);
      setNewBranchName('');
      setBranchFormError('');

      // Increment company branch count in local
      await updateCompanyBranchCount(selectedCompany.id, updatedBranchList.length, updatedBranchList);

      showToast({ type: 'success', text1: 'Success', text2: 'Branch added' });
    } catch (error: any) {
      console.error('Error adding branch:', error);
      showToast({ type: 'error', text1: 'Error', text2: error.message });
    }
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setNewBranchName(branch.name);
    setBranchFormError('');
  };

  const handleUpdateBranch = async () => {
    if (!newBranchName.trim()) {
      setBranchFormError('Branch name is required');
      return;
    }
    if (!editingBranch || !selectedCompany) return;

    try {
      const updatedBranchList = branchesList.map((b) =>
        b.id === editingBranch.id ? { ...b, name: newBranchName.trim() } : b
      );
      setBranchesList(updatedBranchList);

      await updateCompanyBranchCount(selectedCompany.id, updatedBranchList.length, updatedBranchList);

      setEditingBranch(null);
      setNewBranchName('');
      setBranchFormError('');
      showToast({ type: 'success', text1: 'Success', text2: 'Branch updated' });
    } catch (error: any) {
      console.error('Error updating branch:', error);
      showToast({ type: 'error', text1: 'Error', text2: error.message });
    }
  };

  const handleDeleteBranch = async (branchId: number) => {
    if (!selectedCompany) return;

    Alert.alert(
      'Delete Branch',
      'Are you sure you want to delete this branch?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedBranchList = branchesList.filter((b) => b.id !== branchId);
              setBranchesList(updatedBranchList);

              // Decrement company branch count in local
              await updateCompanyBranchCount(selectedCompany.id, updatedBranchList.length, updatedBranchList);

              showToast({ type: 'success', text1: 'Success', text2: 'Branch deleted' });
            } catch (error: any) {
              console.error('Error deleting branch:', error);
              showToast({ type: 'error', text1: 'Error', text2: error.message });
            }
          },
        },
      ]
    );
  };

  const handleCancelBranchEdit = () => {
    setEditingBranch(null);
    setNewBranchName('');
    setBranchFormError('');
  };

  // Dummy sign out handler
  const handleSignOut = () => {
    // Add your sign out logic here
  };

  // ---------- Render ----------
  return (
    <View className="flex-row flex-1 bg-stone-50">
      {/* ---------- Desktop Sidebar ---------- */}
      <AdminSidebar onNavigate={onNavigate} />

      {/* ---------- Main Content ---------- */}
      <ScrollView className="flex-1 bg-stone-50">
        {/* AdminHeader */}
        <AdminHeader
          title="Company List"
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
              <Text className="text-lg lg:text-xl font-bold text-stone-900 mb-0.5">
                Company Management
              </Text>
              <Text className="text-xs text-stone-500 lg:text-sm">
                Manage companies and their branches
              </Text>
            </View>
            <TouchableOpacity
              className="bg-emerald-600 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl flex-row items-center ml-2"
              onPress={() => setIsAddModalOpen(true)}
            >
              <Ionicons name="add" size={18} color="white" />
              <Text className="ml-1 text-xs font-semibold text-white lg:text-sm">Add Company</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ---------- Desktop Grid View ---------- */}
        <View className="hidden px-8 pb-6 lg:flex">
          <View className="flex-row flex-wrap gap-6">
            {companies.map((company) => (
              <TouchableOpacity
                key={company.id}
                className="bg-white rounded-2xl border border-stone-200 p-6 w-[calc(50%-12px)]"
                onPress={() => handleCompanyPress(company)}
                activeOpacity={0.7}
              >
                {/* Card Header */}
                <View className="flex-row items-start justify-between mb-4">
                  <View
                    className="items-center justify-center w-16 h-16 rounded-2xl"
                    style={{ backgroundColor: company.color }}
                  >
                    <Text className="text-xl font-bold text-emerald-700">{company.initials}</Text>
                  </View>
                  {/* Delete button – stop propagation so it doesn't trigger parent onPress */}
                  <TouchableOpacity
                    className="items-center justify-center w-8 h-8 rounded-lg hover:bg-red-50"
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteCompany(company.id);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                  </TouchableOpacity>
                </View>

                {/* Company Info */}
                <Text className="mb-1 text-lg font-bold text-stone-900">{company.name}</Text>
                <Text className="mb-4 text-sm text-stone-500">{company.industry}</Text>

                {/* Stats */}
                <View className="flex-row items-center gap-4">
                  <View className="flex-row items-center">
                    <Ionicons name="business-outline" size={16} color="#78716c" />
                    <Text className="text-sm text-stone-600 ml-1.5">
                      {company.branches} branches
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ---------- Mobile List View ---------- */}
        <View className="px-5 pb-6 lg:hidden">
          {companies.map((company) => (
            <TouchableOpacity
              key={company.id}
              className="p-4 mb-3 bg-white border rounded-2xl border-stone-200"
              onPress={() => handleCompanyPress(company)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-start">
                {/* Icon */}
                <View
                  className="items-center justify-center mr-3 w-14 h-14 rounded-xl"
                  style={{ backgroundColor: company.color }}
                >
                  <Text className="text-lg font-bold text-emerald-700">{company.initials}</Text>
                </View>

                {/* Content */}
                <View className="flex-1">
                  <Text className="mb-1 text-base font-bold text-stone-900">{company.name}</Text>
                  <Text className="mb-2 text-xs text-stone-500">{company.industry}</Text>
                  <View className="flex-row items-center gap-3">
                    <View className="px-2 py-1 rounded bg-stone-100">
                      <Text className="text-xs font-medium text-stone-600">
                        {company.branches} branches
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Delete Button – stop propagation */}
                <TouchableOpacity
                  className="items-center justify-center w-8 h-8"
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteCompany(company.id);
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ---------- Mobile Drawer Modal ---------- */}
      <AdminSidebarMobile
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={(route) => {
          setIsDrawerOpen(false);
          onNavigate(route);
        }}
        activeRoute="companyList"
        onSignOut={handleSignOut}
      />

      {/* ---------- Add Company Modal ---------- */}
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
                  <Text className="text-xl font-bold text-stone-900">Add New Company</Text>
                  <Text className="mt-1 text-xs text-stone-500">
                    Fill in the company details below
                  </Text>
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
              {/* Company Name */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-stone-700">
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
                    <Text className="ml-1 text-xs text-red-600">{errors.companyName}</Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">{companyName.length}/100 characters</Text>
              </View>

              {/* Industry */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-stone-700">
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
                    <Text className="ml-1 text-xs text-red-600">{errors.industry}</Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">{industry.length}/100 characters</Text>
              </View>

              {/* Number of Branches */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-stone-700">Number of Branches</Text>
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
                    <Text className="ml-1 text-xs text-red-600">{errors.branches}</Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">Maximum 1000 branches</Text>
              </View>

              {/* Branch Names */}
              {(() => {
                const num = parseInt(branches) || 0;
                if (num <= 0) return null;
                return (
                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-medium text-stone-700">Branch Names</Text>
                    {Array.from({ length: num }).map((_, idx) => (
                      <View key={idx} className="mb-3">
                        <TextInput
                          className={`bg-white border ${
                            touched.branchNames && errors.branchNames
                              ? 'border-red-500'
                              : 'border-stone-300'
                          } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                          placeholder={`Branch ${idx + 1} name`}
                          placeholderTextColor="#a8a29e"
                          value={branchNames[idx] ?? ''}
                          onChangeText={(value) => handleBranchNameChange(idx, value)}
                        />
                      </View>
                    ))}
                    {touched.branchNames && errors.branchNames && (
                      <View className="flex-row items-center mt-1.5">
                        <Ionicons name="alert-circle" size={14} color="#dc2626" />
                        <Text className="ml-1 text-xs text-red-600">{errors.branchNames}</Text>
                      </View>
                    )}
                  </View>
                );
              })()}

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
                  onPress={handleAddCompany}
                >
                  <Text className="font-semibold text-center text-white">Add Company</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ---------- Branch Management Modal ---------- */}
      <Modal
        visible={isBranchModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsBranchModalOpen(false)}
      >
        <Pressable
          className="items-center justify-center flex-1 px-6 bg-black/50"
          onPress={() => setIsBranchModalOpen(false)}
        >
          <Pressable className="w-full max-w-md bg-white rounded-2xl" onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View className="px-6 pt-6 pb-4 border-b border-stone-100">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold text-stone-900">
                    {selectedCompany?.name || 'Company'}
                  </Text>
                  <Text className="mt-1 text-xs text-stone-500">Manage branches</Text>
                </View>
                <TouchableOpacity
                  className="items-center justify-center w-8 h-8"
                  onPress={() => setIsBranchModalOpen(false)}
                >
                  <Ionicons name="close" size={24} color="#78716c" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Branch List */}
            <ScrollView className="px-6 py-5 max-h-80">
              <Text className="mb-3 text-sm font-medium text-stone-700">
                Branches ({branchesList.length})
              </Text>

              {branchesList.length === 0 ? (
                <View className="items-center p-4 bg-stone-50 rounded-xl">
                  <Ionicons name="business-outline" size={24} color="#a8a29e" />
                  <Text className="mt-2 text-sm text-stone-500">No branches yet</Text>
                </View>
              ) : (
                branchesList.map((branch) => (
                  <View
                    key={branch.id}
                    className="flex-row items-center justify-between p-3 mb-3 bg-stone-50 rounded-xl"
                  >
                    <View className="flex-row items-center flex-1">
                      <Ionicons name="location-outline" size={16} color="#78716c" />
                      <Text className="ml-2 text-sm text-stone-700">{branch.name}</Text>
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity className="p-2" onPress={() => handleEditBranch(branch)}>
                        <Ionicons name="pencil-outline" size={18} color="#10b981" />
                      </TouchableOpacity>
                      <TouchableOpacity className="p-2" onPress={() => handleDeleteBranch(branch.id)}>
                        <Ionicons name="trash-outline" size={18} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              {/* Add / Edit Form */}
              <View className="pt-4 mt-4 border-t border-stone-100">
                <Text className="mb-2 text-sm font-medium text-stone-700">
                  {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                </Text>
                <TextInput
                  className={`bg-white border ${
                    branchFormError ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="Branch name"
                  placeholderTextColor="#a8a29e"
                  value={newBranchName}
                  onChangeText={setNewBranchName}
                />
                {branchFormError ? (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="ml-1 text-xs text-red-600">{branchFormError}</Text>
                  </View>
                ) : null}

                <View className="flex-row gap-2 mt-3">
                  {editingBranch ? (
                    <>
                      <TouchableOpacity
                        className="flex-1 py-3 bg-emerald-600 rounded-xl"
                        onPress={handleUpdateBranch}
                      >
                        <Text className="font-semibold text-center text-white">Update</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 py-3 bg-stone-200 rounded-xl"
                        onPress={handleCancelBranchEdit}
                      >
                        <Text className="font-semibold text-center text-stone-700">Cancel</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      className="flex-1 py-3 bg-emerald-600 rounded-xl"
                      onPress={handleAddBranch}
                    >
                      <Text className="font-semibold text-center text-white">Add Branch</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Footer Close Button */}
            <View className="px-6 pt-2 pb-6 border-t border-stone-100">
              <TouchableOpacity
                className="py-3 bg-stone-100 rounded-xl"
                onPress={() => setIsBranchModalOpen(false)}
              >
                <Text className="font-semibold text-center text-stone-700">Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}