import React from "react";
import { X, MapPin, Phone, ShieldCheck, Zap, Gauge, Fuel, Calendar, Clock, Wrench } from "lucide-react";
import { MachineryItem } from "../types/machinery";

interface Props {
  machinery: MachineryItem;
  onClose: () => void;
  onRequest: (machinery: MachineryItem) => void;
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  Available: { bg: "bg-emerald-100", text: "text-emerald-800", label: "🟢 Available Now" },
  Booked: { bg: "bg-amber-100", text: "text-amber-800", label: "🟡 Currently Booked" },
  Maintenance: { bg: "bg-purple-100", text: "text-purple-800", label: "🟣 In Maintenance" },
  Unavailable: { bg: "bg-rose-100", text: "text-rose-800", label: "🔴 Unavailable" },
};

export default function MachineryDetailsModal({ machinery, onClose, onRequest }: Props) {
  const statusCfg = STATUS_BADGE[machinery.status] || STATUS_BADGE.Available;
  const isAvailable = machinery.status === "Available";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header Image / Placeholder */}
        <div className="relative h-52 bg-slate-900 overflow-hidden">
          {machinery.imageUrl ? (
            <img
              src={machinery.imageUrl}
              alt={machinery.name}
              className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2D6A4F] to-[#1B4332] text-white">
              <Wrench size={48} className="opacity-40" />
            </div>
          )}
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-colors"
          >
            <X size={18} />
          </button>

          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/95 text-[#1B4332] shadow-sm">
              🚜 {machinery.type}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${statusCfg.bg} ${statusCfg.text}`}>
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-2xl font-black text-[#1B4332] leading-tight">{machinery.name}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-600">
              <span className="flex items-center gap-1 font-semibold text-[#2D6A4F]">
                <MapPin size={14} /> {machinery.location}, Tamil Nadu
              </span>
              <span>•</span>
              <span className="font-semibold text-gray-700">Provider: {machinery.provider}</span>
            </div>
          </div>

          {/* Pricing Highlight Banner */}
          <div className="bg-[#F0F7F4] p-4 rounded-2xl border border-[#D8F3DC] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Rental Rate</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-[#2D6A4F]">₹{machinery.price.toLocaleString()}</span>
                <span className="text-xs font-bold text-gray-600">/ {machinery.rateUnit}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2D6A4F] bg-white px-2.5 py-1 rounded-lg border border-[#A5D6A7]">
                <ShieldCheck size={14} /> AgriNex Verified
              </span>
            </div>
          </div>

          {/* Specifications Grid */}
          <div>
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2.5">Specifications</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {machinery.horsePower && (
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
                  <Zap size={16} className="text-[#2D6A4F]" />
                  <div>
                    <p className="text-gray-400 font-bold text-[10px] uppercase">Power</p>
                    <p className="font-bold text-[#1B4332]">{machinery.horsePower}</p>
                  </div>
                </div>
              )}
              {machinery.capacity && (
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
                  <Gauge size={16} className="text-[#2D6A4F]" />
                  <div>
                    <p className="text-gray-400 font-bold text-[10px] uppercase">Capacity</p>
                    <p className="font-bold text-[#1B4332] truncate">{machinery.capacity}</p>
                  </div>
                </div>
              )}
              {machinery.fuelType && (
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
                  <Fuel size={16} className="text-[#2D6A4F]" />
                  <div>
                    <p className="text-gray-400 font-bold text-[10px] uppercase">Drive Type</p>
                    <p className="font-bold text-[#1B4332]">{machinery.fuelType}</p>
                  </div>
                </div>
              )}
              {machinery.modelYear && (
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
                  <Calendar size={16} className="text-[#2D6A4F]" />
                  <div>
                    <p className="text-gray-400 font-bold text-[10px] uppercase">Model Year</p>
                    <p className="font-bold text-[#1B4332]">{machinery.modelYear}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-1.5">Overview</h3>
            <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-2xl border border-gray-100">
              {machinery.description}
            </p>
          </div>

          {/* Provider Contact (if available) */}
          {machinery.providerPhone && (
            <div className="flex items-center justify-between text-xs bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <span className="text-gray-600 font-medium">Provider Assistance Hotline</span>
              <a
                href={`tel:${machinery.providerPhone}`}
                className="font-bold text-[#2D6A4F] flex items-center gap-1 hover:underline"
              >
                <Phone size={13} /> {machinery.providerPhone}
              </a>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-full font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
            >
              Close
            </button>
            <button
              onClick={() => onRequest(machinery)}
              disabled={!isAvailable}
              className={`flex-1 py-3.5 rounded-full font-black text-sm tracking-wide shadow-md transition-all ${
                isAvailable
                  ? "bg-[#2D6A4F] text-white hover:bg-[#1B4332] active:scale-[0.98]"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isAvailable ? "Request Machinery" : "Currently Unavailable"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
