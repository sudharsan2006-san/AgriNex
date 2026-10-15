import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useNavigate } from "react-router-dom";

interface Props {
  children: React.ReactNode;
}

export default function UserGuard({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          setIsAuthenticated(false);
          setLoading(false);
          navigate("/login", { replace: true });
          return;
        }

        setAuthError(false);
        setIsAuthenticated(true);
        setLoading(false);
      },
      (error) => {
        console.error("Unable to verify the authenticated user:", error);
        setAuthError(true);
        setIsAuthenticated(false);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F7F4] flex flex-col items-center justify-center p-6 text-[#1B4332]">
        <div className="w-10 h-10 border-4 border-[#2D6A4F] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-xs uppercase tracking-wider text-[#2D6A4F]">Loading AgriNex...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-[#F0F7F4] flex flex-col items-center justify-center p-6 text-[#1B4332]">
        <p className="font-bold text-center">We could not verify your session.</p>
        <button
          onClick={() => navigate("/login", { replace: true })}
          className="mt-4 bg-[#2D6A4F] text-white px-6 py-3 rounded-full font-bold"
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
