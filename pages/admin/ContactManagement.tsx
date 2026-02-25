import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';

interface ContactManagementProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}

const contacts = [
  { id: 1, name: 'Security Team', members: '12 members', location: 'Group', initials: 'ST', color: '#a7f3d0', online: true, isGroup: true, groupId: 'group-1' },
  { id: 2, name: 'John Doe', members: null, location: 'Downtown HQ', initials: 'JD', color: '#99f6e4', online: true },
  { id: 3, name: 'Sarah Miller', members: null, location: 'Warehouse B', initials: 'SM', color: '#fde68a', online: false },
];

const messages = [
  { id: 1, sender: 'JD', text: 'All clear at the main entrance. Shifting to position B.', time: '10:23 AM', status: 'Transcribed' },
  { id: 2, sender: 'SM', text: 'Copy that. Warehouse perimeter secure. No unusual activity.', time: '10:25 AM', status: 'Transcribed' },
  { id: 3, sender: 'MK', text: 'Voice message', time: '10:28 AM', status: 'Processing', isVoice: true, duration: '0:12' },
];

export default function ContactManagement({ onNavigate }: ContactManagementProps) {
  // Visual states only for UI toggles
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);
  const [showContactList, setShowContactList] = React.useState(true);
  const [isRecording, setIsRecording] = React.useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = React.useState(false);
  const selectedContact = contacts[0];

  return (
    <View className="flex-1 bg-stone-50">
        {/* Header */}
        <View className="bg-white px-5 pt-4 pb-3 border-b border-stone-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity className="lg:hidden w-9 h-9 items-center justify-center mr-3">
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

        {/* Dynamic Viewport (Mobile/Desktop logic remains via showContactList toggle) */}
        <View className="flex-1 flex-row">
            {/* Contacts Panel */}
            <View className={`${!showContactList ? 'hidden lg:flex' : 'flex'} flex-1 lg:flex-none lg:w-96 bg-white border-r border-stone-200`}>
              <View className="px-5 pt-4 pb-3 border-b border-stone-100">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-base font-bold text-stone-900">Contacts</Text>
                  <TouchableOpacity onPress={() => setShowCreateGroupModal(true)}>
                    <Ionicons name="add" size={22} color="#10b981" />
                  </TouchableOpacity>
                </View>
                <View className="flex-row items-center bg-stone-50 rounded-lg px-3 py-2 border border-stone-200">
                  <Ionicons name="search" size={16} color="#a8a29e" />
                  <TextInput className="flex-1 ml-2 text-sm" placeholder="Search contacts..." placeholderTextColor="#a8a29e" />
                </View>
              </View>

              <ScrollView className="flex-1">
                {contacts.map((contact) => (
                  <TouchableOpacity key={contact.id} className="flex-row items-center px-5 py-4 border-b border-stone-50" onPress={() => setShowContactList(false)}>
                    <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: contact.color }}>
                      <Text className="text-stone-800 font-semibold">{contact.initials}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-stone-900">{contact.name}</Text>
                      <Text className="text-xs text-stone-500 mt-1">{contact.location}</Text>
                    </View>
                    {contact.online && <View className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Chat Panel */}
            <View className={`${showContactList ? 'hidden lg:flex' : 'flex'} flex-1 bg-stone-50`}>
              <View className="bg-white px-5 py-3 border-b border-stone-200 flex-row items-center">
                <TouchableOpacity className="lg:hidden mr-3" onPress={() => setShowContactList(true)}>
                  <Ionicons name="chevron-back" size={24} color="#78716c" />
                </TouchableOpacity>
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: selectedContact.color }}>
                  <Text className="font-bold">{selectedContact.initials}</Text>
                </View>
                <View>
                  <Text className="font-bold text-stone-900">{selectedContact.name}</Text>
                  <Text className="text-xs text-emerald-600">Active channel</Text>
                </View>
              </View>

              <ScrollView className="flex-1 px-5 py-4">
                {messages.map((message) => (
                  <View key={message.id} className="mb-4 flex-row items-start">
                    <View className="w-8 h-8 rounded-full items-center justify-center mr-2 bg-stone-200">
                      <Text className="text-xs font-bold">{message.sender}</Text>
                    </View>
                    <View className="flex-1">
                      <View className="bg-white p-3 rounded-2xl border border-stone-200">
                        <Text className="text-stone-800">{message.text}</Text>
                      </View>
                      <Text className="text-[10px] text-stone-400 mt-1">{message.time} • {message.status}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View className="bg-white p-4 border-t border-stone-200">
                <View className="flex-row items-center bg-stone-50 rounded-xl px-4 py-2 border border-stone-200">
                  <TextInput className="flex-1 h-10" placeholder="Type a message..." />
                  <TouchableOpacity className="mx-2" onPressIn={() => setIsRecording(true)} onPressOut={() => setIsRecording(false)}>
                    <Ionicons name="mic" size={24} color={isRecording ? "#ef4444" : "#10b981"} />
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <Ionicons name="send" size={24} color="#10b981" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
        </View>

        {/* Modals placeholders */}
        <Modal visible={isNotificationOpen} transparent animationType="fade">
          <Pressable className="flex-1 bg-black/20 items-center justify-center" onPress={() => setIsNotificationOpen(false)}>
            <View className="w-80 bg-white rounded-2xl p-6 items-center">
              <Text className="font-bold text-lg mb-2">Notifications</Text>
              <Text className="text-stone-500 mb-4">No new notifications</Text>
              <TouchableOpacity className="bg-emerald-500 px-6 py-2 rounded-lg" onPress={() => setIsNotificationOpen(false)}>
                <Text className="text-white font-bold">Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
    </View>
  );
}