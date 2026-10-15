import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, signOut } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { syncUserToFirestore, isAdminUserEmail } from "../lib/authHelpers";
import { Shield, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetView, setIsResetView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const normalizedEmail = email.trim();
      if (isAdminUserEmail(normalizedEmail)) {
        await signOut(auth);
        setError("Admin accounts must use the dedicated Admin Login portal at /admin-login.");
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      await syncUserToFirestore(userCredential.user, { loginMethod: "email", role: "farmer" });
      navigate("/user-dashboard");
    } catch (err: any) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Invalid email or password.");
      } else if (err.code === "auth/user-not-found") {
        setError("No user account found with this email.");
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || email.trim() === "") {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("Password reset link sent successfully. Please check your email inbox and spam folder.");
      setIsResetView(false);
    } catch (err: any) {
      console.error("Firebase Password Reset Error:", err);
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      if (isAdminUserEmail(userCredential.user.email)) {
        await signOut(auth);
        setError("Admin accounts must use the dedicated Admin Login portal at /admin-login.");
        return;
      }

      await syncUserToFirestore(userCredential.user, {
        name: userCredential.user.displayName,
        loginMethod: "google",
        role: "farmer",
      });
      navigate("/user-dashboard");
    } catch (err: any) {
      setError(err.message || "Google login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F7F4] flex flex-col justify-center p-6 text-[#1B4332]">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-[#1B4332] mb-1">AgriNex</h1>
        <p className="text-base text-[#2D6A4F] font-bold">Farmer & Buyer Portal</p>
        <p className="text-xs text-[#40916C]">Smart Farms • Better Tomorrow</p>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 max-w-md mx-auto w-full">
        {!isResetView ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="farmer@agrinex.com"
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#2D6A4F]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-3.5 pr-11 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#2D6A4F]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2D6A4F] transition-colors p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => setIsResetView(true)}
                className="text-xs text-[#2D6A4F] font-bold hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2D6A4F] hover:bg-[#1B4332] text-white py-3.5 rounded-full font-black text-xs uppercase tracking-wider shadow-md transition-all disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login to AgriNex"}
            </button>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-3.5 rounded-full font-bold text-xs shadow-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Continue with Google
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <h2 className="text-lg font-bold text-[#1B4332]">Reset Password</h2>
            <p className="text-xs text-gray-500">Enter your email address to receive password reset instructions.</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
              className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#2D6A4F]"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2D6A4F] text-white py-3.5 rounded-full font-bold text-xs shadow-md"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <button
              type="button"
              onClick={() => setIsResetView(false)}
              className="w-full py-2 text-gray-500 font-bold text-xs"
            >
              Back to Login
            </button>
          </form>
        )}

        <div className="text-center text-xs mt-6 space-y-2">
          <p className="text-gray-600">
            Don't have an account?{" "}
            <Link to="/signup" className="text-[#2D6A4F] font-bold hover:underline">
              Create Account
            </Link>
          </p>

          <div className="pt-4 mt-4 border-t border-gray-100">
            <Link
              to="/admin-login"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3.5 py-1.5 rounded-full transition-colors"
            >
              <Shield size={12} className="text-amber-700" />
              Administrator Login Portal <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {error && <p className="text-rose-600 mt-4 text-center text-xs font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">{error}</p>}
        {message && <p className="text-emerald-700 mt-4 text-center text-xs font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">{message}</p>}
      </div>
    </div>
  );
}
