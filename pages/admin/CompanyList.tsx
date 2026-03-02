import React, { useState } from 'react';
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

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const COLORS = {
  green: '#237227',
  greenLight: '#237227',
  greenPale: '#e8f5e9',
  cloudMist: '#f8fafb',
  white: '#ffffff',
  border: '#e5e7eb',
  borderLight: '#f0f4f0',
  textPrimary: '#1c1917',
  textSecondary: '#44403c',
  textMuted: '#78716c',
};

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
  { id: 1, name: 'Example Corp',        industry: 'Technology',     branches: 3,  initials: 'EC', employees: 148, status: 'Active',   location: 'San Francisco, CA' },
  { id: 2, name: 'Global Logistics',    industry: 'Transport',      branches: 12, initials: 'GL', employees: 420, status: 'Active',   location: 'Chicago, IL'       },
  { id: 3, name: 'NorthShield Security',industry: 'Security',       branches: 7,  initials: 'NS', employees: 305, status: 'Active',   location: 'Dallas, TX'        },
  { id: 4, name: 'Omega Facilities',    industry: 'Facilities Mgmt',branches: 2,  initials: 'OF', employees: 60,  status: 'Inactive', location: 'Atlanta, GA'       },
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
    <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.borderLight }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.green }}>{initials}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: 'Active' | 'Inactive' }) {
  const isActive = status === 'Active';
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: isActive ? COLORS.greenPale : '#f3f4f6', borderWidth: 1, borderColor: isActive ? COLORS.green : COLORS.border, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 10, fontWeight: '600', color: isActive ? COLORS.green : COLORS.textMuted }}>{status}</Text>
    </View>
  );
}

function ColHeader({ label, flex }: { label: string; flex: number }) {
  return (
    <View style={{ flex }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}

function CompanyRow({ company, isLast, onPress, onDelete, isWebView }: { company: Company; isLast: boolean; onPress: () => void; onDelete: () => void; isWebView: boolean }) {
  if (!isWebView) {
    // Mobile card view
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{ padding: 16, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: COLORS.borderLight, backgroundColor: COLORS.white }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <CompanyAvatar initials={company.initials} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{company.name}</Text>
                <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{company.industry}</Text>
              </View>
              <StatusPill status={company.status} />
            </View>
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
                <Text style={{ fontSize: 12, color: COLORS.textSecondary, flex: 1 }}>{company.location}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="business-outline" size={13} color={COLORS.textMuted} />
                  <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{company.branches} branches</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="people-outline" size={13} color={COLORS.textMuted} />
                  <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{company.employees} employees</Text>
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 7, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#ef4444' }}
              >
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#ef4444' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Desktop table row view
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: COLORS.borderLight, backgroundColor: COLORS.white }}
    >
      <View style={{ flex: 3, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <CompanyAvatar initials={company.initials} />
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>{company.name}</Text>
          <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{company.industry}</Text>
        </View>
      </View>
      <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
        <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{company.location}</Text>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Ionicons name="business-outline" size={12} color={COLORS.textMuted} />
        <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{company.branches}</Text>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Ionicons name="people-outline" size={12} color={COLORS.textMuted} />
        <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{company.employees}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <StatusPill status={company.status} />
      </View>
      <View style={{ width: 36, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="trash-outline" size={13} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function LabeledInput({ label, placeholder, value, onChangeText, icon }: { label: string; placeholder: string; value: string; onChangeText: (t: string) => void; icon: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textSecondary }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cloudMist, borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, paddingHorizontal: 12, height: 40, gap: 8 }}>
        <Ionicons name={icon as any} size={14} color={COLORS.textMuted} />
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={COLORS.textMuted} style={{ flex: 1, fontSize: 13, color: COLORS.textPrimary }} />
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CompanyList({ onNavigate, isMobileMenuOpen, setIsMobileMenuOpen }: CompanyListProps) {
  const windowWidth = Dimensions.get('window').width;
  const isWebView = windowWidth > 900;
  
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [employees, setEmployees] = useState('');

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <View style={{ flex: 1, backgroundColor: COLORS.cloudMist }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* ── Top Header ─────────────────────────────────────────────────────── */}
        <View style={{ backgroundColor: COLORS.white, paddingHorizontal: isWebView ? 24 : 16, paddingTop: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {!isWebView && setIsMobileMenuOpen && (
              <TouchableOpacity 
                onPress={() => setIsMobileMenuOpen(true)}
                style={{ 
                  marginRight: 12,
                  width: 40,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Ionicons name="menu" size={28} color={COLORS.green} />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 26 }}>Company Management</Text>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 1 }}>Welcome back, Administrator</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={() => setIsNotificationOpen(true)} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.cloudMist, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border }}>
              <View style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: COLORS.white, zIndex: 1 }} />
              <Ionicons name="notifications-outline" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.green }}>AD</Text>
            </View>
          </View>
        </View>

        {/* ── Page Body — full width, no maxWidth cap ───────────────────────── */}
        <View style={{ paddingHorizontal: isWebView ? 24 : 16, paddingTop: isWebView ? 24 : 16, paddingBottom: 48, width: '100%' }}>

          {/* Stats strip */}
          <View style={{ flexDirection: 'row', gap: isWebView ? 12 : 8, marginBottom: isWebView ? 24 : 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Companies', value: `${companies.length}`,                                      icon: 'business-outline'         },
              { label: 'Active',          value: `${companies.filter((c) => c.status === 'Active').length}`, icon: 'checkmark-circle-outline' },
              { label: 'Total Branches',  value: `${companies.reduce((s, c) => s + c.branches, 0)}`,         icon: 'git-branch-outline'       },
              { label: 'Total Employees', value: `${companies.reduce((s, c) => s + c.employees, 0)}`,        icon: 'people-outline'           },
            ].map((stat) => (
              <View key={stat.label} style={{ flex: isWebView ? 1 : undefined, width: isWebView ? undefined : '48%', minWidth: isWebView ? 140 : undefined, backgroundColor: COLORS.greenPale, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: isWebView ? 16 : 12, flexDirection: 'row', alignItems: 'center', gap: isWebView ? 12 : 10 }}>
                <View style={{ width: isWebView ? 38 : 34, height: isWebView ? 38 : 34, borderRadius: 10, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.borderLight }}>
                  <Ionicons name={stat.icon as any} size={isWebView ? 18 : 16} color={COLORS.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: isWebView ? 20 : 18, fontWeight: '700', color: COLORS.textPrimary }}>{stat.value}</Text>
                  <Text style={{ fontSize: isWebView ? 11 : 10, color: COLORS.textMuted, marginTop: 1 }}>{stat.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Table Container — full width ─────────────────────────────────── */}
          <View style={{ backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', width: '100%' }}>

            {/* Toolbar */}
            <View style={{ paddingHorizontal: isWebView ? 20 : 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="business-outline" size={16} color={COLORS.green} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }}>Company Profiles</Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: COLORS.greenPale, borderWidth: 1, borderColor: COLORS.borderLight }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.green }}>{filtered.length}</Text>
                  </View>
                </View>
                {isWebView && (
                  <TouchableOpacity onPress={() => setIsAddModalOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, height: 34, backgroundColor: COLORS.green, borderRadius: 8 }}>
                    <Ionicons name="add-outline" size={15} color={COLORS.white} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.white }}>Add Company</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cloudMist, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, height: 36, gap: 6 }}>
                  <Ionicons name="search-outline" size={13} color={COLORS.textMuted} />
                  <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search companies…" placeholderTextColor={COLORS.textMuted} style={{ flex: 1, fontSize: 13, color: COLORS.textPrimary }} />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={13} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                {!isWebView && (
                  <TouchableOpacity onPress={() => setIsAddModalOpen(true)} style={{ width: 36, height: 36, backgroundColor: COLORS.green, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="add-outline" size={18} color={COLORS.white} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Column headers */}
            {isWebView && (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.cloudMist, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                <ColHeader label="Company"   flex={3} />
                <ColHeader label="Location"  flex={2} />
                <ColHeader label="Branches"  flex={1} />
                <ColHeader label="Employees" flex={1} />
                <ColHeader label="Status"    flex={1} />
                <View style={{ width: 36 }} />
              </View>
            )}

            {/* Rows */}
            {filtered.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 60, gap: 10 }}>
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="business-outline" size={22} color={COLORS.green} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>No companies found</Text>
                <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Try a different search or add a new company.</Text>
              </View>
            ) : (
              filtered.map((company, index) => (
                <CompanyRow
                  key={company.id}
                  company={company}
                  isLast={index === filtered.length - 1}
                  onPress={() => { setSelectedCompany(company); setIsBranchModalOpen(true); }}
                  onDelete={() => { setDeleteTarget(company); setIsDeleteModalOpen(true); }}
                  isWebView={isWebView}
                />
              ))
            )}

            {/* Table footer */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: isWebView ? 20 : 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight, backgroundColor: COLORS.cloudMist }}>
              <Text style={{ fontSize: isWebView ? 12 : 11, color: COLORS.textMuted }}>Showing {filtered.length} of {companies.length} companies</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {['chevron-back-outline', 'chevron-forward-outline'].map((icon) => (
                  <TouchableOpacity key={icon} style={{ width: 28, height: 28, borderRadius: 7, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={icon as any} size={13} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Notification Modal ──────────────────────────────────────────────── */}
      <Modal visible={isNotificationOpen} transparent animationType="fade" onRequestClose={() => setIsNotificationOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 60, paddingRight: 20 }} onPress={() => setIsNotificationOpen(false)}>
          <View style={{ width: 300, backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }}>Notifications</Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: COLORS.greenPale }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: COLORS.green }}>1 new</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingVertical: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="business-outline" size={15} color={COLORS.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: COLORS.textPrimary, fontWeight: '500', lineHeight: 16 }}>NorthShield Security was updated</Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>5 min ago</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setIsNotificationOpen(false)} style={{ margin: 12, paddingVertical: 9, backgroundColor: COLORS.green, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.white }}>Mark all as read</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ── Add Company Modal ────────────────────────────────────────────────── */}
      <Modal visible={isAddModalOpen} transparent animationType="fade" onRequestClose={() => setIsAddModalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setIsAddModalOpen(false)}>
          <Pressable style={{ width: '100%', maxWidth: 460, backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }} onPress={() => {}}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="business-outline" size={16} color={COLORS.green} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary }}>Add New Company</Text>
              </View>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close-outline" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 24, gap: 14 }}>
              <LabeledInput label="Company Name" placeholder="e.g. Acme Corp"    value={companyName} onChangeText={setCompanyName} icon="business-outline"  />
              <LabeledInput label="Industry"     placeholder="e.g. Technology"   value={industry}    onChangeText={setIndustry}    icon="briefcase-outline" />
              <LabeledInput label="Location"     placeholder="e.g. New York, NY" value={location}    onChangeText={setLocation}    icon="location-outline"  />
              <LabeledInput label="Employees"    placeholder="e.g. 120"          value={employees}   onChangeText={setEmployees}   icon="people-outline"    />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingBottom: 24 }}>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)} style={{ flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.green }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.cloudMist }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddCompany} style={{ flex: 1, height: 40, borderRadius: 9, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 }}>
                <Ionicons name="add-outline" size={15} color={COLORS.white} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.white }}>Save Company</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Branch Detail Modal ──────────────────────────────────────────────── */}
      <Modal visible={isBranchModalOpen} transparent animationType="fade" onRequestClose={() => setIsBranchModalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setIsBranchModalOpen(false)}>
          <Pressable style={{ width: '100%', maxWidth: 420, backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }} onPress={() => {}}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <CompanyAvatar initials={selectedCompany?.initials ?? '?'} />
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }}>{selectedCompany?.name}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{selectedCompany?.industry}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsBranchModalOpen(false)}>
                <Ionicons name="close-outline" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 24, gap: 4 }}>
              {[
                { icon: 'business-outline', label: 'Branches',  value: `${selectedCompany?.branches}`   },
                { icon: 'people-outline',   label: 'Employees', value: `${selectedCompany?.employees}`  },
                { icon: 'location-outline', label: 'Location',  value: selectedCompany?.location ?? '—' },
                { icon: 'ellipse-outline',  label: 'Status',    value: selectedCompany?.status   ?? '—' },
              ].map((row) => (
                <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={row.icon as any} size={14} color={COLORS.textMuted} />
                    <Text style={{ fontSize: 13, color: COLORS.textMuted }}>{row.label}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>{row.value}</Text>
                </View>
              ))}
            </View>
            <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
              <TouchableOpacity onPress={() => setIsBranchModalOpen(false)} style={{ height: 40, borderRadius: 9, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.white }}>Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      <Modal visible={isDeleteModalOpen} transparent animationType="fade" onRequestClose={() => setIsDeleteModalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setIsDeleteModalOpen(false)}>
          <Pressable style={{ width: '100%', maxWidth: 360, backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 24, alignItems: 'center', gap: 12 }} onPress={() => {}}>
            <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary }}>Delete Company?</Text>
            <Text style={{ fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 }}>
              <Text style={{ fontWeight: '600', color: COLORS.textSecondary }}>{deleteTarget?.name}</Text>
              {' '}and all its data will be permanently removed.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 }}>
              <TouchableOpacity onPress={() => setIsDeleteModalOpen(false)} style={{ flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.green }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.cloudMist }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDelete} style={{ flex: 1, height: 40, borderRadius: 9, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.white }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}