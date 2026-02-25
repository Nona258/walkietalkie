import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';

interface Site {
  id: string; 
  name: string;
  company: string;
  branch_id: string;
  status: string;
  latitude?: number;
  longitude?: number;
}

interface SiteManagementProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}

export default function SiteManagement({ onNavigate }: SiteManagementProps) {
  // UI Visibility States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewLocationOpen, setIsViewLocationOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Data States
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [branchOptions, setBranchOptions] = useState<{id: string, name: string}[]>([]);
  const [companyOptions, setCompanyOptions] = useState<{id: string, name: string, industry: string}[]>([]);

  // Form Field States
  const [siteName, setSiteName] = useState('');
  const [company, setCompany] = useState(''); 
  const [branch_id, setBranchId] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Placeholder functions (logic removed)
  const handleAddSite = () => {};
  const handleUpdateSite = () => {};
  const handleDeleteSite = (site: Site) => {};
  const handleViewLocation = (site: Site) => { setIsViewLocationOpen(true); };
  const handleEditSite = (site: Site) => { setIsEditModalOpen(true); };

  return (
    <View className="flex-1 bg-stone-50">
      {/* Main Content */}
      <ScrollView className="flex-1 bg-stone-50">
        <View className="bg-white px-5 pt-4 pb-3 border-b border-stone-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity className="lg:hidden w-9 h-9 items-center justify-center mr-3" onPress={() => setIsDrawerOpen(true)}>
                <Ionicons name="menu" size={24} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-lg lg:text-2xl font-bold text-stone-900">Site Management</Text>
                <Text className="text-stone-500 text-xs lg:text-sm mt-0.5">Welcome back, Administrator</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2.5">
              <TouchableOpacity className="w-9 h-9 bg-stone-100 rounded-full items-center justify-center" onPress={() => setIsNotificationOpen(true)}>
                <View className="w-2 h-2 bg-red-500 rounded-full absolute top-1.5 right-1.5" />
                <Ionicons name="notifications-outline" size={18} color="#57534e" />
              </TouchableOpacity>

              {/* Notification Modal */}
              <Modal visible={isNotificationOpen} transparent animationType="fade">
                <Pressable className="flex-1 bg-black/20 items-center justify-center" onPress={() => setIsNotificationOpen(false)}>
                  <View className="w-80 bg-white/95 rounded-2xl p-6 items-center">
                    <Ionicons name="notifications-outline" size={32} color="#10b981" className="mb-3" />
                    <Text className="font-bold text-lg text-stone-800 mb-2">Notifications</Text>
                    <Text className="text-stone-500 text-center mb-4">You have no new notifications.</Text>
                    <TouchableOpacity className="bg-emerald-500 rounded-lg py-2 px-6" onPress={() => setIsNotificationOpen(false)}>
                      <Text className="text-white font-bold">Close</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Modal>

              <View className="w-9 h-9 bg-emerald-100 rounded-full items-center justify-center">
                <Text className="text-emerald-700 font-semibold text-xs">AD</Text>
              </View>
              <View className="hidden lg:flex ml-2">
                <Text className="text-sm font-semibold text-stone-900">Admin User</Text>
                <Text className="text-xs text-stone-500">Super Admin</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-5 lg:px-8 pt-4 lg:pt-6 pb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-lg lg:text-xl font-bold text-stone-900 mb-0.5">Site Management</Text>
              <Text className="text-stone-500 text-xs lg:text-sm">Manage all company sites and branches</Text>
            </View>
            <TouchableOpacity className="bg-emerald-600 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl flex-row items-center ml-2" onPress={() => setIsAddModalOpen(true)}>
              <Ionicons name="add" size={18} color="white" />
              <Text className="text-white font-semibold text-xs lg:text-sm ml-1">Add Site</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Desktop Table View */}
        <View className="hidden lg:flex px-8 pb-6">
          <View className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <View className="flex-row items-center px-6 py-4 bg-stone-50 border-b border-stone-200">
              <Text className="flex-1 text-xs font-semibold text-stone-600 uppercase">Site Name</Text>
              <Text className="flex-1 text-xs font-semibold text-stone-600 uppercase">Company</Text>
              <Text className="flex-1 text-xs font-semibold text-stone-600 uppercase">Branch</Text>
              <Text className="w-28 text-xs font-semibold text-stone-600 uppercase">Status</Text>
              <Text className="w-32 text-xs font-semibold text-stone-600 uppercase text-center">Actions</Text>
            </View>

            {/* Empty State placeholder */}
            <View className="px-6 py-12 items-center">
              <Ionicons name="location-outline" size={48} color="#d6d3d1" />
              <Text className="text-stone-500 text-sm mt-4">No sites found</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}