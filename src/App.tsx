import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import React from "react";
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
import AdminLogin from "./pages/AdminLogin";
import Signup from "./pages/Signup";
import Records from "./pages/Records";
import Machinery from "./pages/Machinery";
import MyMachineryRequests from "./pages/MyMachineryRequests";
import AdminMachinery from "./pages/AdminMachinery";
import AdminDashboard from "./pages/AdminDashboard";
import AdminGuard from "./components/AdminGuard";
import UserGuard from "./components/UserGuard";

const BottomNav = () => {
  const location = useLocation();
  const navItems = [
    { path: "/user-dashboard", icon: Home, label: "Home" },
    { path: "/monitoring", icon: BarChart3, label: "Monitoring" },
    { path: "/marketplace", icon: ShoppingCart, label: "Market" },
    { path: "/records", icon: Database, label: "Records" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  if (
    location.pathname === "/login" ||
    location.pathname === "/user-login" ||
    location.pathname === "/signup" ||
    location.pathname === "/admin-login" ||
    location.pathname.startsWith("/admin")
  ) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-gray-100 p-4 flex justify-around z-50">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || (item.path === "/user-dashboard" && location.pathname === "/");
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center p-2 ${isActive ? "text-[#2D6A4F]" : "text-gray-400 opacity-60"}`}
          >
            <item.icon size={24} />
            <span className="text-[10px] font-bold uppercase">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#F0F7F4] text-[#1B4332] pb-20">
        <Routes>
          {/* ================= 1. PUBLIC AUTH ENTRY POINTS ================= */}
          <Route path="/user-login" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/admin-login" element={<AdminLogin />} />

          {/* ================= 2. USER PROTECTED DASHBOARD & FEATURES ================= */}
          <Route
            path="/"
            element={
              <UserGuard>
                <Dashboard />
              </UserGuard>
            }
          />
          <Route
            path="/user-dashboard"
            element={
              <UserGuard>
                <Dashboard />
              </UserGuard>
            }
          />
          <Route
            path="/profile"
            element={
              <UserGuard>
                <Profile />
              </UserGuard>
            }
          />
          <Route
            path="/user-profile"
            element={
              <UserGuard>
                <Profile />
              </UserGuard>
            }
          />
          <Route
            path="/my-bookings"
            element={
              <UserGuard>
                <MyBookings />
              </UserGuard>
            }
          />
          <Route
            path="/user-bookings"
            element={
              <UserGuard>
                <MyBookings />
              </UserGuard>
            }
          />
          <Route
            path="/my-pre-bookings"
            element={
              <UserGuard>
                <MyPreBookings />
              </UserGuard>
            }
          />
          <Route
            path="/pre-booking-details/:bookingId"
            element={
              <UserGuard>
                <PreBookingDetails />
              </UserGuard>
            }
          />
          <Route
            path="/records"
            element={
              <UserGuard>
                <Records />
              </UserGuard>
            }
          />
          <Route
            path="/user-reports"
            element={
              <UserGuard>
                <Records />
              </UserGuard>
            }
          />
          <Route
            path="/my-farm-records"
            element={
              <UserGuard>
                <MyFarmRecords />
              </UserGuard>
            }
          />
          <Route
            path="/marketplace"
            element={
              <UserGuard>
                <Marketplace />
              </UserGuard>
            }
          />
          <Route
            path="/market-details/:cropName"
            element={
              <UserGuard>
                <MarketDetails />
              </UserGuard>
            }
          />
          <Route
            path="/pricing"
            element={
              <UserGuard>
                <Pricing />
              </UserGuard>
            }
          />
          <Route
            path="/harvest-booking"
            element={
              <UserGuard>
                <HarvestBooking />
              </UserGuard>
            }
          />
          <Route
            path="/machinery"
            element={
              <UserGuard>
                <Machinery />
              </UserGuard>
            }
          />
          <Route
            path="/my-machinery-requests"
            element={
              <UserGuard>
                <MyMachineryRequests />
              </UserGuard>
            }
          />
          <Route
            path="/ai-recommendation"
            element={
              <UserGuard>
                <AIRecommendation />
              </UserGuard>
            }
          />
          <Route
            path="/crop-recommendation"
            element={
              <UserGuard>
                <CropRecommendation />
              </UserGuard>
            }
          />
          <Route
            path="/weather"
            element={
              <UserGuard>
                <WeatherAlert />
              </UserGuard>
            }
          />
          <Route
            path="/rain-map"
            element={
              <UserGuard>
                <LiveWeatherMap />
              </UserGuard>
            }
          />
          <Route
            path="/soil-status"
            element={
              <UserGuard>
                <SoilStatus />
              </UserGuard>
            }
          />
          <Route
            path="/monitoring"
            element={
              <UserGuard>
                <Monitoring />
              </UserGuard>
            }
          />
          <Route
            path="/iot-device"
            element={
              <UserGuard>
                <IoTTools />
              </UserGuard>
            }
          />
          <Route path="/pre-booking-demo" element={<PreBookingDemo />} />
          <Route path="/my-bookings-demo" element={<MyBookingsDemo />} />

          {/* ================= 3. STRICTLY PROTECTED ADMIN DASHBOARD & SECTIONS ================= */}
          <Route
            path="/admin-dashboard"
            element={
              <AdminGuard>
                <AdminDashboard />
              </AdminGuard>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminDashboard />
              </AdminGuard>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminGuard>
                <AdminDashboard initialSection="users" />
              </AdminGuard>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <AdminGuard>
                <AdminDashboard initialSection="prebookings" />
              </AdminGuard>
            }
          />
          <Route
            path="/admin/prebookings"
            element={
              <AdminGuard>
                <AdminDashboard initialSection="prebookings" />
              </AdminGuard>
            }
          />
          <Route
            path="/admin/machinery"
            element={
              <AdminGuard>
                <AdminDashboard initialSection="machinery" />
              </AdminGuard>
            }
          />
          <Route
            path="/admin/prices"
            element={
              <AdminGuard>
                <AdminDashboard initialSection="prices" />
              </AdminGuard>
            }
          />
          <Route
            path="/admin/retailers"
            element={
              <AdminGuard>
                <AdminDashboard initialSection="retailers" />
              </AdminGuard>
            }
          />
          <Route
            path="/admin/contracts"
            element={
              <AdminGuard>
                <AdminDashboard initialSection="reports" />
              </AdminGuard>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <AdminGuard>
                <AdminDashboard initialSection="reports" />
              </AdminGuard>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <AdminGuard>
                <AdminDashboard initialSection="overview" />
              </AdminGuard>
            }
          />
          <Route
            path="/admin/*"
            element={
              <AdminGuard>
                <AdminDashboard />
              </AdminGuard>
            }
          />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
