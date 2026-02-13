import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, StatusBar, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
}

const MOCK_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'Security Team',
    role: 'Team',
    initials: 'ST',
    status: 'online',
    avatar_color: '#10b981',
    lastMessage: 'Shift check-in confirmed',
    lastMessageTime: '2m ago',
    unreadCount: 2,
  },
  {
    id: '2',
    name: 'Mark Johnson',
    role: 'Manager',
    initials: 'MJ',
    status: 'online',
    avatar_color: '#059669',
    lastMessage: 'Great work on the afternoon shift',
    lastMessageTime: '15m ago',
    unreadCount: 0,
  },
  {
    id: '3',
    name: 'Sarah Williams',
    role: 'Team Lead',
    initials: 'SW',
    status: 'offline',
    avatar_color: '#34d399',
    lastMessage: 'See you tomorrow',
    lastMessageTime: '1h ago',
    unreadCount: 0,
  },
  {
    id: '4',
    name: 'David Chen',
    role: 'Supervisor',
    initials: 'DC',
    status: 'busy',
    avatar_color: '#6ee7b7',
    lastMessage: 'Need to discuss schedule',
    lastMessageTime: '3h ago',
    unreadCount: 1,
  },
];

interface ContactsProps {
  onContactSelected?: (contact: Contact | null) => void;
}

type FilterType = 'all' | 'online' | 'offline' | 'teams' | 'unread';

export default function Contacts({ onContactSelected }: ContactsProps) {
  const [contacts, setContacts] = useState(MOCK_CONTACTS);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const handleAddContact = () => {
    Alert.alert('Add Contact', 'Add contact functionality coming soon!');
  };

  const getFilteredContacts = () => {
    let filtered = contacts.filter((contact) =>
      contact.name.toLowerCase().includes(searchText.toLowerCase())
    );

    if (filterType === 'online') {
      filtered = filtered.filter(c => c.status === 'online');
    } else if (filterType === 'offline') {
      filtered = filtered.filter(c => c.status === 'offline');
    } else if (filterType === 'teams') {
      filtered = filtered.filter(c => c.role === 'Team');
    } else if (filterType === 'unread') {
      filtered = filtered.filter(c => (c.unreadCount ?? 0) > 0);
    }

    return filtered;
  };

  const filteredContacts = getFilteredContacts();

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
            placeholder="Search contacts..."
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
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View className="px-6 py-6">
          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                className="mb-4 flex-row items-center rounded-2xl bg-white px-4 py-4 shadow-sm shadow-green-100 border-2 border-green-100 active:scale-95 active:bg-green-50"
                onPress={() => {
                  // Mark contact as read and update state
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
                  {contact.lastMessage && (
                    <View className="flex-row items-center gap-2">
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
