import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseconfig';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ChatBot from './components/ChatBot';
import BusinessSetupChat from './components/BusinessSetupChat';
import './App.css';

function App() {
  const { currentUser } = useAuth();
  const [businessInfo, setBusinessInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBusinessInfo = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      const docRef = doc(db, 'users', currentUser.uid, 'business', 'info');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setBusinessInfo(docSnap.data());
      }
      setLoading(false);
    };

    checkBusinessInfo();
  }, [currentUser]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/chat" />} />
      <Route 
        path="/chat" 
        element={
          !currentUser ? (
            <Navigate to="/login" />
          ) : businessInfo ? (
            <ChatBot businessInfo={businessInfo} />
          ) : (
            <BusinessSetupChat />
          )
        } 
      />
      <Route path="/" element={<Navigate to={currentUser ? "/chat" : "/login"} />} />
    </Routes>
  );
}

export default App; 