import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import supabase from '../../utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SweetAlertModal from '../../components/SweetAlertModal';
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
  // drawer state not used in this component; keep a no-op setter to avoid unused variable errors
  const setIsDrawerOpen = (_v: boolean) => {};
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
  const [branchesList, setBranchesList] = useState<{ id: number; name: string }[]>([]);
  // View-only branches modal states
  const [isViewBranchModalOpen, setIsViewBranchModalOpen] = useState(false);
  const [selectedCompanyForView, setSelectedCompanyForView] = useState<Company | null>(null);
  const [branchesListView, setBranchesListView] = useState<{ id: number; name: string }[]>([]);
  const [editingBranch, setEditingBranch] = useState<{ id: number; name: string } | null>(null);
  const [newBranchName, setNewBranchName] = useState('');
  const [branchFormError, setBranchFormError] = useState('');
  // id of company which has its action menu open (or null)
  const [menuOpenFor, setMenuOpenFor] = useState<number | null>(null);
  // Sweet alert state (replaces showToast)
  const [sweetVisible, setSweetVisible] = useState(false);
  const [sweetTitle, setSweetTitle] = useState('');
  const [sweetMessage, setSweetMessage] = useState('');
  const [sweetType, setSweetType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [sweetShowCancel, setSweetShowCancel] = useState(false);
  const [sweetOnConfirm, setSweetOnConfirm] = useState<() => void>(() => () => setSweetVisible(false));
  const [sweetOnCancel, setSweetOnCancel] = useState<() => void | undefined>(() => undefined);

  const openSweet = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message = '',
    showCancel = false,
    onConfirm?: () => void,
    onCancel?: () => void
  ) => {
    setSweetType(type);
    setSweetTitle(title);
    setSweetMessage(message);
    setSweetShowCancel(showCancel);
    setSweetOnConfirm(() => () => {
      setSweetVisible(false);
      if (onConfirm) onConfirm();
    });
    setSweetOnCancel(() => () => {
      setSweetVisible(false);
      if (onCancel) onCancel();
    });
    setSweetVisible(true);
  };

  // ---------- Load Companies ----------
  useEffect(() => {
    loadCompaniesFromSupabase();
  }, []);

  const loadCompaniesFromSupabase = async () => {
    try {
      const { data: supabaseCompanies, error } = await supabase
        .from('company')
        .select('id, company_name, industry_or_sectors, no_of_branch');

      if (error) throw error;

      const transformed: Company[] = (supabaseCompanies || []).map((c: any) => {
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
          color: '#ccfbf1',
        };
      });

      setCompanies(transformed);
      await AsyncStorage.setItem('companies', JSON.stringify(transformed));
    } catch (err) {
      console.log('Supabase fetch failed, loading from cache:', err);
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

    return !Object.keys(newErrors).some((key) => newErrors[key as keyof ValidationErrors] !== undefined);
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
      openSweet('error', 'Validation Error', 'Please fix the errors before submitting');
      return;
    }

    try {
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

      if (branchCount > 0) {
        const branchPayload = branchNames.slice(0, branchCount).map((name) => ({
          branch_name: name.trim(),
          company_id: companyId,
        }));

        const { error: branchError } = await supabase.from('branch').insert(branchPayload);
        if (branchError) throw branchError;
      }

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

      const updatedCompanies = [...companies, newCompany];
      await saveCompaniesToCache(updatedCompanies);

      resetForm();
      setIsAddModalOpen(false);
      openSweet('success', 'Success!', `${companyName.trim()} has been added successfully`);
    } catch (err: any) {
      console.log('Error saving to DB:', err);
      openSweet('error', 'Error', err?.message || 'Failed to save company');
    }
  };

  // ---------- Delete Company ----------
  const handleDeleteCompany = async (id: number) => {
    const company = companies.find((c) => c.id === id);
    try {
      // 1) Delete branches belonging to the company (if any)
      const { error: branchError } = await supabase.from('branch').delete().eq('company_id', id);
      if (branchError) throw branchError;

      // 2) Delete the company
      const { error: compError } = await supabase.from('company').delete().eq('id', id);
      if (compError) throw compError;

      // 3) Update local state/cache and UI
      const updatedCompanies = companies.filter((c) => c.id !== id);
      await saveCompaniesToCache(updatedCompanies);

      // close any open menus/modals related to this company
      setMenuOpenFor(null);
      if (selectedCompany && selectedCompany.id === id) {
        setIsBranchModalOpen(false);
        setSelectedCompany(null);
        setBranchesList([]);
      }

      openSweet('success', 'Deleted', `${company?.name} has been removed`);
    } catch (err: any) {
      console.error('Delete error:', err);
      openSweet('error', 'Error', err?.message || 'Failed to delete company');
    }
  };

  // ---------- Branch Management ----------
  const fetchBranches = async (companyId: number) => {
    try {
      const { data, error } = await supabase
        .from('branch')
        .select('id, branch_name')
        .eq('company_id', companyId)
        .order('id', { ascending: true });

      if (error) throw error;
      const rows = (data || []).map((b: any) => ({ id: b.id, name: b.branch_name }));
      setBranchesList(rows);
      return rows;
    } catch (error) {
      console.error('Error fetching branches:', error);
      openSweet('error', 'Error', 'Failed to load branches');
      return [];
    }
  };

  const fetchBranchesForView = async (companyId: number) => {
    try {
      const { data, error } = await supabase
        .from('branch')
        .select('id, branch_name')
        .eq('company_id', companyId)
        .order('id', { ascending: true });

      if (error) throw error;
      setBranchesListView((data || []).map((b: any) => ({ id: b.id, name: b.branch_name })));
    } catch (error) {
      console.error('Error fetching branches for view:', error);
      openSweet('error', 'Error', 'Failed to load branches');
    }
  };

  const handleCompanyPress = (company: Company) => {
    setMenuOpenFor(null);
    setSelectedCompany(company);
    fetchBranches(company.id);
    setIsBranchModalOpen(true);
    setEditingBranch(null);
    setNewBranchName('');
    setBranchFormError('');
  };

  const handleViewCompany = (company: Company) => {
    setMenuOpenFor(null);
    setSelectedCompanyForView(company);
    fetchBranchesForView(company.id);
    setIsViewBranchModalOpen(true);
  };

  const updateCompanyBranchCount = async (companyId: number, newCount: number) => {
    try {
      const { error } = await supabase
        .from('company')
        .update({ no_of_branch: newCount })
        .eq('id', companyId);
      if (error) throw error;

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
      const { data, error } = await supabase
        .from('branch')
        .insert({
          branch_name: newBranchName.trim(),
          company_id: selectedCompany.id,
        })
        .select()
        .single();

      if (error) throw error;

      setBranchesList((prev) => [...prev, { id: data.id, name: data.branch_name }]);
      setNewBranchName('');
      setBranchFormError('');

      await updateCompanyBranchCount(selectedCompany.id, selectedCompany.branches + 1);

      // close modal then show confirmation so alert appears above modal
      setIsBranchModalOpen(false);
      setEditingBranch(null);
      setTimeout(() => openSweet('success', 'Success', 'Branch added'), 150);
    } catch (error: any) {
      console.error('Error adding branch:', error);
      openSweet('error', 'Error', error.message);
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

      setBranchesList((prev) =>
        prev.map((b) => (b.id === editingBranch.id ? { ...b, name: newBranchName.trim() } : b))
      );

      setEditingBranch(null);
      setNewBranchName('');
      setBranchFormError('');
      // close modal so sweetalert is visible above
      setIsBranchModalOpen(false);
      setTimeout(() => openSweet('success', 'Success', 'Branch updated'), 150);
    } catch (error: any) {
      console.error('Error updating branch:', error);
      openSweet('error', 'Error', error.message);
    }
  };

  const handleDeleteBranch = async (branchId: number) => {
    if (!selectedCompany) return;
    try {
      const { error } = await supabase.from('branch').delete().eq('id', branchId);
      if (error) throw error;
      // refresh branches from server to get an accurate count
      const refreshed = await fetchBranches(selectedCompany.id);
      const newCount = Math.max(0, (refreshed?.length || 0));
      await updateCompanyBranchCount(selectedCompany.id, newCount);

      // close branch modal then show confirmation so the sweetalert appears on top
      setIsBranchModalOpen(false);
      setEditingBranch(null);
      setNewBranchName('');
      setBranchFormError('');
      setTimeout(() => openSweet('success', 'Success', 'Branch deleted'), 350);
    } catch (error: any) {
      console.error('Error deleting branch:', error);
      openSweet('error', 'Error', error.message);
    }
  };

  const handleCancelBranchEdit = () => {
    setEditingBranch(null);
    setNewBranchName('');
    setBranchFormError('');
  };

  // When user taps delete (trash) for a branch, close the branch modal first
  // so the SweetAlert confirmation appears above it, then show confirm.
  const confirmDeleteBranch = (branchId: number) => {
    // close the branch modal so the alert will be visible on top
    setIsBranchModalOpen(false);
    setTimeout(() => {
      openSweet(
        'warning',
        'Delete branch',
        'Are you sure you want to delete this branch?',
        true,
        () => handleDeleteBranch(branchId)
      );
    }, 250);
  };

  // ---------- Render ----------
  return (
    <View className="flex-1 bg-stone-50">
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
              <Text className="text-lg lg:text-xl font-bold text-stone-900 mb-0.5">
                Company Management
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

        {/* ---------- Desktop Table View (desktop only) ---------- */}
        <View className="hidden lg:flex px-8 pb-6">
          <View className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            {/* Table Header (match SiteManagement layout) */}
            <View className="flex-row items-center px-6 py-4 bg-stone-50 border-b border-stone-200">
              <Text className="flex-1 text-xs font-semibold text-stone-600 uppercase tracking-wide">Company</Text>
              <Text className="flex-1 text-xs font-semibold text-stone-600 uppercase tracking-wide">Industry</Text>
              <Text className="w-28 text-xs font-semibold text-stone-600 uppercase tracking-wide">Branches</Text>
              <Text className="w-32 text-xs font-semibold text-stone-600 uppercase tracking-wide text-center">Actions</Text>
            </View>

            {/* Table Rows */}
            {companies.length === 0 ? (
              <View className="px-6 py-12 items-center">
                <Ionicons name="business-outline" size={48} color="#d6d3d1" />
                <Text className="text-stone-500 text-sm mt-4">No companies found</Text>
                <Text className="text-stone-400 text-xs mt-1">Click &quot;Add Company&quot; to create your first company</Text>
              </View>
            ) : (
              companies.map((company, index) => (
                <View
                  key={company.id}
                  className={`flex-row items-center px-6 py-4 ${index !== companies.length - 1 ? 'border-b border-stone-100' : ''}`}
                >
                  {/* Company */}
                  <View className="flex-1 flex-row items-center">
                    <View className="w-10 h-10 bg-emerald-100 rounded-xl items-center justify-center mr-3">
                      <Text className="text-emerald-700 font-bold">{company.initials}</Text>
                    </View>
                    <Text className="text-sm font-semibold text-stone-900">{company.name}</Text>
                  </View>

                  {/* Industry */}
                  <Text className="flex-1 text-sm text-stone-600">{company.industry}</Text>

                  {/* Branches */}
                  <View className="w-28">
                    <Text className="text-sm text-stone-600">{company.branches}</Text>
                  </View>

                  {/* Actions */}
                  <View className="w-32 flex-row items-center justify-center gap-2">
                    <TouchableOpacity
                      className="w-8 h-8 items-center justify-center hover:bg-stone-100 rounded-lg"
                      onPress={() => handleCompanyPress(company)}
                    >
                      <Ionicons name="create-outline" size={18} color="#78716c" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="w-8 h-8 items-center justify-center hover:bg-stone-100 rounded-lg"
                      onPress={() => handleViewCompany(company)}
                    >
                      <Ionicons name="eye-outline" size={18} color="#78716c" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="w-8 h-8 items-center justify-center hover:bg-red-50 rounded-lg"
                      onPress={() => openSweet('warning', 'Delete company', 'Are you sure you want to delete this company?', true, () => handleDeleteCompany(company.id))}
                    >
                      <Ionicons name="trash-outline" size={18} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* ---------- Mobile List View ---------- */}
        <View className="lg:hidden px-5 pb-6">
          {companies.map((company, index) => (
            <TouchableOpacity
              key={company.id}
              style={{
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                overflow: 'hidden',
                backgroundColor: '#059669',
                position: 'relative',
              }}
              onPress={() => {
                if (menuOpenFor === company.id) return;
                handleCompanyPress(company);
              }}
              activeOpacity={0.8}
            >
              {/* Decorative circle */}
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

              {/* 3-dot menu */}
              <TouchableOpacity
                style={{ position: 'absolute', top: 10, right: 10 }}
                onPress={(e) => {
                  e.stopPropagation && e.stopPropagation();
                  setMenuOpenFor(menuOpenFor === company.id ? null : company.id);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.95)" />
              </TouchableOpacity>

              {/* Dropdown menu */}
              {menuOpenFor === company.id && (
                <View
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 36,
                    backgroundColor: 'white',
                    borderRadius: 8,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    minWidth: 120,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.12,
                    shadowRadius: 6,
                    elevation: 6,
                    zIndex: 99,
                  }}
                >
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation && e.stopPropagation();
                      setMenuOpenFor(null);
                      openSweet('warning', 'Delete company', 'Are you sure you want to delete this company?', true, () => handleDeleteCompany(company.id));
                    }}
                    style={{ paddingVertical: 6 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="trash-outline" size={15} color="#dc2626" />
                      <Text style={{ color: '#dc2626', fontWeight: '600', fontSize: 14 }}>Delete</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Company name */}
              <Text
                style={{ color: 'white', fontSize: 15, fontWeight: '600', marginTop: 4 }}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {company.name}
              </Text>
              {/* Industry */}
              <Text style={{ color: 'white', fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                {company.industry}
              </Text>
              {/* Branches (plain text) */}
              <Text style={{ color: 'white', fontSize: 12, opacity: 0.95, marginTop: 10 }}>
                {company.branches} {company.branches === 1 ? 'branch' : 'branches'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ---------- Mobile Drawer Modal ---------- */}
      <Modal visible={isNotificationOpen} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/20 items-center justify-center" onPress={() => setIsNotificationOpen(false)}>
           <View className="w-80 bg-white p-6 rounded-2xl items-center">
              <Ionicons name="notifications-outline" size={32} color="#10b981" />
              <Text className="text-lg font-bold mt-4">Notifications</Text>
              <Text className="text-stone-500 text-center my-4">You have no new notifications.</Text>
              <TouchableOpacity className="bg-emerald-500 w-full py-3 rounded-xl items-center" onPress={() => setIsNotificationOpen(false)}>
                <Text className="text-white font-bold">Close</Text>
              </TouchableOpacity>
           </View>
        </Pressable>
      </Modal>

      {/* Sweet Alert Modal (replaces SimpleToast) */}
      <SweetAlertModal
        visible={sweetVisible}
        title={sweetTitle}
        message={sweetMessage}
        type={sweetType}
        showCancelButton={sweetShowCancel}
        onConfirm={() => sweetOnConfirm && sweetOnConfirm()}
        onCancel={() => sweetOnCancel && sweetOnCancel()}
      />

      {/* ---------- Branch Management Modal (Edit) ---------- */}
      <Modal
        visible={isBranchModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsBranchModalOpen(false)}
      >
        <Pressable className="flex-1 bg-black/50 justify-center items-center" onPress={() => setIsBranchModalOpen(false)}>
          <Pressable className="bg-white rounded-2xl w-full max-w-md" onPress={(e) => e.stopPropagation()}>
            <View className="px-6 pt-6 pb-4 border-b border-stone-100">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold text-stone-900">{selectedCompany?.name || 'Company'}</Text>
                  <Text className="text-xs text-stone-500 mt-1">Manage branches</Text>
                </View>
                <TouchableOpacity className="w-8 h-8 items-center justify-center" onPress={() => setIsBranchModalOpen(false)}>
                  <Ionicons name="close" size={22} color="#78716c" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView className="px-6 py-5 max-h-80">
              <Text className="text-sm font-medium text-stone-700 mb-3">Branches ({branchesList.length})</Text>

              {branchesList.length === 0 ? (
                <View className="bg-stone-50 rounded-xl p-4 items-center">
                  <Ionicons name="business-outline" size={24} color="#a8a29e" />
                  <Text className="text-stone-500 text-sm mt-2">No branches yet</Text>
                </View>
              ) : (
                branchesList.map((branch) => (
                  <View key={branch.id} className="flex-row items-center justify-between mb-3 bg-stone-50 p-3 rounded-xl">
                    <View className="flex-row items-center flex-1">
                      <Ionicons name="location-outline" size={16} color="#78716c" />
                      <Text className="text-stone-700 text-sm ml-2">{branch.name}</Text>
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity className="p-2" onPress={() => handleEditBranch(branch)}>
                        <Ionicons name="pencil-outline" size={18} color="#10b981" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="p-2"
                        onPress={() => confirmDeleteBranch(branch.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              <View className="mt-4 pt-4 border-t border-stone-100">
                <Text className="text-sm font-medium text-stone-700 mb-2">{editingBranch ? 'Edit Branch' : 'Add New Branch'}</Text>
                <TextInput
                  className={`bg-white border ${branchFormError ? 'border-red-500' : 'border-stone-300'} rounded-xl px-4 py-3 text-stone-900 text-sm`}
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
                      <TouchableOpacity className="flex-1 bg-emerald-600 py-3 rounded-xl" onPress={handleUpdateBranch}>
                        <Text className="text-center text-white font-semibold">Update</Text>
                      </TouchableOpacity>
                      <TouchableOpacity className="flex-1 bg-stone-200 py-3 rounded-xl" onPress={handleCancelBranchEdit}>
                        <Text className="text-center text-stone-700 font-semibold">Cancel</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity className="flex-1 bg-emerald-600 py-3 rounded-xl" onPress={handleAddBranch}>
                      <Text className="text-center text-white font-semibold">Add Branch</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>

            <View className="px-6 pb-6 pt-2 border-t border-stone-100">
              <TouchableOpacity className="bg-stone-100 py-3 rounded-xl" onPress={() => setIsBranchModalOpen(false)}>
                <Text className="text-center text-stone-700 font-semibold">Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ---------- View-Only Branches Modal ---------- */}
      <Modal
        visible={isViewBranchModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsViewBranchModalOpen(false)}
      >
        <Pressable className="flex-1 bg-black/50 justify-center items-center" onPress={() => setIsViewBranchModalOpen(false)}>
          <Pressable className="bg-white rounded-2xl w-full max-w-md" onPress={(e) => e.stopPropagation()}>
            <View className="px-6 pt-6 pb-4 border-b border-stone-100">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold text-stone-900">{selectedCompanyForView?.name || 'Company'}</Text>
                  <Text className="text-xs text-stone-500 mt-1">Branches</Text>
                </View>
                <TouchableOpacity className="w-8 h-8 items-center justify-center" onPress={() => setIsViewBranchModalOpen(false)}>
                  <Ionicons name="close" size={22} color="#78716c" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView className="px-6 py-5 max-h-80">
              {branchesListView.length === 0 ? (
                <View className="bg-stone-50 rounded-xl p-4 items-center">
                  <Ionicons name="business-outline" size={24} color="#a8a29e" />
                  <Text className="text-stone-500 text-sm mt-2">No branches yet</Text>
                </View>
              ) : (
                branchesListView.map((branch) => (
                  <View key={branch.id} className="mb-3 bg-stone-50 p-3 rounded-xl">
                    <View className="flex-row items-center">
                      <Ionicons name="location-outline" size={16} color="#78716c" />
                      <Text className="text-stone-700 text-sm ml-2">{branch.name}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View className="px-6 pb-6 pt-2 border-t border-stone-100">
              <TouchableOpacity className="bg-stone-100 py-3 rounded-xl" onPress={() => setIsViewBranchModalOpen(false)}>
                <Text className="text-center text-stone-700 font-semibold">Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ---------- Add Company Modal Design ---------- */}
      <Modal visible={isAddModalOpen} transparent animationType="fade" onRequestClose={() => { setIsAddModalOpen(false); resetForm(); }}>
        <Pressable className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => { setIsAddModalOpen(false); resetForm(); }}>
          <Pressable className="bg-white rounded-2xl w-full max-w-md" onPress={(e) => e.stopPropagation()}>
            <View className="px-6 pt-6 pb-4 border-b border-stone-100">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold text-stone-900">Add New Company</Text>
                  <Text className="text-xs text-stone-500 mt-1">Fill in the company details below</Text>
                </View>
                <TouchableOpacity className="w-8 h-8 items-center justify-center" onPress={() => { setIsAddModalOpen(false); resetForm(); }}>
                  <Ionicons name="close" size={22} color="#78716c" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView className="px-6 py-5 max-h-96">
              {/* Company Name */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">Company Name <Text className="text-red-500">*</Text></Text>
                <TextInput
                  className={`bg-white border ${touched.companyName && errors.companyName ? 'border-red-500' : 'border-stone-300'} rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., Acme Corporation"
                  placeholderTextColor="#a8a29e"
                  value={companyName}
                  onChangeText={(v) => handleFieldChange('companyName', v)}
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
                <Text className="text-sm font-medium text-stone-700 mb-2">Industry/Sector <Text className="text-red-500">*</Text></Text>
                <TextInput
                  className={`bg-white border ${touched.industry && errors.industry ? 'border-red-500' : 'border-stone-300'} rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., Technology & Security"
                  placeholderTextColor="#a8a29e"
                  value={industry}
                  onChangeText={(v) => handleFieldChange('industry', v)}
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
                  className={`bg-white border ${touched.branches && errors.branches ? 'border-red-500' : 'border-stone-300'} rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., 3"
                  placeholderTextColor="#a8a29e"
                  keyboardType="numeric"
                  value={branches}
                  onChangeText={(v) => handleFieldChange('branches', v)}
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
                          className={`bg-white border ${touched.branchNames && errors.branchNames ? 'border-red-500' : 'border-stone-300'} rounded-xl px-4 py-3 text-stone-900 text-sm`}
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

              <Text className="text-xs text-stone-400 mt-3"><Text className="text-red-500">*</Text> Required fields</Text>
            </ScrollView>

            <View className="px-6 pb-6 pt-4 border-t border-stone-100">
              <View className="flex-row gap-3">
                <TouchableOpacity className="flex-1 bg-stone-100 py-3 rounded-xl active:opacity-70" onPress={() => { setIsAddModalOpen(false); resetForm(); }}>
                  <Text className="text-center text-stone-700 font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-1 bg-emerald-600 py-3 rounded-xl active:opacity-80" onPress={handleAddCompany}>
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