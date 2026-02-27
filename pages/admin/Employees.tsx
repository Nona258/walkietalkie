import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
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
  textPrimary: '#1a2e1b',
  textSecondary: '#4b6b4d',
  textMuted: '#8fa88f',
};

// ─── Types ──────────────────────────────────────────────────────────────────────
type EmployeeStatus = 'online' | 'offline';
type EmployeeRole = 'Field Operator' | 'Supervisor' | 'Security Guard' | 'Site Manager' | 'Dev Ops';

interface Employee {
  id: number;
  full_name: string;
  role: EmployeeRole;
  email: string;
  phone_number: string;
  status: EmployeeStatus;
  company: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────────
const MOCK_EMPLOYEES: Employee[] = [
  { id: 1, full_name: 'John Doe',     role: 'Field Operator', email: 'john.doe@example.com',      phone_number: '+1 555-0101', status: 'online',  company: 'Example Corp'        },
  { id: 2, full_name: 'Sarah Kim',    role: 'Supervisor',     email: 'sarah.kim@northshield.com',  phone_number: '+1 555-0102', status: 'online',  company: 'NorthShield Security' },
  { id: 3, full_name: 'Marcus Lee',   role: 'Site Manager',   email: 'marcus.lee@globallog.com',   phone_number: '+1 555-0103', status: 'offline', company: 'Global Logistics'    },
  { id: 4, full_name: 'Priya Nair',   role: 'Security Guard', email: 'priya.nair@northshield.com', phone_number: '+1 555-0104', status: 'online',  company: 'NorthShield Security' },
  { id: 5, full_name: 'Tom Brown',    role: 'Field Operator', email: 'tom.brown@example.com',      phone_number: '+1 555-0105', status: 'offline', company: 'Example Corp'        },
  { id: 6, full_name: 'Dev Ops Team', role: 'Dev Ops',        email: 'devops@example.com',         phone_number: '+1 555-0106', status: 'online',  company: 'Example Corp'        },
];

// ─── Props ──────────────────────────────────────────────────────────────────────
interface EmployeesProps {
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

// ─── Sub-components ─────────────────────────────────────────────────────────────

function EmployeeAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.borderLight }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.green }}>{initials}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: EmployeeStatus }) {
  const isOnline = status === 'online';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: isOnline ? COLORS.greenPale : '#f3f4f6', borderWidth: 1, borderColor: isOnline ? COLORS.green : COLORS.border, alignSelf: 'flex-start' }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isOnline ? COLORS.green : COLORS.textMuted }} />
      <Text style={{ fontSize: 10, fontWeight: '600', color: isOnline ? COLORS.green : COLORS.textMuted }}>
        {isOnline ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
}

function ColHeader({ label, flex, width }: { label: string; flex?: number; width?: number }) {
  return (
    <View style={flex !== undefined ? { flex } : { width }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}

function ActionBtn({ icon, onPress, danger }: { icon: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: danger ? '#fef2f2' : COLORS.cloudMist, borderWidth: 1, borderColor: danger ? '#fecaca' : COLORS.border, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name={icon as any} size={13} color={danger ? '#ef4444' : COLORS.textMuted} />
    </TouchableOpacity>
  );
}

function LabeledInput({ label, placeholder, value, onChangeText, icon }: { label: string; placeholder: string; value: string; onChangeText: (t: string) => void; icon: string }) {
  return (
    <View style={{ gap: 5 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textSecondary }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cloudMist, borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, paddingHorizontal: 12, height: 40, gap: 8 }}>
        <Ionicons name={icon as any} size={14} color={COLORS.textMuted} />
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={COLORS.textMuted} style={{ flex: 1, fontSize: 13, color: COLORS.textPrimary }} />
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Employees({ onNavigate }: EmployeesProps) {
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompany, setFormCompany] = useState('');

  const filtered = [...employees]
    .sort((a, b) => (a.status === 'online' ? -1 : 1))
    .filter((e) =>
      e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.phone_number.includes(searchQuery)
    );

  const openEdit = (emp: Employee) => { setSelectedEmployee(emp); setFormName(emp.full_name); setFormRole(emp.role); setFormEmail(emp.email); setFormPhone(emp.phone_number); setFormCompany(emp.company); setIsEditModalOpen(true); };
  const openView = (emp: Employee) => { setSelectedEmployee(emp); setIsViewModalOpen(true); };
  const openDelete = (emp: Employee) => { setDeleteTarget(emp); setIsDeleteModalOpen(true); };

  const handleAdd = () => {
    if (!formName.trim()) return;
    setEmployees((prev) => [...prev, { id: Date.now(), full_name: formName.trim(), role: (formRole.trim() || 'Field Operator') as EmployeeRole, email: formEmail.trim(), phone_number: formPhone.trim(), status: 'offline', company: formCompany.trim() || '—' }]);
    resetForm(); setIsAddModalOpen(false);
  };

  const handleEdit = () => {
    if (!selectedEmployee) return;
    setEmployees((prev) => prev.map((e) => e.id === selectedEmployee.id ? { ...e, full_name: formName, role: formRole as EmployeeRole, email: formEmail, phone_number: formPhone, company: formCompany } : e));
    resetForm(); setIsEditModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setEmployees((prev) => prev.filter((e) => e.id !== deleteTarget.id));
    setDeleteTarget(null); setIsDeleteModalOpen(false);
  };

  const resetForm = () => { setFormName(''); setFormRole(''); setFormEmail(''); setFormPhone(''); setFormCompany(''); setSelectedEmployee(null); };
  const trimEmail = (email: string, max = 26) => email.length > max ? email.slice(0, max) + '…' : email;
  const onlineCount = employees.filter((e) => e.status === 'online').length;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.cloudMist }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* ── Top Header ─────────────────────────────────────────────────────── */}
        <View style={{ backgroundColor: COLORS.white, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 26 }}>Employee Management</Text>
            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 1 }}>Welcome back, Administrator</Text>
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
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48, width: '100%' }}>

          {/* Stats strip */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Employees', value: `${employees.length}`,                              icon: 'people-outline'           },
              { label: 'Online Now',      value: `${onlineCount}`,                                   icon: 'radio-button-on-outline'  },
              { label: 'Offline',         value: `${employees.length - onlineCount}`,                icon: 'radio-button-off-outline' },
              { label: 'Roles',           value: `${new Set(employees.map((e) => e.role)).size}`,    icon: 'briefcase-outline'        },
            ].map((stat) => (
              <View key={stat.label} style={{ flex: 1, minWidth: 140, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={stat.icon as any} size={18} color={COLORS.green} />
                </View>
                <View>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.textPrimary }}>{stat.value}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>{stat.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Table — stretches full width ─────────────────────────────────── */}
          <View style={{ backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', width: '100%' }}>

            {/* Toolbar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexWrap: 'wrap', gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="people-outline" size={16} color={COLORS.green} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }}>All Employees</Text>
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: COLORS.greenPale, borderWidth: 1, borderColor: COLORS.borderLight }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.green }}>{filtered.length}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cloudMist, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, height: 34, gap: 6, minWidth: 220 }}>
                  <Ionicons name="search-outline" size={13} color={COLORS.textMuted} />
                  <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search by name, role, email…" placeholderTextColor={COLORS.textMuted} style={{ flex: 1, fontSize: 13, color: COLORS.textPrimary }} />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={13} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={() => { resetForm(); setIsAddModalOpen(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, height: 34, backgroundColor: COLORS.green, borderRadius: 8 }}>
                  <Ionicons name="person-add-outline" size={14} color={COLORS.white} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.white }}>Add Employee</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Column Headers */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.cloudMist, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <ColHeader label="Employee"  flex={3} />
              <ColHeader label="Role"      flex={2} />
              <ColHeader label="Email"     flex={3} />
              <ColHeader label="Phone"     flex={2} />
              <ColHeader label="Status"    flex={1} />
              <View style={{ width: 96 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Actions</Text>
              </View>
            </View>

            {/* Rows */}
            {filtered.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 60, gap: 10 }}>
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="people-outline" size={22} color={COLORS.green} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>No employees found</Text>
                <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                  {searchQuery ? 'Try a different search term.' : 'Add your first employee to get started.'}
                </Text>
              </View>
            ) : (
              filtered.map((emp, index) => (
                <View
                  key={emp.id}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: index === filtered.length - 1 ? 0 : 1, borderBottomColor: COLORS.borderLight, backgroundColor: COLORS.white }}
                >
                  <View style={{ flex: 3, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <EmployeeAvatar name={emp.full_name} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>{emp.full_name}</Text>
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{emp.role}</Text>
                  </View>
                  <View style={{ flex: 3 }}>
                    <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{trimEmail(emp.email)}</Text>
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{emp.phone_number}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <StatusPill status={emp.status} />
                  </View>
                  <View style={{ width: 96, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ActionBtn icon="create-outline" onPress={() => openEdit(emp)} />
                    <ActionBtn icon="eye-outline"    onPress={() => openView(emp)} />
                    <ActionBtn icon="trash-outline"  onPress={() => openDelete(emp)} danger />
                  </View>
                </View>
              ))
            )}

            {/* Table Footer */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight, backgroundColor: COLORS.cloudMist }}>
              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                Showing {filtered.length} of {employees.length} employees
              </Text>
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

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      <Modal visible={isAddModalOpen || isEditModalOpen} transparent animationType="fade" onRequestClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}>
          <Pressable style={{ width: '100%', maxWidth: 460, backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }} onPress={() => {}}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={isAddModalOpen ? 'person-add-outline' : 'create-outline'} size={16} color={COLORS.green} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary }}>
                  {isAddModalOpen ? 'Add New Employee' : 'Edit Employee'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}>
                <Ionicons name="close-outline" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 24, gap: 13 }}>
              <LabeledInput label="Full Name" placeholder="e.g. Jane Smith"       value={formName}    onChangeText={setFormName}    icon="person-outline"    />
              <LabeledInput label="Role"      placeholder="e.g. Supervisor"       value={formRole}    onChangeText={setFormRole}    icon="briefcase-outline" />
              <LabeledInput label="Email"     placeholder="e.g. jane@company.com" value={formEmail}   onChangeText={setFormEmail}   icon="mail-outline"      />
              <LabeledInput label="Phone"     placeholder="e.g. +1 555-0000"      value={formPhone}   onChangeText={setFormPhone}   icon="call-outline"      />
              <LabeledInput label="Company"   placeholder="e.g. Example Corp"     value={formCompany} onChangeText={setFormCompany} icon="business-outline"  />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingBottom: 24 }}>
              <TouchableOpacity onPress={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} style={{ flex: 1, height: 40, borderRadius: 9, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.cloudMist }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={isAddModalOpen ? handleAdd : handleEdit} style={{ flex: 1, height: 40, borderRadius: 9, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 }}>
                <Ionicons name="checkmark-outline" size={15} color={COLORS.white} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.white }}>
                  {isAddModalOpen ? 'Add Employee' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── View Modal ───────────────────────────────────────────────────────── */}
      <Modal visible={isViewModalOpen} transparent animationType="fade" onRequestClose={() => setIsViewModalOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center', padding: 24 }} onPress={() => setIsViewModalOpen(false)}>
          <Pressable style={{ width: '100%', maxWidth: 400, backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }} onPress={() => {}}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <EmployeeAvatar name={selectedEmployee?.full_name ?? '?'} />
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }}>{selectedEmployee?.full_name}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{selectedEmployee?.role}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsViewModalOpen(false)}>
                <Ionicons name="close-outline" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 24, gap: 4 }}>
              {[
                { icon: 'mail-outline',     label: 'Email',   value: selectedEmployee?.email        },
                { icon: 'call-outline',     label: 'Phone',   value: selectedEmployee?.phone_number },
                { icon: 'business-outline', label: 'Company', value: selectedEmployee?.company      },
                { icon: 'ellipse-outline',  label: 'Status',  value: selectedEmployee?.status       },
              ].map((row) => (
                <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={row.icon as any} size={14} color={COLORS.textMuted} />
                    <Text style={{ fontSize: 13, color: COLORS.textMuted }}>{row.label}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>{row.value ?? '—'}</Text>
                </View>
              ))}
            </View>
            <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
              <TouchableOpacity onPress={() => setIsViewModalOpen(false)} style={{ height: 40, borderRadius: 9, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' }}>
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
            <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary }}>Remove Employee?</Text>
            <Text style={{ fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 }}>
              <Text style={{ fontWeight: '600', color: COLORS.textSecondary }}>{deleteTarget?.full_name}</Text>
              {' '}will be permanently removed from the system.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 }}>
              <TouchableOpacity onPress={() => setIsDeleteModalOpen(false)} style={{ flex: 1, height: 40, borderRadius: 9, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.cloudMist }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={{ flex: 1, height: 40, borderRadius: 9, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.white }}>Remove</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Notification Modal ───────────────────────────────────────────────── */}
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
                <Ionicons name="person-add-outline" size={15} color={COLORS.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: COLORS.textPrimary, fontWeight: '500', lineHeight: 16 }}>New employee John Doe was registered</Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>2 min ago</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setIsNotificationOpen(false)} style={{ margin: 12, paddingVertical: 9, backgroundColor: COLORS.green, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.white }}>Mark all as read</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}