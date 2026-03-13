import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEmployees } from '../../utils/supabase';
import '../../global.css';

interface EmployeesProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
  pendingUsersCount?: number;
}

export default function Employees({ onNavigate, pendingUsersCount }: EmployeesProps) {
  // UI-only states for visibility
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
        <View className="bg-white px-6 pt-5 pb-4 border-b border-stone-100">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity className="lg:hidden w-9 h-9 items-center justify-center mr-3" onPress={() => setIsDrawerOpen(true)}>
                <Ionicons name="menu" size={22} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-xl font-bold text-stone-900 tracking-tight">Employees</Text>
                <Text className="text-stone-400 text-xs mt-0.5 font-medium">Manage your team members</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity className="w-9 h-9 bg-stone-50 border border-stone-100 rounded-lg items-center justify-center" onPress={() => setIsNotificationOpen(true)}>
                <View className="w-2 h-2 bg-red-400 rounded-full absolute top-1.5 right-1.5" />
                <Ionicons name="notifications-outline" size={17} color="#78716c" />
              </TouchableOpacity>
              <View className="flex-row items-center gap-2 bg-stone-50 border border-stone-100 rounded-lg px-2.5 py-1.5">
                <View className="w-6 h-6 bg-emerald-500 rounded-md items-center justify-center">
                  <Text className="text-white font-bold text-xs">AD</Text>
                </View>
                <View className="hidden lg:flex">
                  <Text className="text-xs font-semibold text-stone-800">Admin User</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Action Header */}
        <View className="px-6 pt-4 pb-3">
          <View className="flex-row items-center gap-3">
            <View className="flex-1 flex-row items-center bg-white border border-stone-100 rounded-lg px-3 py-2.5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 }}>
              <Ionicons name="search" size={16} color="#a8a29e" />
              <TextInput
                placeholder="Search employees..."
                className="flex-1 ml-2 text-sm text-stone-900"
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
            <TouchableOpacity className="bg-emerald-500 px-4 py-2.5 rounded-lg flex-row items-center gap-1.5" onPress={() => setIsAddModalOpen(true)} style={{ shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 }}>
              <Ionicons name="person-add" size={16} color="white" />
              <Text className="text-white font-semibold text-sm">Add Employee</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Desktop Table */}
        <View className="hidden lg:flex px-6 pb-6">
          {loading ? (
            <View className="bg-white rounded-xl border border-stone-100 p-6 items-center justify-center" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
              <Text className="text-stone-500 text-sm">Loading employees...</Text>
            </View>
          ) : error ? (
            <View className="bg-red-50 rounded-xl border border-red-100 p-6 items-center justify-center">
              <Text className="text-red-600 font-semibold text-sm">Error: {error}</Text>
            </View>
          ) : filteredEmployees.length === 0 ? (
            <View className="bg-white rounded-xl border border-stone-100 p-8 items-center justify-center" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
              <View className="w-12 h-12 bg-stone-50 rounded-xl items-center justify-center mb-3">
                <Ionicons name="people-outline" size={22} color="#d6d3d1" />
              </View>
              <Text className="text-stone-500 text-sm font-medium">{searchQuery ? 'No employees match your search' : 'No employees found'}</Text>
            </View>
          ) : (
            <View className="bg-white rounded-xl border border-stone-100 overflow-hidden" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
              {/* Table Header */}
              <View className="flex-row items-center px-6 py-3 bg-stone-50 border-b border-stone-100">
                <Text className="flex-1 text-xs font-semibold text-stone-400 uppercase tracking-widest">Employee</Text>
                <Text className="flex-1 text-xs font-semibold text-stone-400 uppercase tracking-widest">Role</Text>
                <Text className="flex-1 text-xs font-semibold text-stone-400 uppercase tracking-widest">Email</Text>
                <Text className="flex-1 text-xs font-semibold text-stone-400 uppercase tracking-widest">Phone</Text>
                <Text className="w-24 text-xs font-semibold text-stone-400 uppercase tracking-widest text-center">Status</Text>
                <Text className="w-28 text-xs font-semibold text-stone-400 uppercase tracking-widest text-center">Actions</Text>
              </View>
              {filteredEmployees.map((emp: any, idx: number) => (
                <View key={emp.id} className={`flex-row items-center px-6 py-3.5 ${idx !== filteredEmployees.length - 1 ? 'border-b border-stone-50' : ''}`}>
                  {/* Employee name with avatar */}
                  <View className="flex-1 flex-row items-center gap-2.5">
                    <View className="w-8 h-8 bg-emerald-50 rounded-lg items-center justify-center">
                      <Text className="text-emerald-600 font-bold text-xs">
                        {emp.full_name ? emp.full_name.substring(0, 2).toUpperCase() : 'NA'}
                      </Text>
                    </View>
                    <Text className="text-sm font-medium text-stone-800">{emp.full_name || 'N/A'}</Text>
                  </View>
                  <View className="flex-1">
                    <View className="bg-stone-50 border border-stone-100 px-2 py-0.5 rounded-md self-start">
                      <Text className="text-xs font-medium text-stone-600 capitalize">{emp.role || 'N/A'}</Text>
                    </View>
                  </View>
                  <Text className="flex-1 text-xs text-stone-500">{trimEmail(emp.email)}</Text>
                  <Text className="flex-1 text-xs text-stone-500">{emp.phone_number || '—'}</Text>
                  {/* Status Badge */}
                  <View className="w-24 flex-row justify-center">
                    <View className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full ${emp.status === 'online' ? 'bg-emerald-50 border border-emerald-100' : 'bg-stone-50 border border-stone-100'}`}>
                      <View className={`w-1.5 h-1.5 rounded-full ${emp.status === 'online' ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                      <Text className={`text-xs font-semibold ${emp.status === 'online' ? 'text-emerald-700' : 'text-stone-500'}`}>
                        {emp.status === 'online' ? 'Online' : 'Offline'}
                      </Text>
                    </View>
                  </View>
                  {/* Actions */}
                  <View className="w-28 flex-row items-center justify-center gap-1">
                    <TouchableOpacity className="w-7 h-7 bg-stone-50 rounded-lg items-center justify-center" onPress={() => setIsEditModalOpen(true)}>
                      <Ionicons name="create-outline" size={14} color="#78716c" />
                    </TouchableOpacity>
                    <TouchableOpacity className="w-7 h-7 bg-stone-50 rounded-lg items-center justify-center">
                      <Ionicons name="eye-outline" size={14} color="#78716c" />
                    </TouchableOpacity>
                    <TouchableOpacity className="w-7 h-7 bg-red-50 rounded-lg items-center justify-center">
                      <Ionicons name="trash-outline" size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Mobile View */}
        <View className="lg:hidden px-5 pb-6">
          {loading ? (
            <View className="bg-white rounded-xl border border-stone-100 p-4 items-center">
              <Text className="text-stone-500 text-sm">Loading employees...</Text>
            </View>
          ) : error ? (
            <View className="bg-red-50 rounded-xl border border-red-100 p-4 items-center">
              <Text className="text-red-600 font-semibold text-sm">Error: {error}</Text>
            </View>
          ) : filteredEmployees.length === 0 ? (
            <View className="bg-white rounded-xl border border-stone-100 p-4 items-center">
              <Text className="text-stone-500 text-sm">{searchQuery ? 'No employees match your search' : 'No employees found'}</Text>
            </View>
          ) : (
            filteredEmployees.map((emp: any) => (
              <View key={emp.id} className="bg-white rounded-xl border border-stone-100 p-4 mb-2.5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 }}>
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-row flex-1 gap-2.5 items-center">
                    <View className="w-9 h-9 bg-emerald-50 rounded-lg items-center justify-center">
                      <Text className="text-emerald-600 font-bold text-xs">
                        {emp.full_name ? emp.full_name.substring(0, 2).toUpperCase() : 'NA'}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-sm font-semibold text-stone-900">{emp.full_name || 'N/A'}</Text>
                      <Text className="text-xs text-stone-400">{emp.role || 'N/A'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity className="w-7 h-7 bg-stone-50 rounded-lg items-center justify-center" onPress={() => setIsEditModalOpen(true)}>
                    <Ionicons name="create-outline" size={14} color="#78716c" />
                  </TouchableOpacity>
                </View>
                <View className="flex-row items-center justify-between mt-2">
                  <View className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full ${emp.status === 'online' ? 'bg-emerald-50 border border-emerald-100' : 'bg-stone-50 border border-stone-100'}`}>
                    <View className={`w-1.5 h-1.5 rounded-full ${emp.status === 'online' ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                    <Text className={`text-xs font-semibold ${emp.status === 'online' ? 'text-emerald-700' : 'text-stone-500'}`}>
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
        <View className="flex-1 bg-black/40 justify-center items-center px-5">
          <View className="bg-white rounded-2xl w-full max-w-md" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40 }}>
            {/* Modal Header */}
            <View className="px-6 pt-6 pb-4 border-b border-stone-100">
              <Text className="text-base font-bold text-stone-900">{isAddModalOpen ? 'Add New Employee' : 'Edit Employee'}</Text>
              <Text className="text-xs text-stone-400 mt-0.5">Fill in the employee details below</Text>
            </View>
            {/* Modal Body */}
            <View className="px-6 py-5 gap-4">
              <View>
                <Text className="text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Full Name</Text>
                <TextInput placeholder="e.g. Juan Dela Cruz" placeholderTextColor="#a8a29e" className="bg-stone-50 border border-stone-100 rounded-lg px-3 py-2.5 text-sm text-stone-900" />
              </View>
              <View>
                <Text className="text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Role</Text>
                <TextInput placeholder="e.g. Field Worker" placeholderTextColor="#a8a29e" className="bg-stone-50 border border-stone-100 rounded-lg px-3 py-2.5 text-sm text-stone-900" />
              </View>
              <View>
                <Text className="text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Site</Text>
                <TextInput placeholder="Assign to site" placeholderTextColor="#a8a29e" className="bg-stone-50 border border-stone-100 rounded-lg px-3 py-2.5 text-sm text-stone-900" />
              </View>
              <View>
                <Text className="text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Company</Text>
                <TextInput placeholder="Company name" placeholderTextColor="#a8a29e" className="bg-stone-50 border border-stone-100 rounded-lg px-3 py-2.5 text-sm text-stone-900" />
              </View>
            </View>
            {/* Modal Footer */}
            <View className="flex-row gap-3 px-6 pb-6">
              <TouchableOpacity className="flex-1 bg-stone-50 border border-stone-100 py-3 rounded-lg items-center" onPress={() => {setIsAddModalOpen(false); setIsEditModalOpen(false);}}>
                <Text className="text-stone-600 font-semibold text-sm">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-emerald-500 py-3 rounded-lg items-center" style={{ shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 }}>
                <Text className="text-white font-semibold text-sm">Save Employee</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notification Modal */}
      <Modal visible={isNotificationOpen} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/30 justify-center items-center px-5" onPress={() => setIsNotificationOpen(false)}>
          <View className="bg-white w-full max-w-xs rounded-2xl overflow-hidden" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40 }}>
            <View className="px-6 pt-6 pb-4 items-center border-b border-stone-100">
              <View className="w-12 h-12 bg-emerald-50 rounded-xl items-center justify-center mb-3">
                <Ionicons name="notifications" size={22} color="#10b981" />
              </View>
              <Text className="font-bold text-stone-900 text-base">Notifications</Text>
            </View>
            <View className="px-6 py-5 items-center">
              <Text className="text-stone-400 text-sm text-center">You have no new notifications.</Text>
            </View>
            <View className="px-6 pb-6">
              <TouchableOpacity className="bg-emerald-500 w-full py-3 rounded-lg items-center" onPress={() => setIsNotificationOpen(false)}>
                <Text className="text-white font-semibold text-sm">Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}