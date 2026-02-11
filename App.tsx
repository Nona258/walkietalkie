import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SignIn from './pages/auth/signin';
import SignUp from './pages/auth/signup';

import AdminDashboard from './pages/admin/Dashboard';
import SiteManagement from './pages/admin/SiteManagement';
import WalkieTalkie from './pages/admin/WalkieTalkie';
import ActivityLogs from './pages/admin/ActivityLogs';
import CompanyList from './pages/admin/CompanyList';
import Employees from './pages/admin/Employees';
import Settings from './pages/admin/Settings';
import SimpleToast from './components/SimpleToast';

import './global.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'signin' | 'signup'>('signin');
  const [adminPage, setAdminPage] = useState<'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings'>('dashboard');
  
  // Set to 'admin' to preview the Admin Dashboard in the app root.
  // Change to 'auth' to restore the normal signin/signup flow.
  const DEV_PREVIEW: 'auth' | 'admin' = 'admin';

  // Load saved admin page on mount
  useEffect(() => {
    const loadAdminPage = async () => {
      try {
        const savedPage = await AsyncStorage.getItem('adminPage');
        if (
          savedPage === 'dashboard' ||
          savedPage === 'siteManagement' ||
          savedPage === 'walkieTalkie' ||
          savedPage === 'activityLogs' ||
          savedPage === 'companyList' ||
          savedPage === 'employee' ||
          savedPage === 'settings'
        ) {
          setAdminPage(savedPage);
        }
      } catch (error) {
        console.log('Error loading admin page:', error);
      }
    };
    loadAdminPage();
  }, []);

  // Save admin page whenever it changes
  useEffect(() => {
    const saveAdminPage = async () => {
      try {
        await AsyncStorage.setItem('adminPage', adminPage);
        console.log('Saved admin page:', adminPage);
      } catch (error) {
        console.log('Error saving admin page:', error);
      }
    };
    saveAdminPage();
  }, [adminPage]);

  const handleNavigate = (
    page: 'dashboard' | 'siteManagement' | 'walkieTalkie' | 'activityLogs' | 'companyList' | 'employee' | 'settings'
  ) => {
    console.log('Navigating to:', page);
    console.log('Current page:', adminPage);
    setAdminPage(page);
  };

  // Debug log whenever adminPage changes
  useEffect(() => {
    console.log('Admin page changed to:', adminPage);
  }, [adminPage]);

  if (DEV_PREVIEW === 'admin') {
    return (
      <View style={{ flex: 1 }}>
        {adminPage === 'dashboard' ? (
          <AdminDashboard onNavigate={handleNavigate} />
        ) : adminPage === 'siteManagement' ? (
          <SiteManagement onNavigate={handleNavigate} />
        ) : adminPage === 'walkieTalkie' ? (
          <WalkieTalkie onNavigate={handleNavigate} />
        ) : adminPage === 'companyList' ? (
          <CompanyList onNavigate={handleNavigate} />
        ) : adminPage === 'employee' ? (
          <Employees onNavigate={handleNavigate} />
        ) : adminPage === 'settings' ? (
          <Settings onNavigate={handleNavigate} />
        ) : (
          <ActivityLogs onNavigate={handleNavigate} />
        )}
        <SimpleToast />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {currentPage === 'signin' ? (
        <SignIn onNavigateToSignUp={() => setCurrentPage('signup')} />
      ) : (
        <SignUp onNavigateToSignIn={() => setCurrentPage('signin')} />
      )}
      <StatusBar style="dark" />
    </View>
  );
}