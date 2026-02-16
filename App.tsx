import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/employee/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import SiteManagement from './pages/admin/SiteManagement';
import WalkieTalkie from './pages/admin/WalkieTalkie';
import ActivityLogs from './pages/admin/ActivityLogs';
import CompanyList from './pages/admin/CompanyList';
import Employees from './pages/admin/Employees';
import AdminSettings from './pages/admin/Settings';
import SimpleToast from './components/SimpleToast';
import Contacts from './pages/employee/Contacts';
import Sites from './pages/employee/Sites';
import Logs from './pages/employee/Logs';
import Settings from './pages/employee/Settings';
import Navbar from './components/Navbar';
import supabase from './utils/supabase';

import './global.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'signin' | 'signup' | 'dashboard'>('signin');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [adminPage, setAdminPage] = useState<'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings'>('dashboard');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in and restore previous tab
    const checkUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          // Try to fetch role from public users table and attach it to the user object
          let role: string | undefined = undefined;
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('role')
              .eq('id', data.session.user.id)
              .single();
            if (!userError && userData?.role) role = userData.role;
          } catch (err) {
            // ignore and fallback to auth metadata
          }

          setUser({ ...data.session.user, role });
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
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // When auth state changes, attempt to fetch the user's role and attach it
        let role: string | undefined = undefined;
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
          if (!userError && userData?.role) role = userData.role;
        } catch (err) {
          // ignore and fallback to auth metadata
        }

        setUser({ ...session.user, role });
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
          onSignInSuccess={async (signedInUser) => {
            // Always fetch the latest role from the users table after sign in
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('role')
              .eq('id', signedInUser.id)
              .single();
            let role = signedInUser.role;
            if (!userError && userData && userData.role) {
              role = userData.role;
            }
            setUser({ ...signedInUser, role });
            setCurrentPage('dashboard');
            if (role === 'admin') {
              setAdminPage('dashboard');
            } else {
              setActiveTab('dashboard');
            }
          }}
        />
      ) : currentPage === 'signup' ? (
        <SignUp onNavigateToSignIn={() => setCurrentPage('signin')} />
      ) : getUserRole(user) === 'admin' ? (
        <View style={{ flex: 1 }}>
          {adminPage === 'dashboard' ? (
            <AdminDashboard onNavigate={setAdminPage} />
          ) : adminPage === 'siteManagement' ? (
            <SiteManagement onNavigate={setAdminPage} />
          ) : adminPage === 'walkieTalkie' ? (
            <WalkieTalkie onNavigate={setAdminPage} />
          ) : adminPage === 'companyList' ? (
            <CompanyList onNavigate={setAdminPage} />
          ) : adminPage === 'employee' ? (
            <Employees onNavigate={setAdminPage} />
          ) : adminPage === 'settings' ? (
            <AdminSettings onNavigate={setAdminPage} />
          ) : (
            <ActivityLogs onNavigate={setAdminPage} />
          )}
          <SimpleToast />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {activeTab === 'contacts' ? (
            <Contacts onContactSelected={setSelectedContact} />
          ) : activeTab === 'sites' ? (
            <Sites />
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
          {!selectedContact && activeTab !== 'settings' && <Navbar activeTab={activeTab} onTabChange={setActiveTab} />}
        </View>
      )}
      <StatusBar style="dark" />
    </View>
  );
}

// Helper to get role from user object
const getUserRole = (userObj: any) => {
  if (!userObj) return undefined;
  // If userObj has a 'role' property, use it
  if (userObj.role) return userObj.role;
  // If userObj has a 'user_metadata' property with 'role', use it
  if (userObj.user_metadata && userObj.user_metadata.role) return userObj.user_metadata.role;
  // If userObj has a 'role' nested in 'app_metadata', use it (for some Supabase setups)
  if (userObj.app_metadata && userObj.app_metadata.role) return userObj.app_metadata.role;
  return undefined;
};
