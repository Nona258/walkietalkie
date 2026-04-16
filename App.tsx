import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/employee/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import Contacts from './pages/employee/Contacts';
import Sites from './pages/employee/Sites';
import Map from './pages/employee/Map';
import Logs from './pages/employee/Logs';
import Settings from './pages/employee/Settings';
import EditProfile from './pages/employee/EditProfile';
import ChangePassword from './pages/employee/ChangePassword';
import Navbar from './components/Navbar';
import TechnicalSupport from 'pages/admin/TechnicalSupport';
import LiveLocationTracker from './components/LiveLocationTracker';
import supabase, { getOrCreateConversation } from './utils/supabase';
import { hasAcceptedEula, signOutUser } from './utils/eula';
import SweetAlertModal from './components/SweetAlertModal';

import './global.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState<
    'signin' | 'signup' | 'forgot-password' | 'dashboard'
  >('signin');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('employee');
  const [loading, setLoading] = useState(true);
  const [isInSignupFlow, setIsInSignupFlow] = useState(false);
  const [isInRecoveryFlow, setIsInRecoveryFlow] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const [globalAlertVisible, setGlobalAlertVisible] = useState(false);
  const [globalAlertConfig, setGlobalAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    confirmText: 'OK',
    onConfirm: () => setGlobalAlertVisible(false),
  });

  const goToWebRoot = () => {
    if (Platform.OS !== 'web') return;
    try {
      // Ensure the browser URL returns to http://localhost:8081/ (root)
      Linking.openURL(Linking.createURL('/'));
    } catch {}
  };

  // Walkie-talkie recording refs
  const wtMediaRecorderRef = useRef<any>(null);
  const wtAudioChunksRef = useRef<any[]>([]);
  const wtMimeTypeRef = useRef<string>('audio/webm');
  const wtStartTimeRef = useRef<number>(0);
  // Pre-warmed mic stream — acquired eagerly so the first button press starts
  // recording immediately without waiting for getUserMedia to resolve.
  const wtPrewarmStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Check if user is already logged in and restore previous tab
    const checkUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          const sessionUser = data.session.user;

          // During password recovery, we must not redirect away from the reset screen
          // (e.g., due to EULA / approval gates). The recovery link itself is the gate.
          if (isInRecoveryFlow) {
            setUser(sessionUser);
            setUserRole(sessionUser.user_metadata?.role || 'employee');
            setCurrentPage('forgot-password');
            return;
          }

          // Fetch role/approval from the database first (more reliable than user_metadata)
          let role = sessionUser.user_metadata?.role || 'employee';
          let isApproved = role === 'admin';
          try {
            const { data: dbUser, error: dbUserError } = await supabase
              .from('users')
              .select('role, is_approved')
              .eq('id', sessionUser.id)
              .single();
            if (dbUserError) throw dbUserError;
            if (dbUser?.role) role = dbUser.role;
            isApproved = role === 'admin' || dbUser?.is_approved === true;
          } catch (err) {
            // If we can't verify approval, fail closed for non-admins.
            console.error('Error checking approval/role:', err);
            if (role !== 'admin') {
              await supabase.auth.signOut();
              setUser(null);
              setUserRole('employee');
              setCurrentPage('signin');
              return;
            }
          }

          if (!isApproved) {
            await supabase.auth.signOut();
            setUser(null);
            setUserRole('employee');
            setCurrentPage('signin');
            return;
          }

          // Mark user as online (only after approval gate)
          supabase
            .from('users')
            .update({ status: 'online' })
            .eq('id', sessionUser.id)
            .then(() => {});

          setUser(sessionUser);
          setUserRole(role);

          // Admins skip EULA — take them straight to the dashboard
          if (role === 'admin') {
            setCurrentPage('dashboard');
            return;
          }

          // Check EULA only for non-admin users
          try {
            const eulaAccepted = await hasAcceptedEula(sessionUser.id);
            if (eulaAccepted) {
              setCurrentPage('dashboard');
              const savedTab = await AsyncStorage.getItem('activeTab');
              if (savedTab && savedTab !== 'settings') {
                setActiveTab(savedTab);
              } else {
                setActiveTab('dashboard');
              }
            } else {
              // Employee hasn't accepted EULA yet — show signin/EULA modal
              setCurrentPage('signin');
            }
          } catch (eulaError) {
            console.error('Error checking EULA:', eulaError);
            setCurrentPage('signin');
          }
        } else {
          // If the user is in the recovery flow, keep them on the reset screen even
          // without a session so they can request a new email.
          if (!isInRecoveryFlow) setCurrentPage('signin');
        }
      } catch (error) {
        console.error('Error checking auth session:', error);
        if (!isInRecoveryFlow) setCurrentPage('signin');
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Mark user offline when browser tab/window closes
    const handleBeforeUnload = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data?.session?.user?.id;
        if (uid) {
          supabase
            .from('users')
            .update({ status: 'offline' })
            .eq('id', uid)
            .then(() => {});
        }
      } catch (_) {}
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, [isInRecoveryFlow]);

  useEffect(() => {
    const parseParams = (url: string): Record<string, string> => {
      const out: Record<string, string> = {};

      const readPart = (part: string) => {
        const p = (part || '').replace(/^\?/, '').replace(/^#/, '');
        if (!p) return;
        const sp = new URLSearchParams(p);
        sp.forEach((v, k) => {
          out[k] = v;
        });
      };

      const qIndex = url.indexOf('?');
      const hIndex = url.indexOf('#');

      if (qIndex >= 0) {
        const end = hIndex >= 0 ? hIndex : url.length;
        readPart(url.slice(qIndex + 1, end));
      }
      if (hIndex >= 0) {
        readPart(url.slice(hIndex + 1));
      }

      return out;
    };

    const handleIncomingUrl = async (url: string) => {
      if (!url) return;

      const parsed = Linking.parse(url);
      const path = (parsed?.path || '').toLowerCase();
      const params = parseParams(url);

      const accessToken = params['access_token'];
      const refreshToken = params['refresh_token'];
      const type = params['type'];
      const code = params['code'];
      const errorCode = (params['error_code'] || '').toLowerCase();
      const errorDescription = (params['error_description'] || '').toLowerCase();
      const error = (params['error'] || '').toLowerCase();

      // When a recovery link is expired/invalid, Supabase often redirects back to the
      // redirect URL with error params instead of tokens.
      const isExpiredRecoveryLink =
        errorCode === 'otp_expired' ||
        errorDescription.includes('expired') ||
        errorDescription.includes('invalid') ||
        (error === 'access_denied' && (errorCode || errorDescription));

      if (isExpiredRecoveryLink) {
        setIsInSignupFlow(false);
        setIsInRecoveryFlow(false);
        setCurrentPage('signin');
        goToWebRoot();
        setGlobalAlertConfig({
          title: 'Link Expired',
          message: 'This password reset link has expired. Please request a new one.',
          type: 'warning',
          confirmText: 'OK',
          onConfirm: () => setGlobalAlertVisible(false),
        });
        setGlobalAlertVisible(true);
        return;
      }

      // Supabase password recovery links include tokens in the URL fragment.
      if (type === 'recovery' && accessToken && refreshToken) {
        try {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        } catch (e: any) {
          console.error('Failed to set recovery session from deep link:', e);
          setIsInSignupFlow(false);
          setIsInRecoveryFlow(false);
          setCurrentPage('signin');
          goToWebRoot();
          setGlobalAlertConfig({
            title: 'Link Expired',
            message: 'This password reset link has expired. Please request a new one.',
            type: 'warning',
            confirmText: 'OK',
            onConfirm: () => setGlobalAlertVisible(false),
          });
          setGlobalAlertVisible(true);
          return;
        }
        setIsInSignupFlow(false);
        setIsInRecoveryFlow(true);
        setCurrentPage('forgot-password');
        return;
      }

      // Some Supabase configurations use PKCE and send a one-time `code`.
      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } catch (e: any) {
          console.error('Failed to exchange code for session:', e);
          setIsInSignupFlow(false);
          setIsInRecoveryFlow(false);
          setCurrentPage('signin');
          goToWebRoot();
          setGlobalAlertConfig({
            title: 'Link Expired',
            message: 'This password reset link has expired. Please request a new one.',
            type: 'warning',
            confirmText: 'OK',
            onConfirm: () => setGlobalAlertVisible(false),
          });
          setGlobalAlertVisible(true);
          return;
        }
        setIsInSignupFlow(false);
        setIsInRecoveryFlow(true);
        setCurrentPage('forgot-password');
        return;
      }

      // If user just opened the route without tokens, still navigate there.
      if (path.includes('forgot-password')) {
        setIsInSignupFlow(false);
        setIsInRecoveryFlow(false);
        setCurrentPage('forgot-password');
      }
    };

    Linking.getInitialURL()
      .then((url) => {
        if (url) handleIncomingUrl(url);
      })
      .catch(() => {});

    const sub = Linking.addEventListener('url', (event) => {
      handleIncomingUrl(event.url);
    });

    return () => {
      sub?.remove?.();
    };
  }, []);

  // Separate effect for auth state changes
  useEffect(() => {
    // Subscribe to auth changes
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Mark user online
        supabase
          .from('users')
          .update({ status: 'online' })
          .eq('id', session.user.id)
          .then(() => {});
        // Only navigate based on EULA if not in signup flow
        // The signin page will handle EULA modal display
        if (!isInSignupFlow) {
          // Don't auto-navigate to dashboard here, let SignIn component handle EULA
          // Just set the user, SignIn will show EULA modal if needed
        }
      } else {
        setUser(null);
        if (!isInSignupFlow && !isInRecoveryFlow) {
          setCurrentPage('signin');
        }
        setActiveTab('dashboard');
      }
    });

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, [isInSignupFlow, isInRecoveryFlow]);

  // Save active tab to storage whenever it changes
  useEffect(() => {
    if (currentPage === 'dashboard') {
      AsyncStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab, currentPage]);

  // Pre-warm the mic as soon as the employee reaches their dashboard so the
  // first walkie-talkie button press starts recording with zero latency.
  useEffect(() => {
    if (currentPage === 'dashboard' && userRole !== 'admin') {
      prewarmMic();
    }
    return () => {
      // Release the cached stream when navigating away / logging out.
      if (wtPrewarmStreamRef.current) {
        wtPrewarmStreamRef.current.getTracks().forEach((t: any) => t.stop());
        wtPrewarmStreamRef.current = null;
      }
    };
  }, [currentPage, userRole]);

  // Acquires a mic stream in the background and stores it for instant reuse.
  // Called on component mount and after each recording to ensure the next
  // button press starts recording with zero getUserMedia latency.
  const prewarmMic = () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    (navigator as any).mediaDevices
      .getUserMedia({ audio: true })
      .then((stream: MediaStream) => {
        // If the component gained a new pre-warms stream while this one was
        // in-flight, release whichever is older.
        if (wtPrewarmStreamRef.current) {
          wtPrewarmStreamRef.current.getTracks().forEach((t: any) => t.stop());
        }
        wtPrewarmStreamRef.current = stream;
      })
      .catch(() => {}); // permission denied or unavailable — handled gracefully on button press
  };

  const startWalkieTalkieRecording = () => {
    setIsRecording(true);
    wtAudioChunksRef.current = [];

    (async () => {
      try {
        // Use the pre-warmed stream so recording begins immediately, with no
        // getUserMedia round-trip. Consume it so the next call gets a fresh one.
        let stream: MediaStream | null = wtPrewarmStreamRef.current;
        wtPrewarmStreamRef.current = null;
        if (!stream) {
          // Fallback: acquire fresh (first-ever press or if prewarm wasn't ready).
          stream = await (navigator as any).mediaDevices.getUserMedia({ audio: true });
        }

        const candidates = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/ogg',
          'audio/mp4',
        ];
        const mimeType =
          candidates.find((t) => (window as any).MediaRecorder?.isTypeSupported?.(t)) || '';
        wtMimeTypeRef.current = mimeType || 'audio/webm';

        const mr = new (window as any).MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mr.ondataavailable = (e: any) => {
          if (e.data && e.data.size > 0) wtAudioChunksRef.current.push(e.data);
        };
        mr.start(100); // 100 ms timeslice → multi-cluster WebM with timestamps (prevents premature onended)
        wtStartTimeRef.current = Date.now(); // start timer after recorder actually begins
        wtMediaRecorderRef.current = { mediaRecorder: mr, stream };
      } catch (e) {
        console.error('Microphone error:', e);
        setIsRecording(false);
      }
    })();
  };

  const toggleWalkieTalkie = () => {
    if (isRecording) {
      stopAndSendWalkieTalkie();
    } else {
      startWalkieTalkieRecording();
    }
  };

  const stopAndSendWalkieTalkie = () => {
    setIsRecording(false);
    const ref = wtMediaRecorderRef.current;
    if (!ref?.mediaRecorder) return;

    const durationMs = Date.now() - wtStartTimeRef.current;
    const blobType = wtMimeTypeRef.current || 'audio/webm';
    const mr = ref.mediaRecorder as MediaRecorder;

    mr.onstop = async () => {
      try {
        const blob = new Blob(wtAudioChunksRef.current, { type: blobType });
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        if (!currentUser) return;

        // Find the first admin user
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin')
          .limit(1);
        if (!admins?.length) return;
        const adminId = admins[0].id;

        const convId = await getOrCreateConversation(currentUser.id, adminId);
        if (!convId) return;

        await supabase.from('messages').insert([
          {
            conversation_id: convId,
            sender_id: currentUser.id,
            receiver_id: adminId,
            file_url: dataUrl,
            duration_ms: durationMs,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.error('Error sending walkie-talkie message:', err);
      } finally {
        wtAudioChunksRef.current = [];
      }
    };

    try {
      mr.stop();
    } catch (_) {}
    try {
      ref.stream.getTracks().forEach((t: any) => t.stop());
    } catch (_) {}
    wtMediaRecorderRef.current = null;
    // Pre-warm the mic stream for the next recording press.
    prewarmMic();
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#fff',
        }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {currentPage === 'signin' ? (
        <SignIn
          onNavigateToSignUp={() => {
            setIsInSignupFlow(true);
            setCurrentPage('signup');
          }}
          onNavigateToForgotPassword={() => {
            setIsInSignupFlow(false);
            setCurrentPage('forgot-password');
          }}
          onSignInSuccess={async (signedInUser) => {
            setUser(signedInUser);
            let role = signedInUser.user_metadata?.role || 'employee';
            try {
              const { data: dbUser } = await supabase
                .from('users')
                .select('role')
                .eq('id', signedInUser.id)
                .single();
              if (dbUser?.role) role = dbUser.role;
            } catch (_) {}
            setUserRole(role);
            setCurrentPage('dashboard');
          }}
        />
      ) : currentPage === 'forgot-password' ? (
        <ForgotPassword
          onBackToSignIn={() => {
            setIsInSignupFlow(false);
            setIsInRecoveryFlow(false);
            setCurrentPage('signin');
            goToWebRoot();
          }}
        />
      ) : currentPage === 'signup' ? (
        <SignUp
          onNavigateToSignIn={() => {
            setIsInSignupFlow(false);
            setCurrentPage('signin');
          }}
          onSignUpSuccess={async (signedUpUser) => {
            setUser(signedUpUser);

            // Fetch role/approval from DB (fail closed for non-admins)
            let role = signedUpUser.user_metadata?.role || 'employee';
            let isApproved = role === 'admin';
            try {
              const { data: dbUser, error: dbUserError } = await supabase
                .from('users')
                .select('role, is_approved')
                .eq('id', signedUpUser.id)
                .single();
              if (dbUserError) throw dbUserError;
              if (dbUser?.role) role = dbUser.role;
              isApproved = role === 'admin' || dbUser?.is_approved === true;
            } catch (err) {
              console.error('Error checking approval/role after signup:', err);
              if (role !== 'admin') isApproved = false;
            }

            if (!isApproved) {
              await signOutUser(signedUpUser?.id);
              setUser(null);
              setUserRole('employee');
              setIsInSignupFlow(false);
              setCurrentPage('signin');
              return;
            }

            setUserRole(role);
            setIsInSignupFlow(false);
            setCurrentPage('dashboard');
          }}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {userRole === 'admin' ? (
            <AdminDashboard
              onLogout={async () => {
                await signOutUser(user?.id);
                setUser(null);
                setUserRole('employee');
                setCurrentPage('signin');
              }}
            />
          ) : activeTab === 'contacts' ? (
            <Contacts onContactSelected={setSelectedContact} />
          ) : activeTab === 'sites' ? (
            <Sites
              onMapPress={() => {
                setSelectedSite(null);
                setActiveTab('map');
              }}
              onSiteMapPress={(site) => {
                setSelectedSite(site);
                setActiveTab('map');
              }}
            />
          ) : activeTab === 'map' ? (
            <Map
              onBack={() => {
                setSelectedSite(null);
                setActiveTab('sites');
              }}
              selectedSite={selectedSite}
            />
          ) : activeTab === 'logs' ? (
            <Logs />
          ) : activeTab === 'settings' ? (
            <Settings
              onLogout={async () => {
                await signOutUser(user?.id);
                setUser(null);
                setUserRole('employee');
                setCurrentPage('signin');
              }}
              onBackToDashboard={() => setActiveTab('dashboard')}
              onNavigateToEditProfile={() => setActiveTab('edit-profile')}
              onNavigateToChangePassword={() => setActiveTab('change-password')}
            />
          ) : activeTab === 'edit-profile' ? (
            <EditProfile onBackToSettings={() => setActiveTab('settings')} />
          ) : activeTab === 'change-password' ? (
            <ChangePassword onBackToSettings={() => setActiveTab('settings')} />
          ) : (
            <Dashboard
              onLogout={async () => {
                await signOutUser(user?.id);
                setUser(null);
                setUserRole('employee');
                setCurrentPage('signin');
              }}
              onNavigateToSettings={() => setActiveTab('settings')}
            />
          )}
          {userRole !== 'admin' &&
            !selectedContact &&
            activeTab !== 'settings' &&
            activeTab !== 'edit-profile' &&
            activeTab !== 'change-password' &&
            activeTab !== 'map' && (
              <Navbar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onMicPress={toggleWalkieTalkie}
                isRecording={isRecording}
              />
            )}
          {/* Live location tracker for non-admin users (foreground + background) */}
          {userRole !== 'admin' && user && (
            <LiveLocationTracker enabled={true} userId={user.id} />
          )}
        </View>
      )}

      <SweetAlertModal
        visible={globalAlertVisible}
        title={globalAlertConfig.title}
        message={globalAlertConfig.message}
        type={globalAlertConfig.type}
        confirmText={globalAlertConfig.confirmText}
        onConfirm={globalAlertConfig.onConfirm}
      />
      <StatusBar style="dark" />
    </View>
  );
}
