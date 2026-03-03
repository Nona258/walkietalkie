import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';
import supabase, { getEmployees, getUserContacts, addContact, removeContact } from '../../utils/supabase';

interface ContactManagementProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
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

interface Team {
  id: string;
  name: string;
  capacity: number;
  members: Array<{ id: number; name: string; initials: string }>;
  color: string;
}

interface Employee {
  id: number;
  name: string;
  initials: string;
  location: string;
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

export default function ContactManagement({ onNavigate, isMobileMenuOpen, setIsMobileMenuOpen }: ContactManagementProps) {
  // Visual states only for UI toggles
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  
  const windowWidth = Dimensions.get('window').width;
  const isWebView = windowWidth > 900;
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);
  const [showContactList, setShowContactList] = React.useState(true);
  const [isRecording, setIsRecording] = React.useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = React.useState(false);
  const [showAddContactModal, setShowAddContactModal] = React.useState(false);
  const [showManageTeamsModal, setShowManageTeamsModal] = React.useState(false);
  const [showAssignEmployeesModal, setShowAssignEmployeesModal] = React.useState(false);
  const [selectedTeamForAssign, setSelectedTeamForAssign] = React.useState<Team | null>(null);
  
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  
  const [teams, setTeams] = React.useState<Team[]>([]);
  
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  
  const [messages, setMessages] = React.useState<Message[]>([]);
  
  const [selectedContactIdForChat, setSelectedContactIdForChat] = React.useState<number | null>(null);
  
  const [newTeamName, setNewTeamName] = React.useState('');
  const [newTeamCapacity, setNewTeamCapacity] = React.useState('5');
  const [searchContactName, setSearchContactName] = React.useState('');
  const [selectedContact, setSelectedContact] = React.useState<Employee | null>(null);
  const [selectedEmployees, setSelectedEmployees] = React.useState<Set<number>>(new Set());
  
  const filteredEmployees = searchContactName.trim()
    ? employees.filter(emp => 
        emp.name.toLowerCase().includes(searchContactName.toLowerCase())
      )
    : employees;
  
  const selectedContactForChat = selectedContactIdForChat ? contacts.find(c => c.id === selectedContactIdForChat) : null;

  const handleCreateTeam = () => {
    if (newTeamName.trim() && newTeamCapacity.trim()) {
      const newTeam: Team = {
        id: `team-${Date.now()}`,
        name: newTeamName,
        capacity: parseInt(newTeamCapacity),
        members: [],
        color: '#e8f5e9',
      };
      setTeams([...teams, newTeam]);
      setNewTeamName('');
      setNewTeamCapacity('5');
      setShowCreateGroupModal(false);
    }
  };

  const handleAddContact = async (employee: Employee) => {
    try {
      // Add to Supabase
      await addContact(employee.id.toString());
      
      // Add the employee as a contact locally
      const newContact = {
        id: employee.id,
        name: employee.name,
        members: null,
        location: employee.location,
        initials: employee.initials,
        color: '#e8f5e9',
        online: true,
      };
      setContacts([...contacts, newContact]);
      setSearchContactName('');
      setSelectedContact(employee);
      setShowAddContactModal(false);
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  };

  const handleRemoveContact = async (contactId: number) => {
    try {
      // Remove from Supabase
      await removeContact(contactId.toString());
      
      // Remove from local state
      setContacts(contacts.filter(c => c.id !== contactId));
      
      // If the removed contact was selected, deselect it
      if (selectedContactIdForChat === contactId) {
        setSelectedContactIdForChat(contacts.length > 1 ? contacts[0].id : null);
      }
    } catch (error) {
      console.error('Error removing contact:', error);
    }
  };

  const handleAssignEmployees = () => {
    if (selectedTeamForAssign && selectedEmployees.size > 0) {
      setTeams(teams.map(team => 
        team.id === selectedTeamForAssign.id 
          ? {
              ...team,
              members: [...team.members, ...employees.filter(emp => selectedEmployees.has(emp.id))]
            }
          : team
      ));
      setSelectedEmployees(new Set());
      setShowAssignEmployeesModal(false);
      setSelectedTeamForAssign(null);
    }
  };

  const toggleEmployeeSelection = (employeeId: number) => {
    const newSet = new Set(selectedEmployees);
    if (newSet.has(employeeId)) {
      newSet.delete(employeeId);
    } else {
      newSet.add(employeeId);
    }
    setSelectedEmployees(newSet);
  };

  // Fetch employees from Supabase on component mount
  React.useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await getEmployees();
        const mappedEmployees = data.map((user: any) => {
          // Extract initials from full_name
          const names = user.full_name?.split(' ') || ['U', 'U'];
          const initials = (names[0]?.[0] + (names[1]?.[0] || '')).toUpperCase();
          
          return {
            id: user.id,
            name: user.full_name || 'Unknown',
            initials: initials || 'UU',
            location: user.email || 'N/A',
          };
        });
        setEmployees(mappedEmployees);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };
    
    fetchEmployees();
  }, []);

  // Fetch saved contacts from Supabase on component mount
  React.useEffect(() => {
    const fetchContacts = async () => {
      try {
        const data = await getUserContacts();
        setContacts(data);
      } catch (error) {
        console.error('Error fetching contacts:', error);
      }
    };
    
    fetchContacts();
  }, []);

  // Set the first contact as selected when contacts change
  React.useEffect(() => {
    if (contacts.length > 0 && !selectedContactIdForChat) {
      setSelectedContactIdForChat(contacts[0].id);
    }
  }, [contacts, selectedContactIdForChat]);

  return (
    <View className="flex-1 bg-stone-50">
        {/* Header */}
        <View className="px-5 pt-4 pb-3 bg-white border-b border-stone-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              {!isWebView && setIsMobileMenuOpen && (
                <TouchableOpacity 
                  className="items-center justify-center mr-3 w-9 h-9"
                  onPress={() => setIsMobileMenuOpen(true)}
                >
                  <Ionicons name="menu" size={24} color="#237227" />
                </TouchableOpacity>
              )}
              <View className="flex-1">
                <Text className="text-xl font-light lg:text-3xl text-stone-900">Contact Management</Text>
                <Text className="text-stone-500 text-xs lg:text-base mt-0.5">Welcome back, Administrator</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2.5">
              <TouchableOpacity className="items-center justify-center rounded-full w-9 h-9 bg-stone-100" onPress={() => setIsNotificationOpen(true)}>
                <View className="w-2 h-2 bg-red-500 rounded-full absolute top-1.5 right-1.5" />
                <Ionicons name="notifications-outline" size={18} color="#57534e" />
              </TouchableOpacity>
              <View style={{ backgroundColor: '#e8f5e9' }} className="items-center justify-center rounded-full w-9 h-9">
                <Text style={{ color: '#237227' }} className="text-xs font-semibold">AD</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Dynamic Viewport (Mobile/Desktop logic remains via showContactList toggle) */}
        <View className="flex-row flex-1">
            {/* Contacts Panel */}
            <View className={`${!showContactList ? 'hidden lg:flex' : 'flex'} flex-1 lg:flex-none lg:w-96 bg-white border-r border-stone-200`}>
              <View className="px-5 pt-4 pb-3 border-b border-stone-100">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-base font-bold text-stone-900">Contacts</Text>
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity style={{ backgroundColor: '#e8f5e9' }} className="items-center justify-center w-8 h-8 rounded-full" onPress={() => setShowAddContactModal(true)}>
                      <Ionicons name="person-add" size={16} color="#237227" />
                    </TouchableOpacity>
                    <TouchableOpacity style={{ backgroundColor: '#e8f5e9' }} className="items-center justify-center w-8 h-8 rounded-full" onPress={() => setShowManageTeamsModal(true)}>
                      <Ionicons name="people" size={16} color="#237227" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View className="flex-row items-center px-3 py-2 border rounded-lg bg-stone-50 border-stone-200">
                  <Ionicons name="search" size={16} color="#a8a29e" />
                  <TextInput className="flex-1 ml-2 text-sm" placeholder="Search contacts..." placeholderTextColor="#a8a29e" />
                </View>
              </View>

              <ScrollView className="flex-1">
                {teams.map((team) => (
                  <TouchableOpacity key={team.id} className="flex-row items-center px-5 py-4 border-b border-stone-50" onPress={() => setShowContactList(false)}>
                    <View className="items-center justify-center w-12 h-12 mr-3 rounded-full" style={{ backgroundColor: team.color }}>
                      <Text className="font-semibold text-stone-800">{team.name.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-stone-900">{team.name}</Text>
                      <Text className="mt-1 text-xs text-stone-500">{team.members.length}/{team.capacity} members</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {contacts.map((contact) => (
                  <View key={contact.id} className="flex-row items-center px-5 py-4 border-b border-stone-50">
                    <TouchableOpacity 
                      className="flex-row items-center flex-1"
                      onPress={() => {
                        setSelectedContactIdForChat(contact.id);
                        setShowContactList(false);
                      }}
                    >
                      <View className="items-center justify-center w-12 h-12 mr-3 rounded-full" style={{ backgroundColor: contact.color }}>
                        <Text className="font-semibold text-stone-800">{contact.initials}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-stone-900">{contact.name}</Text>
                        <Text className="mt-1 text-xs text-stone-500">{contact.location}</Text>
                      </View>
                      {contact.online && <View style={{ backgroundColor: '#237227' }} className="w-2.5 h-2.5 rounded-full border-2 border-white" />}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="p-2 ml-2"
                      onPress={() => handleRemoveContact(contact.id)}
                    >
                      <Ionicons name="trash" size={18} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Chat Panel */}
            <View className={`${showContactList ? 'hidden lg:flex' : 'flex'} flex-1 bg-stone-50`}>
              {selectedContactForChat ? (
                <>
                  <View className="flex-row items-center px-5 py-3 bg-white border-b border-stone-200">
                    <TouchableOpacity className="mr-3 lg:hidden" onPress={() => setShowContactList(true)}>
                      <Ionicons name="chevron-back" size={24} color="#78716c" />
                    </TouchableOpacity>
                    <View className="items-center justify-center w-10 h-10 mr-3 rounded-full" style={{ backgroundColor: selectedContactForChat.color }}>
                      <Text className="font-bold">{selectedContactForChat.initials}</Text>
                    </View>
                    <View>
                      <Text className="font-bold text-stone-900">{selectedContactForChat.name}</Text>
                      <Text style={{ color: '#237227' }} className="text-xs">Active channel</Text>
                    </View>
                  </View>

              <ScrollView className="flex-1 px-5 py-4">
                {messages.map((message) => (
                  <View key={message.id} className="flex-row items-start mb-4">
                    <View className="items-center justify-center w-8 h-8 mr-2 rounded-full bg-stone-200">
                      <Text className="text-xs font-bold">{message.sender}</Text>
                    </View>
                    <View className="flex-1">
                      <View className="p-3 bg-white border rounded-2xl border-stone-200">
                        <Text className="text-stone-800">{message.text}</Text>
                      </View>
                      <Text className="text-[10px] text-stone-400 mt-1">{message.time} • {message.status}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View className="p-4 bg-white border-t border-stone-200">
                <View className="flex-row items-center px-4 py-2 border bg-stone-50 rounded-xl border-stone-200">
                  <TextInput className="flex-1 h-10" placeholder="Type a message..." />
                  <TouchableOpacity className="mx-2" onPressIn={() => setIsRecording(true)} onPressOut={() => setIsRecording(false)}>
                    <Ionicons name="mic" size={24} color={isRecording ? "#ef4444" : "#237227"} />
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <Ionicons name="send" size={24} color="#237227" />
                  </TouchableOpacity>
                </View>
              </View>
                </>
              ) : (
                <View className="items-center justify-center flex-1">
                  <Text className="text-stone-500">Select a contact to start chatting</Text>
                </View>
              )}
            </View>
        </View>

        {/* Modals */}
        {/* Notifications Modal */}
        <Modal visible={isNotificationOpen} transparent animationType="fade">
          <Pressable className="items-center justify-center flex-1 bg-black/20" onPress={() => setIsNotificationOpen(false)}>
            <View className="items-center p-6 bg-white w-80 rounded-2xl">
              <Text className="mb-2 text-lg font-bold">Notifications</Text>
              <Text className="mb-4 text-stone-500">No new notifications</Text>
              <TouchableOpacity style={{ backgroundColor: '#237227' }} className="px-6 py-2 rounded-lg" onPress={() => setIsNotificationOpen(false)}>
                <Text className="font-bold text-white">Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* Add Contact Modal */}
        <Modal visible={showAddContactModal} transparent animationType="fade">
          <Pressable className="items-center justify-center flex-1 p-4 bg-black/20" onPress={() => setShowAddContactModal(false)}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View className="p-6 bg-white w-96 rounded-2xl max-h-96">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-lg font-bold">Add New Contact</Text>
                  <TouchableOpacity onPress={() => {
                    setShowAddContactModal(false);
                    setSearchContactName('');
                  }}>
                    <Ionicons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                <View className="mb-4">
                  <Text className="mb-1 text-xs font-semibold text-stone-700">Search Employee Name</Text>
                  <TextInput 
                    className="px-3 py-2 text-sm border rounded-lg border-stone-300"
                    placeholder="Type employee name"
                    value={searchContactName}
                    onChangeText={setSearchContactName}
                    placeholderTextColor="#a8a29e"
                  />
                </View>
                <ScrollView className="mb-4 max-h-56">
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map(employee => (
                      <View
                        key={employee.id}
                        className="flex-row items-center justify-between p-3 mb-2 border rounded-lg bg-stone-50 border-stone-200"
                      >
                        <View className="flex-row items-center flex-1">
                          <View style={{ backgroundColor: '#e8f5e9' }} className="items-center justify-center w-10 h-10 mr-3 rounded-full">
                            <Text style={{ color: '#237227' }} className="text-xs font-bold">{employee.initials}</Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-sm font-semibold text-stone-900">{employee.name}</Text>
                            <Text className="text-xs text-stone-500">{employee.location}</Text>
                          </View>
                        </View>
                        <TouchableOpacity 
                          style={{ backgroundColor: '#237227' }}
                          className="ml-2 px-3 py-1.5 rounded"
                          onPress={() => handleAddContact(employee)}
                        >
                          <Text className="text-xs font-semibold text-white">Add</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text className="py-4 text-sm text-center text-stone-500">No employees found</Text>
                  )}
                </ScrollView>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Create Team Modal */}
        <Modal visible={showCreateGroupModal} transparent animationType="fade">
          <Pressable className="items-center justify-center flex-1 bg-black/20" onPress={() => setShowCreateGroupModal(false)}>
            <View className="p-6 bg-white w-96 rounded-2xl">
              <Text className="mb-4 text-lg font-bold">Create New Team</Text>
              <View className="mb-4">
                <Text className="mb-1 text-xs font-semibold text-stone-700">Team Name</Text>
                <TextInput 
                  className="px-3 py-2 text-sm border rounded-lg border-stone-300"
                  placeholder="Enter team name"
                  value={newTeamName}
                  onChangeText={setNewTeamName}
                  placeholderTextColor="#a8a29e"
                />
              </View>
              <View className="mb-4">
                <Text className="mb-1 text-xs font-semibold text-stone-700">Team Capacity (employees)</Text>
                <TextInput 
                  className="px-3 py-2 text-sm border rounded-lg border-stone-300"
                  placeholder="Enter team capacity"
                  value={newTeamCapacity}
                  onChangeText={setNewTeamCapacity}
                  keyboardType="numeric"
                  placeholderTextColor="#a8a29e"
                />
              </View>
              <View className="flex-row justify-end gap-3">
                <TouchableOpacity style={{ backgroundColor: '#237227' }} className="px-4 py-2 rounded-lg" onPress={() => {
                  setShowCreateGroupModal(false);
                  setNewTeamName('');
                  setNewTeamCapacity('5');
                }}>
                  <Text style={{ color: '#f8fafb' }} className="font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ backgroundColor: '#237227' }} className="px-4 py-2 rounded-lg" onPress={handleCreateTeam}>
                  <Text style={{ color: '#f8fafb' }} className="font-semibold">Create Team</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* Manage Teams Modal */}
        <Modal visible={showManageTeamsModal} transparent animationType="fade">
          <Pressable className="items-center justify-center flex-1 p-4 bg-black/20" onPress={() => setShowManageTeamsModal(false)}>
            <View className="p-6 bg-white w-96 rounded-2xl max-h-96">
              <Text className="mb-4 text-lg font-bold">Manage Teams</Text>
              <ScrollView className="mb-4 max-h-64">
                {teams.map(team => (
                  <View key={team.id} className="p-3 mb-3 border rounded-lg bg-stone-50 border-stone-200">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center flex-1">
                        <View className="items-center justify-center w-8 h-8 mr-2 rounded-full" style={{ backgroundColor: team.color }}>
                          <Text className="text-xs font-bold text-stone-800">{team.name.slice(0, 2).toUpperCase()}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="font-semibold text-stone-900">{team.name}</Text>
                          <Text className="text-xs text-stone-500">Capacity: {team.members.length}/{team.capacity}</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={{ backgroundColor: '#237227' }}
                      className="px-3 py-1.5 rounded text-center"
                      onPress={() => {
                        setSelectedTeamForAssign(team);
                        setShowManageTeamsModal(false);
                        setShowAssignEmployeesModal(true);
                      }}
                    >
                      <Text className="text-xs font-semibold text-center text-white">Assign Employees</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <View className="flex-row justify-end gap-3 mb-3">
                <TouchableOpacity style={{ backgroundColor: '#237227' }} className="flex-1 px-4 py-2 rounded-lg" onPress={() => {
                  setShowManageTeamsModal(false);
                  setShowCreateGroupModal(true);
                }}>
                  <Text style={{ color: '#f8fafb' }} className="font-semibold text-center">+ Create Team</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={{ backgroundColor: '#237227' }} className="px-4 py-2 rounded-lg" onPress={() => setShowManageTeamsModal(false)}>
                <Text style={{ color: '#f8fafb' }} className="font-semibold text-center">Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* Assign Employees Modal */}
        <Modal visible={showAssignEmployeesModal} transparent animationType="fade">
          <Pressable className="items-center justify-center flex-1 p-4 bg-black/20" onPress={() => setShowAssignEmployeesModal(false)}>
            <View className="p-6 bg-white w-96 rounded-2xl max-h-96">
              <Text className="mb-2 text-lg font-bold">Assign Employees to {selectedTeamForAssign?.name}</Text>
              <Text className="mb-4 text-xs text-stone-500">Available slots: {selectedTeamForAssign ? selectedTeamForAssign.capacity - selectedTeamForAssign.members.length : 0}</Text>
              <ScrollView className="mb-4 max-h-56">
                {employees.map(employee => (
                  <TouchableOpacity 
                    key={employee.id}
                    style={selectedEmployees.has(employee.id) ? { backgroundColor: '#e8f5e9', borderColor: '#237227' } : { backgroundColor: '#fafaf9', borderColor: '#e7e5e4' }}
                    className="flex-row items-center p-3 mb-2 border rounded-lg"
                    onPress={() => toggleEmployeeSelection(employee.id)}
                  >
                    <View style={selectedEmployees.has(employee.id) ? { backgroundColor: '#237227', borderColor: '#237227' } : { borderColor: '#d6d3d1' }} className="items-center justify-center w-5 h-5 mr-3 border-2 rounded">
                      {selectedEmployees.has(employee.id) && <Ionicons name="checkmark" size={16} color="white" />}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-stone-900">{employee.name}</Text>
                      <Text className="text-xs text-stone-500">{employee.location}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View className="flex-row justify-end gap-3">
                <TouchableOpacity className="px-4 py-2 border rounded-lg border-stone-300" onPress={() => {
                  setShowAssignEmployeesModal(false);
                  setSelectedEmployees(new Set());
                  setSelectedTeamForAssign(null);
                }}>
                  <Text className="font-semibold text-stone-700">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ backgroundColor: '#237227' }} className="px-4 py-2 rounded-lg" onPress={handleAssignEmployees}>
                  <Text className="font-semibold text-white">Assign ({selectedEmployees.size})</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>
    </View>
  );
}