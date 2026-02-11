import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../../components/SimpleToast';
import '../../global.css';

interface Employee {
  id: number;
  name: string;
  role: string;
  site: string;
  company: string;
  status: 'Active' | 'Offline';
  initials: string;
}

interface EmployeesProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}

interface ValidationErrors {
  name?: string;
  role?: string;
  site?: string;
  company?: string;
}

export default function Employees({ onNavigate }: EmployeesProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [site, setSite] = useState('');
  const [company, setCompany] = useState('');

  // Validation state
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Load employees from AsyncStorage
  useEffect(() => {
    loadEmployees();
  }, []);

  const getInitials = (fullName: string): string => {
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const loadEmployees = async () => {
    try {
      const storedEmployees = await AsyncStorage.getItem('employees');
      if (storedEmployees) {
        setEmployees(JSON.parse(storedEmployees));
      } else {
        // Default employees if none exist
        const defaultEmployees: Employee[] = [
          {
            id: 1,
            name: 'John Doe',
            role: 'Security Officer',
            site: 'Downtown HQ',
            company: 'Acme Corp',
            status: 'Active',
            initials: 'JD',
          },
          {
            id: 2,
            name: 'Sarah Miller',
            role: 'Field Agent',
            site: 'Warehouse B',
            company: 'Global Logistics',
            status: 'Offline',
            initials: 'SM',
          },
        ];
        setEmployees(defaultEmployees);
        await AsyncStorage.setItem('employees', JSON.stringify(defaultEmployees));
      }
    } catch (error) {
      console.log('Error loading employees:', error);
    }
  };

  const saveEmployees = async (updatedEmployees: Employee[]) => {
    try {
      await AsyncStorage.setItem('employees', JSON.stringify(updatedEmployees));
      setEmployees(updatedEmployees);
    } catch (error) {
      console.log('Error saving employees:', error);
    }
  };

  // Validation functions
  const validateField = (fieldName: string, value: string): string | undefined => {
    switch (fieldName) {
      case 'name':
        if (!value.trim()) {
          return 'Full name is required';
        }
        if (value.trim().length < 2) {
          return 'Name must be at least 2 characters';
        }
        if (value.trim().length > 100) {
          return 'Name must not exceed 100 characters';
        }
        // Basic name validation (letters, spaces, hyphens, apostrophes)
        if (!/^[a-zA-Z\s'-]+$/.test(value.trim())) {
          return 'Name can only contain letters, spaces, hyphens, and apostrophes';
        }
        return undefined;

      case 'role':
        if (!value.trim()) {
          return 'Role/Position is required';
        }
        if (value.trim().length < 2) {
          return 'Role must be at least 2 characters';
        }
        if (value.trim().length > 100) {
          return 'Role must not exceed 100 characters';
        }
        return undefined;

      case 'site':
        if (!value.trim()) {
          return 'Site location is required';
        }
        if (value.trim().length < 2) {
          return 'Site must be at least 2 characters';
        }
        if (value.trim().length > 100) {
          return 'Site must not exceed 100 characters';
        }
        return undefined;

      case 'company':
        if (!value.trim()) {
          return 'Company is required';
        }
        if (value.trim().length < 2) {
          return 'Company must be at least 2 characters';
        }
        if (value.trim().length > 100) {
          return 'Company must not exceed 100 characters';
        }
        return undefined;

      default:
        return undefined;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {
      name: validateField('name', name),
      role: validateField('role', role),
      site: validateField('site', site),
      company: validateField('company', company),
    };

    setErrors(newErrors);
    
    // Mark all fields as touched
    setTouched({
      name: true,
      role: true,
      site: true,
      company: true,
    });

    // Return true if no errors
    return !Object.values(newErrors).some(error => error !== undefined);
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    // Update the field value
    switch (fieldName) {
      case 'name':
        setName(value);
        break;
      case 'role':
        setRole(value);
        break;
      case 'site':
        setSite(value);
        break;
      case 'company':
        setCompany(value);
        break;
    }

    // Validate the field if it's been touched
    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  };

  const handleFieldBlur = (fieldName: string, value: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    const error = validateField(fieldName, value);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const resetForm = () => {
    setName('');
    setRole('');
    setSite('');
    setCompany('');
    setErrors({});
    setTouched({});
    setSelectedEmployee(null);
  };

  const handleAddEmployee = async () => {
    if (!validateForm()) {
      showToast({ 
        type: 'error', 
        text1: 'Validation Error', 
        text2: 'Please fix the errors before submitting' 
      });
      return;
    }

    const newEmployee: Employee = {
      id: Date.now(),
      name: name.trim(),
      role: role.trim(),
      site: site.trim(),
      company: company.trim(),
      status: 'Active',
      initials: getInitials(name.trim()),
    };

    const updatedEmployees = [...employees, newEmployee];
    await saveEmployees(updatedEmployees);
    
    resetForm();
    setIsAddModalOpen(false);
    showToast({ 
      type: 'success', 
      text1: 'Success!', 
      text2: `${name.trim()} has been added successfully` 
    });
  };

  const handleEditEmployee = async () => {
    if (!selectedEmployee) return;

    if (!validateForm()) {
      showToast({ 
        type: 'error', 
        text1: 'Validation Error', 
        text2: 'Please fix the errors before submitting' 
      });
      return;
    }

    const updatedEmployee: Employee = {
      ...selectedEmployee,
      name: name.trim(),
      role: role.trim(),
      site: site.trim(),
      company: company.trim(),
      initials: getInitials(name.trim()),
    };

    const updatedEmployees = employees.map(emp => 
      emp.id === selectedEmployee.id ? updatedEmployee : emp
    );
    
    await saveEmployees(updatedEmployees);
    
    resetForm();
    setIsEditModalOpen(false);
    showToast({ 
      type: 'success', 
      text1: 'Updated!', 
      text2: `${name.trim()} has been updated successfully` 
    });
  };

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setName(employee.name);
    setRole(employee.role);
    setSite(employee.site);
    setCompany(employee.company);
    setErrors({});
    setTouched({});
    setIsEditModalOpen(true);
  };

  const handleDeleteEmployee = async (id: number) => {
    const employee = employees.find(e => e.id === id);
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete ${employee?.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedEmployees = employees.filter(emp => emp.id !== id);
            await saveEmployees(updatedEmployees);
            showToast({ 
              type: 'success', 
              text1: 'Deleted', 
              text2: `${employee?.name} has been removed` 
            });
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 flex-row bg-stone-50">
      {/* Desktop Sidebar - Hidden on mobile */}
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
          {/* Dashboard */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('dashboard')}
          >
            <Ionicons name="grid-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Dashboard</Text>
          </TouchableOpacity>

          {/* Site Management */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('siteManagement')}
          >
            <Ionicons name="location-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Site Management</Text>
          </TouchableOpacity>

          {/* Walkie Talkie */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('walkieTalkie')}
          >
            <Ionicons name="mic-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Walkie Talkie</Text>
          </TouchableOpacity>

          {/* Activity Logs */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('activityLogs')}
          >
            <Ionicons name="clipboard-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Activity Logs</Text>
          </TouchableOpacity>

          {/* Company Lists */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('companyList')}
          >
            <Ionicons name="business-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Company Lists</Text>
          </TouchableOpacity>

          {/* Employees */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl bg-emerald-50"
            onPress={() => onNavigate('employee')}
          >
            <Ionicons name="people-outline" size={20} color="#10b981" />
            <Text className="ml-3 text-emerald-700 font-medium">Employees</Text>
          </TouchableOpacity>

          <View className="border-t border-stone-200 my-4" />

          {/* Settings */}
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
                <Text className="text-lg lg:text-2xl font-bold text-stone-900">Employee Management</Text>
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
              <Text className="text-lg lg:text-xl font-bold text-stone-900 mb-0.5">Employee Management</Text>
              <Text className="text-stone-500 text-xs lg:text-sm">View and manage all employees</Text>
            </View>
            <TouchableOpacity 
              className="bg-emerald-600 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl flex-row items-center ml-2"
              onPress={() => setIsAddModalOpen(true)}
            >
              <Ionicons name="person-add" size={18} color="white" />
              <Text className="text-white font-semibold text-xs lg:text-sm ml-1">Add Employee</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Desktop Table View - Hidden on mobile */}
        <View className="hidden lg:flex px-8 pb-6">
          <View className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            {/* Table Header */}
            <View className="flex-row items-center px-6 py-4 bg-stone-50 border-b border-stone-200">
              <Text className="flex-1 text-xs font-semibold text-stone-600 uppercase tracking-wide">Employee</Text>
              <Text className="flex-1 text-xs font-semibold text-stone-600 uppercase tracking-wide">Role</Text>
              <Text className="flex-1 text-xs font-semibold text-stone-600 uppercase tracking-wide">Site</Text>
              <Text className="flex-1 text-xs font-semibold text-stone-600 uppercase tracking-wide">Company</Text>
              <Text className="w-28 text-xs font-semibold text-stone-600 uppercase tracking-wide">Status</Text>
              <Text className="w-32 text-xs font-semibold text-stone-600 uppercase tracking-wide text-center">Actions</Text>
            </View>

            {/* Table Rows */}
            {employees.map((employee, index) => (
              <View 
                key={employee.id}
                className={`flex-row items-center px-6 py-4 ${index !== employees.length - 1 ? 'border-b border-stone-100' : ''}`}
              >
                {/* Employee */}
                <View className="flex-1 flex-row items-center">
                  <View className={`w-10 h-10 ${employee.status === 'Active' ? 'bg-emerald-100' : 'bg-stone-200'} rounded-xl items-center justify-center mr-3`}>
                    <Text className={`${employee.status === 'Active' ? 'text-emerald-700' : 'text-stone-500'} font-semibold text-sm`}>
                      {employee.initials}
                    </Text>
                  </View>
                  <Text className="text-sm font-semibold text-stone-900">{employee.name}</Text>
                </View>

                {/* Role */}
                <Text className="flex-1 text-sm text-stone-600">{employee.role}</Text>

                {/* Site */}
                <View className="flex-1 flex-row items-center">
                  <Ionicons name="location-outline" size={14} color="#78716c" />
                  <Text className="text-sm text-stone-600 ml-1">{employee.site}</Text>
                </View>

                {/* Company */}
                <View className="flex-1 flex-row items-center">
                  <Ionicons name="business-outline" size={14} color="#78716c" />
                  <Text className="text-sm text-stone-600 ml-1">{employee.company}</Text>
                </View>

                {/* Status */}
                <View className="w-28">
                  <View className={`${employee.status === 'Active' ? 'bg-emerald-50' : 'bg-stone-100'} px-3 py-1.5 rounded-lg inline-flex self-start`}>
                    <Text className={`${employee.status === 'Active' ? 'text-emerald-700' : 'text-stone-600'} text-xs font-semibold`}>
                      {employee.status}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View className="w-32 flex-row items-center justify-center gap-2">
                  <TouchableOpacity 
                    className="w-8 h-8 items-center justify-center hover:bg-stone-100 rounded-lg"
                    onPress={() => openEditModal(employee)}
                  >
                    <Ionicons name="create-outline" size={18} color="#78716c" />
                  </TouchableOpacity>
                  <TouchableOpacity className="w-8 h-8 items-center justify-center hover:bg-stone-100 rounded-lg">
                    <Ionicons name="eye-outline" size={18} color="#78716c" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="w-8 h-8 items-center justify-center hover:bg-red-50 rounded-lg"
                    onPress={() => handleDeleteEmployee(employee.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Mobile Card View - Hidden on desktop */}
        <View className="lg:hidden px-5 pb-6">
          <View className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            {/* Employee Cards */}
            {employees.map((employee, index) => (
              <View 
                key={employee.id}
                className={`px-3 py-3 ${index !== employees.length - 1 ? 'border-b border-stone-100' : ''}`}
              >
                {/* Mobile Card Layout */}
                <View className="flex-row items-start">
                  {/* Avatar */}
                  <View className={`w-12 h-12 ${employee.status === 'Active' ? 'bg-emerald-100' : 'bg-stone-200'} rounded-xl items-center justify-center mr-3`}>
                    <Text className={`${employee.status === 'Active' ? 'text-emerald-700' : 'text-stone-500'} font-semibold`}>
                      {employee.initials}
                    </Text>
                  </View>

                  {/* Content */}
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-stone-900 mb-1">{employee.name}</Text>
                    <Text className="text-xs text-stone-500 mb-1.5">{employee.role}</Text>
                    
                    <View className="flex-row items-center mb-0.5">
                      <Ionicons name="location-outline" size={12} color="#78716c" />
                      <Text className="text-xs text-stone-600 ml-1.5">{employee.site}</Text>
                    </View>
                    
                    <View className="flex-row items-center mb-1.5">
                      <Ionicons name="business-outline" size={12} color="#78716c" />
                      <Text className="text-xs text-stone-600 ml-1.5">{employee.company}</Text>
                    </View>

                    <View className={`${employee.status === 'Active' ? 'bg-emerald-50' : 'bg-stone-100'} px-2 py-0.5 rounded-lg self-start`}>
                      <Text className={`${employee.status === 'Active' ? 'text-emerald-700' : 'text-stone-600'} text-xs font-semibold`}>
                        {employee.status}
                      </Text>
                    </View>
                  </View>

                  {/* Actions - Vertical on mobile */}
                  <View className="ml-2">
                    <TouchableOpacity 
                      className="w-8 h-8 items-center justify-center mb-1"
                      onPress={() => openEditModal(employee)}
                    >
                      <Ionicons name="create-outline" size={16} color="#78716c" />
                    </TouchableOpacity>
                    <TouchableOpacity className="w-8 h-8 items-center justify-center mb-1">
                      <Ionicons name="eye-outline" size={16} color="#78716c" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="w-8 h-8 items-center justify-center"
                      onPress={() => handleDeleteEmployee(employee.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Mobile Drawer Modal */}
      <Modal
        visible={isDrawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <View className="flex-1 flex-row">
          {/* Drawer Content */}
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

            {/* Menu Items */}
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

              {/* Site Management */}
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

              {/* Walkie Talkie */}
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

              {/* Activity Logs */}
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

              {/* Company Lists */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('companyList');
                }}
              >
                <Ionicons name="business-outline" size={20} color="#78716c" />
                <Text className="ml-3 text-stone-700 font-medium">Company Lists</Text>
              </TouchableOpacity>

              {/* Employees */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl bg-emerald-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('employee');
                }}
              >
                <Ionicons name="people-outline" size={20} color="#10b981" />
                <Text className="ml-3 text-emerald-700 font-medium">Employees</Text>
              </TouchableOpacity>

              <View className="border-t border-stone-200 my-4" />

              {/* Settings */}
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

          {/* Overlay - Close drawer when tapped */}
          <Pressable 
            className="flex-1 bg-black/40" 
            onPress={() => setIsDrawerOpen(false)}
          />
        </View>
      </Modal>

      {/* Add Employee Modal */}
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
                  <Text className="text-xl font-bold text-stone-900">Add New Employee</Text>
                  <Text className="text-xs text-stone-500 mt-1">Fill in the employee details below</Text>
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
              {/* Name */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Full Name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${
                    touched.name && errors.name ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., John Doe"
                  placeholderTextColor="#a8a29e"
                  value={name}
                  onChangeText={(value) => handleFieldChange('name', value)}
                  onBlur={() => handleFieldBlur('name', name)}
                  maxLength={100}
                />
                {touched.name && errors.name && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.name}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">{name.length}/100 characters</Text>
              </View>

              {/* Role */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Role/Position <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${
                    touched.role && errors.role ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., Security Officer"
                  placeholderTextColor="#a8a29e"
                  value={role}
                  onChangeText={(value) => handleFieldChange('role', value)}
                  onBlur={() => handleFieldBlur('role', role)}
                  maxLength={100}
                />
                {touched.role && errors.role && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.role}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">{role.length}/100 characters</Text>
              </View>

              {/* Site */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Site Location <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${
                    touched.site && errors.site ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., Downtown HQ"
                  placeholderTextColor="#a8a29e"
                  value={site}
                  onChangeText={(value) => handleFieldChange('site', value)}
                  onBlur={() => handleFieldBlur('site', site)}
                  maxLength={100}
                />
                {touched.site && errors.site && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.site}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">{site.length}/100 characters</Text>
              </View>

              {/* Company */}
              <View className="mb-1">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Company <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${
                    touched.company && errors.company ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., Acme Corp"
                  placeholderTextColor="#a8a29e"
                  value={company}
                  onChangeText={(value) => handleFieldChange('company', value)}
                  onBlur={() => handleFieldBlur('company', company)}
                  maxLength={100}
                />
                {touched.company && errors.company && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.company}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">{company.length}/100 characters</Text>
              </View>

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
                  onPress={handleAddEmployee}
                >
                  <Text className="text-center text-white font-semibold">Add Employee</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        visible={isEditModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
      >
        <Pressable 
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => {
            setIsEditModalOpen(false);
            resetForm();
          }}
        >
          <Pressable className="bg-white rounded-2xl w-full max-w-md" onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <View className="px-6 pt-6 pb-4 border-b border-stone-100">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold text-stone-900">Edit Employee</Text>
                  <Text className="text-xs text-stone-500 mt-1">Update employee information</Text>
                </View>
                <TouchableOpacity 
                  className="w-8 h-8 items-center justify-center"
                  onPress={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                >
                  <Ionicons name="close" size={24} color="#78716c" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Form Content */}
            <ScrollView className="px-6 py-5 max-h-96">
              {/* Name */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Full Name <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${
                    touched.name && errors.name ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., John Doe"
                  placeholderTextColor="#a8a29e"
                  value={name}
                  onChangeText={(value) => handleFieldChange('name', value)}
                  onBlur={() => handleFieldBlur('name', name)}
                  maxLength={100}
                />
                {touched.name && errors.name && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.name}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">{name.length}/100 characters</Text>
              </View>

              {/* Role */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Role/Position <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${
                    touched.role && errors.role ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., Security Officer"
                  placeholderTextColor="#a8a29e"
                  value={role}
                  onChangeText={(value) => handleFieldChange('role', value)}
                  onBlur={() => handleFieldBlur('role', role)}
                  maxLength={100}
                />
                {touched.role && errors.role && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.role}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">{role.length}/100 characters</Text>
              </View>

              {/* Site */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Site Location <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${
                    touched.site && errors.site ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., Downtown HQ"
                  placeholderTextColor="#a8a29e"
                  value={site}
                  onChangeText={(value) => handleFieldChange('site', value)}
                  onBlur={() => handleFieldBlur('site', site)}
                  maxLength={100}
                />
                {touched.site && errors.site && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.site}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">{site.length}/100 characters</Text>
              </View>

              {/* Company */}
              <View className="mb-1">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Company <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`bg-white border ${
                    touched.company && errors.company ? 'border-red-500' : 'border-stone-300'
                  } rounded-xl px-4 py-3 text-stone-900 text-sm`}
                  placeholder="e.g., Acme Corp"
                  placeholderTextColor="#a8a29e"
                  value={company}
                  onChangeText={(value) => handleFieldChange('company', value)}
                  onBlur={() => handleFieldBlur('company', company)}
                  maxLength={100}
                />
                {touched.company && errors.company && (
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-xs text-red-600 ml-1">{errors.company}</Text>
                  </View>
                )}
                <Text className="text-xs text-stone-400 mt-1">{company.length}/100 characters</Text>
              </View>

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
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                >
                  <Text className="text-center text-stone-700 font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-1 bg-emerald-600 py-3 rounded-xl active:opacity-80"
                  onPress={handleEditEmployee}
                >
                  <Text className="text-center text-white font-semibold">Update Employee</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}