import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const questions = [
  { key: 'businessName', question: 'What is your Business Name?' },
  { key: 'address', question: 'What is your Business Address?' },
  { key: 'gstin', question: 'What is your GSTIN?' },
  { key: 'state', question: 'Which State are you in?' },
  { key: 'pincode', question: 'What is your Pincode?' },
  { key: 'email', question: 'What is your Email?' },
  { key: 'phone', question: 'Your Business Phone Number?' },
  { key: 'bankAccount', question: 'Bank Account Number?' },
  { key: 'ifsc', question: 'IFSC Code?' },
  { key: 'bankName', question: 'Name of your Bank?' }
];

export default function BusinessSetupChat() {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [input, setInput] = useState('');
  const navigate = useNavigate();

  const handleNext = async () => {
    const key = questions[step].key;
    const updatedAnswers = { ...answers, [key]: input };
    setAnswers(updatedAnswers);
    setInput('');

    if (step === questions.length - 1) {
      // Save to Firestore
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'business', 'info'), updatedAnswers);
        alert("Business info saved!");
        navigate('/chat'); // Redirect to ChatBot screen
      } catch (err) {
        console.error(err);
        alert("Error saving business info.");
      }
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 bg-gray-100 p-4 rounded shadow">
        <p><strong>AIBA:</strong> {questions[step].question}</p>
      </div>

      <input
        className="w-full p-2 border rounded mb-4"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your answer here..."
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handleNext}
        disabled={!input}
      >
        Submit
      </button>
    </div>
  );
}
