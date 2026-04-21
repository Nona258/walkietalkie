import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, Pressable, useWindowDimensions } from 'react-native';
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
  const { width } = useWindowDimensions();
  const isWebView = width > 900;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [activeEvidenceList, setActiveEvidenceList] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(3); // adapt below for mobile

  // centralized modal close to ensure consistent cleanup
  const closeImageModal = () => {
    setImageModalVisible(false);
    setActiveEvidenceList([]);
    setActiveImageIndex(0);
    setActiveImage(null);
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(items.length / pageSize)), [items.length, pageSize]);

  useEffect(() => {
    fetchIssues();
  }, []);

  // Adjust pageSize for mobile vs desktop and clamp current page
  useEffect(() => {
    const newSize = isWebView ? 3 : 1;
    setPageSize(newSize);
  }, [isWebView]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

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
                  <Text className="flex-1 text-xs font-semibold tracking-wide text-left uppercase text-stone-600">Site Name</Text>
                  <Text className="w-24 text-xs font-semibold tracking-wide text-center uppercase text-stone-600">Status</Text>
                  <Text className="text-xs font-semibold tracking-wide text-center uppercase w-36 text-stone-600">Company</Text>
                  <Text className="text-xs font-semibold tracking-wide text-left uppercase w-36 text-stone-600">Branch</Text>
                  <Text className="w-40 text-xs font-semibold tracking-wide text-center uppercase text-stone-600">Starlink Serial</Text>
                  <Text className="text-xs font-semibold tracking-wide text-center uppercase w-44 text-stone-600">Issue Type</Text>
                  <Text className="flex-1 text-xs font-semibold tracking-wide text-center uppercase text-stone-600">Issue Description</Text>
                  <Text className="text-xs font-semibold tracking-wide text-center uppercase w-28 text-stone-600">Action</Text>
                </View>

                {items.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((s, idx) => (
                  <View
                    key={s.id || idx}
                    className={`flex-row items-center px-4 py-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50'}`}>
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-semibold text-stone-900" numberOfLines={2}>{s.name}</Text>
                    </View>
                    <View className="items-center w-24">
                      <Text className="text-sm text-stone-600">{s.status}</Text>
                    </View>
                    <View className="items-center w-36">
                      <Text className="text-sm text-stone-600">{(s as any).company?.company_name || '—'}</Text>
                    </View>
                    <View className="w-36">
                      <Text className="text-sm text-stone-600">{(s as any).branch?.branch_name || '—'}</Text>
                    </View>
                    <View className="items-center w-40">
                      <Text className="text-sm text-stone-600">{s.starlink_serial || '—'}</Text>
                    </View>
                    <View className="items-center w-44">
                      <Text className="text-sm text-stone-600">{s.technical_issue || '—'}</Text>
                    </View>
                    <View className="items-center flex-1 min-w-0">
                      <Text className="text-sm text-center text-stone-600 line-clamp-2">{s.issue_description || '—'}</Text>
                    </View>
                    <View className="items-center justify-center w-28">
                        {Array.isArray(s.evidence_urls) && s.evidence_urls.length > 0 ? (
                        <TouchableOpacity
                          onPress={() => {
                            const list = (s.evidence_urls || []).map((u: any) => String(u)).filter(Boolean);
                            // if no valid URLs, don't open the modal
                            if (!list || list.length === 0 || !list[0]) return;
                            setActiveEvidenceList(list);
                            setActiveImageIndex(0);
                            setActiveImage(list[0]);
                            setImageModalVisible(true);
                          }}
                          className="items-center justify-center w-10 h-10 rounded-full bg-[#f8f4fb] border border-[#237227]"
                          accessible={true}
                          accessibilityLabel="View evidence">
                          <Ionicons name="eye-outline" size={22} color="#237227" />
                        </TouchableOpacity>
                      ) : (
                        <Text className="text-xs text-stone-400">—</Text>
                      )}
                    </View>
                  </View>
                ))}

                {/* Table footer / pagination */}
                <View className="flex-row items-center justify-between px-4 py-3 border-t border-stone-200 bg-stone-50">
                  <Text className="text-sm text-stone-600">Showing {Math.min(pageSize, items.length - (currentPage - 1) * pageSize)} of {items.length} technical issues</Text>

                  <View className="flex-row gap-[6px]">
                    <TouchableOpacity
                      onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className={
                        "w-7 h-7 rounded-[7px] border border-[#e5e7eb] bg-white items-center justify-center " +
                        (currentPage <= 1 ? 'opacity-50' : '')
                      }
                    >
                      <Ionicons name={'chevron-back-outline' as any} size={13} color="#4b6b4d" />
                    </TouchableOpacity>

                    <View className="px-3 h-8 rounded-lg  border border-[#237227] items-center justify-center min-w-[60px]">
                      <Text className="text-[11px] font-semibold text-stone-900">
                        {currentPage} / {totalPages}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className={
                        "w-7 h-7 rounded-[7px] border border-[#e5e7eb] bg-white items-center justify-center " +
                        (currentPage >= totalPages ? 'opacity-50' : '')
                      }
                    >
                      <Ionicons name={'chevron-forward-outline' as any} size={13} color="#4b6b4d" />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Mobile Card Layout */}
                {items.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((s, idx) => (
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
                          <View className="flex-row items-center gap-2">
                            <TouchableOpacity
                              onPress={() => {
                                const list = (s.evidence_urls || []).map((u: any) => String(u)).filter(Boolean);
                                if (!list || list.length === 0 || !list[0]) return;
                                setActiveEvidenceList(list);
                                setActiveImageIndex(0);
                                setActiveImage(list[0]);
                                setImageModalVisible(true);
                              }}
                              className="items-center justify-center w-10 h-10 rounded-md"
                              accessible={true}
                              accessibilityLabel="Open evidence gallery">
                              <Ionicons name="eye-outline" size={20} color="#237227" />
                            </TouchableOpacity>
                          </View>
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

                {/* Mobile footer / pagination */}
                <View className="flex-row items-center justify-between px-4 py-3 border-t border-stone-200 bg-stone-50">
                  <Text className="text-sm text-stone-600">Showing {Math.min(pageSize, items.length - (currentPage - 1) * pageSize)} of {items.length} technical issues</Text>
                  <View className="flex-row gap-[6px]">
                    <TouchableOpacity
                      onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className={
                        "w-7 h-7 rounded-[7px] border border-[#e5e7eb] bg-white items-center justify-center " +
                        (currentPage <= 1 ? 'opacity-50' : '')
                      }
                    >
                      <Ionicons name={'chevron-back-outline' as any} size={13} color="#4b6b4d" />
                    </TouchableOpacity>

                    <View className="px-3 h-8 rounded-lg  border border-[#237227] items-center justify-center min-w-[60px]">
                      <Text className="text-[11px] font-semibold text-stone-900">
                        {currentPage} / {totalPages}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className={
                        "w-7 h-7 rounded-[7px] border border-[#e5e7eb] bg-white items-center justify-center " +
                        (currentPage >= totalPages ? 'opacity-50' : '')
                      }
                    >
                      <Ionicons name={'chevron-forward-outline' as any} size={13} color="#4b6b4d" />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Image Modal */}
        <Modal visible={imageModalVisible} transparent animationType="fade" onRequestClose={closeImageModal}>
          <View className="items-center justify-center flex-1 p-4 bg-black/70">
            <View className="w-full max-w-3xl p-4 bg-white rounded-2xl lg:p-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-bold text-stone-900 lg:text-lg">Evidence Photo</Text>
                <TouchableOpacity
                  onPress={closeImageModal}
                  className="items-center justify-center px-3 h-8 rounded-lg bg-[#f8f4fb] border border-[#237227]"
                  accessible={true}
                  accessibilityLabel="Close modal">
                  <Text className="text-sm font-semibold text-[#237227]">Close</Text>
                </TouchableOpacity>
              </View>

              {activeEvidenceList && activeEvidenceList.length > 0 ? (
                <View>
                  <Image
                    source={{ uri: activeEvidenceList[activeImageIndex] }}
                    className="w-full rounded-lg"
                    style={{ aspectRatio: 4 / 3 }}
                    resizeMode="contain"
                  />

                  <View className="flex-row items-center justify-between mt-3">
                    <TouchableOpacity
                      onPress={() => {
                        const nextIndex = Math.max(0, activeImageIndex - 1);
                        setActiveImageIndex(nextIndex);
                        setActiveImage(activeEvidenceList[nextIndex] || null);
                      }}
                      disabled={activeImageIndex === 0}
                      className="p-2">
                      <Ionicons
                        name="chevron-back-outline"
                        size={23}
                        color={activeImageIndex === 0 ? '#237227' : '#237227'}
                      />
                    </TouchableOpacity>

                    <Text className="text-sm text-stone-600">{activeImageIndex + 1} / {activeEvidenceList.length}</Text>

                    <TouchableOpacity
                      onPress={() => {
                        const nextIndex = Math.min(activeEvidenceList.length - 1, activeImageIndex + 1);
                        setActiveImageIndex(nextIndex);
                        setActiveImage(activeEvidenceList[nextIndex] || null);
                      }}
                      disabled={activeImageIndex === activeEvidenceList.length - 1}
                      className="p-2">
                      <Ionicons
                        name="chevron-forward-outline"
                        size={23}
                        color={activeImageIndex === activeEvidenceList.length - 1 ? '#237227' : '#237227'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : activeImage ? (
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