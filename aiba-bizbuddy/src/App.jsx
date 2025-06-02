import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseconfig';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ChatBot from './components/ChatBot';
import BusinessSetupChat from './components/BusinessSetupChat';
import './App.css';

export default function App() {
  const { currentUser } = useAuth();
  const [hasBusinessInfo, setHasBusinessInfo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInfo = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      const ref = doc(db, 'users', currentUser.uid, 'business', 'info');
      const snap = await getDoc(ref);
      setHasBusinessInfo(snap.exists());
      setLoading(false);
    };
    fetchInfo();
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
          ) : hasBusinessInfo ? (
            <ChatBot />
          ) : (
            <BusinessSetupChat />
          )
        } 
      />
      <Route path="/" element={<Navigate to={currentUser ? "/chat" : "/login"} />} />
    </Routes>
  );
}
