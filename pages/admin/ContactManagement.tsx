import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';
import supabase, { addContact } from '../../utils/supabase';
import SweetAlertModal from '../../components/SweetAlertModal';

interface ContactManagementProps {
  onNavigate: (
    page:
      | 'dashboard'
      | 'siteManagement'
      | 'walkieTalkie'
      | 'activityLogs'
      | 'companyList'
      | 'employee'
      | 'settings'
  ) => void;
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
  siteId?: string;
  userId?: string; // linked user id
}

interface Message {
  id: string;
  sender: string;
  text: string;
  time: string;
  _rawTs?: string;
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
  const [lastMessagesMap, setLastMessagesMap] = useState<
    Record<string, { text: string; time: string; unreadCount: number } | null>
  >({});

  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showContactsModal, setShowContactsModal] = useState(false);

  // Database users state
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Authenticated user id
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const recordingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusChannelRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const lastAutoPlayedIdRef = useRef<string | null>(null);
  const audioUnlockedRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  // Stores the latest autoPlayVoiceMessage so subscription closures always call the current version
  const autoPlayVoiceRef = useRef<
    ((msgId: string | number, fileUrl?: string | null) => void) | null
  >(null);
  const chatScrollRef = useRef<ScrollView>(null);
  const selectedContactRef = useRef<Contact | null>(null);
  // Mirrors contacts state so real-time callbacks can look up contacts synchronously
  const contactsRef = useRef<Contact[]>([]);
  // Maps conversationId -> contact.id (string) so realtime callbacks find the right contact
  const convToContactIdRef = useRef<Map<string, string>>(new Map());
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  // Ticks every 30 s so delivery labels like "Delivered 2 minutes ago" stay up-to-date
  const [now, setNow] = useState(new Date());
  const messagesChannelRef = useRef<any>(null);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);

  // Sweet alert state
  const [sweetAlertVisible, setSweetAlertVisible] = useState(false);
  const [sweetAlertTitle, setSweetAlertTitle] = useState('');
  const [sweetAlertMessage, setSweetAlertMessage] = useState('');
  const [sweetAlertType, setSweetAlertType] = useState<'success' | 'error' | 'warning' | 'info'>(
    'success'
  );

  const showSweetAlert = (opts: {
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  }) => {
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
      sender: isFromMe ? 'Me' : selectedContact?.initials || 'CT',
      text: row.transcription || row.content || (isVoice ? 'Voice message' : ''),
      time: created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      _rawTs: row.created_at || new Date().toISOString(),
      status: 'sent',
      isVoice,
      duration: isVoice ? durationStr : undefined,
      audioUrl: isVoice ? row.file_url || undefined : undefined,
    };
  };

  // Map a DB row from site messages (stored in messages table with site_id) into a UI Message
  const mapSiteRowToMessage = (row: any): Message => {
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
      text: row.transcription || row.content || (isVoice ? 'Voice message' : ''),
      time: created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      _rawTs: row.created_at || new Date().toISOString(),
      status: 'sent',
      isVoice,
      duration: isVoice ? durationStr : undefined,
      audioUrl: isVoice ? row.file_url || undefined : undefined,
    };
  };

  const fetchMessagesForConversation = async (
    conversationId: string | null
  ): Promise<Message[]> => {
    try {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch messages:', error);
        return [];
      }

      const mapped = (data || []).map(mapRowToMessage) as Message[];

      // Mark all unread messages in this conversation that were NOT sent by admin as read
      // Use auth.getUser() directly to avoid stale closure on currentUserId state
      try {
        const { data: authData } = await supabase.auth.getUser();
        const meId = authData?.user?.id;
        if (meId) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', conversationId)
            .neq('sender_id', meId)
            .not('is_read', 'is', true);
        }
      } catch (markErr) {
        console.warn('Failed to mark messages as read:', markErr);
      }

      return mapped;
    } catch (e) {
      console.error('Error fetching messages:', e);
      return [];
    }
  };

  const fetchSiteMessages = async (siteId: string | null): Promise<Message[]> => {
    try {
      if (!siteId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch group messages:', error);
        return [];
      }

      return (data || []).map(mapSiteRowToMessage) as Message[];
    } catch (e) {
      console.error('Error fetching site messages:', e);
      return [];
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
        ? Array.from(
            new Set(
              contactRows.map((row: any) => row.contact_id).filter((id: string | null) => !!id)
            )
          )
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
            online: user.status === 'online',
            userId: user.id,
          } as Contact;
        })
        .filter((c: Contact | null): c is Contact => c !== null);

      // Fetch all sites so they appear as Team chats in Contacts
      let siteContacts: Contact[] = [];
      try {
        const { data: siteRows, error: sitesError } = await supabase
          .from('sites')
          .select('id, name')
          .order('created_at', { ascending: false });

        if (sitesError) {
          console.error('Error fetching sites for team chats:', sitesError);
        } else if (siteRows) {
          siteContacts = (siteRows as any[]).map(
            (row: any, index: number) =>
              ({
                id: Number.MAX_SAFE_INTEGER - index, // ensure unique numeric key
                name: row.name || 'Team',
                members: null,
                location: 'Team',
                initials: getInitials(row.name || 'Team'),
                color: getRandomColor(),
                online: false,
                isGroup: true,
                siteId: row.id as string,
              }) as Contact
          );
        }
      } catch (groupError) {
        console.error('Unexpected error loading sites for team chats:', groupError);
      }

      const allContacts = [...dbContacts, ...siteContacts];
      setContacts(allContacts);
      // Fetch last messages for direct contacts
      fetchLastMessagesForContacts(dbContacts);
    } catch (e) {
      console.error('Unexpected error loading contacts from Supabase:', e);
    }
  };

  // Fetch last messages for each direct contact (for contact list preview)
  const fetchLastMessagesForContacts = async (directContacts: Contact[]) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const meId = authData?.user?.id;
      if (!meId) return;

      const contactUserIds = directContacts.map((c) => c.userId).filter((id): id is string => !!id);

      if (contactUserIds.length === 0) return;

      // Fetch all conversations involving the admin
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, user_one, user_two');

      const myConversations = (conversations || []).filter(
        (conv: any) => conv.user_one === meId || conv.user_two === meId
      );

      // Build a map: contactUserId -> [conversationId, ...]
      const convMap = new Map<string, string[]>();
      myConversations.forEach((conv: any) => {
        const otherId = conv.user_one === meId ? conv.user_two : conv.user_one;
        if (!convMap.has(otherId)) convMap.set(otherId, []);
        convMap.get(otherId)!.push(conv.id);
      });

      // Build reverse map: conversationId -> contact.id for realtime lookups
      const reverseMap = new Map<string, string>();

      const map: Record<string, { text: string; time: string; unreadCount: number } | null> = {};

      await Promise.all(
        directContacts.map(async (contact) => {
          if (!contact.userId) {
            map[String(contact.id)] = null;
            return;
          }
          const convIds = convMap.get(contact.userId);
          if (!convIds || convIds.length === 0) {
            map[String(contact.id)] = null;
            return;
          }

          // Register all conversation IDs for this contact in the reverse map
          convIds.forEach((cid) => reverseMap.set(cid, String(contact.id)));

          // Fetch latest message across all conversations for this contact
          const results = await Promise.all(
            convIds.map((cid) =>
              supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', cid)
                .order('created_at', { ascending: false })
                .limit(1)
            )
          );

          const latest = results
            .flatMap((r) => r.data || [])
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          if (latest.length > 0) {
            const last = latest[0];
            const isVoice = typeof last.file_url === 'string' && last.file_url.length > 0;
            const text = isVoice ? '🎤 Voice message' : last.transcription || 'Message';
            const time = new Date(last.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            // Count unread messages from the other user across all their conversations
            let unreadCount = 0;
            try {
              const unreadResults = await Promise.all(
                convIds.map((cid) =>
                  supabase
                    .from('messages')
                    .select('id')
                    .eq('conversation_id', cid)
                    .not('is_read', 'is', true)
                    .neq('sender_id', meId!)
                )
              );
              unreadCount = unreadResults.reduce((sum, r) => sum + (r.data ? r.data.length : 0), 0);
            } catch (_) {}

            map[String(contact.id)] = { text, time, unreadCount };
          } else {
            map[String(contact.id)] = null;
          }
        })
      );

      setLastMessagesMap(map);
      convToContactIdRef.current = reverseMap;
    } catch (e) {
      console.error('Error fetching last messages for contacts:', e);
    }
  };

  // Fetch users (for adding contacts)
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

  // Initial load
  useEffect(() => {
    loadContactsFromDb();
  }, []);

  // Unlock browser audio autoplay on first user interaction.
  // We create an AudioContext here because once it is in 'running' state it
  // stays unlocked across async/await boundaries — unlike HTMLAudioElement
  // which requires the play() call to be synchronously inside a user gesture.
  useEffect(() => {
    const unlock = async () => {
      if (audioUnlockedRef.current) return;
      audioUnlockedRef.current = true;
      try {
        const AudioCtx = (window.AudioContext ||
          (window as any).webkitAudioContext) as typeof AudioContext;
        const ctx = new AudioCtx();
        await ctx.resume();
        audioContextRef.current = ctx;
      } catch (e) {
        // Fallback: at least unblock HTMLAudioElement by playing silent audio
        try {
          const silent = new Audio(
            'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
          );
          silent.volume = 0;
          silent.play().catch(() => {});
        } catch (_) {}
      }
    };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  // Keep selectedContactRef in sync for use inside real-time callbacks
  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  // Keep contactsRef in sync so real-time callbacks always have the latest list
  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  // Real-time online status updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-contact-user-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users' },
        (payload: any) => {
          const updated = payload.new;
          if (!updated?.id) return;
          setContacts((prev) =>
            prev.map((c) =>
              c.userId === updated.id ? { ...c, online: updated.status === 'online' } : c
            )
          );
        }
      )
      .subscribe();

    statusChannelRef.current = channel;

    return () => {
      if (statusChannelRef.current) {
        try {
          supabase.removeChannel(statusChannelRef.current);
        } catch (e) {}
        statusChannelRef.current = null;
      }
    };
  }, []);

  // Real-time last-message preview updates
  const lastMessagesChannelRef = useRef<any>(null);
  useEffect(() => {
    const channel = supabase
      .channel('admin-contact-last-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          const newMsg = payload.new;
          if (!newMsg?.sender_id) return;

          (async () => {
            try {
              const { data: authData } = await supabase.auth.getUser();
              const meId = authData?.user?.id;
              if (!meId) return;

              // Skip messages that don't involve the admin at all
              const senderIsMe = newMsg.sender_id === meId;
              const receiverIsMe = newMsg.receiver_id === meId;
              const knownConv =
                newMsg.conversation_id && convToContactIdRef.current.has(newMsg.conversation_id);
              if (!senderIsMe && !receiverIsMe && !knownConv) return;

              // Resolve which contact this message belongs to
              // 1. Try the conversation reverse-map (most reliable)
              let contactId: string | undefined = newMsg.conversation_id
                ? convToContactIdRef.current.get(newMsg.conversation_id)
                : undefined;

              // 2. Fall back to matching by the OTHER user's ID via contactsRef
              if (!contactId) {
                const otherUserId = senderIsMe ? newMsg.receiver_id : newMsg.sender_id;
                const found = contactsRef.current.find((c) => c.userId === otherUserId);
                if (found) {
                  contactId = String(found.id);
                  // Register for future messages from this conversation
                  if (newMsg.conversation_id) {
                    convToContactIdRef.current.set(newMsg.conversation_id, contactId);
                  }
                }
              }

              if (!contactId) return;

              const isVoice = typeof newMsg.file_url === 'string' && newMsg.file_url.length > 0;
              const text = isVoice
                ? '🎤 Voice message'
                : newMsg.transcription || newMsg.content || 'Message';
              const time = new Date(newMsg.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const finalContactId = contactId;

              setLastMessagesMap((prev) => {
                const existing = prev[finalContactId];
                const isContactOpen =
                  selectedContactRef.current &&
                  String(selectedContactRef.current.id) === finalContactId;
                const prevUnread = existing?.unreadCount ?? 0;
                const newUnread = isContactOpen ? 0 : !senderIsMe ? prevUnread + 1 : prevUnread;
                return {
                  ...prev,
                  [finalContactId]: { text, time, unreadCount: newUnread },
                };
              });

              // Autoplay incoming voice messages that arrive while the contact
              // is NOT currently open (the per-contact subscription handles it
              // when the conversation panel is already visible).
              if (isVoice && !senderIsMe) {
                const isContactOpen =
                  selectedContactRef.current &&
                  String(selectedContactRef.current.id) === finalContactId;
                if (!isContactOpen && autoPlayVoiceRef.current) {
                  autoPlayVoiceRef.current(newMsg.id, newMsg.file_url);
                }
              }
            } catch (e) {
              console.warn('Failed to update last message preview:', e);
            }
          })();
        }
      )
      .subscribe();

    lastMessagesChannelRef.current = channel;
    return () => {
      if (lastMessagesChannelRef.current) {
        try {
          supabase.removeChannel(lastMessagesChannelRef.current);
        } catch (e) {}
        lastMessagesChannelRef.current = null;
      }
    };
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
    const ticker = setInterval(() => setNow(new Date()), 30000);
    return () => {
      clearInterval(ticker);
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
    const contactUserId = selectedContact?.isGroup ? null : selectedContact?.userId || null;
    const siteId = selectedContact?.isGroup ? selectedContact.siteId || null : null;

    if (messagesChannelRef.current) {
      try {
        supabase.removeChannel(messagesChannelRef.current);
      } catch (e) {
        try {
          messagesChannelRef.current.unsubscribe();
        } catch (err) {}
      }
      messagesChannelRef.current = null;
    }

    // Clear messages immediately so the previous contact's messages never bleed
    // into the newly selected contact's chat while the fetch is in-flight.
    setMessagesList([]);

    if (!contactUserId && !siteId) {
      return;
    }

    // Guard against race conditions: if the contact changes before the async
    // work finishes, this flag is set to true and all state updates are skipped.
    let cancelled = false;

    (async () => {
      try {
        // Capture stable admin ID once for all realtime callbacks (avoids stale closure)
        const { data: authSnap0 } = await supabase.auth.getUser();
        if (cancelled) return;
        const stableAdminId = authSnap0?.user?.id ?? currentUserId;

        if (siteId) {
          const siteMsgs = await fetchSiteMessages(siteId);
          if (cancelled) return;
          setMessagesList(siteMsgs);

          const channelName = `site_messages_${siteId}`;
          const channel = supabase
            .channel(channelName)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `site_id=eq.${siteId}`,
              },
              (payload: any) => {
                const newRow = payload.new;
                // Skip own messages — they're already added optimistically in sendMessage
                if (stableAdminId && newRow.sender_id === stableAdminId) return;
                setMessagesList((prev) => {
                  if (prev.some((m) => m.id === String(newRow.id))) return prev;
                  return [...prev, mapSiteRowToMessage(newRow)];
                });
              }
            )
            .subscribe();

          messagesChannelRef.current = channel;
        } else if (contactUserId) {
          const conversationId = await getOrCreateConversation(contactUserId);
          if (cancelled) return;
          if (!conversationId) {
            setMessagesList([]);
            return;
          }

          // Also register the new conversation in the reverse-lookup map so the
          // last-message preview subscription can route messages correctly.
          const contactIdStr = selectedContact ? String(selectedContact.id) : null;
          if (contactIdStr) {
            convToContactIdRef.current.set(conversationId, contactIdStr);
          }

          const msgs = await fetchMessagesForConversation(conversationId);
          if (cancelled) return;
          setMessagesList(msgs);

          const channelName = `messages_conversation_${conversationId}`;
          const channel = supabase
            .channel(channelName)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`,
              },
              (payload: any) => {
                const newRow = payload.new;
                // Skip own messages — they're already added optimistically in sendMessage
                if (stableAdminId && newRow.sender_id === stableAdminId) return;
                setMessagesList((prev) => {
                  if (prev.some((m) => m.id === String(newRow.id))) return prev;
                  return [...prev, mapRowToMessage(newRow)];
                });
                // Admin is actively viewing — mark as read immediately
                if (stableAdminId) {
                  supabase
                    .from('messages')
                    .update({ is_read: true })
                    .eq('id', newRow.id)
                    .then(() => {});
                }
                // Autoplay incoming voice messages (employee → admin direction only)
                if (newRow.file_url && autoPlayVoiceRef.current) {
                  autoPlayVoiceRef.current(newRow.id, newRow.file_url);
                }
              }
            )
            .subscribe();

          messagesChannelRef.current = channel;
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Failed to setup messages realtime subscription:', e);
          setMessagesList([]);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (messagesChannelRef.current) {
        try {
          supabase.removeChannel(messagesChannelRef.current);
        } catch (e) {
          try {
            messagesChannelRef.current.unsubscribe();
          } catch (err) {}
        }
        messagesChannelRef.current = null;
      }
    };
    // Re-run whenever the selected contact OR the current user id changes so that
    // mapRowToMessage always has the correct sender info in its closure.
  }, [selectedContact, currentUserId]);

  // Audio recording
  const startRecording = () => {
    if (!selectedContact) {
      alert('Please select a contact or group before recording a message.');
      return;
    }
    setIsRecording(true);
    setRecordingTime(0);
    recordingInterval.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);

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
              _rawTs: now.toISOString(),
              status: 'Sent',
              isVoice: true,
              duration: formatRecordingTime(recordingTime),
              audioUrl: dataUrl,
            };

            const dbRow = selectedContact?.isGroup
              ? await saveSiteMessageToDb(baseMessage)
              : await saveMessageToDb(baseMessage);

            if (dbRow) {
              const mapped = selectedContact?.isGroup
                ? mapSiteRowToMessage(dbRow)
                : mapRowToMessage(dbRow);
              setMessagesList((prev) => {
                if (prev.some((m) => m.id === mapped.id)) return prev;
                return [...prev, mapped];
              });
            }
          } catch (e) {
            console.error('Failed to finalize recording:', e);
          }
        };

        mr.stop();
        try {
          ref.stream.getTracks().forEach((t: any) => t.stop());
        } catch (e) {}
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
    console.log(
      'Sending message to contact:',
      selectedContact.name,
      'userId:',
      selectedContact.userId
    );
    (async () => {
      const now = new Date();
      const localMessage: Message = {
        id: `local-${Date.now()}`,
        sender: 'Me',
        text,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        _rawTs: now.toISOString(),
        status: 'Sent',
        isVoice: false,
      };
      setTranscript('');
      setMessagesList((prev) => [...prev, localMessage]);
      try {
        const dbRow = selectedContact?.isGroup
          ? await saveSiteMessageToDb(localMessage)
          : await saveMessageToDb(localMessage);

        if (dbRow) {
          const mapped = selectedContact?.isGroup
            ? mapSiteRowToMessage(dbRow)
            : mapRowToMessage(dbRow);
          setMessagesList((prev) => {
            const replaced = prev.map((m) => (m.id === localMessage.id ? mapped : m));

            const seen = new Set<string>();
            return replaced.filter((m) => {
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
      try {
        audioPlayerRef.current.pause();
      } catch (e) {}
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
    audio.play().catch((e) => {
      console.error('Playback failed', e);
      setCurrentlyPlayingId(null);
    });
  };

  // Auto-play an incoming voice message. Re-fetches the full DB row first because
  // realtime payloads truncate large base64 file_url values.
  // Uses AudioContext (stays unlocked across async/await) with HTMLAudioElement fallback.
  const autoPlayVoiceMessage = async (msgId: string | number, fileUrl?: string | null) => {
    const id = String(msgId);
    if (lastAutoPlayedIdRef.current === id) return;
    lastAutoPlayedIdRef.current = id;

    // Re-fetch to guarantee the full (non-truncated) base64 URL
    let url = typeof fileUrl === 'string' && fileUrl.length > 10 ? fileUrl : null;
    try {
      const { data: fullRow } = await supabase
        .from('messages')
        .select('file_url')
        .eq('id', msgId)
        .single();
      if (fullRow?.file_url) url = fullRow.file_url;
    } catch (e) {
      console.warn('Could not re-fetch voice message for autoplay:', e);
    }

    if (!url) {
      lastAutoPlayedIdRef.current = null;
      return;
    }

    // Stop anything currently playing
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = '';
      } catch (e) {}
      audioPlayerRef.current = null;
    }

    const ctx = audioContextRef.current;
    if (ctx && ctx.state === 'running') {
      // Path A: Web Audio API — fully async-safe, not blocked by autoplay policy
      try {
        const base64 = url.includes(',') ? url.split(',')[1] : url;
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const buffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setCurrentlyPlayingId(null);
        source.start(0);
        setCurrentlyPlayingId(id);
        return;
      } catch (e) {
        console.warn('AudioContext decode/play failed, falling back to HTMLAudioElement:', e);
      }
    }

    // Path B: HTMLAudioElement fallback
    const audio = new Audio(url);
    audioPlayerRef.current = audio;
    setCurrentlyPlayingId(id);
    audio.onended = () => {
      setCurrentlyPlayingId(null);
      audioPlayerRef.current = null;
    };
    audio.play().catch((e) => {
      console.warn('Autoplay failed:', e);
      setCurrentlyPlayingId(null);
      audioPlayerRef.current = null;
      lastAutoPlayedIdRef.current = null;
    });
  };
  autoPlayVoiceRef.current = autoPlayVoiceMessage;

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

      console.log('Looking for conversation between:', meId, 'and', contactUserId);

      // Find existing conversation - fetch all and filter client-side to avoid 406 errors
      const { data: allConversations, error: findError } = await supabase
        .from('conversations')
        .select('id, user_one, user_two');

      if (findError) {
        console.error('Error looking up conversation:', findError);
        return null;
      }

      console.log('All conversations:', allConversations);

      // Find the matching conversation
      if (allConversations && allConversations.length > 0) {
        const matching = allConversations.find(
          (conv: any) =>
            (conv.user_one === meId && conv.user_two === contactUserId) ||
            (conv.user_one === contactUserId && conv.user_two === meId)
        );
        if (matching) {
          console.log('Found existing conversation:', matching.id);
          return matching.id as string;
        }
      }

      // Create new conversation if not found
      console.log('Creating new conversation');
      const userOne = meId < contactUserId ? meId : contactUserId;
      const userTwo = meId < contactUserId ? contactUserId : meId;

      const { data: created, error: createError } = await supabase
        .from('conversations')
        .insert([{ user_one: userOne, user_two: userTwo }])
        .select('id')
        .single();

      if (createError || !created) {
        console.error('Error creating conversation:', createError);
        return null;
      }
      console.log('Created new conversation:', created.id);
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
      console.log('Saving message to conversation:', conversationId, 'for user:', targetUserId);
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
        file_url: message.isVoice ? message.audioUrl || '' : null,
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

  const saveSiteMessageToDb = async (message: Message) => {
    try {
      const siteId = selectedContact?.isGroup ? selectedContact.siteId || null : null;
      if (!siteId) {
        console.warn('No selected site/team; skipping save to site messages');
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
        site_id: siteId,
        sender_id: meId,
        receiver_id: null,
        file_url: message.isVoice ? message.audioUrl || '' : null,
        transcription: !message.isVoice ? message.text : null,
        duration_ms: durationMs,
      };

      const { data, error } = await supabase.from('messages').insert([payload]).select();
      if (error) {
        console.error('Supabase messages insert error (site):', error);
        throw error;
      }
      if (data && data[0]) return data[0];
      return null;
    } catch (e) {
      console.error('Failed to save site message to Supabase:', e);
      return null;
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${padZero(secs)}`;
  };

  const openContactsModal = () => {
    setSelectedMembers([]);
    setEmployeeSearch('');
    fetchUsers();
    setShowContactsModal(true);
  };

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAdminUser = (user: User) => {
    const role = (user.role || '').toLowerCase().trim();
    return role === 'admin' || role === 'administrator' || role.includes('admin');
  };

  const filteredUsers = users.filter((user) => {
    if (isAdminUser(user)) return false;
    const q = employeeSearch.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(q) ||
      false ||
      user.email.toLowerCase().includes(q) ||
      (user.role || '').toLowerCase().includes(q)
    );
  });

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-1 flex-row">
        {/* ─── LEFT: Contacts Panel ─── */}
        <View
          className={`${!showContactList ? 'hidden lg:flex' : 'flex'} flex-1 flex-col border-r border-gray-100 bg-white lg:w-80 lg:flex-none`}>
          {/* Panel header */}
          <View className="border-b border-gray-100 bg-white px-4 pb-3 pt-5">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  className="h-8 w-8 items-center justify-center rounded-xl bg-gray-100 lg:hidden"
                  onPress={() => setIsDrawerOpen(true)}>
                  <Ionicons name="menu" size={20} color="#374151" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-900">Messages</Text>
                <View className="rounded-full bg-emerald-100 px-2 py-0.5">
                  <Text className="text-xs font-bold text-emerald-700">{contacts.length}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1.5">
                <TouchableOpacity
                  className="h-8 w-8 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50"
                  onPress={openContactsModal}>
                  <Ionicons name="person-add-outline" size={16} color="#10b981" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="relative h-8 w-8 items-center justify-center rounded-xl bg-gray-100"
                  onPress={() => setIsNotificationOpen(true)}>
                  <Ionicons name="notifications-outline" size={16} color="#6b7280" />
                  <View className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
                </TouchableOpacity>
              </View>
            </View>
            {/* Search bar */}
            <View className="flex-row items-center rounded-xl bg-gray-100 px-3 py-2.5">
              <Ionicons name="search" size={15} color="#9ca3af" />
              <TextInput
                className="ml-2 flex-1 text-sm text-gray-800"
                placeholder="Search contacts..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={15} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Contact list */}
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {filteredContacts.length === 0 ? (
              <View className="items-center px-6 py-14">
                <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                  <Ionicons name="people-outline" size={26} color="#9ca3af" />
                </View>
                <Text className="text-center text-sm font-semibold text-gray-700">
                  No contacts found
                </Text>
                <Text className="mt-1 text-center text-xs leading-5 text-gray-400">
                  {searchQuery ? 'Try a different search term' : 'Add contacts to get started'}
                </Text>
              </View>
            ) : (
              <>
                {/* Teams section */}
                {filteredContacts.some((c) => c.isGroup) && (
                  <View>
                    <View className="px-4 pb-1.5 pt-4">
                      <Text className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Teams
                      </Text>
                    </View>
                    {filteredContacts
                      .filter((c) => c.isGroup)
                      .map((contact) => {
                        const isSelected = selectedContact?.id === contact.id;
                        return (
                          <TouchableOpacity
                            key={contact.id}
                            className={`mx-2 mb-0.5 flex-row items-center rounded-xl px-3 py-2.5 ${isSelected ? 'bg-emerald-50' : ''}`}
                            onPress={() => {
                              setSelectedContact(contact);
                              setShowContactList(false);
                            }}>
                            <View className="relative mr-3 shrink-0">
                              <View
                                className="h-11 w-11 items-center justify-center rounded-2xl"
                                style={{ backgroundColor: contact.color }}>
                                <Ionicons name="people" size={18} color="#1f2937" />
                              </View>
                            </View>
                            <View className="min-w-0 flex-1">
                              <Text
                                className={`text-sm font-semibold ${isSelected ? 'text-emerald-700' : 'text-gray-900'}`}
                                numberOfLines={1}>
                                {contact.name}
                              </Text>
                              <Text className="mt-0.5 text-xs font-medium text-emerald-500">
                                Team Channel
                              </Text>
                            </View>
                            {isSelected && (
                              <Ionicons name="chevron-forward" size={14} color="#10b981" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                )}

                {/* Direct messages section */}
                {filteredContacts.some((c) => !c.isGroup) && (
                  <View>
                    <View className="px-4 pb-1.5 pt-4">
                      <Text className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Direct Messages
                      </Text>
                    </View>
                    {filteredContacts
                      .filter((c) => !c.isGroup)
                      .map((contact) => {
                        const lastMsg = lastMessagesMap[String(contact.id)];
                        const isSelected = selectedContact?.id === contact.id;
                        const hasUnread = (lastMsg?.unreadCount ?? 0) > 0;
                        return (
                          <TouchableOpacity
                            key={contact.id}
                            className={`mx-2 mb-0.5 flex-row items-center rounded-xl px-3 py-2.5 ${isSelected ? 'bg-emerald-50' : ''}`}
                            onPress={() => {
                              setSelectedContact(contact);
                              setShowContactList(false);
                              setLastMessagesMap((prev) => {
                                const existing = prev[String(contact.id)];
                                if (!existing || existing.unreadCount === 0) return prev;
                                return {
                                  ...prev,
                                  [String(contact.id)]: { ...existing, unreadCount: 0 },
                                };
                              });
                            }}>
                            <View className="relative mr-3 shrink-0">
                              <View
                                className="h-11 w-11 items-center justify-center rounded-full"
                                style={{ backgroundColor: contact.color }}>
                                <Text className="text-sm font-bold text-gray-800">
                                  {contact.initials}
                                </Text>
                              </View>
                              {contact.online && (
                                <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                              )}
                            </View>
                            <View className="min-w-0 flex-1">
                              <View className="flex-row items-center justify-between">
                                <Text
                                  className={`mr-2 flex-1 text-sm ${hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}
                                  numberOfLines={1}>
                                  {contact.name}
                                </Text>
                                {lastMsg && (
                                  <Text
                                    className={`shrink-0 text-[10px] ${hasUnread ? 'font-bold text-emerald-600' : 'text-gray-400'}`}>
                                    {lastMsg.time}
                                  </Text>
                                )}
                              </View>
                              <View className="mt-0.5 flex-row items-center justify-between">
                                {lastMsg ? (
                                  <Text
                                    className={`mr-2 flex-1 text-xs ${hasUnread ? 'font-semibold text-gray-700' : 'text-gray-400'}`}
                                    numberOfLines={1}>
                                    {lastMsg.text}
                                  </Text>
                                ) : (
                                  <Text className="text-xs text-gray-400">
                                    {contact.online ? '✓ Online' : contact.location}
                                  </Text>
                                )}
                                {hasUnread && (
                                  <View className="h-[18px] min-w-[18px] items-center justify-center rounded-full bg-emerald-500 px-1">
                                    <Text className="text-[9px] font-bold text-white">
                                      {lastMsg!.unreadCount > 9 ? '9+' : lastMsg!.unreadCount}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>

        {/* ─── RIGHT: Chat Panel ─── */}
        <View
          className={`${showContactList ? 'hidden lg:flex' : 'flex'} flex-1 flex-col bg-slate-50`}>
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <View className="flex-row items-center border-b border-gray-100 bg-white px-5 py-3.5 shadow-sm">
                <TouchableOpacity
                  className="mr-3 h-8 w-8 items-center justify-center rounded-xl bg-gray-100 lg:hidden"
                  onPress={() => setShowContactList(true)}>
                  <Ionicons name="chevron-back" size={18} color="#374151" />
                </TouchableOpacity>
                <View
                  className="mr-3 h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: selectedContact.color }}>
                  {selectedContact.isGroup ? (
                    <Ionicons name="people" size={18} color="#1f2937" />
                  ) : (
                    <Text className="text-sm font-bold text-gray-800">
                      {selectedContact.initials}
                    </Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold leading-tight text-gray-900">
                    {selectedContact.name}
                  </Text>
                  <View className="mt-0.5 flex-row items-center gap-1.5">
                    {selectedContact.isGroup ? (
                      <>
                        <Ionicons name="radio-outline" size={11} color="#10b981" />
                        <Text className="text-xs font-medium text-emerald-600">Team Channel</Text>
                      </>
                    ) : selectedContact.online ? (
                      <>
                        <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <Text className="text-xs font-medium text-emerald-600">Online</Text>
                      </>
                    ) : (
                      <>
                        <View className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                        <Text className="text-xs text-gray-400">{selectedContact.location}</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>

              {/* Messages Area */}
              <ScrollView
                ref={chatScrollRef}
                className="flex-1 px-4 py-3"
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}>
                {messagesList.map((message, index) => {
                  const isMe = message.sender === 'Me';
                  const rawTs = message._rawTs || new Date().toISOString();
                  const showTimestamp = expandedMessageId === message.id;

                  const prevMsg = index === 0 ? null : messagesList[index - 1];
                  const prevRawTs = prevMsg ? prevMsg._rawTs || prevMsg.time : null;
                  const toDay = (ts: string) => ts.slice(0, 10);
                  const showDateSep = !prevRawTs || toDay(prevRawTs) !== toDay(rawTs);
                  const dateLabel = (() => {
                    const d = new Date(rawTs);
                    const today = new Date();
                    const yesterday = new Date();
                    yesterday.setDate(today.getDate() - 1);
                    const same = (a: Date, b: Date) =>
                      a.getFullYear() === b.getFullYear() &&
                      a.getMonth() === b.getMonth() &&
                      a.getDate() === b.getDate();
                    if (same(d, today)) return 'Today';
                    if (same(d, yesterday)) return 'Yesterday';
                    return d.toLocaleDateString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    });
                  })();

                  return (
                    <View key={message.id}>
                      {showDateSep && (
                        <View className="my-4 items-center">
                          <View className="rounded-full bg-gray-200 px-4 py-0.5">
                            <Text className="text-[10px] font-semibold text-gray-500">
                              {dateLabel}
                            </Text>
                          </View>
                        </View>
                      )}
                      <View
                        className={`mb-3 flex-row ${isMe ? 'justify-end' : 'justify-start'} items-end`}>
                        {!isMe && (
                          <View
                            className="mr-2 h-7 w-7 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: selectedContact.color }}>
                            <Text className="text-[9px] font-bold text-gray-800">
                              {selectedContact.initials}
                            </Text>
                          </View>
                        )}
                        <View className="max-w-[72%]">
                          {message.isVoice ? (
                            <TouchableOpacity
                              className={`flex-row items-center gap-2 px-3.5 py-2.5 ${
                                isMe
                                  ? 'rounded-2xl rounded-br-sm bg-emerald-500'
                                  : 'rounded-2xl rounded-bl-sm border border-gray-200 bg-white shadow-sm'
                              }`}
                              onPress={() => {
                                handlePlayVoice(message);
                                setExpandedMessageId((prev) =>
                                  prev === message.id ? null : message.id
                                );
                              }}>
                              <View
                                className={`h-7 w-7 items-center justify-center rounded-full ${
                                  isMe ? 'bg-emerald-400' : 'bg-emerald-50'
                                }`}>
                                <Ionicons
                                  name={currentlyPlayingId === message.id ? 'pause' : 'play'}
                                  size={13}
                                  color={isMe ? 'white' : '#10b981'}
                                />
                              </View>
                              <Ionicons
                                name="mic"
                                size={13}
                                color={isMe ? 'rgba(255,255,255,0.75)' : '#10b981'}
                              />
                              <Text
                                className={`text-xs font-medium ${isMe ? 'text-white' : 'text-gray-700'}`}>
                                {message.duration || formatRecordingTime(recordingTime) || 'Voice'}
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() =>
                                setExpandedMessageId((prev) =>
                                  prev === message.id ? null : message.id
                                )
                              }
                              className={`px-3.5 py-2.5 ${
                                isMe
                                  ? 'rounded-2xl rounded-br-sm bg-emerald-500'
                                  : 'rounded-2xl rounded-bl-sm border border-gray-200 bg-white shadow-sm'
                              }`}>
                              <Text
                                className={`text-sm leading-5 ${isMe ? 'text-white' : 'text-gray-800'}`}>
                                {message.text}
                              </Text>
                            </TouchableOpacity>
                          )}
                          <View
                            className={`mt-0.5 flex-row items-center ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {isMe ? (
                              <Text className="text-[10px] text-gray-400">
                                {(() => {
                                  if (message.status === 'sending' || message.status === 'Sending')
                                    return 'Sending...';
                                  const diffMs = now.getTime() - new Date(rawTs).getTime();
                                  const mins = Math.floor(diffMs / 60000);
                                  if (message.status === 'read' || message.status === 'Read')
                                    return 'Seen';
                                  if (mins < 1) return 'Delivered';
                                  if (mins === 1) return '1 min ago';
                                  return `${mins}m ago`;
                                })()}
                              </Text>
                            ) : (
                              showTimestamp && (
                                <Text className="text-[10px] text-gray-400">{message.time}</Text>
                              )
                            )}
                          </View>
                        </View>
                        {isMe && <View className="ml-2 h-7 w-7 shrink-0" />}
                      </View>
                    </View>
                  );
                })}

                {messagesList.length === 0 && (
                  <View className="flex-1 items-center justify-center py-16">
                    <View className="mb-3 h-16 w-16 items-center justify-center rounded-3xl border border-emerald-100 bg-emerald-50">
                      <Ionicons name="chatbubbles-outline" size={28} color="#10b981" />
                    </View>
                    <Text className="text-sm font-semibold text-gray-700">No messages yet</Text>
                    <Text className="mt-1 text-xs text-gray-400">Start the conversation below</Text>
                  </View>
                )}
              </ScrollView>

              {/* Message Input */}
              <View className="border-t border-gray-100 bg-white px-4 pb-4 pt-3">
                {isRecording && (
                  <View className="mb-2 flex-row items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 py-1.5">
                    <View className="h-2 w-2 rounded-full bg-red-500" />
                    <Text className="text-xs font-semibold text-red-500">
                      Recording • {formatRecordingTime(recordingTime)}
                    </Text>
                  </View>
                )}
                <View className="flex-row items-center gap-2">
                  <View className="flex-1 flex-row items-center rounded-2xl bg-gray-100 px-4 py-2.5">
                    <TextInput
                      className="flex-1 text-sm text-gray-800"
                      placeholder="Type a message..."
                      placeholderTextColor="#9ca3af"
                      value={transcript}
                      onChangeText={setTranscript}
                      onSubmitEditing={() => {
                        const trimmed = transcript.trim();
                        if (trimmed.length > 0) sendMessage(trimmed);
                      }}
                    />
                  </View>
                  <TouchableOpacity
                    className={`h-10 w-10 items-center justify-center rounded-full ${isRecording ? 'bg-red-500' : 'bg-gray-200'}`}
                    onPressIn={startRecording}
                    onPressOut={stopRecording}>
                    <Ionicons name="mic" size={18} color={isRecording ? 'white' : '#6b7280'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`h-10 w-10 items-center justify-center rounded-full ${transcript.trim() ? 'bg-emerald-500' : 'bg-gray-200'}`}
                    onPress={() => {
                      const trimmed = transcript.trim();
                      if (trimmed.length > 0) sendMessage(trimmed);
                    }}>
                    <Ionicons
                      name="send"
                      size={16}
                      color={transcript.trim() ? 'white' : '#9ca3af'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            /* Welcome / empty state */
            <View className="flex-1 items-center justify-center bg-gray-50">
              <View className="items-center px-10">
                <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl border border-emerald-100 bg-emerald-50">
                  <Ionicons name="chatbubbles-outline" size={36} color="#10b981" />
                </View>
                <Text className="mb-2 text-center text-lg font-bold text-gray-900">
                  Contact Management
                </Text>
                <Text className="text-center text-sm leading-6 text-gray-400">
                  Select a contact to start chatting, or use the button in the panel to add
                  contacts.
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ─── NOTIFICATIONS MODAL ─── */}
      <Modal visible={isNotificationOpen} transparent animationType="fade">
        <Pressable
          className="flex-1 items-center justify-center bg-black/30"
          onPress={() => setIsNotificationOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="w-80 overflow-hidden rounded-2xl bg-white shadow-xl">
              <View className="flex-row items-center gap-2 bg-emerald-500 px-5 py-4">
                <Ionicons name="notifications-outline" size={18} color="white" />
                <Text className="text-base font-bold text-white">Notifications</Text>
              </View>
              <View className="items-center px-6 py-8">
                <Ionicons name="notifications-off-outline" size={40} color="#d1d5db" />
                <Text className="mt-3 text-center text-sm text-gray-400">No new notifications</Text>
              </View>
              <View className="px-5 pb-5">
                <TouchableOpacity
                  className="items-center rounded-xl bg-gray-100 py-2.5"
                  onPress={() => setIsNotificationOpen(false)}>
                  <Text className="text-sm font-semibold text-gray-700">Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── ADD CONTACTS MODAL ─── */}
      <Modal visible={showContactsModal} transparent animationType="fade">
        <Pressable
          className="flex-1 items-center justify-center bg-black/30 p-4"
          onPress={() => setShowContactsModal(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="w-96 overflow-hidden rounded-2xl bg-white shadow-xl">
              {/* Modal Header */}
              <View className="flex-row items-center justify-between bg-emerald-500 px-5 py-4">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="person-add-outline" size={18} color="white" />
                  <Text className="text-base font-bold text-white">Add Contact</Text>
                </View>
                <TouchableOpacity
                  className="h-8 w-8 items-center justify-center rounded-xl bg-white/20"
                  onPress={() => {
                    setShowContactsModal(false);
                    setEmployeeSearch('');
                  }}>
                  <Ionicons name="close" size={17} color="white" />
                </TouchableOpacity>
              </View>

              <View className="p-5">
                <View className="mb-3 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <Ionicons name="search" size={14} color="#9ca3af" />
                  <TextInput
                    className="ml-2 flex-1 text-sm text-gray-800"
                    placeholder="Search by name, email, or role..."
                    placeholderTextColor="#9ca3af"
                    value={employeeSearch}
                    onChangeText={setEmployeeSearch}
                  />
                </View>

                <ScrollView className="mb-3 max-h-64" showsVerticalScrollIndicator={false}>
                  {filteredUsers.length === 0 ? (
                    <View className="items-center py-6">
                      <Ionicons name="person-outline" size={28} color="#d1d5db" />
                      <Text className="mt-2 text-center text-xs text-gray-400">
                        No employees found
                      </Text>
                    </View>
                  ) : (
                    filteredUsers.map((user) => {
                      const exists = contacts.some((c) => c.userId === user.id);
                      return (
                        <View
                          key={user.id}
                          className="mb-1.5 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 p-3">
                          <View
                            className="mr-3 h-9 w-9 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: user.color }}>
                            <Text className="text-xs font-bold text-gray-800">{user.initials}</Text>
                          </View>
                          <View className="min-w-0 flex-1">
                            <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                              {user.full_name || 'Unnamed'}
                            </Text>
                            <Text className="mt-0.5 text-xs text-gray-400" numberOfLines={1}>
                              {user.email}
                            </Text>
                          </View>
                          <TouchableOpacity
                            className={`ml-2 rounded-lg px-3 py-1.5 ${exists ? 'bg-gray-100' : 'bg-emerald-500'}`}
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
                              }
                            }}>
                            <Text
                              className={`text-xs font-semibold ${exists ? 'text-gray-500' : 'text-white'}`}>
                              {exists ? 'Added' : 'Add'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </ScrollView>

                <TouchableOpacity
                  className="items-center rounded-xl border border-gray-200 py-2.5"
                  onPress={() => setShowContactsModal(false)}>
                  <Text className="text-sm font-semibold text-gray-600">Close</Text>
                </TouchableOpacity>
              </View>
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
