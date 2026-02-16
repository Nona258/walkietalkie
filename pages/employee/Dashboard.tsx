import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../utils/supabase';

export default function Dashboard({ 
  onLogout, 
  onNavigateToSettings 
}: { 
  onLogout?: () => void;
  onNavigateToSettings?: () => void;
}) {
  const [userData, setUserData] = useState({ full_name: 'User', phone_number: null });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.id);
      
      if (user?.id) {
        // Fetch user data from the users table with simpler query
        const { data, error } = await supabase
          .from('users')
          .select('full_name, phone_number')
          .eq('id', user.id);

        console.log('User data from table:', data);
        console.log('Error:', error);

        if (data && data.length > 0 && data[0].full_name) {
          setUserData({
            full_name: data[0].full_name,
            phone_number: data[0].phone_number,
          });
        } else {
          // If table query fails, fallback to auth metadata
          console.log('Falling back to auth metadata');
          setUserData({
            full_name: user.user_metadata?.full_name || 'User',
            phone_number: null,
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
        <View className="bg-white pt-6 pb-6 px-6 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity 
              className="h-12 w-12 rounded-full bg-green-500 items-center justify-center active:scale-95"
            >
              <Ionicons name="person" size={22} color="white" />
            </TouchableOpacity>
            <View>
              <Text className="text-gray-900 text-xl font-extrabold">{userData.full_name}</Text>
              <Text className="text-gray-600 text-sm font-semibold -mt-1">Employee</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="bg-green-100 rounded-full p-3">
              <Ionicons name="notifications" size={24} color="#10b981" />
            </View>
            <TouchableOpacity 
              onPress={onNavigateToSettings}
              className="bg-green-100 rounded-full p-3 active:scale-95"
            >
              <Ionicons name="settings" size={24} color="#10b981" />
            </TouchableOpacity>
          </View>
        </View>

        {/* CONTENT WRAPPER */}
        <View className="px-6 py-8 w-full bg-white">
          {/* 2. STATS GRID - ENHANCED DESIGN */}
          <Text className="text-gray-800 text-lg font-bold mb-4">Your Statistics</Text>
          <View className="flex-row flex-wrap justify-between w-full gap-3">
            <StatCard icon="map-outline" title="Sites" value="3" color="bg-green-500" />
            <StatCard icon="chatbubbles-outline" title="Alerts" value="5" color="bg-green-400" />
            <StatCard icon="time-outline" title="Hours" value="8h" color="bg-green-600" />
            <StatCard icon="shield-checkmark-outline" title="Tasks" value="12" color="bg-green-500" />
          </View>

          {/* 3. CURRENT ASSIGNMENT CARD - PREMIUM DESIGN */}
          <View className="mt-6 w-full">
            <Text className="text-gray-800 text-lg font-bold mb-4">Ongoing Shift</Text>
            <View className="bg-gradient-to-br from-white to-green-50 rounded-3xl p-6 shadow-md shadow-green-200 border-2 border-green-200 w-full">
              {/* Location Section */}
              <View className="flex-row items-center mb-6 bg-green-50 p-4 rounded-2xl border border-green-200">
                <View className="bg-green-500 p-3 rounded-full mr-4">
                  <Ionicons name="location" size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-green-600 text-xs font-bold uppercase tracking-wider">Current Location</Text>
                  <Text className="text-gray-900 text-lg font-bold" numberOfLines={1}>Downtown Center</Text>
                </View>
              </View>

              {/* Time Range Section */}
              <View className="flex-row justify-between items-center bg-white p-4 rounded-2xl mb-6 w-full border border-green-100">
                <View>
                  <Text className="text-gray-500 text-xs font-semibold">START TIME</Text>
                  <Text className="text-gray-900 font-bold text-base mt-1">08:00 AM</Text>
                </View>
                <View className="h-8 w-px bg-green-200" />
                <View className="items-end">
                  <Text className="text-gray-500 text-xs font-semibold">END TIME</Text>
                  <Text className="text-gray-900 font-bold text-base mt-1">04:00 PM</Text>
                </View>
              </View>

              {/* Check In Button */}
              <TouchableOpacity 
                activeOpacity={0.8}
                className="bg-gradient-to-r from-green-500 to-green-600 flex-row items-center justify-center py-4 rounded-2xl shadow-lg shadow-green-300 w-full active:scale-95"
              >
                <Ionicons name="finger-print" size={20} color="white" />
                <Text className="text-white font-bold ml-2 text-base">Check In Now</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. ACTIVITY LOG - ENHANCED */}
          <View className="mt-6 w-full mb-16">
             <Text className="text-gray-800 text-lg font-bold mb-4">Recent Activity</Text>
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
    <View className="flex-row items-center mb-4 bg-white p-4 rounded-2xl shadow-md shadow-green-100 border border-green-100 w-full">
      <View className="bg-green-100 p-3 rounded-full mr-4">
        <Ionicons name={icon} size={18} color="#16a34a" />
      </View>
      <View className="flex-1">
        <Text className="text-gray-800 font-semibold text-sm" numberOfLines={1}>{text}</Text>
        <Text className="text-gray-400 text-xs mt-1\">{time}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </View>
  );
}