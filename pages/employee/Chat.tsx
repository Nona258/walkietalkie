import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Platform, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import supabase from '../../utils/supabase';

interface Contact {
  id: string;
  name: string;
  role: string;
  initials: string;
  status: 'online' | 'offline' | 'busy';
  avatar_color: string;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  type?: 'text' | 'image' | 'media';
  isRead?: boolean;
}



interface ChatProps {
  selectedContact: Contact;
  onBackPress: () => void;
  currentUserId?: string;
}

export default function Chat({ selectedContact, onBackPress, currentUserId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognizedTranscript, setRecognizedTranscript] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingAnimation] = useState(new Animated.Value(0));
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(currentUserId || null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const messagesSubscriptionRef = useRef<any>(null);

  // Fetch current user if not provided
  useEffect(() => {
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

  // Fetch messages for conversation with selected contact
  useEffect(() => {
    if (!activeChatUserId || !selectedContact?.id) {
      setMessages([]);
      setLoadingMessages(false);
      if (messagesSubscriptionRef.current) {
        messagesSubscriptionRef.current.unsubscribe();
        messagesSubscriptionRef.current = null;
      }
      return;
    }
    
    fetchConversationMessages();
    setupRealtimeSubscription();

    return () => {
      if (messagesSubscriptionRef.current) {
        messagesSubscriptionRef.current.unsubscribe();
        messagesSubscriptionRef.current = null;
      }
    };
  }, [selectedContact?.id, activeChatUserId]);

  const fetchConversationMessages = async () => {
    try {
      setLoadingMessages(true);
      
      // First fetch all conversations (without .or() filter to avoid 406 errors)
      const { data: allConversations } = await supabase
        .from('conversations')
        .select('id,user_one,user_two');
      
      // Filter for conversation between these two users
      let conversationData = null;
      if (allConversations && allConversations.length > 0) {
        conversationData = allConversations.find((conv: any) => 
          (conv.user_one === activeChatUserId && conv.user_two === selectedContact.id) ||
          (conv.user_one === selectedContact.id && conv.user_two === activeChatUserId)
        );
      }

      if (!conversationData?.id) {
        // No conversation found, return empty messages
        setMessages([]);
        setConversationId(null);
        
        // Try to create a new conversation
        try {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert([{
              user_one: activeChatUserId,
              user_two: selectedContact.id
            }])
            .select('id')
            .single();
          
          if (newConv?.id) {
            setConversationId(newConv.id);
          }
        } catch (e) {
          console.error('Error creating conversation:', e);
        }
        
        setLoadingMessages(false);
        return;
      }

      setConversationId(conversationData.id);

      // Now fetch messages for this conversation
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationData.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        setMessages([]);
        setLoadingMessages(false);
        return;
      }

      const formattedMessages: Message[] = (messagesData || []).map((msg: any) => {
        const isOwn = msg.sender_id === activeChatUserId;
        const created = msg.created_at ? new Date(msg.created_at) : new Date();
        return {
          id: String(msg.id),
          sender: isOwn ? 'You' : selectedContact.initials,
          content: msg.transcription || '',
          timestamp: created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOwn,
          status: 'read',
          type: 'text',
          isRead: isOwn ? true : false,
        };
      });
      
      setMessages(formattedMessages);
    } catch (e) {
      console.error('Error fetching conversation messages:', e);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!conversationId) return;

    try {
      // Subscribe to new messages for this specific conversation
      messagesSubscriptionRef.current = supabase
        .channel(`messages:conversation:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const newMsg = payload.new as any;
            const isOwn = newMsg.sender_id === activeChatUserId;
            const created = newMsg.created_at ? new Date(newMsg.created_at) : new Date();
            
            const formattedMsg: Message = {
              id: String(newMsg.id),
              sender: isOwn ? 'You' : selectedContact.initials,
              content: newMsg.transcription || '',
              timestamp: created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isOwn,
              status: 'read',
              type: 'text',
              isRead: isOwn ? true : false,
            };

            // Add message if it doesn't already exist
            setMessages((prevMessages) => {
              const msgExists = prevMessages.some((m) => m.id === formattedMsg.id);
              if (!msgExists) {
                return [...prevMessages, formattedMsg];
              }
              return prevMessages;
            });
          }
        )
        .subscribe();
    } catch (error) {
      console.error('Error setting up realtime subscription:', error);
    }
  };

  useEffect(() => {
    // Simulate contact typing occasionally
    const typingTimer = Math.random() > 0.6;
    if (typingTimer) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  // Mark unread messages as read when viewed
  useEffect(() => {
    // Only mark as read if there are unread messages from the contact
    const hasUnread = messages.some(msg => !msg.isOwn && msg.isRead === false);
    if (hasUnread) {
      // Mark all unread messages as read after a short delay (to simulate reading)
      const timer = setTimeout(() => {
        setMessages(msgs =>
          msgs.map(msg =>
            !msg.isOwn && msg.isRead === false
              ? { ...msg, isRead: true }
              : msg
          )
        );
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Listen for speech recognition results
  useSpeechRecognitionEvent('result', (event: any) => {
    if (event.results && event.results.length > 0) {
      const lastResultIndex = event.results.length - 1;
      const lastResult = event.results[lastResultIndex];
      
      let fullTranscript = '';
      for (let i = 0; i <= lastResultIndex; i++) {
        if (event.results[i]) {
          fullTranscript += event.results[i].transcript + ' ';
        }
      }
      
      setRecognizedTranscript(fullTranscript.trim());
    }
  });

  // Listen for when recognition ends - send message only once here
  useSpeechRecognitionEvent('end', async () => {
    if (recognizedTranscript.trim() && activeChatUserId) {
      const capitalizedText = recognizedTranscript.charAt(0).toUpperCase() + recognizedTranscript.slice(1);
      const tempId = Date.now().toString();
      
      const newMessage: Message = {
        id: tempId,
        sender: 'You',
        content: capitalizedText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isOwn: true,
        status: 'sending',
        type: 'text',
      };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setRecognizedTranscript('');
      setMessageText('');

      try {
        // Ensure conversation exists
        if (!conversationId) {
          console.error('No conversation ID available');
          setMessages(msgs => msgs.filter(m => m.id !== tempId));
          return;
        }
        
        // Save to Supabase
        const { data, error } = await supabase
          .from('messages')
          .insert([
            {
              conversation_id: conversationId,
              sender_id: activeChatUserId,
              receiver_id: selectedContact.id,
              content: capitalizedText,
              transcription: capitalizedText,
              created_at: new Date().toISOString(),
            }
          ])
          .select()
          .single();

        if (error) throw error;

        // Update message with real id and mark as sent
        setMessages(msgs =>
          msgs.map(m =>
            m.id === tempId 
              ? { ...m, id: String(data.id), status: 'sent' as const } 
              : m
          )
        );

        // Mark as delivered
        setTimeout(() => {
          setMessages(msgs =>
            msgs.map(m =>
              m.id === String(data.id) ? { ...m, status: 'delivered' as const } : m
            )
          );
        }, 500);
      } catch (err) {
        console.error('Error saving voice message:', err);
        // Remove failed message
        setMessages(msgs => msgs.filter(m => m.id !== tempId));
      }
    }
    setIsRecording(false);
    setIsListening(false);
  });

  // Listen for errors
  useSpeechRecognitionEvent('error', (event: any) => {
    console.error('Speech recognition error:', event);
    setRecognizedTranscript('');
    setIsRecording(false);
    setIsListening(false);
    
    if (event?.error && event.error !== 'network') {
      Alert.alert('Error', 'Failed to recognize speech. Please try again.');
    }
  });

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeChatUserId) return;
    
    const messageContent = messageText.trim();
    const tempId = Date.now().toString();
    
    // Add to UI optimistically
    const newMessage: Message = {
      id: tempId,
      sender: 'You',
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isOwn: true,
      status: 'sending',
      type: 'text',
    };
    setMessages([...messages, newMessage]);
    setMessageText('');

    try {
      // Ensure conversation exists
      if (!conversationId) {
        console.error('No conversation ID available');
        setMessages(msgs => msgs.filter(m => m.id !== tempId));
        return;
      }
      
      // Save to Supabase
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversationId,
            sender_id: activeChatUserId,
            receiver_id: selectedContact.id,
            content: messageContent,
            transcription: messageContent,
            created_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Update message with real id and mark as sent
      setMessages(msgs =>
        msgs.map(m =>
          m.id === tempId 
            ? { ...m, id: String(data.id), status: 'sent' as const } 
            : m
        )
      );

      // Mark as delivered after a short delay
      setTimeout(() => {
        setMessages(msgs =>
          msgs.map(m =>
            m.id === String(data.id) ? { ...m, status: 'delivered' as const } : m
          )
        );
      }, 500);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      // Remove the failed message
      setMessages(msgs => msgs.filter(m => m.id !== tempId));
    }
  };

  const handleCaptureImage = () => {
    setShowMediaMenu(false);
  };

  const handleChooseFromGallery = () => {
    setShowMediaMenu(false);
  };

  const startSpeechRecognition = async () => {
    try {
      setIsRecording(true);
      setIsListening(true);
      setRecognizedTranscript('');

      if (Platform.OS !== 'web') {
        const permissionsResult = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        
        if (!permissionsResult.granted) {
          Alert.alert('Permission Required', 'Microphone permission is needed for speech recognition.');
          setIsRecording(false);
          setIsListening(false);
          return;
        }
      }

      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
      });

    } catch (error: any) {
      console.error('Speech recognition error:', error);
      setIsRecording(false);
      setIsListening(false);
      
      const errorMessage = error?.message || 'Failed to start speech recognition. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleMicrophonePress = () => {
    startSpeechRecognition();
  };

  const handleMicrophoneRelease = () => {
    ExpoSpeechRecognitionModule.stop();
  };

  return (
    <View className="flex-1 bg-white">
      {/* Chat Header */}
      <View className="bg-white px-6 py-6 pt-12 border-b border-green-100">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={onBackPress} className="active:scale-90">
            <View className="bg-green-50 p-2 rounded-full">
              <Ionicons name="chevron-back" size={24} color="#10b981" />
            </View>
          </TouchableOpacity>
          <View className="flex-1 mx-4">
            <Text className="text-lg font-bold text-gray-900">
              {selectedContact.name}
            </Text>
            <View className="flex-row items-center gap-2 mt-1">
              <View
                className={`h-2 w-2 rounded-full ${
                  selectedContact.status === 'online'
                    ? 'bg-green-500'
                    : selectedContact.status === 'busy'
                      ? 'bg-yellow-500'
                      : 'bg-gray-300'
                }`}
              />
              <Text className={`text-xs font-semibold ${
                selectedContact.status === 'online'
                  ? 'text-green-600'
                  : selectedContact.status === 'busy'
                    ? 'text-yellow-600'
                    : 'text-gray-500'
              }`}>
                {selectedContact.status === 'online'
                  ? 'Active now'
                  : selectedContact.status === 'busy'
                    ? 'Busy'
                    : 'Offline'}
              </Text>
            </View>
          </View>
          <TouchableOpacity className="active:scale-90">
            <View className="bg-green-50 p-2 rounded-full">
              <Ionicons name="information-circle" size={24} color="#10b981" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 16 }}
      >
        {loadingMessages ? (
          <View className="items-center justify-center py-12">
            <ActivityIndicator size="large" color="#10b981" />
            <Text className="text-gray-500 mt-4 text-sm">Loading messages...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View className="items-center justify-center py-12">
            <View className="bg-green-50 p-4 rounded-full mb-4">
              <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
            </View>
            <Text className="text-gray-500 font-semibold">No messages yet</Text>
            <Text className="text-gray-400 text-sm mt-2">Start the conversation!</Text>
          </View>
        ) : (
          <>
            {/* Chat Date Header */}
            <View className="items-center mb-6">
              <View className="bg-green-100 px-4 py-2 rounded-full">
                <Text className="text-green-700 text-xs font-bold">Today</Text>
              </View>
            </View>

            {messages.map((message, index) => {
              const shouldShowAvatar = !message.isOwn && (index === messages.length - 1 || messages[index + 1].isOwn);

              return (
                <View key={message.id}>
                  <View
                    className={`mb-3 flex-row ${
                      message.isOwn ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!message.isOwn && shouldShowAvatar && (
                      <View
                        className="h-8 w-8 items-center justify-center rounded-full mr-2 shadow-sm"
                        style={{ backgroundColor: selectedContact.avatar_color }}
                      >
                        <Text className="font-bold text-white text-xs">
                          {selectedContact.initials}
                        </Text>
                      </View>
                    )}
                    {!message.isOwn && !shouldShowAvatar && <View className="w-10 mr-2" />}

                    <View className={`max-w-[75%] ${message.isOwn ? 'items-end' : ''}`}>
                      <View
                        className={`rounded-3xl px-5 py-3 shadow-sm ${
                          message.isOwn
                            ? 'bg-green-500 shadow-green-200'
                            : 'bg-green-50 border-2 border-green-100 shadow-green-100'
                        }`}
                      >
                        <Text
                          className={`text-base ${
                            message.isOwn
                              ? 'text-white font-semibold'
                              : message.isRead === false
                                ? 'text-gray-900 font-bold'
                                : 'text-gray-900 font-medium'
                          }`}
                        >
                          {message.content}
                        </Text>
                      </View>
                      <View className={`flex-row items-center gap-1 mt-1 ${message.isOwn ? 'flex-row-reverse' : ''}`}>
                        <Text
                          className={`text-xs font-semibold ${
                            message.isOwn ? 'text-green-700' : 'text-green-600'
                          }`}
                        >
                          {message.timestamp}
                        </Text>
                        {message.isOwn && message.status && (
                          <Ionicons
                            name={
                              message.status === 'sending'
                                ? 'time-outline'
                                : message.status === 'sent'
                                  ? 'checkmark'
                                  : message.status === 'delivered'
                                    ? 'checkmark-done'
                                    : 'checkmark-done'
                            }
                            size={14}
                            color={
                              message.status === 'read'
                                ? '#10b981'
                                : '#9ca3af'
                            }
                          />
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}

            {isTyping && (
              <View className="mt-4 flex-row items-center gap-2">
                <View
                  className="h-8 w-8 items-center justify-center rounded-full shadow-sm"
                  style={{ backgroundColor: selectedContact.avatar_color }}
                >
                  <Text className="font-bold text-white text-xs">
                    {selectedContact.initials}
                  </Text>
                </View>
                <View className="bg-green-50 border-2 border-green-100 rounded-3xl px-5 py-3 shadow-sm">
                  <View className="flex-row items-center gap-1.5">
                    <View className="h-2 w-2 bg-green-500 rounded-full animate-bounce" />
                    <View className="h-2 w-2 bg-green-500 rounded-full animate-bounce" />
                    <View className="h-2 w-2 bg-green-500 rounded-full animate-bounce" />
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Message Input */}
      <View className="border-t border-green-100 bg-white px-4 py-3">
        {/* Media Menu */}
        {showMediaMenu && (
          <View className="mb-4 w-44 flex-col gap-2">
            <TouchableOpacity
              className="flex-row items-center rounded-2xl bg-green-50 px-4 py-3 border border-green-200 active:scale-95"
              onPress={handleCaptureImage}
            >
              <View className="bg-green-500 p-2 rounded-full mr-3">
                <Ionicons name="camera" size={18} color="white" />
              </View>
              <Text className="font-semibold text-gray-900 flex-1">Camera</Text>
              <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center rounded-2xl bg-green-50 px-4 py-3 border border-green-200 active:scale-95"
              onPress={handleChooseFromGallery}
            >
              <View className="bg-green-500 p-2 rounded-full mr-3">
                <Ionicons name="image" size={18} color="white" />
              </View>
              <Text className="font-semibold text-gray-900 flex-1">Gallery</Text>
              <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
            </TouchableOpacity>
          </View>
        )}

        <View className="flex-row items-center gap-2">
          {/* Add Media Button */}
          <TouchableOpacity
            className={`h-11 w-11 rounded-full items-center justify-center active:scale-95 border-2 transition-all ${
              showMediaMenu
                ? 'bg-red-50 border-red-200'
                : 'bg-green-50 border-green-200'
            }`}
            onPress={() => setShowMediaMenu(!showMediaMenu)}
          >
            <Ionicons
              name={showMediaMenu ? "close" : "add"}
              size={24}
              color={showMediaMenu ? '#dc2626' : '#10b981'}
            />
          </TouchableOpacity>

          {/* Text Input Field */}
          <View className={`flex-1 flex-row items-center rounded-2xl px-4 py-2.5 border-2 transition-all ${
            messageText.trim()
              ? 'border-green-500 bg-green-50 shadow-sm shadow-green-200'
              : 'border-green-200 bg-white'
          }`}>
            <TextInput
              placeholder="Type a message..."
              value={messageText}
              onChangeText={setMessageText}
              className="flex-1 text-gray-900 text-base font-medium"
              placeholderTextColor="#d1d5db"
              multiline
              style={{ maxHeight: 100 }}
            />
            <TouchableOpacity
              className="ml-2 p-1.5 active:scale-90"
              onPress={handleSendMessage}
              disabled={!messageText.trim()}
            >
              <Ionicons
                name="send"
                size={20}
                color={messageText.trim() ? '#10b981' : '#d1d5db'}
              />
            </TouchableOpacity>
          </View>

          {/* Microphone Button */}
          <TouchableOpacity 
            className={`h-11 w-11 rounded-full items-center justify-center active:scale-95 border-2 transition-all ${
              isRecording
                ? 'bg-red-50 border-red-300 shadow-md shadow-red-200'
                : 'bg-green-50 border-green-200'
            }`}
            onPress={handleMicrophonePress}
            onPressOut={handleMicrophoneRelease}
          >
            <Ionicons 
              name="mic" 
              size={22} 
              color={isRecording ? '#dc2626' : '#10b981'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
