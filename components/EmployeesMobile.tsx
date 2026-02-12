import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Employee {
  id: number;
  name: string;
  role: string;
  site: string;
  company: string;
  status: 'Active' | 'Offline';
  initials: string;
}

interface EmployeesMobileProps {
  employees: Employee[];
  openEditModal: (employee: Employee) => void;
  handleDeleteEmployee: (id: number) => void;
}

const EmployeesMobile: React.FC<EmployeesMobileProps> = ({
  employees,
  openEditModal,
  handleDeleteEmployee,
}) => (
  <View className="px-0 pb-6 lg:hidden">
    <View className="overflow-hidden bg-white border rounded-2xl border-stone-200">
      {employees.map((employee, index) => (
        <View
          key={employee.id}
          className={`px-3 py-3 ${index !== employees.length - 1 ? 'border-b border-stone-100' : ''}`}
        >
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
            {/* Actions */}
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
);

export default EmployeesMobile;