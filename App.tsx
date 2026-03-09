import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/employee/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import Contacts from './pages/employee/Contacts';
import Sites from './pages/employee/Sites';
import Map from './pages/employee/Map';
import Logs from './pages/employee/Logs';
import Settings from './pages/employee/Settings';
import EditProfile from './pages/employee/EditProfile';
import Navbar from './components/Navbar';
import supabase, { getOrCreateConversation } from './utils/supabase';
import { hasAcceptedEula, signOutUser } from './utils/eula';

import './global.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'signin' | 'signup' | 'dashboard'>('signin');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('employee');
  const [loading, setLoading] = useState(true);
  const [isInSignupFlow, setIsInSignupFlow] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

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
          // Mark user as online
          supabase.from('users').update({ status: 'online' }).eq('id', sessionUser.id).then(() => {});

          // Fetch role from the database first (more reliable than user_metadata)
          let role = sessionUser.user_metadata?.role || 'employee';
          try {
            const { data: dbUser } = await supabase
              .from('users')
              .select('role')
              .eq('id', sessionUser.id)
              .single();
            if (dbUser?.role) role = dbUser.role;
          } catch (_) {}

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
          setCurrentPage('signin');
        }
      } catch (error) {
        console.error('Error checking auth session:', error);
        setCurrentPage('signin');
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
          supabase.from('users').update({ status: 'offline' }).eq('id', uid).then(() => {});
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
  }, []);

  // Separate effect for auth state changes
  useEffect(() => {
    // Subscribe to auth changes
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Mark user online
        supabase.from('users').update({ status: 'online' }).eq('id', session.user.id).then(() => {});
        // Only navigate based on EULA if not in signup flow
        // The signin page will handle EULA modal display
        if (!isInSignupFlow) {
          // Don't auto-navigate to dashboard here, let SignIn component handle EULA
          // Just set the user, SignIn will show EULA modal if needed
        }
      } else {
        setUser(null);
        if (!isInSignupFlow) {
          setCurrentPage('signin');
        }
        setActiveTab('dashboard');
      }
    });

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, [isInSignupFlow]);

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
    (navigator as any).mediaDevices.getUserMedia({ audio: true })
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
        const mimeType = candidates.find(
          (t) => (window as any).MediaRecorder?.isTypeSupported?.(t)
        ) || '';
        wtMimeTypeRef.current = mimeType || 'audio/webm';

        const mr = new (window as any).MediaRecorder(
          stream,
          mimeType ? { mimeType } : undefined
        );
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

        const { data: { user: currentUser } } = await supabase.auth.getUser();
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

        await supabase.from('messages').insert([{
          conversation_id: convId,
          sender_id: currentUser.id,
          receiver_id: adminId,
          file_url: dataUrl,
          duration_ms: durationMs,
          created_at: new Date().toISOString(),
        }]);
      } catch (err) {
        console.error('Error sending walkie-talkie message:', err);
      } finally {
        wtAudioChunksRef.current = [];
      }
    };

    try { mr.stop(); } catch (_) {}
    try { ref.stream.getTracks().forEach((t: any) => t.stop()); } catch (_) {}
    wtMediaRecorderRef.current = null;
    // Pre-warm the mic stream for the next recording press.
    prewarmMic();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
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
      ) : currentPage === 'signup' ? (
        <SignUp 
          onNavigateToSignIn={() => {
            setIsInSignupFlow(false);
            setCurrentPage('signin');
          }}
          onSignUpSuccess={(signedUpUser) => {
            setUser(signedUpUser);
            const role = signedUpUser.user_metadata?.role || 'employee';
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
            <Sites onMapPress={() => setActiveTab('map')} onSiteMapPress={(site) => {
              setSelectedSite(site);
              setActiveTab('map');
            }} />
          ) : activeTab === 'map' ? (
            <Map onBack={() => {
              setSelectedSite(null);
              setActiveTab('sites');
            }} selectedSite={selectedSite} />
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
            />
          ) : activeTab === 'edit-profile' ? (
            <EditProfile 
              onBackToSettings={() => setActiveTab('settings')}
            />
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
          {userRole !== 'admin' && !selectedContact && activeTab !== 'settings' && activeTab !== 'edit-profile' && activeTab !== 'map' && <Navbar activeTab={activeTab} onTabChange={setActiveTab} onMicPress={toggleWalkieTalkie} isRecording={isRecording} />}
        </View>
      )}
      <StatusBar style="dark" />
    </View>
  );
}
