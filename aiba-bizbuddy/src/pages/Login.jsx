import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signUp, login } from "../firebaseAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSignup = async () => {
    try {
      await signUp(email, password);
      alert("Signup successful!");
      navigate("/chat");
    } catch (err) {
      alert("Signup error: " + err.message);
    }
  };

  const handleLogin = async () => {
    try {
      await login(email, password);
      alert("Login successful!");
      navigate("/chat");
    } catch (err) {
      alert("Login error: " + err.message);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Login or Signup</h2>
      <input
        type="email"
        placeholder="Email"
        className="border p-2 mb-2 block"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="border p-2 mb-2 block"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin} className="bg-blue-500 text-white px-4 py-2 mr-2">Login</button>
      <button onClick={handleSignup} className="bg-green-500 text-white px-4 py-2">Signup</button>
    </div>
  );
} 