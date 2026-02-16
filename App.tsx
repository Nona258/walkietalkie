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

import './global.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'signin' | 'signup' | 'dashboard'>('signin');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in and restore previous tab
    const checkUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          setUser(data.session.user);
          setCurrentPage('dashboard');
          
          // Restore the previous active tab
          const savedTab = await AsyncStorage.getItem('activeTab');
          if (savedTab && savedTab !== 'settings') {
            setActiveTab(savedTab);
          } else {
            setActiveTab('dashboard');
          }
        }
      } catch (error) {
        console.error('Error checking auth session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Subscribe to auth changes
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setCurrentPage('dashboard');
      } else {
        setUser(null);
        setCurrentPage('signin');
        setActiveTab('dashboard');
      }
    });

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

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
          onNavigateToSignUp={() => setCurrentPage('signup')}
          onSignInSuccess={(signedInUser) => {
            setUser(signedInUser);
            setCurrentPage('dashboard');
          }}
        />
      ) : currentPage === 'signup' ? (
        <SignUp onNavigateToSignIn={() => setCurrentPage('signin')} />
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
                await supabase.auth.signOut();
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
                await supabase.auth.signOut();
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
