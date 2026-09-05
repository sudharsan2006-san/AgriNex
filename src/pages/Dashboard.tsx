import { useNavigate } from "react-router-dom";
import { BotMessageSquare, BarChart3, CloudRain, ShoppingCart, Sprout, Cable, CalendarDays } from "lucide-react";
import { useLanguage } from "../lib/i18n";

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const features = [
    { name: t("AI Advisory"), path: "/ai-recommendation", icon: BotMessageSquare },
    { name: t("Monitoring"), path: "/monitoring", icon: BarChart3 },
    { name: t("Rain Prediction"), path: "/rain-map", icon: CloudRain },
    { name: t("Marketplace"), path: "/marketplace", icon: ShoppingCart },
    { name: t("Soil Health"), path: "/soil-status", icon: Sprout },
    { name: t("IoT Tools"), path: "/iot-device", icon: Cable },
    { name: t("Pre-Booking"), path: "/marketplace", icon: CalendarDays },
  ];

  return (
    <div className="pb-20">
      {/* Top Header */}
      <div className="p-6 bg-white">
        <div className="text-2xl font-black text-[#2D6A4F]">🌱 AgriNex</div>
        <p className="text-[#1B4332] opacity-80">{t("Smart Farms • Better Tomorrow")}</p>
      </div>

      {/* Green Hero Section */}
      <div className="bg-[#2D6A4F] p-6 text-white rounded-b-3xl">
        <h1 className="text-3xl font-black leading-tight mb-2">{t("Your Smart Partner")}<br />{t("for Better Farming")}</h1>
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

      {/* Bottom Agriculture Visual Section */}
      <div className="p-6">
        <div className="relative h-64 w-full bg-[#E8F5E9] rounded-3xl overflow-hidden flex flex-col items-center justify-center border border-[#A5D6A7]">
          {/* AgriNex Logo/Image */}
          <img
            src="https://lh3.googleusercontent.com/d/1ofiq5ADeNboiVIdyXrWDn2NwdtqtD18g"
            alt="AgriNex"
            className="w-32 h-32 object-contain mb-4"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const parent = e.target.parentElement;
              if (parent) {
                const placeholder = document.createElement('div');
                placeholder.innerText = 'AgriNex';
                placeholder.className = 'text-3xl font-black text-[#2D6A4F]';
                parent.prepend(placeholder);
              }
            }}
          />

          {/* Animated Agriculture Scene Placeholder */}
          <div className="absolute bottom-0 w-full h-24 overflow-hidden">
            {/* Subtle animated elements (CSS classes) */}
            <div className="absolute bottom-0 w-full h-1 bg-[#2D6A4F]/20"></div>
            <div className="absolute bottom-2 left-10 animate-pulse text-2xl">🌱</div>
            <div className="absolute bottom-1 right-10 animate-bounce text-2xl">🚜</div>
          </div>

          <p className="text-[#2D6A4F] font-bold mt-2">{t("Smart Farms • Better Tomorrow")}</p>
        </div>
      </div>
    </div>
  );
}
