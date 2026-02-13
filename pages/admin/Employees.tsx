import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../../components/SimpleToast';
import '../../global.css';
import AdminSidebar from '../../components/AdminSidebar';
import AdminHeader from 'components/AdminHeader';
import AdminSidebarMobile from '../../components/AdminSidebarMobile'; // <-- Import mobile sidebar

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

  // Dummy sign out handler
  const handleSignOut = () => {
    // Add your sign out logic here
  };

  return (
    <View className="flex-row flex-1 bg-stone-50">
      <AdminSidebar onNavigate={onNavigate} />

      {/* Main Content Area */}
      <ScrollView className="flex-1 bg-stone-50">
        {/* AdminHeader */}
        <AdminHeader
          title="Employee Management"
          subtitle="Welcome back, Administrator"
          onMenuPress={() => setIsDrawerOpen(true)}
          isNotificationOpen={isNotificationOpen}
          setIsNotificationOpen={setIsNotificationOpen}
          onNavigate={onNavigate}
        />

        {/* Page Title & Add Button */}
        <View className="px-5 pt-4 pb-3 lg:px-8 lg:pt-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-lg lg:text-xl font-bold text-stone-900 mb-0.5">Employee Management</Text>
              <Text className="text-xs text-stone-500 lg:text-sm">View and manage all employees</Text>
            </View>
            <TouchableOpacity 
              className="bg-emerald-600 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl flex-row items-center ml-2"
              onPress={() => setIsAddModalOpen(true)}
            >
              <Ionicons name="person-add" size={18} color="white" />
              <Text className="ml-1 text-xs font-semibold text-white lg:text-sm">Add Employee</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Desktop Table View - Hidden on mobile */}
        <View className="hidden px-8 pb-6 lg:flex">
          <View className="overflow-hidden bg-white border rounded-2xl border-stone-200">
            {/* Table Header */}
            <View className="flex-row items-center px-6 py-4 border-b bg-stone-50 border-stone-200">
              <Text className="flex-1 text-xs font-semibold tracking-wide uppercase text-stone-600">Employee</Text>
              <Text className="flex-1 text-xs font-semibold tracking-wide uppercase text-stone-600">Role</Text>
              <Text className="flex-1 text-xs font-semibold tracking-wide uppercase text-stone-600">Site</Text>
              <Text className="flex-1 text-xs font-semibold tracking-wide uppercase text-stone-600">Company</Text>
              <Text className="text-xs font-semibold tracking-wide uppercase w-28 text-stone-600">Status</Text>
              <Text className="w-32 text-xs font-semibold tracking-wide text-center uppercase text-stone-600">Actions</Text>
            </View>

            {/* Table Rows */}
            {employees.map((employee, index) => (
              <View 
                key={employee.id}
                className={`flex-row items-center px-6 py-4 ${index !== employees.length - 1 ? 'border-b border-stone-100' : ''}`}
              >
                {/* Employee */}
                <View className="flex-row items-center flex-1">
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
                <View className="flex-row items-center flex-1">
                  <Ionicons name="location-outline" size={14} color="#78716c" />
                  <Text className="ml-1 text-sm text-stone-600">{employee.site}</Text>
                </View>

                {/* Company */}
                <View className="flex-row items-center flex-1">
                  <Ionicons name="business-outline" size={14} color="#78716c" />
                  <Text className="ml-1 text-sm text-stone-600">{employee.company}</Text>
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
                <View className="flex-row items-center justify-center w-32 gap-2">
                  <TouchableOpacity 
                    className="items-center justify-center w-8 h-8 rounded-lg hover:bg-stone-100"
                    onPress={() => openEditModal(employee)}
                  >
                    <Ionicons name="create-outline" size={18} color="#78716c" />
                  </TouchableOpacity>
                  <TouchableOpacity className="items-center justify-center w-8 h-8 rounded-lg hover:bg-stone-100">
                    <Ionicons name="eye-outline" size={18} color="#78716c" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="items-center justify-center w-8 h-8 rounded-lg hover:bg-red-50"
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
        <View className="px-5 pb-6 lg:hidden">
          <View className="overflow-hidden bg-white border rounded-2xl border-stone-200">
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
                    <Text className="mb-1 text-sm font-semibold text-stone-900">{employee.name}</Text>
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
                      className="items-center justify-center w-8 h-8 mb-1"
                      onPress={() => openEditModal(employee)}
                    >
                      <Ionicons name="create-outline" size={16} color="#78716c" />
                    </TouchableOpacity>
                    <TouchableOpacity className="items-center justify-center w-8 h-8 mb-1">
                      <Ionicons name="eye-outline" size={16} color="#78716c" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="items-center justify-center w-8 h-8"
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
      <AdminSidebarMobile
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={(route) => {
          setIsDrawerOpen(false);
          onNavigate(route);
        }}
        activeRoute="employee"
        onSignOut={handleSignOut}
      />

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
          className="items-center justify-center flex-1 px-6 bg-black/50"
          onPress={() => {
            setIsAddModalOpen(false);
            resetForm();
          }}
        >
          <Pressable className="w-full max-w-md bg-white rounded-2xl" onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <View className="px-6 pt-6 pb-4 border-b border-stone-100">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold text-stone-900">Add New Employee</Text>
                  <Text className="mt-1 text-xs text-stone-500">Fill in the employee details below</Text>
                </View>
                <TouchableOpacity 
                  className="items-center justify-center w-8 h-8"
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
                <Text className="mb-2 text-sm font-medium text-stone-700">
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
                    <Text className="ml-1 text-xs text-red-600">{errors.name}</Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">{name.length}/100 characters</Text>
              </View>

              {/* Role */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-stone-700">
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
                    <Text className="ml-1 text-xs text-red-600">{errors.role}</Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">{role.length}/100 characters</Text>
              </View>

              {/* Site */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-stone-700">
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
                    <Text className="ml-1 text-xs text-red-600">{errors.site}</Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">{site.length}/100 characters</Text>
              </View>

              {/* Company */}
              <View className="mb-1">
                <Text className="mb-2 text-sm font-medium text-stone-700">
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
                    <Text className="ml-1 text-xs text-red-600">{errors.company}</Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">{company.length}/100 characters</Text>
              </View>

              <Text className="mt-3 text-xs text-stone-400">
                <Text className="text-red-500">*</Text> Required fields
              </Text>
            </ScrollView>

            {/* Action Buttons */}
            <View className="px-6 pt-4 pb-6 border-t border-stone-100">
              <View className="flex-row gap-3">
                <TouchableOpacity 
                  className="flex-1 py-3 bg-stone-100 rounded-xl active:opacity-70"
                  onPress={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                >
                  <Text className="font-semibold text-center text-stone-700">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-1 py-3 bg-emerald-600 rounded-xl active:opacity-80"
                  onPress={handleAddEmployee}
                >
                  <Text className="font-semibold text-center text-white">Add Employee</Text>
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
          className="items-center justify-center flex-1 px-6 bg-black/50"
          onPress={() => {
            setIsEditModalOpen(false);
            resetForm();
          }}
        >
          <Pressable className="w-full max-w-md bg-white rounded-2xl" onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <View className="px-6 pt-6 pb-4 border-b border-stone-100">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-bold text-stone-900">Edit Employee</Text>
                  <Text className="mt-1 text-xs text-stone-500">Update employee information</Text>
                </View>
                <TouchableOpacity 
                  className="items-center justify-center w-8 h-8"
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
                <Text className="mb-2 text-sm font-medium text-stone-700">
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
                    <Text className="ml-1 text-xs text-red-600">{errors.name}</Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">{name.length}/100 characters</Text>
              </View>

              {/* Role */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-stone-700">
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
                    <Text className="ml-1 text-xs text-red-600">{errors.role}</Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">{role.length}/100 characters</Text>
              </View>

              {/* Site */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-stone-700">
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
                    <Text className="ml-1 text-xs text-red-600">{errors.site}</Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">{site.length}/100 characters</Text>
              </View>

              {/* Company */}
              <View className="mb-1">
                <Text className="mb-2 text-sm font-medium text-stone-700">
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
                    <Text className="ml-1 text-xs text-red-600">{errors.company}</Text>
                  </View>
                )}
                <Text className="mt-1 text-xs text-stone-400">{company.length}/100 characters</Text>
              </View>

              <Text className="mt-3 text-xs text-stone-400">
                <Text className="text-red-500">*</Text> Required fields
              </Text>
            </ScrollView>

            {/* Action Buttons */}
            <View className="px-6 pt-4 pb-6 border-t border-stone-100">
              <View className="flex-row gap-3">
                <TouchableOpacity 
                  className="flex-1 py-3 bg-stone-100 rounded-xl active:opacity-70"
                  onPress={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                >
                  <Text className="font-semibold text-center text-stone-700">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-1 py-3 bg-emerald-600 rounded-xl active:opacity-80"
                  onPress={handleEditEmployee}
                >
                  <Text className="font-semibold text-center text-white">Update Employee</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}