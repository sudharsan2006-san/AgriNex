import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { syncUserToFirestore } from "../lib/authHelpers";
import { useLanguage } from "../lib/i18n";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isResetView, setIsResetView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await syncUserToFirestore(userCredential.user, { loginMethod: "email" });
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage(t("Password reset email sent. Please check your inbox."));
      setIsResetView(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
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
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-[#1B4332] mb-2">AgriNex</h1>
        <p className="text-lg text-[#2D6A4F]">{t("Welcome to AgriNex")}</p>
        <p className="text-sm text-[#40916C]">{t("Smart Farms • Better Tomorrow")}</p>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        {!isResetView ? (
          <form onSubmit={handleLogin}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("Email Address")} className="w-full p-4 mb-4 border border-gray-200 rounded-2xl" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("Password")} className="w-full p-4 mb-2 border border-gray-200 rounded-2xl" required />
            <div className="text-right mb-4">
              <button type="button" onClick={() => setIsResetView(true)} className="text-sm text-[#2D6A4F] font-bold">{t("Forgot Password?")}</button>
            </div>
            <button disabled={loading} className="w-full bg-[#2D6A4F] text-white py-4 rounded-full font-bold text-lg mb-4">
              {loading ? t("Logging in...") : t("Login")}
            </button>
            <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-full bg-white border border-gray-200 text-gray-700 py-4 rounded-full font-bold text-lg mb-4">
              {t("Continue with Google")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword}>
            <h2 className="text-xl font-bold text-[#1B4332] mb-4">{t("Reset Password")}</h2>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("Email Address")} className="w-full p-4 mb-4 border border-gray-200 rounded-2xl" required />
            <button disabled={loading} className="w-full bg-[#2D6A4F] text-white py-4 rounded-full font-bold text-lg mb-4">
              {loading ? t("Sending") : t("Send Reset Email")}
            </button>
            <button type="button" onClick={() => setIsResetView(false)} className="w-full py-2 text-gray-500 font-bold">{t("Back to Login")}</button>
          </form>
        )}
        <div className="text-center text-sm">
          <p>{t("Don't have an account?")} <Link to="/signup" className="text-[#2D6A4F] font-bold">{t("Create Account")}</Link></p>
        </div>
        {error && <p className="text-red-500 mt-4 text-center text-sm font-bold">{error}</p>}
        {message && <p className="text-green-600 mt-4 text-center text-sm font-bold">{message}</p>}
      </div>
    </div>
  );
}
