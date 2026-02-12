import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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

interface SiteManagementMobileProps {
  sites: Site[];
  handleDeleteSite: (id: number) => void;
}

const SiteManagementMobile: React.FC<SiteManagementMobileProps> = ({ sites, handleDeleteSite }) => (
  <View className="px-4 pb-6 lg:hidden">
    <View className="space-y-4">
      {sites.map((site) => (
        <View
          key={site.id}
          className="px-4 py-4 bg-white border shadow-sm border-stone-200 rounded-2xl"
          style={{
            elevation: 2,
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          <View className="flex-row items-start">  
            {/* Content */}
            <View className="flex-1">
              <Text className="mb-2 text-base font-bold text-stone-900">{site.name}</Text>
              <View className="flex-row items-center mb-2">
                <Ionicons name="business-outline" size={14} color="#78716c" />
                <Text className="text-xs text-stone-600 ml-1.5">{site.company}</Text>
              </View>
              <View className="flex-row items-center mb-2">
                <Ionicons name="git-branch-outline" size={14} color="#78716c" />
                <Text className="text-xs text-stone-600 ml-1.5">{site.branch}</Text>
              </View>
              <View className="flex-row items-center mb-2 ">
                <Ionicons name="locate-outline" size={14} color="#78716c" />
                <Text className="text-xs text-stone-600 ml-1.5">
                  {site.longitude}, {site.latitude}
                </Text>
              </View>
              <View className="flex-row items-center mt-2 space-x-3">
                <View className="flex-row items-center bg-stone-100 px-2 py-0.5 rounded-lg">
                  <Ionicons name="people-outline" size={13} color="#78716c" />
                  <Text className="ml-1 text-xs text-stone-600">{site.members} Members</Text>
                </View>
              </View>
              <View className="mt-2">
                <View className="bg-emerald-50 px-2 py-0.5 rounded-lg w-fit self-start">
                  <Text className="text-xs font-semibold text-emerald-700">{site.status}</Text>
                </View>
              </View>
            </View>
          </View>
          {/* Actions at the bottom, centered */}
          <View className="flex-row justify-center mt-4 space-x-12">
            <TouchableOpacity className="items-center justify-center rounded-full w-9 h-9 bg-stone-100 active:bg-stone-200">
              <Ionicons name="create-outline" size={18} color="#78716c" />
            </TouchableOpacity>
            <TouchableOpacity className="items-center justify-center rounded-full w-9 h-9 bg-stone-100 active:bg-stone-200">
              <Ionicons name="eye-outline" size={18} color="#78716c" />
            </TouchableOpacity>
            <TouchableOpacity
              className="items-center justify-center rounded-full w-9 h-9 bg-red-50 active:bg-red-100"
              onPress={() => handleDeleteSite(site.id)}
            >
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  </View>
);

export default SiteManagementMobile;