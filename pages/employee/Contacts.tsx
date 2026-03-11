import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, StatusBar, ActivityIndicator, RefreshControl, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import  supabase, { searchUsers, addContact, getCurrentUserProfile }  from '../../utils/supabase'; // adjust path to your supabase client
import Chat from './Chat';

interface Contact {
  id: string;
  name: string;
  role: string;
  initials: string;
  status: 'online' | 'offline' | 'busy' | 'lost_connection';
  avatar_color: string;
  isGroup?: boolean;
  groupId?: string;
  lastMessage?: string;
  lastMessageTime?: string;
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
  const [resolvedMeId, setResolvedMeId] = useState<string | null>(currentUserId || null);
  // Modal/search states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [modalQuery, setModalQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Fetch contacts from Supabase
  const fetchContacts = async () => {
    try {
      setLoading(true);
      
      // Resolve current user id (needed to filter contacts.user_id)
      let meId = currentUserId;
      if (!meId) {
        const profile = await getCurrentUserProfile();
        meId = profile?.id || undefined;
      }

      setResolvedMeId(meId || null);

      if (!meId) {
        setContacts([]);
        return;
      }

      // Load the user's current group (if any) so it appears as a chat option
      let myGroupContact: Contact | null = null;
      try {
        const { data: meRow, error: meRowError } = await supabase
          .from('users')
          .select('group_id, group:group_id ( id, name )')
          .eq('id', meId)
          .maybeSingle();

        if (!meRowError && meRow?.group_id) {
          const g = Array.isArray((meRow as any).group) ? (meRow as any).group[0] : (meRow as any).group;
          const groupId = String(meRow.group_id);
          const groupName = g?.name ? String(g.name) : 'My Group Chat';
          myGroupContact = {
            id: `group-${groupId}`,
            name: groupName,
            role: 'Group',
            initials: getInitials(groupName),
            status: 'online',
            avatar_color: '#10b981',
            isGroup: true,
            groupId,
            email: 'Group Chat',
            unreadCount: 0,
          };
        }
      } catch (e) {
        console.warn('Unable to load user group chat:', (e as any)?.message || String(e));
      }

      // Load only the contacts that *this user* added
      const { data: contactRows, error: contactsError } = await supabase
        .from('contacts')
        .select('contact_id, created_at')
        .eq('user_id', meId)
        .order('created_at', { ascending: false });

      if (contactsError) throw contactsError;

      const contactIds = Array.from(
        new Set((contactRows || []).map((r: any) => r.contact_id).filter((id: any) => !!id))
      ) as string[];

      if (!contactIds.length) {
        setContacts([]);
        return;
      }

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, phone_number, role, profile_picture_url, status')
        .in('id', contactIds);

      if (usersError) throw usersError;

      const usersMap = new Map<string, any>();
      (usersData || []).forEach((u: any) => usersMap.set(u.id, u));

      const formattedContacts: Contact[] = (contactRows || [])
        .map((row: any) => {
          const user = usersMap.get(row.contact_id);
          if (!user) return null;

          let status: 'online' | 'offline' | 'busy' | 'lost_connection' = 'offline';
          if (user.status === 'online') status = 'online';
          else if (user.status === 'busy') status = 'busy';
          else if (user.status === 'lost_connection') status = 'lost_connection';

          const displayName = user.full_name || user.email || 'Unknown';

          return {
            id: user.id,
            name: displayName,
            role: user.role || 'Employee',
            initials: getInitials(displayName),
            status,
            avatar_color: getAvatarColor(user.id),
            email: user.email,
            phone_number: user.phone_number,
            lastMessage: undefined,
            lastMessageTime: undefined,
            unreadCount: 0,
          } as Contact;
        })
        .filter((c: Contact | null): c is Contact => c !== null);

      const base = myGroupContact ? [myGroupContact, ...formattedContacts] : formattedContacts;
      setContacts(base);

      // Hydrate unread counts after we have the base list.
      if (meId) {
        setTimeout(() => {
          refreshUnreadCounts(meId as string, base);
        }, 0);
      } else {
        updateAppBadge(0);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const makeThreadKey = (kind: 'group' | 'direct', id: string) => `chat:lastRead:${kind}:${id}`;

  const getLastReadIso = async (kind: 'group' | 'direct', id: string) => {
    try {
      return (await AsyncStorage.getItem(makeThreadKey(kind, id))) || null;
    } catch {
      return null;
    }
  };

  const getConversationIdForPair = async (meId: string, otherId: string) => {
    const pairFilter = `and(user_one.eq.${meId},user_two.eq.${otherId}),and(user_one.eq.${otherId},user_two.eq.${meId})`;
    const { data, error } = await supabase
      .from('conversations')
      .select('id')
      .or(pairFilter)
      .limit(1);
    if (error) throw error;
    const id = data && data[0] ? data[0].id : null;
    return id ? String(id) : null;
  };

  const updateAppBadge = async (totalUnread: number) => {
    try {
      // Only affects iOS/Android; harmless no-op on unsupported platforms.
      await Notifications.setBadgeCountAsync(Math.max(0, totalUnread | 0));
    } catch {
      // ignore
    }
  };

  const refreshUnreadCounts = async (meId: string, snapshot: Contact[]) => {
    try {
      const updated = await Promise.all(
        (snapshot || []).map(async (c) => {
          // Group chat unread count
          if (c.isGroup && c.groupId) {
            const lastRead = (await getLastReadIso('group', c.groupId)) || '1970-01-01T00:00:00.000Z';
            const { count, error } = await supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('group_id', c.groupId)
              .neq('sender_id', meId)
              .gt('created_at', lastRead);
            if (error) throw error;
            return { ...c, unreadCount: count || 0 };
          }

          // Direct unread count
          const conversationId = await getConversationIdForPair(meId, c.id);
          if (!conversationId) return { ...c, unreadCount: 0 };
          const lastRead = (await getLastReadIso('direct', conversationId)) || '1970-01-01T00:00:00.000Z';
          const { count, error } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conversationId)
            .eq('receiver_id', meId)
            .gt('created_at', lastRead);
          if (error) throw error;
          return { ...c, unreadCount: count || 0 };
        })
      );

      setContacts(updated);
      const total = updated.reduce((acc, c) => acc + ((c.unreadCount || 0) > 0 ? (c.unreadCount || 0) : 0), 0);
      updateAppBadge(total);
    } catch (e) {
      console.warn('refreshUnreadCounts failed:', (e as any)?.message || String(e));
    }
  };

  useEffect(() => {
    fetchContacts();

    // Optional: Subscribe to realtime updates for online status
    const subscription = supabase
      .channel('public:users')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, payload => {
        // When a user updates their last_seen, refresh contacts
        if (payload.new.id !== currentUserId) {
          fetchContacts();
        }
      })
      .subscribe();

    return () => {
      try {
        if (subscription && typeof (subscription as any).unsubscribe === 'function') (subscription as any).unsubscribe();
        else if (typeof (supabase as any).removeChannel === 'function') (supabase as any).removeChannel(subscription);
      } catch (e) {
        console.warn('Error unsubscribing public:users channel', e);
      }
    };
  }, [currentUserId]);

  useEffect(() => {
    // Realtime: increment unread counts on new inbound messages.
    if (!resolvedMeId) return;

    const channel = supabase
      .channel(`messages-unread-${resolvedMeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload: any) => {
          try {
            const row = payload?.new;
            if (!row) return;

            // If user is currently inside a chat, let Chat.tsx handle read-marking.
            if (selectedContact) return;

            // Direct message inbound to me
            if (row.receiver_id && String(row.receiver_id) === String(resolvedMeId)) {
              const senderId = String(row.sender_id);
              setContacts((prev) => {
                const next = prev.map((c) => (c.id === senderId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c));
                const total = next.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
                updateAppBadge(total);
                return next;
              });
              return;
            }

            // Group message inbound (not from me)
            if (row.group_id && String(row.sender_id) !== String(resolvedMeId)) {
              const gid = String(row.group_id);
              setContacts((prev) => {
                const next = prev.map((c) => {
                  if (!c.isGroup || !c.groupId) return c;
                  return c.groupId === gid ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c;
                });
                const total = next.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
                updateAppBadge(total);
                return next;
              });
            }
          } catch (err) {
            console.warn('Unread realtime handler failed:', err);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [resolvedMeId, selectedContact]);

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

    setFilteredContacts(filtered);
  }, [contacts, searchText, filterType]);

  const handleAddContact = () => {
    setAddModalVisible(true);
  };

  const closeAddModal = () => {
    setAddModalVisible(false);
    setModalQuery('');
    setSearchResults([]);
    setSearching(false);
    setAddingId(null);
  };

  const performSearch = async () => {
    const q = (modalQuery || '').trim();
    if (!q) return;
    try {
      setSearching(true);
      const res = await searchUsers(q);
      setSearchResults(res || []);
    } catch (err: any) {
      Alert.alert('Search error', err?.message || String(err));
    } finally {
      setSearching(false);
    }
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

      {/* Contact List */}
      {/* Add Contact Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent={true} onRequestClose={closeAddModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View className="flex-1 justify-end bg-black/30">
            <View className="bg-white rounded-t-3xl p-6 h-3/5">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-bold">Add Contact</Text>
                <TouchableOpacity onPress={closeAddModal}>
                  <Ionicons name="close" size={22} color="#374151" />
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2 mb-4">
                <Ionicons name="search" size={18} color="#6b7280" />
                <TextInput
                  placeholder="Search by email or phone"
                  value={modalQuery}
                  onChangeText={setModalQuery}
                  onSubmitEditing={performSearch}
                  className="ml-3 flex-1 text-base text-gray-900"
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity onPress={performSearch} className="ml-2">
                  <Ionicons name="arrow-forward-circle" size={22} color="#10b981" />
                </TouchableOpacity>
              </View>

              {searching ? (
                <View className="items-center justify-center py-6">
                  <ActivityIndicator size="small" color="#10b981" />
                  <Text className="text-gray-500 mt-2">Searching...</Text>
                </View>
              ) : (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const now = new Date();
                    const onlineThreshold = 5 * 60 * 1000;
                    let status: 'online' | 'offline' | 'busy' | 'lost_connection' = 'offline';
                    if (item.last_seen) {
                      const lastSeen = new Date(item.last_seen);
                      if (now.getTime() - lastSeen.getTime() < onlineThreshold) status = 'online';
                    } else if (item.status === 'lost_connection') {
                      status = 'lost_connection';
                    } else if (item.status === 'online') {
                      status = 'online';
                    }
                    const already = contacts.some(c => c.id === item.id);
                    return (
                      <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
                        <View className="flex-row items-center">
                          <View className="h-12 w-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: getAvatarColor(item.id) }}>
                            <Text className="text-white font-bold">{getInitials(item.full_name || item.email || 'U')}</Text>
                          </View>
                          <View>
                            <Text className="font-bold text-gray-900">{item.full_name || item.email}</Text>
                            <Text className="text-xs text-gray-500">{item.email}{item.phone_number ? ` • ${item.phone_number}` : ''}</Text>
                          </View>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <View className={`h-3 w-3 rounded-full ${status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <TouchableOpacity
                            disabled={already || addingId === item.id}
                            onPress={() => handleAddUser(item.id)}
                            className={`px-3 py-1 rounded-full ${already ? 'bg-gray-200' : 'bg-green-500'}`}
                          >
                            <Text className={`${already ? 'text-gray-500' : 'text-white'} text-sm font-semibold`}>{already ? 'Added' : addingId === item.id ? 'Adding...' : 'Add'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </View>
          </View>
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
          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                className="mb-4 flex-row items-center rounded-2xl bg-white px-4 py-4 shadow-sm shadow-green-100 border-2 border-green-100 active:scale-95 active:bg-green-50"
                onPress={() => {
                  // Mark contact as read and update state (you might want to integrate real message unread logic)
                  const updatedContacts = contacts.map(c => 
                    c.id === contact.id 
                      ? { ...c, unreadCount: 0 }
                      : c
                  );
                  setContacts(updatedContacts);
                  const total = updatedContacts.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
                  updateAppBadge(total);
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
                  {(contact.unreadCount ?? 0) > 0 && (
                    <View className="absolute -top-1 -right-1 bg-green-500 rounded-full min-w-[20px] h-5 px-1 items-center justify-center border-2 border-white">
                      <Text className="text-white text-xs font-extrabold">
                        {(contact.unreadCount ?? 0) > 99 ? '99+' : String(contact.unreadCount)}
                      </Text>
                    </View>
                  )}
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
                  {/* Optional: show email or phone for search context */}
                  <Text className="text-gray-400 text-xs">
                    {contact.email} {contact.phone_number ? ` • ${contact.phone_number}` : ''}
                  </Text>
                  {contact.lastMessage && (
                    <View className="flex-row items-center gap-2 mt-1">
                      <Text className={`text-xs flex-1 ${contact.unreadCount !== undefined && contact.unreadCount > 0 ? 'text-gray-900 font-bold' : 'text-gray-500 font-normal'}`} numberOfLines={1}>
                        {contact.lastMessage}
                      </Text>
                      <Text className={`text-xs ${contact.unreadCount !== undefined && contact.unreadCount > 0 ? 'text-gray-900 font-bold' : 'text-gray-400 font-medium'}`}>
                        {contact.lastMessageTime}
                      </Text>
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