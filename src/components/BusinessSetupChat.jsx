import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseconfig';
import { useAuth } from '../context/AuthContext';

const questions = [
  { key: 'businessName', label: 'What is your business name?' },
  { key: 'address', label: 'What is your business address?' },
  { key: 'gstin', label: 'What is your GSTIN number?' },
  { key: 'state', label: 'Which state is your business located in?' },
  { key: 'pincode', label: 'What is your business pincode?' },
  { key: 'email', label: 'What is your business email address?' },
  { key: 'phone', label: 'What is your business phone number?' },
  { key: 'bankAccount', label: 'What is your business bank account number?' },
  { key: 'ifsc', label: 'What is your bank IFSC code?' },
  { key: 'bankName', label: 'What is your bank name?' }
];

export default function BusinessSetupChat() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [businessInfo, setBusinessInfo] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Add initial bot message
    if (messages.length === 0) {
      setMessages([{
        type: 'bot',
        text: questions[0].label
      }]);
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const currentQuestion = questions[currentStep];
    const newInfo = { ...businessInfo, [currentQuestion.key]: input.trim() };
    setBusinessInfo(newInfo);

    // Add user's response to messages
    setMessages(prev => [...prev, { type: 'user', text: input.trim() }]);
    setInput('');

    // If this was the last question, save to Firestore and redirect
    if (currentStep === questions.length - 1) {
      setIsLoading(true);
      try {
        await setDoc(doc(db, "users", currentUser.uid, "business", "info"), newInfo);
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: "Thank you! Your business information has been saved. Redirecting to chat..." 
        }]);
        setTimeout(() => navigate('/chat'), 2000);
      } catch (error) {
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: "Sorry, there was an error saving your information. Please try again." 
        }]);
        setIsLoading(false);
      }
      return;
    }

    // Move to next question
    setCurrentStep(prev => prev + 1);
    setMessages(prev => [...prev, { 
      type: 'bot', 
      text: questions[currentStep + 1].label 
    }]);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 rounded-lg p-3">
              Saving your information...
            </div>
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer here..."
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className={`px-6 py-2 bg-blue-500 text-white rounded-lg transition-colors ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
          >
            {isLoading ? 'Saving...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
} 