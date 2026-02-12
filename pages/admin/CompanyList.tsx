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
import { supabase } from '../../utils/supabase';
import '../../global.css';

// ---------- Type Definitions ----------
type Company = {
  id: number;
  name: string;
  industry: string;
  branches: number;
  initials: string;
  color: string;
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
  const [branchesList, setBranchesList] = useState<Array<{ id: number; name: string }>>([]);
  const [editingBranch, setEditingBranch] = useState<{ id: number; name: string } | null>(null);
  const [newBranchName, setNewBranchName] = useState('');
  const [branchFormError, setBranchFormError] = useState('');

  // ---------- Load Companies (Always use Supabase as source of truth) ----------
  useEffect(() => {
    loadCompaniesFromSupabase();
  }, []);

  const loadCompaniesFromSupabase = async () => {
    try {
      // 1. Fetch all companies from Supabase
      const { data: supabaseCompanies, error } = await supabase
        .from('company')
        .select('id, company_name, industry_or_sectors, no_of_branch');

      if (error) throw error;

      // 2. Transform to our Company type
      const transformed: Company[] = (supabaseCompanies || []).map((c) => {
        const words = c.company_name.trim().split(' ');
        const initials = words
          .slice(0, 2)
          .map((word: string) => word[0])
          .join('')
          .toUpperCase();
        return {
          id: c.id,
          name: c.company_name,
          industry: c.industry_or_sectors,
          branches: c.no_of_branch,
          initials,
          color: '#ccfbf1', // default color
        };
      });

      // 3. Update state and cache
      setCompanies(transformed);
      await AsyncStorage.setItem('companies', JSON.stringify(transformed));
    } catch (err) {
      console.log('Supabase fetch failed, loading from cache:', err);
      // Fallback to AsyncStorage when offline
      try {
        const stored = await AsyncStorage.getItem('companies');
        if (stored) {
          setCompanies(JSON.parse(stored));
        }
      } catch (cacheErr) {
        console.log('Cache load failed:', cacheErr);
      }
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
      // 1. Insert company
      const { data: companyData, error: companyError } = await supabase
        .from('company')
        .insert({
          company_name: companyName.trim(),
          industry_or_sectors: industry.trim(),
          no_of_branch: parseInt(branches) || 0,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      const companyId = companyData.id;
      const branchCount = parseInt(branches) || 0;

      // 2. Insert branches (if any)
      if (branchCount > 0) {
        const branchPayload = branchNames.slice(0, branchCount).map((name) => ({
          branch_name: name.trim(),
          company_id: companyId,
        }));

        const { error: branchError } = await supabase.from('branch').insert(branchPayload);
        if (branchError) throw branchError;
      }

      // 3. Create local company object
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
      };

      // 4. Update local state and cache
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
      console.log('Error saving to DB:', err);
      showToast({
        type: 'error',
        text1: 'Error',
        text2: err?.message || 'Failed to save company',
      });
    }
  };

  // ---------- Delete Company (from Supabase + local) ----------
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
              // Delete from Supabase (cascades to branches automatically if foreign key is set)
              const { error } = await supabase.from('company').delete().eq('id', id);
              if (error) throw error;

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
  const fetchBranches = async (companyId: number) => {
    try {
      const { data, error } = await supabase
        .from('branch')
        .select('id, branch_name')
        .eq('company_id', companyId)
        .order('id', { ascending: true });

      if (error) throw error;
      setBranchesList(data.map((b) => ({ id: b.id, name: b.branch_name })));
    } catch (error) {
      console.error('Error fetching branches:', error);
      showToast({ type: 'error', text1: 'Error', text2: 'Failed to load branches' });
    }
  };

  const handleCompanyPress = (company: Company) => {
    setSelectedCompany(company);
    fetchBranches(company.id);
    setIsBranchModalOpen(true);
    setEditingBranch(null);
    setNewBranchName('');
    setBranchFormError('');
  };

  // Update company branch count in Supabase + local state
  const updateCompanyBranchCount = async (companyId: number, newCount: number) => {
    try {
      const { error } = await supabase
        .from('company')
        .update({ no_of_branch: newCount })
        .eq('id', companyId);
      if (error) throw error;

      // Update local state and cache
      const updatedCompanies = companies.map((c) =>
        c.id === companyId ? { ...c, branches: newCount } : c
      );
      await saveCompaniesToCache(updatedCompanies);
      setSelectedCompany((prev) => (prev ? { ...prev, branches: newCount } : null));
    } catch (err) {
      console.error('Error updating branch count:', err);
      throw err;
    }
  };

  const handleAddBranch = async () => {
    if (!newBranchName.trim()) {
      setBranchFormError('Branch name is required');
      return;
    }
    if (!selectedCompany) return;

    try {
      // 1. Insert branch
      const { data, error } = await supabase
        .from('branch')
        .insert({
          branch_name: newBranchName.trim(),
          company_id: selectedCompany.id,
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Update local branch list
      setBranchesList((prev) => [...prev, { id: data.id, name: data.branch_name }]);
      setNewBranchName('');
      setBranchFormError('');

      // 3. Increment company branch count in Supabase + local
      await updateCompanyBranchCount(selectedCompany.id, selectedCompany.branches + 1);

      showToast({ type: 'success', text1: 'Success', text2: 'Branch added' });
    } catch (error: any) {
      console.error('Error adding branch:', error);
      showToast({ type: 'error', text1: 'Error', text2: error.message });
    }
  };

  const handleEditBranch = (branch: { id: number; name: string }) => {
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
      const { error } = await supabase
        .from('branch')
        .update({ branch_name: newBranchName.trim() })
        .eq('id', editingBranch.id);

      if (error) throw error;

      // Update local branch list
      setBranchesList((prev) =>
        prev.map((b) => (b.id === editingBranch.id ? { ...b, name: newBranchName.trim() } : b))
      );

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
              const { error } = await supabase.from('branch').delete().eq('id', branchId);
              if (error) throw error;

              // Update local branch list
              setBranchesList((prev) => prev.filter((b) => b.id !== branchId));

              // Decrement company branch count in Supabase + local
              await updateCompanyBranchCount(selectedCompany.id, selectedCompany.branches - 1);

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

  // ---------- Render ----------
  return (
    <View className="flex-1 flex-row bg-stone-50">
      {/* ---------- Desktop Sidebar ---------- */}
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
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('dashboard')}
          >
            <Ionicons name="grid-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('siteManagement')}
          >
            <Ionicons name="location-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Site Management</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('walkieTalkie')}
          >
            <Ionicons name="mic-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Walkie Talkie</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('activityLogs')}
          >
            <Ionicons name="clipboard-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Activity Logs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl bg-emerald-50"
            onPress={() => onNavigate('companyList')}
          >
            <Ionicons name="business-outline" size={20} color="#10b981" />
            <Text className="ml-3 text-emerald-700 font-medium">Company Lists</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('employee')}
          >
            <Ionicons name="people-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Employees</Text>
          </TouchableOpacity>
          <View className="border-t border-stone-200 my-4" />
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('settings')}
          >
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

      {/* ---------- Main Content ---------- */}
      <ScrollView className="flex-1 bg-stone-50">
        {/* Header */}
        <View className="bg-white px-5 pt-4 pb-3 border-b border-stone-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              {/* Mobile Menu Button */}
              <TouchableOpacity
                className="lg:hidden w-9 h-9 items-center justify-center mr-3"
                onPress={() => setIsDrawerOpen(true)}
              >
                <Ionicons name="menu" size={24} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-lg lg:text-2xl font-bold text-stone-900">
                  Company Management
                </Text>
                <Text className="text-stone-500 text-xs lg:text-sm mt-0.5">
                  Welcome back, Administrator
                </Text>
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
              <Modal
                visible={isNotificationOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsNotificationOpen(false)}
              >
                <Pressable
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
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
                    <Ionicons
                      name="notifications-outline"
                      size={32}
                      color="#10b981"
                      style={{ marginBottom: 12 }}
                    />
                    <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#44403c', marginBottom: 8 }}>
                      Notifications
                    </Text>
                    <Text style={{ color: '#57534e', textAlign: 'center', marginBottom: 16 }}>
                      You have no new notifications.
                    </Text>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#10b981',
                        borderRadius: 8,
                        paddingVertical: 8,
                        paddingHorizontal: 24,
                      }}
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
              <Text className="text-lg lg:text-xl font-bold text-stone-900 mb-0.5">
                Company Management
              </Text>
              <Text className="text-stone-500 text-xs lg:text-sm">
                Manage companies and their branches
              </Text>
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

        {/* ---------- Desktop Grid View ---------- */}
        <View className="hidden lg:flex px-8 pb-6">
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
                    className="w-16 h-16 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: company.color }}
                  >
                    <Text className="text-xl font-bold text-emerald-700">{company.initials}</Text>
                  </View>
                  {/* Delete button – stop propagation so it doesn't trigger parent onPress */}
                  <TouchableOpacity
                    className="w-8 h-8 items-center justify-center hover:bg-red-50 rounded-lg"
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteCompany(company.id);
                    }}
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
        <View className="lg:hidden px-5 pb-6">
          {companies.map((company) => (
            <TouchableOpacity
              key={company.id}
              className="bg-white rounded-2xl border border-stone-200 p-4 mb-3"
              onPress={() => handleCompanyPress(company)}
              activeOpacity={0.7}
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
                      <Text className="text-xs font-medium text-stone-600">
                        {company.branches} branches
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Delete Button – stop propagation */}
                <TouchableOpacity
                  className="w-8 h-8 items-center justify-center"
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
      <Modal
        visible={isDrawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <View className="flex-1 flex-row">
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
              <TouchableOpacity
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('settings');
                }}
              >
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

          <Pressable className="flex-1 bg-black/40" onPress={() => setIsDrawerOpen(false)} />
        </View>
      </Modal>

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
                  <Text className="text-xs text-stone-500 mt-1">
                    Fill in the company details below
                  </Text>
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

              {/* Branch Names */}
              {(() => {
                const num = parseInt(branches) || 0;
                if (num <= 0) return null;
                return (
                  <View className="mb-4">
                    <Text className="text-sm font-medium text-stone-700 mb-2">Branch Names</Text>
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
                        <Text className="text-xs text-red-600 ml-1">{errors.branchNames}</Text>
                      </View>
                    )}
                  </View>
                );
              })()}

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

      {/* ---------- Branch Management Modal ---------- */}
      <Modal
        visible={isBranchModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsBranchModalOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => setIsBranchModalOpen(false)}
        >
          <Pressable className="bg-white rounded-2xl w-full max-w-md" onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View className="px-6 pt-6 pb-4 border-b border-stone-100">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold text-stone-900">
                    {selectedCompany?.name || 'Company'}
                  </Text>
                  <Text className="text-xs text-stone-500 mt-1">Manage branches</Text>
                </View>
                <TouchableOpacity
                  className="w-8 h-8 items-center justify-center"
                  onPress={() => setIsBranchModalOpen(false)}
                >
                  <Ionicons name="close" size={24} color="#78716c" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Branch List */}
            <ScrollView className="px-6 py-5 max-h-80">
              <Text className="text-sm font-medium text-stone-700 mb-3">
                Branches ({branchesList.length})
              </Text>

              {branchesList.length === 0 ? (
                <View className="bg-stone-50 rounded-xl p-4 items-center">
                  <Ionicons name="business-outline" size={24} color="#a8a29e" />
                  <Text className="text-stone-500 text-sm mt-2">No branches yet</Text>
                </View>
              ) : (
                branchesList.map((branch) => (
                  <View
                    key={branch.id}
                    className="flex-row items-center justify-between mb-3 bg-stone-50 p-3 rounded-xl"
                  >
                    <View className="flex-row items-center flex-1">
                      <Ionicons name="location-outline" size={16} color="#78716c" />
                      <Text className="text-stone-700 text-sm ml-2">{branch.name}</Text>
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
              <View className="mt-4 pt-4 border-t border-stone-100">
                <Text className="text-sm font-medium text-stone-700 mb-2">
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
                    <Text className="text-xs text-red-600 ml-1">{branchFormError}</Text>
                  </View>
                ) : null}

                <View className="flex-row gap-2 mt-3">
                  {editingBranch ? (
                    <>
                      <TouchableOpacity
                        className="flex-1 bg-emerald-600 py-3 rounded-xl"
                        onPress={handleUpdateBranch}
                      >
                        <Text className="text-center text-white font-semibold">Update</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 bg-stone-200 py-3 rounded-xl"
                        onPress={handleCancelBranchEdit}
                      >
                        <Text className="text-center text-stone-700 font-semibold">Cancel</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      className="flex-1 bg-emerald-600 py-3 rounded-xl"
                      onPress={handleAddBranch}
                    >
                      <Text className="text-center text-white font-semibold">Add Branch</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Footer Close Button */}
            <View className="px-6 pb-6 pt-2 border-t border-stone-100">
              <TouchableOpacity
                className="bg-stone-100 py-3 rounded-xl"
                onPress={() => setIsBranchModalOpen(false)}
              >
                <Text className="text-center text-stone-700 font-semibold">Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}