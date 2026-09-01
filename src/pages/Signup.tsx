import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { syncUserToFirestore } from "../lib/authHelpers";
import BackButton from "../components/BackButton";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await syncUserToFirestore(userCredential.user, { name, loginMethod: "email" });
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      await syncUserToFirestore(userCredential.user, { name: userCredential.user.displayName, loginMethod: "google" });
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F7F4] flex flex-col justify-center p-6">
      <BackButton />
      <h1 className="text-3xl font-black text-[#1B4332] mb-6">Create Account</h1>
      <form onSubmit={handleSignup} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="w-full p-4 mb-4 border border-gray-200 rounded-2xl" required />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="w-full p-4 mb-4 border border-gray-200 rounded-2xl" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full p-4 mb-4 border border-gray-200 rounded-2xl" required />
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" className="w-full p-4 mb-4 border border-gray-200 rounded-2xl" required />
        <button disabled={loading} className="w-full bg-[#2D6A4F] text-white py-4 rounded-full font-bold text-lg mb-4">
          {loading ? "Creating..." : "Create Account"}
        </button>
        <button type="button" onClick={handleGoogleSignup} disabled={loading} className="w-full bg-white border border-gray-200 text-gray-700 py-4 rounded-full font-bold text-lg">
          Continue with Google
        </button>
        {error && <p className="text-red-500 mt-4 text-center text-sm font-bold">{error}</p>}
      </form>
    </div>
  );
}
