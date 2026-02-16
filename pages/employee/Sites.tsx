import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Site {
  id: string;
  name: string;
  location: string;
  address: string;
  status: 'active' | 'inactive';
  securityLevel: 'high' | 'medium' | 'low';
  staffCount: number;
}

interface SitesProps {
  onMapPress?: () => void;
}

const MOCK_SITES: Site[] = [
  {
    id: '1',
    name: 'Main Headquarters',
    location: 'Downtown',
    address: '123 Main Street, City Center',
    status: 'active',
    securityLevel: 'high',
    staffCount: 12,
  },
  {
    id: '2',
    name: 'North Building',
    location: 'North District',
    address: '456 North Avenue, Industrial Zone',
    status: 'active',
    securityLevel: 'medium',
    staffCount: 8,
  },
  {
    id: '3',
    name: 'South Warehouse',
    location: 'South Suburb',
    address: '789 South Road, Warehouse Area',
    status: 'active',
    securityLevel: 'medium',
    staffCount: 6,
  },
  {
    id: '4',
    name: 'East Facility',
    location: 'East Side',
    address: '321 East Boulevard, Commercial Zone',
    status: 'inactive',
    securityLevel: 'low',
    staffCount: 0,
  },
  {
    id: '5',
    name: 'West Branch',
    location: 'West End',
    address: '654 West Street, Business District',
    status: 'active',
    securityLevel: 'high',
    staffCount: 10,
  },
];

export default function Sites({ onMapPress }: SitesProps) {
  const [sites, setSites] = useState(MOCK_SITES);
  const [searchText, setSearchText] = useState('');
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  const filteredSites = sites.filter((site) =>
    site.name.toLowerCase().includes(searchText.toLowerCase()) ||
    site.location.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSitePress = (site: Site) => {
    setSelectedSite(site);
    Alert.alert(
      site.name,
      `Location: ${site.location}\nAddress: ${site.address}\nStaff: ${site.staffCount}`,
      [{ text: 'Close', onPress: () => setSelectedSite(null) }]
    );
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />
      
      {/* Header Section */}
      <View className="bg-white px-6 py-6 pt-12 border-b border-green-100">
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-gray-900 text-3xl font-extrabold">Sites</Text>
            <Text className="text-green-600 text-xs font-semibold mt-1">Manage your locations</Text>
          </View>
          <TouchableOpacity onPress={onMapPress} className="bg-green-100 rounded-full p-3 active:scale-95">
            <Ionicons name="map" size={24} color="#10b981" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className={`flex-row items-center rounded-2xl bg-gray-100 px-4 py-3 border-2 ${searchText.length > 0 ? 'border-green-500' : 'border-gray-300'}`}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            placeholder="Search sites..."
            value={searchText}
            onChangeText={setSearchText}
            className="flex-1 ml-3 text-gray-900 text-base font-medium"
            placeholderTextColor="#9ca3af"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sites List */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View className="px-6 py-6 pb-28">
          {filteredSites.length > 0 ? (
            <View className="gap-4">
              {filteredSites.map((site) => (
              <TouchableOpacity
                key={site.id}
                onPress={() => handleSitePress(site)}
                className="bg-white rounded-3xl p-5 shadow-md shadow-green-200 border-2 border-green-100 active:scale-95"
              >
                {/* Top Section - Icon and Basic Info */}
                <View className="flex-row items-start mb-5">
                  {/* Location Icon */}
                  <View className={`w-14 h-14 rounded-2xl ${site.status === 'active' ? 'bg-green-500' : 'bg-gray-400'} items-center justify-center mr-4`}>
                    <Ionicons name="location" size={26} color="white" />
                  </View>

                  {/* Site Info */}
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <Text className="text-gray-900 font-extrabold text-lg flex-1">
                        {site.name}
                      </Text>
                      <View className={`h-3 w-3 rounded-full ${site.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </View>
                    <Text className="text-green-600 text-xs font-bold uppercase tracking-wider">{site.location}</Text>
                  </View>
                </View>

                {/* Details Section */}
                <View className="bg-green-50 rounded-2xl p-4 items-center justify-center border border-green-200 mb-4">
                  <Text className="text-gray-500 text-xs font-semibold uppercase">Staff Count</Text>
                  <Text className="text-gray-900 font-extrabold text-2xl mt-2">{site.staffCount}</Text>
                </View>

                {/* Address Section */}
                <View className="flex-row items-center">
                  <Ionicons name="home-outline" size={16} color="#6b7280" />
                  <Text className="text-gray-600 text-sm ml-2 flex-1" numberOfLines={1}>{site.address}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#10b981" />
                </View>
              </TouchableOpacity>
            ))}
            </View>
          ) : (
            <View className="items-center justify-center py-16">
              <Ionicons name="location-outline" size={48} color="#10b981" />
              <Text className="text-gray-500 text-base mt-4 font-semibold">No sites found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}