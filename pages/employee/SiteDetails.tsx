
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SiteLocationMap from '../../components/SiteLocationMap';
import supabase from '../../utils/supabase';
import type { Site } from './Sites';

interface SiteDetailsProps {
  site: Site | null | undefined;
  onBack?: () => void;
  onViewOnMap?: () => void;
}

export default function SiteDetails({ site, onBack, onViewOnMap }: SiteDetailsProps) {
  const [groupLeaderName, setGroupLeaderName] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [loadingGroupInfo, setLoadingGroupInfo] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);

  const coordinateText =
    site && site.latitude != null && site.longitude != null
      ? `(${site.latitude.toFixed(4)}, ${site.longitude.toFixed(4)})`
      : 'Location not set';

  const workforceLabel =
    site && site.membersCount != null
      ? `${site.membersCount} Members`
      : 'No data';

  useEffect(() => {
    const loadGroupInfo = async () => {
      try {
        setLoadingGroupInfo(true);

        if (!site || !site.id) {
          return;
        }

        // Get current authenticated user
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const userId = authData?.user?.id || null;
        setCurrentUserId(userId);

        // Fetch group linked to this site (if any)
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('id, name, leader:leader_id ( full_name ), site_id')
          .eq('site_id', site.id)
          .maybeSingle();

        if (!groupError && groupData) {
          setGroupId(groupData.id);
          setGroupName(groupData.name);
          const leaderName = Array.isArray((groupData as any).leader)
            ? (groupData as any).leader[0]?.full_name
            : (groupData as any).leader?.full_name;
          setGroupLeaderName(leaderName || null);

          // If we have a logged in user, check whether they're already in this group
          if (userId) {
            const { data: userRow, error: userError } = await supabase
              .from('users')
              .select('group_id')
              .eq('id', userId)
              .maybeSingle();

            if (!userError && userRow && userRow.group_id === groupData.id) {
              setHasAccepted(true);
            }
          }
        } else if (groupError && (groupError as any).code !== 'PGRST116') {
          // Ignore "no rows" error, surface others
          console.warn('Error loading group info:', groupError.message);
        }
      } catch (err: any) {
        console.warn('Failed to load group info:', err?.message || String(err));
      } finally {
        setLoadingGroupInfo(false);
      }
    };

    loadGroupInfo();
  }, [site]);

  const handleAcceptSite = async () => {
    if (!currentUserId) {
      Alert.alert('Not signed in', 'You need to be signed in to accept a site.');
      return;
    }

    try {
      setAcceptLoading(true);

      let finalGroupId = groupId;

      // If no group exists yet for this site, create one and set current user as leader
      if (!finalGroupId) {
        const { data: newGroup, error: createError } = await supabase
          .from('groups')
          .insert({
            name: groupName || `${site?.name || 'Site'} Team`,
            site_id: site?.id,
            leader_id: currentUserId,
          })
          .select('id, name, leader:leader_id ( full_name )')
          .single();

        if (createError) throw createError;

        finalGroupId = newGroup.id;
        setGroupId(newGroup.id);
        setGroupName(newGroup.name);
        const leaderName = Array.isArray((newGroup as any).leader)
          ? (newGroup as any).leader[0]?.full_name
          : (newGroup as any).leader?.full_name;
        setGroupLeaderName(leaderName || null);
      }

      if (!finalGroupId) {
        throw new Error('Unable to determine group id for this site');
      }

      // Persist membership: link the current user to the group
      const { error: updateUserError } = await supabase
        .from('users')
        .update({ group_id: finalGroupId })
        .eq('id', currentUserId);
      if (updateUserError) throw updateUserError;

      // Best-effort: insert membership row (if your DB has group_members)
      try {
        const { error: gmError } = await supabase
          .from('group_members')
          .insert([{ group_id: finalGroupId, user_id: currentUserId }]);

        // Ignore duplicate row error if constraint exists
        if (gmError && (gmError as any).code !== '23505') {
          console.warn('group_members insert failed:', gmError.message);
        }
      } catch (e) {
        // If table doesn't exist or RLS blocks it, don't block accept
        console.warn('Skipping group_members insert:', (e as any)?.message || String(e));
      }

      setHasAccepted(true);
      Alert.alert('Site accepted', 'You have joined this site team.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to accept site. Please try again.');
    } finally {
      setAcceptLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      {!site ? (
        <View className="flex-1 bg-white items-center justify-center">
          <TouchableOpacity
            onPress={onBack}
            className="mb-4 rounded-full bg-green-50 px-4 py-2 border border-green-100"
          >
            <Text className="text-green-600 font-semibold">Back to Sites</Text>
          </TouchableOpacity>
          <Text className="text-gray-500 font-semibold">No site selected</Text>
        </View>
      ) : (
        <>
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* Top hero section with live map */}
            <View className="rounded-b-3xl overflow-hidden border-b border-green-100 bg-green-50">
              <View className="h-64 w-full">
                <SiteLocationMap
                  latitude={site.latitude}
                  longitude={site.longitude}
                  siteName={site.name}
                  showBackButton
                  onBack={onBack}
                />
              </View>
              <View className="absolute top-12 left-6 right-6 flex-row items-center justify-between">
                <Text className="text-base font-semibold text-gray-900 bg-white bg-opacity-80 px-3 py-1 rounded-full">
                  Site Information
                </Text>
                <View className="w-10" />
              </View>
              <TouchableOpacity
                onPress={onViewOnMap}
                className="absolute bottom-6 right-6 rounded-full bg-white px-4 py-1.5 border border-green-100 shadow-sm"
              >
                <Text className="text-xs font-semibold text-green-600 tracking-widest">VIEW ON MAP</Text>
              </TouchableOpacity>
            </View>

            {/* Site basic info */}
            <View className="px-6 pt-6">
              {!!onBack && (
                <TouchableOpacity
                  onPress={onBack}
                  className="self-start mb-4 rounded-full bg-green-50 px-4 py-2 border border-green-100"
                >
                  <Text className="text-green-600 font-semibold">Back to Sites</Text>
                </TouchableOpacity>
              )}
              <Text className="text-2xl font-extrabold text-gray-900">{site.name}</Text>
              {site.companyName && <Text className="text-base text-gray-500 mt-1">{site.companyName}</Text>}
            </View>

            {/* Detail cards */}
            <View className="px-6 pt-6 pb-24">
              {/* Branch card */}
              <View className="bg-white rounded-3xl p-4 mb-4 shadow-sm border border-gray-100 flex-row items-center">
                <View className="w-10 h-10 rounded-2xl bg-green-50 items-center justify-center mr-4">
                  <Ionicons name="git-branch-outline" size={22} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-gray-400 tracking-widest">MAIN BRANCH</Text>
                  <Text className="text-base font-semibold text-gray-900 mt-1">{site.branchName || 'N/A'}</Text>
                </View>
              </View>

              {/* Workforce card */}
              <View className="bg-white rounded-3xl p-4 mb-4 shadow-sm border border-gray-100 flex-row items-center">
                <View className="w-10 h-10 rounded-2xl bg-green-50 items-center justify-center mr-4">
                  <Ionicons name="people-outline" size={22} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-gray-400 tracking-widest">SITE WORKFORCE</Text>
                  <Text className="text-base font-semibold text-gray-900 mt-1">{workforceLabel}</Text>
                </View>
              </View>

              {/* Leader card */}
              <View className="bg-white rounded-3xl p-4 mb-4 shadow-sm border border-gray-100 flex-row items-center">
                <View className="w-10 h-10 rounded-2xl bg-green-50 items-center justify-center mr-4">
                  <Ionicons name="person-circle-outline" size={22} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-gray-400 tracking-widest">TEAM LEADER</Text>
                  {loadingGroupInfo ? (
                    <View className="flex-row items-center mt-1">
                      <ActivityIndicator size="small" color="#10b981" />
                      <Text className="ml-2 text-xs text-gray-500">Loading leader...</Text>
                    </View>
                  ) : (
                    <Text className="text-base font-semibold text-gray-900 mt-1">
                      {groupLeaderName || 'No leader assigned'}
                    </Text>
                  )}
                </View>
              </View>

              {/* Status card */}
              <View className="bg-white rounded-3xl p-4 mb-4 shadow-sm border border-gray-100 flex-row items-center">
                <View className="w-10 h-10 rounded-2xl bg-green-50 items-center justify-center mr-4">
                  <Ionicons
                    name={site.status === 'active' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                    size={22}
                    color={site.status === 'active' ? '#22c55e' : '#9ca3af'}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-gray-400 tracking-widest">SITE STATUS</Text>
                  <Text
                    className={`text-base font-semibold mt-1 ${
                      site.status === 'active' ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    {site.status === 'active' ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              {/* Coordinates card */}
              <View className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex-row items-center">
                <View className="w-10 h-10 rounded-2xl bg-green-50 items-center justify-center mr-4">
                  <Ionicons name="location-outline" size={22} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-gray-400 tracking-widest">COORDINATES</Text>
                  <Text className="text-base font-semibold text-gray-900 mt-1">{coordinateText}</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Accept Site button fixed at bottom */}
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
            <TouchableOpacity
              onPress={handleAcceptSite}
              disabled={acceptLoading || hasAccepted}
              className={`w-full items-center justify-center rounded-2xl px-4 py-3 ${
                hasAccepted ? 'bg-gray-300' : 'bg-green-500 active:scale-95'
              }`}
            >
              {acceptLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className={`text-base font-bold ${hasAccepted ? 'text-gray-600' : 'text-white'}`}>
                  {hasAccepted ? 'Site Accepted' : 'Accept Site'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
