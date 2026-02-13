import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';
import AdminSidebar from 'components/AdminSidebar';
import AdminSidebarMobile from 'components/AdminSidebarMobile'; // <-- Import mobile sidebar
import AdminHeader from 'components/AdminHeader';


interface WalkieTalkieProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}

const contacts = [
  { id: 1, name: 'Security Team', members: '12 members', location: 'Group', initials: 'ST', color: '#a7f3d0', online: true },
  { id: 2, name: 'John Doe', members: null, location: 'Downtown HQ', initials: 'JD', color: '#99f6e4', online: true },
  { id: 3, name: 'Sarah Miller', members: null, location: 'Warehouse B', initials: 'SM', color: '#fde68a', online: false },
];

const messages = [
  { id: 1, sender: 'JD', text: 'All clear at the main entrance. Shifting to position B.', time: '10:23 AM', status: 'Transcribed' },
  { id: 2, sender: 'SM', text: 'Copy that. Warehouse perimeter secure. No unusual activity.', time: '10:25 AM', status: 'Transcribed' },
  { id: 3, sender: 'MK', text: 'Voice message', time: '10:28 AM', status: 'Processing', isVoice: true, duration: '0:12' },
];

export default function WalkieTalkie({ onNavigate }: WalkieTalkieProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(contacts[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showContactList, setShowContactList] = useState(true);

  // Dummy sign out handler
  const handleSignOut = () => {
    // Add your sign out logic here
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View className="flex-row flex-1 bg-stone-50">
      {/* Desktop Sidebar - Hidden on mobile */}
      <AdminSidebar onNavigate={onNavigate} />

      {/* Main Content Area */}
      <View className="flex-1 bg-stone-50">
        {/* Header */}
        {/* AdminHeader */}
                <AdminHeader
                  title="Walkie Talkie"
                  subtitle="Welcome back, Administrator"
                  onMenuPress={() => setIsDrawerOpen(true)}
                  isNotificationOpen={isNotificationOpen}
                  setIsNotificationOpen={setIsNotificationOpen}
                  onNavigate={onNavigate}
                />

          {/* Mobile View - Shows either contacts or chat */}
          <View className="flex-1 lg:hidden">
            {showContactList ? (
              /* Contacts View */
              <View className="flex-1 bg-white">
                {/* Contacts Header */}
                <View className="px-4 pt-3 pb-2.5 border-b border-stone-100">
                  <View className="flex-row items-center justify-between mb-2.5">
                    <Text className="text-sm font-bold text-stone-900">Contacts</Text>
                    <TouchableOpacity className="items-center justify-center w-7 h-7">
                      <Ionicons name="add" size={20} color="#10b981" />
                    </TouchableOpacity>
                  </View>

                  {/* Search Bar */}
                  <View className="flex-row items-center px-3 py-2 border rounded-lg bg-stone-50 border-stone-200">
                    <Ionicons name="search" size={14} color="#a8a29e" />
                    <TextInput
                      className="flex-1 ml-2 text-sm text-stone-900"
                      placeholder="Search contacts..."
                      placeholderTextColor="#a8a29e"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                  </View>
                </View>

                {/* Contacts List */}
                <ScrollView className="flex-1">
                  {filteredContacts.map((contact) => (
                    <TouchableOpacity
                      key={contact.id}
                      className="flex-row items-center px-4 py-2.5 border-b border-stone-50 active:bg-emerald-50"
                      onPress={() => {
                        setSelectedContact(contact);
                        setShowContactList(false);
                      }}
                    >
                      <View 
                        className="w-11 h-11 rounded-full items-center justify-center mr-2.5"
                        style={{ backgroundColor: contact.color }}
                      >
                        <Text className="text-xs font-semibold text-stone-800">{contact.initials}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-stone-900">{contact.name}</Text>
                        <Text className="text-xs text-stone-500 mt-0.5">
                          {contact.members ? `${contact.members} • ` : ''}{contact.location}
                        </Text>
                      </View>
                      {contact.online && (
                        <View className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : (
              /* Chat View */
              <View className="flex-1">
                {/* Chat Header */}
                <View className="bg-white px-4 py-2.5 border-b border-stone-200">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <TouchableOpacity 
                        className="items-center justify-center w-8 h-8 mr-2"
                        onPress={() => setShowContactList(true)}
                      >
                        <Ionicons name="chevron-back" size={22} color="#78716c" />
                      </TouchableOpacity>
                      <View 
                        className="w-9 h-9 rounded-full items-center justify-center mr-2.5"
                        style={{ backgroundColor: selectedContact.color }}
                      >
                        <Text className="text-xs font-semibold text-stone-800">{selectedContact.initials}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-stone-900">{selectedContact.name}</Text>
                        <View className="flex-row items-center mt-0.5">
                          <View className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1" />
                          <Text className="text-xs text-emerald-600">Active channel</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity className="items-center justify-center w-8 h-8">
                      <Ionicons name="ellipsis-vertical" size={18} color="#78716c" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Messages */}
                <ScrollView className="flex-1 px-4 py-3">
                  {messages.map((message) => (
                    <View key={message.id} className="mb-3">
                      <View className="flex-row items-start">
                        <View 
                          className="items-center justify-center w-8 h-8 mr-2 rounded-full"
                          style={{ 
                            backgroundColor: message.sender === 'JD' ? '#99f6e4' : 
                                            message.sender === 'SM' ? '#fde68a' : '#bfdbfe' 
                          }}
                        >
                          <Text className="text-xs font-semibold text-stone-800">{message.sender}</Text>
                        </View>
                        <View className="flex-1">
                          {message.isVoice ? (
                            <View className="bg-white rounded-xl p-2.5 border border-stone-200">
                              <View className="flex-row items-center">
                                <View className="items-center justify-center w-8 h-8 mr-2 rounded-full bg-emerald-500">
                                  <Ionicons name="play" size={14} color="white" />
                                </View>
                                <View className="flex-1">
                                  <View className="h-1 rounded-full bg-stone-200">
                                    <View className="w-1/3 h-full rounded-full bg-emerald-500" />
                                  </View>
                                  <Text className="mt-1 text-xs text-stone-500">{message.duration}</Text>
                                </View>
                              </View>
                            </View>
                          ) : (
                            <View className="bg-white rounded-xl px-3 py-2.5 border border-stone-200">
                              <Text className="text-sm leading-5 text-stone-800">{message.text}</Text>
                            </View>
                          )}
                          <View className="flex-row items-center mt-1 ml-0.5">
                            <Text className="text-xs text-stone-400">{message.time}</Text>
                            <Text className="ml-2 text-xs text-emerald-600">{message.status}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {/* Message Input */}
                <View className="bg-white px-4 py-2.5 border-t border-stone-200">
                  <View className="flex-row items-center px-3 py-2 border rounded-lg bg-stone-50 border-stone-200">
                    <TextInput
                      className="flex-1 text-sm text-stone-900"
                      placeholder="Type a message..."
                      placeholderTextColor="#a8a29e"
                    />
                    <TouchableOpacity className="ml-2.5">
                      <Ionicons name="mic" size={20} color="#10b981" />
                    </TouchableOpacity>
                    <TouchableOpacity className="ml-2.5">
                      <Ionicons name="send" size={20} color="#10b981" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Desktop View - Shows both contacts and chat side by side */}
          <View className="hidden lg:flex lg:flex-1 lg:flex-row">
            {/* Contacts Panel - Desktop */}
            <View className="bg-white border-r lg:w-96 border-stone-200">
              {/* Contacts Header */}
              <View className="px-5 pt-4 pb-3 border-b border-stone-100">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-base font-bold text-stone-900">Contacts</Text>
                  <TouchableOpacity className="items-center justify-center w-8 h-8">
                    <Ionicons name="add" size={22} color="#10b981" />
                  </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View className="flex-row items-center bg-stone-50 rounded-lg px-3 py-2.5 border border-stone-200">
                  <Ionicons name="search" size={16} color="#a8a29e" />
                  <TextInput
                    className="flex-1 ml-2 text-sm text-stone-900"
                    placeholder="Search contacts..."
                    placeholderTextColor="#a8a29e"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
              </View>

              {/* Contacts List */}
              <ScrollView className="flex-1">
                {filteredContacts.map((contact) => (
                  <TouchableOpacity
                    key={contact.id}
                    className={`flex-row items-center px-5 py-3 border-b border-stone-50 hover:bg-stone-50 ${
                      selectedContact.id === contact.id ? 'bg-emerald-50' : ''
                    }`}
                    onPress={() => setSelectedContact(contact)}
                  >
                    <View 
                      className="items-center justify-center w-12 h-12 mr-3 rounded-full"
                      style={{ backgroundColor: contact.color }}
                    >
                      <Text className="text-sm font-semibold text-stone-800">{contact.initials}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-stone-900">{contact.name}</Text>
                      <Text className="text-xs text-stone-500 mt-0.5">
                        {contact.members ? `${contact.members} • ` : ''}{contact.location}
                      </Text>
                    </View>
                    {contact.online && (
                      <View className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Chat Panel - Desktop */}
            <View className="flex-1 bg-stone-50">
              {/* Chat Header */}
              <View className="px-6 py-4 bg-white border-b border-stone-200">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View 
                      className="items-center justify-center mr-3 rounded-full w-11 h-11"
                      style={{ backgroundColor: selectedContact.color }}
                    >
                      <Text className="text-sm font-semibold text-stone-800">{selectedContact.initials}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-stone-900">{selectedContact.name}</Text>
                      <View className="flex-row items-center mt-1">
                        <View className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5" />
                        <Text className="text-sm text-emerald-600">Active channel</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity className="items-center justify-center w-9 h-9">
                    <Ionicons name="ellipsis-vertical" size={20} color="#78716c" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Messages */}
              <ScrollView className="flex-1 px-6 py-4">
                {messages.map((message) => (
                  <View key={message.id} className="mb-4">
                    <View className="flex-row items-start">
                      <View 
                        className="items-center justify-center w-10 h-10 mr-3 rounded-full"
                        style={{ 
                          backgroundColor: message.sender === 'JD' ? '#99f6e4' : 
                                          message.sender === 'SM' ? '#fde68a' : '#bfdbfe' 
                        }}
                      >
                        <Text className="text-sm font-semibold text-stone-800">{message.sender}</Text>
                      </View>
                      <View className="flex-1">
                        {message.isVoice ? (
                          <View className="p-3 bg-white border rounded-xl border-stone-200">
                            <View className="flex-row items-center">
                              <View className="items-center justify-center w-10 h-10 mr-3 rounded-full bg-emerald-500">
                                <Ionicons name="play" size={16} color="white" />
                              </View>
                              <View className="flex-1">
                                <View className="h-1.5 bg-stone-200 rounded-full">
                                  <View className="w-1/3 h-full rounded-full bg-emerald-500" />
                                </View>
                                <Text className="text-xs text-stone-500 mt-1.5">{message.duration}</Text>
                              </View>
                            </View>
                          </View>
                        ) : (
                          <View className="px-4 py-3 bg-white border rounded-xl border-stone-200">
                            <Text className="text-sm leading-6 text-stone-800">{message.text}</Text>
                          </View>
                        )}
                        <View className="flex-row items-center mt-1.5 ml-1">
                          <Text className="text-xs text-stone-400">{message.time}</Text>
                          <Text className="ml-3 text-xs text-emerald-600">{message.status}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Message Input */}
              <View className="px-6 py-4 bg-white border-t border-stone-200">
                <View className="flex-row items-center px-4 py-3 border rounded-lg bg-stone-50 border-stone-200">
                  <TextInput
                    className="flex-1 text-sm text-stone-900"
                    placeholder="Type a message..."
                    placeholderTextColor="#a8a29e"
                  />
                  <TouchableOpacity className="ml-3">
                    <Ionicons name="mic" size={22} color="#10b981" />
                  </TouchableOpacity>
                  <TouchableOpacity className="ml-3">
                    <Ionicons name="send" size={22} color="#10b981" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
      </View>

      {/* Mobile Drawer Modal */}
      <AdminSidebarMobile
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={(route) => {
          setIsDrawerOpen(false);
          onNavigate(route);
        }}
        activeRoute="walkieTalkie"
        onSignOut={handleSignOut}
      />
    </View>
  );
}