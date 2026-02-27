import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import  supabase  from '../../utils/supabase';

interface Site {
  id: string;
  name: string;
  companyName: string | null;
  branchName: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'active' | 'inactive';
  securityLevel: 'high' | 'medium' | 'low';
  staffCount: number;
}

interface SitesProps {
  onMapPress?: () => void;
  onSiteMapPress?: (site: Site) => void;
}

export default function Sites({ onMapPress, onSiteMapPress }: SitesProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSites();
  }, []);

  async function fetchSites() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sites')
        .select(`
          id,
          name,
          status,
          latitude,
          longitude,
          company:company_id ( company_name ),
          branch:branch_id ( branch_name )
        `);

      if (error) throw error;

      if (data) {
        const mapped: Site[] = data.map((item: any) => ({
          id: item.id,
          name: item.name || 'Unnamed site',
          companyName: item.company?.company_name || null,
          branchName: item.branch?.branch_name || null,
          latitude: item.latitude,
          longitude: item.longitude,
          status: (item.status === 'Active' ? 'active' : 'inactive') as 'active' | 'inactive',
          securityLevel: 'low',
          staffCount: 0,
        }));
        setSites(mapped);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  const filteredSites = sites.filter((site) =>
    site.name.toLowerCase().includes(searchText.toLowerCase()) ||
    (site.companyName && site.companyName.toLowerCase().includes(searchText.toLowerCase())) ||
    (site.branchName && site.branchName.toLowerCase().includes(searchText.toLowerCase()))
  );

  const handleSitePress = (site: Site) => {
    setSelectedSite(site);
    Alert.alert(
      site.name,
      `Company: ${site.companyName || 'N/A'}\nBranch: ${site.branchName || 'N/A'}\nCoordinates: ${formatCoordinates(site.latitude, site.longitude)}`,
      [{ text: 'Close', onPress: () => setSelectedSite(null) }]
    );
  };

  const formatCoordinates = (lat: number | null, lng: number | null): string => {
    if (lat == null || lng == null) return 'Location not set';
    return `Site (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
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
          {loading ? (
            <View className="items-center justify-center py-16">
              <Text className="text-gray-500 text-base mt-4 font-semibold">Loading sites...</Text>
            </View>
          ) : filteredSites.length > 0 ? (
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
                    <TouchableOpacity 
                      onPress={() => onSiteMapPress?.(site)}
                      className={`w-14 h-14 rounded-2xl ${site.status === 'active' ? 'bg-green-500' : 'bg-gray-400'} items-center justify-center mr-4 active:scale-95`}
                    >
                      <Ionicons name="location" size={26} color="white" />
                    </TouchableOpacity>

                    {/* Site Info with Company & Branch */}
                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <Text className="text-gray-900 font-extrabold text-lg flex-1">
                          {site.name}
                        </Text>
                        <View className={`h-3 w-3 rounded-full ${site.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                      </View>
                      
                      {/* Company name (if available) */}
                      {site.companyName && (
                        <Text className="text-gray-700 font-bold text-base">
                          {site.companyName}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Staff Count Section */}
                  <View className="bg-green-50 rounded-2xl p-4 items-center justify-center border border-green-200 mb-4">
                    <Text className="text-gray-500 text-xs font-semibold uppercase">Staff Count</Text>
                    <Text className="text-gray-900 font-extrabold text-2xl mt-2">{site.staffCount}</Text>
                  </View>

                  {/* Coordinates Section (beside house icon) */}
                  <View className="flex-row items-center">
                    <Ionicons name="home-outline" size={16} color="#6b7280" />
                      {/* Branch name (if available) */}
                      {site.branchName && (
                        <Text className="text-green-600 text-sm  ml-2 flex-1 font-semibold mt-0.5" numberOfLines={1}>
                          {site.branchName}
                        </Text>
                      )}
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