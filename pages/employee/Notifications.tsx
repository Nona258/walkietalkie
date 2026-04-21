import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../utils/supabase';
import {
  fetchMyNotifications,
  fetchMyUnreadNotificationCount,
  deleteMyNotificationsOlderThan,
  markMyNotificationsViewed,
  type AppNotification,
} from '../../utils/notifications';
import { respondToContactRequest } from '../../utils/FriendRequests';

export default function Notifications({ onBack }: { onBack?: () => void }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [notifActionLoading, setNotifActionLoading] = useState<Record<number, boolean>>({});
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchMyNotifications(100);
      setNotifications(rows);
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    const c = await fetchMyUnreadNotificationCount();
    setUnreadCount(c);
  }, []);

  useEffect(() => {
    (async () => {
      await deleteMyNotificationsOlderThan(7);
      await markMyNotificationsViewed();
      await Promise.all([loadNotifications(), loadUnreadCount()]);
    })();

    const channel = supabase
      .channel('notifications_screen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification' }, () => {
        void Promise.all([loadNotifications(), loadUnreadCount()]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications, loadUnreadCount]);

  const handleRespondToRequest = async (notificationId: number, senderId: string, accept: boolean) => {
    setNotifActionLoading((s) => ({ ...s, [notificationId]: true }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Unable to determine current user');

      await respondToContactRequest(senderId, user.id, accept);

      // remove the notification row (best-effort)
      await supabase.from('notification').delete().eq('id', notificationId);

      await Promise.all([loadNotifications(), loadUnreadCount()]);
    } catch (e: any) {
      console.error('Failed to respond to contact request:', e);
      Alert.alert('Error', e?.message || String(e));
    } finally {
      setNotifActionLoading((s) => ({ ...s, [notificationId]: false }));
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-6 pt-12 pb-4 bg-[#F8F4FB] ">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={onBack} className="p-2">
            <Ionicons name="chevron-back" size={23} color="#237227" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Notifications</Text>
        </View>
        <View className="flex-row items-center gap-3">
          <Text className="text-sm font-medium text-[#237227]">Unread: {unreadCount}</Text>
        </View>
      </View>

      <View className="p-4">
        {loading ? (
          <View className="items-center justify-center py-8">
            <ActivityIndicator />
            <Text className="mt-2 text-sm text-gray-500">Loading…</Text>
          </View>
        ) : notifications.length === 0 ? (
          <Text className="py-6 text-sm text-center text-gray-500">You have no notifications.</Text>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {notifications.map((n) => {
              const rawBody = n.body || '';
              const senderMatch = rawBody.match(/__sender_id__:(\S+)/);
              const senderId = senderMatch ? senderMatch[1] : null;
              const bodyWithoutMarker = rawBody.replace(/__sender_id__:\S+\n?/, '').trim();

              return (
                <View key={String(n.id)} className="p-3 mb-3 bg-white border border-gray-100 rounded-xl">
                  <Text className="text-sm font-bold text-gray-900">{n.title || 'Notification'}</Text>
                  <Text className="mt-1 text-xs text-gray-600">{bodyWithoutMarker}</Text>
                  <Text className="mt-2 text-[11px] text-gray-400">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</Text>

                  {senderId && n.title === 'Contact Request' && (
                    <View className="flex-row gap-2 mt-3">
                      <TouchableOpacity
                        className="flex-1 py-2 bg-green-600 rounded-xl"
                        onPress={() => void handleRespondToRequest(Number(n.id), senderId, true)}
                        disabled={Boolean(notifActionLoading[Number(n.id)])}>
                        <Text className="text-sm font-semibold text-center text-white">
                          {notifActionLoading[Number(n.id)] ? 'Processing...' : 'Accept'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 py-2 bg-gray-100 rounded-xl"
                        onPress={() => void handleRespondToRequest(Number(n.id), senderId, false)}
                        disabled={Boolean(notifActionLoading[Number(n.id)])}>
                        <Text className="text-sm font-semibold text-center text-gray-700">
                          {notifActionLoading[Number(n.id)] ? 'Processing...' : 'Deny'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        <TouchableOpacity
          className="w-full py-3 mt-3 bg-[#237227] rounded-xl"
          onPress={() => {
            void Promise.all([loadNotifications(), loadUnreadCount()]);
          }}
          disabled={loading}>
          <Text className="text-sm font-semibold text-center text-[#f8f4fb]">Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
