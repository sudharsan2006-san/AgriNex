import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Lock } from "lucide-react";
import { isAdminUserEmail, ADMIN_EMAIL } from "../lib/authHelpers";

interface Props {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        setIsAdmin(false);
        navigate("/admin-login", { replace: true });
        return;
      }

      const isAuthorizedAdmin = isAdminUserEmail(user.email);
      setIsAdmin(isAuthorizedAdmin);
      setLoading(false);

      if (!isAuthorizedAdmin) {
        console.warn(`[AdminGuard] Access denied for UID: ${user.uid} (${user.email})`);
        navigate("/user-dashboard", { replace: true });
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F7F4] flex flex-col items-center justify-center p-6 text-[#1B4332]">
        <div className="w-10 h-10 border-4 border-[#2D6A4F] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-xs uppercase tracking-wider text-[#2D6A4F]">Verifying Admin Authorization...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F0F7F4] flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-lg text-center max-w-sm">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={34} />
          </div>
          <h2 className="text-xl font-black text-[#1B4332] mb-2">Admin Access Restricted</h2>
          <p className="text-xs text-gray-600 mb-6 leading-relaxed">
            Admin access is strictly restricted to the authorized administrator account: <span className="font-mono font-bold text-[#1B4332]">{ADMIN_EMAIL}</span>.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => navigate("/user-dashboard", { replace: true })}
              className="w-full bg-[#2D6A4F] hover:bg-[#1B4332] text-white py-3 rounded-full font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <ArrowLeft size={16} /> Return to User Dashboard
            </button>
            <button
              onClick={() => navigate("/admin-login", { replace: true })}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-full font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Lock size={14} /> Switch to Admin Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
