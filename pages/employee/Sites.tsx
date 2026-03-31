import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
  Modal,
} from 'react-native';
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
  status: 'Active' | 'Pending' | 'Finished';
  securityLevel: 'high' | 'medium' | 'low';
  startTime?: string | null;
  endTime?: string | null;
  membersCount?: number | null;
  createdAt?: string | null;
  finishedAt?: string | null;
  staffCount: number; // actual number of members from group_members
}

interface SitesProps {
  onMapPress?: () => void;
  onSiteMapPress?: (site: Site) => void;
}

export default function Sites({ onMapPress, onSiteMapPress }: SitesProps) {
  const [activeSites, setActiveSites] = useState<Site[]>([]);
  const [pendingSites, setPendingSites] = useState<Site[]>([]);
  const [finishedSites, setFinishedSites] = useState<Site[]>([]);
  const [activeList, setActiveList] = useState<'All' | 'Pending' | 'Finished'>('All');
  const [didAutoSwitchToPending, setDidAutoSwitchToPending] = useState(false);
  const [isLeaderAny, setIsLeaderAny] = useState(false);
  const [currentUserSiteId, setCurrentUserSiteId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(false);

  // Helper to fetch member counts for given site IDs
  async function fetchMemberCounts(siteIds: string[]): Promise<Record<string, number>> {
    if (siteIds.length === 0) return {};
    const { data, error } = await supabase
      .from('group_members')
      .select('site_id', { count: 'exact', head: false })
      .in('site_id', siteIds);
    if (error) {
      console.error('Error fetching member counts:', error);
      return {};
    }
    const counts: Record<string, number> = {};
    // Count occurrences of each site_id
    (data || []).forEach((row: any) => {
      const siteId = row.site_id;
      counts[siteId] = (counts[siteId] || 0) + 1;
    });
    return counts;
  }

  const mapRowToSite = (item: any, memberCounts: Record<string, number> = {}): Site => ({
    id: item.id,
    name: item.name || 'Unnamed site',
    companyName: item.company?.company_name || null,
    branchName: item.branch?.branch_name || null,
    latitude: item.latitude,
    longitude: item.longitude,
    status: (item.status as 'Active' | 'Pending' | 'Finished') || 'Active',
    securityLevel: 'low',
    staffCount: memberCounts[item.id] || 0,
    createdAt: item.created_at || null,
    finishedAt: item.finished_at || null,
    membersCount: item.members_count ?? null,
  });

  useEffect(() => {
    fetchSites();
  }, []);

  // When user switches to Finished tab, fetch ALL archived_sitegroup records
  useEffect(() => {
    if (activeList === 'Finished') {
      fetchAllArchived();
    }
  }, [activeList]);

  async function fetchAllArchived() {
    setLoading(true);
    try {
      const { data: allArchived, error } = await supabase
        .from('archived_sitegroup')
        .select(
          `id, name, status, latitude, longitude, created_at, finished_at, members_count,
           company:company_id ( company_name ),
           branch:branch_id ( branch_name )`
        )
        .order('finished_at', { ascending: false })
        .order('name', { ascending: true });
      if (error) throw error;
      const sites = (allArchived || []) as any[];
      const siteIds = sites.map(s => s.id);
      const memberCounts = await fetchMemberCounts(siteIds);
      setFinishedSites(sites.map(s => mapRowToSite(s, memberCounts)));
    } catch (err: any) {
      Alert.alert('Error', err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function fetchSites() {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const userId = authData?.user?.id;
      if (!userId) {
        setActiveSites([]);
        setPendingSites([]);
        setFinishedSites([]);
        setCurrentUserSiteId(null);
        setIsLeaderAny(false);
        return;
      }

      // Load user's site_id (used for member Pending/Finished tabs)
      const { data: userRow, error: userRowError } = await supabase
        .from('users')
        .select('site_id')
        .eq('id', userId)
        .maybeSingle();
      if (userRowError) throw userRowError;
      const userSiteId = userRow?.site_id ? String(userRow.site_id) : null;
      setCurrentUserSiteId(userSiteId);

      // Resolve member site_id(s) for this user.
      // Primary: group_members (survives even if users.site_id is cleared later)
      // Fallback: users.site_id
      const memberSiteIds = new Set<string>();
      try {
        const { data: memberRows, error: memberErr } = await supabase
          .from('group_members')
          .select('site_id')
          .eq('user_id', userId);
        if (memberErr) throw memberErr;
        (memberRows || []).forEach((r: any) => {
          const siteId = r?.site_id ? String(r.site_id) : null;
          if (siteId) memberSiteIds.add(siteId);
        });
      } catch {
        // ignore and use fallback below
      }

      if (memberSiteIds.size === 0 && userSiteId) {
        memberSiteIds.add(userSiteId);
      }

      // Determine if current user is a leader of any site
      const { data: leaderSites, error: leaderSitesError } = await supabase
        .from('sites')
        .select('id')
        .eq('leader_id', userId);
      if (leaderSitesError) throw leaderSitesError;

      const leaderSiteIds = Array.from(
        new Set((leaderSites || []).map((s: any) => (s?.id ? String(s.id) : null)).filter(Boolean))
      ) as string[];

      const isLeader = leaderSiteIds.length > 0;
      setIsLeaderAny(isLeader);

      // All Sites:
      // - Leaders: see Active sites that are not yet assigned a leader (available) + other Pending sites (visibility)
      // - Non-leaders: see Pending sites that are joinable (already has a leader assigned)
      // Fetch Pending sites with leader assigned (joinable)
      const { data: joinableSites, error: joinableSitesError } = await supabase
        .from('sites')
        .select(
          `id, name, status, latitude, longitude, created_at, finished_at, members_count,
           company:company_id ( company_name ),
           branch:branch_id ( branch_name )`
        )
        .eq('status', 'Pending')
        .not('leader_id', 'is', null)
        .order('created_at', { ascending: true })
        .order('name', { ascending: true });
      if (joinableSitesError) throw joinableSitesError;

      // Fetch Active sites with no leader assigned (available to claim)
      const { data: activeAvailable, error: activeError } = await supabase
        .from('sites')
        .select(
          `id, name, status, latitude, longitude, created_at, finished_at, members_count,
           company:company_id ( company_name ),
           branch:branch_id ( branch_name )`
        )
        .eq('status', 'Active')
        .is('leader_id', null)
        .order('created_at', { ascending: true })
        .order('name', { ascending: true });
      if (activeError) throw activeError;

      // Hide the site(s) the user already joined so it disappears from All Sites after accept.
      const filteredPending = (joinableSites || []).filter((s: any) => {
        if (memberSiteIds.size === 0) return true;
        return !memberSiteIds.has(String(s.id));
      });
      const filteredActive = (activeAvailable || []).filter((s: any) => {
        if (memberSiteIds.size === 0) return true;
        return !memberSiteIds.has(String(s.id));
      });

      // Combine Pending and Active sites
      const combined = [...filteredPending, ...filteredActive];
      const deduped: any[] = [];
      const seen = new Set<string>();
      for (const row of combined) {
        const id = String(row.id);
        if (seen.has(id)) continue;
        seen.add(id);
        deduped.push(row);
      }

      // Fetch member counts for all sites we are about to display
      const allSiteIds = deduped.map(s => s.id);
      const memberCounts = await fetchMemberCounts(allSiteIds);
      setActiveSites(deduped.map(s => mapRowToSite(s, memberCounts)));

      // Pending/Finished lists:
      // - Leaders: their assigned site(s)
      // - Non-leaders: only the site(s) linked to users.site_id or group_members
      if (isLeader) {
        // Pending sites (still from sites table)
        const { data: pendingAssigned, error: pendingAssignedError } = await supabase
          .from('sites')
          .select(
            `id, name, status, latitude, longitude, created_at, finished_at, members_count,
             company:company_id ( company_name ),
             branch:branch_id ( branch_name )`
          )
          .in('id', leaderSiteIds)
          .eq('status', 'Pending')
          .order('created_at', { ascending: true })
          .order('name', { ascending: true });
        if (pendingAssignedError) throw pendingAssignedError;

        // Fetch member counts for these sites
        const pendingIds = (pendingAssigned || []).map(s => s.id);
        const pendingCounts = await fetchMemberCounts(pendingIds);
        setPendingSites((pendingAssigned || []).map(s => mapRowToSite(s, pendingCounts)));

        // Finished sites now from archived_sitegroup
        const { data: finishedAssigned, error: finishedAssignedError } = await supabase
          .from('archived_sitegroup')
          .select(
            `id, name, status, latitude, longitude, created_at, finished_at, members_count,
             company:company_id ( company_name ),
             branch:branch_id ( branch_name )`
          )
          .eq('leader_id', userId)
          .order('finished_at', { ascending: false })
          .order('name', { ascending: true });
        if (finishedAssignedError) throw finishedAssignedError;

        const finishedIds = (finishedAssigned || []).map(s => s.id);
        const finishedCounts = await fetchMemberCounts(finishedIds);
        setFinishedSites((finishedAssigned || []).map(s => mapRowToSite(s, finishedCounts)));

        if ((pendingAssigned || []).length > 0 && activeList === 'All' && !didAutoSwitchToPending) {
          setActiveList('Pending');
          setDidAutoSwitchToPending(true);
        }
      } else {
        if (memberSiteIds.size === 0) {
          setPendingSites([]);
          setFinishedSites([]);
          return;
        }

        const siteIdList = Array.from(memberSiteIds);
        // Pending sites from sites table
        const { data: mySites, error: mySitesError } = await supabase
          .from('sites')
          .select(
            `id, name, status, latitude, longitude, created_at, finished_at, members_count,
             company:company_id ( company_name ),
             branch:branch_id ( branch_name )`
          )
          .in('id', siteIdList)
          .order('created_at', { ascending: true });
        if (mySitesError) throw mySitesError;

        const memberCountsForMySites = await fetchMemberCounts(siteIdList);
        const mappedSites = (mySites || []).map(s => mapRowToSite(s, memberCountsForMySites));
        setPendingSites(mappedSites.filter((s) => s.status === 'Pending'));

        // Finished sites from archived_sitegroup for this user (as member)
        const { data: finishedArchived, error: finishedArchivedError } = await supabase
          .from('archived_sitegroup')
          .select(
            `id, name, status, latitude, longitude, created_at, finished_at, members_count,
             company:company_id ( company_name ),
             branch:branch_id ( branch_name )`
          )
          .in('id', siteIdList)
          .order('finished_at', { ascending: false })
          .order('name', { ascending: true });
        if (finishedArchivedError) throw finishedArchivedError;

        const finishedIds = (finishedArchived || []).map(s => s.id);
        const finishedCounts = await fetchMemberCounts(finishedIds);
        setFinishedSites((finishedArchived || []).map(s => mapRowToSite(s, finishedCounts)));
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  const currentList =
    activeList === 'All' ? activeSites : activeList === 'Pending' ? pendingSites : finishedSites;
  const filteredSites = currentList.filter((site) => {
    const q = searchText.toLowerCase();
    return (
      site.name.toLowerCase().includes(q) ||
      (site.companyName && site.companyName.toLowerCase().includes(q)) ||
      (site.branchName && site.branchName.toLowerCase().includes(q))
    );
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
        onRequestClose={() => setSelectedSite(null)}>
        <SiteDetails
          site={selectedSite}
          onBack={() => setSelectedSite(null)}
          onSiteUpdated={(nextTab) => {
            if (nextTab) setActiveList(nextTab);
            fetchSites();
          }}
          onViewOnMap={() => {
            setSelectedSite(null);
            onMapPress?.();
          }}
        />
      </Modal>

      {/* Header Section */}
      <View className="border-b border-green-100 bg-white px-6 py-6 pt-12">
        <View className="mb-6 flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-extrabold text-gray-900">Sites</Text>
            <Text className="mt-1 text-xs font-semibold text-green-600">Manage your locations</Text>
          </View>
          <TouchableOpacity
            onPress={onMapPress}
            className="rounded-full bg-green-100 p-3 active:scale-95">
            <Ionicons name="map" size={24} color="#10b981" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View
          className={`flex-row items-center rounded-2xl border-2 bg-gray-100 px-4 py-3 ${searchText.length > 0 ? 'border-green-500' : 'border-gray-300'}`}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            placeholder="Search sites..."
            value={searchText}
            onChangeText={setSearchText}
            className="ml-3 flex-1 text-base font-medium text-gray-900"
            placeholderTextColor="#9ca3af"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Sites Filter Toggle (All Sites first) */}
        <View className="mt-4 flex-row rounded-2xl border border-gray-200 bg-gray-100 p-1">
          <TouchableOpacity
            onPress={() => setActiveList('All')}
            className={`flex-1 rounded-xl py-2 ${activeList === 'All' ? 'bg-white' : 'bg-transparent'}`}>
            <Text
              className={`text-center font-extrabold ${activeList === 'All' ? 'text-green-600' : 'text-gray-600'}`}>
              All Sites
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveList('Pending')}
            className={`flex-1 rounded-xl py-2 ${activeList === 'Pending' ? 'bg-white' : 'bg-transparent'}`}>
            <Text
              className={`text-center font-extrabold ${activeList === 'Pending' ? 'text-green-600' : 'text-gray-600'}`}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveList('Finished')}
            className={`flex-1 rounded-xl py-2 ${activeList === 'Finished' ? 'bg-white' : 'bg-transparent'}`}>
            <Text
              className={`text-center font-extrabold ${activeList === 'Finished' ? 'text-green-600' : 'text-gray-600'}`}>
              Finished
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sites List */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <View className="px-6 py-6 pb-28">
          {loading ? (
            <View className="items-center justify-center py-16">
              <Text className="mt-4 text-base font-semibold text-gray-500">Loading sites...</Text>
            </View>
          ) : filteredSites.length > 0 ? (
            <View className="gap-4">
              {filteredSites.map((site) => (
                <TouchableOpacity
                  key={site.id}
                  onPress={() => handleSitePress(site)}
                  className="rounded-3xl border-2 border-green-100 bg-white p-5 shadow-md shadow-green-200 active:scale-95">
                  {/* Top Section - Icon and Basic Info */}
                  <View className="mb-5 flex-row items-start">
                    {/* Location Icon */}
                    <TouchableOpacity
                      onPress={() => onSiteMapPress?.(site)}
                      className={`h-14 w-14 rounded-2xl ${site.status === 'Finished' ? 'bg-gray-400' : 'bg-green-500'} mr-4 items-center justify-center active:scale-95`}>
                      <Ionicons name="location" size={26} color="white" />
                    </TouchableOpacity>

                    {/* Site Info with Company & Branch */}
                    <View className="flex-1">
                      <View className="mb-1 flex-row items-center">
                        <Text className="flex-1 text-lg font-extrabold text-gray-900">
                          {site.name}
                        </Text>
                        <View
                          className={`h-3 w-3 rounded-full ${site.status === 'Finished' ? 'bg-gray-400' : 'bg-green-500'}`}
                        />
                      </View>

                      {/* Company name (if available) */}
                      {site.companyName && (
                        <Text className="text-base font-bold text-gray-700">
                          {site.companyName}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Staff Count Section */}
                  <View className="mb-4 items-center justify-center rounded-2xl border border-green-200 bg-green-50 p-4">
                    <Text className="text-xs font-semibold uppercase text-gray-500">
                      Staff Count
                    </Text>
                    <Text className="mt-2 text-2xl font-extrabold text-gray-900">
                      {site.staffCount}
                    </Text>
                  </View>

                  {/* Coordinates Section (beside house icon) */}
                  <View className="flex-row items-center">
                    <Ionicons name="home-outline" size={16} color="#6b7280" />
                    {/* Branch name (if available) */}
                    {site.branchName && (
                      <Text
                        className="ml-2 mt-0.5  flex-1 text-sm font-semibold text-green-600"
                        numberOfLines={1}>
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
              <Text className="mt-4 text-base font-semibold text-gray-500">
                {activeList === 'All'
                  ? 'No pending sites to join'
                  : activeList === 'Pending'
                    ? 'No pending sites assigned'
                    : 'No finished sites found'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}