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
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-white px-6 pt-5 pb-4 border-b border-stone-100">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity className="lg:hidden mr-3 w-9 h-9 items-center justify-center" onPress={() => setIsDrawerOpen(true)}>
                <Ionicons name="menu" size={22} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-xl font-bold text-stone-900 tracking-tight">Companies</Text>
                <Text className="text-stone-400 text-xs mt-0.5 font-medium">Manage companies and branches</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity className="w-9 h-9 bg-stone-50 border border-stone-100 rounded-lg items-center justify-center" onPress={() => setIsNotificationOpen(true)}>
                <Ionicons name="notifications-outline" size={17} color="#78716c" />
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center gap-1.5 bg-emerald-500 px-3.5 py-2 rounded-lg"
                style={{ shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 }}
                onPress={() => setIsAddModalOpen(true)}
              >
                <Ionicons name="add" size={16} color="white" />
                <Text className="text-white font-semibold text-sm">Add Company</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Summary Bar */}
        <View className="px-6 py-4 flex-row items-center gap-4">
          <View className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2.5 flex-row items-center gap-2">
            <View className="w-6 h-6 bg-emerald-500 rounded-md items-center justify-center">
              <Ionicons name="business" size={12} color="white" />
            </View>
            <Text className="text-sm text-stone-700 font-semibold">{MOCK_COMPANIES.length} Companies</Text>
          </View>
          <View className="bg-stone-50 border border-stone-100 rounded-lg px-4 py-2.5 flex-row items-center gap-2">
            <Ionicons name="git-branch-outline" size={14} color="#a8a29e" />
            <Text className="text-sm text-stone-500">{MOCK_COMPANIES.reduce((acc, c) => acc + c.branches, 0)} Total Branches</Text>
          </View>
        </View>

        {/* Company Grid */}
        <View className="px-6 pb-8 flex-row flex-wrap gap-4">
          {MOCK_COMPANIES.map((company) => (
            <TouchableOpacity
              key={company.id}
              className="bg-white rounded-xl border border-stone-100 p-5 w-full lg:w-[48%]"
              style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}
              onPress={() => handleCompanyPress(company)}
              activeOpacity={0.8}
            >
              {/* Card Header */}
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: company.color }}>
                    <Text className="font-bold text-emerald-700 text-sm">{company.initials}</Text>
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-stone-900">{company.name}</Text>
                    <View className="bg-stone-50 border border-stone-100 px-2 py-0.5 rounded-md mt-0.5 self-start">
                      <Text className="text-xs text-stone-500 font-medium">{company.industry}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  className="w-7 h-7 bg-red-50 rounded-lg items-center justify-center"
                  onPress={() => handleDeleteCompany(company.id)}
                >
                  <Ionicons name="trash-outline" size={13} color="#ef4444" />
                </TouchableOpacity>
              </View>
              {/* Stats Row */}
              <View className="flex-row items-center border-t border-stone-50 pt-3 gap-4">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="git-branch-outline" size={13} color="#a8a29e" />
                  <Text className="text-xs text-stone-500 font-medium">{company.branches} Branches</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="chevron-forward" size={13} color="#10b981" />
                  <Text className="text-xs text-emerald-600 font-semibold">View Details</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Notification Modal */}
      <Modal visible={isNotificationOpen} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/30 items-center justify-center px-5" onPress={() => setIsNotificationOpen(false)}>
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

      {/* Add Company Modal */}
      <Modal visible={isAddModalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/40 justify-center items-center px-5">
          <View className="bg-white w-full max-w-md rounded-2xl overflow-hidden" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40 }}>
            <View className="px-6 pt-6 pb-4 border-b border-stone-100">
              <Text className="text-base font-bold text-stone-900">Add New Company</Text>
              <Text className="text-xs text-stone-400 mt-0.5">Enter the company information below</Text>
            </View>
            <View className="px-6 py-5 gap-4">
              <View>
                <Text className="text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Company Name</Text>
                <TextInput
                  placeholder="e.g. Acme Corp"
                  placeholderTextColor="#a8a29e"
                  className="bg-stone-50 border border-stone-100 rounded-lg px-3 py-2.5 text-sm text-stone-900"
                  value={companyName}
                  onChangeText={setCompanyName}
                />
              </View>
              <View>
                <Text className="text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">Industry</Text>
                <TextInput
                  placeholder="e.g. Technology"
                  placeholderTextColor="#a8a29e"
                  className="bg-stone-50 border border-stone-100 rounded-lg px-3 py-2.5 text-sm text-stone-900"
                  value={industry}
                  onChangeText={setIndustry}
                />
              </View>
            </View>
            <View className="flex-row gap-3 px-6 pb-6">
              <TouchableOpacity className="flex-1 py-3 rounded-lg border border-stone-100 items-center bg-stone-50" onPress={() => setIsAddModalOpen(false)}>
                <Text className="font-semibold text-stone-600 text-sm">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 py-3 rounded-lg bg-emerald-500 items-center" style={{ shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 }} onPress={handleAddCompany}>
                <Text className="font-semibold text-white text-sm">Save Company</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}