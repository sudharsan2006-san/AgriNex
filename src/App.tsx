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
import Pricing from "./pages/Pricing";
import MarketDetails from "./pages/MarketDetails";
import PreBookingDemo from "./pages/PreBookingDemo";
import MyBookingsDemo from "./pages/MyBookingsDemo";
import MyPreBookings from "./pages/MyPreBookings";
import PreBookingDetails from "./pages/PreBookingDetails";
import MyBookings from "./pages/MyBookings";
import MyFarmRecords from "./pages/MyFarmRecords";
import IoTTools from "./pages/IoTTools";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import Records from "./pages/Records";
import { LanguageProvider, LanguageSwitcher, useLanguage } from "./lib/i18n";

const BottomNav = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navItems = [
    { path: "/", icon: Home, label: t("Home") },
    { path: "/monitoring", icon: BarChart3, label: t("Monitoring") },
    { path: "/marketplace", icon: ShoppingCart, label: t("Market") },
    { path: "/records", icon: Database, label: t("Records") },
    { path: "/profile", icon: User, label: t("Profile") },
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
  const { t } = useLanguage();
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

  if (loading) return <div className="p-6">{t("Loading")}</div>;

  return children;
};

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#F0F7F4] text-[#1B4332] pb-20">
          <div className="fixed top-3 right-4 z-[2000] bg-white/95 px-3 py-2 rounded-full shadow-sm"><LanguageSwitcher /></div>
          <AuthGuard>
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
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/pre-booking-demo" element={<PreBookingDemo />} />
              <Route path="/my-bookings-demo" element={<MyBookingsDemo />} />
              <Route path="/market-details/:cropName" element={<MarketDetails />} />
              <Route path="/my-pre-bookings" element={<MyPreBookings />} />
              <Route path="/pre-booking-details/:bookingId" element={<PreBookingDetails />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/my-farm-records" element={<MyFarmRecords />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/iot-device" element={<IoTTools />} />

              <Route path="/records" element={<Records />} />
            </Routes>
          </AuthGuard>
          <BottomNav />
        </div>
      </BrowserRouter>
    </LanguageProvider>
  );
}
