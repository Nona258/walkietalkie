import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
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

function buildAttendanceHtml(rows: AttendanceWithUserRow[]) {
  const generatedAt = new Date().toLocaleString();
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
					<td>${escapeHtml(formatCreatedAt(r.created_at))}</td>
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
				.meta { font-size: 12px; color: #6b7280; margin-bottom: 12px; }
				table { width: 100%; border-collapse: collapse; }
				th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; text-align: left; vertical-align: top; }
				th { background: #f9fafb; }
				.count { margin-top: 8px; font-size: 12px; color: #6b7280; }
			</style>
		</head>
		<body>
			<h1>Attendance Report</h1>
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

export default function EmployeeLogs({ onBack }: { onBack?: () => void }) {
  const [rows, setRows] = useState<AttendanceWithUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchRows = useCallback(async () => {
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('user_attendances')
        .select(
          'id, created_at, employee_start_time, employee_end_time, total_hours, status, users(full_name, role)'
        )
        .order('created_at', { ascending: false });

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
      await fetchRows();
      setLoading(false);
    })();
  }, [fetchRows]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRows();
    setRefreshing(false);
  }, [fetchRows]);

  const canExport = rows.length > 0 && !exporting;

  const exportToPdf = useCallback(async () => {
    if (!rows.length) return;
    setExporting(true);
    try {
      const html = buildAttendanceHtml(rows);

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
        // Browser print dialog allows "Save as PDF".
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

  const summary = useMemo(() => {
    const now = new Date().toLocaleString();
    return `${rows.length} records • Updated ${now}`;
  }, [rows.length]);

  return (
    <View className="flex-1 bg-stone-50">
      <ScrollView
        className="flex-1 bg-stone-50"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Header */}
        <View className="border-b border-stone-100 bg-white px-6 pb-4 pt-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              {onBack && (
                <TouchableOpacity
                  className="mr-3 h-9 w-9 items-center justify-center rounded-lg border border-stone-100 bg-stone-50"
                  onPress={onBack}
                  activeOpacity={0.8}>
                  <Ionicons name="arrow-back" size={18} color="#44403c" />
                </TouchableOpacity>
              )}
              <View>
                <Text className="text-xl font-bold tracking-tight text-stone-900">
                  Attendance Logs
                </Text>
                <Text className="mt-0.5 text-xs font-medium text-stone-400">{summary}</Text>
              </View>
            </View>

            <TouchableOpacity
              className={`flex-row items-center rounded-xl px-3 py-2 lg:px-4 lg:py-2.5 ${canExport ? 'bg-emerald-600' : 'bg-stone-300'}`}
              onPress={exportToPdf}
              disabled={!canExport}
              activeOpacity={0.8}>
              <Ionicons name="download-outline" size={18} color="white" />
              <Text className="ml-1 text-xs font-semibold text-white lg:text-sm">
                {exporting ? 'Exporting…' : 'Export PDF'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-6 pb-6 pt-4">
          {loading ? (
            <View className="items-center justify-center rounded-xl border border-stone-100 bg-white p-6">
              <ActivityIndicator size="small" color="#10b981" />
              <Text className="mt-3 text-sm text-stone-500">Loading attendance…</Text>
            </View>
          ) : error ? (
            <View className="rounded-xl border border-red-100 bg-red-50 p-6">
              <Text className="text-sm font-semibold text-red-600">Error: {error}</Text>
              <TouchableOpacity
                className="mt-4 flex-row items-center self-start rounded-lg bg-white px-3 py-2"
                onPress={fetchRows}
                activeOpacity={0.8}>
                <Ionicons name="refresh" size={16} color="#44403c" />
                <Text className="ml-2 text-sm font-medium text-stone-700">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : rows.length === 0 ? (
            <View className="items-center justify-center rounded-xl border border-stone-100 bg-white p-8">
              <View className="mb-3 h-12 w-12 items-center justify-center rounded-xl bg-stone-50">
                <Ionicons name="time-outline" size={22} color="#d6d3d1" />
              </View>
              <Text className="text-sm font-medium text-stone-500">No attendance found</Text>
            </View>
          ) : (
            <View className="gap-3">
              {rows.map((r) => (
                <View
                  key={String(r.id)}
                  className="rounded-xl border border-stone-100 bg-white p-4"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                  }}>
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-stone-900">
                        {r.users?.full_name || 'Unknown'}
                      </Text>
                      <Text className="mt-0.5 text-xs font-medium text-stone-400">
                        {(r.users?.role || '—').toString()} • {formatCreatedAt(r.created_at)}
                      </Text>
                    </View>
                    <View className="rounded-full bg-stone-100 px-2 py-1">
                      <Text className="text-[10px] font-semibold text-stone-600">
                        {(r.status || '—').toString()}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-3 flex-row flex-wrap gap-3">
                    <View className="min-w-[90px]">
                      <Text className="text-[11px] font-medium text-stone-400">Start</Text>
                      <Text className="text-sm font-semibold text-stone-800">
                        {timetzToDisplay(r.employee_start_time)}
                      </Text>
                    </View>
                    <View className="min-w-[90px]">
                      <Text className="text-[11px] font-medium text-stone-400">End</Text>
                      <Text className="text-sm font-semibold text-stone-800">
                        {timetzToDisplay(r.employee_end_time)}
                      </Text>
                    </View>
                    <View className="min-w-[90px]">
                      <Text className="text-[11px] font-medium text-stone-400">Total</Text>
                      <Text className="text-sm font-semibold text-stone-800">
                        {r.total_hours || '—'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}