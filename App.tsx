import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { View } from 'react-native';
import SignIn from './pages/signin';
import SignUp from './pages/signup';

import './global.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'signin' | 'signup'>('signin');

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
