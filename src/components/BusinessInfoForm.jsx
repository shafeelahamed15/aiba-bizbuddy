import React, { useState } from 'react';
import { db } from '../firebaseconfig';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const BusinessInfoForm = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    businessName: '',
    address: '',
    gstin: '',
    state: '',
    pincode: '',
    email: '',
    phone: '',
    bankAccount: '',
    ifsc: '',
    bankName: '',
    branch: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Please log in first");

    try {
      await setDoc(doc(db, "users", currentUser.uid, "business", "info"), form);
      alert("Business info saved successfully!");
      navigate("/chat");
    } catch (err) {
      alert("Error saving data: " + err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Business Information</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {[
          ["businessName", "Business Name"],
          ["address", "Address"],
          ["gstin", "GSTIN"],
          ["state", "State"],
          ["pincode", "Pincode"],
          ["email", "Email"],
          ["phone", "Phone Number"],
          ["bankAccount", "Bank Account Number"],
          ["ifsc", "IFSC Code"],
          ["bankName", "Bank Name"],
          ["branch", "Bank Branch"]
        ].map(([key, label]) => (
          <div key={key} className="flex flex-col gap-1">
            <label htmlFor={key} className="text-sm font-medium text-gray-700">
              {label}
            </label>
            <input
              id={key}
              name={key}
              placeholder={label}
              value={form[key]}
              onChange={handleChange}
              required
              className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}

        <button 
          type="submit" 
          className="mt-4 p-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Save Business Info
        </button>
      </form>
    </div>
  );
};

export default BusinessInfoForm; 