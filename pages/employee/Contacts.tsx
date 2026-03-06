import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, StatusBar, ActivityIndicator, RefreshControl, Modal, FlatList, KeyboardAvoidingView, Platform, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import  supabase, { searchUsers, addContact }  from '../../utils/supabase'; // adjust path to your supabase client
import Chat from './Chat';

interface Contact {
  id: string;
  name: string;
  role: string;
  initials: string;
  status: 'online' | 'offline' | 'busy';
  avatar_color: string;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageTimestamp?: string;
  unreadCount?: number;
  // additional fields for search
  email: string;
  phone_number?: string;
}

interface ContactsProps {
  onContactSelected?: (contact: Contact | null) => void;
  currentUserId?: string; // to exclude current user from contacts
}

type FilterType = 'all' | 'online' | 'offline' | 'teams' | 'unread';

// Helper to generate consistent avatar color from user id
const getAvatarColor = (id: string): string => {
  const colors = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#3b82f6', '#8b5cf6'];
  const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};

// Helper to get initials from full name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export default function Contacts({ onContactSelected, currentUserId }: ContactsProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Modal/search states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [modalQuery, setModalQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [allModalUsers, setAllModalUsers] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(currentUserId || null);
  // Track when each contact's chat was last opened (contactId -> ISO timestamp)
  const [lastReadMap, setLastReadMap] = useState<Record<string, string>>({});
  const [lastReadMapLoaded, setLastReadMapLoaded] = useState(false);
  const LAST_READ_STORAGE_KEY = 'contacts_last_read_map';

  const messagesSubscriptionRef = useRef<any>(null);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(600)).current;

  // Load persisted lastReadMap from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(LAST_READ_STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            setLastReadMap(JSON.parse(stored));
          } catch (_) {}
        }
      })
      .catch(() => {})
      .finally(() => setLastReadMapLoaded(true));
  }, []);

  // Fetch contacts from Supabase
  // silent=true: skip loading spinner (used by background/subscription-triggered calls)
  const fetchContacts = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      if (!activeChatUserId) {
        console.log('No active chat user ID');
        setContacts([]);
        if (!silent) setLoading(false);
        if (!silent) setRefreshing(false);
        return;
      }

      console.log('Fetching contacts for user:', activeChatUserId);

      // 1. Fetch contacts from the `contacts` table (explicitly added contacts)
      const { data: contactRows, error: contactsError } = await supabase
        .from('contacts')
        .select('contact_id')
        .eq('user_id', activeChatUserId);

      if (contactsError) console.warn('Error fetching contacts table:', contactsError);

      const explicitContactIds = new Set<string>(
        (contactRows || []).map((r: any) => r.contact_id).filter(Boolean)
      );

      // 2. Fetch all conversations involving the current user
      const { data: conversations, error: conversationError } = await supabase
        .from('conversations')
        .select('id,user_one,user_two');

      if (conversationError) throw conversationError;

      console.log('All conversations fetched:', conversations);

      // Filter conversations where current user is involved
      const myConversations = (conversations || []).filter((conv: any) => 
        conv.user_one === activeChatUserId || conv.user_two === activeChatUserId
      );

      console.log('My conversations (filtered):', myConversations);

      // Extract unique user IDs from conversations (get the other user in each conversation)
      const contactUserIds = new Set<string>(explicitContactIds);
      (myConversations || []).forEach((conv: any) => {
        const otherUserId = conv.user_one === activeChatUserId ? conv.user_two : conv.user_one;
        if (otherUserId) {
          contactUserIds.add(otherUserId);
        }
      });

      console.log('Contact user IDs (contacts + conversations):', Array.from(contactUserIds));

      // If no contacts or conversations, show empty list
      if (contactUserIds.size === 0) {
        console.log('No contacts or conversations found');
        setContacts([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch details for users in conversations
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, phone_number, role, profile_picture_url, status')
        .in('id', Array.from(contactUserIds))
        .order('full_name');

      if (usersError) throw usersError;

      console.log('Users data fetched:', usersData);

      // Transform to Contact interface
      const now = new Date();
      const onlineThreshold = 5 * 60 * 1000; // 5 minutes in ms

      const formattedContacts: Contact[] = (usersData || []).map(user => {
        // Determine online status: prefer explicit `status` column if present
        let status: 'online' | 'offline' | 'busy' = 'offline';
        if (user.status === 'online') {
          status = 'online';
        } else if (user.status === 'busy') {
          status = 'busy';
        }

        return {
          id: user.id,
          name: user.full_name || 'Unknown',
          role: user.role || 'Employee',
          initials: getInitials(user.full_name || 'Unknown'),
          status,
          avatar_color: getAvatarColor(user.id),
          email: user.email,
          phone_number: user.phone_number,
          // Placeholder for message data (to be replaced with real messages later)
          lastMessage: undefined,
          lastMessageTime: undefined,
          unreadCount: 0,
        };
      });

      // Fetch last messages for each contact
      if (activeChatUserId) {
        // Store ALL conversation IDs per contact (handles duplicate conversations
        // created by admin with sorted UUIDs vs employee with unsorted UUIDs)
        const conversationMap = new Map<string, string[]>();
        (myConversations || []).forEach((conv: any) => {
          const otherUserId = conv.user_one === activeChatUserId ? conv.user_two : conv.user_one;
          if (!conversationMap.has(otherUserId)) {
            conversationMap.set(otherUserId, []);
          }
          conversationMap.get(otherUserId)!.push(conv.id);
        });

        const contactsWithMessages = await Promise.all(
          formattedContacts.map(async (contact) => {
            try {
              const conversationIds = conversationMap.get(contact.id);
              if (!conversationIds || conversationIds.length === 0) {
                console.log(`No conversation for contact ${contact.name} (ID: ${contact.id})`);
                return contact;
              }

              console.log(`Fetching messages for contact ${contact.name}, conversationIds:`, conversationIds);

              // Fetch latest message across ALL conversations for this contact
              // (handles the case where admin and employee created different conversation records)
              const allMessageResults = await Promise.all(
                conversationIds.map(cid =>
                  supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', cid)
                    .order('created_at', { ascending: false })
                    .limit(1)
                )
              );

              // Collect all latest messages and pick the most recent one
              const latestMessages = allMessageResults
                .flatMap(r => r.data || [])
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

              console.log(`Messages for ${contact.name}:`, latestMessages);

              if (latestMessages.length > 0) {
                const lastMsg = latestMessages[0];
                const msgText = lastMsg.transcription || lastMsg.content || 'Message';
                const created = lastMsg.created_at ? new Date(lastMsg.created_at) : new Date();

                // Count unread messages across ALL conversations for this contact.
                // Only count if this chat was opened before (lastRead exists);
                // this prevents historical messages appearing unread on first load.
                let unreadCount = 0;
                try {
                  const lastRead = lastReadMap[contact.id] || null;
                  if (lastRead) {
                    const unreadResults = await Promise.all(
                      conversationIds.map(cid =>
                        supabase
                          .from('messages')
                          .select('id')
                          .eq('conversation_id', cid)
                          .neq('sender_id', activeChatUserId)
                          .gt('created_at', lastRead)
                      )
                    );
                    unreadCount = unreadResults.reduce((sum, r) => sum + (r.data ? r.data.length : 0), 0);
                  }
                  // If lastRead is null (chat never opened), unreadCount stays 0.
                  // New unread messages accumulate via the real-time subscription.
                } catch (unreadErr) {
                  console.warn('Could not fetch unread count:', unreadErr);
                }

                console.log(`Showing message for ${contact.name}: ${msgText}, unread: ${unreadCount}`);
                return {
                  ...contact,
                  lastMessage: msgText,
                  lastMessageTime: created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  lastMessageTimestamp: lastMsg.created_at,
                  unreadCount,
                };
              }

              console.log(`No messages at all for contact ${contact.name}`);
              return { ...contact, lastMessage: undefined };
            } catch (e) {
              console.error(`Error processing contact ${contact.name}:`, e);
              return contact;
            }
          })
        );
        setContacts(contactsWithMessages);
      } else {
        setContacts(formattedContacts);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      if (!silent) Alert.alert('Error', 'Failed to load contacts');
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    // Fetch current user if not provided
    if (!activeChatUserId) {
      const fetchCurrentUser = async () => {
        try {
          const { data, error } = await supabase.auth.getUser();
          if (!error && data?.user?.id) {
            setActiveChatUserId(data.user.id);
          }
        } catch (e) {
          console.error('Failed to get current user:', e);
        }
      };
      fetchCurrentUser();
    }
  }, []);

  // Re-fetch once lastReadMap is loaded so unread counts are accurate
  useEffect(() => {
    if (lastReadMapLoaded && activeChatUserId) {
      fetchContacts();
    }
  }, [lastReadMapLoaded]);

  useEffect(() => {
    fetchContacts();

    // Optional: Subscribe to realtime updates for online status
    const subscription = supabase
      .channel('public:users')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, payload => {
        // When a user updates their status, silently refresh contacts (no loading spinner)
        if (payload.new.id !== activeChatUserId) {
          fetchContacts(true);
        }
      })
      .subscribe();

    // Subscribe to new messages to update contact list in real-time
    if (activeChatUserId) {
      messagesSubscriptionRef.current = supabase
        .channel(`user-messages:${activeChatUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            const newMsg = payload.new as any;
            
            // Only handle messages received by the current user (not sent)
            if (newMsg.receiver_id !== activeChatUserId) return;

            const senderUserId = newMsg.sender_id;
            const created = newMsg.created_at ? new Date(newMsg.created_at) : new Date();
            const msgText = newMsg.transcription || newMsg.content || '';
            const msgTime = created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            setContacts((prevContacts) => {
              const existing = prevContacts.find(c => c.id === senderUserId);

              if (existing) {
                // Update existing contact's last message + unread count
                return prevContacts.map((contact) => {
                  if (contact.id !== senderUserId) return contact;
                  return {
                    ...contact,
                    lastMessage: msgText,
                    lastMessageTime: msgTime,
                    unreadCount: (contact.unreadCount || 0) + 1,
                  };
                });
              }

              // Sender is not yet in the list — fetch their details and add them
              supabase
                .from('users')
                .select('id, email, full_name, phone_number, role, profile_picture_url, status')
                .eq('id', senderUserId)
                .single()
                .then(({ data: userData, error }) => {
                  if (error || !userData) return;
                  const newContact: Contact = {
                    id: userData.id,
                    name: userData.full_name || 'Unknown',
                    role: userData.role || 'Employee',
                    initials: getInitials(userData.full_name || 'Unknown'),
                    status: userData.status === 'online' ? 'online' : userData.status === 'busy' ? 'busy' : 'offline',
                    avatar_color: getAvatarColor(userData.id),
                    email: userData.email,
                    phone_number: userData.phone_number,
                    lastMessage: msgText,
                    lastMessageTime: msgTime,
                    unreadCount: 1,
                  };
                  setContacts(prev => {
                    // Guard against double-add if the contact was added between the check and now
                    if (prev.some(c => c.id === senderUserId)) return prev;
                    return [newContact, ...prev];
                  });
                });

              return prevContacts; // unchanged until async fetch completes
            });
          }
        )
        .subscribe();
    }

    return () => {
      subscription.unsubscribe();
      if (messagesSubscriptionRef.current) {
        messagesSubscriptionRef.current.unsubscribe();
        messagesSubscriptionRef.current = null;
      }
    };
  }, [activeChatUserId]);

  // Apply filters and search whenever contacts, searchText, or filterType changes
  useEffect(() => {
    let filtered = contacts;

    // Search by name, email, or phone number
    if (searchText.trim()) {
      const term = searchText.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(term) ||
        contact.email.toLowerCase().includes(term) ||
        (contact.phone_number && contact.phone_number.includes(term))
      );
    }

    // Apply filter type
    if (filterType === 'online') {
      filtered = filtered.filter(c => c.status === 'online');
    } else if (filterType === 'offline') {
      filtered = filtered.filter(c => c.status === 'offline');
    } else if (filterType === 'teams') {
      filtered = filtered.filter(c => c.role.toLowerCase() === 'team');
    } else if (filterType === 'unread') {
      filtered = filtered.filter(c => (c.unreadCount ?? 0) > 0);
    }

    // Sort by most recent message first; unread contacts float to the top within that order
    const byRecency = (a: Contact, b: Contact) => {
      const aTime = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0;
      const bTime = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0;
      return bTime - aTime;
    };
    filtered = [
      ...filtered.filter(c => (c.unreadCount ?? 0) > 0).sort(byRecency),
      ...filtered.filter(c => (c.unreadCount ?? 0) === 0).sort(byRecency),
    ];

    setFilteredContacts(filtered);
  }, [contacts, searchText, filterType]);

  const loadAllModalUsers = async () => {
    try {
      setSearching(true);
      const res = await searchUsers('');
      const users = (res || []).filter((u: any) => u.id !== activeChatUserId);
      setAllModalUsers(users);
      setSearchResults(users);
    } catch (err: any) {
      Alert.alert('Error', err?.message || String(err));
    } finally {
      setSearching(false);
    }
  };

  const handleAddContact = () => {
    // Reset animation values before showing
    backdropAnim.setValue(0);
    sheetAnim.setValue(600);
    setAddModalVisible(true);
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 320, easing: Easing.out(Easing.ease), useNativeDriver: false }),
      Animated.spring(sheetAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();
    loadAllModalUsers();
  };

  const closeAddModal = () => {
    setAddModalVisible(false);
    setModalQuery('');
    setSearchResults([]);
    setAllModalUsers([]);
    setSearching(false);
    setAddingId(null);
  };

  const handleCloseModal = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 240, easing: Easing.in(Easing.ease), useNativeDriver: false }),
      Animated.timing(sheetAnim, { toValue: 600, duration: 260, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ]).start(() => closeAddModal());
  };

  // Client-side filter as user types
  useEffect(() => {
    if (!addModalVisible) return;
    const q = modalQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults(allModalUsers);
      return;
    }
    setSearchResults(
      allModalUsers.filter(u =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone_number || '').includes(q)
      )
    );
  }, [modalQuery, allModalUsers]);

  const performSearch = () => {
    // Filtering is handled client-side via useEffect above
  };

  const handleAddUser = async (userId: string) => {
    if (!userId) return;
    // prevent duplicate
    if (contacts.find(c => c.id === userId)) {
      Alert.alert('Already added', 'This user is already in your contacts');
      return;
    }
    try {
      setAddingId(userId);
      await addContact(userId);
      Alert.alert('Contact added', 'User added to contacts');
      // refresh contacts list
      fetchContacts();
      closeAddModal();
    } catch (err: any) {
      Alert.alert('Add failed', err?.message || String(err));
    } finally {
      setAddingId(null);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchContacts();
  };

  if (selectedContact) {
    return (
      <Chat
        selectedContact={selectedContact}
        onBackPress={() => {
          setSelectedContact(null);
          onContactSelected?.(null);
        }}
        currentUserId={activeChatUserId || undefined}
      />
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />
      
      {/* Header Section */}
      <View className="bg-white px-6 py-6 pt-12 border-b border-green-100">
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-gray-900 text-3xl font-extrabold">Contacts</Text>
            <Text className="text-green-600 text-xs font-semibold mt-1">Manage your team</Text>
          </View>
          <TouchableOpacity
            className="relative active:scale-95"
            onPress={handleAddContact}
          >
            <View className="rounded-full bg-green-500 p-3 shadow-lg shadow-green-300">
              <Ionicons name="person-add" size={22} color="white" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className={`flex-row items-center rounded-2xl bg-gray-100 px-4 py-3 border-2 mb-4 ${searchText.length > 0 ? 'border-green-500' : 'border-gray-300'}`}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            placeholder="Search by name, email, or phone..."
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

        {/* Filter Buttons */}
        <View className="flex-row gap-2 -mx-6 px-6">
          {[
            { label: 'All', value: 'all', icon: 'people' },
            { label: 'Online', value: 'online', icon: 'radio-button-on' },
            { label: 'Unread', value: 'unread', icon: 'mail-unread' },
            { label: 'Teams', value: 'teams', icon: 'people-circle' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.value}
              onPress={() => setFilterType(filter.value as FilterType)}
              className={`flex-1 flex-row items-center justify-center gap-1 px-3 py-2 rounded-full border-2 transition-all ${
                filterType === filter.value
                  ? 'bg-green-500 border-green-500 shadow-md shadow-green-300'
                  : 'bg-white border-green-200'
              }`}
            >
              <Ionicons 
                name={filter.icon as any} 
                size={14} 
                color={filterType === filter.value ? 'white' : '#10b981'} 
              />
              <Text className={`text-xs font-bold ${
                filterType === filter.value ? 'text-white' : 'text-green-700'
              }`}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Add Contact Modal */}
      <Modal visible={addModalVisible} animationType="none" transparent={true} onRequestClose={handleCloseModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Animated.View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: backdropAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)'] }) }}>
            {/* Backdrop tap to close */}
            <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={handleCloseModal} />

            <Animated.View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', transform: [{ translateY: sheetAnim }] }}>
              {/* Drag handle */}
              <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', marginTop: 12, marginBottom: 4 }} />

              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Add Contact</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Search for an employee or admin</Text>
                </View>
                <TouchableOpacity onPress={handleCloseModal} activeOpacity={0.7} style={{ backgroundColor: '#f3f4f6', borderRadius: 20, padding: 8 }}>
                  <Ionicons name="close" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 20 }} />

              {/* Search bar */}
              <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 14, borderWidth: 1.5, borderColor: modalQuery.trim() ? '#10b981' : '#e5e7eb', paddingHorizontal: 14, paddingVertical: 10 }}>
                  <Ionicons name="search" size={16} color={modalQuery.trim() ? '#10b981' : '#9ca3af'} />
                  <TextInput
                    placeholder="Filter by name, email or phone…"
                    value={modalQuery}
                    onChangeText={(text) => setModalQuery(text)}
                    returnKeyType="search"
                    style={{ flex: 1, marginLeft: 10, color: '#111827', fontSize: 14 }}
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {modalQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setModalQuery('')}>
                      <Ionicons name="close-circle" size={17} color="#d1d5db" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Body */}
              <View style={{ minHeight: 220, paddingBottom: 28 }}>
                {searching ? (
                  <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 13 }}>Searching…</Text>
                  </View>

                ) : searchResults.length > 0 ? (
                  <>
                    <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: '600', paddingHorizontal: 20, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {modalQuery.trim() ? `${searchResults.length} match${searchResults.length !== 1 ? 'es' : ''}` : `${searchResults.length} user${searchResults.length !== 1 ? 's' : ''}`}
                    </Text>
                    <FlatList
                      data={searchResults}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={true}
                      style={{ maxHeight: 360 }}
                      contentContainerStyle={{ paddingHorizontal: 20 }}
                      renderItem={({ item }) => {
                        let status: 'online' | 'offline' | 'busy' = 'offline';
                        if (item.status === 'online') status = 'online';
                        else if (item.status === 'busy') status = 'busy';

                        const already = contacts.some(c => c.id === item.id);
                        const isCurrentUser = item.id === activeChatUserId;
                        const isAdmin = (item.role || '').toLowerCase() === 'admin';
                        const avatarColor = getAvatarColor(item.id);
                        const initials = getInitials(item.full_name || item.email || 'U');

                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                            {/* Avatar */}
                            <View style={{ position: 'relative', marginRight: 12 }}>
                              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: avatarColor, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{initials}</Text>
                              </View>
                              <View style={{
                                position: 'absolute', bottom: 0, right: 0,
                                width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: 'white',
                                backgroundColor: status === 'online' ? '#10b981' : status === 'busy' ? '#f59e0b' : '#d1d5db',
                              }} />
                            </View>

                            {/* Info */}
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <Text style={{ fontWeight: '600', color: '#111827', fontSize: 14 }} numberOfLines={1}>
                                  {item.full_name || item.email}
                                </Text>
                                <View style={{ backgroundColor: isAdmin ? '#ede9fe' : '#dcfce7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                                  <Text style={{ color: isAdmin ? '#7c3aed' : '#16a34a', fontSize: 10, fontWeight: '700' }}>
                                    {isAdmin ? 'Admin' : 'Employee'}
                                  </Text>
                                </View>
                                {isCurrentUser && (
                                  <View style={{ backgroundColor: '#dbeafe', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                                    <Text style={{ color: '#2563eb', fontSize: 10, fontWeight: '700' }}>You</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={{ color: '#9ca3af', fontSize: 12 }} numberOfLines={1}>{item.email}</Text>
                            </View>

                            {/* Action button */}
                            {isCurrentUser ? null : already ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 }}>
                                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                                <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '600' }}>Added</Text>
                              </View>
                            ) : (
                              <TouchableOpacity
                                disabled={addingId === item.id}
                                onPress={() => handleAddUser(item.id)}
                                activeOpacity={0.75}
                                style={{ marginLeft: 8, backgroundColor: '#10b981', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
                              >
                                {addingId === item.id
                                  ? <ActivityIndicator size="small" color="white" />
                                  : <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>Add</Text>
                                }
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      }}
                    />
                  </>

                ) : modalQuery.trim().length > 0 && !searching ? (
                  <View style={{ alignItems: 'center', paddingVertical: 44 }}>
                    <Ionicons name="search-outline" size={36} color="#d1d5db" />
                    <Text style={{ color: '#374151', fontWeight: '600', fontSize: 15, marginTop: 12 }}>No matches</Text>
                    <Text style={{ color: '#9ca3af', fontSize: 13, marginTop: 4 }}>Try a different name, email, or phone</Text>
                  </View>

                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <View style={{ backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16, marginBottom: 12 }}>
                      <Ionicons name="person-add-outline" size={30} color="#10b981" />
                    </View>
                    <Text style={{ color: '#374151', fontWeight: '600', fontSize: 15 }}>Find someone to add</Text>
                    <Text style={{ color: '#9ca3af', fontSize: 13, marginTop: 4 }}>Loading users…</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="px-6 py-6">
          {loading && !refreshing ? (
            <View className="items-center justify-center py-16">
              <ActivityIndicator size="large" color="#10b981" />
              <Text className="text-gray-500 mt-4">Loading contacts...</Text>
            </View>
          ) : filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                className="mb-4 flex-row items-center rounded-2xl bg-white px-4 py-4 shadow-sm shadow-green-100 border-2 border-green-100 active:scale-95 active:bg-green-50"
                onPress={() => {
                  const now = new Date().toISOString();
                  // Record when this chat was opened (marks all current messages as read)
                  const updatedMap = { ...lastReadMap, [contact.id]: now };
                  setLastReadMap(updatedMap);
                  // Persist to AsyncStorage so unread state survives app restarts
                  AsyncStorage.setItem(LAST_READ_STORAGE_KEY, JSON.stringify(updatedMap)).catch(() => {});
                  // Mark contact as read
                  const updatedContacts = contacts.map(c =>
                    c.id === contact.id
                      ? { ...c, unreadCount: 0 }
                      : c
                  );
                  setContacts(updatedContacts);
                  const readContact = { ...contact, unreadCount: 0 };
                  setSelectedContact(readContact);
                  onContactSelected?.(readContact);
                }}
              >
                {/* Avatar */}
                <View className="relative">
                  <View
                    className="h-14 w-14 items-center justify-center rounded-full shadow-md"
                    style={{ backgroundColor: contact.avatar_color }}
                  >
                    <Text className="font-bold text-white text-base">
                      {contact.initials}
                    </Text>
                  </View>
                  {/* Status Indicator */}
                  <View
                    className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-3 border-white ${
                      contact.status === 'online'
                        ? 'bg-green-500'
                        : contact.status === 'busy'
                          ? 'bg-yellow-500'
                          : 'bg-gray-300'
                    }`}
                  />
                </View>

                {/* Contact Info */}
                <View className="flex-1 ml-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="font-bold text-gray-900 text-base flex-1">
                      {contact.name}
                    </Text>
                  </View>
                  <Text className="text-gray-600 text-xs font-normal mb-2">
                    {contact.role}
                  </Text>
                  {contact.lastMessage !== undefined ? (
                    <View className="flex-row items-center gap-2 mt-1">
                      <Ionicons name="chatbubble-outline" size={14} color={contact.unreadCount && contact.unreadCount > 0 ? '#10b981' : '#9ca3af'} />
                      <Text className={`text-xs flex-1 ${contact.unreadCount && contact.unreadCount > 0 ? 'text-gray-900 font-bold' : 'text-gray-500 font-normal'}`} numberOfLines={1}>
                        {contact.lastMessage || 'Message'}
                      </Text>
                      <View className="flex-row items-center gap-1">
                        <Text className={`text-xs ${contact.unreadCount && contact.unreadCount > 0 ? 'text-green-600 font-bold' : 'text-gray-400 font-normal'}`}>
                          {contact.lastMessageTime}
                        </Text>
                        {contact.unreadCount !== undefined && contact.unreadCount > 0 && (
                          <View className="bg-red-500 rounded-full h-5 w-5 items-center justify-center ml-1">
                            <Text className="text-white text-xs font-bold">{contact.unreadCount > 9 ? '9+' : contact.unreadCount}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ) : (
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="chatbubble-outline" size={14} color="#d1d5db" />
                      <Text className="text-gray-400 text-xs">No messages yet</Text>
                    </View>
                  )}
                </View>

                {/* Quick Actions */}
                <View className="flex-row gap-2 ml-2">
                  <TouchableOpacity
                    className="bg-green-50 p-2 rounded-full active:scale-90"
                  >
                    <Ionicons name="chevron-forward" size={16} color="#10b981" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View className="items-center justify-center py-16">
              <View className="bg-green-50 p-4 rounded-full mb-4">
                <Ionicons name="search" size={48} color="#d1d5db" />
              </View>
              <Text className="text-gray-500 font-semibold text-base">No contacts found</Text>
              <Text className="text-gray-400 text-sm mt-2">Try adjusting your filters or search</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}