import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEmployees, getPendingUsers, approveUser, deleteUserAccount } from '../../utils/supabase';
import '../../global.css';

interface EmployeesProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
  pendingUsersCount?: number;
  onPendingUsersChange?: (count: number) => void;
}

export default function Employees({ onNavigate, pendingUsersCount = 0, onPendingUsersChange }: EmployeesProps) {
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
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      Alert.alert('Success', 'User approved successfully');
      // Notify parent about the count change
      if (onPendingUsersChange) {
        onPendingUsersChange(pendingUsers.length - 1);
      }
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
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      Alert.alert(
        'Success', 
        'User account deleted from database.\n\nNote: Please also delete this user from Supabase Auth in your dashboard to prevent "already registered" errors if they try to sign up again.'
      );
      // Notify parent about the count change
      if (onPendingUsersChange) {
        onPendingUsersChange(pendingUsers.length - 1);
      }
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
  const filteredEmployees = sortedEmployees.filter((emp) =>
    emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.phone_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View className="flex-1 bg-stone-50">
      <ScrollView className="flex-1 bg-stone-50">
        {/* Top Header */}
        <View className="bg-white px-5 pt-4 pb-3 border-b border-stone-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity className="lg:hidden w-9 h-9 items-center justify-center mr-3" onPress={() => setIsDrawerOpen(true)}>
                <Ionicons name="menu" size={24} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-lg lg:text-2xl font-bold text-stone-900">Employee Management</Text>
                <Text className="text-stone-500 text-xs lg:text-sm mt-0.5">Welcome back, Administrator</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2.5">
              <TouchableOpacity className="w-9 h-9 bg-stone-100 rounded-full items-center justify-center" onPress={() => setIsNotificationOpen(true)}>
                <View className="w-2 h-2 bg-red-500 rounded-full absolute top-1.5 right-1.5" />
                <Ionicons name="notifications-outline" size={18} color="#57534e" />
              </TouchableOpacity>
              <View className="w-9 h-9 bg-emerald-100 rounded-full items-center justify-center">
                <Text className="text-emerald-700 font-semibold text-xs">AD</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Header */}
        <View className="px-5 lg:px-8 pt-4 lg:pt-6 pb-3">
          <View className="flex-row items-center gap-3">
            <View className="flex-1 flex-row items-center bg-white border border-stone-200 rounded-xl px-3 py-2.5">
              <Ionicons name="search" size={18} color="#a8a29e" />
              <TextInput
                placeholder="Search by name, email, role..."
                className="flex-1 ml-2 text-sm text-stone-900"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#a8a29e"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#a8a29e" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity className="bg-blue-600 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl flex-row items-center relative" onPress={() => setIsUserManagementOpen(true)}>
              <Ionicons name="people" size={18} color="white" />
              <Text className="text-white font-semibold text-xs lg:text-sm ml-1">User Mgmt</Text>
              {pendingUsersCount > 0 && (
                <View className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center">
                  <Text className="text-white text-xs font-bold">{pendingUsersCount > 99 ? '99+' : pendingUsersCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity className="bg-emerald-600 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl flex-row items-center" onPress={() => setIsAddModalOpen(true)}>
              <Ionicons name="person-add" size={18} color="white" />
              <Text className="text-white font-semibold text-xs lg:text-sm ml-1">Add Employee</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Desktop Table */}
        <View className="hidden lg:flex px-8 pb-6">
          {loading ? (
            <View className="bg-white rounded-2xl border border-stone-200 p-6 items-center justify-center">
              <Text className="text-stone-600">Loading employees...</Text>
            </View>
          ) : error ? (
            <View className="bg-red-50 rounded-2xl border border-red-200 p-6 items-center justify-center">
              <Text className="text-red-600 font-semibold">Error: {error}</Text>
            </View>
          ) : filteredEmployees.length === 0 ? (
            <View className="bg-white rounded-2xl border border-stone-200 p-6 items-center justify-center">
              <Text className="text-stone-600">{searchQuery ? 'No employees match your search' : 'No employees found'}</Text>
            </View>
          ) : (
            <View className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <View className="flex-row items-center px-6 py-4 bg-stone-50 border-b border-stone-200">
                <Text className="flex-1 text-xs font-semibold text-stone-600 uppercase tracking-wide text-center">Employee</Text>
                <Text className="flex-1 text-xs font-semibold text-stone-600 uppercase tracking-wide text-center">Role</Text>
                <Text className="flex-1 text-xs font-semibold text-stone-600 uppercase tracking-wide text-center">Email</Text>
                <Text className="flex-1 text-xs font-semibold text-stone-600 uppercase tracking-wide text-center">Phone</Text>
                <Text className="w-28 text-xs font-semibold text-stone-600 uppercase tracking-wide text-center">Status</Text>
                <Text className="w-32 text-xs font-semibold text-stone-600 uppercase tracking-wide text-center">Actions</Text>
              </View>
              {filteredEmployees.map((emp: any) => (
                <View key={emp.id} className="flex-row items-center px-6 py-4 border-b border-stone-100">
                  <View className="flex-1 flex-row items-center justify-center">
                    <Text className="text-sm font-semibold text-stone-900 text-center">{emp.full_name || 'N/A'}</Text>
                  </View>
                  <Text className="flex-1 text-sm text-stone-600 text-center">{emp.role || 'N/A'}</Text>
                  <Text className="flex-1 text-sm text-stone-600 text-center">{trimEmail(emp.email)}</Text>
                  <Text className="flex-1 text-sm text-stone-600 text-center">{emp.phone_number || 'N/A'}</Text>
                  <View className="w-28 flex-row justify-center">
                    <View className={`${emp.status === 'online' ? 'bg-emerald-50' : 'bg-stone-100'} px-3 py-1.5 rounded-lg inline-flex self-center`}>
                      <Text className={`${emp.status === 'online' ? 'text-emerald-700' : 'text-stone-600'} text-xs font-semibold capitalize text-center`}>{emp.status === 'online' ? 'Online' : emp.status === 'offline' ? 'Offline' : 'Offline'}</Text>
                    </View>
                  </View>
                  <View className="w-32 flex-row items-center justify-center gap-2">
                    <TouchableOpacity onPress={() => setIsEditModalOpen(true)}><Ionicons name="create-outline" size={18} color="#78716c" /></TouchableOpacity>
                    <TouchableOpacity><Ionicons name="eye-outline" size={18} color="#78716c" /></TouchableOpacity>
                    <TouchableOpacity><Ionicons name="trash-outline" size={18} color="#dc2626" /></TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Mobile View */}
        <View className="lg:hidden px-5 pb-6">
          {loading ? (
            <View className="bg-white rounded-2xl border border-stone-200 p-4 items-center">
              <Text className="text-stone-600">Loading employees...</Text>
            </View>
          ) : error ? (
            <View className="bg-red-50 rounded-2xl border border-red-200 p-4 items-center">
              <Text className="text-red-600 font-semibold">Error: {error}</Text>
            </View>
          ) : filteredEmployees.length === 0 ? (
            <View className="bg-white rounded-2xl border border-stone-200 p-4 items-center">
              <Text className="text-stone-600">{searchQuery ? 'No employees match your search' : 'No employees found'}</Text>
            </View>
          ) : (
            filteredEmployees.map((emp: any) => (
              <View key={emp.id} className="bg-white rounded-2xl border border-stone-200 p-4 mb-3">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-row flex-1">
                    <View>
                      <Text className="text-sm font-semibold text-stone-900">{emp.full_name || 'N/A'}</Text>
                      <Text className="text-xs text-stone-500">{emp.role || 'N/A'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setIsEditModalOpen(true)}><Ionicons name="create-outline" size={18} color="#78716c" /></TouchableOpacity>
                </View>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-xs text-stone-500 mb-1">Status</Text>
                    <View className={`${emp.status === 'online' ? 'bg-emerald-50' : 'bg-stone-100'} px-3 py-1.5 rounded-lg self-start`}>
                      <Text className={`${emp.status === 'online' ? 'text-emerald-700' : 'text-stone-600'} text-xs font-semibold capitalize`}>{emp.status === 'online' ? 'Online' : emp.status === 'offline' ? 'Offline' : 'Offline'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Forms (Add/Edit) are kept as design skeletons */}
      <Modal visible={isAddModalOpen || isEditModalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl w-full max-w-md p-6">
            <Text className="text-xl font-bold text-stone-900">{isAddModalOpen ? 'Add New Employee' : 'Edit Employee'}</Text>
            <TextInput placeholder="Full Name" className="border border-stone-200 rounded-xl p-3 mt-4" />
            <TextInput placeholder="Role" className="border border-stone-200 rounded-xl p-3 mt-3" />
            <TextInput placeholder="Site" className="border border-stone-200 rounded-xl p-3 mt-3" />
            <TextInput placeholder="Company" className="border border-stone-200 rounded-xl p-3 mt-3" />
            <View className="flex-row gap-3 mt-6">
              <TouchableOpacity className="flex-1 bg-stone-100 p-3 rounded-xl items-center" onPress={() => {setIsAddModalOpen(false); setIsEditModalOpen(false);}}>
                <Text className="text-stone-600 font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-emerald-600 p-3 rounded-xl items-center">
                <Text className="text-white font-bold">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notification Modal */}
      <Modal visible={isNotificationOpen} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/20 justify-center items-center" onPress={() => setIsNotificationOpen(false)}>
          <View className="bg-white w-80 p-6 rounded-2xl items-center">
            <Ionicons name="notifications-outline" size={32} color="#10b981" className="mb-3" />
            <Text className="font-bold text-lg mb-2">Notifications</Text>
            <Text className="text-stone-500 text-center mb-4">No new notifications.</Text>
            <TouchableOpacity className="bg-emerald-500 px-6 py-2 rounded-lg" onPress={() => setIsNotificationOpen(false)}>
              <Text className="text-white font-bold">Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* User Management Modal */}
      <Modal visible={isUserManagementOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/50 pt-16 px-4">
          <View className="bg-white rounded-2xl max-h-[80%] overflow-hidden flex-1">
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
              <Text className="text-xl font-bold text-stone-900">User Management</Text>
              <TouchableOpacity onPress={() => setIsUserManagementOpen(false)}>
                <Ionicons name="close" size={24} color="#78716c" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView className="flex-1" showsVerticalScrollIndicator={true}>
              {pendingLoading ? (
                <View className="flex-1 justify-center items-center py-10">
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text className="text-stone-600 mt-3">Loading pending users...</Text>
                </View>
              ) : pendingUsers.length === 0 ? (
                <View className="flex-1 justify-center items-center py-10">
                  <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                  <Text className="text-stone-600 mt-3">All users are approved</Text>
                </View>
              ) : (
                pendingUsers.map((user: any) => (
                  <View key={user.id} className="px-6 py-4 border-b border-stone-100">
                    {/* User Info */}
                    <View className="mb-3">
                      <Text className="text-base font-bold text-stone-900">{user.full_name || 'N/A'}</Text>
                      <Text className="text-xs text-stone-500 mt-1">{user.email}</Text>
                      {user.phone_number && (
                        <Text className="text-xs text-stone-500">{user.phone_number}</Text>
                      )}
                    </View>

                    {/* Status Badge */}
                    <View className="flex-row items-center mb-4">
                      <View className="bg-yellow-50 px-3 py-1 rounded-lg">
                        <Text className="text-xs font-semibold text-yellow-700">Pending Approval</Text>
                      </View>
                      <Text className="text-xs text-stone-500 ml-3">
                        Signed up: {new Date(user.created_at).toLocaleDateString()}
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        className="flex-1 bg-emerald-600 py-2 rounded-lg items-center justify-center flex-row"
                        onPress={() => handleApproveUser(user.id)}
                        disabled={approvingUserId === user.id || denyingUserId === user.id}
                      >
                        {approvingUserId === user.id ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={16} color="white" />
                            <Text className="text-white font-semibold text-sm ml-1">Accept</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 bg-red-600 py-2 rounded-lg items-center justify-center flex-row"
                        onPress={() => handleDenyUser(user.id)}
                        disabled={approvingUserId === user.id || denyingUserId === user.id}
                      >
                        {denyingUserId === user.id ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <>
                            <Ionicons name="close-circle" size={16} color="white" />
                            <Text className="text-white font-semibold text-sm ml-1">Deny</Text>
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