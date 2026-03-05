import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';
import supabase, { addContact, getSites } from '../../utils/supabase';
import SweetAlertModal from '../../components/SweetAlertModal';

interface ContactManagementProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}

interface Contact {
  id: number;
  name: string;
  members: string | null;
  location: string;
  initials: string;
  color: string;
  online: boolean;
  isGroup?: boolean;
  groupId?: string;
  userId?: string; // linked user id
}

interface Message {
  id: string;
  sender: string;
  text: string;
  time: string;
  status: string;
  isVoice?: boolean;
  duration?: string;
  audioUrl?: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  initials: string;
  color: string;
}

interface SiteOption {
  id: string;
  name: string;
  status?: string;
}

// Helper function to generate initials
const getInitials = (name: string | null): string => {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

  // Helper function to generate random color
const getRandomColor = (): string => {
  const colors = ['#99f6e4', '#fde68a', '#bfdbfe', '#fda4af', '#c7d2fe', '#a7f3d0', '#fcd34d'];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Helper function to pad a number with leading zeros
const padZero = (num: number, length: number = 2): string => {
  return String(num).length >= length ? String(num) : '0'.repeat(length - String(num).length) + num;
};

export default function ContactManagement({ onNavigate }: ContactManagementProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showContactList, setShowContactList] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [messagesList, setMessagesList] = useState<Message[]>([]);
	
  // Group Management States (kept from original)
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupLeaderId, setGroupLeaderId] = useState<string | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showContactsModal, setShowContactsModal] = useState(false);

  // Sites for assigning a group to a specific site
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [siteSearch, setSiteSearch] = useState('');
  const [takenSiteIds, setTakenSiteIds] = useState<string[]>([]);
  const [takenLeaderIds, setTakenLeaderIds] = useState<string[]>([]);

  // Wizard step state for Create Group modal (1 = name+site, 2 = leader)
  const [groupStep, setGroupStep] = useState<1 | 2>(1);
  const [leaderSearch, setLeaderSearch] = useState('');
	
  // Database users state
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Authenticated user id
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const recordingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const messagesChannelRef = useRef<any>(null);

  // Sweet alert state
  const [sweetAlertVisible, setSweetAlertVisible] = useState(false);
  const [sweetAlertTitle, setSweetAlertTitle] = useState('');
  const [sweetAlertMessage, setSweetAlertMessage] = useState('');
  const [sweetAlertType, setSweetAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  const showSweetAlert = (opts: { title: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }) => {
    setSweetAlertTitle(opts.title);
    setSweetAlertMessage(opts.message);
    setSweetAlertType(opts.type || 'success');
    setSweetAlertVisible(true);
  };

  const resolveActivityActor = async (): Promise<{ user_name: string; initials: string }> => {
    try {
      let meId = currentUserId;
      if (!meId) {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user?.id) {
          meId = data.user.id;
          setCurrentUserId(meId);
        }
      }

      if (meId) {
        const { data: meRow, error: meError } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', meId)
          .single();

        if (!meError && meRow) {
          const name = (meRow as any).full_name || (meRow as any).email || 'Admin User';
          return { user_name: name, initials: getInitials(name) };
        }
      }
    } catch (e) {
      console.error('Failed to resolve activity actor:', e);
    }

    return { user_name: 'Admin User', initials: 'AD' };
  };

  const insertActivityLog = async (opts: {
    action: string;
    description?: string | null;
    location?: string | null;
    type?: string | null;
    color?: string | null;
    icon?: string | null;
  }) => {
    try {
      const actor = await resolveActivityActor();
      const payload = {
        user_name: actor.user_name,
        initials: actor.initials,
        action: opts.action,
        description: opts.description || null,
        location: opts.location ?? 'Contact Management',
        type: opts.type || 'system',
        color: opts.color || '#d1fae5',
        icon: opts.icon || 'notifications-outline',
      };

      const { error } = await supabase.from('activity_logs').insert([payload]);
      if (error) console.error('Failed to insert activity log:', error);
    } catch (e) {
      console.error('Failed to insert activity log:', e);
    }
  };

  // Map DB row to UI Message
  const mapRowToMessage = (row: any): Message => {
    const created = row.created_at ? new Date(row.created_at) : new Date();
    const durationMs = typeof row.duration_ms === 'number' ? row.duration_ms : null;
    const totalSeconds = durationMs !== null ? Math.round(durationMs / 1000) : null;
    const mins = totalSeconds !== null ? Math.floor(totalSeconds / 60) : 0;
    const secs = totalSeconds !== null ? totalSeconds % 60 : 0;
    const durationStr = totalSeconds !== null ? `${mins}:${padZero(secs)}` : undefined;

    const hasAudio = typeof row.file_url === 'string' && row.file_url.length > 0;
    const isVoice = !!hasAudio;
    const isFromMe = currentUserId && row.sender_id && row.sender_id === currentUserId;

    return {
      id: String(row.id),
      sender: isFromMe ? 'Me' : (selectedContact?.initials || 'CT'),
      text: row.transcription || (isVoice ? 'Voice message' : ''),
      time: created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      isVoice,
      duration: isVoice ? durationStr : undefined,
      audioUrl: isVoice ? row.file_url || undefined : undefined,
    };
  };

  // Map a DB row from group messages (stored in messages table with group_id) into a UI Message
  const mapGroupRowToMessage = (row: any): Message => {
    const created = row.created_at ? new Date(row.created_at) : new Date();
    const durationMs = typeof row.duration_ms === 'number' ? row.duration_ms : null;
    const totalSeconds = durationMs !== null ? Math.round(durationMs / 1000) : null;
    const mins = totalSeconds !== null ? Math.floor(totalSeconds / 60) : 0;
    const secs = totalSeconds !== null ? totalSeconds % 60 : 0;
    const durationStr = totalSeconds !== null ? `${mins}:${padZero(secs)}` : undefined;

    const hasAudio = typeof row.file_url === 'string' && row.file_url.length > 0;
    const isVoice = !!hasAudio;
    const isFromMe = currentUserId && row.sender_id && row.sender_id === currentUserId;

    return {
      id: String(row.id),
      sender: isFromMe ? 'Me' : 'Member',
      text: row.transcription || (isVoice ? 'Voice message' : ''),
      time: created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      isVoice,
      duration: isVoice ? durationStr : undefined,
      audioUrl: isVoice ? row.file_url || undefined : undefined,
    };
  };

  const fetchMessagesForConversation = async (conversationId: string | null) => {
    try {
      if (!conversationId) {
        setMessagesList([]);
        return;
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch messages:', error);
        setMessagesList([]);
        return;
      }

      const mapped = (data || []).map(mapRowToMessage);
      setMessagesList(mapped as Message[]);
    } catch (e) {
      console.error('Error fetching messages:', e);
      setMessagesList([]);
    }
  };

  const fetchGroupMessages = async (groupId: string | null) => {
    try {
      if (!groupId) {
        setMessagesList([]);
        return;
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch group messages:', error);
        setMessagesList([]);
        return;
      }

      const mapped = (data || []).map(mapGroupRowToMessage);
      setMessagesList(mapped as Message[]);
    } catch (e) {
      console.error('Error fetching group messages:', e);
      setMessagesList([]);
    }
  };

  // Load direct contacts and group chats from DB
  const loadContactsFromDb = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        console.error('Error getting current user for contacts:', userError);
        return;
      }
      const meId = userData.user.id;

      const { data: contactRows, error: contactsError } = await supabase
        .from('contacts')
        .select('id, contact_id, created_at')
        .eq('user_id', meId);

      if (contactsError) {
        console.error('Error fetching contacts from Supabase:', contactsError);
        return;
      }

      const userIds = contactRows
        ? Array.from(new Set(contactRows.map((row: any) => row.contact_id).filter((id: string | null) => !!id)))
        : [];

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, role, status')
        .in('id', userIds.length > 0 ? userIds : ['']);

      if (usersError) {
        console.error('Error fetching users for contacts:', usersError);
        return;
      }

      const usersMap = new Map<string, any>();
      (usersData || []).forEach((u: any) => usersMap.set(u.id, u));

      const dbContacts: Contact[] = (contactRows || [])
        .map((row: any) => {
          const user = usersMap.get(row.contact_id);
          if (!user) return null;
          return {
            id: Number(row.id),
            name: user.full_name || user.email,
            members: null,
            location: user.role || 'Employee',
            initials: getInitials(user.full_name),
            color: getRandomColor(),
            online: false,
            userId: user.id,
          } as Contact;
        })
        .filter((c: Contact | null): c is Contact => c !== null);

      // Fetch all groups from groups table so they appear in Contacts
      let groupContacts: Contact[] = [];
      try {
        const { data: groupRows, error: groupsError } = await supabase
          .from('groups')
          .select('id, name');

        if (groupsError) {
          console.error('Error fetching groups from Supabase:', groupsError);
        } else if (groupRows) {
          groupContacts = (groupRows as any[]).map((row: any, index: number) => ({
            id: Number.MAX_SAFE_INTEGER - index, // ensure unique numeric key
            name: row.name || 'Group',
            members: null,
            location: 'Group',
            initials: getInitials(row.name || 'Group'),
            color: getRandomColor(),
            online: false,
            isGroup: true,
            groupId: row.id as string,
          } as Contact));
        }
      } catch (groupError) {
        console.error('Unexpected error loading groups from Supabase:', groupError);
      }

      const allContacts = [...dbContacts, ...groupContacts];
      setContacts(allContacts);
      if (!selectedContact && allContacts.length > 0) {
        setSelectedContact(allContacts[0]);
      }
    } catch (e) {
      console.error('Unexpected error loading contacts from Supabase:', e);
    }
  };

  // Fetch users (for adding contacts / groups)
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, status');
      if (error) {
        console.error('Error fetching users from Supabase:', error);
        return;
      }
      const transformed: User[] = (data || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: typeof user.role === 'string' ? user.role : '',
        is_active: user.status !== 'inactive',
        initials: getInitials(user.full_name),
        color: getRandomColor(),
      }));
      setUsers(transformed);
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchSitesForGroups = async () => {
    setIsLoadingSites(true);
    try {
      const { data: takenRows, error: takenError } = await supabase
        .from('groups')
        .select('site_id, leader_id');

      if (takenError) {
        console.error('Error fetching taken site ids:', takenError);
      }

      const takenSites = Array.from(
        new Set(
          (takenRows || [])
            .map((r: any) => (r?.site_id ? String(r.site_id) : null))
            .filter((v: string | null): v is string => !!v)
        )
      ) as string[];
      setTakenSiteIds(takenSites);

      const takenLeaders: string[] = Array.from(
        new Set(
          (takenRows || [])
            .map((r: any) => (r?.leader_id ? String(r.leader_id) : null))
            .filter((v: string | null): v is string => !!v)
        )
      );
      setTakenLeaderIds(takenLeaders);

      const data = await getSites();
      const mapped: SiteOption[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name || 'Unnamed site',
        status: row.status,
      }));
      setSites(mapped);

      // If current selection becomes taken (race), clear it.
      setSelectedSiteId(prev => {
        if (!prev) return prev;
        return takenSites.indexOf(prev) !== -1 ? null : prev;
      });

      setGroupLeaderId(prev => {
        if (!prev) return prev;
        return takenLeaders.indexOf(prev) !== -1 ? null : prev;
      });
      setSelectedMembers(prev => {
        if (prev.length !== 1) return prev;
        return takenLeaders.indexOf(prev[0]) !== -1 ? [] : prev;
      });
    } catch (e) {
      console.error('Error fetching sites for groups:', e);
      setSites([]);
      setTakenSiteIds([]);
      setTakenLeaderIds([]);
    } finally {
      setIsLoadingSites(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadContactsFromDb();
  }, []);

  // Load current user id once
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user) {
          setCurrentUserId(data.user.id);
        }
      } catch (e) {
        console.error('Failed to load current user id:', e);
      }
    })();
  }, []);

  // Cleanup audio player
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        try {
          audioPlayerRef.current.pause();
          audioPlayerRef.current.src = '';
        } catch (e) {}
      }
    };
  }, []);

  // Setup realtime + messages whenever selectedContact changes
  useEffect(() => {
    const contactUserId = selectedContact?.isGroup ? null : (selectedContact?.userId || null);
    const groupId = selectedContact?.isGroup ? (selectedContact.groupId || null) : null;

    if (messagesChannelRef.current) {
      try {
        supabase.removeChannel(messagesChannelRef.current);
      } catch (e) {
        try { messagesChannelRef.current.unsubscribe(); } catch (err) {}
      }
      messagesChannelRef.current = null;
    }

    if (!contactUserId && !groupId) {
      setMessagesList([]);
      return;
    }

    (async () => {
      try {
        if (groupId) {
          await fetchGroupMessages(groupId);

          const channelName = `group_messages_${groupId}`;
          const channel = supabase
            .channel(channelName)
            .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
              (payload: any) => {
                const newRow = payload.new;
                setMessagesList(prev => {
                  if (prev.some(m => m.id === String(newRow.id))) return prev;
                  return [...prev, mapGroupRowToMessage(newRow)];
                });
              }
            )
            .subscribe();

          messagesChannelRef.current = channel;
        } else if (contactUserId) {
          const conversationId = await getOrCreateConversation(contactUserId);
          if (!conversationId) {
            setMessagesList([]);
            return;
          }

          await fetchMessagesForConversation(conversationId);

          const channelName = `messages_conversation_${conversationId}`;
          const channel = supabase
            .channel(channelName)
            .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
              (payload: any) => {
                const newRow = payload.new;
                setMessagesList(prev => {
                  if (prev.some(m => m.id === String(newRow.id))) return prev;
                  return [...prev, mapRowToMessage(newRow)];
                });
              }
            )
            .subscribe();

          messagesChannelRef.current = channel;
        }
      } catch (e) {
        console.error('Failed to setup messages realtime subscription:', e);
        setMessagesList([]);
      }
    })();

    return () => {
      if (messagesChannelRef.current) {
        try { supabase.removeChannel(messagesChannelRef.current); } catch (e) {
          try { messagesChannelRef.current.unsubscribe(); } catch (err) {}
        }
        messagesChannelRef.current = null;
      }
    };
  }, [selectedContact]);

  // Audio recording
  const startRecording = () => {
    if (!selectedContact) {
      alert('Please select a contact or group before recording a message.');
      return;
    }
    setIsRecording(true);
    setRecordingTime(0);
    recordingInterval.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);

    (async () => {
      try {
        const stream = await (navigator as any).mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const options = { mimeType: 'audio/webm' } as any;
        const mediaRecorder = new (window as any).MediaRecorder(stream, options);

        mediaRecorder.ondataavailable = (e: any) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.start();
        mediaRecorderRef.current = { mediaRecorder, stream };
      } catch (e) {
        console.error('Microphone access denied or error:', e);
        alert('Microphone access required to record voice messages.');
        setIsRecording(false);
        if (recordingInterval.current) clearInterval(recordingInterval.current);
      }
    })();
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingInterval.current) clearInterval(recordingInterval.current);

    const ref = mediaRecorderRef.current;
    if (ref && ref.mediaRecorder) {
      try {
        const mr = ref.mediaRecorder as MediaRecorder;
        mr.onstop = async () => {
          try {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });

            const now = new Date();
            const baseMessage: Message = {
              id: '',
              sender: 'Me',
              text: '' as any,
              time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'Sent',
              isVoice: true,
              duration: formatRecordingTime(recordingTime),
              audioUrl: dataUrl,
            };

            const dbRow = selectedContact?.isGroup
              ? await saveGroupMessageToDb(baseMessage)
              : await saveMessageToDb(baseMessage);

            if (dbRow) {
              const mapped = selectedContact?.isGroup ? mapGroupRowToMessage(dbRow) : mapRowToMessage(dbRow);
              setMessagesList(prev => {
                if (prev.some(m => m.id === mapped.id)) return prev;
                return [...prev, mapped];
              });
            }
          } catch (e) {
            console.error('Failed to finalize recording:', e);
          }
        };

        mr.stop();
        try { ref.stream.getTracks().forEach((t: any) => t.stop()); } catch (e) {}
      } catch (e) {
        console.error('Error stopping MediaRecorder:', e);
      } finally {
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        setRecordingTime(0);
      }
    } else {
      setRecordingTime(0);
    }
  };

  const sendMessage = (text: string) => {
    if (!selectedContact) {
      alert('Please select a contact or group before sending a message.');
      return;
    }
    (async () => {
      const now = new Date();
      const localMessage: Message = {
        id: `local-${Date.now()}`,
        sender: 'Me',
        text,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Sent',
        isVoice: false,
      };
      setTranscript('');
      setMessagesList(prev => [...prev, localMessage]);
      try {
        const dbRow = selectedContact?.isGroup
          ? await saveGroupMessageToDb(localMessage)
          : await saveMessageToDb(localMessage);

        if (dbRow) {
          const mapped = selectedContact?.isGroup ? mapGroupRowToMessage(dbRow) : mapRowToMessage(dbRow);
          setMessagesList(prev => {
            const replaced = prev.map(m => (m.id === localMessage.id ? mapped : m));

            const seen = new Set<string>();
            return replaced.filter(m => {
              if (seen.has(m.id)) return false;
              seen.add(m.id);
              return true;
            });
          });
        }
      } catch (e) {
        console.error('Failed to send message:', e);
      }
    })();
  };

  const handlePlayVoice = (message: Message) => {
    if (!message.audioUrl) return;
    if (currentlyPlayingId === message.id && audioPlayerRef.current) {
      try { audioPlayerRef.current.pause(); } catch (e) {}
      audioPlayerRef.current = null;
      setCurrentlyPlayingId(null);
      return;
    }
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = '';
      } catch (e) {}
      audioPlayerRef.current = null;
      setCurrentlyPlayingId(null);
    }
    const audio = new Audio(message.audioUrl);
    audioPlayerRef.current = audio;
    setCurrentlyPlayingId(message.id);
    audio.onended = () => {
      setCurrentlyPlayingId(null);
      audioPlayerRef.current = null;
    };
    audio.play().catch(e => {
      console.error('Playback failed', e);
      setCurrentlyPlayingId(null);
    });
  };

  const parseDurationToMs = (duration?: string): number | null => {
    if (!duration) return null;
    const parts = duration.split(':');
    if (parts.length !== 2) return null;
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1], 10);
    if (Number.isNaN(mins) || Number.isNaN(secs)) return null;
    return (mins * 60 + secs) * 1000;
  };

  const getOrCreateConversation = async (contactUserId: string | null): Promise<string | null> => {
    try {
      if (!contactUserId) return null;
      let meId = currentUserId;
      if (!meId) {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          console.error('Unable to determine current user for conversation:', error);
          return null;
        }
        meId = data.user.id;
        setCurrentUserId(meId);
      }
      if (meId === contactUserId) {
        console.warn('Skipping conversation creation for self-chat.');
        return null;
      }
      const userOne = meId < contactUserId ? meId : contactUserId;
      const userTwo = meId < contactUserId ? contactUserId : meId;
      const { data: existing, error: findError } = await supabase
        .from('conversations')
        .select('id, user_one, user_two')
        .or(`and(user_one.eq.${userOne},user_two.eq.${userTwo}),and(user_one.eq.${userTwo},user_two.eq.${userOne})`)
        .limit(1);
      if (findError) {
        console.error('Error looking up conversation:', findError);
        return null;
      }
      if (existing && existing.length > 0) return existing[0].id as string;
      const { data: created, error: createError } = await supabase
        .from('conversations')
        .insert([{ user_one: userOne, user_two: userTwo }])
        .select('id')
        .single();
      if (createError || !created) {
        console.error('Error creating conversation:', createError);
        return null;
      }
      return created.id as string;
    } catch (e) {
      console.error('Unexpected error in getOrCreateConversation:', e);
      return null;
    }
  };

  const saveMessageToDb = async (message: Message) => {
    try {
      const targetUserId: string | null = selectedContact?.userId || null;
      if (!targetUserId) {
        console.warn('No selected contact userId; skipping save to messages');
        return null;
      }
      const conversationId = await getOrCreateConversation(targetUserId);
      if (!conversationId) {
        console.warn('No conversation id resolved; skipping save to messages');
        return null;
      }
      let meId = currentUserId;
      if (!meId) {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          console.error('Unable to determine current user when saving message:', error);
          return null;
        }
        meId = data.user.id;
        setCurrentUserId(meId);
      }
      const durationMs = message.isVoice ? parseDurationToMs(message.duration) : null;
      const payload: any = {
        conversation_id: conversationId,
        sender_id: meId,
        receiver_id: targetUserId,
        file_url: message.isVoice ? (message.audioUrl || '') : null,
        transcription: !message.isVoice ? message.text : null,
        duration_ms: durationMs,
      };
      const { data, error } = await supabase.from('messages').insert([payload]).select();
      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      if (data && data[0]) return data[0];
      return null;
    } catch (e) {
      console.error('Failed to save message to Supabase:', e);
      return null;
    }
  };

  const saveGroupMessageToDb = async (message: Message) => {
    try {
      const groupId = selectedContact?.isGroup ? selectedContact.groupId || null : null;
      if (!groupId) {
        console.warn('No selected group; skipping save to group_messages');
        return null;
      }

      let meId = currentUserId;
      if (!meId) {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          console.error('Unable to determine current user when saving group message:', error);
          return null;
        }
        meId = data.user.id;
        setCurrentUserId(meId);
      }

      const durationMs = message.isVoice ? parseDurationToMs(message.duration) : null;
      const payload: any = {
        conversation_id: null,
        group_id: groupId,
        sender_id: meId,
        receiver_id: meId,
        file_url: message.isVoice ? (message.audioUrl || '') : null,
        transcription: !message.isVoice ? message.text : null,
        duration_ms: durationMs,
      };

      const { data, error } = await supabase.from('messages').insert([payload]).select();
      if (error) {
        console.error('Supabase messages insert error (group):', error);
        throw error;
      }
      if (data && data[0]) return data[0];
      return null;
    } catch (e) {
      console.error('Failed to save group message to Supabase:', e);
      return null;
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${padZero(secs)}`;
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev => {
      // Single-select behaviour: tap once to select as leader, tap again to clear.
      if (prev.length === 1 && prev[0] === userId) {
        setGroupLeaderId(null);
        return [];
      }
      setGroupLeaderId(userId);
      return [userId];
    });
  };

  const openCreateGroupModal = () => {
    setSelectedMembers([]);
    setGroupName('');
    setGroupLeaderId(null);
    setSelectedSiteId(null);
    setSiteSearch('');
    setLeaderSearch('');
    setGroupStep(1);
    fetchUsers();
    fetchSitesForGroups();
    setShowCreateGroupModal(true);
  };

  const openContactsModal = () => {
    setSelectedMembers([]);
    setEmployeeSearch('');
    fetchUsers();
    setShowContactsModal(true);
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAdminUser = (user: User) => {
    const role = (user.role || '').toLowerCase().trim();
    return role === 'admin' || role === 'administrator' || role.includes('admin');
  };

  const filteredUsers = users.filter(user => {
    if (isAdminUser(user)) return false;
    const q = employeeSearch.toLowerCase();
    return (
      (user.full_name?.toLowerCase().includes(q) || false) ||
      user.email.toLowerCase().includes(q) ||
      (user.role || '').toLowerCase().includes(q)
    );
  });

  const filteredSitesForModal = sites.filter(site => {
    const matchesSearch = site.name.toLowerCase().includes(siteSearch.toLowerCase());
    const isTaken = takenSiteIds.indexOf(site.id) !== -1;
    return matchesSearch && !isTaken;
  });

  const filteredLeaders = users.filter(user => {
    if (isAdminUser(user)) return false;
    if (takenLeaderIds.indexOf(user.id) !== -1) return false;
    const q = leaderSearch.toLowerCase();
    return (
      (user.full_name?.toLowerCase().indexOf(q) !== -1 || false) ||
      user.email.toLowerCase().indexOf(q) !== -1
    );
  });

  return (
    <View className="flex-1 flex-row bg-stone-50">
      {/* Main content with header + contact/chat layout, using messagesList and transcript */}
      <View className="flex-1 bg-stone-50">
        <View className="bg-white px-5 pt-4 pb-3 border-b border-stone-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity className="lg:hidden w-9 h-9 items-center justify-center mr-3" onPress={() => setIsDrawerOpen(true)}>
                <Ionicons name="menu" size={24} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-lg lg:text-2xl font-bold text-stone-900">Contact Management</Text>
                <Text className="text-stone-500 text-xs lg:text-sm mt-0.5">Welcome back, Administrator</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2.5">
              <TouchableOpacity className="w-9 h-9 bg-stone-100 rounded-full items-center justify-center" onPress={() => setIsNotificationOpen(true)}>
                <View className="w-2 h-2 bg-red-500 rounded-full absolute top-1.5 right-1.5" />
                <Ionicons name="notifications-outline" size={18} color="#57534e" />
              </TouchableOpacity>
              <View className="w-9 h-9 bg-emerald-100 rounded-full items-center justify-center">
                <Text className="text-emerald-700 font-semibold text-xs">AD</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Main two-panel layout */}
        <View className="flex-1 flex-row">
          {/* Contacts Panel */}
          <View className={`${!showContactList ? 'hidden lg:flex' : 'flex'} flex-1 lg:flex-none lg:w-96 bg-white border-r border-stone-200`}>
            <View className="px-5 pt-4 pb-3 border-b border-stone-100">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-bold text-stone-900">Contacts</Text>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    className="w-8 h-8 bg-stone-100 rounded-full items-center justify-center"
                    onPress={openContactsModal}
                  >
                    <Ionicons name="person-add" size={16} color="#57534e" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="w-8 h-8 bg-stone-100 rounded-full items-center justify-center"
                    onPress={openCreateGroupModal}
                  >
                    <Ionicons name="people" size={16} color="#57534e" />
                  </TouchableOpacity>
                </View>
              </View>
              <View className="flex-row items-center bg-stone-50 rounded-lg px-3 py-2 border border-stone-200">
                <Ionicons name="search" size={16} color="#a8a29e" />
                <TextInput
                  className="flex-1 ml-2 text-sm"
                  placeholder="Search contacts..."
                  placeholderTextColor="#a8a29e"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            <ScrollView className="flex-1">
              {filteredContacts.map(contact => (
                <TouchableOpacity
                  key={contact.id}
                  className="flex-row items-center px-5 py-4 border-b border-stone-50"
                  onPress={() => {
                    setSelectedContact(contact);
                    setShowContactList(false);
                  }}
                >
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: contact.color }}
                  >
                    <Text className="text-stone-800 font-semibold">{contact.initials}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-stone-900">{contact.name}</Text>
                    <Text className="text-xs text-stone-500 mt-1">{contact.location}</Text>
                  </View>
                  {contact.online && (
                    <View className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                  )}
                </TouchableOpacity>
              ))}

              {filteredContacts.length === 0 && (
                <View className="px-5 py-6">
                  <Text className="text-xs text-stone-500">No contacts found. Use the + button to add one.</Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Chat Panel */}
          <View className={`${showContactList ? 'hidden lg:flex' : 'flex'} flex-1 bg-stone-50`}>
            {selectedContact ? (
              <>
                <View className="bg-white px-5 py-3 border-b border-stone-200 flex-row items-center">
                  <TouchableOpacity
                    className="lg:hidden mr-3"
                    onPress={() => setShowContactList(true)}
                  >
                    <Ionicons name="chevron-back" size={24} color="#78716c" />
                  </TouchableOpacity>
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: selectedContact.color }}
                  >
                    <Text className="font-bold">{selectedContact.initials}</Text>
                  </View>
                  <View>
                    <Text className="font-bold text-stone-900">{selectedContact.name}</Text>
                    <Text className="text-xs text-emerald-600">Direct channel</Text>
                  </View>
                </View>

                <ScrollView className="flex-1 px-5 py-4">
                  {messagesList.map(message => (
                    <View
                      key={message.id}
                      className={`mb-4 flex-row ${message.sender === 'Me' ? 'justify-end' : 'justify-start'}`}
                    >
                      <View className="max-w-[80%]">
                        {message.isVoice ? (
                          <TouchableOpacity
                            className="bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-2xl flex-row items-center"
                            onPress={() => handlePlayVoice(message)}
                          >
                            <Ionicons
                              name={currentlyPlayingId === message.id ? 'pause' : 'play'}
                              size={16}
                              color="#10b981"
                            />
                            <Ionicons
                              name="mic"
                              size={16}
                              color="#10b981"
                              style={{ marginLeft: 8, marginRight: 4 }}
                            />
                            <Text className="text-xs text-stone-800">
                              {message.duration || formatRecordingTime(recordingTime) || 'Voice message'}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <View className="bg-white px-3 py-2 rounded-2xl border border-stone-200">
                            <Text className="text-sm text-stone-800">{message.text}</Text>
                          </View>
                        )}
                        <Text className="text-[10px] text-stone-400 mt-1 text-right">
                          {message.time} • {message.status}
                        </Text>
                      </View>
                    </View>
                  ))}

                  {messagesList.length === 0 && (
                    <View className="flex-1 items-center justify-center mt-10">
                      <Text className="text-stone-400 text-xs">No messages yet. Start the conversation!</Text>
                    </View>
                  )}
                </ScrollView>

                <View className="bg-white p-4 border-t border-stone-200">
                  <View className="flex-row items-center bg-stone-50 rounded-xl px-4 py-2 border border-stone-200">
                    <TextInput
                      className="flex-1 h-10 text-sm"
                      placeholder="Type a message..."
                      placeholderTextColor="#a8a29e"
                      value={transcript}
                      onChangeText={setTranscript}
                      onSubmitEditing={() => {
                        const trimmed = transcript.trim();
                        if (trimmed.length > 0) {
                          sendMessage(trimmed);
                        }
                      }}
                    />
                    <TouchableOpacity
                      className="mx-2"
                      onPressIn={startRecording}
                      onPressOut={stopRecording}
                    >
                      <Ionicons
                        name="mic"
                        size={24}
                        color={isRecording ? '#ef4444' : '#10b981'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        const trimmed = transcript.trim();
                        if (trimmed.length > 0) {
                          sendMessage(trimmed);
                        }
                      }}
                    >
                      <Ionicons name="send" size={22} color="#10b981" />
                    </TouchableOpacity>
                  </View>
                  {isRecording && (
                    <Text className="text-[11px] text-red-500 mt-1 text-right">
                      Recording... {formatRecordingTime(recordingTime)}
                    </Text>
                  )}
                </View>
              </>
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-stone-500 text-sm">Select a contact to start chatting</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Notifications Modal */}
      <Modal visible={isNotificationOpen} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/20 items-center justify-center"
          onPress={() => setIsNotificationOpen(false)}
        >
          <View className="w-80 bg-white rounded-2xl p-6 items-center">
            <Text className="font-bold text-lg mb-2">Notifications</Text>
            <Text className="text-stone-500 mb-4">No new notifications</Text>
            <TouchableOpacity
              className="bg-emerald-500 px-6 py-2 rounded-lg"
              onPress={() => setIsNotificationOpen(false)}
            >
              <Text className="text-white font-bold">Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Create Group Modal — 2-step wizard */}
      <Modal visible={showCreateGroupModal} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/20 items-center justify-center p-4"
          onPress={() => setShowCreateGroupModal(false)}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <View className="w-96 bg-white rounded-2xl p-6">

              {/* Header (match Add Contacts modal) */}
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="font-bold text-lg">
                    {groupStep === 1 ? 'Create Group' : 'Select Leader'}
                  </Text>
                  <Text className="text-xs text-stone-500 mt-0.5">
                    {groupStep === 1 ? 'Step 1 of 2 — Name & site' : 'Step 2 of 2 — Group leader'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setShowCreateGroupModal(false);
                    setGroupName('');
                    setSelectedMembers([]);
                    setSelectedSiteId(null);
                    setLeaderSearch('');
                    setSiteSearch('');
                    setGroupLeaderId(null);
                    setGroupStep(1);
                  }}
                >
                  <Ionicons name="close" size={22} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* ── STEP 1: Group Name + Site ── */}
              {groupStep === 1 && (
                <>
                  <View className="mb-3">
                    <TextInput
                      className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Group name (e.g. Alpha Site Team)"
                      placeholderTextColor="#a8a29e"
                      value={groupName}
                      onChangeText={setGroupName}
                    />
                  </View>

                  <View className="mb-3">
                    <TextInput
                      className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Search sites..."
                      placeholderTextColor="#a8a29e"
                      value={siteSearch}
                      onChangeText={setSiteSearch}
                    />
                  </View>

                  <ScrollView className="max-h-56 mb-4" showsVerticalScrollIndicator>
                    {isLoadingSites ? (
                      <Text className="text-xs text-stone-500 text-center py-4">Loading sites...</Text>
                    ) : filteredSitesForModal.length === 0 ? (
                      <Text className="text-xs text-stone-500 text-center py-4">No sites found</Text>
                    ) : (
                      filteredSitesForModal.map(site => {
                        const isSelected = selectedSiteId === site.id;
                        return (
                          <TouchableOpacity
                            key={site.id}
                            className={`flex-row items-center justify-between p-2 mb-1 rounded-lg border ${
                              isSelected ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-200'
                            }`}
                            onPress={() => setSelectedSiteId(prev => (prev === site.id ? null : site.id))}
                          >
                            <View className="flex-row items-center flex-1">
                              <View className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
                                isSelected ? 'bg-emerald-100' : 'bg-stone-200'
                              }`}>
                                <Ionicons name="location-outline" size={16} color={isSelected ? '#10b981' : '#57534e'} />
                              </View>
                              <View className="flex-1">
                                <Text className="text-sm font-semibold text-stone-900" numberOfLines={1}>
                                  {site.name}
                                </Text>
                                <Text className="text-[11px] text-stone-500" numberOfLines={1}>
                                  {site.status || '—'}
                                </Text>
                              </View>
                            </View>
                            {isSelected ? (
                              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                            ) : (
                              <View className="w-5 h-5 rounded-full border-2 border-stone-300" />
                            )}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>

                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="flex-1 px-4 py-2 rounded-lg border border-stone-300"
                      onPress={() => {
                        setShowCreateGroupModal(false);
                        setGroupName('');
                        setSelectedMembers([]);
                        setSelectedSiteId(null);
                        setGroupStep(1);
                      }}
                    >
                      <Text className="text-stone-700 font-semibold text-center">Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className={`flex-1 px-4 py-2 rounded-lg ${
                        groupName.trim() && selectedSiteId ? 'bg-emerald-500' : 'bg-stone-200'
                      }`}
                      disabled={!groupName.trim() || !selectedSiteId}
                      onPress={() => setGroupStep(2)}
                    >
                      <Text className={`font-semibold text-center ${
                        groupName.trim() && selectedSiteId ? 'text-white' : 'text-stone-500'
                      }`}
                      >
                        Next
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* ── STEP 2: Group Leader ── */}
              {groupStep === 2 && (
                <>
                  <View className="mb-3">
                    <TextInput
                      className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Search employees by name, email, or role"
                      placeholderTextColor="#a8a29e"
                      value={leaderSearch}
                      onChangeText={setLeaderSearch}
                    />
                  </View>

                  <ScrollView className="max-h-56 mb-4" showsVerticalScrollIndicator>
                    {isLoadingUsers ? (
                      <Text className="text-xs text-stone-500 text-center py-4">Loading employees...</Text>
                    ) : filteredLeaders.length === 0 ? (
                      <Text className="text-xs text-stone-500 text-center py-4">No employees found</Text>
                    ) : (
                      filteredLeaders.map(user => {
                        const isLeader = selectedMembers.indexOf(user.id) !== -1;
                        return (
                          <TouchableOpacity
                            key={user.id}
                            className={`flex-row items-center justify-between p-2 mb-1 rounded-lg border ${
                              isLeader ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-200'
                            }`}
                            onPress={() => toggleMemberSelection(user.id)}
                          >
                            <View className="flex-row items-center flex-1">
                              <View
                                className="w-9 h-9 rounded-full items-center justify-center mr-3"
                                style={{ backgroundColor: user.color }}
                              >
                                <Text className="text-xs font-bold text-stone-800">{user.initials}</Text>
                              </View>
                              <View className="flex-1">
                                <Text className="text-sm font-semibold text-stone-900">{user.full_name || 'Unnamed'}</Text>
                                <Text className="text-[11px] text-stone-500" numberOfLines={1}>{user.email}</Text>
                              </View>
                            </View>
                            {isLeader ? (
                              <View className="flex-row items-center rounded-full px-2.5 py-1 gap-1 bg-emerald-100 border border-emerald-200">
                                <Ionicons name="checkmark" size={11} color="#10b981" />
                                <Text className="text-[10px] text-emerald-700 font-bold">Leader</Text>
                              </View>
                            ) : (
                              <View className="w-5 h-5 rounded-full border-2 border-stone-300" />
                            )}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>

                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="flex-1 px-4 py-2 rounded-lg border border-stone-300"
                      onPress={() => {
                        setGroupStep(1);
                        setGroupLeaderId(null);
                        setSelectedMembers([]);
                      }}
                    >
                      <Text className="text-stone-700 font-semibold text-center">Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className={`flex-1 px-4 py-2 rounded-lg ${groupLeaderId ? 'bg-emerald-500' : 'bg-stone-200'}`}
                      disabled={!groupLeaderId}
                      onPress={async () => {
                        const name = groupName.trim();
                        if (!name || !groupLeaderId || !selectedSiteId) return;
                        try {
                          let meId = currentUserId;
                          if (!meId) {
                            const { data, error } = await supabase.auth.getUser();
                            if (error || !data?.user) { console.error('Unable to get current user:', error); return; }
                            meId = data.user.id;
                            setCurrentUserId(meId);
                          }

                          // Safety check: ensure site is still available
                          const { data: existingForSite, error: existingForSiteError } = await supabase
                            .from('groups')
                            .select('id')
                            .eq('site_id', selectedSiteId)
                            .limit(1);

                          if (existingForSiteError) {
                            console.error('Failed to check site availability:', existingForSiteError);
                            alert('Unable to verify site availability. Please try again.');
                            return;
                          }

                          if (existingForSite && existingForSite.length > 0) {
                            alert('This site is already assigned to a group. Please pick another site.');
                            setGroupStep(1);
                            setSelectedSiteId(null);
                            await fetchSitesForGroups();
                            return;
                          }

                          // Safety check: ensure leader is still available
                          const { data: existingForLeader, error: existingForLeaderError } = await supabase
                            .from('groups')
                            .select('id')
                            .eq('leader_id', groupLeaderId)
                            .limit(1);

                          if (existingForLeaderError) {
                            console.error('Failed to check leader availability:', existingForLeaderError);
                            alert('Unable to verify leader availability. Please try again.');
                            return;
                          }

                          if (existingForLeader && existingForLeader.length > 0) {
                            alert('This employee is already assigned as a group leader. Please choose another leader.');
                            setGroupLeaderId(null);
                            setSelectedMembers([]);
                            await fetchSitesForGroups();
                            return;
                          }

                          const uniqueMembers = Array.from(new Set([groupLeaderId!, meId!]));
                          const leaderId = groupLeaderId || meId!;
                          const { data: groupRow, error: groupError } = await supabase
                            .from('groups')
                            .insert([{ name, leader_id: leaderId, site_id: selectedSiteId }])
                            .select('id, name, leader_id, site_id')
                            .single();
                          if (groupError || !groupRow) { console.error('Error creating group:', groupError); return; }
                          const memberPayloads = uniqueMembers.map(userId => ({ group_id: groupRow.id, user_id: userId }));
                          const { error: gmError } = await supabase.from('group_members').insert(memberPayloads);
                          if (gmError) console.error('Error inserting group members:', gmError);
                          const newGroupContact: Contact = {
                            id: Date.now(), name: groupRow.name, members: null, location: 'Group',
                            initials: getInitials(groupRow.name), color: getRandomColor(),
                            online: false, isGroup: true, groupId: groupRow.id as string,
                          };
                          setContacts(prev => {
                            if (prev.some(c => c.isGroup && c.groupId === groupRow.id)) return prev;
                            return [...prev, newGroupContact];
                          });
                          await loadContactsFromDb();

                          const siteName = sites.find(s => s.id === selectedSiteId)?.name || '';
                          await insertActivityLog({
                            action: `Created Group: ${groupRow.name}`,
                            description: siteName ? `Group assigned to site: ${siteName}` : 'New group has been created',
                            location: 'Contact Management',
                            type: 'group',
                            color: '#d1fae5',
                            icon: 'people-outline',
                          });

                          showSweetAlert({
                            title: 'Group Created',
                            message: `${groupRow.name} has been created successfully.`,
                            type: 'success',
                          });
                        } catch (err) {
                          console.error('Unexpected error while saving group:', err);
                        } finally {
                          setShowCreateGroupModal(false);
                          setGroupName('');
                          setSelectedMembers([]);
                          setSelectedSiteId(null);
                          setGroupStep(1);
                        }
                      }}
                    >
                      <Text className={`font-semibold text-center ${groupLeaderId ? 'text-white' : 'text-stone-500'}`}>
                        Save Group
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Contacts Modal (for adding direct contacts) */}
      <Modal visible={showContactsModal} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/20 items-center justify-center p-4"
          onPress={() => setShowContactsModal(false)}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <View className="w-96 bg-white rounded-2xl p-6 max-h-96">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="font-bold text-lg">Add Contacts</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowContactsModal(false);
                    setEmployeeSearch('');
                  }}
                >
                  <Ionicons name="close" size={22} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <View className="mb-3">
                <TextInput
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Search employees by name, email, or role"
                  placeholderTextColor="#a8a29e"
                  value={employeeSearch}
                  onChangeText={setEmployeeSearch}
                />
              </View>
              <ScrollView className="max-h-56 mb-4">
                {filteredUsers.map(user => {
                  const exists = contacts.some(c => c.userId === user.id);
                  return (
                    <View
                      key={user.id}
                      className="flex-row items-center justify-between p-2 mb-1 rounded-lg bg-stone-50 border border-stone-200"
                    >
                      <View className="flex-row items-center flex-1">
                        <View
                          className="w-9 h-9 rounded-full items-center justify-center mr-3"
                          style={{ backgroundColor: user.color }}
                        >
                          <Text className="text-xs font-bold text-stone-800">{user.initials}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-stone-900">
                            {user.full_name || 'Unnamed'}
                          </Text>
                          <Text className="text-[11px] text-stone-500">{user.email}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        className={`ml-2 px-3 py-1.5 rounded ${exists ? 'bg-stone-200' : 'bg-emerald-500'}`}
                        disabled={exists}
                        onPress={async () => {
                          try {
                            await addContact(user.id);
                            await loadContactsFromDb();

                            await insertActivityLog({
                              action: `Added Contact: ${user.full_name || user.email}`,
                              description: 'New contact has been added to the contact list',
                              location: 'Contact Management',
                              type: 'contact',
                              color: '#d1fae5',
                              icon: 'person-add-outline',
                            });

                            showSweetAlert({
                              title: 'Contact Added',
                              message: `${user.full_name || user.email} has been added to your contacts.`,
                              type: 'success',
                            });
                          } catch (error) {
                            console.error('Failed to add contact:', error);

                            const msg =
                              typeof (error as any)?.message === 'string'
                                ? (error as any).message
                                : 'Failed to add contact. Please try again.';

                            showSweetAlert({
                              title: 'Add Failed',
                              message: msg,
                              type: 'error',
                            });
                          }
                        }}
                      >
                        <Text className={`text-xs font-semibold ${exists ? 'text-stone-500' : 'text-white'}`}>
                          {exists ? 'Added' : 'Add'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <Text className="text-xs text-stone-500 text-center py-4">No employees found</Text>
                )}
              </ScrollView>
              <TouchableOpacity
                className="px-4 py-2 rounded-lg border border-stone-300"
                onPress={() => setShowContactsModal(false)}
              >
                <Text className="text-stone-700 font-semibold text-center">Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <SweetAlertModal
        visible={sweetAlertVisible}
        title={sweetAlertTitle}
        message={sweetAlertMessage}
        type={sweetAlertType}
        onConfirm={() => setSweetAlertVisible(false)}
        onCancel={() => setSweetAlertVisible(false)}
      />
    </View>
  );
}