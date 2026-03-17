
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Alert, Modal, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SiteLocationMap from '../../components/SiteLocationMap';
import supabase from '../../utils/supabase';
import type { Site } from './Sites';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

interface SiteDetailsProps {
  site: Site | null | undefined;
  onBack?: () => void;
  onViewOnMap?: () => void;
  onSiteUpdated?: (nextTab?: 'Pending' | 'Finished') => void;
}

export default function SiteDetails({ site, onBack, onViewOnMap, onSiteUpdated }: SiteDetailsProps) {
  const [groupLeaderName, setGroupLeaderName] = useState<string | null>(null);
  const [groupLeaderId, setGroupLeaderId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserGroupId, setCurrentUserGroupId] = useState<string | null>(null);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [loadingGroupInfo, setLoadingGroupInfo] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [isUserLeaderAny, setIsUserLeaderAny] = useState(false);

  const [updateVisible, setUpdateVisible] = useState(false);
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateTriedSubmit, setUpdateTriedSubmit] = useState(false);
  const [starlinkSerial, setStarlinkSerial] = useState('');
  const [technicalIssue, setTechnicalIssue] = useState<string>('');
  const [technicalIssuePickerVisible, setTechnicalIssuePickerVisible] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');
  const [evidenceAssets, setEvidenceAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const technicalIssueOptions = useMemo(
    () => [
      'Starlink installation issue',
      'Internet down (no connection)',
      'Intermittent connection',
      'Slow internet speed',
      'High latency / unstable',
      'Obstruction / no signal',
      'Power issue',
      'Cable / port issue',
      'Router / Wi‑Fi issue',
      'Account / activation issue',
      'No equipment',
      'Other',
    ],
    []
  );

  const issueDescriptionPlaceholder = useMemo(() => {
    switch (technicalIssue) {
      case 'Starlink installation issue':
        return 'Describe what step failed (mounting, dish alignment, activation, setup)...';
      case 'Internet down (no connection)':
        return 'Describe symptoms (no internet, offline light, app status) and what you tried...';
      case 'Intermittent connection':
        return 'Describe when it disconnects (time, weather, duration) and any patterns...';
      case 'Slow internet speed':
        return 'Describe measured speed, number of users, and time of day...';
      case 'High latency / unstable':
        return 'Describe latency spikes, dropouts, and any steps performed...';
      case 'Obstruction / no signal':
        return 'Describe obstruction sources (trees/buildings), signal status, and site conditions...';
      case 'Power issue':
        return 'Describe power source, outages, voltage concerns, and equipment behavior...';
      case 'Cable / port issue':
        return 'Describe cable condition, connectors, ports checked, and observed damage...';
      case 'Router / Wi‑Fi issue':
        return 'Describe Wi‑Fi symptoms (SSID missing, cannot connect, weak signal) and troubleshooting...';
      case 'Account / activation issue':
        return 'Describe account status, activation errors, and any messages shown in the app...';
      case 'No equipment':
        return 'List missing equipment (dish, router, cable, mount) and current site readiness...';
      case 'Other':
        return 'Describe the issue clearly with steps taken and current status...';
      default:
        return 'Describe what happened...';
    }
  }, [technicalIssue]);

  const coordinateText =
    site && site.latitude != null && site.longitude != null
      ? `(${site.latitude.toFixed(4)}, ${site.longitude.toFixed(4)})`
      : 'Location not set';

  const workforceLabel =
    site && site.membersCount != null
      ? `${site.membersCount} Members`
      : 'No data';

  const isFinished = site?.status === 'Finished';
  const isActiveish = site?.status === 'Active' || site?.status === 'Pending';
  const isPending = site?.status === 'Pending';
  const isActive = site?.status === 'Active';
  const isLeaderForThisSite = !!currentUserId && !!groupLeaderId && currentUserId === groupLeaderId;

  useEffect(() => {
    const loadGroupInfo = async () => {
      try {
        setLoadingGroupInfo(true);

        // Reset per-site derived state to avoid showing stale info while loading.
        setGroupLeaderName(null);
        setGroupLeaderId(null);
        setGroupName(null);
        setGroupId(null);
        setHasAccepted(false);

        if (!site || !site.id) {
          return;
        }

        // Get current authenticated user
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const userId = authData?.user?.id || null;
        setCurrentUserId(userId);

        // Always fetch user's group_id (source of truth for "already accepted")
        let userGroupId: string | null = null;
        if (userId) {
          const { data: userRow, error: userError } = await supabase
            .from('users')
            .select('group_id')
            .eq('id', userId)
            .maybeSingle();

          if (!userError && userRow?.group_id) {
            userGroupId = String(userRow.group_id);
          }
        }
        setCurrentUserGroupId(userGroupId);

        // Determine whether the current user is a leader of any group.
        if (userId) {
          const { data: leaderRows, error: leaderErr } = await supabase
            .from('groups')
            .select('id')
            .eq('leader_id', userId)
            .limit(1);
          if (!leaderErr && (leaderRows || []).length > 0) {
            setIsUserLeaderAny(true);
          } else {
            setIsUserLeaderAny(false);
          }
        } else {
          setIsUserLeaderAny(false);
        }

        // Fetch group linked to this site (if any)
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('id, name, leader_id, leader:leader_id ( full_name ), site_id')
          .eq('site_id', site.id)
          .maybeSingle();

        if (!groupError && groupData) {
          setGroupId(groupData.id);
          setGroupName(groupData.name);
          setGroupLeaderId((groupData as any).leader_id ? String((groupData as any).leader_id) : null);
          const leaderName = Array.isArray((groupData as any).leader)
            ? (groupData as any).leader[0]?.full_name
            : (groupData as any).leader?.full_name;
          setGroupLeaderName(leaderName || null);

          if (userGroupId && userGroupId === groupData.id) {
            setHasAccepted(true);
          }
          return;
        }

        // If no group was found by site_id (or it was blocked), but user has a group_id,
        // fetch that group and verify it belongs to this site so the UI behaves correctly.
        if (!groupData && userGroupId) {
          const { data: myGroup, error: myGroupError } = await supabase
            .from('groups')
            .select('id, name, site_id, leader_id, leader:leader_id ( full_name )')
            .eq('id', userGroupId)
            .maybeSingle();

          if (!myGroupError && myGroup && String((myGroup as any).site_id) === String(site.id)) {
            setGroupId(myGroup.id);
            setGroupName(myGroup.name);
            setGroupLeaderId((myGroup as any).leader_id ? String((myGroup as any).leader_id) : null);
            const leaderName = Array.isArray((myGroup as any).leader)
              ? (myGroup as any).leader[0]?.full_name
              : (myGroup as any).leader?.full_name;
            setGroupLeaderName(leaderName || null);
            setHasAccepted(true);
            return;
          }
        }

        if (groupError && (groupError as any).code !== 'PGRST116') {
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

  useEffect(() => {
    // Ask permission for selecting evidence photos.
    // (No-op on web; mobile will prompt.)
    (async () => {
      try {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      } catch {
        // ignore
      }
    })();
  }, []);

  const resetUpdateForm = () => {
    setUpdateTriedSubmit(false);
    setStarlinkSerial('');
    setTechnicalIssue('');
    setIssueDescription('');
    setEvidenceAssets([]);
  };

  const validation = useMemo(() => {
    const serial = starlinkSerial.trim();
    const issue = technicalIssue.trim();
    const desc = issueDescription.trim();
    const evidenceCount = evidenceAssets.length;

    const serialError = serial.length === 0 ? 'Starlink serial is required.' : null;
    const issueError = issue.length === 0 ? 'Technical issue is required.' : null;
    const descError = desc.length === 0 ? 'Issue description is required.' : null;
    const evidenceError = evidenceCount === 0 ? 'At least one evidence photo is required.' : null;

    return {
      serialError,
      issueError,
      descError,
      evidenceError,
      isValid: !serialError && !issueError && !descError && !evidenceError,
    };
  }, [starlinkSerial, technicalIssue, issueDescription, evidenceAssets.length]);

  useEffect(() => {
    // When opening the Update modal, prefill fields from the latest DB record.
    // This makes the form more "formal" and editable if values already exist.
    (async () => {
      if (!updateVisible || !site?.id) return;
      try {
        const { data, error } = await supabase
          .from('sites')
          .select('starlink_serial, technical_issue, issue_description, evidence_urls')
          .eq('id', site.id)
          .maybeSingle();
        if (error) throw error;

        setStarlinkSerial((data?.starlink_serial as string | null) || '');
        setTechnicalIssue((data?.technical_issue as string | null) || '');
        setIssueDescription((data?.issue_description as string | null) || '');

        // Evidence URLs are stored in DB, but for uploads we track local assets.
        // Keep evidenceAssets empty until user selects new photos.
        setEvidenceAssets([]);
      } catch (e) {
        // Prefill is best-effort; don't block opening.
      }
    })();
  }, [updateVisible, site?.id]);

  const pickEvidencePhotos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsMultipleSelection: true,
        selectionLimit: 0,
      });

      if (result.canceled) return;
      const assets = result.assets || [];
      if (assets.length === 0) return;

      setEvidenceAssets((prev) => {
        const existingUris = new Set(prev.map((a) => a.uri));
        const merged = [...prev];
        for (const asset of assets) {
          if (!existingUris.has(asset.uri)) merged.push(asset);
        }
        return merged;
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to pick photos');
    }
  };

  const uploadEvidenceAndFinish = async () => {
    if (!site?.id) return;

    if (!isLeaderForThisSite) {
      Alert.alert('Not allowed', 'Only the assigned leader can update and finish this site.');
      return;
    }

    const serial = starlinkSerial.trim();
    const issue = technicalIssue.trim();
    const desc = issueDescription.trim();

    setUpdateTriedSubmit(true);
    // Matches DB constraint expectations: non-empty strings + at least 1 evidence url.
    if (!serial || !issue || !desc || evidenceAssets.length === 0) {
      Alert.alert('Validation', 'Please complete all required fields before submitting.');
      return;
    }

    try {
      setUpdateSubmitting(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const userId = authData?.user?.id;
      if (!userId) throw new Error('Not signed in');

      // Upload evidence photos to Supabase Storage.
      // NOTE: Requires a bucket named "site_evidence" to exist in Supabase.
      const uploadedUrls: string[] = [];
      for (let i = 0; i < evidenceAssets.length; i++) {
        const asset = evidenceAssets[i];

        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [],
          { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
        );

        const response = await fetch(manipulated.uri);
        const blob = await response.blob();

        const filePath = `${site.id}/${userId}/${Date.now()}_${i}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('site_evidence')
          .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('site_evidence').getPublicUrl(filePath);
        const publicUrl = urlData?.publicUrl;
        if (!publicUrl) throw new Error('Failed to generate evidence URL');
        uploadedUrls.push(publicUrl);
      }

      const nowIso = new Date().toISOString();
      const today = nowIso.slice(0, 10);

      const { error: updateError } = await supabase
        .from('sites')
        .update({
          status: 'Finished',
          updated_at: nowIso,
          date_accomplished: today,
          finished_at: nowIso,
          finished_by: userId,
          starlink_serial: serial,
          technical_issue: issue,
          issue_description: desc,
          evidence_urls: uploadedUrls,
        })
        .eq('id', site.id);

      if (updateError) throw updateError;

      Alert.alert('Success', 'Site updated and marked as Finished.');
      setUpdateVisible(false);
      resetUpdateForm();
      onSiteUpdated?.('Finished');
      onBack?.();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update site');
    } finally {
      setUpdateSubmitting(false);
    }
  };

  const handleAcceptSite = async () => {
    if (!site?.id) return;

    if (site?.status === 'Finished') {
      Alert.alert('Not available', 'This site is already finished.');
      return;
    }

    if (!currentUserId) {
      Alert.alert('Not signed in', 'You need to be signed in to accept a site.');
      return;
    }

    // Leaders (already assigned as a group leader) should only update their pending site.
    if (isUserLeaderAny) {
      Alert.alert('Not allowed', 'Leaders cannot accept new sites.');
      return;
    }

    // If user already has a group assignment, they should not re-accept.
    try {
      const { data: userRow } = await supabase
        .from('users')
        .select('group_id')
        .eq('id', currentUserId)
        .maybeSingle();
      if (userRow?.group_id) {
        setHasAccepted(true);
        setCurrentUserGroupId(String(userRow.group_id));
        Alert.alert('Already accepted', 'This site is already assigned to you.');
        return;
      }
    } catch {
      // ignore; accept flow will try to continue
    }

    try {
      setAcceptLoading(true);

      // Accept rules:
      // - For Pending sites: user joins the existing group (must already exist and have a leader)
      // - For Active sites: not joinable (no group/leader yet)
      if (isActive) {
        Alert.alert('Not available', 'This site is not yet open for joining. Please wait for a leader assignment.');
        return;
      }

      if (!isPending) {
        Alert.alert('Not available', 'This site cannot be accepted at this time.');
        return;
      }

      const { data: existingGroup, error: existingGroupErr } = await supabase
        .from('groups')
        .select('id, name, leader_id, leader:leader_id ( full_name )')
        .eq('site_id', site.id)
        .maybeSingle();
      if (existingGroupErr) throw existingGroupErr;
      if (!existingGroup?.id) {
        Alert.alert('Not available', 'No group is assigned to this site yet.');
        return;
      }

      const existingLeaderId = (existingGroup as any).leader_id ? String((existingGroup as any).leader_id) : null;
      if (!existingLeaderId) {
        Alert.alert('Not available', 'This site has no leader assigned yet.');
        return;
      }

      const finalGroupId = String(existingGroup.id);
      setGroupId(finalGroupId);
      setGroupName((existingGroup as any).name || null);
      setGroupLeaderId(existingLeaderId);
      const leaderName = Array.isArray((existingGroup as any).leader)
        ? (existingGroup as any).leader[0]?.full_name
        : (existingGroup as any).leader?.full_name;
      setGroupLeaderName(leaderName || null);

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
      onSiteUpdated?.('Pending');
      onBack?.();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to accept site. Please try again.');
    } finally {
      setAcceptLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <Modal
        visible={updateVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (updateSubmitting) return;
          setUpdateVisible(false);
        }}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl border-t border-gray-200">
            <View className="px-6 pt-5 pb-4 border-b border-gray-100 flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-extrabold text-gray-900">Update Site</Text>
                <Text className="text-xs text-gray-500 mt-1">Fill the required details to finish this site.</Text>
              </View>
              <TouchableOpacity
                disabled={updateSubmitting}
                className="w-10 h-10 rounded-2xl bg-gray-100 items-center justify-center"
                onPress={() => {
                  setUpdateVisible(false);
                }}
              >
                <Ionicons name="close" size={18} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-6 pt-5" showsVerticalScrollIndicator={false} bounces={false}>
              <View className="mb-5">
                <Text className="text-xs font-semibold text-gray-700">Starlink Serial</Text>
                <Text className="text-[11px] text-gray-500 mt-1">Required</Text>
                <TextInput
                  value={starlinkSerial}
                  onChangeText={setStarlinkSerial}
                  placeholder="Enter starlink serial"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  className="mt-2 rounded-2xl bg-gray-50 px-4 py-3 text-gray-900 font-semibold border border-gray-200"
                />
                {!!updateTriedSubmit && !!validation.serialError && (
                  <Text className="text-xs text-red-600 mt-2">{validation.serialError}</Text>
                )}
              </View>

              <View className="mb-5">
                <Text className="text-xs font-semibold text-gray-700">Technical Issue</Text>
                <Text className="text-[11px] text-gray-500 mt-1">Required</Text>
                <TouchableOpacity
                  disabled={updateSubmitting}
                  onPress={() => setTechnicalIssuePickerVisible(true)}
                  className="mt-2 rounded-2xl bg-gray-50 px-4 py-3 border border-gray-200 flex-row items-center"
                >
                  <Text className={`flex-1 font-semibold ${technicalIssue ? 'text-gray-900' : 'text-gray-400'}`}>
                    {technicalIssue || 'Select technical issue'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#6b7280" />
                </TouchableOpacity>
                {!!updateTriedSubmit && !!validation.issueError && (
                  <Text className="text-xs text-red-600 mt-2">{validation.issueError}</Text>
                )}
              </View>

              <View className="mb-5">
                <Text className="text-xs font-semibold text-gray-700">Issue Description</Text>
                <Text className="text-[11px] text-gray-500 mt-1">Required</Text>
                <TextInput
                  value={issueDescription}
                  onChangeText={setIssueDescription}
                  placeholder={issueDescriptionPlaceholder}
                  placeholderTextColor="#9ca3af"
                  multiline
                  className="mt-2 rounded-2xl bg-gray-50 px-4 py-3 text-gray-900 font-semibold border border-gray-200 min-h-[110px]"
                />
                {!!updateTriedSubmit && !!validation.descError && (
                  <Text className="text-xs text-red-600 mt-2">{validation.descError}</Text>
                )}
              </View>

              <View className="mb-6">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-xs font-semibold text-gray-700">Evidence Photos</Text>
                    <Text className="text-[11px] text-gray-500 mt-1">Required • {evidenceAssets.length} selected</Text>
                  </View>
                  <TouchableOpacity
                    disabled={updateSubmitting}
                    onPress={pickEvidencePhotos}
                    className="rounded-2xl bg-green-50 px-3 py-2 border border-green-200"
                  >
                    <Text className="text-green-700 font-semibold text-xs">Add Photos</Text>
                  </TouchableOpacity>
                </View>

                {evidenceAssets.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2 mt-3">
                    {evidenceAssets.map((asset) => (
                      <View key={asset.uri} className="relative">
                        <Image
                          source={{ uri: asset.uri }}
                          className="w-20 h-20 rounded-2xl border border-gray-200"
                        />
                        <TouchableOpacity
                          disabled={updateSubmitting}
                          onPress={() => setEvidenceAssets((prev) => prev.filter((a) => a.uri !== asset.uri))}
                          className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-gray-200 items-center justify-center"
                        >
                          <Ionicons name="close" size={14} color="#111827" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className="text-xs text-gray-500 mt-2">No photos selected</Text>
                )}

                {!!updateTriedSubmit && !!validation.evidenceError && (
                  <Text className="text-xs text-red-600 mt-2">{validation.evidenceError}</Text>
                )}
              </View>
            </ScrollView>

            <View className="px-6 pb-6">
              <TouchableOpacity
                disabled={updateSubmitting || !validation.isValid}
                onPress={uploadEvidenceAndFinish}
                className={`w-full items-center justify-center rounded-2xl px-4 py-3 ${
                  updateSubmitting || !validation.isValid ? 'bg-gray-300' : 'bg-green-500 active:scale-95'
                }`}
              >
                {updateSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className={`text-base font-bold ${updateSubmitting || !validation.isValid ? 'text-gray-600' : 'text-white'}`}>
                    Submit & Finish
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={technicalIssuePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTechnicalIssuePickerVisible(false)}
      >
        <View className="flex-1 bg-black/40 items-center justify-center p-6">
          <View className="w-full bg-white rounded-3xl border border-gray-200 overflow-hidden">
            <View className="px-5 py-4 bg-white flex-row items-center justify-between border-b border-gray-100">
              <Text className="text-base font-extrabold text-gray-900">Select Technical Issue</Text>
              <TouchableOpacity
                className="w-9 h-9 rounded-2xl bg-gray-100 items-center justify-center"
                onPress={() => setTechnicalIssuePickerVisible(false)}
              >
                <Ionicons name="close" size={16} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView className="max-h-72" showsVerticalScrollIndicator={false}>
              {technicalIssueOptions.map((opt) => {
                const selected = technicalIssue === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => {
                      setTechnicalIssue(opt);
                      setTechnicalIssuePickerVisible(false);
                    }}
                    className={`px-5 py-4 flex-row items-center border-b border-gray-100 ${selected ? 'bg-green-50' : 'bg-white'}`}
                  >
                    <Text className={`flex-1 font-semibold ${selected ? 'text-green-700' : 'text-gray-900'}`}>{opt}</Text>
                    {selected ? <Ionicons name="checkmark" size={18} color="#10b981" /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
                    name={isFinished ? 'checkmark-circle-outline' : isActiveish ? 'alert-circle-outline' : 'alert-circle-outline'}
                    size={22}
                    color={isFinished ? '#9ca3af' : '#22c55e'}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-gray-400 tracking-widest">SITE STATUS</Text>
                  <Text
                    className={`text-base font-semibold mt-1 ${
                      isFinished ? 'text-gray-500' : 'text-green-600'
                    }`}
                  >
                    {site.status}
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
            {isFinished ? (
              <TouchableOpacity
                disabled
                className="w-full items-center justify-center rounded-2xl px-4 py-3 bg-gray-300"
              >
                <Text className="text-base font-bold text-gray-600">Site Finished</Text>
              </TouchableOpacity>
            ) : isPending && isLeaderForThisSite ? (
              <TouchableOpacity
                onPress={() => setUpdateVisible(true)}
                className="w-full items-center justify-center rounded-2xl px-4 py-3 bg-green-500 active:scale-95"
              >
                <Text className="text-base font-bold text-white">Update Site</Text>
              </TouchableOpacity>
            ) : isPending && isUserLeaderAny ? (
              <TouchableOpacity
                disabled
                className="w-full items-center justify-center rounded-2xl px-4 py-3 bg-gray-300"
              >
                <Text className="text-base font-bold text-gray-600">Assigned to another leader</Text>
              </TouchableOpacity>
            ) : isPending ? (
              <TouchableOpacity
                onPress={handleAcceptSite}
                disabled={acceptLoading || hasAccepted || !!currentUserGroupId || isUserLeaderAny}
                className={`w-full items-center justify-center rounded-2xl px-4 py-3 ${
                  hasAccepted || !!currentUserGroupId ? 'bg-gray-300' : 'bg-green-500 active:scale-95'
                }`}
              >
                {acceptLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className={`text-base font-bold ${hasAccepted || !!currentUserGroupId ? 'text-gray-600' : 'text-white'}`}>
                    {hasAccepted || !!currentUserGroupId ? 'Joined' : 'Accept & Join'}
                  </Text>
                )}
              </TouchableOpacity>
            ) : isActive ? (
              <TouchableOpacity
                disabled
                className={`w-full items-center justify-center rounded-2xl px-4 py-3 ${
                  'bg-gray-300'
                }`}
              >
                <Text className="text-base font-bold text-gray-600">Waiting for leader assignment</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                disabled
                className="w-full items-center justify-center rounded-2xl px-4 py-3 bg-gray-300"
              >
                <Text className="text-base font-bold text-gray-600">Pending (Leader only)</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
}
