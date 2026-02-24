import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Site {
  id: number;
  name: string;
  company: string;
  branch: string;
  members: number;
  status: string;
  longitude: string;
  latitude: string;
}

interface SiteManagementCardMobileProps {
  sites: Site[];
  handleDeleteSite: (id: number) => void;
}

const SiteManagementCardMobile: React.FC<SiteManagementCardMobileProps> = ({ sites, handleDeleteSite }) => {
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  return (
    <View className="px-2 pb-6 lg:hidden">
      {sites.map((site) => (
        <View 
          key={site.id} 
          className="mb-4 overflow-hidden bg-white border shadow-sm border-stone-200 rounded-xl"
        >
          {/* Header Section */}
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => setSelectedSite(site)}
            className="justify-between p-4 h-28 bg-emerald-600"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-4">
                <Text 
                  numberOfLines={1} 
                  className="text-xl font-bold tracking-tight text-white"
                >
                  {site.name}
                </Text>
                <Text className="text-lg text-emerald-50 mt-0.5">
                  {site.company}
                </Text>
              </View>
              
              {/* Meatball menu on the main card list */}
              <TouchableOpacity className="p-1">
                <Ionicons name="ellipsis-vertical" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="font-medium text-md text-emerald-100">
                {site.branch}
              </Text>
              <View className="px-3 py-0.5 border rounded-md bg-white/20 border-white/30">
                <Text className="text-[10px] font-bold text-white uppercase">
                  {site.status}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      ))}

      {/* --- FULLSCREEN SITE INFORMATION MODAL --- */}
      <Modal
        animationType="fade"
        visible={!!selectedSite}
        onRequestClose={() => setSelectedSite(null)}
      >
        <SafeAreaView className="flex-1 bg-[#f4f5f0]">
          {/* Fullscreen Header / Navigation Bar */}
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-stone-200">
            <TouchableOpacity 
              onPress={() => setSelectedSite(null)}
              className="p-2"
            >
              <Ionicons name="arrow-back" size={24} color="#1c1917" />
            </TouchableOpacity>
            
            <Text className="text-lg font-bold text-stone-900">Site Information</Text>
            
            {/* Meatball menu inside Modal */}
            <TouchableOpacity className="p-2">
              <Ionicons name="ellipsis-vertical" size={24} color="#1c1917" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1">
            {selectedSite && (
              <View>
                {/* Full-width Map View Placeholder */}
                <View className="items-center justify-center w-full border-b h-80 bg-emerald-50 border-stone-200">
                   <Ionicons name="map-outline" size={48} color="#10b981" opacity={0.3} />
                   <View className="absolute items-center justify-center">
                      <Ionicons name="location" size={40} color="#10b981" />
                      <View className="w-3 h-1.5 bg-black/10 rounded-full mt-[-4px]" />
                   </View>
                   <View className="absolute bottom-4 right-4 bg-white px-3 py-1.5 rounded-full shadow-sm border border-stone-100">
                      <Text className="text-[10px] font-bold text-stone-900 uppercase">View on Map</Text>
                   </View>
                </View>

                {/* Details Section */}
                <View className="p-6">
                  <View className="mb-8">
                    <Text className="text-2xl font-bold leading-tight text-stone-900">
                      {selectedSite.name}
                    </Text>
                    <Text className="mt-1 text-lg font-medium text-stone-900">
                      {selectedSite.company}
                    </Text>
                  </View>

                  <View className="space-y-4">
                    <View className="flex-row items-center p-4 bg-white border shadow-sm rounded-2xl border-stone-100">
                      <View className="items-center justify-center w-10 h-10 rounded-full bg-emerald-100">
                         <Ionicons name="git-branch" size={20} color="#10b981" />
                      </View>
                      <View className="ml-4">
                        <Text className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Main Branch</Text>
                        <Text className="text-lg font-semibold text-stone-900">{selectedSite.branch}</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center p-4 bg-white border shadow-sm rounded-2xl border-stone-100">
                      <View className="items-center justify-center w-10 h-10 rounded-full bg-emerald-100">
                         <Ionicons name="people" size={20} color="#10b981" />
                      </View>
                      <View className="ml-4">
                        <Text className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Site Workforce</Text>
                        <Text className="text-lg font-semibold text-stone-900">{selectedSite.members} Active Members</Text>
                      </View>
                    </View>
                  </View>

                  {/* Footer Actions */}
                  <View className="flex-row mt-10 space-x-3">
                    <TouchableOpacity 
                      className="items-center justify-center flex-1 h-10 rounded-lg shadow-lg bg-emerald-700"
                    >
                      <Text className="text-lg font-bold text-white">Edit Site</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                       onPress={() => {
                        handleDeleteSite(selectedSite.id);
                        setSelectedSite(null);
                      }}
                      className="items-center justify-center w-10 h-10 border border-red-100 rounded-lg bg-red-50"
                    >
                      <Ionicons name="trash-outline" size={24} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default SiteManagementCardMobile;