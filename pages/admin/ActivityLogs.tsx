import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../../global.css';

type LogType = 'user' | 'security' | 'site' | 'report' | 'system' | 'alert' | 'delete';

interface Activity {
  id: number;
  type: LogType;
  action: string;
  description: string;
  user: string;
  userInitials: string;
  timestamp: string;
  timeAgo: string;
}

const LOG_ICON: Record<LogType, { icon: string; label: string }> = {
  user:     { icon: 'person-outline',           label: 'User'     },
  security: { icon: 'shield-checkmark-outline', label: 'Security' },
  site:     { icon: 'location-outline',         label: 'Site'     },
  report:   { icon: 'document-text-outline',    label: 'Report'   },
  system:   { icon: 'settings-outline',         label: 'System'   },
  alert:    { icon: 'alert-circle-outline',     label: 'Alert'    },
  delete:   { icon: 'trash-outline',            label: 'Delete'   },
};

const FILTER_TABS: { key: 'all' | LogType; label: string }[] = [
  { key: 'all',      label: 'All'      },
  { key: 'user',     label: 'User'     },
  { key: 'security', label: 'Security' },
  { key: 'site',     label: 'Site'     },
  { key: 'system',   label: 'System'   },
];

// Mock data for design preview
const MOCK_ACTIVITIES: Activity[] = [
  { id: 1, type: 'user',     action: 'New User Registered',          description: 'John Doe has been added to the system as Field Operator.',    user: 'Admin',      userInitials: 'AD', timestamp: 'Feb 27, 2026 · 09:14 AM', timeAgo: '2 mins ago' },
  { id: 2, type: 'security', action: 'Security Settings Updated',    description: 'Main Office perimeter access credentials were rotated.',       user: 'Sarah Kim',  userInitials: 'SK', timestamp: 'Feb 27, 2026 · 08:10 AM', timeAgo: '1 hr ago'   },
  { id: 3, type: 'site',     action: 'Site Added',                   description: 'North Warehouse site was created and assigned to Zone B.',     user: 'Marcus Lee', userInitials: 'ML', timestamp: 'Feb 27, 2026 · 07:55 AM', timeAgo: '1 hr ago'   },
  { id: 4, type: 'report',   action: 'Report Generated',             description: 'Monthly patrol summary report exported as PDF.',               user: 'Admin',      userInitials: 'AD', timestamp: 'Feb 26, 2026 · 05:30 PM', timeAgo: 'Yesterday'  },
  { id: 5, type: 'system',   action: 'System Configuration Changed', description: 'Notification interval updated from 30 min to 15 min.',         user: 'Dev Ops',    userInitials: 'DO', timestamp: 'Feb 26, 2026 · 03:22 PM', timeAgo: 'Yesterday'  },
  { id: 6, type: 'alert',    action: 'Unresolved Alert Escalated',   description: 'Gate 3 motion trigger unacknowledged for over 20 minutes.',    user: 'System',     userInitials: 'SY', timestamp: 'Feb 26, 2026 · 02:00 PM', timeAgo: 'Yesterday'  },
  { id: 7, type: 'delete',   action: 'Employee Record Deleted',      description: 'Former guard profile for T. Brown permanently removed.',       user: 'Admin',      userInitials: 'AD', timestamp: 'Feb 25, 2026 · 11:45 AM', timeAgo: '2 days ago' },
  { id: 8, type: 'user',     action: 'Role Permissions Modified',    description: 'Supervisor role granted access to payroll module.',            user: 'Sarah Kim',  userInitials: 'SK', timestamp: 'Feb 25, 2026 · 09:00 AM', timeAgo: '2 days ago' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function LogIconBadge({ type, size = 20 }: { type: LogType; size?: number }) {
  const { icon } = LOG_ICON[type];

  const outerSizeClass =
    size === 16 ? 'w-[36px] h-[36px]' :
    size === 18 ? 'w-[38px] h-[38px]' :
    'w-10 h-10';

  return (
    <View className={`${outerSizeClass} rounded-full bg-[#237227] items-center justify-center border border-[#f0f4f0]`}>
      <Ionicons name={icon as any} size={size} color="#f8fafb" />
    </View>
  );
}

function UserChip({ initials, name }: { initials: string; name: string }) {
  return (
    <View className="flex-row items-center gap-[6px]">
      <View className="w-[22px] h-[22px] rounded-full bg-[#237227] items-center justify-center border border-[#f0f4f0]">
        <Text className="text-[9px] font-bold text-[#f8fafb]">{initials}</Text>
      </View>
      <Text className="text-[12px] text-[#292524] font-medium">{name}</Text>
    </View>
  );
}

function ActivityRow({ item, isLast, isMobile }: { item: Activity; isLast: boolean; isMobile: boolean }) {
  if (isMobile) {
    return (
      <View className={`py-[14px] px-4 bg-white ${isLast ? '' : 'border-b border-[#f0f4f0]'}`}>
        <View className="flex-row items-start mb-2">
          <View className="mr-[10px]">
            <LogIconBadge type={item.type} size={16} />
          </View>
          <View className="flex-1">
            <Text className="text-[13px] font-semibold text-[#292524] mb-0.5">{item.action}</Text>
            <Text className="text-[12px] text-[#292524]">{item.description}</Text>
          </View>
        </View>
        <View className="flex-row flex-wrap items-center justify-between gap-2 mt-1">
          <View className="flex-row items-center gap-2">
            <UserChip initials={item.userInitials} name={item.user} />
            <View className="flex-row items-center gap-[3px] px-[6px] py-[2px] rounded-full border border-[#e5e7eb] bg-[#f8fafb]">
              <Ionicons name={LOG_ICON[item.type].icon as any} size={9} color="#8fa88f" />
              <Text className="text-[9px] text-[#8fa88f] font-medium">{LOG_ICON[item.type].label}</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-[11px] font-semibold text-[#292524]">{item.timeAgo}</Text>
            <Text className="text-[10px] text-[#8fa88f]">{item.timestamp}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className={`flex-row items-start py-4 px-6 bg-white ${isLast ? '' : 'border-b border-[#f0f4f0]'}`}>
      <View className="mr-[14px] pt-0.5">
        <LogIconBadge type={item.type} size={18} />
      </View>
      <View className="flex-1 gap-[2px]">
        <Text className="text-[14px] font-semibold text-[#292524]">{item.action}</Text>
        <Text className="text-[13px] text-[#292524]">{item.description}</Text>
        <View className="flex-row items-center gap-3 mt-0.5">
          <UserChip initials={item.userInitials} name={item.user} />
          <View className="flex-row items-center gap-1 px-2 py-[2px] rounded-full border border-[#e5e7eb] bg-[#f8fafb]">
            <Ionicons name={LOG_ICON[item.type].icon as any} size={10} color="#8fa88f" />
            <Text className="text-[10px] text-[#8fa88f] font-medium">{LOG_ICON[item.type].label}</Text>
          </View>
        </View>
      </View>
      <View className="items-end min-w-[110px] gap-1 pt-0.5">
        <Text className="text-[12px] font-semibold text-[#292524]">{item.timeAgo}</Text>
        <Text className="text-[11px] text-[#8fa88f]">{item.timestamp}</Text>
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface ActivityLogsProps {
  onNavigate: (page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings') => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

export default function ActivityLogs({ onNavigate, isMobileMenuOpen, setIsMobileMenuOpen }: ActivityLogsProps) {
  const PAGE_SIZE = 10;

  const [activeFilter, setActiveFilter] = useState<'all' | LogType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const windowWidth = Dimensions.get('window').width;
  const isWebView = windowWidth > 900;

  const pageX = isWebView ? 'px-6' : 'px-4';
  const titleSize = isWebView ? 'text-[30px]' : 'text-[20px]';
  const subtitleSize = isWebView ? 'text-[16px]' : 'text-[12px]';
  const cardX = isWebView ? 'px-6' : 'px-4';
  const cardY = isWebView ? 'py-4' : 'py-[14px]';

  const filtered = useMemo(() => {
    return MOCK_ACTIVITIES.filter((a) => {
      const matchesFilter = activeFilter === 'all' || a.type === activeFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        a.action.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.user.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, searchQuery]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  }, [filtered.length]);

  useEffect(() => {
    // If user changes filter/search, restart at page 1
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    // Clamp page if result size changes
    setCurrentPage((p) => Math.min(Math.max(p, 1), totalPages));
  }, [totalPages]);

  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const showingCount = useMemo(() => {
    if (filtered.length === 0) return 0;
    const end = currentPage * PAGE_SIZE;
    return Math.min(end, filtered.length);
  }, [filtered.length, currentPage]);

  const handleExportLogs = () => {
    if (filtered.length === 0) {
      alert('No logs to export. Please adjust your filters or search.');
      return;
    }
    const headers = ['ID', 'Type', 'Action', 'Description', 'User', 'Timestamp', 'Time Ago'];
    const rows = filtered.map((item) => [
      item.id, item.type, item.action, item.description, item.user, item.timestamp, item.timeAgo,
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => {
          const str = String(cell);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileName = `Activity-Logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <View className="flex-1 bg-[#f8fafb]">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

        {/* ── Top Header ─────────────────────────────────────────────────────── */}
        <View className={`bg-[#f8fafb] ${pageX} pt-[18px] pb-4 border-b border-[#e5e7eb] flex-row items-center justify-between`}>
          <View className="flex-row items-center flex-1">
            {!isWebView && setIsMobileMenuOpen && (
              <TouchableOpacity
                onPress={() => setIsMobileMenuOpen(true)}
                className="items-center justify-center w-10 h-10 mr-3"
              >
                <Ionicons name="menu" size={28} color="#237227" />
              </TouchableOpacity>
            )}
            <View className="flex-1">
              <Text className={`${titleSize} font-light text-[#292524] leading-[26px] mb-1`}>Activity Logs</Text>
              <Text className={`${subtitleSize} text-[#292524]`}>Welcome back, Administrator</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-[10px]">
            <TouchableOpacity onPress={() => setIsNotificationOpen(true)} className="w-10 h-10 rounded-full bg-[#f8fafb] items-center justify-center relative">
              <Ionicons name="notifications-outline" size={20} color="#292524" />
              <View className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#237227]" />
            </TouchableOpacity>
            <View className="w-9 h-9 rounded-full bg-[#237227] items-center justify-center border border-[#e5e7eb]">
              <Text className="text-[11px] font-bold text-[#f8fafb]">AD</Text>
            </View>
          </View>
        </View>

        {/* ── Page Body ──────────────────────────────────────────────────────── */}
        <View className={`${pageX} ${isWebView ? 'pt-6' : 'pt-4'} pb-10 w-full`}>

          {/* ── Main Card ──────────────────────────────────────────────────────── */}
          <View
            className={
              `bg-white w-full border border-[#e5e7eb] overflow-hidden ` +
              (isWebView ? 'rounded-[14px]' : 'rounded-xl')
            }
          >

            {/* Card Header */}
            <View className={`${cardX} ${cardY} border-b border-[#e5e7eb]`}>
              <View className={`flex-row items-center justify-between ${isWebView ? '' : 'mb-3'}`}>
                <View className={`flex-row items-center ${isWebView ? 'gap-[10px]' : 'gap-2'}`}>
                  <Ionicons name="time-outline" size={isWebView ? 18 : 16} color="#237227" />
                  <Text className={`${isWebView ? 'text-[15px]' : 'text-[14px]'} font-bold text-[#292524]`}>Recent Activity</Text>
                  <View className="px-2 py-[2px] rounded-full bg-[#e8f5e9] border border-[#f0f4f0]">
                    <Text className={`${isWebView ? 'text-[11px]' : 'text-[10px]'} font-semibold text-[#237227]`}>{filtered.length}</Text>
                  </View>
                </View>
                {isWebView && (
                  <TouchableOpacity onPress={handleExportLogs} className="flex-row items-center gap-[5px] px-[14px] h-[34px] bg-[#237227] rounded-lg">
                    <Ionicons name="download-outline" size={14} color="#ffffff" />
                    <Text className="text-[14px] font-semibold text-white">Export</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Search Bar */}
              <View className={`${isWebView ? 'flex-row items-center' : 'flex-col'} gap-[10px] ${isWebView ? 'mt-3' : ''}`}>
                <View className={`flex-1 flex-row items-center bg-[#f8fafb] border border-[#e5e7eb] rounded-lg px-[10px] ${isWebView ? 'h-[34px]' : 'h-[38px]'} gap-[6px]`}>
                  <Ionicons name="search-outline" size={14} color="#8fa88f" />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search logs…"
                    placeholderTextColor="#8fa88f"
                    className="flex-1 text-[13px] text-[#292524]"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={14} color="#8fa88f" />
                    </TouchableOpacity>
                  )}
                </View>
                {!isWebView && (
                  <TouchableOpacity onPress={handleExportLogs} className="flex-row items-center justify-center gap-[6px] py-[10px] bg-[#237227] rounded-lg">
                    <Ionicons name="download-outline" size={14} color="#ffffff" />
                    <Text className="text-[14px] font-semibold text-white">Export Logs</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Filter Tabs */}
            <View className="flex-row px-6 py-3 border-b border-[#f0f4f0] gap-[6px] flex-wrap bg-[#f8fafb]">
              {FILTER_TABS.map((tab) => {
                const isActive = activeFilter === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setActiveFilter(tab.key as any)}
                    className={
                      'flex-row items-center gap-[5px] px-3 py-[6px] rounded-lg border ' +
                      (isActive ? 'bg-[#e8f5e9] border-[#237227]' : 'bg-white border-[#e5e7eb]')
                    }
                  >
                    {tab.key !== 'all' && (
                      <Ionicons name={LOG_ICON[tab.key as LogType].icon as any} size={12} color={isActive ? '#237227' : '#8fa88f'} />
                    )}
                    <Text className={`text-[12px] ${isActive ? 'font-semibold text-[#237227]' : 'font-medium text-[#8fa88f]'}`}>{tab.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Activity List */}
            {filtered.length === 0 ? (
              <View className="items-center py-[60px] gap-3">
                <View className="w-[52px] h-[52px] rounded-[14px] bg-[#e8f5e9] items-center justify-center">
                  <Ionicons name="search-outline" size={24} color="#237227" />
                </View>
                <Text className="text-[14px] font-semibold text-[#292524]">No logs found</Text>
                <Text className="text-[12px] text-[#8fa88f]">Try adjusting your search or filter.</Text>
              </View>
            ) : (
              paginatedActivities.map((item, index) => (
                <ActivityRow key={item.id} item={item} isLast={index === paginatedActivities.length - 1} isMobile={!isWebView} />
              ))
            )}

            {/* Card Footer */}
            <View className="px-6 py-[14px] border-t border-[#f0f4f0] flex-row items-center justify-between bg-[#f8fafb]">
              <Text className="text-[12px] text-[#292524]">
                Showing {showingCount} of {filtered.length} entries
              </Text>
              <View className="flex-row gap-[6px]">
                <TouchableOpacity
                  onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className={
                    "w-[30px] h-[30px] rounded-[7px] border border-[#e5e7eb] bg-white items-center justify-center " +
                    (currentPage <= 1 ? 'opacity-50' : '')
                  }
                >
                  <Ionicons name={'chevron-back-outline' as any} size={14} color="#292524" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className={
                    "w-[30px] h-[30px] rounded-[7px] border border-[#e5e7eb] bg-white items-center justify-center " +
                    (currentPage >= totalPages ? 'opacity-50' : '')
                  }
                >
                  <Ionicons name={'chevron-forward-outline' as any} size={14} color="#292524" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Notification Modal ─────────────────────────────────────────────── */}
      <Modal visible={isNotificationOpen} transparent animationType="fade" onRequestClose={() => setIsNotificationOpen(false)}>
        <Pressable className="flex-1 bg-black/15 justify-start items-end pt-[60px] pr-5" onPress={() => setIsNotificationOpen(false)}>
          <View className="w-[300px] bg-white rounded-[14px] border border-[#e5e7eb] overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-[14px] border-b border-[#f0f4f0]">
              <Text className="text-[14px] font-bold text-[#292524]">Notifications</Text>
              <View className="px-2 py-[2px] rounded-full bg-[#e8f5e9]">
                <Text className="text-[10px] font-semibold text-[#237227]">3 new</Text>
              </View>
            </View>
            {[
              { icon: 'alert-circle-outline', text: 'Gate 3 motion trigger unacknowledged', time: '2 min ago' },
              { icon: 'person-add-outline',   text: 'New user John Doe was registered',     time: '1 hr ago'  },
              { icon: 'shield-outline',       text: 'Security audit completed',             time: 'Yesterday' },
            ].map((n, i) => (
              <View
                key={i}
                className={
                  `flex-row items-start gap-[10px] px-4 py-3 ` +
                  (i < 2 ? 'border-b border-[#f0f4f0]' : '')
                }
              >
                <View className="w-8 h-8 rounded-lg bg-[#e8f5e9] items-center justify-center">
                  <Ionicons name={n.icon as any} size={15} color="#237227" />
                </View>
                <View className="flex-1">
                  <Text className="text-[12px] text-[#292524] font-medium leading-4">{n.text}</Text>
                  <Text className="text-[11px] text-[#8fa88f] mt-0.5">{n.time}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={() => setIsNotificationOpen(false)} className="m-3 py-[9px] bg-[#237227] rounded-lg items-center">
              <Text className="text-[12px] font-semibold text-white">Mark all as read</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}