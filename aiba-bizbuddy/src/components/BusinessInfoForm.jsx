import React, { useState } from 'react';
import { db } from '../firebase'; // make sure your firebase config is correct
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext'; // assuming you have auth context

const BusinessInfoForm = () => {
  const { currentUser } = useAuth(); // get current logged-in user
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
    bankName: ''
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
    } catch (err) {
      alert("Error saving data: " + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
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
        ["bankName", "Bank Name"]
      ].map(([key, label]) => (
        <input
          key={key}
          name={key}
          placeholder={label}
          value={form[key]}
          onChange={handleChange}
          required
          className="p-2 border rounded"
        />
      ))}

      <button type="submit" className="p-2 bg-blue-500 text-white rounded">
        Save Business Info
      </button>
    </form>
  );
};

export default BusinessInfoForm;
