import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../utils/supabase';
import '../../global.css';

type AttendanceWithUserRow = {
  id: number;
  created_at: string;
  employee_start_time: string | null;
  employee_end_time: string | null;
  total_hours: string | null;
  status: string | null;
  users: { full_name: string | null; role: string | null } | null;
};

type FilterType = 'all' | 'today' | 'week' | 'month';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function timetzToDisplay(t: string | null | undefined) {
  if (!t) return '--:--';
  const m = String(t).match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return '--:--';
  const hours24 = Number(m[1]);
  const minutes = Number(m[2]);
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${pad2(hours12)}:${pad2(minutes)} ${ampm}`;
}

function formatCreatedAt(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleDateString();
}

function formatCreatedAtFull(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function escapeHtml(input: unknown) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildAttendanceHtml(rows: AttendanceWithUserRow[], filterType: FilterType = 'all') {
  const generatedAt = new Date().toLocaleString();
  const filterLabel = filterType === 'all' ? 'All Records' : filterType === 'today' ? 'Today' : filterType === 'week' ? 'This Week' : 'This Month';
  const bodyRows = (rows || [])
    .map((r) => {
      const fullName = r.users?.full_name || 'Unknown';
      const role = r.users?.role || '—';
      const start = timetzToDisplay(r.employee_start_time);
      const end = timetzToDisplay(r.employee_end_time);
      const total = r.total_hours || '—';
      const status = r.status || '—';

      return `
				<tr>
					<td>${escapeHtml(formatCreatedAtFull(r.created_at))}</td>
					<td>${escapeHtml(fullName)}</td>
					<td>${escapeHtml(role)}</td>
					<td>${escapeHtml(start)}</td>
					<td>${escapeHtml(end)}</td>
					<td>${escapeHtml(total)}</td>
					<td>${escapeHtml(status)}</td>
				</tr>
			`;
    })
    .join('');

  return `
	<!doctype html>
	<html>
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<title>Attendance Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 16px; color: #111827; }
        h1 { font-size: 18px; margin: 0 0 8px; }
        .filter-info { font-size: 14px; color: #237227; font-weight: 600; margin-bottom: 8px; }
        .meta { font-size: 12px; color: #6b7280; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; text-align: left; vertical-align: top; }
        th { background: #f9fafb; }
        .count { margin-top: 8px; font-size: 12px; color: #6b7280; }
      </style>
		</head>
		<body>
			<h1>Attendance Report</h1>
      <div class="filter-info">Filter: ${escapeHtml(filterLabel)}</div>
      <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Full Name</th>
						<th>Role</th>
						<th>Start</th>
						<th>End</th>
						<th>Total</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					${bodyRows}
				</tbody>
			</table>
			<div class="count">Rows: ${rows?.length ?? 0}</div>
		</body>
	</html>
	`;
}

function EmployeeAvatar({ name }: { name: string }) {
  const initials =
    name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  return (
    <View className="w-8 h-8 rounded-full bg-[#237227] items-center justify-center border border-[#f0f4f0]">
      <Text className="text-[11px] font-bold text-[#f8fafb]">{initials}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const statusLower = (status || '').toLowerCase();
  const isPresent = statusLower === 'present';
  const isLate = statusLower === 'late';
  const isAbsent = statusLower === 'absent';

  return (
    <View
      className={
        `flex-row items-center gap-[5px] px-2 py-[3px] rounded-full border self-start ` +
        (isPresent
          ? 'bg-[#e8f5e9] border-[#237227]'
          : isLate
            ? 'bg-[#fef3c7] border-[#fbbf24]'
            : isAbsent
              ? 'bg-[#fef2f2] border-[#fca5a5]'
              : 'bg-[#f3f4f6] border-[#e5e7eb]')
      }
    >
      <View
        className={`w-[6px] h-[6px] rounded-full ${
          isPresent
            ? 'bg-[#237227]'
            : isLate
              ? 'bg-[#d97706]'
              : isAbsent
                ? 'bg-[#ef4444]'
                : 'bg-[#8fa88f]'
        }`}
      />
      <Text
        className={`text-[10px] font-semibold ${
          isPresent
            ? 'text-[#237227]'
            : isLate
              ? 'text-[#d97706]'
              : isAbsent
                ? 'text-[#ef4444]'
                : 'text-[#8fa88f]'
        }`}
      >
        {status || '—'}
      </Text>
    </View>
  );
}

function ColHeader({ label, className }: { label: string; className?: string }) {
  return (
    <View className={className}>
      <Text className="text-[11px] font-semibold text-[#8fa88f] uppercase tracking-[0.5px]">
        {label}
      </Text>
    </View>
  );
}

export default function EmployeeLogs({
  onBack,
  setIsDrawerOpen,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}: {
  onBack?: () => void;
  setIsDrawerOpen?: (open: boolean) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}) {
  const PAGE_SIZE = 10;

  const windowWidth = Dimensions.get('window').width;
  const isWebView = windowWidth > 900;
  const pageX = isWebView ? 'px-6' : 'px-4';
  const titleSize = isWebView ? 'text-[30px]' : 'text-[20px]';
  const subtitleSize = isWebView ? 'text-[16px]' : 'text-[12px]';

  const [rows, setRows] = useState<AttendanceWithUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchRows = useCallback(async (filter: FilterType = 'all') => {
    setError(null);
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let start: Date | null = null;
      let end: Date | null = null;

      if (filter === 'today') {
        start = new Date(today);
        end = new Date(today.getTime() + 86400000);
      } else if (filter === 'week') {
        start = new Date(today);
        start.setDate(start.getDate() - start.getDay());
        end = new Date(today.getTime() + 86400000);
      } else if (filter === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }

      let q: any = supabase
        .from('user_attendances')
        .select('id, created_at, employee_start_time, employee_end_time, total_hours, status, users(full_name, role)')
        .order('created_at', { ascending: false });

      if (start && end) {
        q = q.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
      }

      const { data, error: fetchError } = await q;

      if (fetchError) throw fetchError;
      setRows((data as any) || []);
    } catch (e: any) {
      console.error('EmployeeLogs fetch error:', e);
      setError(e?.message || 'Failed to fetch attendance');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchRows(filterType);
      setLoading(false);
    })();
  }, [fetchRows, filterType]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRows(filterType);
    setRefreshing(false);
  }, [fetchRows, filterType]);

  const canExport = rows.length > 0 && !exporting;

  const exportToPdf = useCallback(async () => {
    const exportRows = rows.filter(
      (r) =>
        r.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.users?.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formatCreatedAt(r.created_at).toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!exportRows.length) return;
    setExporting(true);
    try {
      const html = buildAttendanceHtml(exportRows, filterType);

      if (Platform.OS === 'web') {
        const w = window.open('', '_blank');
        if (!w) {
          Alert.alert('Popup blocked', 'Please allow popups to export the PDF.');
          return;
        }
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
        w.print();
        return;
      }

      const Print = require('expo-print') as typeof import('expo-print');
      const Sharing = require('expo-sharing') as typeof import('expo-sharing');

      const { uri } = await Print.printToFileAsync({ html });
      const shareAvailable = await Sharing.isAvailableAsync();
      if (!shareAvailable) {
        Alert.alert('Not available', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      });
    } catch (e: any) {
      console.error('EmployeeLogs export error:', e);
      Alert.alert('Export failed', e?.message || 'Unable to export attendance PDF.');
    } finally {
      setExporting(false);
    }
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return rows.filter(
      (r) =>
        r.users?.full_name?.toLowerCase().includes(query) ||
        r.users?.role?.toLowerCase().includes(query) ||
        r.status?.toLowerCase().includes(query) ||
        formatCreatedAt(r.created_at).toLowerCase().includes(query)
    );
  }, [rows, searchQuery]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  }, [filteredRows.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(p, 1), totalPages));
  }, [totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  const showingCount = useMemo(() => {
    if (filteredRows.length === 0) return 0;
    const end = currentPage * PAGE_SIZE;
    return Math.min(end, filteredRows.length);
  }, [filteredRows.length, currentPage]);

  const summary = useMemo(() => {
    const now = new Date().toLocaleString();
    return `${rows.length} records • Updated ${now}`;
  }, [rows.length]);

  const displayCurrent = filteredRows.length ? currentPage : 0;
  const displayTotal = filteredRows.length ? totalPages : 0;

  return (
    <View className="flex-1 bg-[#f8fafb]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── Top Header ───────────────────────────────────────────────────── */}
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
                <Text className="text-base font-bold text-stone-900 lg:text-2xl">
                  Attendance Logs
                </Text>
                <Text className="mt-0.5 text-[11px] text-stone-500 lg:text-sm">{summary}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Page Body — full width, no maxWidth cap ─────────────────────── */}
        <View className="w-full px-3 pt-3 pb-12 lg:px-8 lg:pt-6">
          {/* ── Table — stretches full width ─────────────────────────────── */}
          <View className="bg-white rounded-[14px] border border-[#e5e7eb] overflow-hidden w-full shadow-sm">
            {/* Toolbar */}
            <View className={`${isWebView ? 'px-5' : 'px-3'} py-3 border-b border-[#e5e7eb] gap-3`}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-[10px] flex-1">
                  <Ionicons name="time-outline" size={16} color="#237227" />
                  <Text className="text-[13px] lg:text-[14px] font-bold text-[#1a2e1b]">All Records</Text>
                  <View className="px-2 py-[2px] rounded-full bg-[#e8f5e9] border border-[#f0f4f0]">
                    <Text className="text-[11px] font-semibold text-[#237227]">{filteredRows.length}</Text>
                  </View>
                </View>
                {isWebView && (
                  <TouchableOpacity
                    onPress={exportToPdf}
                    disabled={!canExport}
                    className={`flex-row items-center gap-2 px-4 py-2 rounded-lg ${
                      canExport ? 'bg-[#237227]' : 'bg-[#d6d3d1]'
                    }`}
                  >
                    <Ionicons name="download-outline" size={16} color="#ffffff" />
                    <Text className="text-[13px] font-semibold text-white">Export PDF</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Search and Export Row */}
              <View className="flex-row items-center gap-2">
                {/* Search Input */}
                <View className="flex-1 flex-row items-center bg-[#f8fafb] border border-[#e5e7eb] rounded-lg px-3 py-2">
                  <Ionicons name="search-outline" size={16} color="#8fa88f" />
                  <TextInput
                    placeholder="Search by name, role, status..."
                    placeholderTextColor="#8fa88f"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="flex-1 ml-2 text-[13px] text-[#1a2e1b] outline-none"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={16} color="#8fa88f" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Filter Buttons */}
            <View className="px-4 py-3">
              {isWebView ? (
                <View className="flex-row gap-3 mb-3">
                  {(['all', 'today', 'week', 'month'] as const).map((f) => (
                    <TouchableOpacity
                      key={f}
                      className={`rounded-lg px-4 py-2 ${
                        filterType === f ? 'bg-[#237227]' : 'border border-[#e5e7eb] bg-white'
                      }`}
                      onPress={() => {
                        setFilterType(f);
                        setCurrentPage(1);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text className={`text-sm font-medium ${filterType === f ? 'text-white' : 'text-[#374151]'}`}>
                        {f === 'all' ? 'All' : f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 4 }}
                  className="mb-3"
                >
                  <View className="flex-row gap-3">
                    {(['all', 'today', 'week', 'month'] as const).map((f) => (
                      <TouchableOpacity
                        key={f}
                        className={`rounded-lg px-4 py-2 ${
                          filterType === f ? 'bg-[#237227]' : 'border border-[#e5e7eb] bg-white'
                        }`}
                        onPress={() => {
                          setFilterType(f);
                          setCurrentPage(1);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text className={`text-sm font-medium ${filterType === f ? 'text-white' : 'text-[#374151]'}`}>
                          {f === 'all' ? 'All' : f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>

            {/* Loading / Error / Empty */}
            {loading ? (
              <View className="items-center py-[60px] gap-[10px]">
                <ActivityIndicator size="large" color="#237227" />
                <Text className="text-[14px] text-[#8fa88f]">Loading attendance logs...</Text>
              </View>
            ) : error ? (
              <View className="items-center py-[60px] gap-[10px]">
                <View className="w-12 h-12 rounded-[12px] bg-[#fef2f2] items-center justify-center">
                  <Ionicons name="alert-circle-outline" size={22} color="#ef4444" />
                </View>
                <Text className="text-[14px] font-semibold text-[#1a2e1b]">Error loading data</Text>
                <Text className="text-[12px] text-[#8fa88f]">{error}</Text>
              </View>
            ) : filteredRows.length === 0 ? (
              <View className="items-center py-[60px] gap-[10px]">
                <View className="w-12 h-12 rounded-[12px] bg-[#237227] items-center justify-center">
                  <Ionicons name="time-outline" size={22} color="#f8f4fb" />
                </View>
                <Text className="text-[14px] font-semibold text-[#1a2e1b]">No attendance logs found</Text>
                <Text className="text-[12px] text-[#8fa88f]">
                  {searchQuery ? 'Try a different search term.' : 'No records available yet.'}
                </Text>
              </View>
            ) : (
              <>
                {/* Column Headers (Desktop only) */}
                {isWebView && (
                  <View className="flex-row items-center px-5 py-[10px] bg-[#f8fafb] border-b border-[#e5e7eb]">
                    <ColHeader label="Date" className="flex-[2]" />
                    <ColHeader label="Employee" className="flex-[3]" />
                    <ColHeader label="Role" className="flex-[2]" />
                    <ColHeader label="Start Time" className="flex-[2]" />
                    <ColHeader label="End Time" className="flex-[2]" />
                    <ColHeader label="Total Hours" className="flex-[2]" />
                    <ColHeader label="Status" className="flex-1" />
                  </View>
                )}

                {/* Rows */}
                {isWebView
                  ? paginatedRows.map((r, index) => (
                      <View
                        key={String(r.id)}
                        className={
                          `flex-row items-center px-5 py-[13px] bg-white ` +
                          (index === paginatedRows.length - 1 ? '' : 'border-b border-[#f0f4f0]')
                        }
                      >
                        <View className="flex-[2]">
                          <Text className="text-[12px] text-black">{formatCreatedAt(r.created_at)}</Text>
                        </View>
                        <View className="flex-[3] flex-row items-center gap-[10px]">
                          <EmployeeAvatar name={r.users?.full_name || 'Unknown'} />
                          <Text className="text-[13px] font-semibold text-[#1a2e1b]">
                            {r.users?.full_name || 'Unknown'}
                          </Text>
                        </View>
                        <View className="flex-[2]">
                          <Text className="text-[12px] text-black">{r.users?.role || 'N/A'}</Text>
                        </View>
                        <View className="flex-[2]">
                          <Text className="text-[12px] text-black">{timetzToDisplay(r.employee_start_time)}</Text>
                        </View>
                        <View className="flex-[2]">
                          <Text className="text-[12px] text-black">{timetzToDisplay(r.employee_end_time)}</Text>
                        </View>
                        <View className="flex-[2]">
                          <Text className="text-[12px] text-black">{r.total_hours || '—'}</Text>
                        </View>
                        <View className="flex-1">
                          <StatusPill status={r.status || '—'} />
                        </View>
                      </View>
                    ))
                  : paginatedRows.map((r, index) => (
                      <View
                        key={String(r.id)}
                        className={
                          `p-3 bg-white ` +
                          (index === paginatedRows.length - 1 ? '' : 'border-b border-[#f0f4f0]')
                        }
                      >
                        <View className="flex-row items-start gap-2.5">
                          <EmployeeAvatar name={r.users?.full_name || 'Unknown'} />
                          <View className="flex-1 gap-1.5">
                            <View className="flex-row items-start justify-between gap-2">
                              <View className="flex-1 min-w-0">
                                <Text className="text-[13px] font-semibold text-[#1a2e1b]" numberOfLines={1}>
                                  {r.users?.full_name || 'Unknown'}
                                </Text>
                                <Text className="text-[12px] text-[#6b7280] mt-0.5">{r.users?.role || 'N/A'}</Text>
                              </View>
                              <StatusPill status={r.status || '—'} />
                            </View>
                            <View className="gap-1.5 mt-1">
                              <View className="flex-row items-center gap-[6px]">
                                <Ionicons name="calendar-outline" size={12} color="#8fa88f" />
                                <Text className="text-[12px] text-[#374151] flex-1">
                                  {formatCreatedAt(r.created_at)}
                                </Text>
                              </View>
                              <View className="flex-row items-center gap-[6px]">
                                <Ionicons name="time-outline" size={12} color="#8fa88f" />
                                <Text className="text-[12px] text-[#374151] flex-1" numberOfLines={1}>
                                  {timetzToDisplay(r.employee_start_time)} - {timetzToDisplay(r.employee_end_time)}
                                </Text>
                              </View>
                              <View className="flex-row items-center gap-[6px]">
                                <Ionicons name="hourglass-outline" size={12} color="#8fa88f" />
                                <Text className="text-[12px] text-[#374151]">{r.total_hours || '—'} hours</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
              </>
            )}

            {/* Table Footer (desktop and mobile responsive) */}
            {!loading && !error && (
              isWebView ? (
                <View className="flex-row items-center justify-between px-4 py-3 border-t border-stone-200 bg-stone-50">
                  <Text className="text-sm text-stone-600">Showing {showingCount} of {filteredRows.length} attendance records</Text>

                  <View className="flex-row gap-[6px]">
                    <TouchableOpacity
                      onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={filteredRows.length === 0 || currentPage <= 1}
                      className={
                        "w-8 h-8 rounded-[7px] border border-[#e5e7eb] bg-white items-center justify-center " +
                        (filteredRows.length === 0 || currentPage <= 1 ? 'opacity-50' : '')
                      }
                    >
                      <Ionicons name={'chevron-back-outline' as any} size={14} color="#4b6b4d" />
                    </TouchableOpacity>

                    <View className="px-3 h-8 rounded-lg  border border-[#237227] items-center justify-center min-w-[60px]">
                      <Text className="text-[11px] font-semibold text-stone-900">
                        {displayCurrent} / {displayTotal}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={filteredRows.length === 0 || currentPage >= totalPages}
                      className={
                        "w-8 h-8 rounded-[7px] border border-[#e5e7eb] bg-white items-center justify-center " +
                        (filteredRows.length === 0 || currentPage >= totalPages ? 'opacity-50' : '')
                      }
                    >
                      <Ionicons name={'chevron-forward-outline' as any} size={14} color="#4b6b4d" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View className="px-4 py-3 border-t border-stone-200 bg-stone-50">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-stone-600">Showing {showingCount} of {filteredRows.length} attendance records</Text>

                    <View className="flex-row gap-[6px] items-center">
                      <TouchableOpacity
                        onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={filteredRows.length === 0 || currentPage <= 1}
                        className={
                          "w-8 h-8 rounded-[7px] border border-[#e5e7eb] bg-white items-center justify-center " +
                          (filteredRows.length === 0 || currentPage <= 1 ? 'opacity-50' : '')
                        }
                      >
                        <Ionicons name={'chevron-back-outline' as any} size={14} color="#4b6b4d" />
                      </TouchableOpacity>

                      <View className="px-3 h-8 rounded-lg border border-[#237227] items-center justify-center min-w-[60px]">
                        <Text className="text-[11px] font-semibold text-stone-900">
                          {displayCurrent} / {displayTotal}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={filteredRows.length === 0 || currentPage >= totalPages}
                        className={
                          "w-8 h-8 rounded-[7px] border border-[#e5e7eb] bg-white items-center justify-center " +
                          (filteredRows.length === 0 || currentPage >= totalPages ? 'opacity-50' : '')
                        }
                      >
                        <Ionicons name={'chevron-forward-outline' as any} size={14} color="#4b6b4d" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}