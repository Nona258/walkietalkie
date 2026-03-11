import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../../utils/supabase';

interface Contact {
  id: string;
  name: string;
  role: string;
  initials: string;
  status: 'online' | 'offline' | 'busy' | 'lost_connection';
  avatar_color: string;
  isGroup?: boolean;
  groupId?: string;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  type?: 'text' | 'image' | 'media';
}

interface ChatProps {
  selectedContact: Contact;
  onBackPress: () => void;
}

export default function Chat({ selectedContact, onBackPress }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognizedTranscript, setRecognizedTranscript] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeThreadKey, setActiveThreadKey] = useState<string | null>(null);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const activeThreadKeyRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isGroupChat = !!selectedContact?.isGroup && !!selectedContact?.groupId;
  const groupId = useMemo(() => (isGroupChat ? (selectedContact.groupId as string) : null), [isGroupChat, selectedContact?.groupId]);
  const directPeerUserId = useMemo(() => (!isGroupChat ? selectedContact?.id : null), [isGroupChat, selectedContact?.id]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        setCurrentUserId(data?.user?.id || null);
      } catch (e: any) {
        console.warn('Unable to resolve current user:', e?.message || String(e));
        setCurrentUserId(null);
      }
    })();
  }, []);

  const makeThreadKey = (kind: 'group' | 'direct', id: string) => `chat:lastRead:${kind}:${id}`;

  const markThreadReadNow = async (kind: 'group' | 'direct', id: string) => {
    try {
      const key = makeThreadKey(kind, id);
      const nowIso = new Date().toISOString();
      await AsyncStorage.setItem(key, nowIso);
    } catch (e) {
      // ignore
    }
  };

  const formatTime = (isoOrDate: string | Date | null | undefined) => {
    const date = isoOrDate ? new Date(isoOrDate) : new Date();
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const mapRowToMessage = (row: any, meId: string | null): Message => {
    const isOwn = !!meId && row.sender_id === meId;
    const id = String(row.id);
    const content = String(row.transcription || '');
    return {
      id,
      sender: isOwn ? 'You' : selectedContact?.initials || 'User',
      content,
      timestamp: formatTime(row.created_at),
      isOwn,
      status: isOwn ? 'sent' : undefined,
      type: 'text',
    };
  };

  const getOrCreateConversationId = async (meId: string, otherId: string) => {
    const pairFilter = `and(user_one.eq.${meId},user_two.eq.${otherId}),and(user_one.eq.${otherId},user_two.eq.${meId})`;
    const { data: existing, error: existingError } = await supabase
      .from('conversations')
      .select('id')
      .or(pairFilter)
      .limit(1);
    if (existingError) throw existingError;
    const existingId = existing && existing[0] ? existing[0].id : null;
    if (existingId) return String(existingId);

    const { data: inserted, error: insertError } = await supabase
      .from('conversations')
      .insert([{ user_one: meId, user_two: otherId }])
      .select('id')
      .single();
    if (insertError) throw insertError;
    return String(inserted.id);
  };

  useEffect(() => {
    // Load + subscribe messages for either direct or group threads.
    // Intentionally no blocking "loading" UI; the list fills when data arrives.
    let cancelled = false;
    let realtimeChannel: any = null;

    const run = async () => {
      try {
        // Resolve auth user if missing.
        let meId = currentUserId;
        if (!meId) {
          const { data, error } = await supabase.auth.getUser();
          if (error) throw error;
          meId = data?.user?.id || null;
          if (mountedRef.current) setCurrentUserId(meId);
        }
        if (!meId) throw new Error('Not authenticated');

        if (isGroupChat) {
          if (!groupId) throw new Error('Missing group id');
          const threadKey = makeThreadKey('group', groupId);
          if (mountedRef.current) {
            setActiveThreadKey(threadKey);
            activeThreadKeyRef.current = threadKey;
          }

          const { data, error } = await supabase
            .from('messages')
            .select('id, sender_id, transcription, created_at')
            .eq('group_id', groupId)
            .order('created_at', { ascending: true });
          if (error) throw error;
          if (cancelled) return;
          setMessages((data || []).map(r => mapRowToMessage(r, meId)));

          await markThreadReadNow('group', groupId);

          realtimeChannel = supabase
            .channel(`messages-group-${groupId}`)
            .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
              async (payload: any) => {
                try {
                  const row = payload?.new;
                  if (!row) return;
                  const mapped = mapRowToMessage(row, meId);
                  setMessages(prev => {
                    if (prev.some(m => m.id === mapped.id)) return prev;
                    return [...prev, mapped];
                  });

                  // If I'm viewing this thread, treat it as read.
                  const stillActive = activeThreadKeyRef.current === makeThreadKey('group', groupId);
                  if (stillActive) await markThreadReadNow('group', groupId);
                } catch (err) {
                  console.warn('Failed to handle realtime group insert:', err);
                }
              }
            )
            .subscribe();

          return;
        }

        // Direct chat
        if (!directPeerUserId) throw new Error('Missing contact id');
        const conversationId = await getOrCreateConversationId(meId, directPeerUserId);
        const threadKey = makeThreadKey('direct', conversationId);
        if (mountedRef.current) {
          setActiveThreadKey(threadKey);
          activeThreadKeyRef.current = threadKey;
        }

        const { data, error } = await supabase
          .from('messages')
          .select('id, sender_id, receiver_id, transcription, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        if (cancelled) return;
        setMessages((data || []).map(r => mapRowToMessage(r, meId)));

        await markThreadReadNow('direct', conversationId);

        realtimeChannel = supabase
          .channel(`messages-direct-${conversationId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
            async (payload: any) => {
              try {
                const row = payload?.new;
                if (!row) return;
                const mapped = mapRowToMessage(row, meId);
                setMessages(prev => {
                  if (prev.some(m => m.id === mapped.id)) return prev;
                  return [...prev, mapped];
                });

                const stillActive = activeThreadKeyRef.current === makeThreadKey('direct', conversationId);
                if (stillActive) await markThreadReadNow('direct', conversationId);
              } catch (err) {
                console.warn('Failed to handle realtime direct insert:', err);
              }
            }
          )
          .subscribe();
      } catch (e: any) {
        console.error('Chat init failed:', e);
        if (!cancelled) Alert.alert('Error', e?.message || 'Failed to load chat');
      }
    };

    // reset list when switching threads
    setMessages([]);
    setActiveThreadKey(null);
    activeThreadKeyRef.current = null;
    run();

    return () => {
      cancelled = true;
      try {
        if (realtimeChannel) supabase.removeChannel(realtimeChannel);
      } catch (e) {
        // ignore
      }
    };
  }, [currentUserId, isGroupChat, groupId, directPeerUserId]);

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

  const sendTextMessage = async (text: string) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return;

    const now = new Date();
    const localId = `local-${Date.now()}`;
    const localMessage: Message = {
      id: localId,
      sender: 'You',
      content: trimmed,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
      status: 'sending',
      type: 'text',
    };

    setMessages(prev => [...prev, localMessage]);
    setRecognizedTranscript('');
    setMessageText('');

    // Save to DB (direct or group)
    try {
      let meId = currentUserId;
      if (!meId) {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        meId = data?.user?.id || null;
        setCurrentUserId(meId);
      }
      if (!meId) throw new Error('Not authenticated');

      const payload: any = {
        conversation_id: null,
        group_id: null,
        sender_id: meId,
        receiver_id: null,
        file_url: null,
        transcription: trimmed,
        duration_ms: null,
      };

      if (isGroupChat) {
        if (!groupId) throw new Error('Missing group id');
        payload.group_id = groupId;
      } else {
        if (!directPeerUserId) throw new Error('Missing contact id');
        const conversationId = await getOrCreateConversationId(meId, directPeerUserId);
        payload.conversation_id = conversationId;
        payload.receiver_id = directPeerUserId;
      }

      const { data, error } = await supabase.from('messages').insert([payload]).select('id, sender_id, transcription, created_at');
      if (error) throw error;

      const inserted = data && data[0] ? data[0] : null;
      if (inserted) {
        const mapped = mapRowToMessage(inserted, meId);
        setMessages(prev => {
          const seen = new Set<string>();
          const replaced = prev.map(m => (m.id === localId ? { ...mapped, status: 'sent' as const } : m));
          return replaced.filter(m => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          });
        });
        if (isGroupChat && groupId) await markThreadReadNow('group', groupId);
      } else {
        setMessages(prev => prev.map(m => (m.id === localId ? { ...m, status: 'sent' } : m)));
      }
    } catch (e: any) {
      console.error('Failed to send group message:', e);
      Alert.alert('Error', e?.message || 'Failed to send message');
      setMessages(prev => prev.map(m => (m.id === localId ? { ...m, status: 'sending' } : m)));
    }
  };

  // Listen for when recognition ends - send message only once here
  useSpeechRecognitionEvent('end', () => {
    if (recognizedTranscript.trim()) {
      const capitalizedText = recognizedTranscript.charAt(0).toUpperCase() + recognizedTranscript.slice(1);
      sendTextMessage(capitalizedText);
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

  const handleSendMessage = () => {
    sendTextMessage(messageText);
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

  const leaveGroupChat = async () => {
    if (!isGroupChat || !groupId) return;
    if (isLeavingGroup) return;

    try {
      setShowGroupMenu(false);
      setIsLeavingGroup(true);
      let meId = currentUserId;
      if (!meId) {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        meId = data?.user?.id || null;
        if (mountedRef.current) setCurrentUserId(meId);
      }
      if (!meId) throw new Error('Not authenticated');

      const { error } = await supabase.from('users').update({ group_id: null }).eq('id', meId);
      if (error) throw error;

      onBackPress();
    } catch (e: any) {
      console.error('Failed to leave group chat:', e);
      Alert.alert('Error', e?.message || 'Failed to leave group chat');
    } finally {
      if (mountedRef.current) setIsLeavingGroup(false);
    }
  };

  const toggleGroupMenu = () => {
    if (!isGroupChat) return;
    if (isLeavingGroup) return;
    setShowGroupMenu(prev => !prev);
  };

  return (
    <View className="flex-1 bg-white">
      {showGroupMenu && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowGroupMenu(false)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}
        />
      )}
      {/* Chat Header */}
      <View className="bg-white px-6 py-6 pt-12 border-b border-green-100" style={{ position: 'relative', zIndex: 10 }}>
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
          {isGroupChat ? (
            <View style={{ position: 'relative' }}>
              <TouchableOpacity className="active:scale-90" onPress={toggleGroupMenu} disabled={isLeavingGroup}>
                <View className="bg-green-50 p-2 rounded-full">
                  <Ionicons name="ellipsis-vertical" size={24} color={isLeavingGroup ? '#9ca3af' : '#10b981'} />
                </View>
              </TouchableOpacity>

              {showGroupMenu && (
                <View
                  className="bg-white border border-green-200 rounded-2xl overflow-hidden"
                  style={{ position: 'absolute', right: 0, top: 52, zIndex: 20, width: 190 }}
                >
                  <TouchableOpacity
                    className="flex-row items-center px-4 py-3 active:opacity-80"
                    onPress={leaveGroupChat}
                    disabled={isLeavingGroup}
                  >
                    <Ionicons name="log-out-outline" size={18} color={isLeavingGroup ? '#9ca3af' : '#dc2626'} />
                    <Text className={`ml-3 font-semibold ${isLeavingGroup ? 'text-gray-400' : 'text-red-600'}`}>
                      Leave group chat
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity className="active:scale-90">
              <View className="bg-green-50 p-2 rounded-full">
                <Ionicons name="information-circle" size={24} color="#10b981" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 16 }}
      >
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
