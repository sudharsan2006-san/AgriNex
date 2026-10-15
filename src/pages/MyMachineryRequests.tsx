import React, { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { MachineryRequest, MachineryRequestStatus } from "../types/machinery";
import BackButton from "../components/BackButton";
import NotificationBell from "../components/NotificationBell";
import { Wrench, Calendar, MapPin, Clock, Download, XCircle, CheckCircle2, AlertCircle, FileText, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STATUS_CONFIG: Record<
  MachineryRequestStatus,
  { bg: string; text: string; label: string; icon: string }
> = {
  "Pending Approval": {
    bg: "bg-amber-100 border-amber-200",
    text: "text-amber-800",
    label: "Pending Approval",
    icon: "🟡",
  },
  Approved: {
    bg: "bg-blue-100 border-blue-200",
    text: "text-blue-800",
    label: "Approved",
    icon: "🔵",
  },
  Booked: {
    bg: "bg-emerald-100 border-emerald-200",
    text: "text-emerald-800",
    label: "Booked & Confirmed",
    icon: "🟢",
  },
  Completed: {
    bg: "bg-teal-100 border-teal-200",
    text: "text-teal-800",
    label: "Completed",
    icon: "✅",
  },
  Rejected: {
    bg: "bg-rose-100 border-rose-200",
    text: "text-rose-800",
    label: "Rejected",
    icon: "🔴",
  },
};

export default function MyMachineryRequests() {
  const user = auth.currentUser;
  const navigate = useNavigate();

  const [requests, setRequests] = useState<MachineryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "machineryRequests"),
      where("farmerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: MachineryRequest[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setRequests(list);
        setLoading(false);
      },
      (err) => {
        console.warn("Retrying user machinery requests without composite index:", err);
        const qFallback = query(
          collection(db, "machineryRequests"),
          where("farmerId", "==", user.uid)
        );
        onSnapshot(qFallback, (snap) => {
          const list: MachineryRequest[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));
          list.sort((a: any, b: any) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return timeB - timeA;
          });
          setRequests(list);
          setLoading(false);
        });
      }
    );

    return () => unsub();
  }, [user]);

  const handlePrintSlip = (req: MachineryRequest) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>AgriNex Machinery Request - ${req.requestId}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1B4332; }
            .header { border-bottom: 2px solid #2D6A4F; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 24px; font-weight: 900; color: #2D6A4F; }
            .badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 12px; background: #D8F3DC; color: #2D6A4F; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { text-align: left; padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 14px; }
            th { color: #6B7280; font-size: 12px; text-transform: uppercase; }
            .footer { margin-top: 40px; border-top: 1px dashed #CBD5E1; padding-top: 16px; font-size: 12px; color: #6B7280; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">🌱 AgriNex Machinery Service</div>
              <div style="font-size: 12px; color: #4B5563;">Agricultural Equipment Request Confirmation</div>
            </div>
            <div class="badge">${req.status}</div>
          </div>

          <table>
            <tr><th>Request ID</th><td><strong>${req.requestId}</strong></td></tr>
            <tr><th>Farmer Name</th><td>${req.farmerName} (${req.farmerPhone})</td></tr>
            <tr><th>Machinery</th><td><strong>${req.machineryName}</strong> (${req.machineryType})</td></tr>
            <tr><th>Equipment Provider</th><td>${req.provider}</td></tr>
            <tr><th>Rental Rate</th><td>₹${req.price} / ${req.rateUnit}</td></tr>
            <tr><th>Scheduled Date</th><td><strong>${req.requiredDate}</strong></td></tr>
            <tr><th>Duration</th><td>${req.duration}</td></tr>
            <tr><th>Farming Activity</th><td><strong>${req.activity}</strong></td></tr>
            <tr><th>Farm Location</th><td>${req.farmLocation}</td></tr>
            ${req.contractId ? `<tr><th>Linked Contract</th><td>#${req.contractId} (${req.cropName || "Crop"})</td></tr>` : ""}
            ${req.notes ? `<tr><th>Farmer Notes</th><td>${req.notes}</td></tr>` : ""}
          </table>

          <div class="footer">
            AgriNex Smart Farming Platform • Generated on ${new Date().toLocaleString()}
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-6 pb-24 min-h-screen bg-[#F0F7F4] text-[#1B4332]">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <BackButton />
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/machinery")}
            className="flex items-center gap-1 bg-[#2D6A4F] text-white px-3.5 py-2 rounded-full font-bold text-xs shadow-sm hover:bg-[#1B4332]"
          >
            <Plus size={14} /> Request Machinery
          </button>
          <NotificationBell />
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#1B4332] flex items-center gap-2">
          📋 My Machinery Requests
        </h1>
        <p className="text-xs text-[#2D6A4F] font-semibold mt-0.5">
          Track real-time approval status, schedules, and confirmations for your hired equipment.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100 animate-pulse space-y-3">
              <div className="h-5 bg-gray-200 rounded-md w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded-md w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded-md w-1/4"></div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center shadow-sm max-w-md mx-auto my-8">
          <div className="w-16 h-16 bg-[#F0F7F4] text-[#2D6A4F] rounded-full flex items-center justify-center mx-auto mb-4">
            <Wrench size={32} />
          </div>
          <h3 className="text-lg font-black text-[#1B4332] mb-1">No Machinery Requests Yet</h3>
          <p className="text-xs text-gray-500 mb-6">
            You haven't requested any farm machinery yet. Browse available tractors, harvesters, and tools.
          </p>
          <button
            onClick={() => navigate("/machinery")}
            className="bg-[#2D6A4F] text-white px-6 py-3 rounded-full font-bold text-xs shadow-md hover:bg-[#1B4332]"
          >
            Explore Machinery Catalog
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => {
            const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG["Pending Approval"];

            return (
              <div
                key={req.id}
                className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3 hover:shadow-md transition-shadow"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-[#1B4332]">{req.machineryName}</span>
                      <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {req.machineryType}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                      Request ID: <strong className="text-gray-700">{req.requestId}</strong>
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${statusCfg.bg} ${statusCfg.text}`}
                  >
                    {statusCfg.icon} {statusCfg.label}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-[#F0F7F4] p-3 rounded-2xl border border-[#D8F3DC]">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Scheduled Date</span>
                    <p className="font-bold text-[#1B4332] flex items-center gap-1 mt-0.5">
                      <Calendar size={13} className="text-[#2D6A4F]" /> {req.requiredDate}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Duration</span>
                    <p className="font-bold text-[#1B4332] flex items-center gap-1 mt-0.5">
                      <Clock size={13} className="text-[#2D6A4F]" /> {req.duration}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Farming Activity</span>
                    <p className="font-bold text-[#2D6A4F] mt-0.5 truncate">🌾 {req.activity}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Farm Location</span>
                    <p className="font-bold text-[#1B4332] mt-0.5 truncate flex items-center gap-1">
                      <MapPin size={13} className="text-[#2D6A4F]" /> {req.farmLocation}
                    </p>
                  </div>
                </div>

                {/* Contract Context if available */}
                {req.contractId && (
                  <div className="text-[11px] text-[#2D6A4F] font-semibold bg-white p-2 rounded-xl border border-[#A5D6A7] flex items-center gap-1.5">
                    <span>🌱 Linked Contract: #{req.contractId}</span>
                    {req.cropName && <span>({req.cropName})</span>}
                  </div>
                )}

                {/* Rejection / Admin Notes */}
                {req.status === "Rejected" && req.rejectionReason && (
                  <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    <strong>Reason:</strong> {req.rejectionReason}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="pt-1 flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-gray-500">
                    Rate: <span className="text-[#2D6A4F] font-black">₹{req.price} / {req.rateUnit}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePrintSlip(req)}
                      className="flex items-center gap-1 text-xs font-bold text-[#2D6A4F] bg-[#E8F5E9] hover:bg-[#D8F3DC] px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <Download size={13} /> Print Slip
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
