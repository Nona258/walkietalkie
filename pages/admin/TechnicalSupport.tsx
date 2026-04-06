import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';
import supabase from '../../utils/supabase';

interface Props {
  onBack?: () => void;
  setIsDrawerOpen?: (open: boolean) => void;
  onNavigate?: (page: string) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

export default function TechnicalSupport({
  onBack,
  setIsDrawerOpen,
  onNavigate,
  isMobileMenuOpen,
  setIsMobileMenuOpen
}: Props) {
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
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-4 pt-4 pb-3 bg-white border-b border-stone-200 lg:px-8">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              {!isWebView && (
                onBack ? (
                  <TouchableOpacity
                    onPress={onBack}
                    className="items-center justify-center mr-3 h-9 w-9"
                    accessible={true}
                    accessibilityLabel="Go back">
                    <Ionicons name="arrow-back" size={26} color="#237227" />
                  </TouchableOpacity>
                ) : setIsDrawerOpen ? (
                  <TouchableOpacity
                    onPress={() => setIsDrawerOpen(true)}
                    className="items-center justify-center mr-3 h-9 w-9"
                    accessible={true}
                    accessibilityLabel="Open menu">
                    <Ionicons name="menu" size={26} color="#237227" />
                  </TouchableOpacity>
                ) : setIsMobileMenuOpen ? (
                  <TouchableOpacity
                    onPress={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="items-center justify-center mr-3 h-9 w-9"
                    accessible={true}
                    accessibilityLabel="Toggle menu">
                    <Ionicons name="menu" size={26} color="#237227" />
                  </TouchableOpacity>
                ) : null
              )}
              <View className="flex-1">
                <Text className="text-base font-bold text-stone-900 lg:text-2xl">Technical Issues</Text>
                <Text className="mt-0.5 text-[11px] text-stone-500 lg:text-sm">
                  Sites with submitted technical issues ({items.length})
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content */}
        <View className="px-3 py-3 lg:px-8 lg:py-6">
          <View className="overflow-hidden bg-white border shadow-sm rounded-2xl border-stone-200">
            {loading ? (
              <View className="items-center py-12">
                <Ionicons name="hourglass-outline" size={36} color="#d6d3d1" />
                <Text className="mt-4 text-sm text-stone-500">Loading...</Text>
              </View>
            ) : items.length === 0 ? (
              <View className="items-center px-6 py-12">
                <Ionicons name="warning-outline" size={36} color="#d6d3d1" />
                <Text className="mt-4 text-sm text-stone-500">No technical issues found</Text>
              </View>
            ) : isWebView ? (
              <>
                {/* Desktop Table Layout */}
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

                {items.map((s, idx) => (
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
                ))}
              </>
            ) : (
              <>
                {/* Mobile Card Layout */}
                {items.map((s, idx) => (
                  <View
                    key={s.id || idx}
                    className={`p-3 ${idx < items.length - 1 ? 'border-b border-stone-200' : ''}`}>
                    <View className="gap-2.5">
                      {/* Site Name & Status */}
                      <View className="flex-row items-start justify-between gap-2">
                        <View className="flex-1 min-w-0">
                          <Text className="text-[13px] font-bold text-stone-900" numberOfLines={2}>
                            {s.name}
                          </Text>
                          <View className="flex-row items-center gap-1.5 mt-1">
                            <View className={`w-2 h-2 rounded-full ${
                              s.status?.toLowerCase() === 'active' ? 'bg-green-500' :
                              s.status?.toLowerCase() === 'inactive' ? 'bg-red-500' :
                              'bg-gray-400'
                            }`} />
                            <Text className="text-[11px] text-stone-600">{s.status}</Text>
                          </View>
                        </View>
                        {Array.isArray(s.evidence_urls) && s.evidence_urls.length > 0 && (
                          <TouchableOpacity
                            onPress={() => {
                              setActiveImage(String(s.evidence_urls[0]));
                              setImageModalVisible(true);
                            }}
                            className="w-16 h-16 overflow-hidden border rounded-lg border-stone-200"
                            accessible={true}
                            accessibilityLabel="View evidence photo">
                            <Image
                              source={{ uri: String(s.evidence_urls[0]) }}
                              className="w-16 h-16"
                              onError={(e) => console.warn(`Failed to load image: ${s.evidence_urls[0]}`, e.nativeEvent.error)}
                            />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Company & Branch */}
                      <View className="gap-1.5">
                        <View className="flex-row items-center gap-2">
                          <Ionicons name="business-outline" size={12} color="#78716c" />
                          <Text className="text-[12px] text-stone-600">
                            {(s as any).company?.company_name || '—'} • {(s as any).branch?.branch_name || '—'}
                          </Text>
                        </View>

                        {/* Starlink Serial */}
                        {s.starlink_serial && (
                          <View className="flex-row items-center gap-2">
                            <Ionicons name="hardware-chip-outline" size={12} color="#78716c" />
                            <Text className="text-[12px] text-stone-600">{s.starlink_serial}</Text>
                          </View>
                        )}

                        {/* Issue Type */}
                        {s.technical_issue && (
                          <View className="flex-row items-center gap-2">
                            <Ionicons name="alert-circle-outline" size={12} color="#78716c" />
                            <Text className="text-[12px] font-medium text-stone-700">{s.technical_issue}</Text>
                          </View>
                        )}

                        {/* Issue Description */}
                        {s.issue_description && (
                          <View className="p-2 mt-1 rounded-lg bg-stone-50">
                            <Text className="text-[12px] text-stone-600 leading-5">
                              {s.issue_description}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

        {/* Image Modal */}
        <Modal visible={imageModalVisible} transparent animationType="fade">
          <View className="items-center justify-center flex-1 p-4 bg-black/70">
            <View className="w-full max-w-3xl p-4 bg-white rounded-2xl lg:p-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-bold text-stone-900 lg:text-lg">Evidence Photo</Text>
                <TouchableOpacity
                  onPress={() => setImageModalVisible(false)}
                  className="items-center justify-center w-8 h-8 rounded-lg bg-stone-100"
                  accessible={true}
                  accessibilityLabel="Close modal">
                  <Ionicons name="close" size={20} color="#111827" />
                </TouchableOpacity>
              </View>
              {activeImage ? (
                <Image
                  source={{ uri: activeImage }}
                  className="w-full rounded-lg"
                  style={{ aspectRatio: 4 / 3 }}
                  resizeMode="contain"
                />
              ) : (
                <View className="items-center py-12">
                  <Text className="text-sm text-stone-500">No image available</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}