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
  status: 'Active' | 'Pending' | 'Finished';
  securityLevel: 'high' | 'medium' | 'low';
  startTime?: string | null;
  endTime?: string | null;
  dateAccomplished?: string | null;
  membersCount?: number | null;
  createdAt?: string | null;
  finishedAt?: string | null;
  staffCount: number;
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
  const [currentUserGroupId, setCurrentUserGroupId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSites();
  }, []);

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
        setCurrentUserGroupId(null);
        setIsLeaderAny(false);
        return;
      }

      // Load user's group_id (used for member Pending/Finished tabs)
      const { data: userRow, error: userRowError } = await supabase
        .from('users')
        .select('group_id')
        .eq('id', userId)
        .maybeSingle();
      if (userRowError) throw userRowError;
      const userGroupId = userRow?.group_id ? String(userRow.group_id) : null;
      setCurrentUserGroupId(userGroupId);

      // Resolve member site_id(s) for this user.
      // Primary: group_members (survives even if users.group_id is cleared later)
      // Fallback: users.group_id -> groups.site_id
      const memberSiteIds = new Set<string>();
      try {
        const { data: memberRows, error: memberErr } = await supabase
          .from('group_members')
          .select('group:group_id ( site_id )')
          .eq('user_id', userId);
        if (memberErr) throw memberErr;
        (memberRows || []).forEach((r: any) => {
          const grp = Array.isArray(r?.group) ? r.group[0] : r?.group;
          const siteId = grp?.site_id ? String(grp.site_id) : null;
          if (siteId) memberSiteIds.add(siteId);
        });
      } catch {
        // ignore and use fallback below
      }

      if (memberSiteIds.size === 0 && userGroupId) {
        const { data: myGroup, error: myGroupError } = await supabase
          .from('groups')
          .select('site_id')
          .eq('id', userGroupId)
          .maybeSingle();
        if (myGroupError) throw myGroupError;
        const fallbackSiteId = myGroup?.site_id ? String(myGroup.site_id) : null;
        if (fallbackSiteId) memberSiteIds.add(fallbackSiteId);
      }

      const mapRowToSite = (item: any): Site => ({
        id: item.id,
        name: item.name || 'Unnamed site',
        companyName: item.company?.company_name || null,
        branchName: item.branch?.branch_name || null,
        latitude: item.latitude,
        longitude: item.longitude,
        status: (item.status as 'Active' | 'Pending' | 'Finished') || 'Active',
        securityLevel: 'low',
        staffCount: 0,
        createdAt: item.created_at || null,
        finishedAt: item.finished_at || null,
        dateAccomplished: item.date_accomplished || null,
        membersCount: item.members_count ?? null,
      });

      // Determine if current user is a leader of any group
      const { data: leaderGroups, error: leaderGroupsError } = await supabase
        .from('groups')
        .select('site_id')
        .eq('leader_id', userId);
      if (leaderGroupsError) throw leaderGroupsError;

      const leaderSiteIds = Array.from(
        new Set(
          (leaderGroups || [])
            .map((g: any) => (g?.site_id ? String(g.site_id) : null))
            .filter((v: string | null): v is string => !!v)
        )
      );

      const isLeader = leaderSiteIds.length > 0;
      setIsLeaderAny(isLeader);

      // All Sites:
      // - Leaders: see only Active sites that are not assigned to any group (available)
      // - Non-leaders: see Pending sites that are joinable (already has a leader assigned)
      if (isLeader) {
        // Also show remaining Pending sites (not assigned to this leader) for visibility.
        const { data: remainingPending, error: remainingPendingError } = await supabase
          .from('sites')
          .select(
            `id, name, status, latitude, longitude, created_at, finished_at, date_accomplished, members_count,
             company:company_id ( company_name ),
             branch:branch_id ( branch_name )`
          )
          .eq('status', 'Pending')
          .order('created_at', { ascending: true })
          .order('name', { ascending: true });
        if (remainingPendingError) throw remainingPendingError;

        const { data: allGroupRows, error: allGroupError } = await supabase
          .from('groups')
          .select('site_id')
          .not('site_id', 'is', null);
        if (allGroupError) throw allGroupError;
        const takenSiteIds = new Set(
          (allGroupRows || [])
            .map((r: any) => (r?.site_id ? String(r.site_id) : null))
            .filter((v: string | null): v is string => !!v)
        );

        const { data: activeData, error: activeError } = await supabase
          .from('sites')
          .select(
            `id, name, status, latitude, longitude, created_at, finished_at, date_accomplished, members_count,
             company:company_id ( company_name ),
             branch:branch_id ( branch_name )`
          )
          .eq('status', 'Active')
          .order('created_at', { ascending: true })
          .order('name', { ascending: true });
        if (activeError) throw activeError;

        const myLeaderSiteSet = new Set(leaderSiteIds);
        const remainingPendingFiltered = (remainingPending || []).filter((row: any) => !myLeaderSiteSet.has(String(row.id)));
        const activeAvailable = (activeData || []).filter((row: any) => !takenSiteIds.has(String(row.id)));

        // Pending first, then available Active.
        const combined = [...remainingPendingFiltered, ...activeAvailable];
        const deduped: any[] = [];
        const seen = new Set<string>();
        for (const row of combined) {
          const id = String(row.id);
          if (seen.has(id)) continue;
          seen.add(id);
          deduped.push(row);
        }

        setActiveSites(deduped.map(mapRowToSite));
      } else {
        // Joinable = groups with leader_id set and site is Pending.
        const { data: joinableGroups, error: joinableGroupsError } = await supabase
          .from('groups')
          .select('site_id')
          .not('leader_id', 'is', null)
          .not('site_id', 'is', null);
        if (joinableGroupsError) throw joinableGroupsError;

        const joinableSiteIds = Array.from(
          new Set(
            (joinableGroups || [])
              .map((g: any) => (g?.site_id ? String(g.site_id) : null))
              .filter((v: string | null): v is string => !!v)
          )
        );

        if (joinableSiteIds.length === 0) {
          setActiveSites([]);
        } else {
          const { data: joinableSites, error: joinableSitesError } = await supabase
            .from('sites')
            .select(
              `id, name, status, latitude, longitude, created_at, finished_at, date_accomplished, members_count,
               company:company_id ( company_name ),
               branch:branch_id ( branch_name )`
            )
            .in('id', joinableSiteIds)
            .eq('status', 'Pending')
            .order('created_at', { ascending: true })
            .order('name', { ascending: true });
          if (joinableSitesError) throw joinableSitesError;

          // Hide the site the user already joined so it disappears from All Sites after accept.
          const filtered = (joinableSites || []).filter((s: any) => {
            if (memberSiteIds.size === 0) return true;
            return !memberSiteIds.has(String(s.id));
          });
          setActiveSites(filtered.map(mapRowToSite));
        }
      }

      // Pending/Finished lists:
      // - Leaders: their assigned site(s)
      // - Non-leaders: only the site linked to users.group_id (joined group)
      if (isLeader) {
        const { data: pendingAssigned, error: pendingAssignedError } = await supabase
          .from('sites')
          .select(
            `id, name, status, latitude, longitude, created_at, finished_at, date_accomplished, members_count,
             company:company_id ( company_name ),
             branch:branch_id ( branch_name )`
          )
          .in('id', leaderSiteIds)
          .eq('status', 'Pending')
          .order('created_at', { ascending: true })
          .order('name', { ascending: true });
        if (pendingAssignedError) throw pendingAssignedError;

        const { data: finishedAssigned, error: finishedAssignedError } = await supabase
          .from('sites')
          .select(
            `id, name, status, latitude, longitude, created_at, finished_at, date_accomplished, members_count,
             company:company_id ( company_name ),
             branch:branch_id ( branch_name )`
          )
          .in('id', leaderSiteIds)
          .eq('status', 'Finished')
          .order('finished_at', { ascending: false })
          .order('name', { ascending: true });
        if (finishedAssignedError) throw finishedAssignedError;

        setPendingSites((pendingAssigned || []).map(mapRowToSite));
        setFinishedSites((finishedAssigned || []).map(mapRowToSite));

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
        const { data: mySites, error: mySitesError } = await supabase
          .from('sites')
          .select(
            `id, name, status, latitude, longitude, created_at, finished_at, date_accomplished, members_count,
             company:company_id ( company_name ),
             branch:branch_id ( branch_name )`
          )
          .in('id', siteIdList)
          .order('created_at', { ascending: true });
        if (mySitesError) throw mySitesError;

        const mappedSites = (mySites || []).map(mapRowToSite);
        setPendingSites(mappedSites.filter((s) => s.status === 'Pending'));
        setFinishedSites(mappedSites.filter((s) => s.status === 'Finished').sort((a, b) => {
          const at = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
          const bt = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
          return bt - at;
        }));
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
        onRequestClose={() => setSelectedSite(null)}
      >
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

        {/* Sites Filter Toggle (All Sites first) */}
        <View className="flex-row mt-4 bg-gray-100 rounded-2xl p-1 border border-gray-200">
          <TouchableOpacity
            onPress={() => setActiveList('All')}
            className={`flex-1 py-2 rounded-xl ${activeList === 'All' ? 'bg-white' : 'bg-transparent'}`}
          >
            <Text className={`text-center font-extrabold ${activeList === 'All' ? 'text-green-600' : 'text-gray-600'}`}>
              All Sites
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveList('Pending')}
            className={`flex-1 py-2 rounded-xl ${activeList === 'Pending' ? 'bg-white' : 'bg-transparent'}`}
          >
            <Text className={`text-center font-extrabold ${activeList === 'Pending' ? 'text-green-600' : 'text-gray-600'}`}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveList('Finished')}
            className={`flex-1 py-2 rounded-xl ${activeList === 'Finished' ? 'bg-white' : 'bg-transparent'}`}
          >
            <Text className={`text-center font-extrabold ${activeList === 'Finished' ? 'text-green-600' : 'text-gray-600'}`}>
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
                      className={`w-14 h-14 rounded-2xl ${site.status === 'Finished' ? 'bg-gray-400' : 'bg-green-500'} items-center justify-center mr-4 active:scale-95`}
                    >
                      <Ionicons name="location" size={26} color="white" />
                    </TouchableOpacity>

                    {/* Site Info with Company & Branch */}
                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <Text className="text-gray-900 font-extrabold text-lg flex-1">
                          {site.name}
                        </Text>
                        <View className={`h-3 w-3 rounded-full ${site.status === 'Finished' ? 'bg-gray-400' : 'bg-green-500'}`} />
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
              <Text className="text-gray-500 text-base mt-4 font-semibold">
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