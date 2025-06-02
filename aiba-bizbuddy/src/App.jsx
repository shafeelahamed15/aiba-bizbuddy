import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import ChatBot from './components/ChatBot';
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/chat" element={<ChatBot />} />
      <Route path="/" element={<Login />} />
    </Routes>
  );
}

export default App;
