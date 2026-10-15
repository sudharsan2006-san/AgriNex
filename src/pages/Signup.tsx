import React, { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { syncUserToFirestore } from "../lib/authHelpers";
import BackButton from "../components/BackButton";
import { validatePassword, PASSWORD_REQUIREMENTS } from "../utils/passwordValidation";
import { API_BASE } from "../lib/apiBase";
import { Eye, EyeOff, CheckCircle2, XCircle, ShieldCheck, AlertCircle } from "lucide-react";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInteractedWithPassword, setHasInteractedWithPassword] = useState(false);
  const navigate = useNavigate();

  // Dynamically compute password validation state as the user types
  const validation = useMemo(() => {
    return validatePassword(password, confirmPassword);
  }, [password, confirmPassword]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasInteractedWithPassword(true);

    // Frontend validation check
    if (!validation.isFormValid) {
      if (!validation.isPasswordValid) {
        setError(`Please satisfy all password complexity requirements: ${validation.failedRequirements.join(", ")}`);
      } else if (!validation.results.match) {
        setError("Passwords do not match in the Password and Confirm Password fields.");
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Validate on the Node.js/Express backend & hash with bcryptjs into MongoDB
      const backendResponse = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          confirmPassword,
        }),
      });

      const backendData = await backendResponse.json();

      if (!backendResponse.ok || !backendData.success) {
        throw new Error(backendData.error || "Backend registration and password validation failed.");
      }

      // 2. Complete Firebase Auth session registration
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      } catch (fbErr: any) {
        // If account already exists in Firebase Auth, inform user clearly
        if (fbErr.code === "auth/email-already-in-use") {
          throw new Error("This email is already registered. Please log in instead.");
        }
        throw fbErr;
      }

      await syncUserToFirestore(userCredential.user, {
        name: name.trim(),
        role: "farmer",
        loginMethod: "email",
      });

      navigate("/user-dashboard", { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      await syncUserToFirestore(userCredential.user, {
        name: userCredential.user.displayName,
        role: "farmer",
        loginMethod: "google",
      });
      navigate("/user-dashboard", { replace: true });
    } catch (err: any) {
      setError(err.message || "Google signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F7F4] flex flex-col justify-center p-6 text-[#1B4332]">
      <div className="max-w-md mx-auto w-full">
        <BackButton />
        <h1 className="text-3xl font-black text-[#1B4332] mb-1">Create Account</h1>
        <p className="text-xs text-[#2D6A4F] font-semibold mb-6">
          Join AgriNex to access smart farm analytics, bookings & tools.
        </p>

        <form onSubmit={handleSignup} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          {/* Full Name */}
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full p-4 border border-gray-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#2D6A4F]"
              required
            />
          </div>

          {/* Email Address */}
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="farmer@agrinex.com"
              className="w-full p-4 border border-gray-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#2D6A4F]"
              required
            />
          </div>

          {/* Password with Show/Hide Toggle */}
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setHasInteractedWithPassword(true);
                }}
                placeholder="Enter a strong password"
                className={`w-full p-4 pr-12 border rounded-2xl text-xs font-semibold focus:outline-none ${
                  hasInteractedWithPassword && !validation.isPasswordValid
                    ? "border-amber-300 focus:border-amber-500"
                    : "border-gray-200 focus:border-[#2D6A4F]"
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2D6A4F] transition-colors p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password with Show/Hide Toggle */}
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setHasInteractedWithPassword(true);
                }}
                placeholder="Re-enter your password"
                className={`w-full p-4 pr-12 border rounded-2xl text-xs font-semibold focus:outline-none ${
                  confirmPassword.length > 0 && !validation.results.match
                    ? "border-rose-300 focus:border-rose-500"
                    : "border-gray-200 focus:border-[#2D6A4F]"
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2D6A4F] transition-colors p-1"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Real-Time Password Requirements Checklist */}
          <div className="mb-5 p-4 bg-[#F8FAF9] rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#1B4332] flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#2D6A4F]" />
                Password Requirements
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  validation.isFormValid
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {validation.isFormValid ? "Strong & Ready" : "Incomplete"}
              </span>
            </div>

            <ul className="space-y-1.5" aria-label="Password requirement checklist">
              {PASSWORD_REQUIREMENTS.map((rule) => {
                const isSatisfied = validation.results[rule.id];
                return (
                  <li
                    key={rule.id}
                    className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
                      isSatisfied ? "text-emerald-700 font-semibold" : "text-gray-500"
                    }`}
                  >
                    {isSatisfied ? (
                      <CheckCircle2
                        size={15}
                        className="text-emerald-600 shrink-0"
                        aria-label={`Requirement met: ${rule.label}`}
                      />
                    ) : (
                      <XCircle
                        size={15}
                        className="text-rose-500 shrink-0"
                        aria-label={`Requirement not met: ${rule.label}`}
                      />
                    )}
                    <span>{rule.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Registration Submit Button */}
          <button
            type="submit"
            disabled={loading || !validation.isFormValid}
            className={`w-full py-4 rounded-full font-bold text-sm tracking-wider uppercase mb-3 shadow-md transition-all flex items-center justify-center gap-2 ${
              validation.isFormValid && !loading
                ? "bg-[#2D6A4F] hover:bg-[#1B4332] text-white cursor-pointer"
                : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-80"
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </button>

          {/* Clear validation message if button is disabled */}
          {!validation.isFormValid && hasInteractedWithPassword && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-xl mb-3 text-center flex items-center justify-center gap-1.5 font-semibold">
              <AlertCircle size={14} className="shrink-0 text-amber-600" />
              Complete all checklist requirements above to enable account creation.
            </p>
          )}

          <button
            type="button"
            onClick={handleGoogleSignup}
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

          {error && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-4 text-center text-xs">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link to="/user-login" className="text-[#2D6A4F] font-bold hover:underline">
                Log in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
