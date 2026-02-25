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
import '../../global.css';

// ---------- Mock Data for Design Preview ----------
const MOCK_COMPANIES = [
  { id: 1, name: 'Example Corp', industry: 'Technology', branches: 3, initials: 'EC', color: '#ccfbf1' },
  { id: 2, name: 'Global Logistics', industry: 'Transport', branches: 12, initials: 'GL', color: '#fef3c7' },
];

interface CompanyListProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}

export default function CompanyList({ onNavigate }: CompanyListProps) {
  // ---------- UI States (Functional for design preview) ----------
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  
  // Form States
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [branches, setBranches] = useState('');
  const [branchNames, setBranchNames] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);

  // ---------- Placeholder Functions (Logic Removed) ----------
  const handleAddCompany = () => {
    console.log('Add Logic Removed');
    setIsAddModalOpen(false);
  };

  const handleDeleteCompany = (id: number) => {
    console.log('Delete Logic Removed for ID:', id);
  };

  const handleCompanyPress = (company: any) => {
    setSelectedCompany(company);
    setIsBranchModalOpen(true);
  };

  const handleUpdateBranch = () => {
    console.log('Branch Update Logic Removed');
  };

  return (
    <View className="flex-1 bg-stone-50">
      <ScrollView className="flex-1 bg-stone-50">
        {/* Top Header */}
        <View className="bg-white px-5 pt-4 pb-3 border-b border-stone-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity className="lg:hidden mr-3" onPress={() => setIsDrawerOpen(true)}>
                <Ionicons name="menu" size={24} color="#44403c" />
              </TouchableOpacity>
              <View>
                <Text className="text-lg lg:text-2xl font-bold text-stone-900">Company Management</Text>
                <Text className="text-stone-500 text-xs mt-0.5">Welcome back, Administrator</Text>
              </View>
            </View>
            <TouchableOpacity className="w-9 h-9 bg-stone-100 rounded-full items-center justify-center" onPress={() => setIsNotificationOpen(true)}>
              <Ionicons name="notifications-outline" size={18} color="#57534e" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Header */}
        <View className="px-5 lg:px-8 pt-6 pb-3 flex-row items-center justify-between">
          <View>
            <Text className="text-lg lg:text-xl font-bold text-stone-900">Company Overview</Text>
            <Text className="text-stone-500 text-xs">Manage companies and their branches</Text>
          </View>
          <TouchableOpacity 
            className="bg-emerald-600 px-4 py-2.5 rounded-xl flex-row items-center"
            onPress={() => setIsAddModalOpen(true)}
          >
            <Ionicons name="add" size={18} color="white" />
            <Text className="text-white font-semibold ml-1">Add Company</Text>
          </TouchableOpacity>
        </View>

        {/* Company Grid (Static Preview) */}
        <View className="px-5 lg:px-8 pb-10 flex-row flex-wrap gap-4">
          {MOCK_COMPANIES.map((company) => (
            <TouchableOpacity
              key={company.id}
              className="bg-white rounded-2xl border border-stone-200 p-6 w-full lg:w-[calc(50%-8px)]"
              onPress={() => handleCompanyPress(company)}
            >
              <View className="flex-row justify-between mb-4">
                <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: company.color }}>
                  <Text className="font-bold text-emerald-700">{company.initials}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteCompany(company.id)}>
                  <Ionicons name="trash-outline" size={20} color="#dc2626" />
                </TouchableOpacity>
              </View>
              <Text className="text-lg font-bold text-stone-900">{company.name}</Text>
              <Text className="text-sm text-stone-500">{company.industry}</Text>
              <View className="mt-4 pt-4 border-t border-stone-50 flex-row items-center">
                <Ionicons name="business-outline" size={16} color="#78716c" />
                <Text className="ml-2 text-stone-600 text-sm">{company.branches} Branches</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ---------- Simple Notification Modal Design ---------- */}
      <Modal visible={isNotificationOpen} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/20 items-center justify-center" onPress={() => setIsNotificationOpen(false)}>
           <View className="w-80 bg-white p-6 rounded-2xl items-center">
              <Ionicons name="notifications-outline" size={32} color="#10b981" />
              <Text className="text-lg font-bold mt-4">Notifications</Text>
              <Text className="text-stone-500 text-center my-4">You have no new notifications.</Text>
              <TouchableOpacity className="bg-emerald-500 w-full py-3 rounded-xl items-center" onPress={() => setIsNotificationOpen(false)}>
                <Text className="text-white font-bold">Close</Text>
              </TouchableOpacity>
           </View>
        </Pressable>
      </Modal>

      {/* ---------- Add Company Modal Design ---------- */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end lg:justify-center lg:items-center">
          <View className="bg-white w-full lg:w-[500px] rounded-t-3xl lg:rounded-3xl p-6">
            <Text className="text-xl font-bold mb-6">Add New Company</Text>
            <View className="gap-4">
              <View>
                <Text className="text-stone-700 font-medium mb-1.5">Company Name</Text>
                <TextInput className="bg-stone-50 border border-stone-200 p-3 rounded-xl" placeholder="e.g. Acme Corp" value={companyName} onChangeText={setCompanyName} />
              </View>
              <View>
                <Text className="text-stone-700 font-medium mb-1.5">Industry</Text>
                <TextInput className="bg-stone-50 border border-stone-200 p-3 rounded-xl" placeholder="e.g. Technology" value={industry} onChangeText={setIndustry} />
              </View>
            </View>
            <View className="flex-row gap-3 mt-8">
              <TouchableOpacity className="flex-1 p-4 rounded-xl border border-stone-200 items-center" onPress={() => setIsAddModalOpen(false)}>
                <Text className="font-bold text-stone-600">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 p-4 rounded-xl bg-emerald-600 items-center" onPress={handleAddCompany}>
                <Text className="font-bold text-white">Save Company</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}