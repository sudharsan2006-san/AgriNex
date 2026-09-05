/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
import { Home, CloudRain, Sprout, ShoppingCart, User, BotMessageSquare, MapPin, BarChart3, Database, Cable } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import AIRecommendation from "./pages/AIRecommendation";
import WeatherAlert from "./pages/WeatherAlert";
import CropRecommendation from "./pages/CropRecommendation";
import HarvestBooking from "./pages/HarvestBooking";
import Profile from "./pages/Profile";
import LiveWeatherMap from "./pages/LiveWeatherMap";
import SoilStatus from "./pages/SoilStatus";
import Monitoring from "./pages/Monitoring";
import Marketplace from "./pages/Marketplace";
import MarketDetails from "./pages/MarketDetails";
import MyBookings from "./pages/MyBookings";
import IoTTools from "./pages/IoTTools";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Records from "./pages/Records";
import VoiceAssistant from "./components/VoiceAssistant";
import NotificationBell from "./components/NotificationBell";

const VoiceAssistantWrapper = () => {
  const location = useLocation();
  if (location.pathname === "/login" || location.pathname === "/signup") return null;
  return <VoiceAssistant />;
};

// Persistent top bar with notification bell — visible on all authenticated pages
const TopBar = () => {
  const location = useLocation();
  if (location.pathname === "/login" || location.pathname === "/signup") return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-xs flex items-center justify-between px-4 py-2">
      <span className="text-sm font-black text-[#2D6A4F]">🌱 AgriNex</span>
      <NotificationBell />
    </div>
  );
};

const BottomNav = () => {
  const location = useLocation();
  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/monitoring", icon: BarChart3, label: "Monitoring" },
    { path: "/marketplace", icon: ShoppingCart, label: "Market" },
    { path: "/records", icon: Database, label: "Records" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  if (location.pathname === "/login" || location.pathname === "/signup") return null;

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-gray-100 p-4 flex justify-around z-50">
      {navItems.map((item) => (
        <Link 
          key={item.path} 
          to={item.path} 
          className={`flex flex-col items-center p-2 ${location.pathname === item.path ? "text-[#2D6A4F]" : "text-gray-400 opacity-60"}`}
        >
          <item.icon size={24} />
          <span className="text-[10px] font-bold uppercase">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState(null as any);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (!user && location.pathname !== "/login" && location.pathname !== "/signup") {
        navigate("/login");
      } else if (user && (location.pathname === "/login" || location.pathname === "/signup")) {
        navigate("/");
      }
    });
  }, [navigate, location.pathname]);

  if (loading) return <div className="p-6">Loading...</div>;

  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#F0F7F4] text-[#1B4332] pb-20 pt-12">
        <AuthGuard>
          <TopBar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/rain-map" element={<LiveWeatherMap />} />
            <Route path="/ai-recommendation" element={<AIRecommendation />} />
            <Route path="/soil-status" element={<SoilStatus />} />
            <Route path="/weather" element={<WeatherAlert />} />
            <Route path="/crop-recommendation" element={<CropRecommendation />} />
            <Route path="/harvest-booking" element={<HarvestBooking />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/market-details/:cropName" element={<MarketDetails />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/iot-device" element={<IoTTools />} />
            <Route path="/records" element={<Records />} />
          </Routes>
        </AuthGuard>
        <VoiceAssistantWrapper />
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
