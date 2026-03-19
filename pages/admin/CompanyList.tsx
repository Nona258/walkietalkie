import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';

// ─── Types ──────────────────────────────────────────────────────────────────────
interface Company {
  id: number;
  name: string;
  industry: string;
  branches: number;
  initials: string;
  employees: number;
  status: 'Active' | 'Inactive';
  location: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────────
const MOCK_COMPANIES: Company[] = [
  { id: 1, name: 'Example Corp',         industry: 'Technology',      branches: 3,  initials: 'EC', employees: 148, status: 'Active',   location: 'San Francisco, CA' },
  { id: 2, name: 'Global Logistics',     industry: 'Transport',       branches: 12, initials: 'GL', employees: 420, status: 'Active',   location: 'Chicago, IL'       },
  { id: 3, name: 'NorthShield Security', industry: 'Security',        branches: 7,  initials: 'NS', employees: 305, status: 'Active',   location: 'Dallas, TX'        },
  { id: 4, name: 'Omega Facilities',     industry: 'Facilities Mgmt', branches: 2,  initials: 'OF', employees: 60,  status: 'Inactive', location: 'Atlanta, GA'       },
];

// ─── Props ──────────────────────────────────────────────────────────────────────
interface CompanyListProps {
  onNavigate: (
    page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings'
  ) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function CompanyAvatar({ initials }: { initials: string }) {
  return (
    <View className="w-9 h-9 rounded-full bg-[#237227] items-center justify-center border border-[#f0f4f0]">
      <Text className="text-[12px] font-bold text-[#f8fafb]">{initials}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: 'Active' | 'Inactive' }) {
  const isActive = status === 'Active';
  return (
    <View
      className={
        `px-2 py-[3px] rounded-full border self-start ` +
        (isActive ? 'bg-[#e8f5e9] border-[#237227]' : 'bg-[#f3f4f6] border-[#e5e7eb]')
      }
    >
      <Text className={`text-[10px] font-semibold ${isActive ? 'text-[#237227]' : 'text-[#78716c]'}`}>{status}</Text>
    </View>
  );
}

function ColHeader({ label, className }: { label: string; className?: string }) {
  return (
    <View className={className}>
      <Text className="text-[11px] font-semibold text-[#78716c] uppercase tracking-[0.5px]">{label}</Text>
    </View>
  );
}

function CompanyRow({ company, isLast, onPress, onDelete, isWebView }: { company: Company; isLast: boolean; onPress: () => void; onDelete: () => void; isWebView: boolean }) {
  if (!isWebView) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className={`p-4 bg-white ${isLast ? '' : 'border-b border-[#f0f4f0]'}`}
      >
        <View className="flex-row items-start gap-3">
          <CompanyAvatar initials={company.initials} />
          <View className="flex-1 gap-2">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-[14px] font-semibold text-[#1c1917]">{company.name}</Text>
                <Text className="text-[12px] text-[#78716c] mt-0.5">{company.industry}</Text>
              </View>
              <StatusPill status={company.status} />
            </View>
            <View className="gap-[6px]">
              <View className="flex-row items-center gap-[6px]">
                <Ionicons name="location-outline" size={13} color="#78716c" />
                <Text className="text-[12px] text-[#44403c] flex-1">{company.location}</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center gap-[5px]">
                  <Ionicons name="business-outline" size={13} color="#78716c" />
                  <Text className="text-[12px] text-[#44403c]">{company.branches} branches</Text>
                </View>
                <View className="flex-row items-center gap-[5px]">
                  <Ionicons name="people-outline" size={13} color="#78716c" />
                  <Text className="text-[12px] text-[#44403c]">{company.employees} employees</Text>
                </View>
              </View>
            </View>
            <View className="flex-row gap-2 mt-1">
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
                className="flex-1 flex-row items-center justify-center gap-[5px] py-2 rounded-[7px] bg-[#fee2e2] border border-[#ef4444]"
              >
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                <Text className="text-[12px] font-semibold text-[#ef4444]">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={
        `flex-row items-center px-5 py-[14px] bg-white ` +
        (isLast ? '' : 'border-b border-[#f0f4f0]')
      }
    >
      <View className="flex-[3] flex-row items-center gap-3">
        <CompanyAvatar initials={company.initials} />
        <View className="gap-[2px]">
          <Text className="text-[13px] font-semibold text-[#1c1917]">{company.name}</Text>
          <Text className="text-[11px] text-[#78716c]">{company.industry}</Text>
        </View>
      </View>
      <View className="flex-[2] flex-row items-center gap-[5px]">
        <Ionicons name="location-outline" size={12} color="#78716c" />
        <Text className="text-[12px] text-[#44403c]">{company.location}</Text>
      </View>
      <View className="flex-1 flex-row items-center gap-[5px]">
        <Ionicons name="business-outline" size={12} color="#78716c" />
        <Text className="text-[12px] text-[#44403c]">{company.branches}</Text>
      </View>
      <View className="flex-1 flex-row items-center gap-[5px]">
        <Ionicons name="people-outline" size={12} color="#78716c" />
        <Text className="text-[12px] text-[#44403c]">{company.employees}</Text>
      </View>
      <View className="flex-1">
        <StatusPill status={company.status} />
      </View>
      <View className="flex-row items-center justify-center w-20 gap-1.5">
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation?.(); onPress(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="w-7 h-7 rounded-[7px] bg-[#237227] items-center justify-center"
        >
          <Ionicons name="eye-outline" size={13} color="#f8fafb" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="w-7 h-7 rounded-[7px] bg-[#fee2e2] border border-[#ef4444] items-center justify-center"
        >
          <Ionicons name="trash-outline" size={13} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function LabeledInput({ label, placeholder, value, onChangeText, icon }: { label: string; placeholder: string; value: string; onChangeText: (t: string) => void; icon: string }) {
  return (
    <View className="gap-[6px]">
      <Text className="text-[12px] font-semibold text-[#44403c]">{label}</Text>
      <View className="flex-row items-center bg-[#f8fafb] border border-[#e5e7eb] rounded-[9px] px-3 h-10 gap-2">
        <Ionicons name={icon as any} size={14} color="#78716c" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#78716c"
          className="flex-1 text-[13px] text-[#1c1917]"
        />
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CompanyList({ onNavigate, isMobileMenuOpen, setIsMobileMenuOpen }: CompanyListProps) {
  const PAGE_SIZE = 10;

  const windowWidth = Dimensions.get('window').width;
  const isWebView = windowWidth > 900;

  const pageX = isWebView ? 'px-6' : 'px-4';
  const titleSize = isWebView ? 'text-[30px]' : 'text-[20px]';
  const subtitleSize = isWebView ? 'text-[16px]' : 'text-[12px]';

  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [employees, setEmployees] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return companies.filter(
      (c) => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q)
    );
  }, [companies, searchQuery]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  }, [filtered.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(p, 1), totalPages));
  }, [totalPages]);

  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const showingCount = useMemo(() => {
    if (filtered.length === 0) return 0;
    const end = currentPage * PAGE_SIZE;
    return Math.min(end, filtered.length);
  }, [filtered.length, currentPage]);

  const handleAddCompany = () => {
    if (!companyName.trim()) return;
    const initials = companyName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
    setCompanies((prev) => [...prev, { id: Date.now(), name: companyName.trim(), industry: industry.trim() || 'General', branches: 1, initials, employees: parseInt(employees) || 0, status: 'Active', location: location.trim() || '—' }]);
    setCompanyName(''); setIndustry(''); setLocation(''); setEmployees('');
    setIsAddModalOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setCompanies((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null); setIsDeleteModalOpen(false);
  };

  return (
    <View className="flex-1 bg-[#f8fafb]">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

        {/* ── Top Header ─────────────────────────────────────────────────────── */}
        <View className={`bg-[#f8fafb] ${pageX} pt-[18px] pb-4 border-b border-[#e5e7eb] flex-row items-center justify-between`}>
          <View className="flex-row items-center flex-1">
            {!isWebView && setIsMobileMenuOpen && (
              <TouchableOpacity
                onPress={() => setIsMobileMenuOpen(true)}
                className="items-center justify-center w-10 h-10 mr-3"
              >
                <Ionicons name="menu-outline" size={24} color="#237227" />
              </TouchableOpacity>
            )}
            <View className="flex-1">
              <Text className={`${titleSize} font-light text-[#1c1917] leading-[26px] mb-1`}>Company Management</Text>
              <Text className={`${subtitleSize} text-[#1c1917]`}>Welcome back, Administrator</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-[10px]">
            <TouchableOpacity onPress={() => setIsNotificationOpen(true)} className="w-10 h-10 rounded-full bg-[#f8fafb] items-center justify-center relative">
              <Ionicons name="notifications-outline" size={20} color="#44403c" />
              <View className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#237227]" />
            </TouchableOpacity>
            <View className="w-9 h-9 rounded-full bg-[#237227] items-center justify-center border border-[#e5e7eb]">
              <Text className="text-[11px] font-bold text-[#f8fafb]">AD</Text>
            </View>
          </View>
        </View>

        {/* ── Page Body ────────────────────────────────────────────────────────── */}
        <View className={`${pageX} ${isWebView ? 'pt-6' : 'pt-4'} pb-12 w-full`}>

          {/* Stats strip */}
          <View className={`flex-row ${isWebView ? 'gap-3' : 'gap-2'} ${isWebView ? 'mb-6' : 'mb-4'} flex-wrap`}>
            {[
              { label: 'Total Companies', value: `${companies.length}`,                                      icon: 'business-outline'   },
              { label: 'Active Sites',    value: `${companies.filter((c) => c.status === 'Active').length}`, icon: 'location-outline'   },
              { label: 'Active Users',    value: `${companies.reduce((s, c) => s + c.employees, 0)}`,        icon: 'people-outline'     },
              { label: 'Total Employees', value: `${companies.reduce((s, c) => s + c.employees, 0)}`,        icon: 'people-outline'     },
            ].map((stat) => (
              <View
                key={stat.label}
                className={
                  `bg-[#e8f5e9] rounded-xl border border-[#e5e7eb] flex-row items-center ` +
                  (isWebView ? 'flex-1 min-w-[140px] p-4 gap-3' : 'w-[48%] p-3 gap-[10px]')
                }
              >
                <View
                  className={
                    `rounded-[10px] bg-white items-center justify-center border border-[#f0f4f0] ` +
                    (isWebView ? 'w-[38px] h-[38px]' : 'w-[34px] h-[34px]')
                  }
                >
                  <Ionicons name={stat.icon as any} size={isWebView ? 18 : 16} color="#237227" />
                </View>
                <View className="flex-1">
                  <Text className={`${isWebView ? 'text-[20px]' : 'text-[18px]'} font-bold text-[#1c1917]`}>{stat.value}</Text>
                  <Text className={`${isWebView ? 'text-[11px]' : 'text-[10px]'} text-[#78716c] mt-[1px]`}>{stat.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Table Container ───────────────────────────────────────────────── */}
          <View className="bg-white rounded-[14px] border border-[#e5e7eb] overflow-hidden w-full">

            {/* Toolbar */}
            <View className={`${isWebView ? 'px-5' : 'px-4'} py-[14px] border-b border-[#e5e7eb] gap-3`}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-[10px]">
                  <Ionicons name="business-outline" size={16} color="#237227" />
                  <Text className="text-[14px] font-bold text-[#1c1917]">Company Profiles</Text>
                  <View className="px-2 py-[2px] rounded-full bg-[#e8f5e9] border border-[#f0f4f0]">
                    <Text className="text-[11px] font-semibold text-[#237227]">{filtered.length}</Text>
                  </View>
                </View>
                {isWebView && (
                  <TouchableOpacity onPress={() => setIsAddModalOpen(true)} className="flex-row items-center gap-[5px] px-[14px] h-[34px] bg-[#237227] rounded-lg">
                    <Ionicons name="add-outline" size={15} color="#ffffff" />
                    <Text className="text-[12px] font-semibold text-white">Add Company</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View className="flex-row items-center gap-[10px]">
                <View className="flex-1 flex-row items-center bg-[#f8fafb] border border-[#e5e7eb] rounded-lg px-[10px] h-9 gap-[6px]">
                  <Ionicons name="search-outline" size={13} color="#78716c" />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search companies…"
                    placeholderTextColor="#78716c"
                    className="flex-1 text-[13px] text-[#1c1917]"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={13} color="#78716c" />
                    </TouchableOpacity>
                  )}
                </View>
                {!isWebView && (
                  <TouchableOpacity onPress={() => setIsAddModalOpen(true)} className="w-9 h-9 bg-[#237227] rounded-lg items-center justify-center">
                    <Ionicons name="add-outline" size={18} color="#ffffff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Column headers */}
            {isWebView && (
              <View className="flex-row items-center px-5 py-[10px] bg-[#f8fafb] border-b border-[#e5e7eb]">
                <ColHeader label="Company" className="flex-[3]" />
                <ColHeader label="Location" className="flex-[2]" />
                <ColHeader label="Branches" className="flex-1" />
                <ColHeader label="Employees" className="flex-1" />
                <ColHeader label="Status" className="flex-1" />
                <View className="items-center w-20">
                  <Text className="text-[11px] font-semibold text-[#78716c] uppercase tracking-[0.5px]">Actions</Text>
                </View>
              </View>
            )}

            {/* Rows */}
            {filtered.length === 0 ? (
              <View className="items-center py-[60px] gap-[10px]">
                <View className="w-12 h-12 rounded-[12px] bg-[#e8f5e9] items-center justify-center">
                  <Ionicons name="business-outline" size={22} color="#237227" />
                </View>
                <Text className="text-[14px] font-semibold text-[#1c1917]">No companies found</Text>
                <Text className="text-[12px] text-[#78716c]">Try a different search or add a new company.</Text>
              </View>
            ) : (
              paginatedCompanies.map((company, index) => (
                <CompanyRow
                  key={company.id}
                  company={company}
                  isLast={index === paginatedCompanies.length - 1}
                  onPress={() => { setSelectedCompany(company); setIsBranchModalOpen(true); }}
                  onDelete={() => { setDeleteTarget(company); setIsDeleteModalOpen(true); }}
                  isWebView={isWebView}
                />
              ))
            )}

            {/* Table footer */}
            <View className={`flex-row items-center justify-between ${isWebView ? 'px-5' : 'px-4'} py-3 border-t border-[#f0f4f0] bg-[#f8fafb]`}>
              <Text className={`${isWebView ? 'text-[12px]' : 'text-[11px]'} text-black`}>Showing {showingCount} of {filtered.length} companies</Text>
              <View className="flex-row gap-[6px]">
                <TouchableOpacity
                  onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className={
                    "w-7 h-7 rounded-[7px] border border-[#e5e7eb] bg-white items-center justify-center " +
                    (currentPage <= 1 ? 'opacity-50' : '')
                  }
                >
                  <Ionicons name={'chevron-back-outline' as any} size={13} color="#44403c" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className={
                    "w-7 h-7 rounded-[7px] border border-[#e5e7eb] bg-white items-center justify-center " +
                    (currentPage >= totalPages ? 'opacity-50' : '')
                  }
                >
                  <Ionicons name={'chevron-forward-outline' as any} size={13} color="#44403c" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Notification Modal ──────────────────────────────────────────────── */}
      <Modal visible={isNotificationOpen} transparent animationType="fade" onRequestClose={() => setIsNotificationOpen(false)}>
        <Pressable className="flex-1 bg-black/15 justify-start items-end pt-[60px] pr-5" onPress={() => setIsNotificationOpen(false)}>
          <View className="w-[300px] bg-white rounded-[14px] border border-[#e5e7eb] overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-[14px] border-b border-[#f0f4f0]">
              <Text className="text-[14px] font-bold text-[#1c1917]">Notifications</Text>
              <View className="px-2 py-[2px] rounded-full bg-[#e8f5e9]">
                <Text className="text-[10px] font-semibold text-[#237227]">1 new</Text>
              </View>
            </View>
            <View className="flex-row items-start gap-[10px] px-4 py-3">
              <View className="w-8 h-8 rounded-lg bg-[#e8f5e9] items-center justify-center">
                <Ionicons name="business-outline" size={15} color="#237227" />
              </View>
              <View className="flex-1">
                <Text className="text-[12px] text-[#1c1917] font-medium leading-4">NorthShield Security was updated</Text>
                <Text className="text-[11px] text-[#78716c] mt-0.5">5 min ago</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setIsNotificationOpen(false)} className="m-3 py-[9px] bg-[#237227] rounded-lg items-center">
              <Text className="text-[12px] font-semibold text-white">Mark all as read</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ── Add Company Modal ────────────────────────────────────────────────── */}
      <Modal visible={isAddModalOpen} transparent animationType="fade" onRequestClose={() => setIsAddModalOpen(false)}>
        <Pressable className="items-center justify-center flex-1 p-6 bg-black/20" onPress={() => setIsAddModalOpen(false)}>
          <Pressable className="w-full max-w-[460px] bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden" onPress={() => {}}>
            <View className="flex-row items-center justify-between px-6 py-[18px] border-b border-[#f0f4f0]">
              <View className="flex-row items-center gap-[10px]">
                <View className="w-8 h-8 rounded-lg bg-[#e8f5e9] items-center justify-center">
                  <Ionicons name="business-outline" size={16} color="#237227" />
                </View>
                <Text className="text-[15px] font-bold text-[#1c1917]">Add New Company</Text>
              </View>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close-outline" size={20} color="#78716c" />
              </TouchableOpacity>
            </View>
            <View className="p-6 gap-[14px]">
              <LabeledInput label="Company Name" placeholder="e.g. Acme Corp"    value={companyName} onChangeText={setCompanyName} icon="business-outline"  />
              <LabeledInput label="Industry"     placeholder="e.g. Technology"   value={industry}    onChangeText={setIndustry}    icon="briefcase-outline" />
              <LabeledInput label="Location"     placeholder="e.g. New York, NY" value={location}    onChangeText={setLocation}    icon="location-outline"  />
              <LabeledInput label="Employees"    placeholder="e.g. 120"          value={employees}   onChangeText={setEmployees}   icon="people-outline"    />
            </View>
            <View className="flex-row gap-[10px] px-6 pb-6">
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)} className="flex-1 h-10 rounded-[9px] items-center justify-center bg-[#237227]">
                <Text className="text-[13px] font-semibold text-[#f8fafb]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddCompany} className="flex-1 h-10 rounded-[9px] bg-[#237227] items-center justify-center flex-row gap-[5px]">
                <Ionicons name="add-outline" size={15} color="#ffffff" />
                <Text className="text-[13px] font-semibold text-white">Save Company</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Branch Detail Modal ──────────────────────────────────────────────── */}
      <Modal visible={isBranchModalOpen} transparent animationType="fade" onRequestClose={() => setIsBranchModalOpen(false)}>
        <Pressable className="items-center justify-center flex-1 p-6 bg-black/20" onPress={() => setIsBranchModalOpen(false)}>
          <Pressable className="w-full max-w-[420px] bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden" onPress={() => {}}>
            <View className="flex-row items-center justify-between px-6 py-[18px] border-b border-[#f0f4f0]">
              <View className="flex-row items-center gap-[10px]">
                <CompanyAvatar initials={selectedCompany?.initials ?? '?'} />
                <View>
                  <Text className="text-[14px] font-bold text-[#1c1917]">{selectedCompany?.name}</Text>
                  <Text className="text-[11px] text-[#78716c]">{selectedCompany?.industry}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsBranchModalOpen(false)}>
                <Ionicons name="close-outline" size={20} color="#78716c" />
              </TouchableOpacity>
            </View>
            <View className="gap-1 p-6">
              {[
                { icon: 'business-outline', label: 'Branches',  value: `${selectedCompany?.branches}`   },
                { icon: 'people-outline',   label: 'Employees', value: `${selectedCompany?.employees}`  },
                { icon: 'location-outline', label: 'Location',  value: selectedCompany?.location ?? '—' },
                { icon: 'ellipse-outline',  label: 'Status',    value: selectedCompany?.status   ?? '—' },
              ].map((row) => (
                <View key={row.label} className="flex-row items-center justify-between py-[11px] border-b border-[#f0f4f0]">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name={row.icon as any} size={14} color="#78716c" />
                    <Text className="text-[13px] text-[#78716c]">{row.label}</Text>
                  </View>
                  <Text className="text-[13px] font-semibold text-[#1c1917]">{row.value}</Text>
                </View>
              ))}
            </View>
            <View className="px-6 pb-6">
              <TouchableOpacity onPress={() => setIsBranchModalOpen(false)} className="h-10 rounded-[9px] bg-[#237227] items-center justify-center">
                <Text className="text-[13px] font-semibold text-white">Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      <Modal visible={isDeleteModalOpen} transparent animationType="fade" onRequestClose={() => setIsDeleteModalOpen(false)}>
        <Pressable className="items-center justify-center flex-1 p-6 bg-black/20" onPress={() => setIsDeleteModalOpen(false)}>
          <Pressable className="w-full max-w-[360px] bg-white rounded-2xl border border-[#e5e7eb] p-6 items-center gap-3" onPress={() => {}}>
            <View className="w-12 h-12 rounded-[12px] bg-[#fee2e2] border border-[#ef4444] items-center justify-center">
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
            </View>
            <Text className="text-[15px] font-bold text-[#1c1917]">Delete Company?</Text>
            <Text className="text-[13px] text-[#78716c] text-center leading-[18px]">
              <Text className="font-semibold text-[#44403c]">{deleteTarget?.name}</Text> and all its data will be permanently removed.
            </Text>
            <View className="flex-row gap-[10px] w-full mt-1">
              <TouchableOpacity onPress={() => setIsDeleteModalOpen(false)} className="flex-1 h-10 rounded-[9px] items-center justify-center bg-[#237227]">
                <Text className="text-[13px] font-semibold text-[#f8fafb]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDelete} className="flex-1 h-10 rounded-[9px] bg-[#ef4444] items-center justify-center">
                <Text className="text-[13px] font-semibold text-white">Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}