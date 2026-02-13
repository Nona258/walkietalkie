import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';
//import { supabase } from '../../utils/supabase';
import AdminSidebar from '../../components/AdminSidebar';
import AdminSidebarMobile from '../../components/AdminSidebarMobile';
import AdminHeader from '../../components/AdminHeader';

interface ActivityLogsProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
}

// Activity log type for fetched data
interface ActivityLog {
  id: number;
  user_name: string;
  initials: string;
  action: string;
  description: string;
  location: string;
  time: string;
  type: string;
  color: string;
  icon: string;
}

export default function ActivityLogs({ onNavigate }: ActivityLogsProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  /*
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('time', { ascending: false });
      if (!error && data) setActivities(data);
      setLoading(false);
    };
    fetchLogs();
  }, []);
  */
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || activity.type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Dummy sign out handler
  const handleSignOut = () => {
    // Add your sign out logic here
  };

  return (
    <View className="flex-row flex-1 bg-stone-50">
      {/* Desktop Sidebar - Hidden on mobile */}
      <AdminSidebar onNavigate={onNavigate} />

      {/* Main Content Area */}
      <ScrollView className="flex-1 bg-stone-50">
        {/* Header */}
        <View className="px-5 pt-4 pb-3 bg-white border-b border-stone-200">
          <AdminHeader
            title="Activity Logs"
            subtitle="Welcome back, Administrator"
            onMenuPress={() => setIsDrawerOpen(true)}
            isNotificationOpen={isNotificationOpen}
            setIsNotificationOpen={setIsNotificationOpen}
            onNavigate={onNavigate}
          />
        </View>

        {/* Activity Logs Content Container */}
        <View className="px-5 py-4 lg:px-8 lg:py-6">
          {/* Desktop Card Container */}
          <View className="overflow-hidden bg-white border rounded-2xl border-stone-200">
            {/* Card Header with Filter & Export */}
            <View className="px-5 py-4 border-b lg:px-6 lg:py-5 border-stone-100">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold lg:text-lg text-stone-900">Activity Logs</Text>
                <View className="flex-row items-center gap-2 lg:gap-3">
                  <TouchableOpacity 
                    className="px-3 lg:px-4 py-2 lg:py-2.5 bg-stone-50 rounded-lg border border-stone-200"
                    onPress={() => setFilterType('all')}
                  >
                    <Text className="text-xs font-medium lg:text-sm text-stone-600">All Activities</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="px-3 lg:px-4 py-2 lg:py-2.5 bg-stone-100 rounded-lg border border-stone-200"
                    onPress={() => {/* Export logic */}}
                  >
                    <Text className="text-xs font-medium lg:text-sm text-stone-700">Export</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Activity List */}
            <View className="px-3 py-3 lg:px-6 lg:py-4">
              {filteredActivities.length === 0 ? (
                <View className="items-center justify-center flex-1 py-12">
                  <Ionicons name="document-text-outline" size={48} color="#d6d3d1" />
                  <Text className="mt-3 text-sm text-stone-400">No activities found</Text>
                </View>
              ) : (
                filteredActivities.map((activity, index) => (
                  <View 
                    key={activity.id} 
                    className={`flex-row items-start py-4 lg:py-5 ${
                      index !== filteredActivities.length - 1 ? 'border-b border-stone-100' : ''
                    }`}
                  >
                    {/* Icon */}
                    <View 
                      className="items-center justify-center w-12 h-12 mr-3 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl lg:mr-4"
                      style={{ backgroundColor: activity.color }}
                    >
                      <Ionicons name={activity.icon as any} size={20} color="#10b981" />
                    </View>

                    {/* Content */}
                    <View className="flex-1">
                      <Text className="mb-1 text-sm font-semibold lg:text-base text-stone-900">
                        {activity.action}
                      </Text>
                      <Text className="text-xs lg:text-sm text-stone-500">
                        {activity.description}
                      </Text>
                    </View>

                    {/* Time */}
                    <Text className="mt-1 ml-3 text-xs lg:text-sm text-stone-400 lg:ml-4">
                      {activity.time}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Mobile Drawer Modal */}
      <AdminSidebarMobile
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={(route) => {
          setIsDrawerOpen(false);
          onNavigate(route);
        }}
        activeRoute="activityLogs"
        onSignOut={handleSignOut}
      />
    </View>
  );
}