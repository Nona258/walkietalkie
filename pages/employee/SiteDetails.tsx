import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
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

export default function SiteDetails({
  site,
  onBack,
  onViewOnMap,
  onSiteUpdated,
}: SiteDetailsProps) {
  const [leaderName, setLeaderName] = useState<string | null>(null);
  const [leaderId, setLeaderId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserSiteId, setCurrentUserSiteId] = useState<string | null>(null);
  const [currentUserArchivedId, setCurrentUserArchivedId] = useState<string | null>(null);
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
      'None',
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
      case 'None':
        return 'Optional — provide details only if reporting an issue.';
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
    site && site.membersCount != null ? `${site.membersCount} Members` : 'No data';

  const isFinished = site?.status === 'Finished';
  const isActiveish = site?.status === 'Active' || site?.status === 'Pending';
  const isPending = site?.status === 'Pending';
  const isActive = site?.status === 'Active';
  const isLeaderForThisSite = !!currentUserId && !!leaderId && currentUserId === leaderId;
  const hasNoLeader = !leaderId;

  // Handler for becoming leader and joining site
  const handleBecomeLeaderAndJoin = async () => {
    if (!site?.id || !currentUserId) return;
    try {
      setAcceptLoading(true);
      // Assign current user as leader and set status to 'Pending'
      const { error: siteUpdateError } = await supabase
        .from('sites')
        .update({ leader_id: currentUserId, status: 'Pending' })
        .eq('id', site.id);
      if (siteUpdateError) throw siteUpdateError;

      // Update user's site_id
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ site_id: site.id })
        .eq('id', currentUserId);
      if (userUpdateError) throw userUpdateError;

      // Insert into group_members
      try {
        const { error: gmError } = await supabase
          .from('group_members')
          .insert([{ site_id: site.id, user_id: currentUserId }]);
        if (gmError && (gmError as any).code !== '23505') {
          console.warn('group_members insert failed:', gmError.message);
        }
      } catch (e) {
        console.warn('Skipping group_members insert:', (e as any)?.message || String(e));
      }

      // Create new chat group (assuming chat_groups table exists)
      try {
        const { error: chatError } = await supabase
          .from('chat_groups')
          .insert([
            {
              site_id: site.id,
              name: site.name + ' Chat',
              created_by: currentUserId,
              created_at: new Date().toISOString(),
            },
          ]);
        if (chatError) {
          console.warn('chat_groups insert failed:', chatError.message);
        }
      } catch (e) {
        console.warn('Skipping chat_groups insert:', (e as any)?.message || String(e));
      }

      Alert.alert('Success', 'You are now the team leader and have joined the site. A chat group has been created.');
      onSiteUpdated?.('Pending');
      onBack?.();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to become leader. Please try again.');
    } finally {
      setAcceptLoading(false);
    }
  };
  useEffect(() => {
    const loadTeamInfo = async () => {
      try {
        setLoadingGroupInfo(true);

        // Reset per-site derived state to avoid showing stale info while loading.
        setLeaderName(null);
        setLeaderId(null);
        setHasAccepted(false);

        if (!site || !site.id) {
          return;
        }

        // Get current authenticated user
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const userId = authData?.user?.id || null;
        setCurrentUserId(userId);

        // Always fetch user's site_id and archived_sitegroup_id (source of truth for "already accepted")
        let userSiteId: string | null = null;
        let userArchivedId: string | null = null;
        if (userId) {
          const { data: userRow, error: userError } = await supabase
            .from('users')
            .select('site_id, archived_sitegroup_id')
            .eq('id', userId)
            .maybeSingle();

          if (!userError) {
            if (userRow?.site_id) userSiteId = String(userRow.site_id);
            if (userRow?.archived_sitegroup_id) userArchivedId = String(userRow.archived_sitegroup_id);
          }
        }
        // Save active site id separately from archived id. Accept/join logic should only
        // consider `site_id` so archived membership doesn't block joining active sites.
        setCurrentUserSiteId(userSiteId);
        setCurrentUserArchivedId(userArchivedId);

        // Determine whether the current user is a leader of any site.
        if (userId) {
          const { data: leaderRows, error: leaderErr } = await supabase
            .from('sites')
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

        // Fetch leader for this site: use archived_sitegroup for finished sites
        const tableName = isFinished ? 'archived_sitegroup' : 'sites';
        const { data: siteRow, error: siteErr } = await supabase
          .from(tableName)
          .select('leader_id')
          .eq('id', site.id)
          .maybeSingle();
        if (siteErr) throw siteErr;

        const nextLeaderId = siteRow?.leader_id ? String(siteRow.leader_id) : null;
        setLeaderId(nextLeaderId);

        if (nextLeaderId) {
          try {
            const { data: leaderRow, error: leaderErr } = await supabase
              .from('users')
              .select('full_name')
              .eq('id', nextLeaderId)
              .maybeSingle();
            if (!leaderErr) setLeaderName((leaderRow?.full_name as string | null) || null);
          } catch {
            // ignore
          }
        }

        // Determine whether current user already joined this site.
        // For active sites: users.site_id or group_members.site_id
        // For finished sites: users.archived_sitegroup_id or group_members.archived_sitegroup_id
        if (!isFinished) {
          if (userSiteId && String(userSiteId) === String(site.id)) {
            setHasAccepted(true);
            return;
          }
        } else {
          if (userArchivedId && String(userArchivedId) === String(site.id)) {
            setHasAccepted(true);
            return;
          }
        }

        // Fallback: group_members (best-effort)
        if (userId) {
          try {
            const gmQuery = supabase.from('group_members').select('id').eq('user_id', userId).limit(1);
            if (!isFinished) {
              gmQuery.eq('site_id', site.id as any);
            } else {
              gmQuery.eq('archived_sitegroup_id', site.id as any);
            }
            const { data: memberRow, error: memberErr } = await gmQuery;
            if (!memberErr && (memberRow || []).length > 0) {
              setHasAccepted(true);
              return;
            }
          } catch {
            // ignore
          }
        }
      } catch (err: any) {
        console.warn('Failed to load team info:', err?.message || String(err));
      } finally {
        setLoadingGroupInfo(false);
      }
    };

    loadTeamInfo();
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

    const isNone = issue.toLowerCase() === 'none';

    const serialError = serial.length === 0 ? 'Starlink serial is required.' : null;

    // If 'None' is selected we are finishing the site: require evidence photos.
    // If an actual issue is selected, photos are optional for submitting the issue.
    let issueError: string | null = null;
    let descError: string | null = null;
    let evidenceError: string | null = null;

    if (isNone) {
      // Finishing: evidence required, description optional
      evidenceError = evidenceCount === 0 ? 'At least one evidence photo is required.' : null;
    } else {
      // Reporting an issue: issue + description required, photos optional
      issueError = issue.length === 0 ? 'Technical issue is required.' : null;
      descError = desc.length === 0 ? 'Issue description is required.' : null;
    }

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

    // Helper: allow finishing (archive) only when leader; require different fields
    const serial = starlinkSerial.trim();
    const issue = technicalIssue.trim();
    const desc = issueDescription.trim();
    const isNone = issue.toLowerCase() === 'none';

    setUpdateTriedSubmit(true);
    // Starlink serial is always required
    if (!serial) {
      Alert.alert('Validation', 'Please provide the Starlink serial before submitting.');
      return;
    }

    // If finishing (None selected): require at least one evidence photo.
    if (isNone && evidenceAssets.length === 0) {
      Alert.alert('Validation', 'Please attach at least one evidence photo to finish this site.');
      return;
    }

    // If reporting an issue (not None): require issue + description; photos optional
    if (!isNone && (!issue || !desc)) {
      Alert.alert('Validation', 'Please complete the technical issue and description before submitting.');
      return;
    }

    try {
      setUpdateSubmitting(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const userId = authData?.user?.id;
      if (!userId) throw new Error('Not signed in');

      // Upload evidence photos to Supabase Storage.
      const uploadedUrls: string[] = [];
      for (let i = 0; i < evidenceAssets.length; i++) {
        const asset = evidenceAssets[i];

        const manipulated = await ImageManipulator.manipulateAsync(asset.uri, [], {
          compress: 0.85,
          format: ImageManipulator.SaveFormat.JPEG,
        });

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

      // ARCHIVE: fetch, insert to archive, then delete from sites (no triggers)
      const { data: siteRow, error: fetchError } = await supabase
        .from('sites')
        .select('*')
        .eq('id', site.id)
        .maybeSingle();
      if (fetchError || !siteRow) throw fetchError || new Error('Site not found');

      const nowIso = new Date().toISOString();
      const today = nowIso.slice(0, 10);
      const archivedRow = {
        ...siteRow,
        status: 'Finished',
        updated_at: nowIso,
        date_accomplished: today,
        finished_at: nowIso,
        finished_by: userId,
        starlink_serial: serial,
        technical_issue: issue,
        issue_description: desc,
        evidence_urls: uploadedUrls,
      };

      // Insert into archive and capture the resulting id (useful if DB returns it)
      const { data: insertedArchived, error: insertError } = await supabase
        .from('archived_sitegroup')
        .insert([archivedRow])
        .select('id')
        .maybeSingle();
      if (insertError) throw insertError;

      const archivedId = (insertedArchived && insertedArchived.id) || site.id;

      // Move site messages to archived_sitegroup. IMPORTANT: do NOT set a
      // conversation_id here because the DB enforces exactly one of
      // conversation_id / site_id / archived_sitegroup_id to be non-null.
      if (site && site.id) {
        const { error: messagesUpdateError } = await supabase
          .from('messages')
          .update({
            conversation_id: null,
            site_id: null,
            archived_sitegroup_id: archivedId,
          })
          .eq('site_id', site.id);
        if (messagesUpdateError) throw messagesUpdateError;
      }

      // Update group_members: set site_id to null, archived_sitegroup_id to this id
      const { error: groupUpdateError } = await supabase
        .from('group_members')
        .update({ site_id: null, archived_sitegroup_id: archivedId })
        .eq('site_id', site.id);
      if (groupUpdateError) throw groupUpdateError;

      // Update users: set site_id to null, archived_sitegroup_id to this id
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ site_id: null, archived_sitegroup_id: archivedId })
        .eq('site_id', site.id);
      if (userUpdateError) throw userUpdateError;

      // Delete from sites
      const { error: deleteError } = await supabase
        .from('sites')
        .delete()
        .eq('id', site.id);
      if (deleteError) throw deleteError;

      Alert.alert('Success', 'Site archived and removed from active sites.');
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

  const submitIssueReport = async () => {
    if (!site?.id) return;

    if (!isLeaderForThisSite) {
      Alert.alert('Not allowed', 'Only the assigned leader can submit an issue report.');
      return;
    }

    const serial = starlinkSerial.trim();
    const issue = technicalIssue.trim();
    const desc = issueDescription.trim();

    setUpdateTriedSubmit(true);

    if (!serial || !issue || !desc) {
      Alert.alert('Validation', 'Please provide Starlink serial, technical issue and description.');
      return;
    }

    try {
      setUpdateSubmitting(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const userId = authData?.user?.id;
      if (!userId) throw new Error('Not signed in');

      // Upload evidence photos if any (optional for issue reports)
      const uploadedUrls: string[] = [];
      for (let i = 0; i < evidenceAssets.length; i++) {
        const asset = evidenceAssets[i];
        const manipulated = await ImageManipulator.manipulateAsync(asset.uri, [], {
          compress: 0.85,
          format: ImageManipulator.SaveFormat.JPEG,
        });
        const response = await fetch(manipulated.uri);
        const blob = await response.blob();
        const filePath = `${site.id}/${userId}/${Date.now()}_${i}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('site_evidence')
          .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('site_evidence').getPublicUrl(filePath);
        const publicUrl = urlData?.publicUrl;
        if (publicUrl) uploadedUrls.push(publicUrl);
      }

      // Update site record with issue info (do NOT archive)
      const updatePayload: any = {
        starlink_serial: serial,
        technical_issue: issue,
        issue_description: desc,
        updated_at: new Date().toISOString(),
      };
      if (uploadedUrls.length > 0) updatePayload.evidence_urls = uploadedUrls;

      const { error: updateErr } = await supabase.from('sites').update(updatePayload).eq('id', site.id);
      if (updateErr) throw updateErr;

      Alert.alert('Issue Submitted', 'The technical issue has been submitted to the system.');
      setUpdateVisible(false);
      resetUpdateForm();
      onSiteUpdated?.();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit issue');
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

    // If user already has a site assignment, they should not re-accept.
    try {
      const { data: userRow } = await supabase
        .from('users')
        .select('site_id')
        .eq('id', currentUserId)
        .maybeSingle();
      if (userRow?.site_id) {
        setHasAccepted(true);
        setCurrentUserSiteId(String(userRow.site_id));
        Alert.alert('Already accepted', 'This site is already assigned to you.');
        return;
      }
    } catch {
      // ignore; accept flow will try to continue
    }

    try {
      setAcceptLoading(true);

      // Accept rules:
      // - For Pending sites: joinable if it already has a leader assigned
      // - For Active sites: not joinable (no leader yet)
      if (isActive) {
        Alert.alert(
          'Not available',
          'This site is not yet open for joining. Please wait for a leader assignment.'
        );
        return;
      }

      if (!isPending) {
        Alert.alert('Not available', 'This site cannot be accepted at this time.');
        return;
      }

      // Ensure leader is assigned to this site
      const { data: siteRow, error: siteErr } = await supabase
        .from('sites')
        .select('leader_id')
        .eq('id', site.id)
        .maybeSingle();
      if (siteErr) throw siteErr;

      const existingLeaderId = siteRow?.leader_id ? String(siteRow.leader_id) : null;
      if (!existingLeaderId) {
        Alert.alert('Not available', 'This site has no leader assigned yet.');
        return;
      }

      setLeaderId(existingLeaderId);
      try {
        const { data: leaderRow } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', existingLeaderId)
          .maybeSingle();
        setLeaderName((leaderRow?.full_name as string | null) || null);
      } catch {
        // ignore
      }

      // Persist membership: link the current user to the site
      const { error: updateUserError } = await supabase
        .from('users')
        .update({ site_id: site.id })
        .eq('id', currentUserId);
      if (updateUserError) throw updateUserError;

      // Best-effort: insert membership row (if your DB has group_members)
      try {
        const { error: gmError } = await supabase
          .from('group_members')
          .insert([{ site_id: site.id, user_id: currentUserId }]);

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

  const isNoneSelected = (technicalIssue || '').trim().toLowerCase() === 'none';

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
        }}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl border-t border-gray-200 bg-white">
            <View className="flex-row items-center justify-between border-b border-gray-100 px-6 pb-4 pt-5">
              <View>
                <Text className="text-lg font-extrabold text-gray-900">Update Site</Text>
                <Text className="mt-1 text-xs text-gray-500">
                  Fill the required details to finish this site.
                </Text>
              </View>
              <TouchableOpacity
                disabled={updateSubmitting}
                className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100"
                onPress={() => {
                  setUpdateVisible(false);
                }}>
                <Ionicons name="close" size={18} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-6 pt-5" showsVerticalScrollIndicator={false} bounces={false}>
              <View className="mb-5">
                <Text className="text-xs font-semibold text-gray-700">Starlink Serial</Text>
                <Text className="mt-1 text-[11px] text-gray-500">Required</Text>
                <TextInput
                  value={starlinkSerial}
                  onChangeText={setStarlinkSerial}
                  placeholder="Enter starlink serial"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 font-semibold text-gray-900"
                />
                {!!updateTriedSubmit && !!validation.serialError && (
                  <Text className="mt-2 text-xs text-red-600">{validation.serialError}</Text>
                )}
              </View>

              <View className="mb-5">
                <Text className="text-xs font-semibold text-gray-700">Technical Issue</Text>
                <Text className="mt-1 text-[11px] text-gray-500">{isNoneSelected ? 'Optional' : 'Required'}</Text>
                <TouchableOpacity
                  disabled={updateSubmitting}
                  onPress={() => setTechnicalIssuePickerVisible(true)}
                  className="mt-2 flex-row items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <Text
                    className={`flex-1 font-semibold ${technicalIssue ? 'text-gray-900' : 'text-gray-400'}`}>
                    {technicalIssue || 'Select technical issue'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#6b7280" />
                </TouchableOpacity>
                {!!updateTriedSubmit && !!validation.issueError && (
                  <Text className="mt-2 text-xs text-red-600">{validation.issueError}</Text>
                )}
              </View>

              <View className="mb-5">
                <Text className="text-xs font-semibold text-gray-700">Issue Description</Text>
                <Text className="mt-1 text-[11px] text-gray-500">{isNoneSelected ? 'Optional' : 'Required'}</Text>
                <TextInput
                  value={issueDescription}
                  onChangeText={setIssueDescription}
                  placeholder={issueDescriptionPlaceholder}
                  placeholderTextColor="#9ca3af"
                  multiline
                  className="mt-2 min-h-[110px] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 font-semibold text-gray-900"
                />
                {!!updateTriedSubmit && !!validation.descError && (
                  <Text className="mt-2 text-xs text-red-600">{validation.descError}</Text>
                )}
              </View>

              <View className="mb-6">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-xs font-semibold text-gray-700">Evidence Photos</Text>
                    <Text className="mt-1 text-[11px] text-gray-500">
                      {isNoneSelected ? 'Required' : 'Optional'} • {evidenceAssets.length} selected
                    </Text>
                  </View>
                  <TouchableOpacity
                    disabled={updateSubmitting}
                    onPress={pickEvidencePhotos}
                    className="rounded-2xl border border-green-200 bg-green-50 px-3 py-2">
                    <Text className="text-xs font-semibold text-green-700">Add Photos</Text>
                  </TouchableOpacity>
                </View>

                {evidenceAssets.length > 0 ? (
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {evidenceAssets.map((asset) => (
                      <View key={asset.uri} className="relative">
                        <Image
                          source={{ uri: asset.uri }}
                          className="h-20 w-20 rounded-2xl border border-gray-200"
                        />
                        <TouchableOpacity
                          disabled={updateSubmitting}
                          onPress={() =>
                            setEvidenceAssets((prev) => prev.filter((a) => a.uri !== asset.uri))
                          }
                          className="absolute -right-2 -top-2 h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white">
                          <Ionicons name="close" size={14} color="#111827" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className="mt-2 text-xs text-gray-500">No photos selected</Text>
                )}

                {!!updateTriedSubmit && !!validation.evidenceError && (
                  <Text className="mt-2 text-xs text-red-600">{validation.evidenceError}</Text>
                )}
              </View>
            </ScrollView>

            <View className="px-6 pb-6">
              <TouchableOpacity
                disabled={updateSubmitting || !validation.isValid}
                onPress={isNoneSelected ? uploadEvidenceAndFinish : submitIssueReport}
                className={`w-full items-center justify-center rounded-2xl px-4 py-3 ${
                  updateSubmitting || !validation.isValid
                    ? 'bg-gray-300'
                    : 'bg-green-500 active:scale-95'
                }`}>
                {updateSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text
                    className={`text-base font-bold ${updateSubmitting || !validation.isValid ? 'text-gray-600' : 'text-white'}`}>
                    {isNoneSelected ? 'Submit & Finish' : 'Submit Issue'}
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
        onRequestClose={() => setTechnicalIssuePickerVisible(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 p-6">
          <View className="w-full overflow-hidden rounded-3xl border border-gray-200 bg-white">
            <View className="flex-row items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
              <Text className="text-base font-extrabold text-gray-900">Select Technical Issue</Text>
              <TouchableOpacity
                className="h-9 w-9 items-center justify-center rounded-2xl bg-gray-100"
                onPress={() => setTechnicalIssuePickerVisible(false)}>
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
                    className={`flex-row items-center border-b border-gray-100 px-5 py-4 ${selected ? 'bg-green-50' : 'bg-white'}`}>
                    <Text
                      className={`flex-1 font-semibold ${selected ? 'text-green-700' : 'text-gray-900'}`}>
                      {opt}
                    </Text>
                    {selected ? <Ionicons name="checkmark" size={18} color="#10b981" /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {!site ? (
        <View className="flex-1 items-center justify-center bg-white">
          <TouchableOpacity
            onPress={onBack}
            className="mb-4 rounded-full border border-green-100 bg-green-50 px-4 py-2">
            <Text className="font-semibold text-green-600">Back to Sites</Text>
          </TouchableOpacity>
          <Text className="font-semibold text-gray-500">No site selected</Text>
        </View>
      ) : (
        <>
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* Top hero section with live map */}
            <View className="overflow-hidden rounded-b-3xl border-b border-green-100 bg-green-50">
              <View className="h-64 w-full">
                <SiteLocationMap
                  latitude={site.latitude}
                  longitude={site.longitude}
                  siteName={site.name}
                  showBackButton
                  onBack={onBack}
                />
              </View>
              <View className="absolute left-6 right-6 top-12 flex-row items-center justify-between">
                <Text className="rounded-full bg-white bg-opacity-80 px-3 py-1 text-base font-semibold text-gray-900">
                  Site Information
                </Text>
                <View className="w-10" />
              </View>
              <TouchableOpacity
                onPress={onViewOnMap}
                className="absolute bottom-6 right-6 rounded-full border border-green-100 bg-white px-4 py-1.5 shadow-sm">
                <Text className="text-xs font-semibold tracking-widest text-green-600">
                  VIEW ON MAP
                </Text>
              </TouchableOpacity>
            </View>

            {/* Site basic info */}
            <View className="px-6 pt-6">
              {!!onBack && (
                <TouchableOpacity
                  onPress={onBack}
                  className="mb-4 self-start rounded-full border border-green-100 bg-green-50 px-4 py-2">
                  <Text className="font-semibold text-green-600">Back to Sites</Text>
                </TouchableOpacity>
              )}
              <Text className="text-2xl font-extrabold text-gray-900">{site.name}</Text>
              {site.companyName && (
                <Text className="mt-1 text-base text-gray-500">{site.companyName}</Text>
              )}
            </View>

            {/* Detail cards */}
            <View className="px-6 pb-24 pt-6">
              {/* Branch card */}
              <View className="mb-4 flex-row items-center rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                <View className="mr-4 h-10 w-10 items-center justify-center rounded-2xl bg-green-50">
                  <Ionicons name="git-branch-outline" size={22} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold tracking-widest text-gray-400">
                    MAIN BRANCH
                  </Text>
                  <Text className="mt-1 text-base font-semibold text-gray-900">
                    {site.branchName || 'N/A'}
                  </Text>
                </View>
              </View>

              {/* Workforce card */}
              <View className="mb-4 flex-row items-center rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                <View className="mr-4 h-10 w-10 items-center justify-center rounded-2xl bg-green-50">
                  <Ionicons name="people-outline" size={22} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold tracking-widest text-gray-400">
                    SITE WORKFORCE
                  </Text>
                  <Text className="mt-1 text-base font-semibold text-gray-900">
                    {workforceLabel}
                  </Text>
                </View>
              </View>

              {/* Leader card */}
              <View className="mb-4 flex-row items-center rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                <View className="mr-4 h-10 w-10 items-center justify-center rounded-2xl bg-green-50">
                  <Ionicons name="person-circle-outline" size={22} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold tracking-widest text-gray-400">
                    TEAM LEADER
                  </Text>
                  {loadingGroupInfo ? (
                    <View className="mt-1 flex-row items-center">
                      <ActivityIndicator size="small" color="#10b981" />
                      <Text className="ml-2 text-xs text-gray-500">Loading leader...</Text>
                    </View>
                  ) : (
                    <Text className="mt-1 text-base font-semibold text-gray-900">
                      {leaderName || 'No leader assigned'}
                    </Text>
                  )}
                </View>
              </View>

              {/* Status card */}
              <View className="mb-4 flex-row items-center rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                <View className="mr-4 h-10 w-10 items-center justify-center rounded-2xl bg-green-50">
                  <Ionicons
                    name={
                      isFinished
                        ? 'checkmark-circle-outline'
                        : isActiveish
                          ? 'alert-circle-outline'
                          : 'alert-circle-outline'
                    }
                    size={22}
                    color={isFinished ? '#9ca3af' : '#22c55e'}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold tracking-widest text-gray-400">
                    SITE STATUS
                  </Text>
                  <Text
                    className={`mt-1 text-base font-semibold ${
                      isFinished ? 'text-gray-500' : 'text-green-600'
                    }`}>
                    {site.status}
                  </Text>
                </View>
              </View>

              {/* Coordinates card */}
              <View className="flex-row items-center rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                <View className="mr-4 h-10 w-10 items-center justify-center rounded-2xl bg-green-50">
                  <Ionicons name="location-outline" size={22} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold tracking-widest text-gray-400">
                    COORDINATES
                  </Text>
                  <Text className="mt-1 text-base font-semibold text-gray-900">
                    {coordinateText}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Accept/Become Leader button fixed at bottom */}
          <View className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-6 py-4">
            {isFinished ? (
              <TouchableOpacity
                disabled
                className="w-full items-center justify-center rounded-2xl bg-gray-300 px-4 py-3">
                <Text className="text-base font-bold text-gray-600">Site Finished</Text>
              </TouchableOpacity>
            ) : isActive && hasNoLeader ? (
              <TouchableOpacity
                onPress={handleBecomeLeaderAndJoin}
                disabled={acceptLoading}
                className={`w-full items-center justify-center rounded-2xl px-4 py-3 ${acceptLoading ? 'bg-gray-300' : 'bg-green-500 active:scale-95'}`}
              >
                {acceptLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-base font-bold text-white">Become Team Leader & Join Site</Text>
                )}
              </TouchableOpacity>
            ) : isPending && isLeaderForThisSite ? (
              <TouchableOpacity
                onPress={() => setUpdateVisible(true)}
                className="w-full items-center justify-center rounded-2xl bg-green-500 px-4 py-3 active:scale-95">
                <Text className="text-base font-bold text-white">Update Site</Text>
              </TouchableOpacity>
            ) : isPending && isUserLeaderAny ? (
              <TouchableOpacity
                disabled
                className="w-full items-center justify-center rounded-2xl bg-gray-300 px-4 py-3">
                <Text className="text-base font-bold text-gray-600">
                  Assigned to another leader
                </Text>
              </TouchableOpacity>
            ) : isPending ? (
              <TouchableOpacity
                onPress={handleAcceptSite}
                disabled={acceptLoading || hasAccepted || !!currentUserSiteId || isUserLeaderAny}
                className={`w-full items-center justify-center rounded-2xl px-4 py-3 ${
                  hasAccepted || !!currentUserSiteId
                    ? 'bg-gray-300'
                    : 'bg-green-500 active:scale-95'
                }`}>
                {acceptLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text
                    className={`text-base font-bold ${hasAccepted || !!currentUserSiteId ? 'text-gray-600' : 'text-white'}`}>
                    {hasAccepted || !!currentUserSiteId ? 'Joined' : 'Accept & Join'}
                  </Text>
                )}
              </TouchableOpacity>
            ) : isActive ? (
              <TouchableOpacity
                disabled
                className={`w-full items-center justify-center rounded-2xl px-4 py-3 ${'bg-gray-300'}`}>
                <Text className="text-base font-bold text-gray-600">
                  Waiting for leader assignment
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                disabled
                className="w-full items-center justify-center rounded-2xl bg-gray-300 px-4 py-3">
                <Text className="text-base font-bold text-gray-600">Pending (Leader only)</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
}