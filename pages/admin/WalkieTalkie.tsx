import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';
import AdminSidebar from 'components/AdminSidebar';
import AdminSidebarMobile from 'components/AdminSidebarMobile';
import AdminHeader from 'components/AdminHeader';

interface WalkieTalkieProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}

const contacts = [
  { id: 1, name: 'Security Team', members: '12 members', location: 'Group', initials: 'ST', color: '#a7f3d0', online: true, lastMsg: '10:28 AM' },
  { id: 2, name: 'John Doe', members: null, location: 'Downtown HQ', initials: 'JD', color: '#99f6e4', online: true, lastMsg: '10:23 AM' },
  { id: 3, name: 'Sarah Miller', members: null, location: 'Warehouse B', initials: 'SM', color: '#fde68a', online: false, lastMsg: 'Yesterday' },
];

const messages = [
  { id: 1, sender: 'JD', text: 'All clear at the main entrance. Shifting to position B.', time: '10:23 AM', status: 'Transcribed', isMe: false },
  { id: 2, sender: 'SM', text: 'Copy that. Warehouse perimeter secure. No unusual activity.', time: '10:25 AM', status: 'Transcribed', isMe: false },
  { id: 3, sender: 'MK', text: 'Voice message', time: '10:28 AM', status: 'Sent', isVoice: true, duration: '0:12', isMe: true },
];

export default function WalkieTalkie({ onNavigate }: WalkieTalkieProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(contacts[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showContactList, setShowContactList] = useState(true);

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ContactItem = ({ contact, isSelected }: { contact: typeof contacts[0], isSelected: boolean }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedContact(contact);
        setShowContactList(false);
      }}
      className={`flex-row items-center px-4 py-4 border-b border-stone-100 ${isSelected ? 'bg-emerald-50/50' : 'bg-white'}`}
    >
      <View className="relative">
        <View style={{ backgroundColor: contact.color }} className="items-center justify-center w-12 h-12 rounded-2xl">
          <Text className="text-sm font-bold text-stone-800">{contact.initials}</Text>
        </View>
        {contact.online && <View className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />}
      </View>
      <View className="flex-1 ml-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-stone-900 font-bold text-[15px]">{contact.name}</Text>
          <Text className="text-stone-400 text-[10px]">{contact.lastMsg}</Text>
        </View>
        <Text className="text-stone-500 text-xs mt-0.5" numberOfLines={1}>
          {contact.members ? `${contact.members} • ` : ''}{contact.location}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-row flex-1 bg-stone-50">
      <AdminSidebar onNavigate={onNavigate} />

      <View className="flex-col flex-1">
        <AdminHeader
          title="Walkie Talkie"
          subtitle="Real-time site communication"
          onMenuPress={() => setIsDrawerOpen(true)}
          isNotificationOpen={isNotificationOpen}
          setIsNotificationOpen={setIsNotificationOpen}
          onNavigate={onNavigate}
        />

        <View className="flex-row flex-1">
          {/* Sidebar / Contact List */}
          <View className={`${showContactList ? 'flex' : 'hidden'} lg:flex w-full lg:w-80 border-r border-stone-200 bg-white`}>
            <View className="p-4 border-b border-stone-100">
              <View className="flex-row items-center px-3 py-2 bg-stone-100 rounded-xl">
                <Ionicons name="search-outline" size={18} color="#a8a29e" />
                <TextInput
                  placeholder="Search channels..."
                  className="flex-1 ml-2 text-sm"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>
            <ScrollView className="flex-1">
              <View className="px-4 py-2">
                <Text className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Active Channels</Text>
              </View>
              {filteredContacts.map(c => <ContactItem key={c.id} contact={c} isSelected={selectedContact.id === c.id} />)}
            </ScrollView>
          </View>

          {/* Chat Window */}
          <View className={`${!showContactList ? 'flex' : 'hidden'} lg:flex flex-1 bg-stone-50`}>
            {/* Chat Header */}
            <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-stone-200">
              <View className="flex-row items-center">
                <TouchableOpacity className="mr-3 lg:hidden" onPress={() => setShowContactList(true)}>
                  <Ionicons name="arrow-back" size={24} color="#444" />
                </TouchableOpacity>
                <View style={{ backgroundColor: selectedContact.color }} className="items-center justify-center w-10 h-10 mr-3 rounded-full">
                  <Text className="font-bold text-stone-800">{selectedContact.initials}</Text>
                </View>
                <View>
                  <Text className="font-bold text-stone-900">{selectedContact.name}</Text>
                  <Text className="text-emerald-600 text-[10px] font-medium uppercase">● Live Connection</Text>
                </View>
              </View>
              <View className="flex-row">
                <TouchableOpacity className="p-2"><Ionicons name="videocam-outline" size={20} color="#78716c" /></TouchableOpacity>
                <TouchableOpacity className="p-2"><Ionicons name="information-circle-outline" size={20} color="#78716c" /></TouchableOpacity>
              </View>
            </View>

            {/* Message Area */}
            <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 20 }}>
              {messages.map((msg) => (
                <View key={msg.id} className={`mb-6 flex-row ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                  {!msg.isMe && (
                    <View className="items-center self-end justify-center w-8 h-8 mb-5 mr-2 rounded-full bg-stone-200">
                      <Text className="text-[10px] font-bold text-stone-600">{msg.sender}</Text>
                    </View>
                  )}
                  <View className={`max-w-[80%] ${msg.isMe ? 'items-end' : 'items-start'}`}>
                    <View className={`px-4 py-3 rounded-2xl ${msg.isMe ? 'bg-emerald-600 rounded-br-none' : 'bg-white border border-stone-200 rounded-bl-none'}`}>
                      {msg.isVoice ? (
                        <View className="flex-row items-center w-48">
                          <Ionicons name="play-circle" size={32} color={msg.isMe ? "white" : "#10b981"} />
                          <View className="flex-1 h-1 ml-2 overflow-hidden rounded-full bg-stone-200">
                            <View className="w-1/2 h-full bg-emerald-400" />
                          </View>
                          <Text className={`ml-2 text-[10px] ${msg.isMe ? 'text-emerald-50' : 'text-stone-500'}`}>{msg.duration}</Text>
                        </View>
                      ) : (
                        <Text className={`text-sm leading-5 ${msg.isMe ? 'text-white' : 'text-stone-800'}`}>{msg.text}</Text>
                      )}
                    </View>
                    <View className="flex-row items-center px-1 mt-1">
                      <Text className="text-[10px] text-stone-400">{msg.time}</Text>
                      <View className="w-1 h-1 mx-1 rounded-full bg-stone-300" />
                      <Text className={`text-[10px] font-medium ${msg.status === 'Transcribed' ? 'text-emerald-500' : 'text-stone-400'}`}>{msg.status}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Input Area */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View className="p-4 bg-white border-t border-stone-100">
                <View className="flex-row items-center px-4 py-2 border bg-stone-50 border-stone-200 rounded-2xl">
                  <TouchableOpacity className="mr-2">
                    <Ionicons name="attach" size={22} color="#78716c" />
                  </TouchableOpacity>
                  <TextInput
                    placeholder="Message channel..."
                    className="flex-1 h-10 text-stone-800"
                    multiline
                  />
                  <TouchableOpacity className="items-center justify-center w-10 h-10 ml-2 shadow-sm bg-emerald-500 rounded-xl shadow-emerald-200">
                    <Ionicons name="mic" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </View>

      <AdminSidebarMobile
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={(route) => {
          setIsDrawerOpen(false);
          onNavigate(route);
        }}
        activeRoute="walkieTalkie"
        onSignOut={() => {}}
      />
    </View>
  );
}