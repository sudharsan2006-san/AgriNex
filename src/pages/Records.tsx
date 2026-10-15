import React from "react";
import BackButton from "../components/BackButton";
import NotificationBell from "../components/NotificationBell";
import { useNavigate } from "react-router-dom";
import { Wrench, Database, CalendarDays, Shield, ChevronRight, Sprout } from "lucide-react";

export default function Records() {
  const navigate = useNavigate();

  const recordSections = [
    {
      title: "Machinery Requests",
      desc: "Track status, schedules, and approvals for tractors, harvesters & tools",
      path: "/my-machinery-requests",
      icon: Wrench,
      badge: "Active",
      badgeColor: "bg-emerald-100 text-emerald-800",
    },
    {
      title: "Pre-Booking Records",
      desc: "View harvest crop reservations, quantities, and confirmation PDF reports",
      path: "/my-bookings",
      icon: CalendarDays,
      badge: "Bookings",
      badgeColor: "bg-blue-100 text-blue-800",
    },
    {
      title: "Field & Crop History",
      desc: "Review past cultivation records, yield batches, and farm activities",
      path: "/my-farm-records",
      icon: Database,
      badge: "Farm Logs",
      badgeColor: "bg-purple-100 text-purple-800",
    },
    {
      title: "Admin Machinery Control",
      desc: "Manage fleet inventory, resolve schedule overlaps, and review farmer requests",
      path: "/admin/machinery",
      icon: Shield,
      badge: "Admin",
      badgeColor: "bg-amber-100 text-amber-800",
    },
  ];

  return (
    <div className="p-6 pb-24 min-h-screen bg-[#F0F7F4] text-[#1B4332]">
      <div className="flex items-center justify-between mb-4">
        <BackButton />
        <NotificationBell />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#1B4332]">🗂️ Farm Records & Requests</h1>
        <p className="text-xs text-[#2D6A4F] font-semibold mt-0.5">
          Access your farm bookings, machinery requests, crop logs, and administrative controls.
        </p>
      </div>

      <div className="grid gap-3">
        {recordSections.map((sec) => (
          <button
            key={sec.title}
            onClick={() => navigate(sec.path)}
            className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F0F7F4] text-[#2D6A4F] flex items-center justify-center group-hover:bg-[#2D6A4F] group-hover:text-white transition-colors shrink-0">
                <sec.icon size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-[#1B4332] text-sm group-hover:text-[#2D6A4F] transition-colors">
                    {sec.title}
                  </h3>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${sec.badgeColor}`}>
                    {sec.badge}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 max-w-sm line-clamp-1">{sec.desc}</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400 group-hover:text-[#2D6A4F] group-hover:translate-x-1 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
}
