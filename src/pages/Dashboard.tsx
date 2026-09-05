import { useNavigate } from "react-router-dom";
import { BotMessageSquare, BarChart3, CloudRain, ShoppingCart, Sprout, Cable, CalendarDays, ClipboardList } from "lucide-react";
import { auth } from "../lib/firebase";
import logoUrl from "../assets/images/agrinex_logo.png";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const features = [
    { name: "AI Advisory", path: "/ai-recommendation", icon: BotMessageSquare },
    { name: "Monitoring", path: "/monitoring", icon: BarChart3 },
    { name: "Rain Prediction", path: "/rain-map", icon: CloudRain },
    { name: "Marketplace", path: "/marketplace", icon: ShoppingCart },
    { name: "Soil Health", path: "/soil-status", icon: Sprout },
    { name: "IoT Tools", path: "/iot-device", icon: Cable },
    { name: "Pre-Booking", path: "/marketplace", icon: CalendarDays },
    { name: "Pre-Booking Status", path: "/my-bookings", icon: ClipboardList },
  ];

  const firstName = user?.displayName?.split(" ")[0];
  const greeting = firstName ? `Welcome, ${firstName}!` : "Welcome, Farmer!";

  return (
    <div className="pb-20">
      {/* Top Header */}
      <div className="p-6 bg-white">
        <div className="text-2xl font-black text-[#2D6A4F]">🌱 AgriNex</div>
        <p className="text-[#1B4332] opacity-80">Smart Farms • Better Tomorrow</p>
      </div>

      {/* Green Hero Section */}
      <div className="bg-[#2D6A4F] p-6 text-white rounded-b-3xl">
        <h1 className="text-3xl font-black leading-tight mb-1">Your Smart Partner<br/>for Better Farming</h1>
        <p className="text-sm text-green-200 font-medium">{greeting}</p>
      </div>

      {/* Feature Grid */}
      <div className="px-6 -mt-8">
        <div className="grid grid-cols-3 gap-3">
          {features.map((f) => (
            <button
              key={f.name}
              onClick={() => navigate(f.path)}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 text-[#1B4332]"
            >
              <f.icon size={28} className="text-[#2D6A4F]" />
              <span className="text-[10px] font-bold text-center">{f.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Image / Branding Section */}
      <div className="p-6">
        <div className="h-48 w-full bg-[#E8F5E9] rounded-3xl overflow-hidden flex items-center justify-center">
          <img
            src={logoUrl}
            alt="AgriNex"
            className="w-full h-full object-contain"
            onError={(e) => {
              const t = e.currentTarget;
              t.style.display = "none";
              const parent = t.parentElement;
              if (parent) {
                parent.innerHTML = `<div style="text-align:center;color:#2D6A4F;font-weight:900;font-size:2.5rem;padding:1rem;">🌱<br/><span style="font-size:1.2rem">AgriNex</span></div>`;
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
