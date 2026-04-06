import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase, {
  getEmployees,
  getPendingUsers,
  approveUser,
  deleteUserAccount,
} from '../../utils/supabase';
import '../../global.css';

// ── UI HELPER COMPONENTS ────────────────────────────────────────────────────
function EmployeeAvatar({ name }: { name: string }) {
  const initials =
    name?.split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  return (
    <View className="w-8 h-8 rounded-full bg-[#237227] items-center justify-center border border-[#f0f4f0]">
      <Text className="text-[11px] font-bold text-[#f8fafb]">{initials}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const isOnline = status === 'online';
  return (
    <View
      className={
        `flex-row items-center gap-[5px] px-2 py-[3px] rounded-full border self-start ` +
        (isOnline ? 'bg-[#e8f5e9] border-[#237227]' : 'bg-[#f3f4f6] border-[#e5e7eb]')
      }
    >
      <View className={`w-[6px] h-[6px] rounded-full ${isOnline ? 'bg-[#237227]' : 'bg-[#8fa88f]'}`} />
      <Text className={`text-[10px] font-semibold ${isOnline ? 'text-[#237227]' : 'text-[#8fa88f]'}`}>
        {isOnline ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
}

function ColHeader({ label, className }: { label: string; className?: string }) {
  return (
    <View className={className}>
      <Text className="text-[11px] font-semibold text-[#8fa88f] uppercase tracking-[0.5px]">
        {label}
      </Text>
    </View>
  );
}

function ActionBtn({ icon, onPress, danger }: { icon: any; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      className={
        `w-7 h-7 rounded-full items-center justify-center ` +
        (danger ? 'bg-[#ef4444]' : 'bg-[#237227]')
      }
    >
      <Ionicons name={icon} size={13} color="#f8fafb" />
    </TouchableOpacity>
  );
}

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
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
  pendingUsersCount?: number;
}

export default function Employees({ onNavigate, pendingUsersCount = 0 }: EmployeesProps) {
  const PAGE_SIZE = 10;
  const windowWidth = Dimensions.get('window').width;
  const isWebView = windowWidth > 900;
  const pageX = isWebView ? 'px-6' : 'px-4';
  const titleSize = isWebView ? 'text-[30px]' : 'text-[20px]';
  const subtitleSize = isWebView ? 'text-[16px]' : 'text-[12px]';

  // UI-only states for visibility
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  
  // Data states
  const [employees, setEmployees] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
  const [denyingUserId, setDenyingUserId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<any>(null);
  const [deletingEmployee, setDeletingEmployee] = useState(false);

  // Add employee form state
  const [addForm, setAddForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
  });
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Edit employee state
  const [editEmployee, setEditEmployee] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phoneNumber: '',
    role: 'employee',
    email: '',
  });
  const [updatingEmployee, setUpdatingEmployee] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (isUserManagementOpen) {
      fetchPendingUsers();
    }
  }, [isUserManagementOpen]);

  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch employees');
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    setPendingLoading(true);
    try {
      const data = await getPendingUsers();
      setPendingUsers(data || []);
    } catch (err: any) {
      console.error('Error fetching pending users:', err);
      Alert.alert('Error', 'Failed to fetch pending users');
    } finally {
      setPendingLoading(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    setApprovingUserId(userId);
    try {
      await approveUser(userId);
      setPendingUsers(pendingUsers.filter((u) => u.id !== userId));
      Alert.alert('Success', 'User approved successfully');
    } catch (err: any) {
      console.error('Error approving user:', err);
      Alert.alert('Error', 'Failed to approve user');
    } finally {
      setApprovingUserId(null);
    }
  };

  const handleDenyUser = async (userId: string) => {
    setDenyingUserId(userId);
    try {
      await deleteUserAccount(userId);
      setPendingUsers(pendingUsers.filter((u) => u.id !== userId));
      Alert.alert(
        'Success',
        'User account deleted from database.\n\nNote: Please also delete this user from Supabase Auth in your dashboard.'
      );
    } catch (err: any) {
      console.error('Error denying user:', err);
      Alert.alert('Error', 'Failed to delete user account');
    } finally {
      setDenyingUserId(null);
    }
  };

  const handleDeleteEmployee = (emp: any) => {
    setEmployeeToDelete(emp);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;
    setDeletingEmployee(true);
    try {
      await deleteUserAccount(employeeToDelete.id);
      await fetchEmployees(); 
      Alert.alert(
        'Success',
        `Employee ${employeeToDelete.full_name} deleted successfully.\n\nNote: Please also delete this user from Supabase Auth.`
      );
      setIsDeleteModalOpen(false);
      setEmployeeToDelete(null);
    } catch (err: any) {
      console.error('Error deleting employee:', err);
      Alert.alert('Error', err.message || 'Failed to delete employee');
    } finally {
      setDeletingEmployee(false);
    }
  };

  const trimEmail = (email: string, max = 26) => {
    if (!email) return 'N/A';
    return email.length > max ? email.slice(0, max) + '…' : email;
  };

  const validateAddForm = () => {
    const errors: Record<string, string> = {};
    if (!addForm.fullName.trim()) errors.fullName = 'Full name is required';
    if (!addForm.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(addForm.email)) errors.email = 'Email is invalid';
    if (!addForm.password) errors.password = 'Password is required';
    else if (addForm.password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (addForm.password !== addForm.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (!addForm.role) errors.role = 'Role is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddEmployee = async () => {
    if (!validateAddForm()) return;

    setAddingEmployee(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: addForm.email.trim(),
        password: addForm.password,
        options: {
          data: {
            full_name: addForm.fullName.trim(),
            phone_number: addForm.phoneNumber.trim(),
            role: addForm.role,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('User creation failed');

      const userId = authData.user.id;
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: addForm.email.trim(),
          full_name: addForm.fullName.trim(),
          phone_number: addForm.phoneNumber.trim(),
          role: addForm.role,
          is_approved: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (upsertError) throw upsertError;
      await fetchEmployees();

      Alert.alert('Success', `Employee ${addForm.fullName} has been added.`);
      setAddForm({
        fullName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        role: 'employee',
      });
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('Error adding employee:', err);
      Alert.alert('Error', err.message || 'Failed to add employee');
    } finally {
      setAddingEmployee(false);
    }
  };

  const openEditModal = (employee: any) => {
    setEditEmployee(employee);
    setEditForm({
      fullName: employee.full_name || '',
      phoneNumber: employee.phone_number || '',
      role: employee.role || 'employee',
      email: employee.email || '',
    });
    setEditErrors({});
    setIsEditModalOpen(true);
  };

  const validateEditForm = () => {
    const errors: Record<string, string> = {};
    if (!editForm.fullName.trim()) errors.fullName = 'Full name is required';
    if (!editForm.role) errors.role = 'Role is required';
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateEmployee = async () => {
    if (!validateEditForm() || !editEmployee) return;

    setUpdatingEmployee(true);
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: editForm.fullName.trim(),
          phone_number: editForm.phoneNumber.trim() || null,
          role: editForm.role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editEmployee.id);

      if (updateError) throw updateError;
      await fetchEmployees();

      Alert.alert('Success', `Employee ${editForm.fullName} has been updated.`);
      setIsEditModalOpen(false);
      setEditEmployee(null);
    } catch (err: any) {
      console.error('Error updating employee:', err);
      Alert.alert('Error', err.message || 'Failed to update employee');
    } finally {
      setUpdatingEmployee(false);
    }
  };

  // ── Sorting & Pagination Logic ─────────────────────────────────────────────
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      if (a.status === 'online' && b.status !== 'online') return -1;
      if (a.status !== 'online' && b.status === 'online') return 1;
      return 0;
    });
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return sortedEmployees.filter((emp) =>
      emp.full_name?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.role?.toLowerCase().includes(query) ||
      emp.phone_number?.toLowerCase().includes(query)
    );
  }, [sortedEmployees, searchQuery]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  }, [filteredEmployees.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(p, 1), totalPages));
  }, [totalPages]);

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEmployees.slice(start, start + PAGE_SIZE);
  }, [filteredEmployees, currentPage]);

  const showingCount = useMemo(() => {
    if (filteredEmployees.length === 0) return 0;
    const end = currentPage * PAGE_SIZE;
    return Math.min(end, filteredEmployees.length);
  }, [filteredEmployees.length, currentPage]);

  return (
    <View className="flex-1 bg-[#f8fafb]">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* ── Top Header ───────────────────────────────────────────────────── */}
        <View className={`bg-[#f8fafb] ${pageX} pt-[18px] pb-4 border-b border-[#e5e7eb] flex-row items-center justify-between`}>
          <View className="flex-row items-center flex-1">
            {!isWebView && (
              <TouchableOpacity
                onPress={() => setIsDrawerOpen(true)}
                className="items-center justify-center w-10 h-10 mr-3"
              >
                <Ionicons name="menu" size={28} color="#237227" />
              </TouchableOpacity>
            )}
            <View className="flex-1">
              <Text className={`${titleSize} font-light text-[#1a2e1b] leading-[26px]`}>
                Employee Management
              </Text>
              <Text className={`${subtitleSize} text-black mt-[1px]`}>
                Welcome back, Administrator
              </Text>
            </View>
          </View>
        </View>

        {/* ── Page Body ────────────────────────────────────────────────────── */}
        <View className={`${pageX} ${isWebView ? 'pt-6' : 'pt-4'} pb-12 w-full`}>
          <View className="bg-white rounded-[14px] border border-[#e5e7eb] overflow-hidden w-full">
            {/* Toolbar */}
            <View className={`${isWebView ? 'px-5' : 'px-4'} py-[14px] border-b border-[#e5e7eb] gap-3`}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-[10px]">
                  <Ionicons name="people-outline" size={16} color="#237227" />
                  <Text className="text-[14px] font-bold text-[#1a2e1b]">All Employees</Text>
                  <View className="px-2 py-[2px] rounded-full bg-[#e8f5e9] border border-[#f0f4f0]">
                    <Text className="text-[11px] font-semibold text-[#237227]">{filteredEmployees.length}</Text>
                  </View>
                </View>
                {isWebView && (
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => setIsUserManagementOpen(true)}
                      className="flex-row items-center gap-[5px] px-[14px] h-[34px] bg-[#237227] rounded-lg relative"
                    >
                      <Ionicons name="people" size={14} color="#f8fafb" />
                      <Text className="text-[12px] font-semibold text-[#f8fafb]">User Mgmt</Text>
                      {pendingUsersCount > 0 && (
                        <View className="absolute -top-2 -right-2 min-w-[20px] h-[20px] rounded-full bg-[#ef4444] items-center justify-center px-1">
                          <Text className="text-[10px] font-bold text-white">
                            {pendingUsersCount > 99 ? '99+' : pendingUsersCount}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setIsAddModalOpen(true)}
                      className="flex-row items-center gap-[5px] px-[14px] h-[34px] bg-[#237227] rounded-lg"
                    >
                      <Ionicons name="person-add-outline" size={14} color="#ffffff" />
                      <Text className="text-[12px] font-semibold text-white">Add Employee</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View className="flex-row items-center gap-[10px]">
                <View className="flex-1 flex-row items-center bg-[#f8fafb] border border-[#e5e7eb] rounded-lg px-[10px] h-9 gap-[6px]">
                  <Ionicons name="search-outline" size={13} color="#8fa88f" />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search employees…"
                    placeholderTextColor="#8fa88f"
                    className="flex-1 text-[13px] text-[#1a2e1b]"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={13} color="#8fa88f" />
                    </TouchableOpacity>
                  )}
                </View>

                {!isWebView && (
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => setIsUserManagementOpen(true)}
                      className="w-9 h-9 bg-[#237227] rounded-lg items-center justify-center relative"
                    >
                      <Ionicons name="people" size={18} color="#f8fafb" />
                      {pendingUsersCount > 0 && (
                        <View className="absolute -top-[6px] -right-[6px] min-w-[18px] h-[18px] rounded-full bg-[#ef4444] items-center justify-center px-[3px]">
                          <Text className="text-[9px] font-bold text-white">
                            {pendingUsersCount > 9 ? '9+' : pendingUsersCount}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setIsAddModalOpen(true)}
                      className="w-9 h-9 bg-[#237227] rounded-lg items-center justify-center"
                    >
                      <Ionicons name="person-add-outline" size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Loading / Error / Empty States */}
            {loading ? (
              <View className="items-center py-[60px] gap-[10px]">
                <ActivityIndicator size="large" color="#237227" />
                <Text className="text-[14px] text-[#8fa88f]">Loading employees...</Text>
              </View>
            ) : error ? (
              <View className="items-center py-[60px] gap-[10px]">
                <View className="w-12 h-12 rounded-[12px] bg-[#fef2f2] items-center justify-center">
                  <Ionicons name="alert-circle-outline" size={22} color="#ef4444" />
                </View>
                <Text className="text-[14px] font-semibold text-[#1a2e1b]">Error loading data</Text>
                <Text className="text-[12px] text-[#8fa88f]">{error}</Text>
              </View>
            ) : filteredEmployees.length === 0 ? (
              <View className="items-center py-[60px] gap-[10px]">
                <View className="w-12 h-12 rounded-[12px] bg-[#e8f5e9] items-center justify-center">
                  <Ionicons name="people-outline" size={22} color="#237227" />
                </View>
                <Text className="text-[14px] font-semibold text-[#1a2e1b]">No employees found</Text>
                <Text className="text-[12px] text-[#8fa88f]">
                  {searchQuery ? 'Try a different search term.' : 'Add your first employee to get started.'}
                </Text>
              </View>
            ) : (
              <>
                {/* Desktop Column Headers */}
                {isWebView && (
                  <View className="flex-row items-center px-5 py-[10px] bg-[#f8fafb] border-b border-[#e5e7eb]">
                    <ColHeader label="Employee" className="flex-[3]" />
                    <ColHeader label="Role" className="flex-[2]" />
                    <ColHeader label="Email" className="flex-[3]" />
                    <ColHeader label="Phone" className="flex-[2]" />
                    <ColHeader label="Status" className="flex-1" />
                    <View className="w-[70px]">
                      <Text className="text-[11px] font-semibold text-[#8fa88f] uppercase tracking-[0.5px]">Actions</Text>
                    </View>
                  </View>
                )}

                {/* Rows mapped correctly for both Web and Mobile Views */}
                {isWebView
                  ? paginatedEmployees.map((emp, index) => (
                      <View
                        key={emp.id}
                        className={
                          `flex-row items-center px-5 py-[13px] bg-white ` +
                          (index === paginatedEmployees.length - 1 ? '' : 'border-b border-[#f0f4f0]')
                        }
                      >
                        <View className="flex-[3] flex-row items-center gap-[10px]">
                          <EmployeeAvatar name={emp.full_name} />
                          <Text className="text-[13px] font-semibold text-[#1a2e1b]">{emp.full_name || 'N/A'}</Text>
                        </View>
                        <View className="flex-[2]">
                          <Text className="text-[12px] text-black capitalize">{emp.role || 'N/A'}</Text>
                        </View>
                        <View className="flex-[3]">
                          <Text className="text-[12px] text-black">{trimEmail(emp.email)}</Text>
                        </View>
                        <View className="flex-[2]">
                          <Text className="text-[12px] text-black">{emp.phone_number || 'N/A'}</Text>
                        </View>
                        <View className="flex-1">
                          <StatusPill status={emp.status} />
                        </View>
                        <View className="w-[70px] flex-row items-center gap-[6px]">
                          <ActionBtn icon="create-outline" onPress={() => openEditModal(emp)} />
                          <ActionBtn icon="trash-outline" onPress={() => handleDeleteEmployee(emp)} danger />
                        </View>
                      </View>
                    ))
                  : paginatedEmployees.map((emp, index) => (
                      <View
                        key={emp.id}
                        className={
                          `p-4 bg-white ` + (index === paginatedEmployees.length - 1 ? '' : 'border-b border-[#f0f4f0]')
                        }
                      >
                        <View className="flex-row items-start gap-3">
                          <EmployeeAvatar name={emp.full_name} />
                          <View className="flex-1 gap-2">
                            <View className="flex-row items-start justify-between">
                              <View className="flex-1">
                                <Text className="text-[14px] font-semibold text-[#1a2e1b]">{emp.full_name || 'N/A'}</Text>
                                <Text className="text-[14px] text-black mt-0.5 capitalize">{emp.role || 'N/A'}</Text>
                              </View>
                              <StatusPill status={emp.status} />
                            </View>
                            <View className="gap-[6px]">
                              <View className="flex-row items-center gap-[6px]">
                                <Ionicons name="mail-outline" size={13} color="#8fa88f" />
                                <Text className="text-[14px] text-black flex-1">{emp.email || 'N/A'}</Text>
                              </View>
                              <View className="flex-row items-center gap-[6px]">
                                <Ionicons name="call-outline" size={13} color="#8fa88f" />
                                <Text className="text-[14px] text-black">{emp.phone_number || 'N/A'}</Text>
                              </View>
                            </View>
                            <View className="flex-row gap-2 mt-1">
                              <TouchableOpacity
                                onPress={() => openEditModal(emp)}
                                className="flex-1 flex-row items-center justify-center gap-[5px] py-2 rounded-[7px] bg-[#000000] border border-[#237227]"
                              >
                                <Ionicons name="create-outline" size={14} color="#237227" />
                                <Text className="text-[14px] font-semibold text-stone-900">Edit</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleDeleteEmployee(emp)}
                                className="flex-1 flex-row items-center justify-center gap-[5px] py-2 rounded-[7px] bg-[#f8fafb] border border-[#ef4444]"
                              >
                                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                                <Text className="text-[14px] font-semibold text-[#ef4444]">Delete</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
              </>
            )}

            {/* Pagination Footer */}
            {!loading && !error && filteredEmployees.length > 0 && (
              <View className={`flex-row items-center justify-between ${isWebView ? 'px-5' : 'px-4'} py-3 border-t border-[#f0f4f0] bg-[#f8fafb]`}>
                <Text className={`${isWebView ? 'text-[12px]' : 'text-[14px]'} text-black`}>
                  Showing {showingCount} of {filteredEmployees.length} employees
                </Text>
                <View className="flex-row gap-[6px]">
                  <TouchableOpacity
                    onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className={
                      "w-7 h-7 rounded-[7px] border border-[#e5e7eb] bg-white items-center justify-center " +
                      (currentPage <= 1 ? 'opacity-50' : '')
                    }
                  >
                    <Ionicons name={'chevron-back-outline' as any} size={13} color="#4b6b4d" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className={
                      "w-7 h-7 rounded-[7px] border border-[#e5e7eb] bg-white items-center justify-center " +
                      (currentPage >= totalPages ? 'opacity-50' : '')
                    }
                  >
                    <Ionicons name={'chevron-forward-outline' as any} size={13} color="#4b6b4d" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── Add Employee Modal ───────────────────────────────────────────── */}
      <Modal visible={isAddModalOpen} transparent animationType="fade" onRequestClose={() => setIsAddModalOpen(false)}>
        <Pressable className="items-center justify-center flex-1 p-6 bg-black/20" onPress={() => setIsAddModalOpen(false)}>
          <Pressable className="w-full max-w-[460px] bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden" onPress={() => {}}>
            <View className="flex-row items-center justify-between px-6 py-[18px] border-b border-[#f0f4f0]">
              <View className="flex-row items-center gap-[10px]">
                <View className="w-8 h-8 rounded-lg bg-[#e8f5e9] items-center justify-center">
                  <Ionicons name="person-add-outline" size={16} color="#237227" />
                </View>
                <Text className="text-[15px] font-bold text-[#1a2e1b]">Add New Employee</Text>
              </View>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close-outline" size={20} color="#8fa88f" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-[60vh]">
              <View className="p-6 gap-[13px]">
                <View className="gap-[5px]">
                  <Text className="text-[12px] font-semibold text-[#1c1917]">Full Name *</Text>
                  <View className="flex-row items-center bg-[#f8fafb] border border-[#e5e7eb] rounded-[9px] px-3 h-10 gap-2">
                    <Ionicons name="person-outline" size={14} color="#8fa88f" />
                    <TextInput value={addForm.fullName} onChangeText={(text) => setAddForm({ ...addForm, fullName: text })} placeholder="e.g. Jane Smith" placeholderTextColor="#8fa88f" className="flex-1 text-[13px] text-[#1a2e1b]" />
                  </View>
                  {formErrors.fullName && <Text className="mt-1 text-[11px] text-[#ef4444]">{formErrors.fullName}</Text>}
                </View>

                <View className="gap-[5px]">
                  <Text className="text-[12px] font-semibold text-[#1c1917]">Email *</Text>
                  <View className="flex-row items-center bg-[#f8fafb] border border-[#e5e7eb] rounded-[9px] px-3 h-10 gap-2">
                    <Ionicons name="mail-outline" size={14} color="#8fa88f" />
                    <TextInput value={addForm.email} onChangeText={(text) => setAddForm({ ...addForm, email: text })} placeholder="e.g. jane@company.com" autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#8fa88f" className="flex-1 text-[13px] text-[#1a2e1b]" />
                  </View>
                  {formErrors.email && <Text className="mt-1 text-[11px] text-[#ef4444]">{formErrors.email}</Text>}
                </View>

                <View className="gap-[5px]">
                  <Text className="text-[12px] font-semibold text-[#1c1917]">Phone Number</Text>
                  <View className="flex-row items-center bg-[#f8fafb] border border-[#e5e7eb] rounded-[9px] px-3 h-10 gap-2">
                    <Ionicons name="call-outline" size={14} color="#8fa88f" />
                    <TextInput value={addForm.phoneNumber} onChangeText={(text) => setAddForm({ ...addForm, phoneNumber: text })} placeholder="e.g. +1 555-0000" keyboardType="phone-pad" placeholderTextColor="#8fa88f" className="flex-1 text-[13px] text-[#1a2e1b]" />
                  </View>
                </View>

                <View className="gap-[5px]">
                  <Text className="text-[12px] font-semibold text-[#1c1917]">Password *</Text>
                  <View className="flex-row items-center bg-[#f8fafb] border border-[#e5e7eb] rounded-[9px] px-3 h-10 gap-2">
                    <Ionicons name="lock-closed-outline" size={14} color="#8fa88f" />
                    <TextInput value={addForm.password} onChangeText={(text) => setAddForm({ ...addForm, password: text })} placeholder="••••••••" secureTextEntry placeholderTextColor="#8fa88f" className="flex-1 text-[13px] text-[#1a2e1b]" />
                  </View>
                  {formErrors.password && <Text className="mt-1 text-[11px] text-[#ef4444]">{formErrors.password}</Text>}
                </View>

                <View className="gap-[5px]">
                  <Text className="text-[12px] font-semibold text-[#1c1917]">Confirm Password *</Text>
                  <View className="flex-row items-center bg-[#f8fafb] border border-[#e5e7eb] rounded-[9px] px-3 h-10 gap-2">
                    <Ionicons name="shield-checkmark-outline" size={14} color="#8fa88f" />
                    <TextInput value={addForm.confirmPassword} onChangeText={(text) => setAddForm({ ...addForm, confirmPassword: text })} placeholder="••••••••" secureTextEntry placeholderTextColor="#8fa88f" className="flex-1 text-[13px] text-[#1a2e1b]" />
                  </View>
                  {formErrors.confirmPassword && <Text className="mt-1 text-[11px] text-[#ef4444]">{formErrors.confirmPassword}</Text>}
                </View>

                <View className="gap-[5px]">
                  <Text className="text-[12px] font-semibold text-[#1c1917]">Role *</Text>
                  <View className="flex-row p-1 border rounded-lg border-[#e5e7eb] bg-[#f8fafb]">
                    {['admin', 'employee'].map((role) => (
                      <TouchableOpacity
                        key={role}
                        className={`flex-1 items-center rounded-md py-2 ${addForm.role === role ? 'bg-[#237227]' : 'bg-transparent'}`}
                        onPress={() => setAddForm({ ...addForm, role })}
                      >
                        <Text className={`text-[13px] font-medium capitalize ${addForm.role === role ? 'text-white' : 'text-[#8fa88f]'}`}>
                          {role}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {formErrors.role && <Text className="mt-1 text-[11px] text-[#ef4444]">{formErrors.role}</Text>}
                </View>
              </View>
            </ScrollView>

            <View className="flex-row gap-[10px] px-6 pb-6">
              <TouchableOpacity
                onPress={() => {
                  setIsAddModalOpen(false);
                  setFormErrors({});
                }}
                className="flex-1 h-10 rounded-[9px] items-center justify-center bg-[#f8fafb] border border-[#237227]"
              >
                <Text className="text-[14px] font-semibold text-black">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddEmployee}
                disabled={addingEmployee}
                className="flex-1 h-10 rounded-[9px] bg-[#237227] items-center justify-center flex-row gap-[5px]"
              >
                {addingEmployee ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-outline" size={15} color="#ffffff" />
                    <Text className="text-[14px] font-semibold text-white">Add Employee</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Edit Employee Modal ──────────────────────────────────────────── */}
      <Modal visible={isEditModalOpen} transparent animationType="fade" onRequestClose={() => setIsEditModalOpen(false)}>
        <Pressable className="items-center justify-center flex-1 p-6 bg-black/20" onPress={() => setIsEditModalOpen(false)}>
          <Pressable className="w-full max-w-[460px] bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden" onPress={() => {}}>
            <View className="flex-row items-center justify-between px-6 py-[18px] border-b border-[#f0f4f0]">
              <View className="flex-row items-center gap-[10px]">
                <View className="w-8 h-8 rounded-lg bg-[#e8f5e9] items-center justify-center">
                  <Ionicons name="create-outline" size={16} color="#237227" />
                </View>
                <Text className="text-[15px] font-bold text-[#1a2e1b]">Edit Employee</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <Ionicons name="close-outline" size={20} color="#8fa88f" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-[60vh]">
              <View className="p-6 gap-[13px]">
                <View className="gap-[5px]">
                  <Text className="text-[12px] font-semibold text-[#1c1917]">Full Name *</Text>
                  <View className="flex-row items-center bg-[#f8fafb] border border-[#e5e7eb] rounded-[9px] px-3 h-10 gap-2">
                    <Ionicons name="person-outline" size={14} color="#8fa88f" />
                    <TextInput value={editForm.fullName} onChangeText={(text) => setEditForm({ ...editForm, fullName: text })} placeholder="Full name" placeholderTextColor="#8fa88f" className="flex-1 text-[13px] text-[#1a2e1b]" />
                  </View>
                  {editErrors.fullName && <Text className="mt-1 text-[11px] text-[#ef4444]">{editErrors.fullName}</Text>}
                </View>

                <View className="gap-[5px]">
                  <Text className="text-[12px] font-semibold text-[#1c1917]">Email</Text>
                  <View className="flex-row items-center bg-[#f3f4f6] border border-[#e5e7eb] rounded-[9px] px-3 h-10 gap-2 opacity-80">
                    <Ionicons name="mail-outline" size={14} color="#9ca3af" />
                    <TextInput value={editForm.email} editable={false} className="flex-1 text-[13px] text-[#6b7280]" />
                  </View>
                  <Text className="mt-1 text-[11px] text-[#8fa88f]">Email cannot be changed</Text>
                </View>

                <View className="gap-[5px]">
                  <Text className="text-[12px] font-semibold text-[#1c1917]">Phone Number</Text>
                  <View className="flex-row items-center bg-[#f8fafb] border border-[#e5e7eb] rounded-[9px] px-3 h-10 gap-2">
                    <Ionicons name="call-outline" size={14} color="#8fa88f" />
                    <TextInput value={editForm.phoneNumber} onChangeText={(text) => setEditForm({ ...editForm, phoneNumber: text })} placeholder="Phone number" keyboardType="phone-pad" placeholderTextColor="#8fa88f" className="flex-1 text-[13px] text-[#1a2e1b]" />
                  </View>
                </View>

                <View className="gap-[5px]">
                  <Text className="text-[12px] font-semibold text-[#1c1917]">Role *</Text>
                  <View className="flex-row p-1 border rounded-lg border-[#e5e7eb] bg-[#f8fafb]">
                    {['admin', 'employee', 'technician'].map((role) => (
                      <TouchableOpacity
                        key={role}
                        className={`flex-1 items-center rounded-md py-2 ${editForm.role === role ? 'bg-[#237227]' : 'bg-transparent'}`}
                        onPress={() => setEditForm({ ...editForm, role })}
                      >
                        <Text className={`text-[13px] font-medium capitalize ${editForm.role === role ? 'text-white' : 'text-[#8fa88f]'}`}>
                          {role}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {editErrors.role && <Text className="mt-1 text-[11px] text-[#ef4444]">{editErrors.role}</Text>}
                </View>
              </View>
            </ScrollView>

            <View className="flex-row gap-[10px] px-6 pb-6">
              <TouchableOpacity
                onPress={() => {
                  setIsEditModalOpen(false);
                  setEditEmployee(null);
                  setEditErrors({});
                }}
                className="flex-1 h-10 rounded-[9px] items-center justify-center bg-[#f8fafb] border border-[#237227]"
              >
                <Text className="text-[14px] font-semibold text-black">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdateEmployee}
                disabled={updatingEmployee}
                className="flex-1 h-10 rounded-[9px] bg-[#237227] items-center justify-center flex-row gap-[5px]"
              >
                {updatingEmployee ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-outline" size={15} color="#ffffff" />
                    <Text className="text-[14px] font-semibold text-white">Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Delete Confirm Modal ────────────────────────────────────────── */}
      <Modal visible={isDeleteModalOpen} transparent animationType="fade" onRequestClose={() => setIsDeleteModalOpen(false)}>
        <Pressable className="items-center justify-center flex-1 p-6 bg-black/20" onPress={() => setIsDeleteModalOpen(false)}>
          <Pressable className="w-full max-w-[360px] bg-white rounded-2xl border border-[#e5e7eb] p-6 items-center gap-3" onPress={() => {}}>
            <View className="w-12 h-12 rounded-[12px] bg-[#fef2f2] border border-[#fecaca] items-center justify-center">
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
            </View>
            <Text className="text-[15px] font-bold text-[#1a2e1b]">Remove Employee?</Text>
            <Text className="text-[13px] text-[#8fa88f] text-center leading-[18px]">
              <Text className="font-semibold text-[#4b6b4d]">{employeeToDelete?.full_name}</Text> will be permanently removed from the system.
            </Text>
            <Text className="mt-1 text-[11px] text-center text-[#9ca3af]">
              Note: Remember to also remove them from your Supabase Auth dashboard.
            </Text>
            <View className="flex-row gap-[10px] w-full mt-2">
              <TouchableOpacity onPress={() => setIsDeleteModalOpen(false)} className="flex-1 h-10 rounded-[9px] items-center justify-center bg-[#f8fafb] border border-[#237227]">
                <Text className="text-[14px] font-semibold text-black">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmDelete} disabled={deletingEmployee} className="flex-1 h-10 rounded-[9px] bg-[#ef4444] items-center justify-center">
                {deletingEmployee ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-[14px] font-semibold text-white">Remove</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── User Management Modal ───────────────────────────────────────── */}
      <Modal visible={isUserManagementOpen} transparent animationType="fade" onRequestClose={() => setIsUserManagementOpen(false)}>
        <Pressable className="items-center justify-center flex-1 p-6 bg-black/50" onPress={() => setIsUserManagementOpen(false)}>
          <Pressable className="w-full max-w-[600px] bg-white rounded-2xl max-h-[80%] overflow-hidden" onPress={() => {}}>
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-[#e5e7eb] bg-[#f8fafb]">
              <Text className="text-[20px] font-bold text-[#1a2e1b]">User Management</Text>
              <TouchableOpacity onPress={() => setIsUserManagementOpen(false)}>
                <Ionicons name="close" size={24} color="#8fa88f" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator>
              {pendingLoading ? (
                <View className="items-center justify-center py-[60px]">
                  <ActivityIndicator size="large" color="#237227" />
                  <Text className="mt-3 text-[#8fa88f]">Loading pending users...</Text>
                </View>
              ) : pendingUsers.length === 0 ? (
                <View className="items-center justify-center py-[60px]">
                  <Ionicons name="checkmark-circle" size={48} color="#237227" />
                  <Text className="mt-3 text-[#8fa88f]">All users are approved</Text>
                </View>
              ) : (
                pendingUsers.map((user: any) => (
                  <View key={user.id} className="px-6 py-4 border-b border-[#f0f4f0]">
                    <View className="flex-row gap-4 mb-3">
                      <View className="flex-1 gap-3">
                        <View>
                          <Text className="text-[11px] font-semibold text-[#8fa88f] mb-1">Full Name</Text>
                          <Text className="text-[14px] font-semibold text-[#1a2e1b]">{user.full_name || 'N/A'}</Text>
                        </View>
                        <View>
                          <Text className="text-[11px] font-semibold text-[#8fa88f] mb-1">Phone Number</Text>
                          <Text className="text-[14px] text-black">{user.phone_number || 'N/A'}</Text>
                        </View>
                      </View>

                      <View className="flex-1 gap-3">
                        <View>
                          <Text className="text-[11px] font-semibold text-[#8fa88f] mb-1">Email</Text>
                          <Text className="text-[14px] text-black">{user.email}</Text>
                        </View>
                        <View>
                          <Text className="text-[11px] font-semibold text-[#8fa88f] mb-1">Signed Up</Text>
                          <Text className="text-[14px] text-black">{new Date(user.created_at).toLocaleDateString()}</Text>
                        </View>
                      </View>
                    </View>

                    <View className="flex-row items-center mb-4">
                      <View className="px-3 py-1 rounded-lg bg-[#fef3c7]">
                        <Text className="text-[12px] font-semibold text-[#d97706]">Pending Approval</Text>
                      </View>
                    </View>

                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        className="flex-1 flex-row items-center justify-center py-[10px] rounded-lg bg-[#237227]"
                        onPress={() => handleApproveUser(user.id)}
                        disabled={approvingUserId === user.id || denyingUserId === user.id}
                      >
                        {approvingUserId === user.id ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={16} color="white" />
                            <Text className="ml-1 text-[14px] font-semibold text-white">Accept</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 flex-row items-center justify-center py-[10px] bg-[#ef4444] rounded-lg"
                        onPress={() => handleDenyUser(user.id)}
                        disabled={approvingUserId === user.id || denyingUserId === user.id}
                      >
                        {denyingUserId === user.id ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <>
                            <Ionicons name="close-circle" size={16} color="white" />
                            <Text className="ml-1 text-[14px] font-semibold text-white">Deny</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}