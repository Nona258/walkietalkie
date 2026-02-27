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
        <View className="flex-row items-center justify-between px-6 pt-6 pb-6 bg-white">
          <View className="flex-row items-center flex-1 gap-3">
            <TouchableOpacity 
              className="items-center justify-center flex-shrink-0 overflow-hidden bg-green-500 rounded-full h-14 w-14 active:scale-95"
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
            <View className="p-3 bg-green-100 rounded-full">
              <Ionicons name="notifications" size={24} color="#10b981" />
            </View>
            <TouchableOpacity 
              onPress={onNavigateToSettings}
              className="p-3 bg-green-100 rounded-full active:scale-95"
            >
              <Ionicons name="settings" size={24} color="#10b981" />
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
            <Text className="mb-4 text-lg font-bold text-gray-800">Ongoing Shift</Text>
            <View className="w-full p-6 border-2 border-green-200 shadow-md bg-gradient-to-br from-white to-green-50 rounded-3xl shadow-green-200">
              {/* Location Section */}
              <View className="flex-row items-center p-4 mb-6 border border-green-200 bg-green-50 rounded-2xl">
                <View className="p-3 mr-4 bg-green-500 rounded-full">
                  <Ionicons name="location" size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold tracking-wider text-green-600 uppercase">Current Location</Text>
                  <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>Downtown Center</Text>
                </View>
              </View>

              {/* Time Range Section */}
              <View className="flex-row items-center justify-between w-full p-4 mb-6 bg-white border border-green-100 rounded-2xl">
                <View>
                  <Text className="text-xs font-semibold text-gray-500">START TIME</Text>
                  <Text className="mt-1 text-base font-bold text-gray-900">08:00 AM</Text>
                </View>
                <View className="w-px h-8 bg-green-200" />
                <View className="items-end">
                  <Text className="text-xs font-semibold text-gray-500">END TIME</Text>
                  <Text className="mt-1 text-base font-bold text-gray-900">04:00 PM</Text>
                </View>
              </View>

              {/* Check In Button */}
              <TouchableOpacity 
                activeOpacity={0.8}
                className="flex-row items-center justify-center w-full py-4 shadow-lg bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-green-300 active:scale-95"
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
    <View className="bg-white w-[48%] mb-3 p-5 rounded-3xl shadow-md shadow-green-200 border-2 border-green-100 active:scale-95">
      <View className={`${color} self-start p-3 rounded-xl mb-3`}>
        <Ionicons name={icon} size={24} color="white" />
      </View>
      <Text className="text-2xl font-black text-gray-900">{value}</Text>
      <Text className="text-gray-500 text-xs font-semibold mt-1\">{title}</Text>
    </View>
  );
}

function ActivityItem({ icon, text, time }: { icon: any, text: string, time: string }) {
  return (
    <View className="flex-row items-center w-full p-4 mb-4 bg-white border border-green-100 shadow-md rounded-2xl shadow-green-100">
      <View className="p-3 mr-4 bg-green-100 rounded-full">
        <Ionicons name={icon} size={18} color="#16a34a" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-800" numberOfLines={1}>{text}</Text>
        <Text className="text-gray-400 text-xs mt-1\">{time}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </View>
  );
}