import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, StatusBar, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../utils/supabase';
import SiteDetails from './SiteDetails';

export interface Site {
  id: string;
  name: string;
  companyName: string | null;
  branchName: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'active' | 'inactive';
  securityLevel: 'high' | 'medium' | 'low';
  startTime?: string | null;
  endTime?: string | null;
  dateAccomplished?: string | null;
  membersCount?: number | null;
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
  ).sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === 'active' ? -1 : 1;
  });

  const handleSitePress = (site: Site) => {
    setSelectedSite(site);
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />

      {/* Details Modal */}
      <Modal
        visible={!!selectedSite}
        animationType="slide"
        onRequestClose={() => setSelectedSite(null)}
      >
        <SiteDetails
          site={selectedSite}
          onBack={() => setSelectedSite(null)}
          onViewOnMap={() => {
            setSelectedSite(null);
            onMapPress?.();
          }}
        />
      </Modal>
      
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
            <View className="gap-3">
              {filteredSites.map((site) => (
                <TouchableOpacity
                  key={site.id}
                  onPress={() => handleSitePress(site)}
                  className="bg-white rounded-2xl px-4 py-4 border border-gray-200 shadow-md shadow-gray-300 flex-row items-center active:opacity-70"
                >
                  {/* Location Icon Box */}
                  <View className={`w-12 h-12 rounded-xl ${site.status === 'active' ? 'bg-green-100' : 'bg-gray-100'} items-center justify-center mr-3`}>
                    <Ionicons name="location-outline" size={22} color={site.status === 'active' ? '#16a34a' : '#6b7280'} />
                  </View>

                  {/* Main Content */}
                  <View className="flex-1 mr-2">
                    {/* Name + Status Badge */}
                    <View className="flex-row items-center justify-between mb-0.5">
                      <Text className="text-gray-900 font-bold text-base flex-1 mr-2" numberOfLines={1}>
                        {site.name}
                      </Text>
                      <View className={`px-2 py-0.5 rounded-full ${site.status === 'active' ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <Text className={`text-xs font-semibold ${site.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                          {site.status === 'active' ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>

                    {/* Company - Branch */}
                    {(site.companyName || site.branchName) && (
                      <Text className="text-gray-500 text-xs mb-2" numberOfLines={1}>
                        {[site.companyName, site.branchName].filter(Boolean).join(' - ')}
                      </Text>
                    )}

                    {/* Footer Info */}
                    <View className="flex-row items-center gap-3">
                      <View className="flex-row items-center gap-1">
                        <Ionicons name="people-outline" size={13} color="#9ca3af" />
                        <Text className="text-gray-400 text-xs">{site.staffCount} staff</Text>
                      </View>
                      {site.latitude != null && site.longitude != null && (
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="navigate-outline" size={13} color="#9ca3af" />
                          <Text className="text-gray-400 text-xs">Has location</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Chevron */}
                  <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
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