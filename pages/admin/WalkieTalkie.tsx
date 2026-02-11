import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';

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

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View className="flex-1 flex-row bg-stone-50">
      {/* Desktop Sidebar - Hidden on mobile */}
      <View className="hidden lg:flex w-72 bg-white border-r border-stone-200">
          {/* Sidebar Header */}
        <View className="bg-emerald-50 px-6 pt-8 pb-6 border-b border-emerald-100">
          <View className="flex-row items-center gap-3">
            <View className="w-14 h-14 bg-emerald-100 rounded-2xl items-center justify-center">
              <Ionicons name="chatbubble" size={24} color="#10b981" />
            </View>
            <View>
              <Text className="text-base font-bold text-stone-900">Admin Portal</Text>
              <Text className="text-xs text-stone-500">Monitoring System</Text>
            </View>
          </View>
        </View>

        {/* Desktop Menu Items */}
        <ScrollView className="flex-1 px-4 py-4">
          {/* Dashboard */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('dashboard')}
          >
            <Ionicons name="grid-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Dashboard</Text>
          </TouchableOpacity>

          {/* Site Management */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('siteManagement')}
          >
            <Ionicons name="location-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Site Management</Text>
          </TouchableOpacity>

          {/* Walkie Talkie */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl bg-emerald-50"
            onPress={() => onNavigate('walkieTalkie')}
          >
            <Ionicons name="mic-outline" size={20} color="#10b981" />
            <Text className="ml-3 text-emerald-700 font-medium">Walkie Talkie</Text>
          </TouchableOpacity>

          {/* Activity Logs */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('activityLogs')}
          >
            <Ionicons name="clipboard-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Activity Logs</Text>
          </TouchableOpacity>

          {/* Company Lists */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('companyList')}
          >
            <Ionicons name="business-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Company Lists</Text>
          </TouchableOpacity>

          {/* Employees */}
          <TouchableOpacity 
            className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
            onPress={() => onNavigate('employee')}
          >
            <Ionicons name="people-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Employees</Text>
          </TouchableOpacity>

          <View className="border-t border-stone-200 my-4" />

          {/* Settings */}
          <TouchableOpacity className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50" onPress={() => onNavigate('settings')}>
            <Ionicons name="settings-outline" size={20} color="#78716c" />
            <Text className="ml-3 text-stone-700 font-medium">Settings</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Sign Out */}
        <View className="px-4 pb-6 pt-4 border-t border-stone-200">
          <TouchableOpacity className="flex-row items-center px-4 py-3 rounded-xl">
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            <Text className="ml-3 text-red-600 font-medium">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <View className="flex-1 bg-stone-50">
        {/* Header */}
        <View className="bg-white px-5 pt-4 pb-3 border-b border-stone-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              {/* Mobile Menu Button - Hidden on desktop */}
              <TouchableOpacity 
                className="lg:hidden w-9 h-9 items-center justify-center mr-3"
                onPress={() => setIsDrawerOpen(true)}
              >
                <Ionicons name="menu" size={24} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-lg lg:text-2xl font-bold text-stone-900">Walkie Talkie</Text>
                <Text className="text-stone-500 text-xs lg:text-sm mt-0.5">Welcome back, Administrator</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2.5">
              <TouchableOpacity
                className="w-9 h-9 bg-stone-100 rounded-full items-center justify-center"
                onPress={() => setIsNotificationOpen(true)}
                activeOpacity={0.7}
              >
                <View className="w-2 h-2 bg-red-500 rounded-full absolute top-1.5 right-1.5" />
                <Ionicons name="notifications-outline" size={18} color="#57534e" />
              </TouchableOpacity>
                    {/* Notification Modal */}
                    <Modal
                      visible={isNotificationOpen}
                      transparent
                      animationType="fade"
                      onRequestClose={() => setIsNotificationOpen(false)}
                    >
                      <Pressable
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => setIsNotificationOpen(false)}
                      >
                        <View
                          style={{
                            width: 320,
                            backgroundColor: 'rgba(255,255,255,0.85)',
                            borderRadius: 16,
                            padding: 24,
                            alignItems: 'center',
                          }}
                        >
                          <Ionicons name="notifications-outline" size={32} color="#10b981" style={{ marginBottom: 12 }} />
                          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#44403c', marginBottom: 8 }}>Notifications</Text>
                          <Text style={{ color: '#57534e', textAlign: 'center', marginBottom: 16 }}>
                            You have no new notifications.
                          </Text>
                          <TouchableOpacity
                            style={{ backgroundColor: '#10b981', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24 }}
                            onPress={() => setIsNotificationOpen(false)}
                          >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Close</Text>
                          </TouchableOpacity>
                        </View>
                      </Pressable>
                    </Modal>
              <View className="w-9 h-9 bg-emerald-100 rounded-full items-center justify-center">
                <Text className="text-emerald-700 font-semibold text-xs">AD</Text>
              </View>
              {/* Desktop User Info - Hidden on mobile */}
              <View className="hidden lg:flex ml-2">
                <Text className="text-sm font-semibold text-stone-900">Admin User</Text>
                <Text className="text-xs text-stone-500">Super Admin</Text>
              </View>
            </View>
          </View>
        </View>

          {/* Mobile View - Shows either contacts or chat */}
          <View className="lg:hidden flex-1">
            {showContactList ? (
              /* Contacts View */
              <View className="flex-1 bg-white">
                {/* Contacts Header */}
                <View className="px-4 pt-3 pb-2.5 border-b border-stone-100">
                  <View className="flex-row items-center justify-between mb-2.5">
                    <Text className="text-sm font-bold text-stone-900">Contacts</Text>
                    <TouchableOpacity className="w-7 h-7 items-center justify-center">
                      <Ionicons name="add" size={20} color="#10b981" />
                    </TouchableOpacity>
                  </View>

                  {/* Search Bar */}
                  <View className="flex-row items-center bg-stone-50 rounded-lg px-3 py-2 border border-stone-200">
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
                        <Text className="text-stone-800 font-semibold text-xs">{contact.initials}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-stone-900">{contact.name}</Text>
                        <Text className="text-xs text-stone-500 mt-0.5">
                          {contact.members ? `${contact.members} • ` : ''}{contact.location}
                        </Text>
                      </View>
                      {contact.online && (
                        <View className="w-2 h-2 bg-emerald-500 rounded-full" />
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
                        className="w-8 h-8 items-center justify-center mr-2"
                        onPress={() => setShowContactList(true)}
                      >
                        <Ionicons name="chevron-back" size={22} color="#78716c" />
                      </TouchableOpacity>
                      <View 
                        className="w-9 h-9 rounded-full items-center justify-center mr-2.5"
                        style={{ backgroundColor: selectedContact.color }}
                      >
                        <Text className="text-stone-800 font-semibold text-xs">{selectedContact.initials}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-stone-900">{selectedContact.name}</Text>
                        <View className="flex-row items-center mt-0.5">
                          <View className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1" />
                          <Text className="text-xs text-emerald-600">Active channel</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity className="w-8 h-8 items-center justify-center">
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
                          className="w-8 h-8 rounded-full items-center justify-center mr-2"
                          style={{ 
                            backgroundColor: message.sender === 'JD' ? '#99f6e4' : 
                                            message.sender === 'SM' ? '#fde68a' : '#bfdbfe' 
                          }}
                        >
                          <Text className="text-stone-800 font-semibold text-xs">{message.sender}</Text>
                        </View>
                        <View className="flex-1">
                          {message.isVoice ? (
                            <View className="bg-white rounded-xl p-2.5 border border-stone-200">
                              <View className="flex-row items-center">
                                <View className="w-8 h-8 bg-emerald-500 rounded-full items-center justify-center mr-2">
                                  <Ionicons name="play" size={14} color="white" />
                                </View>
                                <View className="flex-1">
                                  <View className="h-1 bg-stone-200 rounded-full">
                                    <View className="w-1/3 h-full bg-emerald-500 rounded-full" />
                                  </View>
                                  <Text className="text-xs text-stone-500 mt-1">{message.duration}</Text>
                                </View>
                              </View>
                            </View>
                          ) : (
                            <View className="bg-white rounded-xl px-3 py-2.5 border border-stone-200">
                              <Text className="text-sm text-stone-800 leading-5">{message.text}</Text>
                            </View>
                          )}
                          <View className="flex-row items-center mt-1 ml-0.5">
                            <Text className="text-xs text-stone-400">{message.time}</Text>
                            <Text className="text-xs text-emerald-600 ml-2">{message.status}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {/* Message Input */}
                <View className="bg-white px-4 py-2.5 border-t border-stone-200">
                  <View className="flex-row items-center bg-stone-50 rounded-lg px-3 py-2 border border-stone-200">
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
            <View className="lg:w-96 bg-white border-r border-stone-200">
              {/* Contacts Header */}
              <View className="px-5 pt-4 pb-3 border-b border-stone-100">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-base font-bold text-stone-900">Contacts</Text>
                  <TouchableOpacity className="w-8 h-8 items-center justify-center">
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
                      className="w-12 h-12 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: contact.color }}
                    >
                      <Text className="text-stone-800 font-semibold text-sm">{contact.initials}</Text>
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
              <View className="bg-white px-6 py-4 border-b border-stone-200">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View 
                      className="w-11 h-11 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: selectedContact.color }}
                    >
                      <Text className="text-stone-800 font-semibold text-sm">{selectedContact.initials}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-stone-900">{selectedContact.name}</Text>
                      <View className="flex-row items-center mt-1">
                        <View className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5" />
                        <Text className="text-sm text-emerald-600">Active channel</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity className="w-9 h-9 items-center justify-center">
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
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ 
                          backgroundColor: message.sender === 'JD' ? '#99f6e4' : 
                                          message.sender === 'SM' ? '#fde68a' : '#bfdbfe' 
                        }}
                      >
                        <Text className="text-stone-800 font-semibold text-sm">{message.sender}</Text>
                      </View>
                      <View className="flex-1">
                        {message.isVoice ? (
                          <View className="bg-white rounded-xl p-3 border border-stone-200">
                            <View className="flex-row items-center">
                              <View className="w-10 h-10 bg-emerald-500 rounded-full items-center justify-center mr-3">
                                <Ionicons name="play" size={16} color="white" />
                              </View>
                              <View className="flex-1">
                                <View className="h-1.5 bg-stone-200 rounded-full">
                                  <View className="w-1/3 h-full bg-emerald-500 rounded-full" />
                                </View>
                                <Text className="text-xs text-stone-500 mt-1.5">{message.duration}</Text>
                              </View>
                            </View>
                          </View>
                        ) : (
                          <View className="bg-white rounded-xl px-4 py-3 border border-stone-200">
                            <Text className="text-sm text-stone-800 leading-6">{message.text}</Text>
                          </View>
                        )}
                        <View className="flex-row items-center mt-1.5 ml-1">
                          <Text className="text-xs text-stone-400">{message.time}</Text>
                          <Text className="text-xs text-emerald-600 ml-3">{message.status}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Message Input */}
              <View className="bg-white px-6 py-4 border-t border-stone-200">
                <View className="flex-row items-center bg-stone-50 rounded-lg px-4 py-3 border border-stone-200">
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
      <Modal
        visible={isDrawerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <View className="flex-1 flex-row">
          {/* Drawer Content */}
          <View className="w-72 bg-white h-full shadow-2xl">
            {/* Drawer Header */}
            <View className="bg-emerald-50 px-6 pt-12 pb-6 border-b border-emerald-100">
              <View className="flex-row items-center gap-3 mb-3">
                <View className="w-14 h-14 bg-emerald-100 rounded-2xl items-center justify-center">
                  <Ionicons name="chatbubble" size={24} color="#10b981" />
                </View>
                <View>
                  <Text className="text-base font-bold text-stone-900">Admin Portal</Text>
                  <Text className="text-xs text-stone-500">Monitoring System</Text>
                </View>
              </View>
            </View>

            {/* Menu Items */}
            <ScrollView className="flex-1 px-4 py-4">
              {/* Dashboard */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('dashboard');
                }}
              >
                <Ionicons name="grid-outline" size={20} color="#78716c" />
                <Text className="ml-3 text-stone-700 font-medium">Dashboard</Text>
              </TouchableOpacity>

              {/* Site Management */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('siteManagement');
                }}
              >
                <Ionicons name="location-outline" size={20} color="#78716c" />
                <Text className="ml-3 text-stone-700 font-medium">Site Management</Text>
              </TouchableOpacity>

              {/* Walkie Talkie */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl bg-emerald-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('walkieTalkie');
                }}
              >
                <Ionicons name="mic-outline" size={20} color="#10b981" />
                <Text className="ml-3 text-emerald-700 font-medium">Walkie Talkie</Text>
              </TouchableOpacity>

              {/* Activity Logs */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('activityLogs');
                }}
              >
                <Ionicons name="clipboard-outline" size={20} color="#78716c" />
                <Text className="ml-3 text-stone-700 font-medium">Activity Logs</Text>
              </TouchableOpacity>

              {/* Company Lists */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('companyList');
                }}
              >
                <Ionicons name="business-outline" size={20} color="#78716c" />
                <Text className="ml-3 text-stone-700 font-medium">Company Lists</Text>
              </TouchableOpacity>

              {/* Employees */}
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50"
                onPress={() => {
                  setIsDrawerOpen(false);
                  onNavigate('employee');
                }}
              >
                <Ionicons name="people-outline" size={20} color="#78716c" />
                <Text className="ml-3 text-stone-700 font-medium">Employees</Text>
              </TouchableOpacity>

              <View className="border-t border-stone-200 my-4" />

              {/* Settings */}
              <TouchableOpacity className="flex-row items-center px-4 py-3 mb-1 rounded-xl hover:bg-stone-50" onPress={() => onNavigate('settings')}>
                <Ionicons name="settings-outline" size={20} color="#78716c" />
                <Text className="ml-3 text-stone-700 font-medium">Settings</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Sign Out */}
            <View className="px-4 pb-6 pt-4 border-t border-stone-200">
              <TouchableOpacity className="flex-row items-center px-4 py-3 rounded-xl">
                <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                <Text className="ml-3 text-red-600 font-medium">Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Overlay - Close drawer when tapped */}
          <Pressable 
            className="flex-1 bg-black/40" 
            onPress={() => setIsDrawerOpen(false)}
          />
        </View>
      </Modal>
    </View>
  );
}