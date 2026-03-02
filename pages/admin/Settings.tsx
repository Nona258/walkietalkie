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

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const COLORS = {
  green: '#237227',
  greenLight: '#237227',
  greenPale: '#e8f5e9',
  cloudMist: '#f8fafb',
  white: '#ffffff',
  border: '#e5e7eb',
  borderLight: '#f0f4f0',
  textPrimary: '#1a2e1b',
  textSecondary: '#4b6b4d',
  textMuted: '#8fa88f',
};

interface SettingsProps {
  onNavigate: (
    page:
      | 'dashboard'
      | 'siteManagement'
      | 'walkieTalkie'
      | 'activityLogs'
      | 'companyList'
      | 'employee'
      | 'settings'
  ) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

// ─── Labeled Input ────────────────────────────────────────────────────────────
function LabeledInput({
  label, value, onChangeText, editable, icon, placeholder, secureTextEntry,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  editable: boolean; icon: string; placeholder?: string; secureTextEntry?: boolean;
}) {
  return (
    <View style={{ gap: 5 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textSecondary }}>{label}</Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: editable ? COLORS.white : COLORS.cloudMist,
        borderWidth: 1, borderColor: editable ? COLORS.green : COLORS.border,
        borderRadius: 9, paddingHorizontal: 12, height: 40, gap: 8,
      }}>
        <Ionicons name={icon as any} size={14} color={editable ? COLORS.green : COLORS.textMuted} />
        <TextInput
          value={value} onChangeText={onChangeText} editable={editable}
          placeholder={placeholder} placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secureTextEntry}
          style={{ flex: 1, fontSize: 14, color: editable ? COLORS.textPrimary : COLORS.textMuted }}
        />
        {!editable && <Ionicons name="lock-closed-outline" size={12} color={COLORS.textMuted} />}
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Settings({ onNavigate, isMobileMenuOpen, setIsMobileMenuOpen }: SettingsProps) {
  const windowWidth = Dimensions.get('window').width;
  const isWebView = windowWidth > 900;
  
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const [fullName, setFullName] = useState('Admin User');
  const [email, setEmail] = useState('admin@company.com');
  const [phone, setPhone] = useState('+1 555-0100');
  const [role] = useState('Super Administrator');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const initials = fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const handleSave = () => {
    setIsEditMode(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.cloudMist }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* ── Top Header ─────────────────────────────────────────────────────── */}
        <View style={{ backgroundColor: COLORS.white, paddingHorizontal: isWebView ? 24 : 16, paddingTop: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
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
              <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 26 }}>Account Settings</Text>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 1 }}>Welcome back, Administrator</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={() => setIsNotificationOpen(true)} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.cloudMist, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border }}>
              <View style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: COLORS.white, zIndex: 1 }} />
              <Ionicons name="notifications-outline" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.green }}>{initials}</Text>
            </View>
          </View>
        </View>

        {/* ── Page Body — two-column, full width ───────────────────────────── */}
        <View style={{ padding: isWebView ? 24 : 16, width: '100%' }}>
          <View style={{ flexDirection: isWebView ? 'row' : 'column', gap: isWebView ? 20 : 16, alignItems: 'flex-start' }}>

            {/* ── LEFT COLUMN — Profile Card (fixed ~300) ───────────────────── */}
            <View style={{ width: isWebView ? 280 : '100%', flexShrink: 0 }}>
              <View style={{ backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: isWebView ? 24 : 16, alignItems: 'center' }}>

                {/* Avatar */}
                <View style={{ width: isWebView ? 72 : 64, height: isWebView ? 72 : 64, borderRadius: isWebView ? 18 : 16, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.green, marginBottom: 14 }}>
                  <Text style={{ fontSize: isWebView ? 24 : 20, fontWeight: '800', color: COLORS.green }}>{initials}</Text>
                </View>

                {/* Name */}
                <Text style={{ fontSize: isWebView ? 17 : 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3, textAlign: 'center' }}>{fullName}</Text>
                <Text style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 8, textAlign: 'center' }}>{email}</Text>

                {/* Role badge */}
                <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: COLORS.greenPale, borderWidth: 1, borderColor: COLORS.green, marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.green }}>{role}</Text>
                </View>

                {/* Divider */}
                <View style={{ width: '100%', height: 1, backgroundColor: COLORS.borderLight, marginBottom: 16 }} />

                {/* Meta rows */}
                {[
                  { icon: 'call-outline',    label: 'Phone',   value: phone },
                  { icon: 'shield-outline',  label: 'Role',    value: role  },
                  { icon: 'time-outline',    label: 'Member',  value: 'Since Jan 2024' },
                ].map((row) => (
                  <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', marginBottom: 10 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: COLORS.cloudMist, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={row.icon as any} size={13} color={COLORS.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, color: COLORS.textMuted }}>{row.label}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textSecondary }}>{row.value}</Text>
                    </View>
                  </View>
                ))}

                <View style={{ width: '100%', height: 1, backgroundColor: COLORS.borderLight, marginVertical: 16 }} />

                {/* Saved toast */}
                {isSaved && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.greenPale, borderWidth: 1, borderColor: COLORS.green, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14, width: '100%' }}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.green} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.green, flex: 1 }}>Profile updated!</Text>
                  </View>
                )}

                {/* Edit / Save / Cancel */}
                {!isEditMode ? (
                  <TouchableOpacity onPress={() => setIsEditMode(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 9, backgroundColor: COLORS.green, borderRadius: 9, width: '100%', justifyContent: 'center' }}>
                    <Ionicons name="create-outline" size={15} color={COLORS.white} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.white }}>Edit Profile</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ gap: 8, width: '100%' }}>
                    <TouchableOpacity onPress={handleSave} style={{ height: 38, borderRadius: 9, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 }}>
                      <Ionicons name="checkmark-outline" size={14} color={COLORS.white} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.white }}>Save Changes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleCancel} style={{ height: 38, borderRadius: 9, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cloudMist, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textSecondary }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* ── RIGHT COLUMN — Info / Security / Preferences (flex: 1) ─────── */}
            <View style={{ flex: 1, gap: 16, width: isWebView ? undefined : '100%' }}>

              {/* Profile Information */}
              <View style={{ backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: isWebView ? 24 : 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person-outline" size={15} color={COLORS.green} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }}>Profile Information</Text>
                </View>
                <View style={{ gap: 14 }}>
                  <LabeledInput label="Full Name"     value={fullName} onChangeText={setFullName} editable={isEditMode} icon="person-outline"  placeholder="Enter full name" />
                  <LabeledInput label="Email Address" value={email}    onChangeText={setEmail}    editable={isEditMode} icon="mail-outline"    placeholder="Enter email"     />
                  <LabeledInput label="Phone Number"  value={phone}    onChangeText={setPhone}    editable={isEditMode} icon="call-outline"    placeholder="Enter phone"     />
                  {/* Read-only role */}
                  <View style={{ gap: 5 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textSecondary }}>Role</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cloudMist, borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, paddingHorizontal: 12, height: 40, gap: 8 }}>
                      <Ionicons name="shield-outline" size={14} color={COLORS.textMuted} />
                      <Text style={{ flex: 1, fontSize: 14, color: COLORS.textMuted }}>{role}</Text>
                      <Ionicons name="lock-closed-outline" size={12} color={COLORS.textMuted} />
                    </View>
                  </View>
                </View>
              </View>

              {/* Security */}
              <View style={{ backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: isWebView ? 24 : 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="lock-closed-outline" size={15} color={COLORS.green} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }}>Security</Text>
                </View>
                <View style={{ gap: 14 }}>
                  <LabeledInput label="Current Password" value={currentPassword} onChangeText={setCurrentPassword} editable={isEditMode} icon="key-outline"              placeholder={isEditMode ? 'Enter current password' : '••••••••'} secureTextEntry={isEditMode} />
                  <LabeledInput label="New Password"     value={newPassword}     onChangeText={setNewPassword}     editable={isEditMode} icon="lock-open-outline"         placeholder={isEditMode ? 'Enter new password'     : '••••••••'} secureTextEntry={isEditMode} />
                  <LabeledInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} editable={isEditMode} icon="checkmark-circle-outline"  placeholder={isEditMode ? 'Confirm new password'   : '••••••••'} secureTextEntry={isEditMode} />
                </View>
              </View>

              {/* Preferences */}
              <View style={{ backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: isWebView ? 24 : 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="settings-outline" size={15} color={COLORS.green} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }}>Preferences</Text>
                </View>
                {[
                  { icon: 'notifications-outline', label: 'Email Notifications', desc: 'Receive alerts and updates via email',     value: true  },
                  { icon: 'phone-portrait-outline', label: 'Push Notifications', desc: 'Get real-time push alerts on your device', value: true  },
                  { icon: 'moon-outline',           label: 'Dark Mode',          desc: 'Switch interface to dark theme',           value: false },
                  { icon: 'globe-outline',          label: 'Activity Digest',    desc: 'Weekly summary of system activity',        value: false },
                ].map((pref, i, arr) => (
                  <View key={pref.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: COLORS.borderLight }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: COLORS.cloudMist, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={pref.icon as any} size={15} color={COLORS.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{pref.label}</Text>
                        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 1 }}>{pref.desc}</Text>
                      </View>
                    </View>
                    <View style={{ width: 38, height: 22, borderRadius: 11, backgroundColor: pref.value ? COLORS.green : COLORS.border, justifyContent: 'center', paddingHorizontal: 3, alignItems: pref.value ? 'flex-end' : 'flex-start' }}>
                      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.white }} />
                    </View>
                  </View>
                ))}
              </View>

            </View>
            {/* END right column */}

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
                <Text style={{ fontSize: 10, fontWeight: '600', color: COLORS.green }}>1 new</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingVertical: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.greenPale, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="settings-outline" size={15} color={COLORS.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: COLORS.textPrimary, fontWeight: '500', lineHeight: 16 }}>Your account settings were updated</Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>Just now</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setIsNotificationOpen(false)} style={{ margin: 12, paddingVertical: 9, backgroundColor: COLORS.green, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.white }}>Mark all as read</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}