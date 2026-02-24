import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/employee/Dashboard';
import Contacts from './pages/employee/Contacts';
import Sites from './pages/employee/Sites';
import Map from './pages/employee/Map';
import Logs from './pages/employee/Logs';
import Settings from './pages/employee/Settings';
import EditProfile from './pages/employee/EditProfile';
import Navbar from './components/Navbar';
import supabase from './utils/supabase';
import { hasAcceptedEula, signOutUser } from './utils/eula';

import './global.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'signin' | 'signup' | 'dashboard'>('signin');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isInSignupFlow, setIsInSignupFlow] = useState(false);

  useEffect(() => {
    // Check if user is already logged in and restore previous tab
    const checkUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          // Check if user has accepted EULA
          try {
            const eulaAccepted = await hasAcceptedEula(data.session.user.id);
            
            if (eulaAccepted) {
              // User has accepted EULA, proceed to dashboard
              setUser(data.session.user);
              setCurrentPage('dashboard');
              
              // Restore the previous active tab
              const savedTab = await AsyncStorage.getItem('activeTab');
              if (savedTab && savedTab !== 'settings') {
                setActiveTab(savedTab);
              } else {
                setActiveTab('dashboard');
              }
            } else {
              // User hasn't accepted EULA yet, stay on signin to show modal
              setUser(data.session.user);
              setCurrentPage('signin');
            }
          } catch (eulaError) {
            // If EULA check fails, assume not accepted and show signin
            console.error('Error checking EULA:', eulaError);
            setUser(data.session.user);
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
  }, []);

  // Separate effect for auth state changes
  useEffect(() => {
    // Subscribe to auth changes
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
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
          onSignInSuccess={(signedInUser) => {
            setUser(signedInUser);
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
            setIsInSignupFlow(false);
            setCurrentPage('dashboard');
          }}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {activeTab === 'contacts' ? (
            <Contacts onContactSelected={setSelectedContact} />
          ) : activeTab === 'sites' ? (
            <Sites onMapPress={() => setActiveTab('map')} />
          ) : activeTab === 'map' ? (
            <Map onBack={() => setActiveTab('sites')} />
          ) : activeTab === 'logs' ? (
            <Logs />
          ) : activeTab === 'settings' ? (
              <Settings 
              onLogout={async () => {
                await signOutUser(user?.id);
                setUser(null);
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
                setCurrentPage('signin');
              }}
              onNavigateToSettings={() => setActiveTab('settings')}
            />
          )}
          {!selectedContact && activeTab !== 'settings' && activeTab !== 'edit-profile' && activeTab !== 'map' && <Navbar activeTab={activeTab} onTabChange={setActiveTab} />}
        </View>
      )}
      <StatusBar style="dark" />
    </View>
  );
}
