import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

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
}

const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    sender: 'MK',
    content: 'Team, please confirm positions for the shift change.',
    timestamp: '10:30 AM',
    isOwn: false,
    status: 'read',
    type: 'text',
  },
  {
    id: '2',
    sender: 'You',
    content: 'Position A confirmed. All clear.',
    timestamp: '10:32 AM',
    isOwn: true,
    status: 'read',
    type: 'text',
  },
  {
    id: '3',
    sender: 'MK',
    content: 'Thanks for the quick response. Stay alert!',
    timestamp: '10:35 AM',
    isOwn: false,
    status: 'read',
    type: 'text',
  },
  {
    id: '4',
    sender: 'You',
    content: 'Will do. Everything looks good on my end.',
    timestamp: '10:40 AM',
    isOwn: true,
    status: 'delivered',
    type: 'text',
  },
];

interface ChatProps {
  selectedContact: Contact;
  onBackPress: () => void;
}

export default function Chat({ selectedContact, onBackPress }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [messageText, setMessageText] = useState('');
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognizedTranscript, setRecognizedTranscript] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    // Simulate contact typing occasionally
    const typingTimer = Math.random() > 0.6;
    if (typingTimer) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

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
  useSpeechRecognitionEvent('end', () => {
    if (recognizedTranscript.trim()) {
      const capitalizedText = recognizedTranscript.charAt(0).toUpperCase() + recognizedTranscript.slice(1);
      
      const newMessage: Message = {
        id: (messages.length + 1).toString(),
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

      // Simulate message status changes
      setTimeout(() => {
        setMessages(msgs =>
          msgs.map(m =>
            m.id === newMessage.id ? { ...m, status: 'sent' as const } : m
          )
        );
      }, 500);

      setTimeout(() => {
        setMessages(msgs =>
          msgs.map(m =>
            m.id === newMessage.id ? { ...m, status: 'delivered' as const } : m
          )
        );
      }, 1200);
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
    if (messageText.trim()) {
      const newMessage: Message = {
        id: (messages.length + 1).toString(),
        sender: 'You',
        content: messageText,
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

      // Simulate message status changes
      setTimeout(() => {
        setMessages(msgs =>
          msgs.map(m =>
            m.id === newMessage.id ? { ...m, status: 'sent' as const } : m
          )
        );
      }, 500);

      setTimeout(() => {
        setMessages(msgs =>
          msgs.map(m =>
            m.id === newMessage.id ? { ...m, status: 'delivered' as const } : m
          )
        );
      }, 1200);
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