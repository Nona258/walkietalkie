import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';
import supabase from '../../utils/supabase';

interface TechnicalSupportProps {
  onNavigate?: (page: string) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

export default function TechnicalSupport({ onNavigate, isMobileMenuOpen, setIsMobileMenuOpen }: TechnicalSupportProps) {
  const windowWidth = Dimensions.get('window').width;
  const isWebView = windowWidth > 900;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sites')
        .select(
          `*, company:company_id ( company_name ), branch:branch_id ( branch_name )`
        )
        .neq('technical_issue', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Transform evidence_urls: ensure it's an array of full public URLs
      const itemsWithUrls = (data || []).map((site: any) => {
        let evidenceUrls = site.evidence_urls;

        // If it's a string, try to parse as JSON
        if (typeof evidenceUrls === 'string') {
          try {
            const parsed = JSON.parse(evidenceUrls);
            if (Array.isArray(parsed)) {
              evidenceUrls = parsed;
            }
          } catch (e) {
            console.warn(`Failed to parse evidence_urls string for site ${site.id}:`, e);
          }
        }

        // Ensure it's an array
        if (!Array.isArray(evidenceUrls)) {
          evidenceUrls = [];
        }

        // Process each URL: if it's already a full URL, use it; otherwise generate from bucket
        evidenceUrls = evidenceUrls.map((path: string) => {
          if (path.startsWith('http://') || path.startsWith('https://')) {
            // Already a full URL, use as is
            return path;
          } else {
            // It's a relative path; generate public URL
            const relativePath = path.replace(/^site_evidence\//, '');
            const { data: urlData } = supabase.storage
              .from('site_evidence')
              .getPublicUrl(relativePath);
            return urlData.publicUrl;
          }
        });

        return { ...site, evidence_urls: evidenceUrls };
      });

      setItems(itemsWithUrls);
    } catch (e) {
      console.warn('Failed to fetch technical issues', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-stone-50">
      <ScrollView className="flex-1 px-6 py-6">
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center flex-1">
            {!isWebView && setIsMobileMenuOpen && (
              <TouchableOpacity
                className="items-center justify-center mr-3 h-9 w-9"
                onPress={() => setIsMobileMenuOpen(true)}
                activeOpacity={0.8}>
                <Ionicons name="menu" size={28} color="#237227" />
              </TouchableOpacity>
            )}
            <Text className="text-xl font-bold text-stone-900">Technical Support</Text>
          </View>
          <Text className="text-sm text-stone-500">Shows sites with a submitted technical issue</Text>
        </View>

        <View className="overflow-hidden bg-white border rounded-2xl border-stone-200">
          <View className="flex-row items-center px-4 py-3 border-b border-stone-200 bg-stone-50">
            <Text className="flex-1 text-xs font-semibold tracking-wide uppercase text-stone-600">Site Name</Text>
            <Text className="w-24 text-xs font-semibold tracking-wide uppercase text-stone-600">Status</Text>
            <Text className="text-xs font-semibold tracking-wide uppercase w-36 text-stone-600">Company</Text>
            <Text className="text-xs font-semibold tracking-wide uppercase w-36 text-stone-600">Branch</Text>
            <Text className="w-40 text-xs font-semibold tracking-wide uppercase text-stone-600">Starlink Serial</Text>
            <Text className="text-xs font-semibold tracking-wide uppercase w-44 text-stone-600">Issue Type</Text>
            <Text className="flex-1 text-xs font-semibold tracking-wide uppercase text-stone-600">Issue Description</Text>
            <Text className="text-xs font-semibold tracking-wide text-center uppercase w-28 text-stone-600">Evidence</Text>
          </View>

          {items.length === 0 ? (
            <View className="items-center px-6 py-12">
              <Ionicons name="warning-outline" size={36} color="#d6d3d1" />
              <Text className="mt-4 text-sm text-stone-500">No technical issues found</Text>
            </View>
          ) : (
            items.map((s, idx) => (
              <View
                key={s.id || idx}
                className={`flex-row items-center px-4 py-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50'}`}>
                <Text className="flex-1 text-sm font-semibold text-stone-900">{s.name}</Text>
                <Text className="w-24 text-sm text-stone-600">{s.status}</Text>
                <Text className="text-sm w-36 text-stone-600">{(s as any).company?.company_name || '—'}</Text>
                <Text className="text-sm w-36 text-stone-600">{(s as any).branch?.branch_name || '—'}</Text>
                <Text className="w-40 text-sm text-stone-600">{s.starlink_serial || '—'}</Text>
                <Text className="text-sm w-44 text-stone-600">{s.technical_issue || '—'}</Text>
                <Text className="flex-1 text-sm text-stone-600 line-clamp-2">{s.issue_description || '—'}</Text>
                <View className="items-center justify-center w-28">
                  {Array.isArray(s.evidence_urls) && s.evidence_urls.length > 0 ? (
                    <TouchableOpacity
                      onPress={() => {
                        setActiveImage(String(s.evidence_urls[0]));
                        setImageModalVisible(true);
                      }}
                      className="items-center justify-center w-10 h-10 overflow-hidden border rounded-md border-stone-200">
                      <Image
                        source={{ uri: String(s.evidence_urls[0]) }}
                        className="w-10 h-10"
                        onError={(e) => console.warn(`Failed to load image: ${s.evidence_urls[0]}`, e.nativeEvent.error)}
                      />
                    </TouchableOpacity>
                  ) : (
                    <Text className="text-xs text-stone-400">—</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <Modal visible={imageModalVisible} transparent animationType="fade">
          <View className="items-center justify-center flex-1 p-6 bg-black/60">
            <View className="w-full max-w-3xl p-4 bg-white rounded-2xl">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-stone-900">Evidence Photo</Text>
                <Pressable onPress={() => setImageModalVisible(false)}>
                  <Ionicons name="close" size={20} color="#111827" />
                </Pressable>
              </View>
              {activeImage ? (
                <Image source={{ uri: activeImage }} className="w-full mt-4 rounded-md h-96" />
              ) : (
                <Text className="mt-4 text-sm text-stone-500">No image</Text>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}
