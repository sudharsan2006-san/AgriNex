import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { ADMIN_EMAIL, isAdminUserEmail, syncUserToFirestore } from "../lib/authHelpers";
import { ShieldCheck, ShieldAlert, ArrowLeft, Lock, Mail, Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !normalizedEmail.includes("@")) {
        throw new Error("Please enter a valid administrator email address.");
      }

      // 1. Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const user = userCredential.user;
      if (!isAdminUserEmail(user.email)) {
        await signOut(auth);
        setError("Unauthorized Admin account. Access is strictly restricted to the authorized administrator account (sudharsan9001@gmail.com).");
        return;
      }

      await syncUserToFirestore(user, { loginMethod: "admin-email" });
      navigate("/admin-dashboard", { replace: true });
    } catch (err: any) {
      console.error("Admin authentication error:", err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Invalid administrator email or password.");
      } else if (err.code === "auth/user-not-found") {
        setError("No administrator account found with this email.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Access temporarily blocked due to many failed attempts. Try again later.");
      } else {
        setError(err.message || "Admin authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F7F4] flex flex-col justify-center items-center p-6 text-[#1B4332]">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 bg-[#1B4332] text-white px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 shadow-sm">
          <ShieldCheck size={14} className="text-emerald-400" /> Secure Admin Portal
        </div>
        <h1 className="text-3xl font-black text-[#1B4332]">AgriNex Control Center</h1>
        <p className="text-xs text-[#2D6A4F] font-semibold mt-1">
          Authorized personnel only • Dedicated Administrator Login
        </p>
      </div>

      <div className="bg-white p-7 rounded-3xl shadow-md border border-gray-100 max-w-md w-full">
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1 flex items-center gap-1">
              <Mail size={12} className="text-[#2D6A4F]" /> Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sudharsan9001@gmail.com"
              className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-[#1B4332] focus:outline-none focus:border-[#2D6A4F]"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1 flex items-center gap-1">
              <Lock size={12} className="text-[#2D6A4F]" /> Admin Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full p-3.5 pr-11 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-[#1B4332] focus:outline-none focus:border-[#2D6A4F]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2D6A4F] transition-colors p-1"
                aria-label={showPassword ? "Hide admin password" : "Show admin password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1B4332] hover:bg-[#143225] text-white py-4 rounded-full font-black text-xs uppercase tracking-wider shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Verifying Permissions...
              </>
            ) : (
              <>
                <ShieldCheck size={16} /> Authenticate as Admin
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100 text-center text-xs">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 font-bold text-[#2D6A4F] hover:underline"
          >
            <ArrowLeft size={14} /> Back to User Login
          </Link>
        </div>
      </div>
    </div>
  );
}
