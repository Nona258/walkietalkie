import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const COLORS = {
  green: '#237227',
  greenLight: '#237227',
  greenPale: '#e8f5e9',
  cloudMist: '#f8fafb',
  white: '#ffffff',
  border: '#e5e7eb',
  borderLight: '#f0f4f0',
  textPrimary: '#292524',
  textSecondary: '#292524',
  textMuted: '#8fa88f',
  iconBg: '#e8f5e9',
};

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
  { key: 'alert',    label: 'Alert'    },
];

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
  return (
    <View style={{ width: size + 20, height: size + 20, borderRadius: 10, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.borderLight }}>
      <Ionicons name={icon as any} size={size} color={COLORS.green} />
    </View>
  );
}

function UserChip({ initials, name }: { initials: string; name: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border }}>
        <Text style={{ fontSize: 9, fontWeight: '700', color: COLORS.green }}>{initials}</Text>
      </View>
      <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' }}>{name}</Text>
    </View>
  );
}

function ActivityRow({ item, isLast, isMobile }: { item: Activity; isLast: boolean; isMobile: boolean }) {
  if (isMobile) {
    return (
      <View style={{ paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: COLORS.borderLight, backgroundColor: COLORS.white }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
          <View style={{ marginRight: 10 }}>
            <LogIconBadge type={item.type} size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 }}>{item.action}</Text>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{item.description}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <UserChip initials={item.userInitials} name={item.user} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cloudMist }}>
              <Ionicons name={LOG_ICON[item.type].icon as any} size={9} color={COLORS.textMuted} />
              <Text style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: '500' }}>{LOG_ICON[item.type].label}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textSecondary }}>{item.timeAgo}</Text>
            <Text style={{ fontSize: 10, color: COLORS.textMuted }}>{item.timestamp}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 16, paddingHorizontal: 24, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: COLORS.borderLight, backgroundColor: COLORS.white }}>
      <View style={{ marginRight: 14, paddingTop: 2 }}>
        <LogIconBadge type={item.type} size={18} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{item.action}</Text>
        <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{item.description}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 }}>
          <UserChip initials={item.userInitials} name={item.user} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cloudMist }}>
            <Ionicons name={LOG_ICON[item.type].icon as any} size={10} color={COLORS.textMuted} />
            <Text style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: '500' }}>{LOG_ICON[item.type].label}</Text>
          </View>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', minWidth: 110, gap: 4, paddingTop: 2 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textSecondary }}>{item.timeAgo}</Text>
        <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{item.timestamp}</Text>
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
  const [activeFilter, setActiveFilter] = useState<'all' | LogType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  const windowWidth = Dimensions.get('window').width;
  const isWebView = windowWidth > 900;

  const filtered = MOCK_ACTIVITIES.filter((a) => {
    const matchesFilter = activeFilter === 'all' || a.type === activeFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || a.action.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.user.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.cloudMist }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* ── Top Header ─────────────────────────────────────────────────────── */}
        <View style={{ backgroundColor: COLORS.white, paddingHorizontal: isWebView ? 24 : 16, paddingTop: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Left: Title with hamburger on mobile */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {!isWebView && setIsMobileMenuOpen && (
              <TouchableOpacity 
                onPress={() => setIsMobileMenuOpen(true)}
                style={{ 
                  marginRight: 12,
                  width: 40,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Ionicons name="menu" size={28} color={COLORS.green} />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: isWebView ? 30 : 20, fontWeight: '300', color: COLORS.textPrimary, lineHeight: 26, marginBottom: 4 }}>Activity Logs</Text>
              <Text style={{ fontSize: isWebView ? 16 : 12, color: COLORS.textPrimary }}>Welcome back, Administrator</Text>
            </View>
          </View>

          {/* Right: Notification + Avatar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={() => setIsNotificationOpen(true)} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.cloudMist, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border }}>
              <View style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: COLORS.white, zIndex: 1 }} />
              <Ionicons name="notifications-outline" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.green }}>AD</Text>
            </View>
          </View>
        </View>

        {/* ── Page Body ─────────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: isWebView ? 24 : 16, paddingTop: isWebView ? 24 : 16, paddingBottom: 40, width: '100%' }}>

          {/* Stats Row */}
          <View style={{ flexDirection: 'row', gap: isWebView ? 12 : 8, marginBottom: isWebView ? 20 : 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Events', value: '1,284', icon: 'list-outline'        },
              { label: 'Today',        value: '38',    icon: 'today-outline'        },
              { label: 'Alerts',       value: '5',     icon: 'alert-circle-outline' },
              { label: 'Active Users', value: '12',    icon: 'people-outline'       },
            ].map((stat) => (
              <View 
                key={stat.label} 
                style={{ 
                  flex: isWebView ? 1 : undefined,
                  width: isWebView ? undefined : '48%',
                  minWidth: isWebView ? 140 : undefined,
                  backgroundColor: COLORS.greenPale, 
                  borderRadius: isWebView ? 12 : 10, 
                  borderWidth: 1, 
                  borderColor: COLORS.border, 
                  padding: isWebView ? 16 : 12, 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: isWebView ? 12 : 10 
                }}
              >
                <View style={{ width: isWebView ? 38 : 34, height: isWebView ? 38 : 34, borderRadius: isWebView ? 10 : 8, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.borderLight }}>
                  <Ionicons name={stat.icon as any} size={isWebView ? 18 : 16} color={COLORS.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: isWebView ? 20 : 18, fontWeight: '700', color: COLORS.textPrimary }}>{stat.value}</Text>
                  <Text style={{ fontSize: isWebView ? 11 : 10, color: COLORS.textMuted, marginTop: 1 }}>{stat.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Main Card ─────────────────────────────────────────────────────── */}
          <View style={{ backgroundColor: COLORS.white, borderRadius: isWebView ? 14 : 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', width: '100%' }}>

            {/* Card Header */}
            <View style={{ paddingHorizontal: isWebView ? 24 : 16, paddingVertical: isWebView ? 16 : 14, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: isWebView ? 0 : 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: isWebView ? 10 : 8 }}>
                  <Ionicons name="time-outline" size={isWebView ? 18 : 16} color={COLORS.green} />
                  <Text style={{ fontSize: isWebView ? 15 : 14, fontWeight: '700', color: COLORS.textPrimary }}>Recent Activity</Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: COLORS.greenPale, borderWidth: 1, borderColor: COLORS.borderLight }}>
                    <Text style={{ fontSize: isWebView ? 11 : 10, fontWeight: '600', color: COLORS.green }}>{filtered.length}</Text>
                  </View>
                </View>
                {isWebView && (
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, height: 34, backgroundColor: COLORS.green, borderRadius: 8 }}>
                    <Ionicons name="download-outline" size={14} color={COLORS.white} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.white }}>Export</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Search Bar - Full width on mobile, inline on desktop */}
              <View style={{ flexDirection: isWebView ? 'row' : 'column', alignItems: isWebView ? 'center' : 'stretch', gap: 10, marginTop: isWebView ? 12 : 0 }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cloudMist, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, height: isWebView ? 34 : 38, gap: 6 }}>
                  <Ionicons name="search-outline" size={14} color={COLORS.textMuted} />
                  <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search logs…" placeholderTextColor={COLORS.textMuted} style={{ flex: 1, fontSize: 13, color: COLORS.textPrimary }} />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={14} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                {!isWebView && (
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: COLORS.green, borderRadius: 8 }}>
                    <Ionicons name="download-outline" size={14} color={COLORS.white} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.white }}>Export Logs</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Filter Tabs */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, gap: 6, flexWrap: 'wrap', backgroundColor: COLORS.cloudMist }}>
              {FILTER_TABS.map((tab) => {
                const isActive = activeFilter === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setActiveFilter(tab.key as any)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, backgroundColor: isActive ? COLORS.greenPale : COLORS.white, borderColor: isActive ? COLORS.green : COLORS.border }}
                  >
                    {tab.key !== 'all' && (
                      <Ionicons name={LOG_ICON[tab.key as LogType].icon as any} size={12} color={isActive ? COLORS.green : COLORS.textMuted} />
                    )}
                    <Text style={{ fontSize: 12, fontWeight: isActive ? '600' : '500', color: isActive ? COLORS.green : COLORS.textMuted }}>{tab.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Activity List */}
            {filtered.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
                <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="search-outline" size={24} color={COLORS.green} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>No logs found</Text>
                <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Try adjusting your search or filter.</Text>
              </View>
            ) : (
              filtered.map((item, index) => (
                <ActivityRow key={item.id} item={item} isLast={index === filtered.length - 1} isMobile={false} />
              ))
            )}

            {/* Card Footer */}
            <View style={{ paddingHorizontal: 24, paddingVertical: 14, borderTopWidth: 1, borderTopColor: COLORS.borderLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.cloudMist }}>
              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                Showing {filtered.length} of {MOCK_ACTIVITIES.length} entries
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {['chevron-back-outline', 'chevron-forward-outline'].map((icon) => (
                  <TouchableOpacity key={icon} style={{ width: 30, height: 30, borderRadius: 7, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={icon as any} size={14} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Notification Modal ──────────────────────────────────────────────── */}
      <Modal visible={isNotificationOpen} transparent animationType="fade" onRequestClose={() => setIsNotificationOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 60, paddingRight: 20 }} onPress={() => setIsNotificationOpen(false)}>
          <View style={{ width: 300, backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }}>Notifications</Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: COLORS.greenPale }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: COLORS.green }}>3 new</Text>
              </View>
            </View>
            {[
              { icon: 'alert-circle-outline', text: 'Gate 3 motion trigger unacknowledged', time: '2 min ago' },
              { icon: 'person-add-outline',   text: 'New user John Doe was registered',     time: '1 hr ago'  },
              { icon: 'shield-outline',       text: 'Security audit completed',             time: 'Yesterday' },
            ].map((n, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: COLORS.borderLight }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={n.icon as any} size={15} color={COLORS.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: COLORS.textPrimary, fontWeight: '500', lineHeight: 16 }}>{n.text}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{n.time}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={() => setIsNotificationOpen(false)} style={{ margin: 12, paddingVertical: 9, backgroundColor: COLORS.green, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.white }}>Mark all as read</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}