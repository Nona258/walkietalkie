import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase, { getOrCreateConversation } from '../../utils/supabase';

interface Contact {
  id: string;
  name: string;
  role: string;
  initials: string;
  status: 'online' | 'offline' | 'busy';
  avatar_color: string;
  isGroup?: boolean;
  groupId?: string;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  _rawTs?: string;        // full ISO timestamp for date grouping
  isOwn: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  type?: 'text' | 'image' | 'media' | 'voice';
  isRead?: boolean;
  isVoice?: boolean;
  audioUrl?: string;
  duration?: string;
}



interface ChatProps {
  selectedContact: Contact;
  onBackPress: () => void;
  currentUserId?: string;
}

// ── helpers ──────────────────────────────────────────────────────────────
const padZero = (n: number) => String(n).padStart(2, '0');

const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${padZero(seconds % 60)}`;

const parseDurationToMs = (duration?: string): number | null => {
  if (!duration) return null;
  const [m, s] = duration.split(':').map(Number);
  if (isNaN(m) || isNaN(s)) return null;
  return (m * 60 + s) * 1000;
};

/** Returns 'Today', 'Yesterday', or a readable date string for a given timestamp */
const getDateLabel = (timestamp: string): string => {
  const msgDate = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(msgDate, today)) return 'Today';
  if (isSameDay(msgDate, yesterday)) return 'Yesterday';
  return msgDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
};

/** Returns 'Today', 'Yesterday', or a readable date string for a given timestamp */
const dateDayKey = (timestamp: string): string => {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
};

/** Returns the delivery label for own messages */
const getDeliveryLabel = (rawTs: string, status: string, isRead: boolean | undefined, now: Date): string => {
  if (status === 'sending') return 'Sending...';
  if (isRead) return 'Seen';
  const diffMs = now.getTime() - new Date(rawTs).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Delivered';
  if (mins < 60) return mins === 1 ? 'Delivered 1 minute ago' : `Delivered ${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  return hrs === 1 ? 'Delivered 1 hour ago' : `Delivered ${hrs} hours ago`;
};
// ───────────────────────────────────────────────────────────────────────────────────────────────

export default function Chat({ selectedContact, onBackPress, currentUserId }: ChatProps) {
  const isGroupChat = !!selectedContact?.isGroup;
  const activeGroupId = isGroupChat ? (selectedContact.groupId || selectedContact.id) : null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(
    currentUserId || null
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  // Ticks every 30 s so delivery labels like "Delivered 2 minutes ago" stay up-to-date
  const [now, setNow] = useState(new Date());

  const messagesSubscriptionRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const typingChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Flag set when stopRecording is tapped before getUserMedia has resolved
  const pendingStopRef = useRef(false);
  // Tracks the MIME type chosen at record-time so stopRecording creates the right Blob
  const recordingMimeRef = useRef<string>('audio/webm');
  // Ref so realtime callbacks always read the latest userId (avoids stale closure)
  const activeChatUserIdRef = useRef<string | null>(currentUserId || null);

  // Keep ref in sync with state so realtime callbacks always see the latest ID
  useEffect(() => {
    activeChatUserIdRef.current = activeChatUserId;
  }, [activeChatUserId]);

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

  // Fetch messages for the active chat (DM or group)
  useEffect(() => {
    if (!activeChatUserId || !selectedContact?.id || (isGroupChat && !activeGroupId)) {
      setMessages([]);
      setConversationId(null);
      setLoadingMessages(false);
      if (messagesSubscriptionRef.current) {
        messagesSubscriptionRef.current.unsubscribe();
        messagesSubscriptionRef.current = null;
      }
      return;
    }

    // Unsubscribe any previous subscription before loading new chat
    if (messagesSubscriptionRef.current) {
      messagesSubscriptionRef.current.unsubscribe();
      messagesSubscriptionRef.current = null;
    }

    if (isGroupChat && activeGroupId) {
      fetchGroupMessages(activeGroupId);
    } else {
      fetchConversationMessages();
      // Note: setupRealtimeSubscription is called inside fetchConversationMessages
      // once the conversationId is known, to avoid stale-state race condition.
    }

    return () => {
      if (messagesSubscriptionRef.current) {
        messagesSubscriptionRef.current.unsubscribe();
        messagesSubscriptionRef.current = null;
      }
    };
  }, [selectedContact?.id, isGroupChat, activeGroupId, activeChatUserId]);

  const fetchConversationMessages = async () => {
    try {
      setLoadingMessages(true);

      // Ensure we have the current user id before proceeding
      let meId = activeChatUserId;
      if (!meId) {
        const { data } = await supabase.auth.getUser();
        meId = data?.user?.id ?? null;
        if (meId) setActiveChatUserId(meId);
      }

      if (!meId) {
        setMessages([]);
        setLoadingMessages(false);
        return;
      }

      // Get or create the conversation (uses sorted UUIDs to prevent duplicates)
      const convId = await getOrCreateConversation(meId, selectedContact.id);
      if (!convId) {
        setMessages([]);
        setConversationId(null);
        setLoadingMessages(false);
        return;
      }

      setConversationId(convId);
      setupRealtimeSubscription(convId);

      // Fetch messages for this conversation
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        setMessages([]);
        setLoadingMessages(false);
        return;
      }

      const formattedMessages: Message[] = (messagesData || []).map((msg: any) => {
        const isOwn = msg.sender_id === meId;
        const created = msg.created_at ? new Date(msg.created_at) : new Date();
        const isVoice = !!(msg.file_url && msg.file_url.length > 0);
        const durationMs = typeof msg.duration_ms === 'number' ? msg.duration_ms : null;
        const durationSec = durationMs !== null ? Math.round(durationMs / 1000) : null;
        return {
          id: String(msg.id),
          sender: isOwn ? 'You' : selectedContact.initials,
          content: msg.transcription || (isVoice ? 'Voice message' : ''),
          timestamp: created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          _rawTs: msg.created_at || new Date().toISOString(),
          isOwn,
          status: 'read',
          type: isVoice ? 'voice' : 'text',
          isRead: isOwn ? (msg.is_read ?? false) : false,
          isVoice,
          audioUrl: isVoice ? msg.file_url : undefined,
          duration: durationSec !== null ? formatDuration(durationSec) : undefined,
        };
      });

      setMessages(formattedMessages);

      // Mark all unread messages from the other person as read in the DB
      try {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', convId)
          .neq('sender_id', meId)
          .eq('is_read', false);
      } catch (markErr) {
        console.warn('Failed to mark messages as read:', markErr);
      }

      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (e) {
      console.error('Error fetching conversation messages:', e);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchGroupMessages = async (groupId: string) => {
    try {
      setLoadingMessages(true);
      setConversationId(null);

      // Ensure we have the current user id before proceeding
      let meId = activeChatUserId;
      if (!meId) {
        const { data } = await supabase.auth.getUser();
        meId = data?.user?.id ?? null;
        if (meId) setActiveChatUserId(meId);
      }

      if (!meId) {
        setMessages([]);
        setLoadingMessages(false);
        return;
      }

      setupGroupRealtimeSubscription(groupId);

      const { data: rows, error } = await supabase
        .from('messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching group messages:', error);
        setMessages([]);
        setLoadingMessages(false);
        return;
      }

      const formatted: Message[] = (rows || []).map((msg: any) => {
        const isOwn = msg.sender_id === meId;
        const created = msg.created_at ? new Date(msg.created_at) : new Date();
        const isVoice = !!(msg.file_url && msg.file_url.length > 0);
        const durationMs = typeof msg.duration_ms === 'number' ? msg.duration_ms : null;
        const durationSec = durationMs !== null ? Math.round(durationMs / 1000) : null;
        return {
          id: String(msg.id),
          sender: isOwn ? 'You' : 'Member',
          content: msg.transcription || (isVoice ? 'Voice message' : ''),
          timestamp: created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          _rawTs: msg.created_at || new Date().toISOString(),
          isOwn,
          status: 'sent',
          type: isVoice ? 'voice' : 'text',
          isVoice,
          audioUrl: isVoice ? msg.file_url : undefined,
          duration: durationSec !== null ? formatDuration(durationSec) : undefined,
        };
      });

      setMessages(formatted);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (e) {
      console.error('Error fetching group messages:', e);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const setupGroupRealtimeSubscription = (groupId: string) => {
    if (!groupId) return;

    // Avoid duplicate subscriptions
    if (messagesSubscriptionRef.current) {
      messagesSubscriptionRef.current.unsubscribe();
      messagesSubscriptionRef.current = null;
    }

    try {
      messagesSubscriptionRef.current = supabase
        .channel(`messages:group:${groupId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `group_id=eq.${groupId}`,
          },
          async (payload) => {
            const newMsg = payload.new as any;
            const meId = activeChatUserIdRef.current;
            const isOwn = !!meId && newMsg.sender_id === meId;
            if (isOwn) return;

            const created = newMsg.created_at ? new Date(newMsg.created_at) : new Date();

            const looksLikeVoice = !!(newMsg.file_url && newMsg.file_url.length > 0) ||
              typeof newMsg.duration_ms === 'number';

            let audioUrl: string | undefined = looksLikeVoice
              ? (newMsg.file_url || undefined)
              : undefined;
            let durationMs: number | null = typeof newMsg.duration_ms === 'number'
              ? newMsg.duration_ms
              : null;

            if (looksLikeVoice) {
              try {
                const { data: fullRow } = await supabase
                  .from('messages')
                  .select('file_url, duration_ms')
                  .eq('id', newMsg.id)
                  .single();
                if (fullRow) {
                  audioUrl = fullRow.file_url || undefined;
                  durationMs = typeof fullRow.duration_ms === 'number'
                    ? fullRow.duration_ms
                    : durationMs;
                }
              } catch (fetchErr) {
                console.warn('Could not re-fetch group voice message row:', fetchErr);
              }
            }

            const isVoice = !!audioUrl;
            const durationSec = durationMs !== null ? Math.round(durationMs / 1000) : null;
            const formattedMsg: Message = {
              id: String(newMsg.id),
              sender: 'Member',
              content: newMsg.transcription || (isVoice ? 'Voice message' : ''),
              timestamp: created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              _rawTs: newMsg.created_at || new Date().toISOString(),
              isOwn: false,
              status: 'sent',
              type: isVoice ? 'voice' : 'text',
              isVoice,
              audioUrl,
              duration: durationSec !== null ? formatDuration(durationSec) : undefined,
            };

            setMessages((prevMessages) => {
              const msgExists = prevMessages.some((m) => m.id === formattedMsg.id);
              if (!msgExists) return [...prevMessages, formattedMsg];
              return prevMessages;
            });
          }
        )
        .subscribe();
    } catch (error) {
      console.error('Error setting up group realtime subscription:', error);
    }
  };

  const setupRealtimeSubscription = (convId: string) => {
    if (!convId) return;

    // Avoid duplicate subscriptions for the same conversation
    if (messagesSubscriptionRef.current) {
      messagesSubscriptionRef.current.unsubscribe();
      messagesSubscriptionRef.current = null;
    }

    try {
      // Subscribe to new messages for this specific conversation
      messagesSubscriptionRef.current = supabase
        .channel(`messages:conversation:${convId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${convId}`,
          },
          async (payload) => {
            const newMsg = payload.new as any;
            // Always read from the ref so we never compare against a stale null
            const meId = activeChatUserIdRef.current;
            const isOwn = !!meId && newMsg.sender_id === meId;

            // Own messages are already added optimistically in handleSendMessage
            // and stopRecording — adding them again from realtime causes duplicate keys.
            if (isOwn) return;

            const created = newMsg.created_at ? new Date(newMsg.created_at) : new Date();

            // Check if it's a voice message. The realtime payload may carry a
            // truncated or empty file_url when the base64 data is very large, so
            // we detect voice by the presence of the file_url field on the row OR
            // by duration_ms being set, then re-fetch the full row to get the
            // complete audio data.
            const looksLikeVoice = !!(newMsg.file_url && newMsg.file_url.length > 0) ||
              typeof newMsg.duration_ms === 'number';

            let audioUrl: string | undefined = looksLikeVoice
              ? (newMsg.file_url || undefined)
              : undefined;
            let durationMs: number | null = typeof newMsg.duration_ms === 'number'
              ? newMsg.duration_ms
              : null;

            if (looksLikeVoice) {
              // Re-fetch the full row so we always get the complete file_url
              // regardless of realtime payload size limits.
              try {
                const { data: fullRow } = await supabase
                  .from('messages')
                  .select('file_url, duration_ms')
                  .eq('id', newMsg.id)
                  .single();
                if (fullRow) {
                  audioUrl = fullRow.file_url || undefined;
                  durationMs = typeof fullRow.duration_ms === 'number'
                    ? fullRow.duration_ms
                    : durationMs;
                }
              } catch (fetchErr) {
                console.warn('Could not re-fetch voice message row:', fetchErr);
              }
            }

            const isVoice = !!audioUrl;
            const durationSec = durationMs !== null ? Math.round(durationMs / 1000) : null;
            const formattedMsg: Message = {
              id: String(newMsg.id),
              sender: isOwn ? 'You' : selectedContact.initials,
              content: newMsg.transcription || (isVoice ? 'Voice message' : ''),
              timestamp: created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              _rawTs: newMsg.created_at || new Date().toISOString(),
              isOwn,
              status: 'read',
              type: isVoice ? 'voice' : 'text',
              isRead: newMsg.is_read ?? false,
              isVoice,
              audioUrl,
              duration: durationSec !== null ? formatDuration(durationSec) : undefined,
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
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${convId}`,
          },
          (payload) => {
            const updated = payload.new as any;
            if (updated.is_read === true) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === String(updated.id) ? { ...m, isRead: true } : m
                )
              );
            }
          }
        )
        .subscribe();
    } catch (error) {
      console.error('Error setting up realtime subscription:', error);
    }
  };

  // Set up typing broadcast channel when both IDs are known
  useEffect(() => {
    if (!activeChatUserId || !selectedContact?.id) return;
    if (isGroupChat && !activeGroupId) return;

    const channelName = isGroupChat
      ? `typing:group:${activeGroupId}`
      : `typing:${[activeChatUserId, selectedContact.id].sort().join(':')}`;
    const channel = supabase.channel(channelName);
    typingChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        const fromUserId = payload?.payload?.userId;
        if (!fromUserId) return;
        // DM: only react to the other user. Group: react to anyone else.
        if (!isGroupChat && fromUserId !== selectedContact.id) return;
        if (isGroupChat && fromUserId === activeChatUserId) return;
        setIsTyping(true);
        // Clear after 3 s of no new typing event
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      channel.unsubscribe();
      typingChannelRef.current = null;
    };
  }, [activeChatUserId, selectedContact?.id, isGroupChat, activeGroupId]);

  // Handler that updates text and broadcasts typing event
  const handleTypingInput = (text: string) => {
    setMessageText(text);
    if (!activeChatUserId || !typingChannelRef.current) return;
    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: activeChatUserId },
    });
  };

  // Mark unread messages as read when viewed — update both local state and DB
  useEffect(() => {
    if (isGroupChat) return;
    const unreadIds = messages
      .filter(msg => !msg.isOwn && msg.isRead === false)
      .map(msg => msg.id);
    if (unreadIds.length === 0 || !conversationId || !activeChatUserId) return;

    const timer = setTimeout(() => {
      // Local update
      setMessages(msgs =>
        msgs.map(msg =>
          !msg.isOwn && msg.isRead === false ? { ...msg, isRead: true } : msg
        )
      );
      // DB update
      supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', activeChatUserId)
        .eq('is_read', false)
        .then(({ error }) => {
          if (error) console.warn('Failed to mark messages as read in DB:', error);
        });
    }, 500);
    return () => clearTimeout(timer);
  }, [messages, conversationId, activeChatUserId, isGroupChat]);

  // ── Voice recording ──────────────────────────────────────────────────────
  const startRecording = () => {
    if (isGroupChat) {
      if (!activeGroupId) {
        Alert.alert('Not ready', 'Group chat not ready yet. Please wait a moment.');
        return;
      }
    } else {
      if (!conversationId) {
        Alert.alert('Not ready', 'Conversation not ready yet. Please wait a moment.');
        return;
      }
    }
    pendingStopRef.current = false;
    setIsRecording(true);
    setRecordingTime(0);
    recordingIntervalRef.current = setInterval(
      () => setRecordingTime(prev => prev + 1),
      1000
    );

    (async () => {
      try {
        const stream = await (navigator as any).mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];

        // Pick the best supported MIME type
        const candidates = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/ogg',
          'audio/mp4',
        ];
        const mimeType = candidates.find(
          t => (window as any).MediaRecorder?.isTypeSupported?.(t)
        ) || '';
        recordingMimeRef.current = mimeType || 'audio/webm';

        const mr = new (window as any).MediaRecorder(
          stream,
          mimeType ? { mimeType } : undefined
        );
        mr.ondataavailable = (e: any) => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mr.start();
        mediaRecorderRef.current = { mediaRecorder: mr, stream };

        // If stopRecording was tapped while mic was starting up, stop immediately
        if (pendingStopRef.current) {
          pendingStopRef.current = false;
          try { mr.stop(); } catch (_) {}
          try { stream.getTracks().forEach((t: any) => t.stop()); } catch (_) {}
          mediaRecorderRef.current = null;
          audioChunksRef.current = [];
          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
          }
          setIsRecording(false);
          setRecordingTime(0);
        }
      } catch (e) {
        console.error('Microphone error:', e);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        setIsRecording(false);
        setRecordingTime(0);
        Alert.alert('Permission Required', 'Microphone access is needed to send voice messages.');
      }
    })();
  };

  const stopRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setIsRecording(false);

    const ref = mediaRecorderRef.current;
    if (!ref?.mediaRecorder) {
      // Mic hasn't started yet — mark as pending so startRecording can clean up
      pendingStopRef.current = true;
      setRecordingTime(0);
      return;
    }

    const capturedTime = recordingTime;
    const blobType = recordingMimeRef.current || 'audio/webm';
    const mr = ref.mediaRecorder as MediaRecorder;
    mr.onstop = async () => {
      try {
        const blob = new Blob(audioChunksRef.current, { type: blobType });
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const tempId = `local-${Date.now()}`;
        const duration = formatDuration(capturedTime);
        const nowIso = new Date().toISOString();
        const tempMsg: Message = {
          id: tempId,
          sender: 'You',
          content: 'Voice message',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          _rawTs: nowIso,
          isOwn: true,
          status: 'sending',
          type: 'voice',
          isVoice: true,
          audioUrl: dataUrl,
          duration,
        };
        setMessages(prev => [...prev, tempMsg]);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

        if (!activeChatUserId) {
          setMessages(msgs => msgs.filter(m => m.id !== tempId));
          return;
        }

        const insertPayload: any = isGroupChat
          ? {
              conversation_id: null,
              group_id: activeGroupId,
              sender_id: activeChatUserId,
              // receiver_id is kept non-null to satisfy existing schema; group delivery uses group_id filter.
              receiver_id: activeChatUserId,
              file_url: dataUrl,
              duration_ms: parseDurationToMs(duration),
              created_at: new Date().toISOString(),
            }
          : {
              conversation_id: conversationId,
              sender_id: activeChatUserId,
              receiver_id: selectedContact.id,
              file_url: dataUrl,
              duration_ms: parseDurationToMs(duration),
              created_at: new Date().toISOString(),
            };

        if (isGroupChat && !activeGroupId) {
          setMessages(msgs => msgs.filter(m => m.id !== tempId));
          return;
        }
        if (!isGroupChat && !conversationId) {
          setMessages(msgs => msgs.filter(m => m.id !== tempId));
          return;
        }

        const { data, error } = await supabase
          .from('messages')
          .insert([insertPayload])
          .select()
          .single();

        if (error) throw error;

        setMessages(msgs =>
          msgs.map(m =>
            m.id === tempId ? { ...m, id: String(data.id), status: 'sent' as const } : m
          )
        );
        setTimeout(() => {
          setMessages(msgs =>
            msgs.map(m =>
              m.id === String(data.id) ? { ...m, status: 'delivered' as const } : m
            )
          );
        }, 500);
      } catch (err) {
        console.error('Error saving voice message:', err);
      } finally {
        audioChunksRef.current = [];
        setRecordingTime(0);
      }
    };

    try { mr.stop(); } catch (e) {}
    try { ref.stream.getTracks().forEach((t: any) => t.stop()); } catch (e) {}
    mediaRecorderRef.current = null;
  };

  const handlePlayVoice = (message: Message) => {
    if (!message.audioUrl) return;

    // Toggle off if already playing this message
    if (currentlyPlayingId === message.id && audioPlayerRef.current) {
      try { audioPlayerRef.current.pause(); } catch (e) {}
      audioPlayerRef.current = null;
      setCurrentlyPlayingId(null);
      return;
    }

    // Stop any currently playing audio
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = '';
      } catch (e) {}
      audioPlayerRef.current = null;
      setCurrentlyPlayingId(null);
    }

    const audio = new Audio(message.audioUrl);
    audioPlayerRef.current = audio;
    setCurrentlyPlayingId(message.id);
    audio.onended = () => {
      setCurrentlyPlayingId(null);
      audioPlayerRef.current = null;
    };
    audio.play().catch(e => {
      console.error('Playback failed:', e);
      setCurrentlyPlayingId(null);
    });
  };

  // Cleanup audio player on unmount
  useEffect(() => {
    // Tick every 30 seconds to refresh delivery labels
    const ticker = setInterval(() => setNow(new Date()), 30000);
    return () => {
      clearInterval(ticker);
      if (audioPlayerRef.current) {
        try { audioPlayerRef.current.pause(); audioPlayerRef.current.src = ''; } catch (e) {}
        audioPlayerRef.current = null;
      }
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

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
      _rawTs: new Date().toISOString(),
      isOwn: true,
      status: 'sending',
      type: 'text',
    };
    setMessages([...messages, newMessage]);
    setMessageText('');

    try {
      if (isGroupChat) {
        if (!activeGroupId) {
          console.error('No group ID available');
          setMessages(msgs => msgs.filter(m => m.id !== tempId));
          return;
        }
      } else {
        if (!conversationId) {
          console.error('No conversation ID available');
          setMessages(msgs => msgs.filter(m => m.id !== tempId));
          return;
        }
      }

      const insertPayload: any = isGroupChat
        ? {
            conversation_id: null,
            group_id: activeGroupId,
            sender_id: activeChatUserId,
            receiver_id: activeChatUserId,
            transcription: messageContent,
            created_at: new Date().toISOString(),
          }
        : {
            conversation_id: conversationId,
            sender_id: activeChatUserId,
            receiver_id: selectedContact.id,
            transcription: messageContent,
            created_at: new Date().toISOString(),
          };

      // Save to Supabase
      const { data, error } = await supabase
        .from('messages')
        .insert([insertPayload])
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

  const handleCaptureImage = () => setShowMediaMenu(false);
  const handleChooseFromGallery = () => setShowMediaMenu(false);

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
                  isGroupChat
                    ? 'bg-green-500'
                    : selectedContact.status === 'online'
                      ? 'bg-green-500'
                      : selectedContact.status === 'busy'
                        ? 'bg-yellow-500'
                        : 'bg-gray-300'
                }`}
              />
              <Text className={`text-xs font-semibold ${
                isGroupChat
                  ? 'text-green-600'
                  : selectedContact.status === 'online'
                    ? 'text-green-600'
                    : selectedContact.status === 'busy'
                      ? 'text-yellow-600'
                      : 'text-gray-500'
              }`}>
                {isGroupChat
                  ? 'Team chat'
                  : selectedContact.status === 'online'
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
        ref={scrollViewRef}
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 16 }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
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
            {/* Messages grouped by date */}
            {(() => {
              const seenDays = new Set<string>();
              // Only the last own read message shows "Seen"
              let lastSeenIndex = -1;
              // Only the last own unread (delivered) message shows "Delivered"
              let lastDeliveredIndex = -1;
              if (!isGroupChat) {
                messages.forEach((m, i) => {
                  if (m.isOwn && m.isRead) lastSeenIndex = i;
                  if (m.isOwn && !m.isRead && m.status !== 'sending') lastDeliveredIndex = i;
                });
              }
              return messages.map((message, index) => {
                const rawTs: string = (message as any)._rawTs || new Date().toISOString();
                const dayKey = dateDayKey(rawTs);
                const showDateSep = !seenDays.has(dayKey);
                if (showDateSep) seenDays.add(dayKey);

                const showTimestamp = expandedMessageId === message.id;

                const shouldShowAvatar =
                  !message.isOwn &&
                  (index === messages.length - 1 || messages[index + 1].isOwn);
                const isPlaying = currentlyPlayingId === message.id;

                return (
                  <View key={message.id}>
                    {showDateSep && (
                      <View className="items-center my-4">
                        <View className="bg-green-100 px-4 py-1.5 rounded-full">
                          <Text className="text-green-700 text-xs font-bold">
                            {getDateLabel(rawTs)}
                          </Text>
                        </View>
                      </View>
                    )}
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
                      {message.isVoice ? (
                        /* ── Voice message bubble ── */
                        <TouchableOpacity
                          onPress={() => {
                            handlePlayVoice(message);
                            setExpandedMessageId(prev => prev === message.id ? null : message.id);
                          }}
                          className={`flex-row items-center gap-3 rounded-3xl px-4 py-3 shadow-sm ${
                            message.isOwn
                              ? 'bg-green-500 shadow-green-200'
                              : 'bg-green-50 border-2 border-green-100 shadow-green-100'
                          }`}
                          style={{ minWidth: 160 }}
                        >
                          <View className={`w-8 h-8 rounded-full items-center justify-center ${
                            message.isOwn ? 'bg-white/20' : 'bg-green-100'
                          }`}>
                            <Ionicons
                              name={isPlaying ? 'pause' : 'play'}
                              size={16}
                              color={message.isOwn ? '#ffffff' : '#10b981'}
                            />
                          </View>
                          <View className="flex-1">
                            <View className="flex-row items-center gap-0.5 mb-1">
                              {[...Array(12)].map((_, i) => (
                                <View
                                  key={i}
                                  style={{ height: 4 + Math.abs(Math.sin(i * 0.8)) * 14, width: 3, borderRadius: 2 }}
                                  className={message.isOwn ? 'bg-white/70' : 'bg-green-400'}
                                />
                              ))}
                            </View>
                            <Text className={`text-xs font-semibold ${
                              message.isOwn ? 'text-white/80' : 'text-green-600'
                            }`}>
                              {message.duration || '0:00'}
                            </Text>
                          </View>
                          <Ionicons
                            name="mic"
                            size={14}
                            color={message.isOwn ? '#ffffff80' : '#10b981'}
                          />
                        </TouchableOpacity>
                      ) : (
                        /* ── Text message bubble ── */
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => setExpandedMessageId(prev => prev === message.id ? null : message.id)}
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
                        </TouchableOpacity>
                      )}
                      {showTimestamp && !message.isOwn && (
                        <View className="flex-row items-center gap-1 mt-1">
                          <Text className="text-xs font-semibold text-green-600">
                            {message.timestamp}
                          </Text>
                        </View>
                      )}
                      {!isGroupChat && message.isOwn && message.status &&
                        (message.status === 'sending' ||
                          index === lastSeenIndex ||
                          index === lastDeliveredIndex) && (
                        <View className="flex-row-reverse items-center gap-1 mt-1">
                          <Text className={`text-xs font-semibold ${
                            index === lastSeenIndex
                              ? 'text-green-500'
                              : 'text-gray-400'
                          }`}>
                            {getDeliveryLabel(rawTs, message.status, index === lastSeenIndex, now)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
              });
            })()}

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
              onChangeText={handleTypingInput}
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

          {/* Microphone Button — press and hold to record */}
          {isRecording ? (
            <View className="items-center">
              <TouchableOpacity
                className="h-11 w-11 rounded-full items-center justify-center border-2 bg-red-50 border-red-400"
                onPressOut={stopRecording}
              >
                <Ionicons name="mic" size={22} color="#ef4444" />
              </TouchableOpacity>
              <Text className="text-red-500 text-xs font-bold mt-1">{formatDuration(recordingTime)}</Text>
            </View>
          ) : (
            <TouchableOpacity
              className="h-11 w-11 rounded-full items-center justify-center active:scale-95 border-2 bg-green-50 border-green-200"
              onPressIn={startRecording}
            >
              <Ionicons name="mic" size={22} color="#10b981" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
