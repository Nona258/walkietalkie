import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, SafeAreaView, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../utils/supabase';

export default function Dashboard({ 
  onLogout, 
  onNavigateToSettings 
}: { 
  onLogout?: () => void;
  onNavigateToSettings?: () => void;
}) {
  const [userData, setUserData] = useState({ full_name: 'User', phone_number: null, profile_picture_url: null });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.id);
      
      // Show auth metadata immediately
      if (user?.id) {
        setUserData({
          full_name: user.user_metadata?.full_name || 'User',
          phone_number: null,
          profile_picture_url: null,
        });
        
        // Then fetch and update with database data in background
        const { data, error } = await supabase
          .from('users')
          .select('full_name, phone_number, profile_picture_url')
          .eq('id', user.id);

        console.log('User data from table:', data);
        console.log('Error:', error);

        if (data && data.length > 0 && data[0].full_name) {
          setUserData({
            full_name: data[0].full_name,
            phone_number: data[0].phone_number,
            profile_picture_url: data[0].profile_picture_url,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      // Silent fallback to auth metadata
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserData({
          full_name: user.user_metadata?.full_name || 'User',
          phone_number: null,
          profile_picture_url: null,
        });
      }
    }
  };

  return (
    // FIX 1: Use flex-1 with w-full to ensure it fills the entire parent container
    <View className="flex-1 w-full bg-white">
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        className="flex-1 w-full"
        // FIX 2: contentContainerStyle must be flexGrow to allow scrolling but w-full to prevent gaps
        contentContainerStyle={{ flexGrow: 1, width: '100%' }}
        // Disables horizontal bouncing that reveals white backgrounds
        bounces={false}
      >
        {/* 1. TOP BRANDED HEADER - MINIMAL DESIGN */}
        <View className="flex-row items-center justify-between px-6 pt-6 pb-6 bg-[#f8fafb]">
          <View className="flex-row items-center flex-1 gap-3">
            <TouchableOpacity 
              className="items-center justify-center flex-shrink-0 overflow-hidden bg-[#237227] rounded-full h-14 w-14 active:scale-95"
            >
              {userData.profile_picture_url ? (
                <Image
                  source={{ uri: userData.profile_picture_url }}
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={26} color="white" />
              )}
            </TouchableOpacity>
            <View className="flex-1 min-w-0">
              <Text className="text-2xl font-extrabold text-gray-900" numberOfLines={1}>{userData.full_name}</Text>
              <Text className="-mt-1 text-sm font-semibold text-gray-600">Employee</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="p-3 rounded-full" style={{ backgroundColor: '#237227' }}>
              <Ionicons name="notifications" size={24} color="white" />
            </View>
            <TouchableOpacity 
              onPress={onNavigateToSettings}
              className="p-3 rounded-full active:scale-95"
              style={{ backgroundColor: '#237227' }}
            >
              <Ionicons name="settings" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* CONTENT WRAPPER */}
        <View className="w-full px-6 py-8 bg-white">
          {/* 2. STATS GRID - ENHANCED DESIGN */}
          <Text className="mb-4 text-lg font-bold text-gray-800">Your Statistics</Text>
          <View className="flex-row flex-wrap justify-between w-full gap-3">
            <StatCard icon="map-outline" title="Sites" value="3" color="bg-green-500" />
            <StatCard icon="chatbubbles-outline" title="Alerts" value="5" color="bg-green-400" />
            <StatCard icon="time-outline" title="Hours" value="8h" color="bg-green-600" />
            <StatCard icon="shield-checkmark-outline" title="Tasks" value="12" color="bg-green-500" />
          </View>

          {/* 3. CURRENT ASSIGNMENT CARD - PREMIUM DESIGN */}
          <View className="w-full mt-6">
            <Text className="mb-4 text-lg font-bold text-black">Ongoing Shift</Text>
            <View className="w-full p-6 rounded-3xl" style={{ backgroundColor: '#e8f5e9' }}>
              {/* Location Section */}
              <View className="flex-row items-center p-4 mb-6 bg-white rounded-2xl">
                <View className="p-3 mr-4 rounded-full" style={{ backgroundColor: '#237227' }}>
                  <Ionicons name="location" size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold tracking-wider uppercase" style={{ color: '#6b9f6e' }}>Current Location</Text>
                  <Text className="text-lg font-bold" style={{ color: '#237227' }} numberOfLines={1}>Downtown Center</Text>
                </View>
              </View>

              {/* Time Range Section */}
              <View className="flex-row items-center justify-between w-full p-4 mb-6 bg-white rounded-2xl">
                <View>
                  <Text className="text-xs font-semibold" style={{ color: '#6b9f6e' }}>START TIME</Text>
                  <Text className="mt-1 text-base font-bold" style={{ color: '#237227' }}>08:00 AM</Text>
                </View>
                <View className="w-px h-8" style={{ backgroundColor: '#e8f5e9' }} />
                <View className="items-end">
                  <Text className="text-xs font-semibold" style={{ color: '#6b9f6e' }}>END TIME</Text>
                  <Text className="mt-1 text-base font-bold" style={{ color: '#237227' }}>04:00 PM</Text>
                </View>
              </View>

              {/* Check In Button */}
              <TouchableOpacity 
                activeOpacity={0.8}
                className="flex-row items-center justify-center w-full py-4 rounded-2xl active:scale-95"
                style={{ backgroundColor: '#237227' }}
              >
                <Ionicons name="finger-print" size={20} color="white" />
                <Text className="ml-2 text-base font-bold text-white">Check In Now</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. ACTIVITY LOG - ENHANCED */}
          <View className="w-full mt-6 mb-16">
             <Text className="mb-4 text-lg font-bold text-gray-800">Recent Activity</Text>
             <ActivityItem icon="checkmark-circle" text="Completed safety inspection" time="2h ago" />
             <ActivityItem icon="mail" text="New message from supervisor" time="4h ago" />
             <ActivityItem icon="alert-circle" text="System update available" time="1h ago" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Helper Components
function StatCard({ icon, title, value, color }: { icon: any, title: string, value: string, color: string }) {
  return (
    // FIX 4: Use 48% width to ensure grid responsiveness on all screen sizes
    <View className="w-[48%] mb-3 p-6 rounded-3xl active:scale-95" style={{ backgroundColor: '#e8f5e9' }}>
      <View className="self-start p-4 mb-4 bg-white rounded-2xl">
        <Ionicons name={icon} size={28} color="#237227" />
      </View>
      <Text className="mb-2 text-3xl font-bold" style={{ color: '#237227' }}>{value}</Text>
      <Text className="text-sm font-medium tracking-wide uppercase" style={{ color: '#6b9f6e' }}>{title}</Text>
    </View>
  );
}

function ActivityItem({ icon, text, time }: { icon: any, text: string, time: string }) {
  return (
    <View className="w-full p-4 mb-3 rounded-2xl" style={{ backgroundColor: '#e8f5e9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 }}>
      <View className="flex-row items-center">
        <View className="p-3 mr-4 rounded-full" style={{ backgroundColor: '#237227' }}>
          <Ionicons name={icon} size={18} color="#f8fafb" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-800" numberOfLines={1}>{text}</Text>
          <Text className="mt-1 text-xs text-gray-400">{time}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#237227" />
      </View>
    </View>
  );
}