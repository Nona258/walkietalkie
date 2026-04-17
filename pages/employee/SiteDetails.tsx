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
import {
  joinSiteWithSlotManagement,
  checkAndMarkSiteAsFull,
  getSiteMemberInfo,
  getSiteMembers,
} from '../../utils/siteMemberSlots';
import { notifyLeaderSiteAccepted } from '../../utils/notifications';
import type { Site } from './Sites';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

interface SiteDetailsProps {
  site: Site | null | undefined;
  onBack?: () => void;
  onViewOnMap?: () => void;
  onSiteUpdated?: (nextTab?: 'Pending' | 'Finished') => void;
  onSiteMapPress?: (site: Site) => void;
}

// ------------------------------------------------------------
// Custom SweetAlert component (centered modal)
// ------------------------------------------------------------
interface SweetAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

const SweetAlert: React.FC<SweetAlertProps> = ({
  visible,
  title,
  message,
  type = 'success',
  onClose,
}) => {
  const iconColor = type === 'success' ? '#237227' : type === 'error' ? '#ef4444' : '#3b82f6';
  const iconName =
    type === 'success' ? 'checkmark-circle' : type === 'error' ? 'alert-circle' : 'information-circle';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="items-center justify-center flex-1 bg-black/50">
        <View className="w-4/5 max-w-sm p-6 bg-white shadow-2xl rounded-3xl">
            <View className="items-center">
            <View className="items-center justify-center mb-3 rounded-full h-14 w-14" style={{ backgroundColor: '#237227' }}>
              <Ionicons name={iconName} size={32} color="#f8fafb" />
            </View>
            <Text className="mb-2 text-xl font-bold text-center text-gray-900">{title}</Text>
            <Text className="mb-6 text-sm text-center text-gray-600">{message}</Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-full py-3 bg-[#237227] rounded-full active:scale-95">
              <Text className="font-bold text-center text-white">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Helper: count how many active sites the user has accepted (accepted_sites with site_id not null)
async function getAcceptedSitesCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('accepted_sites')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('site_id', 'is', null);
  if (error) {
    console.error('Error counting accepted sites:', error);
    return 0;
  }
  return count || 0;
}

// ------------------------------------------------------------
// Main SiteDetails component
// ------------------------------------------------------------
export default function SiteDetails({
  site,
  onBack,
  onViewOnMap,
  onSiteUpdated,
  onSiteMapPress,
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

  // Member slot management
  const [memberInfo, setMemberInfo] = useState<{
    maxMembers: number | null;
    currentMembers: number;
    availableSlots: number | null;
    isFull: boolean;
  } | null>(null);
  const [loadingMemberInfo, setLoadingMemberInfo] = useState(false);

  // Site members list
  const [siteMembers, setSiteMembers] = useState<
    Array<{
      id: string;
      fullName: string;
      email: string;
      phoneNumber: string | null;
      profilePictureUrl: string | null;
      role: string;
      joinedAt: string | null;
    }>
  >([]);
  const [loadingSiteMembers, setLoadingSiteMembers] = useState(false);

  // Update modal state
  const [updateVisible, setUpdateVisible] = useState(false);
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateTriedSubmit, setUpdateTriedSubmit] = useState(false);
  const [starlinkSerial, setStarlinkSerial] = useState('');
  const [technicalIssue, setTechnicalIssue] = useState<string>('');
  const [technicalIssuePickerVisible, setTechnicalIssuePickerVisible] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');
  const [evidenceAssets, setEvidenceAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);

  // SweetAlert state
  const [sweetAlert, setSweetAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'success' as 'success' | 'error' | 'info',
  });

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

  // Helper to check if site has valid coordinates
  const hasValidCoordinates = site?.latitude != null && site?.longitude != null;

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

      // Also record acceptance in accepted_sites so both sources stay in sync.
      try {
        const { error: accError } = await supabase
          .from('accepted_sites')
          .insert([{ user_id: currentUserId, site_id: site.id, archived_sitegroup_id: null }]);
        if (accError && (accError as any).code !== '23505') {
          console.warn('accepted_sites insert failed:', accError.message);
        }
      } catch (e) {
        console.warn('Skipping accepted_sites insert:', (e as any)?.message || String(e));
      }

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

      setSweetAlert({
        visible: true,
        title: 'Success',
        message: 'You are now the team leader and have joined the site. A chat group has been created.',
        type: 'success',
      });
      onSiteUpdated?.('Pending');
      onBack?.();
    } catch (err: any) {
      setSweetAlert({
        visible: true,
        title: 'Error',
        message: err?.message || 'Failed to become leader. Please try again.',
        type: 'error',
      });
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

        // 4) Check accepted_sites (for active sites only)
        if (userId && !isFinished) {
          try {
            const { data: acceptedRow, error: acceptErr } = await supabase
              .from('accepted_sites')
              .select('id')
              .eq('user_id', userId)
              .eq('site_id', site.id)
              .maybeSingle();
            if (!acceptErr && acceptedRow) {
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

  // Load member info for slot management
  useEffect(() => {
    const loadMemberInfo = async () => {
      if (!site?.id) {
        setMemberInfo(null);
        return;
      }

      setLoadingMemberInfo(true);
      try {
        const info = await getSiteMemberInfo(site.id);
        setMemberInfo(info);
      } catch (err) {
        console.error('Failed to load member info:', err);
        setMemberInfo(null);
      } finally {
        setLoadingMemberInfo(false);
      }
    };

    loadMemberInfo();
  }, [site?.id]);

  // Load site members list
  useEffect(() => {
    const loadMembers = async () => {
      if (!site?.id) {
        setSiteMembers([]);
        return;
      }

      setLoadingSiteMembers(true);
      try {
        const members = await getSiteMembers(site.id);
        setSiteMembers(members);
      } catch (err) {
        console.error('Failed to load site members:', err);
        setSiteMembers([]);
      } finally {
        setLoadingSiteMembers(false);
      }
    };

    loadMembers();
  }, [site?.id]);

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

  // Clear issue description when "None" is selected (field will be hidden)
  useEffect(() => {
    if ((technicalIssue || '').trim().toLowerCase() === 'none') {
      setIssueDescription('');
    }
  }, [technicalIssue]);

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
      setSweetAlert({
        visible: true,
        title: 'Not allowed',
        message: 'Only the assigned leader can update and finish this site.',
        type: 'error',
      });
      return;
    }

    const serial = starlinkSerial.trim();
    const issue = technicalIssue.trim();
    const isNone = issue.toLowerCase() === 'none';

    setUpdateTriedSubmit(true);
    if (!serial) {
      setSweetAlert({
        visible: true,
        title: 'Validation',
        message: 'Please provide the Starlink serial before submitting.',
        type: 'error',
      });
      return;
    }

    if (isNone && evidenceAssets.length === 0) {
      setSweetAlert({
        visible: true,
        title: 'Validation',
        message: 'Please attach at least one evidence photo to finish this site.',
        type: 'error',
      });
      return;
    }

    if (!isNone && (!issue || !issueDescription.trim())) {
      setSweetAlert({
        visible: true,
        title: 'Validation',
        message: 'Please complete the technical issue and description before submitting.',
        type: 'error',
      });
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
      const archivedRow = {
        ...siteRow,
        status: 'Finished',
        updated_at: nowIso,
        finished_at: nowIso,
        finished_by: userId,
        starlink_serial: serial,
        technical_issue: issue,
        issue_description: issueDescription.trim(),
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
      const { error: deleteError } = await supabase.from('sites').delete().eq('id', site.id);
      if (deleteError) throw deleteError;

      setSweetAlert({
        visible: true,
        title: 'Site Finished',
        message: 'The site has been successfully archived and removed from active sites.',
        type: 'success',
      });
      setUpdateVisible(false);
      resetUpdateForm();
      onSiteUpdated?.('Finished');
      onBack?.();
    } catch (err: any) {
      setSweetAlert({
        visible: true,
        title: 'Error',
        message: err?.message || 'Failed to update site',
        type: 'error',
      });
    } finally {
      setUpdateSubmitting(false);
    }
  };

  const submitIssueReport = async () => {
    if (!site?.id) return;

    if (!isLeaderForThisSite) {
      setSweetAlert({
        visible: true,
        title: 'Not allowed',
        message: 'Only the assigned leader can submit an issue report.',
        type: 'error',
      });
      return;
    }

    const serial = starlinkSerial.trim();
    const issue = technicalIssue.trim();
    const desc = issueDescription.trim();

    setUpdateTriedSubmit(true);

    if (!serial || !issue || !desc) {
      setSweetAlert({
        visible: true,
        title: 'Validation',
        message: 'Please provide Starlink serial, technical issue and description.',
        type: 'error',
      });
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

      setSweetAlert({
        visible: true,
        title: 'Issue Submitted',
        message: 'The technical issue has been submitted to the system.',
        type: 'success',
      });
      setUpdateVisible(false);
      resetUpdateForm();
      onSiteUpdated?.();
    } catch (err: any) {
      setSweetAlert({
        visible: true,
        title: 'Error',
        message: err?.message || 'Failed to submit issue',
        type: 'error',
      });
    } finally {
      setUpdateSubmitting(false);
    }
  };

  const handleAcceptSite = async () => {
    if (!site?.id) return;

    if (site?.status === 'Finished') {
      setSweetAlert({
        visible: true,
        title: 'Not available',
        message: 'This site is already finished.',
        type: 'error',
      });
      return;
    }

    if (!currentUserId) {
      setSweetAlert({
        visible: true,
        title: 'Not signed in',
        message: 'You need to be signed in to accept a site.',
        type: 'error',
      });
      return;
    }

    // Leaders (already assigned as a group leader) should only update their pending site.
    if (isUserLeaderAny) {
      setSweetAlert({
        visible: true,
        title: 'Not allowed',
        message: 'Leaders cannot accept new sites.',
        type: 'error',
      });
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
        setSweetAlert({
          visible: true,
          title: 'Already accepted',
          message: 'This site is already assigned to you.',
          type: 'info',
        });
        return;
      }
    } catch {
      // ignore; accept flow will try to continue
    }

    // Check accepted_sites first to avoid double-accept and enforce limits
    try {
      const { data: alreadyAccepted, error: checkError } = await supabase
        .from('accepted_sites')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('site_id', site.id)
        .maybeSingle();

      if (alreadyAccepted) {
        setSweetAlert({
          visible: true,
          title: 'Already accepted',
          message: 'You have already joined this site.',
          type: 'info',
        });
        return;
      }

      // Enforce maximum of 5 accepted active sites
      const acceptedCount = await getAcceptedSitesCount(currentUserId);
      if (acceptedCount >= 5) {
        setSweetAlert({
          visible: true,
          title: 'Limit reached',
          message: 'You can accept at most 5 sites. Please leave another site before accepting a new one.',
          type: 'error',
        });
        return;
      }
    } catch (e) {
      // ignore and let the flow continue; we'll still attempt accept
    }

    try {
      setAcceptLoading(true);

      // Accept rules:
      // - For Pending sites: joinable if it already has a leader assigned
      // - For Active sites: not joinable (no leader yet)
      if (isActive) {
        setSweetAlert({
          visible: true,
          title: 'Not available',
          message: 'This site is not yet open for joining. Please wait for a leader assignment.',
          type: 'error',
        });
        return;
      }

      if (!isPending) {
        setSweetAlert({
          visible: true,
          title: 'Not available',
          message: 'This site cannot be accepted at this time.',
          type: 'error',
        });
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
        setSweetAlert({
          visible: true,
          title: 'Not available',
          message: 'This site has no leader assigned yet.',
          type: 'error',
        });
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

      // CHECK FOR AVAILABLE SLOTS before accepting
      const slotCheckResult = await joinSiteWithSlotManagement(site.id, currentUserId);
      if (!slotCheckResult.success) {
        setSweetAlert({
          visible: true,
          title: 'Cannot Join',
          message: slotCheckResult.message,
          type: 'error',
        });
        // Refresh member info to show site is full
        const updatedInfo = await getSiteMemberInfo(site.id);
        setMemberInfo(updatedInfo);
        return;
      }

      // Record acceptance in accepted_sites table
      const { error: acceptError } = await supabase
        .from('accepted_sites')
        .insert([{ user_id: currentUserId, site_id: site.id, archived_sitegroup_id: null }]);
      if (acceptError) {
        console.error('Failed to record acceptance:', acceptError);
        setSweetAlert({
          visible: true,
          title: 'Error',
          message: 'Failed to accept site. Please try again.',
          type: 'error',
        });
        return;
      }

      // Keep users.site_id in sync with accepted_sites (best-effort).
      try {
        const { error: userAssignErr } = await supabase
          .from('users')
          .update({ site_id: site.id })
          .eq('id', currentUserId);
        if (userAssignErr) {
          console.warn('Failed to update users.site_id:', userAssignErr.message);
        } else {
          setCurrentUserSiteId(site.id);
        }
      } catch (e) {
        console.warn('Skipping users.site_id update:', (e as any)?.message || String(e));
      }

      // Best-effort: notify the site leader that someone accepted/joined.
      try {
        await notifyLeaderSiteAccepted({
          leaderId: existingLeaderId,
          siteName: site?.name || 'Unnamed site',
          acceptedByUserId: currentUserId,
        });
      } catch (e) {
        console.warn('notifyLeaderSiteAccepted failed:', (e as any)?.message || String(e));
      }

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

      // Check if site is now full and mark as Pending if needed
      const siteNowFull = await checkAndMarkSiteAsFull(site.id);
      if (siteNowFull) {
        console.log('Site is now full - status updated to Pending');
      }

      setHasAccepted(true);
      const successMessage = slotCheckResult.siteIsFull
        ? 'Site accepted. This site is now full!'
        : slotCheckResult.message;
      setSweetAlert({
        visible: true,
        title: 'Site accepted',
        message: successMessage,
        type: 'success',
      });
      onSiteUpdated?.('Pending');
      onBack?.();
    } catch (err: any) {
      setSweetAlert({
        visible: true,
        title: 'Error',
        message: err?.message || 'Failed to accept site. Please try again.',
        type: 'error',
      });
    } finally {
      setAcceptLoading(false);
    }
  };

  const isNoneSelected = (technicalIssue || '').trim().toLowerCase() === 'none';

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* SweetAlert Modal */}
      <SweetAlert
        visible={sweetAlert.visible}
        title={sweetAlert.title}
        message={sweetAlert.message}
        type={sweetAlert.type}
        onClose={() => setSweetAlert((prev) => ({ ...prev, visible: false }))}
      />

      {/* Update Modal (same as before, already modern) */}
      <Modal
        visible={updateVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (updateSubmitting) return;
          setUpdateVisible(false);
        }}>
        <View className="items-center justify-center flex-1 p-4 bg-black/50">
          <View className="w-full max-w-md bg-white shadow-2xl rounded-3xl">
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-5 border-b border-gray-100">
              <View>
                <Text className="text-2xl font-extrabold text-gray-900">Update Site</Text>
                <Text className="mt-1 text-sm text-gray-500">
                  Fill the required details to finish this site.
                </Text>
              </View>
              <TouchableOpacity
                disabled={updateSubmitting}
                className="items-center justify-center bg-gray-100 rounded-full h-9 w-9"
                onPress={() => setUpdateVisible(false)}>
                <Ionicons name="close" size={18} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView
              className="max-h-[70vh] px-5 py-2"
              showsVerticalScrollIndicator={false}
              bounces={false}>
              {/* Starlink Serial */}
              <View className="mb-5">
                <Text className="text-sm font-semibold text-gray-700">Starlink Serial</Text>
                <Text className="mt-0.5 text-xs text-gray-500">Required</Text>
                <TextInput
                  value={starlinkSerial}
                  onChangeText={setStarlinkSerial}
                  placeholder="Enter starlink serial"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  className="px-4 py-3 mt-2 font-medium text-gray-900 border border-gray-200 rounded-xl bg-gray-50"
                />
                {!!updateTriedSubmit && !!validation.serialError && (
                  <Text className="mt-1 text-xs text-red-600">{validation.serialError}</Text>
                )}
              </View>

              {/* Technical Issue */}
              <View className="mb-5">
                <Text className="text-sm font-semibold text-gray-700">Technical Issue</Text>
                <Text className="mt-0.5 text-xs text-gray-500">
                  {isNoneSelected ? 'Optional' : 'Required'}
                </Text>
                <TouchableOpacity
                  disabled={updateSubmitting}
                  onPress={() => setTechnicalIssuePickerVisible(true)}
                  className="flex-row items-center justify-between px-4 py-3 mt-2 border border-gray-200 rounded-xl bg-gray-50">
                  <Text
                    className={`flex-1 font-medium ${
                      technicalIssue ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                    {technicalIssue || 'Select technical issue'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </TouchableOpacity>
                {!!updateTriedSubmit && !!validation.issueError && (
                  <Text className="mt-1 text-xs text-red-600">{validation.issueError}</Text>
                )}
              </View>

              {/* Issue Description (hidden when "None" selected) */}
              {!isNoneSelected && (
                <View className="mb-5">
                  <Text className="text-sm font-semibold text-gray-700">Issue Description</Text>
                  <Text className="mt-0.5 text-xs text-gray-500">Required</Text>
                  <TextInput
                    value={issueDescription}
                    onChangeText={setIssueDescription}
                    placeholder={issueDescriptionPlaceholder}
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={4}
                    className="px-4 py-3 mt-2 font-medium text-gray-900 border border-gray-200 rounded-xl bg-gray-50"
                    style={{ textAlignVertical: 'top', minHeight: 100 }}
                  />
                  {!!updateTriedSubmit && !!validation.descError && (
                    <Text className="mt-1 text-xs text-red-600">{validation.descError}</Text>
                  )}
                </View>
              )}

              {/* Evidence Photos - Simplified & Modern */}
              <View className="mb-5">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-sm font-semibold text-gray-700">Evidence Photos</Text>
                    <Text className="mt-0.5 text-xs text-gray-500">
                      {isNoneSelected ? 'Required' : 'Optional'} • {evidenceAssets.length} selected
                    </Text>
                  </View>
                  <TouchableOpacity
                    disabled={updateSubmitting}
                    onPress={pickEvidencePhotos}
                    className="px-4 py-2 border border-[#237227] rounded-full bg-[#f8f4fb] active:scale-95">
                    <Text className="text-sm font-medium text-[#237227]">Add Photos</Text>
                  </TouchableOpacity>
                </View>

                {evidenceAssets.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2 mt-3">
                    {evidenceAssets.map((asset, idx) => (
                      <View key={asset.uri + idx} className="relative">
                        <Image
                          source={{ uri: asset.uri }}
                          className="w-20 h-20 border border-gray-200 rounded-xl bg-gray-50"
                        />
                        <TouchableOpacity
                          disabled={updateSubmitting}
                          onPress={() =>
                            setEvidenceAssets((prev) => prev.filter((a) => a.uri !== asset.uri))
                          }
                          className="absolute items-center justify-center w-6 h-6 bg-white border border-gray-200 rounded-full shadow-sm -right-2 -top-2">
                          <Ionicons name="close" size={12} color="#111827" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className="flex-row items-center justify-center py-6 mt-3 border border-gray-300 border-dashed rounded-xl bg-gray-50">
                    <Ionicons name="images-outline" size={20} color="#9ca3af" />
                    <Text className="ml-2 text-xs text-gray-500">No photos selected</Text>
                  </View>
                )}

                {!!updateTriedSubmit && !!validation.evidenceError && (
                  <Text className="mt-2 text-xs text-red-600">{validation.evidenceError}</Text>
                )}
              </View>
            </ScrollView>

            {/* Footer with Submit Button */}
            <View className="px-5 pt-4 pb-6 border-t border-gray-100">
              <TouchableOpacity
                disabled={updateSubmitting || !validation.isValid}
                onPress={isNoneSelected ? uploadEvidenceAndFinish : submitIssueReport}
                className={`w-full items-center justify-center rounded-xl px-4 py-3 ${
                  updateSubmitting || !validation.isValid
                    ? 'bg-gray-300'
                    : 'bg-green-500 active:scale-95'
                }`}>
                {updateSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text
                    className={`text-base font-bold ${
                      updateSubmitting || !validation.isValid ? 'text-gray-600' : 'text-white'
                    }`}>
                    {isNoneSelected ? 'Submit & Finish' : 'Submit Issue'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Technical Issue Picker Modal */}
      <Modal
        visible={technicalIssuePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTechnicalIssuePickerVisible(false)}>
        <View className="items-center justify-center flex-1 p-6 bg-black/40">
          <View className="w-full max-w-sm overflow-hidden bg-white border border-gray-200 rounded-3xl">
            <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
              <Text className="text-base font-extrabold text-gray-900">Select Technical Issue</Text>
              <TouchableOpacity
                className="items-center justify-center bg-gray-100 h-9 w-9 rounded-2xl"
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
                    className={`flex-row items-center border-b border-gray-100 px-5 py-4 ${
                      selected ? 'bg-green-50' : 'bg-white'
                    }`}>
                    <Text
                      className={`flex-1 font-semibold ${
                        selected ? 'text-green-700' : 'text-gray-900'
                      }`}>
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

      {/* Main content */}
      {!site ? (
        <View className="items-center justify-center flex-1 bg-white">
          <TouchableOpacity
            onPress={onBack}
            className="px-4 py-2 mb-4 border border-green-100 rounded-full bg-green-50">
            <Text className="font-semibold text-[#237227]">Back to Sites</Text>
          </TouchableOpacity>
          <Text className="font-semibold text-gray-500">No site selected</Text>
        </View>
      ) : (
        <>
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* Map section with placeholder if coordinates missing */}
            {hasValidCoordinates ? (
              <View className="relative w-full h-64">
                <SiteLocationMap
                  latitude={site.latitude}
                  longitude={site.longitude}
                  siteName={site.name}
                  showBackButton
                  onBack={onBack}
                />
              </View>
            ) : (
                <View className="items-center justify-center w-full h-64 bg-gray-100">
                  <View className="items-center justify-center w-20 h-20 mb-3 rounded-full" style={{ backgroundColor: '#237227' }}>
                    <Ionicons name="location-outline" size={32} color="#f8fafb" />
                  </View>
                  <Text className="mt-2 text-sm text-gray-500">Location not available</Text>
                  <Text className="text-xs text-gray-400">No coordinates provided for this site</Text>
                </View>
            )}

            {/* Site name and company */}
            <View className="px-6 pt-6">
              <Text className="text-2xl font-bold text-gray-900">{site.name}</Text>
              {site.companyName && (
                <Text className="mt-1 text-sm text-gray-500">{site.companyName}</Text>
              )}
            </View>

            {/* Unified info card */}
            <View className="mx-6 mt-6 bg-white border border-gray-100 rounded-xl">
              {/* Branch */}
              <View className="flex-row items-center p-4 border-b border-gray-100">
                <Ionicons name="business-outline" size={20} color="#237227" />
                <View className="flex-1 ml-3">
                  <Text className="text-xs text-gray-500">Branch</Text>
                  <Text className="text-base font-medium text-gray-900">
                    {site.branchName || 'Not specified'}
                  </Text>
                </View>
              </View>

              {/* Workforce */}
              <View className="flex-row items-center p-4 border-b border-gray-100">
                <Ionicons name="people-outline" size={20} color="#237227" />
                <View className="flex-1 ml-3">
                  <Text className="text-xs text-gray-500">Workforce</Text>
                  <Text className="text-base font-medium text-gray-900">
                    {workforceLabel}
                  </Text>
                </View>
              </View>

              {/* Member Slots */}
              {memberInfo && (
                <View className={`flex-row items-center border-b border-gray-100 p-4 ${memberInfo.isFull ? 'bg-red-50' : 'bg-[#e8f5e9]'}`}>
                  <Ionicons
                    name={memberInfo.isFull ? 'close-circle-outline' : 'checkmark-circle-outline'}
                    size={20}
                    color={memberInfo.isFull ? '#dc2626' : '#237227'}
                  />
                  <View className="flex-1 ml-3">
                    <Text className="text-xs text-gray-500">Member Slots</Text>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-base font-medium text-gray-900">
                        {memberInfo.maxMembers !== null
                          ? `${memberInfo.currentMembers} / ${memberInfo.maxMembers}`
                          : 'No limit'}
                      </Text>
                      {memberInfo.maxMembers !== null && (
                        <Text className={`text-xs font-semibold ${memberInfo.isFull ? 'text-red-600' : 'text-[#237227]'}`}>
                          {memberInfo.isFull
                            ? 'FULL'
                            : `${memberInfo.availableSlots} slot${memberInfo.availableSlots !== 1 ? 's' : ''} left`}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {loadingMemberInfo && !memberInfo && (
                <View className="flex-row items-center p-4 border-b border-gray-100">
                  <ActivityIndicator size="small" color="#237227" />
                  <View className="flex-1 ml-3">
                    <Text className="text-xs text-gray-500">Member Slots</Text>
                    <Text className="text-sm text-gray-500">Loading slot information...</Text>
                  </View>
                </View>
              )}

              {/* Team Leader */}
              <View className="flex-row items-center p-4 border-b border-gray-100">
                <Ionicons name="person-circle-outline" size={20} color="#237227" />
                <View className="flex-1 ml-3">
                  <Text className="text-xs text-gray-500">Team Leader</Text>
                  {loadingGroupInfo ? (
                    <ActivityIndicator size="small" color="#237227" />
                  ) : (
                    <Text className="text-base font-medium text-gray-900">
                      {leaderName || 'No leader assigned'}
                    </Text>
                  )}
                </View>
              </View>

              {/* Site Status */}
              <View className="flex-row items-center p-4 border-b border-gray-100">
                <Ionicons
                  name={isFinished ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                  size={20}
                  color={isFinished ? '#9ca3af' : '#237227'}
                />
                <View className="flex-1 ml-3">
                  <Text className="text-xs text-gray-500">Status</Text>
                  <Text className={`text-base font-medium ${isFinished ? 'text-gray-500' : 'text-[#237227]'}`}>
                    {site.status}
                  </Text>
                </View>
              </View>

              {/* Coordinates */}
              <View className="flex-row items-center p-4">
                <Ionicons name="location-outline" size={20} color="#237227" />
                <View className="flex-1 ml-3">
                  <Text className="text-xs text-gray-500">Coordinates</Text>
                  <Text className="text-base font-medium text-gray-900">{coordinateText}</Text>
                </View>
              </View>
            </View>

            {/* Site Members Card */}
            <View className="p-4 mx-6 mt-6 bg-white border border-gray-100 rounded-xl">
              <View className="flex-row items-center mb-3">
                <Ionicons name="people-outline" size={20} color="#237227" />
                <Text className="ml-2 text-base font-semibold text-gray-900">Site Members</Text>
                <Text className="ml-auto text-sm text-gray-500">
                  {siteMembers.length} {siteMembers.length === 1 ? 'Member' : 'Members'}
                </Text>
              </View>

              {loadingSiteMembers ? (
                <View className="items-center justify-center py-4">
                  <ActivityIndicator size="small" color="#237227" />
                </View>
              ) : siteMembers.length === 0 ? (
                <Text className="py-4 text-sm text-center text-gray-500">No members joined yet</Text>
              ) : (
                <View>
                  {siteMembers.map((member, index) => (
                    <View
                      key={member.id}
                      className={`flex-row items-center py-3 ${index < siteMembers.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <View className="items-center justify-center w-8 h-8 bg-[#237227] rounded-full">
                        {member.profilePictureUrl ? (
                          <Image source={{ uri: member.profilePictureUrl }} className="w-8 h-8 rounded-full" />
                        ) : (
                          <Ionicons name="person" size={16} color="#f8f4fb" />
                        )}
                      </View>
                      <View className="flex-1 ml-3">
                        <Text className="font-semibold text-gray-900">{member.fullName}</Text>
                        <Text className="text-xs text-gray-500">{member.email}</Text>
                        {member.phoneNumber && (
                          <Text className="mt-0.5 text-xs text-gray-500">{member.phoneNumber}</Text>
                        )}
                      </View>
                      <View className="px-2 py-1 rounded-full border border-[#237227]">
                        <Text className="text-xs font-semibold capitalize text-stone-800">
                          {member.role}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View className="h-24" />
          </ScrollView>

          {/* Fixed Action Button */}
          <View className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-white border-t border-gray-200">
            {isFinished ? (
              <TouchableOpacity
                disabled
                className="items-center justify-center w-full py-3 bg-gray-300 rounded-xl">
                <Text className="text-base font-bold text-gray-600">Site Finished</Text>
              </TouchableOpacity>
            ) : isActive && hasNoLeader ? (
              <TouchableOpacity
                onPress={handleBecomeLeaderAndJoin}
                disabled={acceptLoading}
                className={`w-full items-center justify-center rounded-xl py-3 ${
                  acceptLoading ? 'bg-gray-300' : 'bg-green-500 active:scale-95'
                }`}>
                {acceptLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-base font-bold text-white">Become Team Leader & Join Site</Text>
                )}
              </TouchableOpacity>
            ) : isPending && isLeaderForThisSite ? (
              <TouchableOpacity
                onPress={() => setUpdateVisible(true)}
                className="items-center justify-center w-full py-3 bg-green-500 rounded-xl active:scale-95">
                <Text className="text-base font-bold text-white">Update Site</Text>
              </TouchableOpacity>
            ) : isPending && isUserLeaderAny ? (
              <TouchableOpacity
                disabled
                className="items-center justify-center w-full py-3 bg-gray-300 rounded-xl">
                <Text className="text-base font-bold text-gray-600">Assigned to another leader</Text>
              </TouchableOpacity>
            ) : isPending ? (
              <TouchableOpacity
                onPress={handleAcceptSite}
                disabled={acceptLoading || hasAccepted || !!currentUserSiteId || isUserLeaderAny || memberInfo?.isFull}
                className={`w-full items-center justify-center rounded-xl py-3 ${
                  hasAccepted || !!currentUserSiteId || memberInfo?.isFull
                    ? ' border border-[#237227]'
                    : 'bg-[#237227] active:scale-95'
                      
                }`}>
                {acceptLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text
                    className={`text-base font-bold ${
                      hasAccepted || !!currentUserSiteId || memberInfo?.isFull ? 'text-gray-600' : 'text-white'
                    }`}>
                    {memberInfo?.isFull ? 'Site is Full' : hasAccepted || !!currentUserSiteId ? 'Joined' : 'Accept & Join'}
                  </Text>
                )}
              </TouchableOpacity>
            ) : isActive ? (
              <TouchableOpacity
                disabled
                className="items-center justify-center w-full py-3 bg-gray-300 rounded-xl">
                <Text className="text-base font-bold text-gray-600">Waiting for leader assignment</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                disabled
                className="items-center justify-center w-full py-3 bg-gray-300 rounded-xl">
                <Text className="text-base font-bold text-gray-600">Pending (Leader only)</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
}