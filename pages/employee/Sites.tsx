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
  ActivityIndicator,
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
  membersCount?: number | null;
  createdAt?: string | null;
  finishedAt?: string | null;
  staffCount: number;
}

interface SitesProps {
  onMapPress?: () => void;
  onSiteMapPress?: (site: Site) => void;
}

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
  (data || []).forEach((row: any) => {
    const siteId = row.site_id;
    counts[siteId] = (counts[siteId] || 0) + 1;
  });
  return counts;
}

// Helper to fetch accepted site IDs for a user (active sites only)
async function fetchAcceptedSiteIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('accepted_sites')
    .select('site_id')
    .eq('user_id', userId)
    .not('site_id', 'is', null);
  if (error) {
    console.error('Error fetching accepted sites:', error);
    return new Set();
  }
  return new Set((data || []).map(row => String(row.site_id)).filter(Boolean));
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
  const [acceptedCount, setAcceptedCount] = useState(0);

  useEffect(() => {
    fetchSites();
  }, []);

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
        setAcceptedCount(0);
        return;
      }

      // Get user's site_id (leader assignment)
      const { data: userRow, error: userRowError } = await supabase
        .from('users')
        .select('site_id')
        .eq('id', userId)
        .maybeSingle();
      if (userRowError) throw userRowError;
      const userSiteId = userRow?.site_id ? String(userRow.site_id) : null;
      setCurrentUserSiteId(userSiteId);

      // Build set of site IDs where the user is already a member (group_members)
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
        // ignore
      }

      // Add user's own leader site if any
      if (userSiteId) {
        memberSiteIds.add(userSiteId);
      }

      // NEW: fetch accepted site IDs from accepted_sites table
      const acceptedSiteIds = await fetchAcceptedSiteIds(userId);
      acceptedSiteIds.forEach(id => memberSiteIds.add(id));
      setAcceptedCount(acceptedSiteIds.size);

      // Determine if user is a leader of any site
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

      // --- Fetch joinable sites (for "All" tab) ---
      // Pending sites with leader assigned, that user hasn't already joined
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

      // Active sites without leader
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

      // Filter out sites already joined (via any method)
      const filteredPending = (joinableSites || []).filter((s: any) => !memberSiteIds.has(String(s.id)));
      const filteredActive = (activeAvailable || []).filter((s: any) => !memberSiteIds.has(String(s.id)));

      const combined = [...filteredPending, ...filteredActive];
      const deduped: any[] = [];
      const seen = new Set<string>();
      for (const row of combined) {
        const id = String(row.id);
        if (seen.has(id)) continue;
        seen.add(id);
        deduped.push(row);
      }

      const allSiteIds = deduped.map(s => s.id);
      const memberCounts = await fetchMemberCounts(allSiteIds);
      setActiveSites(deduped.map(s => mapRowToSite(s, memberCounts)));

      // --- User's own sites (Pending & Finished) ---
      if (isLeader) {
        // Sites where user is the leader
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
        const pendingIds = (pendingAssigned || []).map(s => s.id);
        const pendingCounts = await fetchMemberCounts(pendingIds);
        setPendingSites((pendingAssigned || []).map(s => mapRowToSite(s, pendingCounts)));

        // Also include sites the leader has accepted as a member (from accepted_sites)
        if (acceptedSiteIds.size > 0) {
          const { data: acceptedLeaderSites, error: acceptedLeaderError } = await supabase
            .from('sites')
            .select(
              `id, name, status, latitude, longitude, created_at, finished_at, members_count,
               company:company_id ( company_name ),
               branch:branch_id ( branch_name )`
            )
            .in('id', Array.from(acceptedSiteIds))
            .eq('status', 'Pending')
            .order('created_at', { ascending: true })
            .order('name', { ascending: true });
          if (!acceptedLeaderError && acceptedLeaderSites) {
            const acceptedCounts = await fetchMemberCounts(acceptedLeaderSites.map(s => s.id));
            const mappedAccepted = acceptedLeaderSites.map(s => mapRowToSite(s, acceptedCounts));
            setPendingSites(prev => {
              const existingIds = new Set(prev.map(s => s.id));
              const newSites = mappedAccepted.filter(s => !existingIds.has(s.id));
              return [...prev, ...newSites];
            });
          }
        }

        // Finished sites where user is the leader
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

        // Auto‑switch to Pending tab if there are pending leader sites
        if ((pendingAssigned || []).length > 0 && activeList === 'All' && !didAutoSwitchToPending) {
          setActiveList('Pending');
          setDidAutoSwitchToPending(true);
        }
      } else {
        // Non‑leader: sites where user is a member (via group_members or accepted_sites)
        if (memberSiteIds.size === 0) {
          setPendingSites([]);
          setFinishedSites([]);
          return;
        }

        const siteIdList = Array.from(memberSiteIds);
        // Fetch sites from sites table (active/pending)
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
        let mappedSites = (mySites || []).map(s => mapRowToSite(s, memberCountsForMySites));

        // Also explicitly fetch any accepted sites that might not be in group_members yet
        // (This is a safety net; normally they are already in memberSiteIds)
        if (acceptedSiteIds.size > 0) {
          const acceptedIdList = Array.from(acceptedSiteIds);
          const { data: acceptedSitesData, error: acceptedSitesError } = await supabase
            .from('sites')
            .select(
              `id, name, status, latitude, longitude, created_at, finished_at, members_count,
               company:company_id ( company_name ),
               branch:branch_id ( branch_name )`
            )
            .in('id', acceptedIdList)
            .order('created_at', { ascending: true });
          if (!acceptedSitesError && acceptedSitesData) {
            const acceptedCounts = await fetchMemberCounts(acceptedIdList);
            const mappedAccepted = acceptedSitesData.map(s => mapRowToSite(s, acceptedCounts));
            const existingIds = new Set(mappedSites.map(s => s.id));
            mappedSites.push(...mappedAccepted.filter(s => !existingIds.has(s.id)));
          }
        }

        // Split into pending and finished (active sites are not shown here)
        setPendingSites(mappedSites.filter(s => s.status === 'Pending'));

        // Finished sites from archived_sitegroup
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
      <StatusBar barStyle="dark-content" />

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

      {/* Header */}
      <View className="border-b border-gray-100 bg-white px-6 pb-6 pt-12">
        <View className="mb-6 flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-extrabold text-gray-900">Sites</Text>
            <Text className="mt-1 text-sm text-gray-500">Manage your locations</Text>
            {/* Optional: show accepted sites count */}
            {acceptedCount > 0 && (
              <Text className="mt-1 text-xs text-green-600">
                Accepted sites: {acceptedCount}/5
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={onMapPress}
            className="rounded-full bg-gray-100 p-3 active:scale-95">
            <Ionicons name="map-outline" size={24} color="#10b981" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View
          className={`flex-row items-center rounded-xl border bg-gray-50 px-4 py-3 ${
            searchText.length > 0 ? 'border-green-500' : 'border-gray-200'
          }`}>
          <Ionicons name="search-outline" size={20} color="#6b7280" />
          <TextInput
            placeholder="Search sites..."
            value={searchText}
            onChangeText={setSearchText}
            className="ml-3 flex-1 text-base text-gray-900"
            placeholderTextColor="#9ca3af"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View className="mt-6 flex-row rounded-full bg-gray-100 p-1">
          <TouchableOpacity
            onPress={() => setActiveList('All')}
            className={`flex-1 rounded-full py-2 ${
              activeList === 'All' ? 'bg-green-500' : 'bg-transparent'
            }`}>
            <Text
              className={`text-center font-semibold ${
                activeList === 'All' ? 'text-white' : 'text-gray-600'
              }`}>
              All Sites
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveList('Pending')}
            className={`flex-1 rounded-full py-2 ${
              activeList === 'Pending' ? 'bg-green-500' : 'bg-transparent'
            }`}>
            <Text
              className={`text-center font-semibold ${
                activeList === 'Pending' ? 'text-white' : 'text-gray-600'
              }`}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveList('Finished')}
            className={`flex-1 rounded-full py-2 ${
              activeList === 'Finished' ? 'bg-green-500' : 'bg-transparent'
            }`}>
            <Text
              className={`text-center font-semibold ${
                activeList === 'Finished' ? 'text-white' : 'text-gray-600'
              }`}>
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
              <ActivityIndicator size="large" color="#10b981" />
              <Text className="mt-4 text-base text-gray-500">Loading sites...</Text>
            </View>
          ) : filteredSites.length > 0 ? (
            <View className="space-y-4">
              {filteredSites.map((site) => (
                <TouchableOpacity
                  key={site.id}
                  onPress={() => handleSitePress(site)}
                  className="rounded-2xl border border-gray-100 bg-white p-5 active:scale-[0.98]">
                  {/* Header row: site name + status dot */}
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text className="flex-1 text-lg font-bold text-gray-900">{site.name}</Text>
                    <View
                      className={`h-2.5 w-2.5 rounded-full ${
                        site.status === 'Finished' ? 'bg-gray-400' : 'bg-green-500'
                      }`}
                    />
                  </View>

                  {/* Company name (if any) */}
                  {site.companyName && (
                    <Text className="mb-3 text-sm text-gray-500">{site.companyName}</Text>
                  )}

                  {/* Location / Branch info */}
                  <View className="mb-3 flex-row items-center">
                    <Ionicons name="location-outline" size={16} color="#9ca3af" />
                    <Text className="ml-2 flex-1 text-sm text-gray-600" numberOfLines={2}>
                      {site.branchName || 'Location not specified'}
                    </Text>
                  </View>

                  {/* Staff count row */}
                  <View className="mt-1 flex-row items-center justify-between border-t border-gray-100 pt-3">
                    <View className="flex-row items-center">
                      <Ionicons name="people-outline" size={18} color="#6b7280" />
                      <Text className="ml-2 text-sm text-gray-600">
                        {site.staffCount} {site.staffCount === 1 ? 'member' : 'members'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => onSiteMapPress?.(site)}
                      className="flex-row items-center">
                      <Text className="mr-1 text-sm text-green-600">View on map</Text>
                      <Ionicons name="chevron-forward-outline" size={16} color="#10b981" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="items-center justify-center py-16">
              <Ionicons name="location-outline" size={48} color="#d1d5db" />
              <Text className="mt-4 text-center text-base text-gray-500">
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