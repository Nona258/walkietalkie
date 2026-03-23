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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getEmployees,
  getPendingUsers,
  approveUser,
  deleteUserAccount,
} from '../../utils/supabase';
import '../../global.css';

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
  // UI-only states for visibility
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
  const [denyingUserId, setDenyingUserId] = useState<string | null>(null);

  useEffect(() => {
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

    fetchEmployees();
  }, []);

  useEffect(() => {
    if (isUserManagementOpen) {
      fetchPendingUsers();
    }
  }, [isUserManagementOpen]);

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
        'User account deleted from database.\n\nNote: Please also delete this user from Supabase Auth in your dashboard to prevent "already registered" errors if they try to sign up again.'
      );
    } catch (err: any) {
      console.error('Error denying user:', err);
      Alert.alert('Error', 'Failed to delete user account');
    } finally {
      setDenyingUserId(null);
    }
  };

  const trimEmail = (email: string, maxLength: number = 25) => {
    if (!email) return 'N/A';
    return email.length > maxLength ? email.substring(0, maxLength) + '...' : email;
  };

  // Sort employees: online first, then offline
  const sortedEmployees = [...employees].sort((a, b) => {
    if (a.status === 'online' && b.status !== 'online') return -1;
    if (a.status !== 'online' && b.status === 'online') return 1;
    return 0;
  });

  // Filter employees based on search query
  const filteredEmployees = sortedEmployees.filter(
    (emp) =>
      emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View className="flex-1 bg-stone-50">
      <ScrollView className="flex-1 bg-stone-50">
        {/* Top Header */}
        <View className="border-b border-stone-100 bg-white px-6 pb-4 pt-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center">
              <TouchableOpacity
                className="mr-3 h-9 w-9 items-center justify-center lg:hidden"
                onPress={() => setIsDrawerOpen(true)}>
                <Ionicons name="menu" size={22} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-xl font-bold tracking-tight text-stone-900">Employees</Text>
                <Text className="mt-0.5 text-xs font-medium text-stone-400">
                  Manage your team members
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                className="h-9 w-9 items-center justify-center rounded-lg border border-stone-100 bg-stone-50"
                onPress={() => setIsNotificationOpen(true)}>
                <View className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-400" />
                <Ionicons name="notifications-outline" size={17} color="#78716c" />
              </TouchableOpacity>
              <View className="flex-row items-center gap-2 rounded-lg border border-stone-100 bg-stone-50 px-2.5 py-1.5">
                <View className="h-6 w-6 items-center justify-center rounded-md bg-emerald-500">
                  <Text className="text-xs font-bold text-white">AD</Text>
                </View>
                <View className="hidden lg:flex">
                  <Text className="text-xs font-semibold text-stone-800">Admin User</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Action Header */}
        <View className="px-6 pb-3 pt-4">
          <View className="flex-row items-center gap-3">
            <View
              className="flex-1 flex-row items-center rounded-lg border border-stone-100 bg-white px-3 py-2.5"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 3,
              }}>
              <Ionicons name="search" size={16} color="#a8a29e" />
              <TextInput
                placeholder="Search employees..."
                className="ml-2 flex-1 text-sm text-stone-900"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#a8a29e"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#a8a29e" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              className="relative flex-row items-center rounded-xl bg-blue-600 px-3 py-2 lg:px-4 lg:py-2.5"
              onPress={() => setIsUserManagementOpen(true)}>
              <Ionicons name="people" size={18} color="white" />
              <Text className="ml-1 text-xs font-semibold text-white lg:text-sm">User Mgmt</Text>
              {pendingUsersCount > 0 && (
                <View className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-red-500">
                  <Text className="text-xs font-bold text-white">
                    {pendingUsersCount > 99 ? '99+' : pendingUsersCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center rounded-xl bg-emerald-600 px-3 py-2 lg:px-4 lg:py-2.5"
              onPress={() => setIsAddModalOpen(true)}>
              <Ionicons name="person-add" size={18} color="white" />
              <Text className="ml-1 text-xs font-semibold text-white lg:text-sm">Add Employee</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Desktop Table */}
        <View className="hidden px-6 pb-6 lg:flex">
          {loading ? (
            <View
              className="items-center justify-center rounded-xl border border-stone-100 bg-white p-6"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
              }}>
              <Text className="text-sm text-stone-500">Loading employees...</Text>
            </View>
          ) : error ? (
            <View className="items-center justify-center rounded-xl border border-red-100 bg-red-50 p-6">
              <Text className="text-sm font-semibold text-red-600">Error: {error}</Text>
            </View>
          ) : filteredEmployees.length === 0 ? (
            <View
              className="items-center justify-center rounded-xl border border-stone-100 bg-white p-8"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
              }}>
              <View className="mb-3 h-12 w-12 items-center justify-center rounded-xl bg-stone-50">
                <Ionicons name="people-outline" size={22} color="#d6d3d1" />
              </View>
              <Text className="text-sm font-medium text-stone-500">
                {searchQuery ? 'No employees match your search' : 'No employees found'}
              </Text>
            </View>
          ) : (
            <View
              className="overflow-hidden rounded-xl border border-stone-100 bg-white"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
              }}>
              {/* Table Header */}
              <View className="flex-row items-center border-b border-stone-100 bg-stone-50 px-6 py-3">
                <Text className="flex-1 text-xs font-semibold uppercase tracking-widest text-stone-400">
                  Employee
                </Text>
                <Text className="flex-1 text-xs font-semibold uppercase tracking-widest text-stone-400">
                  Role
                </Text>
                <Text className="flex-1 text-xs font-semibold uppercase tracking-widest text-stone-400">
                  Email
                </Text>
                <Text className="flex-1 text-xs font-semibold uppercase tracking-widest text-stone-400">
                  Phone
                </Text>
                <Text className="w-24 text-center text-xs font-semibold uppercase tracking-widest text-stone-400">
                  Status
                </Text>
                <Text className="w-28 text-center text-xs font-semibold uppercase tracking-widest text-stone-400">
                  Actions
                </Text>
              </View>
              {filteredEmployees.map((emp: any, idx: number) => (
                <View
                  key={emp.id}
                  className={`flex-row items-center px-6 py-3.5 ${idx !== filteredEmployees.length - 1 ? 'border-b border-stone-50' : ''}`}>
                  {/* Employee name with avatar */}
                  <View className="flex-1 flex-row items-center gap-2.5">
                    <View className="h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                      <Text className="text-xs font-bold text-emerald-600">
                        {emp.full_name ? emp.full_name.substring(0, 2).toUpperCase() : 'NA'}
                      </Text>
                    </View>
                    <Text className="text-sm font-medium text-stone-800">
                      {emp.full_name || 'N/A'}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <View className="self-start rounded-md border border-stone-100 bg-stone-50 px-2 py-0.5">
                      <Text className="text-xs font-medium capitalize text-stone-600">
                        {emp.role || 'N/A'}
                      </Text>
                    </View>
                  </View>
                  <Text className="flex-1 text-xs text-stone-500">{trimEmail(emp.email)}</Text>
                  <Text className="flex-1 text-xs text-stone-500">{emp.phone_number || '—'}</Text>
                  {/* Status Badge */}
                  <View className="w-24 flex-row justify-center">
                    <View
                      className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${emp.status === 'online' ? 'border border-emerald-100 bg-emerald-50' : 'border border-stone-100 bg-stone-50'}`}>
                      <View
                        className={`h-1.5 w-1.5 rounded-full ${emp.status === 'online' ? 'bg-emerald-500' : 'bg-stone-300'}`}
                      />
                      <Text
                        className={`text-xs font-semibold ${emp.status === 'online' ? 'text-emerald-700' : 'text-stone-500'}`}>
                        {emp.status === 'online' ? 'Online' : 'Offline'}
                      </Text>
                    </View>
                  </View>
                  {/* Actions */}
                  <View className="w-28 flex-row items-center justify-center gap-1">
                    <TouchableOpacity
                      className="h-7 w-7 items-center justify-center rounded-lg bg-stone-50"
                      onPress={() => setIsEditModalOpen(true)}>
                      <Ionicons name="create-outline" size={14} color="#78716c" />
                    </TouchableOpacity>
                    <TouchableOpacity className="h-7 w-7 items-center justify-center rounded-lg bg-stone-50">
                      <Ionicons name="eye-outline" size={14} color="#78716c" />
                    </TouchableOpacity>
                    <TouchableOpacity className="h-7 w-7 items-center justify-center rounded-lg bg-red-50">
                      <Ionicons name="trash-outline" size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Mobile View */}
        <View className="px-5 pb-6 lg:hidden">
          {loading ? (
            <View className="items-center rounded-xl border border-stone-100 bg-white p-4">
              <Text className="text-sm text-stone-500">Loading employees...</Text>
            </View>
          ) : error ? (
            <View className="items-center rounded-xl border border-red-100 bg-red-50 p-4">
              <Text className="text-sm font-semibold text-red-600">Error: {error}</Text>
            </View>
          ) : filteredEmployees.length === 0 ? (
            <View className="items-center rounded-xl border border-stone-100 bg-white p-4">
              <Text className="text-sm text-stone-500">
                {searchQuery ? 'No employees match your search' : 'No employees found'}
              </Text>
            </View>
          ) : (
            filteredEmployees.map((emp: any) => (
              <View
                key={emp.id}
                className="mb-2.5 rounded-xl border border-stone-100 bg-white p-4"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 3,
                }}>
                <View className="mb-3 flex-row items-start justify-between">
                  <View className="flex-1 flex-row items-center gap-2.5">
                    <View className="h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                      <Text className="text-xs font-bold text-emerald-600">
                        {emp.full_name ? emp.full_name.substring(0, 2).toUpperCase() : 'NA'}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-sm font-semibold text-stone-900">
                        {emp.full_name || 'N/A'}
                      </Text>
                      <Text className="text-xs text-stone-400">{emp.role || 'N/A'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    className="h-7 w-7 items-center justify-center rounded-lg bg-stone-50"
                    onPress={() => setIsEditModalOpen(true)}>
                    <Ionicons name="create-outline" size={14} color="#78716c" />
                  </TouchableOpacity>
                </View>
                <View className="mt-2 flex-row items-center justify-between">
                  <View
                    className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${emp.status === 'online' ? 'border border-emerald-100 bg-emerald-50' : 'border border-stone-100 bg-stone-50'}`}>
                    <View
                      className={`h-1.5 w-1.5 rounded-full ${emp.status === 'online' ? 'bg-emerald-500' : 'bg-stone-300'}`}
                    />
                    <Text
                      className={`text-xs font-semibold ${emp.status === 'online' ? 'text-emerald-700' : 'text-stone-500'}`}>
                      {emp.status === 'online' ? 'Online' : 'Offline'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={isAddModalOpen || isEditModalOpen} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/40 px-5">
          <View
            className="w-full max-w-md rounded-2xl bg-white"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.15,
              shadowRadius: 40,
            }}>
            {/* Modal Header */}
            <View className="border-b border-stone-100 px-6 pb-4 pt-6">
              <Text className="text-base font-bold text-stone-900">
                {isAddModalOpen ? 'Add New Employee' : 'Edit Employee'}
              </Text>
              <Text className="mt-0.5 text-xs text-stone-400">
                Fill in the employee details below
              </Text>
            </View>
            {/* Modal Body */}
            <View className="gap-4 px-6 py-5">
              <View>
                <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Full Name
                </Text>
                <TextInput
                  placeholder="e.g. Juan Dela Cruz"
                  placeholderTextColor="#a8a29e"
                  className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2.5 text-sm text-stone-900"
                />
              </View>
              <View>
                <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Role
                </Text>
                <TextInput
                  placeholder="e.g. Field Worker"
                  placeholderTextColor="#a8a29e"
                  className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2.5 text-sm text-stone-900"
                />
              </View>
              <View>
                <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Site
                </Text>
                <TextInput
                  placeholder="Assign to site"
                  placeholderTextColor="#a8a29e"
                  className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2.5 text-sm text-stone-900"
                />
              </View>
              <View>
                <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-600">
                  Company
                </Text>
                <TextInput
                  placeholder="Company name"
                  placeholderTextColor="#a8a29e"
                  className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2.5 text-sm text-stone-900"
                />
              </View>
            </View>
            {/* Modal Footer */}
            <View className="flex-row gap-3 px-6 pb-6">
              <TouchableOpacity
                className="flex-1 items-center rounded-lg border border-stone-100 bg-stone-50 py-3"
                onPress={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}>
                <Text className="text-sm font-semibold text-stone-600">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-lg bg-emerald-500 py-3"
                style={{
                  shadowColor: '#10b981',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                }}>
                <Text className="text-sm font-semibold text-white">Save Employee</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notification Modal */}
      <Modal visible={isNotificationOpen} transparent animationType="fade">
        <Pressable
          className="flex-1 items-center justify-center bg-black/30 px-5"
          onPress={() => setIsNotificationOpen(false)}>
          <View
            className="w-full max-w-xs overflow-hidden rounded-2xl bg-white"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.15,
              shadowRadius: 40,
            }}>
            <View className="items-center border-b border-stone-100 px-6 pb-4 pt-6">
              <View className="mb-3 h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                <Ionicons name="notifications" size={22} color="#10b981" />
              </View>
              <Text className="text-base font-bold text-stone-900">Notifications</Text>
            </View>
            <View className="items-center px-6 py-5">
              <Text className="text-center text-sm text-stone-400">
                You have no new notifications.
              </Text>
            </View>
            <View className="px-6 pb-6">
              <TouchableOpacity
                className="w-full items-center rounded-lg bg-emerald-500 py-3"
                onPress={() => setIsNotificationOpen(false)}>
                <Text className="text-sm font-semibold text-white">Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* User Management Modal */}
      <Modal visible={isUserManagementOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/50 px-4 pt-16">
          <View className="max-h-[80%] flex-1 overflow-hidden rounded-2xl bg-white">
            {/* Header */}
            <View className="flex-row items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
              <Text className="text-xl font-bold text-stone-900">User Management</Text>
              <TouchableOpacity onPress={() => setIsUserManagementOpen(false)}>
                <Ionicons name="close" size={24} color="#78716c" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView className="flex-1" showsVerticalScrollIndicator={true}>
              {pendingLoading ? (
                <View className="flex-1 items-center justify-center py-10">
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text className="mt-3 text-stone-600">Loading pending users...</Text>
                </View>
              ) : pendingUsers.length === 0 ? (
                <View className="flex-1 items-center justify-center py-10">
                  <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                  <Text className="mt-3 text-stone-600">All users are approved</Text>
                </View>
              ) : (
                pendingUsers.map((user: any) => (
                  <View key={user.id} className="border-b border-stone-100 px-6 py-4">
                    {/* User Info */}
                    <View className="mb-3">
                      <Text className="text-base font-bold text-stone-900">
                        {user.full_name || 'N/A'}
                      </Text>
                      <Text className="mt-1 text-xs text-stone-500">{user.email}</Text>
                      {user.phone_number && (
                        <Text className="text-xs text-stone-500">{user.phone_number}</Text>
                      )}
                    </View>

                    {/* Status Badge */}
                    <View className="mb-4 flex-row items-center">
                      <View className="rounded-lg bg-yellow-50 px-3 py-1">
                        <Text className="text-xs font-semibold text-yellow-700">
                          Pending Approval
                        </Text>
                      </View>
                      <Text className="ml-3 text-xs text-stone-500">
                        Signed up: {new Date(user.created_at).toLocaleDateString()}
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        className="flex-1 flex-row items-center justify-center rounded-lg bg-emerald-600 py-2"
                        onPress={() => handleApproveUser(user.id)}
                        disabled={approvingUserId === user.id || denyingUserId === user.id}>
                        {approvingUserId === user.id ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={16} color="white" />
                            <Text className="ml-1 text-sm font-semibold text-white">Accept</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 flex-row items-center justify-center rounded-lg bg-red-600 py-2"
                        onPress={() => handleDenyUser(user.id)}
                        disabled={approvingUserId === user.id || denyingUserId === user.id}>
                        {denyingUserId === user.id ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <>
                            <Ionicons name="close-circle" size={16} color="white" />
                            <Text className="ml-1 text-sm font-semibold text-white">Deny</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
