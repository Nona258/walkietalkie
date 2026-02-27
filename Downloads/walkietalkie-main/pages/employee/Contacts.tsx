import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, StatusBar, ActivityIndicator, RefreshControl, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import  supabase, { searchUsers, addContact, getCurrentUserProfile }  from '../../utils/supabase'; // adjust path to your supabase client
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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Fetch contacts from Supabase
  const fetchContacts = async () => {
    try {
      setLoading(true);
      
      // Query users table, exclude current user if provided
      // If caller didn't provide `currentUserId`, resolve it from auth/profile
      let excludeId = currentUserId;
      if (!excludeId) {
        const profile = await getCurrentUserProfile();
        excludeId = profile?.id || undefined;
      }

      let query = supabase
        .from('users')
        .select('id, email, full_name, phone_number, role, profile_picture_url, status')
        .order('full_name');

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform to Contact interface
      const now = new Date();
      const onlineThreshold = 5 * 60 * 1000; // 5 minutes in ms

      const formattedContacts: Contact[] = (data || []).map(user => {
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

      setContacts(formattedContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      subscription.unsubscribe();
    };
  }, [currentUserId]);

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
                    let status: 'online' | 'offline' | 'busy' = 'offline';
                    if (item.last_seen) {
                      const lastSeen = new Date(item.last_seen);
                      if (now.getTime() - lastSeen.getTime() < onlineThreshold) status = 'online';
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
                  // Mark contact as read and update state (you might want to integrate real message unread logic)
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