import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';

interface WalkieTalkieProps {
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
}

interface Message {
  id: number;
  sender: string;
  text: string;
  time: string;
  status: string;
  isVoice?: boolean;
  duration?: string;
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

export default function WalkieTalkie({ onNavigate }: WalkieTalkieProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(contacts[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showContactList, setShowContactList] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  
  // Group Management States
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  
  // Database users state
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    (user.full_name?.toLowerCase().includes(employeeSearch.toLowerCase()) || false) ||
    user.email.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    user.role.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  // Fetch users from database
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      // Replace with your actual Supabase endpoint
      const response = await fetch('/api/users', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        // Transform users to include initials and color
        const transformedUsers: User[] = data.map((user: any) => ({
          ...user,
          initials: getInitials(user.full_name),
          color: getRandomColor(),
        }));
        setUsers(transformedUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Initialize Speech Recognition - FIXED VERSION
  useEffect(() => {
    // Check if speech recognition is available
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported in this browser');
      return;
    }

    // Create new instance
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    // Handle results
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptText + ' ';
        } else {
          interimTranscript += transcriptText;
        }
      }

      // Update transcript state with final or interim results
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      } else if (interimTranscript) {
        setTranscript(prev => {
          // Remove any previous interim results and add new one
          const lastFinalIndex = prev.lastIndexOf(' ');
          const baseTranscript = lastFinalIndex > 0 ? prev.substring(0, lastFinalIndex + 1) : '';
          return baseTranscript + interimTranscript;
        });
      }
    };

    // Handle errors
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        console.log('No speech detected, continuing...');
      } else if (event.error === 'audio-capture') {
        alert('Microphone not accessible. Please check permissions.');
        setIsRecording(false);
      } else if (event.error === 'not-allowed') {
        alert('Microphone permission denied. Please enable it in browser settings.');
        setIsRecording(false);
      }
    };

    // Handle end event
    recognition.onend = () => {
      console.log('Speech recognition ended');
      // Only restart if we're still supposed to be recording
      if (isRecording && recognitionRef.current) {
        try {
          recognition.start();
        } catch (error) {
          console.log('Recognition restart error:', error);
        }
      }
    };

    // Handle start event
    recognition.onstart = () => {
      console.log('Speech recognition started');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.log('Cleanup error:', error);
        }
      }
    };
  }, []); // Remove isRecording from dependencies

  // Separate effect to handle recording state changes
  useEffect(() => {
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        console.log('Starting speech recognition...');
      } catch (error) {
        console.log('Recognition already started or error:', error);
      }
    } else if (!isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('Stopping speech recognition...');
      } catch (error) {
        console.log('Recognition already stopped or error:', error);
      }
    }
  }, [isRecording]);

  const startRecording = () => {
    console.log('Start recording button pressed');
    setIsRecording(true);
    setRecordingTime(0);
    setTranscript('');

    recordingInterval.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    console.log('Stop recording button pressed');
    setIsRecording(false);

    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
    }

    // Send the transcript as a message
    if (transcript.trim()) {
      sendMessage(transcript.trim());
    }
  };

  const sendMessage = (text: string) => {
    // TODO: Implement actual message sending logic
    console.log('Sending message:', text);
    // Add message to messages array
    // Reset transcript
    setTranscript('');
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) {
      alert('Please enter a group name and select at least one member');
      return;
    }

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName,
          memberIds: selectedMembers,
        }),
      });

      if (response.ok) {
        const newGroup = await response.json();
        console.log('Group created:', newGroup);
        // Refresh contacts list
        setShowCreateGroupModal(false);
        setGroupName('');
        setSelectedMembers([]);
      }
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group. Please try again.');
    }
  };

  const addMembersToGroup = async () => {
    if (!currentGroupId || selectedMembers.length === 0) {
      alert('Please select at least one member to add');
      return;
    }

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/groups/${currentGroupId}/add-members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberIds: selectedMembers,
        }),
      });

      if (response.ok) {
        console.log('Members added successfully');
        setShowAddMembersModal(false);
        setSelectedMembers([]);
        setCurrentGroupId(null);
      }
    } catch (error) {
      console.error('Error adding members:', error);
      alert('Failed to add members. Please try again.');
    }
  };

  const openAddMembersModal = (groupId: string) => {
    setCurrentGroupId(groupId);
    setSelectedMembers([]);
    fetchUsers(); // Load users when opening modal
    setShowAddMembersModal(true);
  };

  const openCreateGroupModal = () => {
    setSelectedMembers([]);
    setGroupName('');
    fetchUsers(); // Load users when opening modal
    setShowCreateGroupModal(true);
  };

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
                    <TouchableOpacity 
                      className="w-7 h-7 items-center justify-center"
                      onPress={openCreateGroupModal}
                    >
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
                      <View className="flex-row items-center gap-2">
                        {contact.isGroup && (
                          <TouchableOpacity
                            onPress={() => contact.groupId && openAddMembersModal(contact.groupId)}
                            className="w-7 h-7 items-center justify-center"
                          >
                            <Ionicons name="person-add-outline" size={16} color="#10b981" />
                          </TouchableOpacity>
                        )}
                        {contact.online && (
                          <View className="w-2 h-2 bg-emerald-500 rounded-full" />
                        )}
                      </View>
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
                    <View className="flex-row items-center gap-2">
                      {selectedContact.isGroup && (
                        <TouchableOpacity 
                          className="w-8 h-8 items-center justify-center"
                          onPress={() => selectedContact.groupId && openAddMembersModal(selectedContact.groupId)}
                        >
                          <Ionicons name="person-add-outline" size={18} color="#10b981" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity className="w-8 h-8 items-center justify-center">
                        <Ionicons name="ellipsis-vertical" size={18} color="#78716c" />
                      </TouchableOpacity>
                    </View>
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

                {/* Recording Indicator */}
                {isRecording && (
                  <View className="bg-red-50 px-4 py-2 border-t border-red-100">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse" />
                        <Text className="text-sm font-medium text-red-700">Recording</Text>
                        <Text className="text-sm text-red-600 ml-2">{formatRecordingTime(recordingTime)}</Text>
                      </View>
                      {transcript && (
                        <Text className="text-xs text-stone-600 flex-1 ml-3" numberOfLines={1}>
                          {transcript}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Message Input */}
                <View className="bg-white px-4 py-2.5 border-t border-stone-200">
                  <View className="flex-row items-center bg-stone-50 rounded-lg px-3 py-2 border border-stone-200">
                    <TextInput
                      className="flex-1 text-sm text-stone-900"
                      placeholder="Type a message..."
                      placeholderTextColor="#a8a29e"
                      value={transcript}
                      onChangeText={setTranscript}
                    />
                    <TouchableOpacity 
                      className="ml-2.5"
                      onPressIn={startRecording}
                      onPressOut={stopRecording}
                    >
                      <View className={`w-8 h-8 rounded-full items-center justify-center ${isRecording ? 'bg-red-500' : 'bg-transparent'}`}>
                        <Ionicons name="mic" size={20} color={isRecording ? 'white' : '#10b981'} />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="ml-2.5"
                      onPress={() => transcript.trim() && sendMessage(transcript.trim())}
                    >
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
                  <TouchableOpacity 
                    className="w-8 h-8 items-center justify-center"
                    onPress={openCreateGroupModal}
                  >
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
                    <View className="flex-row items-center gap-2">
                      {contact.isGroup && (
                        <TouchableOpacity
                          onPress={() => contact.groupId && openAddMembersModal(contact.groupId)}
                          className="w-8 h-8 items-center justify-center"
                        >
                          <Ionicons name="person-add-outline" size={18} color="#10b981" />
                        </TouchableOpacity>
                      )}
                      {contact.online && (
                        <View className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                      )}
                    </View>
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
                  <View className="flex-row items-center gap-3">
                    {selectedContact.isGroup && (
                      <TouchableOpacity 
                        className="w-9 h-9 items-center justify-center hover:bg-stone-50 rounded-full"
                        onPress={() => selectedContact.groupId && openAddMembersModal(selectedContact.groupId)}
                      >
                        <Ionicons name="person-add-outline" size={20} color="#10b981" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity className="w-9 h-9 items-center justify-center hover:bg-stone-50 rounded-full">
                      <Ionicons name="ellipsis-vertical" size={20} color="#78716c" />
                    </TouchableOpacity>
                  </View>
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

              {/* Recording Indicator */}
              {isRecording && (
                <View className="bg-red-50 px-6 py-3 border-t border-red-100">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse" />
                      <Text className="text-sm font-medium text-red-700">Recording</Text>
                      <Text className="text-sm text-red-600 ml-3">{formatRecordingTime(recordingTime)}</Text>
                    </View>
                    {transcript && (
                      <Text className="text-sm text-stone-600 flex-1 ml-6" numberOfLines={2}>
                        {transcript}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Message Input */}
              <View className="bg-white px-6 py-4 border-t border-stone-200">
                <View className="flex-row items-center bg-stone-50 rounded-lg px-4 py-3 border border-stone-200">
                  <TextInput
                    className="flex-1 text-sm text-stone-900"
                    placeholder="Type a message..."
                    placeholderTextColor="#a8a29e"
                    value={transcript}
                    onChangeText={setTranscript}
                  />
                  <TouchableOpacity 
                    className="ml-3"
                    onPressIn={startRecording}
                    onPressOut={stopRecording}
                  >
                    <View className={`w-9 h-9 rounded-full items-center justify-center ${isRecording ? 'bg-red-500' : 'bg-transparent'}`}>
                      <Ionicons name="mic" size={22} color={isRecording ? 'white' : '#10b981'} />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="ml-3"
                    onPress={() => transcript.trim() && sendMessage(transcript.trim())}
                  >
                    <Ionicons name="send" size={22} color="#10b981" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
      </View>

      {/* Create Group Modal */}
      <Modal
        visible={showCreateGroupModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateGroupModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end lg:justify-center lg:items-center">
          <View className="bg-white rounded-t-3xl lg:rounded-2xl lg:w-[600px] lg:max-h-[80vh] max-h-[90vh]">
            {/* Modal Header */}
            <View className="px-6 pt-6 pb-4 border-b border-stone-200">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-stone-900">Create Group</Text>
                <TouchableOpacity onPress={() => setShowCreateGroupModal(false)}>
                  <Ionicons name="close" size={24} color="#78716c" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Group Name Input */}
            <View className="px-6 py-4 border-b border-stone-100">
              <Text className="text-sm font-medium text-stone-700 mb-2">Group Name</Text>
              <TextInput
                className="bg-stone-50 rounded-lg px-4 py-3 text-sm text-stone-900 border border-stone-200"
                placeholder="Enter group name..."
                placeholderTextColor="#a8a29e"
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>

            {/* Member Selection */}
            <View className="flex-1">
              <View className="px-6 py-3 border-b border-stone-100">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Select Members ({selectedMembers.length})
                </Text>
                <View className="flex-row items-center bg-stone-50 rounded-lg px-3 py-2 border border-stone-200">
                  <Ionicons name="search" size={16} color="#a8a29e" />
                  <TextInput
                    className="flex-1 ml-2 text-sm text-stone-900"
                    placeholder="Search users..."
                    placeholderTextColor="#a8a29e"
                    value={employeeSearch}
                    onChangeText={setEmployeeSearch}
                  />
                </View>
              </View>

              <ScrollView className="flex-1">
                {isLoadingUsers ? (
                  <View className="items-center justify-center py-8">
                    <Text className="text-stone-500">Loading users...</Text>
                  </View>
                ) : filteredUsers.length === 0 ? (
                  <View className="items-center justify-center py-8">
                    <Text className="text-stone-500">No users found</Text>
                  </View>
                ) : (
                  filteredUsers.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      className="flex-row items-center px-6 py-3 border-b border-stone-50"
                      onPress={() => toggleMemberSelection(user.id)}
                    >
                      <View 
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: user.color }}
                      >
                        <Text className="text-stone-800 font-semibold text-sm">{user.initials}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-stone-900">
                          {user.full_name || user.email}
                        </Text>
                        <Text className="text-xs text-stone-500">{user.role} • {user.email}</Text>
                      </View>
                      <View className={`w-5 h-5 rounded border-2 items-center justify-center ${
                        selectedMembers.includes(user.id) 
                          ? 'bg-emerald-500 border-emerald-500' 
                          : 'border-stone-300'
                      }`}>
                        {selectedMembers.includes(user.id) && (
                          <Ionicons name="checkmark" size={14} color="white" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>

            {/* Action Buttons */}
            <View className="px-6 py-4 border-t border-stone-200 flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-stone-100 rounded-lg py-3 items-center"
                onPress={() => setShowCreateGroupModal(false)}
              >
                <Text className="text-stone-700 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-emerald-500 rounded-lg py-3 items-center"
                onPress={createGroup}
              >
                <Text className="text-white font-semibold">Create Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Members Modal */}
      <Modal
        visible={showAddMembersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddMembersModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end lg:justify-center lg:items-center">
          <View className="bg-white rounded-t-3xl lg:rounded-2xl lg:w-[600px] lg:max-h-[80vh] max-h-[90vh]">
            {/* Modal Header */}
            <View className="px-6 pt-6 pb-4 border-b border-stone-200">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-stone-900">Add Members</Text>
                <TouchableOpacity onPress={() => setShowAddMembersModal(false)}>
                  <Ionicons name="close" size={24} color="#78716c" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Member Selection */}
            <View className="flex-1">
              <View className="px-6 py-3 border-b border-stone-100">
                <Text className="text-sm font-medium text-stone-700 mb-2">
                  Select Members to Add ({selectedMembers.length})
                </Text>
                <View className="flex-row items-center bg-stone-50 rounded-lg px-3 py-2 border border-stone-200">
                  <Ionicons name="search" size={16} color="#a8a29e" />
                  <TextInput
                    className="flex-1 ml-2 text-sm text-stone-900"
                    placeholder="Search users..."
                    placeholderTextColor="#a8a29e"
                    value={employeeSearch}
                    onChangeText={setEmployeeSearch}
                  />
                </View>
              </View>

              <ScrollView className="flex-1">
                {isLoadingUsers ? (
                  <View className="items-center justify-center py-8">
                    <Text className="text-stone-500">Loading users...</Text>
                  </View>
                ) : filteredUsers.length === 0 ? (
                  <View className="items-center justify-center py-8">
                    <Text className="text-stone-500">No users found</Text>
                  </View>
                ) : (
                  filteredUsers.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      className="flex-row items-center px-6 py-3 border-b border-stone-50"
                      onPress={() => toggleMemberSelection(user.id)}
                    >
                      <View 
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: user.color }}
                      >
                        <Text className="text-stone-800 font-semibold text-sm">{user.initials}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-stone-900">
                          {user.full_name || user.email}
                        </Text>
                        <Text className="text-xs text-stone-500">{user.role} • {user.email}</Text>
                      </View>
                      <View className={`w-5 h-5 rounded border-2 items-center justify-center ${
                        selectedMembers.includes(user.id) 
                          ? 'bg-emerald-500 border-emerald-500' 
                          : 'border-stone-300'
                      }`}>
                        {selectedMembers.includes(user.id) && (
                          <Ionicons name="checkmark" size={14} color="white" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>

            {/* Action Buttons */}
            <View className="px-6 py-4 border-t border-stone-200 flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-stone-100 rounded-lg py-3 items-center"
                onPress={() => setShowAddMembersModal(false)}
              >
                <Text className="text-stone-700 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-emerald-500 rounded-lg py-3 items-center"
                onPress={addMembersToGroup}
              >
                <Text className="text-white font-semibold">Add Members</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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