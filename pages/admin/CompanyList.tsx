import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
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
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

interface ValidationErrors {
  companyName?: string;
  industry?: string;
  branches?: string;
  branchNames?: string;
}

// ---------- Main Component ----------
export default function CompanyList({ onNavigate, isMobileMenuOpen, setIsMobileMenuOpen }: CompanyListProps) {
  // ---------- UI States ----------
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination for companies list
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(companies.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedCompanies = companies.slice(startIndex, startIndex + PAGE_SIZE);
  const showingCount = companies.length === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, companies.length);

  // ---------- Add Company Form States ----------
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [branches, setBranches] = useState('');
  const [branchNames, setBranchNames] = useState<string[]>([]);

  // Validation
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // ---------- Branch Management Modal States (Edit) ----------
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [branchesList, setBranchesList] = useState<{ id: number; name: string }[]>([]);
  
  // ---------- View-Only Branches Modal States ----------
  const [isViewBranchModalOpen, setIsViewBranchModalOpen] = useState(false);
  const [selectedCompanyForView, setSelectedCompanyForView] = useState<Company | null>(null);
  const [branchesListView, setBranchesListView] = useState<{ id: number; name: string }[]>([]);
  
  // Edit specific branch states
  const [editingBranch, setEditingBranch] = useState<{ id: number; name: string } | null>(null);
  const [newBranchName, setNewBranchName] = useState('');
  const [branchFormError, setBranchFormError] = useState('');
  
  // Sweet alert state
  const [sweetVisible, setSweetVisible] = useState(false);
  const [sweetTitle, setSweetTitle] = useState('');
  const [sweetMessage, setSweetMessage] = useState('');
  const [sweetType, setSweetType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [sweetShowCancel, setSweetShowCancel] = useState(false);
  const [sweetOnConfirm, setSweetOnConfirm] = useState<() => void>(
    () => () => setSweetVisible(false)
  );
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

  const getInitialsFromText = (text: string): string => {
    const cleaned = (text || '').trim();
    if (!cleaned) return '??';
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return cleaned.slice(0, 2).toUpperCase();
  };

  const resolveActivityActor = async (): Promise<{ user_name: string; initials: string }> => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!authError && authData?.user?.id) {
        const { data: meRow, error: meError } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', authData.user.id)
          .single();

        if (!meError && meRow) {
          const name = (meRow as any).full_name || (meRow as any).email || 'Admin User';
          return { user_name: name, initials: getInitialsFromText(name) };
        }
      }
    } catch (e) {
      console.error('resolveActivityActor error:', e);
    }
    return { user_name: 'Admin User', initials: 'AD' };
  };

  const logActivity = async (opts: {
    action: string;
    description?: string | null;
    location?: string | null;
    type?: string | null;
    color?: string | null;
    icon?: string | null;
  }) => {
    try {
      const actor = await resolveActivityActor();
      const payload = {
        user_name: actor.user_name,
        initials: actor.initials,
        action: opts.action,
        description: opts.description || null,
        location: opts.location ?? 'Company List',
        type: opts.type || 'company',
        color: opts.color || '#d1fae5',
        icon: opts.icon || 'business-outline',
      };
      const { error } = await supabase.from('activity_logs').insert([payload]);
      if (error) console.error('activity_logs insert error:', error);
    } catch (e) {
      console.error('logActivity error:', e);
    }
  };

  // ---------- Load Companies ----------
  useEffect(() => {
    loadCompaniesFromSupabase();
  }, []);

  // Keep current page within valid range when companies length changes
  useEffect(() => {
    setCurrentPage((prev) => Math.max(1, Math.min(prev, totalPages)));
  }, [totalPages]);

  const loadCompaniesFromSupabase = async () => {
    setLoading(true);
    try {
      const { data: supabaseCompanies, error } = await supabase
        .from('company')
        .select('id, company_name, industry_or_sectors, no_of_branch')
        .order('id', { ascending: false });

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
    } finally {
      setLoading(false);
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

    return !Object.keys(newErrors).some(
      (key) => newErrors[key as keyof ValidationErrors] !== undefined
    );
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

      const updatedCompanies = [newCompany, ...companies];
      await saveCompaniesToCache(updatedCompanies);

      // Activity log
      await logActivity({
        action: `Added New Company: ${companyName.trim()}`,
        description: `Industry: ${industry.trim()} • Branches: ${branchCount}`,
        location: 'Company List',
        type: 'company',
        color: '#d1fae5',
        icon: 'add-circle-outline',
      });

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
      const { error: branchError } = await supabase.from('branch').delete().eq('company_id', id);
      if (branchError) throw branchError;

      const { error: compError } = await supabase.from('company').delete().eq('id', id);
      if (compError) throw compError;

      const updatedCompanies = companies.filter((c) => c.id !== id);
      await saveCompaniesToCache(updatedCompanies);

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
    setSelectedCompany(company);
    fetchBranches(company.id);
    setIsBranchModalOpen(true);
    setEditingBranch(null);
    setNewBranchName('');
    setBranchFormError('');
  };

  const handleViewCompany = (company: Company) => {
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
      
      const refreshed = await fetchBranches(selectedCompany.id);
      const newCount = Math.max(0, refreshed?.length || 0);
      await updateCompanyBranchCount(selectedCompany.id, newCount);

      setEditingBranch(null);
      setNewBranchName('');
      setBranchFormError('');
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

  const confirmDeleteBranch = (branchId: number) => {
    openSweet(
      'warning',
      'Delete branch',
      'Are you sure you want to delete this branch?',
      true,
      () => handleDeleteBranch(branchId)
    );
  };

  // ---------- Render ----------
  return (
    <View className="flex-1 bg-[#f8fafb]">
      <ScrollView className="flex-1 bg-[#f8fafb]" showsVerticalScrollIndicator={false}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View className="px-4 pt-4 pb-3 bg-white border-b border-stone-200 md:px-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity
                className="items-center justify-center mr-3 h-9 w-9 lg:hidden"
                onPress={() => setIsMobileMenuOpen?.(true)}>
                <Ionicons name="menu" size={28} color="#237227" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-lg font-bold text-stone-900 lg:text-2xl">Company List</Text>
                <Text className="mt-0.5 text-xs text-stone-500 lg:text-sm">
                  Welcome back, Administrator
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Page Title & Add Button ─────────────────────────────────────── */}
        <View className="flex-row items-center justify-between px-4 py-4 pt-6 md:px-5 lg:px-8">
          <View className="flex-row items-center gap-[10px]">
            <Ionicons name="business-outline" size={18} color="#1a2e1b" />
            <Text className="text-sm font-bold text-stone-900 lg:text-base">All Companies</Text>
            <View className="rounded-full bg-[#e8f5e9] px-[10px] py-[2px]">
              <Text className="text-xs font-bold lg:text-sm" style={{ color: '#237227' }}>{companies.length}</Text>
            </View>
          </View>
          <TouchableOpacity
            className="flex-row items-center gap-[6px] rounded-[6px] px-3 py-2 md:px-4"
            style={{ backgroundColor: '#237227' }}
            onPress={() => setIsAddModalOpen(true)}>
            <Ionicons name="add" size={16} color="#ffffff" />
            <Text className="text-xs font-semibold text-white lg:text-sm">Add Company</Text>
          </TouchableOpacity>
        </View>

        {/* ── Companies List Layout ───────────────────────────────────────── */}
        <View className="w-full px-4 pb-12 md:px-5 lg:px-8">
          {loading ? (
            <View className="items-center justify-center py-[60px] bg-white border border-[#e5e7eb] rounded-[10px]">
              <ActivityIndicator size="large" color="#237227" />
            </View>
          ) : companies.length === 0 ? (
            <View className="items-center justify-center py-[60px] gap-[10px] bg-white border border-[#e5e7eb] rounded-[10px]">
              <View className="h-12 w-12 items-center justify-center rounded-[12px] bg-[#e8f5e9]">
                <Ionicons name="business-outline" size={22} color="#237227" />
              </View>
              <Text className="text-[14px] font-semibold text-[#1a2e1b]">No companies found</Text>
              <Text className="text-[12px] text-[#8fa88f]">Click &quot;Add Company&quot; to create your first company</Text>
            </View>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <View className="gap-3 md:hidden">
                {paginatedCompanies.map((company) => (
                  <View
                    key={company.id}
                    className="bg-white border border-[#e5e7eb] rounded-[10px] p-4 gap-3">
                    {/* Card Header */}
                    <View className="flex-row items-center gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-[#237227]">
                        <Text className="text-[14px] font-bold text-white">{company.initials}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-[15px] font-bold text-[#1a2e1b]" numberOfLines={1}>
                          {company.name}
                        </Text>
                        <Text className="text-[12px] text-[#8fa88f] mt-0.5">
                          {company.branches} {company.branches === 1 ? 'Branch' : 'Branches'}
                        </Text>
                      </View>
                    </View>

                    {/* Card Content */}
                    <View className="border-t border-[#f0f4f0] pt-3 gap-2">
                      <View className="flex-row items-center gap-2">
                        <Ionicons name="briefcase-outline" size={14} color="#8fa88f" />
                        <Text className="text-[13px] text-[#1a2e1b] flex-1" numberOfLines={2}>
                          {company.industry}
                        </Text>
                      </View>
                    </View>

                    {/* Card Actions */}
                    <View className="flex-row items-center gap-2 border-t border-[#f0f4f0] pt-3">
                      <TouchableOpacity
                        className="flex-1 h-[36px] items-center justify-center rounded-[8px] bg-[#f8fafb] border border-[#237227] flex-row gap-2"
                        onPress={() => handleCompanyPress(company)}>
                        <Ionicons name="create-outline" size={16} color="#237227" />
                        <Text className="text-[12px] font-semibold text-[#237227]">Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="h-[36px] w-[36px] items-center justify-center rounded-[8px] bg-[#f8fafb] border border-[#237227]"
                        onPress={() => handleViewCompany(company)}>
                        <Ionicons name="eye-outline" size={16} color="#237227" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="h-[36px] w-[36px] items-center justify-center rounded-[8px] bg-[#fef2f2] border border-[#ef4444]"
                        onPress={() =>
                          openSweet(
                            'warning',
                            'Delete company',
                            'Are you sure you want to delete this company?',
                            true,
                            () => handleDeleteCompany(company.id)
                          )
                        }>
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {/* Desktop Table Layout */}
              <View className="hidden md:block">
                <View className="bg-white border border-[#e5e7eb] rounded-[10px] overflow-hidden w-full">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: '100%' }}>
                    <View className="flex-1 min-w-full">
                      {/* Table Header */}
                      <View className="flex-row items-center px-5 py-4 bg-[#f8fafb] border-b border-[#e5e7eb]">
                        <View className="flex-[3]">
                          <Text className="text-[12px] font-bold text-stone-900 uppercase tracking-[0.5px]">Company</Text>
                        </View>
                        <View className="flex-[3]">
                          <Text className="text-[12px] font-bold text-stone-900 uppercase tracking-[0.5px]">Industry/Sector</Text>
                        </View>
                        <View className="flex-[2]">
                          <Text className="text-[12px] font-bold text-stone-900 uppercase tracking-[0.5px]">Branches</Text>
                        </View>
                        <View className="w-[130px] pr-2 items-start">
                          <Text className="text-[12px] font-bold text-stone-900 uppercase tracking-[0.5px]">Actions</Text>
                        </View>
                      </View>

                      {/* Table Body */}
                      {paginatedCompanies.map((company, index) => (
                        <View
                          key={company.id}
                          className={`flex-row items-center px-5 py-[16px] bg-white ${
                            index !== paginatedCompanies.length - 1 ? 'border-b border-[#f0f4f0]' : ''
                          }`}>

                          {/* Column: Company Name & Avatar */}
                          <View className="flex-[3] flex-row items-center gap-[12px]">
                            <View className="h-8 w-8 items-center justify-center rounded-full bg-[#237227]">
                              <Text className="text-[12px] font-bold text-white">{company.initials}</Text>
                            </View>
                            <Text className="text-[14px] font-semibold text-[#1a2e1b]">{company.name}</Text>
                          </View>

                          {/* Column: Industry */}
                          <View className="flex-[3]">
                            <Text className="text-[13px] text-[#1a2e1b]">{company.industry}</Text>
                          </View>

                          {/* Column: Branches */}
                          <View className="flex-[2]">
                            <Text className="text-[13px] text-[#1a2e1b]">{company.branches}</Text>
                          </View>

                          {/* Column: Actions */}
                          <View className="w-[130px] flex-row items-center gap-[8px]">
                            <TouchableOpacity
                              className="h-[30px] w-[30px] items-center justify-center rounded-full bg-[#f8fafb] border border-[#237227]"
                              onPress={() => handleCompanyPress(company)}>
                              <Ionicons name="create-outline" size={15} color="#237227" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              className="h-[30px] w-[30px] items-center justify-center rounded-full bg-[#f8fafb] border border-[#237227]"
                              onPress={() => handleViewCompany(company)}>
                              <Ionicons name="eye-outline" size={15} color="#237227" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              className="h-[30px] w-[30px] items-center justify-center rounded-full bg-[#f8fafb] border border-[#ef4444]"
                              onPress={() =>
                                openSweet(
                                  'warning',
                                  'Delete company',
                                  'Are you sure you want to delete this company?',
                                  true,
                                  () => handleDeleteCompany(company.id)
                                )
                              }>
                              <Ionicons name="trash-outline" size={15} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}

                      {/* Table Footer */}
                      <View className="flex-row items-center justify-between border-t border-[#f0f4f0] bg-[#f8fafb] px-5 py-4">
                        <Text className="text-[13px] text-black">
                          Showing {showingCount} of {companies.length} companies
                        </Text>
                        <View className="flex-row gap-[6px] items-center">
                          <TouchableOpacity
                            onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage <= 1}
                            className={
                              "w-7 h-7 rounded-[7px] border border-[#e5e7eb] bg-white items-center justify-center " +
                              (currentPage <= 1 ? 'opacity-50' : '')
                            }
                          >
                            <Ionicons name={"chevron-back-outline" as any} size={13} color="#4b6b4d" />
                          </TouchableOpacity>
                          <View className="px-3 h-8 rounded-lg border border-[#237227] items-center justify-center min-w-[60px]">
                            <Text className="text-[11px] font-semibold text-stone-900">
                              {currentPage} / {totalPages}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            className={
                              "w-7 h-7 rounded-[7px] border border-[#e5e7eb] bg-white items-center justify-center " +
                              (currentPage >= totalPages ? 'opacity-50' : '')
                            }
                          >
                            <Ionicons name={"chevron-forward-outline" as any} size={13} color="#4b6b4d" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </ScrollView>
                </View>
              </View>

              {/* Mobile Footer */}
              <View className="md:hidden mt-4 bg-white border border-[#e5e7eb] rounded-[10px] px-4 py-3">
                <Text className="text-[12px] text-center text-[#8fa88f]">
                  Showing {showingCount} {companies.length === 1 ? 'company' : 'companies'}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Notification Modal ──────────────────────────────────────────── */}
      <Modal visible={isNotificationOpen} transparent animationType="fade" onRequestClose={() => setIsNotificationOpen(false)}>
        <Pressable
          className="flex-1 bg-black/15 justify-start items-end pt-[60px] pr-4 md:pr-5"
          onPress={() => setIsNotificationOpen(false)}
        >
          <View className="w-[280px] md:w-[300px] bg-white rounded-[14px] border border-[#e5e7eb] overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-[14px] border-b border-[#f0f4f0]">
              <Text className="text-[14px] font-bold text-[#1a2e1b]">Notifications</Text>
            </View>
            <View className="items-center px-6 py-8">
              <Text className="text-[13px] text-center text-[#8fa88f]">
                You have no new notifications.
              </Text>
            </View>
            <TouchableOpacity onPress={() => setIsNotificationOpen(false)} className="m-3 py-[9px] bg-[#237227] rounded-lg items-center">
              <Text className="text-[12px] font-semibold text-white">Dismiss</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Sweet Alert Modal */}
      <SweetAlertModal
        visible={sweetVisible}
        title={sweetTitle}
        message={sweetMessage}
        type={sweetType}
        showCancelButton={sweetShowCancel}
        onConfirm={() => sweetOnConfirm && sweetOnConfirm()}
        onCancel={() => sweetOnCancel && sweetOnCancel()}
      />

      {/* ── Branch Management Modal (Edit) ──────────────────────────────── */}
      <Modal
        visible={isBranchModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsBranchModalOpen(false)}>
        <View className="items-center justify-center flex-1 p-4 md:p-6 bg-black/30">
          <View className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-lg shadow-black/10">
            <View className="flex-row items-center justify-between border-b border-[#f0f4f0] px-6 py-[18px]">
              <View className="flex-row items-center gap-[10px]">
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-[#237227]">
                  <Ionicons name="create-outline" size={18} color="#f8fafb" />
                </View>
                <View>
                  <Text className="text-[15px] font-bold text-[#1a2e1b]">
                    {selectedCompany?.name || 'Company'}
                  </Text>
                  <Text className="text-[11px] text-stone-900">Manage branches</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsBranchModalOpen(false)}>
                <Ionicons name="close-outline" size={20} color="#8fa88f" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-[50vh] px-6 py-5">
              <Text className="mb-3 text-[13px] font-semibold text-[#1c1917]">
                Branches ({branchesList.length})
              </Text>

              {branchesList.length === 0 ? (
                <View className="items-center rounded-xl bg-[#f8fafb] border border-[#f0f4f0] p-4">
                  <Ionicons name="business-outline" size={24} color="#8fa88f" />
                  <Text className="mt-2 text-[13px] text-[#8fa88f]">No branches yet</Text>
                </View>
              ) : (
                branchesList.map((branch) => (
                  <View
                    key={branch.id}
                    className="mb-3 flex-row items-center justify-between rounded-[10px] bg-[#f8fafb] border border-[#237227] p-3">
                    <View className="flex-row items-center flex-1">
                      <Ionicons name="location-outline" size={18} color="#237227" />
                      <Text className="ml-2 text-[13px] font-medium text-stone-900">{branch.name}</Text>
                    </View>
                    <View className="flex-row gap-2 ">
                      <TouchableOpacity className="p-1 " onPress={() => handleEditBranch(branch)}>
                        <Ionicons name="pencil-outline" size={18} color="#237227" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="p-1"
                        onPress={() => confirmDeleteBranch(branch.id)}>
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              <View className="mt-4 border-t border-[#f0f4f0] pt-4">
                <Text className="mb-2 text-[12px] font-semibold text-[#1c1917]">
                  {editingBranch ? 'Edit Branch Name' : 'Add New Branch'}
                </Text>
                <View className={`flex-row items-center bg-[#f8fafb] border ${branchFormError ? 'border-[#237227]' : 'border-[#e5e7eb]'} rounded-[8px] px-3 h-[42px]`}>
                  <TextInput
                    className="flex-1 text-[13px] text-stone-900"
                    placeholder="Enter branch name..."
                    placeholderTextColor="#000000"
                    value={newBranchName}
                    onChangeText={setNewBranchName}
                  />
                </View>
                {branchFormError ? (
                  <Text className="mt-1 text-[11px] text-[#ef4444]">{branchFormError}</Text>
                ) : null}

                <View className="flex-row gap-2 mt-3">
                  {editingBranch ? (
                    <>
                      <TouchableOpacity
                        className="flex-1 items-center justify-center rounded-[8px] bg-[#237227] h-[40px]"
                        onPress={handleUpdateBranch}>
                        <Text className="text-[13px] font-semibold text-white">Save Changes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 items-center justify-center rounded-[8px] bg-[#f8fafb] border border-[#237227] h-[40px]"
                        onPress={handleCancelBranchEdit}>
                        <Text className="text-[13px] font-semibold text-stone-900">Cancel</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      className="flex-1 items-center justify-center rounded-[8px] bg-[#237227] h-[40px]"
                      onPress={handleAddBranch}>
                      <Text className="text-[13px] font-semibold text-white">Add Branch</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── View-Only Branches Modal ────────────────────────────────────── */}
      <Modal
        visible={isViewBranchModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsViewBranchModalOpen(false)}>
        <View className="items-center justify-center flex-1 p-4 md:p-6 bg-black/30">
          <View className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-lg shadow-black/10">
            <View className="flex-row items-center justify-between border-b border-[#f0f4f0] px-6 py-[18px]">
              <View className="flex-row items-center gap-[10px]">
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-[#237227]">
                  <Ionicons name="business-outline" size={16} color="#f8fafb" />
                </View>
                <View>
                  <Text className="text-[15px] font-bold text-[#1a2e1b]">
                    {selectedCompanyForView?.name || 'Company'}
                  </Text>
                  <Text className="text-[11px] text-[#237227]">Branches</Text>
                </View>
              </View>
            </View>

            <ScrollView className="max-h-[50vh] px-6 py-5">
              {branchesListView.length === 0 ? (
                <View className="items-center rounded-xl bg-[#f8fafb] border border-[#f0f4f0] p-4">
                  <Ionicons name="business-outline" size={24} color="#237227" />
                  <Text className="mt-2 text-[13px] text-[#8fa88f]">No branches yet</Text>
                </View>
              ) : (
                branchesListView.map((branch) => (
                  <View key={branch.id} className="mb-3 rounded-[10px] bg-[#f8fafb] border border-[#f0f4f0] p-3">
                    <View className="flex-row items-center">
                      <Ionicons name="location-outline" size={18} color="#237227" />
                      <Text className="ml-2 text-[13px] font-medium text-[#1a2e1b]">{branch.name}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View className="flex-row gap-[10px] px-6 pb-6 pt-2">
              <TouchableOpacity
                className="flex-1 h-[42px] items-center justify-center rounded-[8px] border border-[#237227] bg-[#f8fafb]"
                onPress={() => setIsViewBranchModalOpen(false)}>
                <Text className="text-[14px] font-semibold text-[#1a2e1b]">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Add Company Modal ───────────────────────────────────────────── */}
      <Modal
        visible={isAddModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}>
        <View className="items-center justify-center flex-1 p-4 md:p-6 bg-black/30">
          <View className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-lg shadow-black/10">
            <View className="flex-row items-center justify-between border-b border-[#f0f4f0] px-6 py-[18px]">
              <View className="flex-row items-center gap-[10px]">
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-[#e8f5e9]">
                  <Ionicons name="business-outline" size={16} color="#237227" />
                </View>
                <View>
                  <Text className="text-[15px] font-bold text-[#1a2e1b]">Add New Company</Text>
                  <Text className="text-[11px] text-[#8fa88f]">Fill in the details below</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsAddModalOpen(false);
                  resetForm();
                }}>
                <Ionicons name="close-outline" size={20} color="#8fa88f" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-[60vh] px-6 py-5">
              <View className="gap-[13px]">
                {/* Company Name */}
                <View className="gap-[5px]">
                  <Text className="text-[12px] font-semibold text-[#1c1917]">
                    Company Name <Text className="text-[#ef4444]">*</Text>
                  </Text>
                  <View className={`flex-row items-center bg-[#f8fafb] border ${touched.companyName && errors.companyName ? 'border-[#ef4444]' : 'border-[#e5e7eb]'} rounded-[8px] px-3 h-[42px]`}>
                    <Ionicons name="business-outline" size={15} color="#8fa88f" className="mr-2" />
                    <TextInput
                      className="flex-1 text-[13px] text-[#1a2e1b] ml-1"
                      placeholder="e.g., Acme Corporation"
                      placeholderTextColor="#8fa88f"
                      value={companyName}
                      onChangeText={(v) => handleFieldChange('companyName', v)}
                      onBlur={() => handleFieldBlur('companyName', companyName)}
                      maxLength={100}
                    />
                  </View>
                  {touched.companyName && errors.companyName && (
                    <Text className="mt-1 text-[11px] text-[#ef4444]">{errors.companyName}</Text>
                  )}
                </View>

                {/* Industry */}
                <View className="gap-[5px]">
                  <Text className="text-[12px] font-semibold text-[#1c1917]">
                    Industry/Sector <Text className="text-[#ef4444]">*</Text>
                  </Text>
                  <View className={`flex-row items-center bg-[#f8fafb] border ${touched.industry && errors.industry ? 'border-[#ef4444]' : 'border-[#e5e7eb]'} rounded-[8px] px-3 h-[42px]`}>
                    <Ionicons name="briefcase-outline" size={15} color="#8fa88f" className="mr-2" />
                    <TextInput
                      className="flex-1 text-[13px] text-[#1a2e1b] ml-1"
                      placeholder="e.g., Technology & Security"
                      placeholderTextColor="#8fa88f"
                      value={industry}
                      onChangeText={(v) => handleFieldChange('industry', v)}
                      onBlur={() => handleFieldBlur('industry', industry)}
                      maxLength={100}
                    />
                  </View>
                  {touched.industry && errors.industry && (
                    <Text className="mt-1 text-[11px] text-[#ef4444]">{errors.industry}</Text>
                  )}
                </View>

                {/* Number of Branches */}
                <View className="gap-[5px]">
                  <Text className="text-[12px] font-semibold text-[#1c1917]">Number of Branches</Text>
                  <View className={`flex-row items-center bg-[#f8fafb] border ${touched.branches && errors.branches ? 'border-[#ef4444]' : 'border-[#e5e7eb]'} rounded-[8px] px-3 h-[42px]`}>
                    <Ionicons name="git-branch-outline" size={15} color="#8fa88f" className="mr-2" />
                    <TextInput
                      className="flex-1 text-[13px] text-[#1a2e1b] ml-1"
                      placeholder="e.g., 3"
                      placeholderTextColor="#8fa88f"
                      keyboardType="numeric"
                      value={branches}
                      onChangeText={(v) => handleFieldChange('branches', v)}
                      onBlur={() => handleFieldBlur('branches', branches)}
                    />
                  </View>
                  {touched.branches && errors.branches && (
                    <Text className="mt-1 text-[11px] text-[#ef4444]">{errors.branches}</Text>
                  )}
                </View>

                {/* Branch Names */}
                {(() => {
                  const num = parseInt(branches) || 0;
                  if (num <= 0) return null;
                  return (
                    <View className="gap-[8px] mt-2 border-t border-[#f0f4f0] pt-4">
                      <Text className="text-[12px] font-semibold text-[#1c1917]">Branch Names</Text>
                      {Array.from({ length: num }).map((_, idx) => (
                        <View key={idx} className={`flex-row items-center bg-[#f8fafb] border ${touched.branchNames && errors.branchNames ? 'border-[#ef4444]' : 'border-[#e5e7eb]'} rounded-[8px] px-3 h-[42px]`}>
                          <Ionicons name="location-outline" size={15} color="#8fa88f" className="mr-2" />
                          <TextInput
                            className="flex-1 text-[13px] text-[#1a2e1b] ml-1"
                            placeholder={`Branch ${idx + 1} name`}
                            placeholderTextColor="#8fa88f"
                            value={branchNames[idx] ?? ''}
                            onChangeText={(value) => handleBranchNameChange(idx, value)}
                          />
                        </View>
                      ))}
                      {touched.branchNames && errors.branchNames && (
                        <Text className="mt-1 text-[11px] text-[#ef4444]">{errors.branchNames}</Text>
                      )}
                    </View>
                  );
                })()}
              </View>
            </ScrollView>

            <View className="flex-row gap-[10px] border-t border-[#f0f4f0] px-6 pb-6 pt-4">
              <TouchableOpacity
                className="flex-1 h-[42px] items-center justify-center rounded-[8px] border border-[#e5e7eb] bg-[#f8fafb]"
                onPress={() => {
                  setIsAddModalOpen(false);
                  resetForm();
                }}>
                <Text className="text-[14px] font-semibold text-[#1a2e1b]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 h-[42px] items-center justify-center flex-row gap-[6px] rounded-[8px] bg-[#237227]"
                onPress={handleAddCompany}>
                <Ionicons name="checkmark-outline" size={16} color="#ffffff" />
                <Text className="text-[14px] font-semibold text-white">Save Company</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}