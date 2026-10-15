import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, where, orderBy } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { getFirebaseAuthHeaders } from "../lib/authHelpers";
import { API_BASE } from "../lib/apiBase";
import BackButton from "../components/BackButton";
import { Download, FileText, Calendar, MapPin, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    "Pending Admin Approval": "bg-amber-100 text-amber-900 border border-amber-300",
    Pending: "bg-amber-100 text-amber-900 border border-amber-300",
    Approved: "bg-emerald-100 text-emerald-900 border border-emerald-300",
    "In Progress": "bg-blue-100 text-blue-900 border border-blue-300",
    "Ready for Delivery": "bg-purple-100 text-purple-900 border border-purple-300",
    Completed: "bg-teal-100 text-teal-900 border border-teal-300",
    Rejected: "bg-rose-100 text-rose-900 border border-rose-300",
  };

  const icons: Record<string, string> = {
    "Pending Admin Approval": "🟡",
    Pending: "🟡",
    Approved: "🟢",
    "In Progress": "🔵",
    "Ready for Delivery": "🟣",
    Completed: "✅",
    Rejected: "🔴",
  };

  return (
    <span className={`text-xs font-bold px-3 py-1 rounded-full ${colors[status] || "bg-gray-100 text-gray-800"}`}>
      {icons[status] || "○"} {status}
    </span>
  );
};

export default function MyBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, "preBookings"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newBookings: any[] = snapshot.docs.map((d) => ({
          firebaseId: d.id,
          ...d.data(),
        }));
        setBookings(newBookings);
        setLoading(false);
      },
      (err) => {
        console.warn("[MyBookings] Real-time snapshot notice:", err);
        // Fallback without ordering in case index is creating
        const qFallback = query(collection(db, "preBookings"), where("userId", "==", auth.currentUser?.uid));
        onSnapshot(qFallback, (snap) => {
          const fallbackList = snap.docs.map((d) => ({ firebaseId: d.id, ...d.data() }));
          setBookings(fallbackList);
          setLoading(false);
        });
      }
    );

    return () => unsubscribe();
  }, []);

  const downloadReport = async (booking: any) => {
    setDownloadingId(booking.bookingId);
    try {
      const response = await fetch(`${API_BASE}/api/prebooking-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...await getFirebaseAuthHeaders() },
        body: JSON.stringify({
          bookingData: {
            bookingId: booking.bookingId,
            userName: booking.userName,
            userEmail: booking.userEmail,
            mobileNumber: booking.mobileNumber,
            cropName: booking.cropName,
            quantity: booking.quantity,
            quantityUnit: booking.quantityUnit || booking.priceUnit || "kg",
            referencePrice: booking.referencePrice,
            estimatedValue: booking.estimatedValue,
            bookingDate: booking.createdAt?.toDate?.().toLocaleDateString?.() || new Date().toLocaleDateString(),
            status: booking.status,
            preferredLocation: booking.preferredLocation,
            notes: booking.notes,
          },
        }),
      });

      if (!response.ok) throw new Error("Report generation failed.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `AgriNex_PreBooking_${booking.bookingId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[MyBookings] PDF download error:", error);
      alert("Failed to download report. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="p-6 pb-24 min-h-screen bg-[#F0F7F4] text-[#1B4332]">
      <BackButton />
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#1B4332] mb-1">📋 My Harvest Pre-Bookings</h1>
        <p className="text-xs text-[#2D6A4F] font-semibold">
          Track real-time administrative approvals, crop allocations, and official confirmation reports.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="w-8 h-8 border-3 border-[#2D6A4F] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-bold text-gray-500">Loading your reservations...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl border border-gray-100 text-center shadow-sm">
          <FileText size={36} className="mx-auto text-gray-400 mb-2" />
          <p className="font-bold text-gray-700 text-sm mb-1">No Pre-Bookings Found</p>
          <p className="text-xs text-gray-500 mb-4">You have not submitted any harvest pre-bookings yet.</p>
          <button
            onClick={() => navigate("/marketplace")}
            className="bg-[#2D6A4F] hover:bg-[#1B4332] text-white py-2.5 px-6 rounded-full font-bold text-xs shadow-md transition-all"
          >
            Explore Marketplace
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => {
            const isApproved = booking.status === "Approved";
            const isPending =
              booking.status === "Pending" || booking.status === "Pending Admin Approval";

            return (
              <div
                key={booking.firebaseId}
                className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3 hover:shadow-md transition-all"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-black text-lg text-[#1B4332]">🌾 {booking.cropName}</h2>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                      Booking ID: <strong>{booking.bookingId}</strong>
                    </p>
                  </div>
                  <StatusBadge status={booking.status} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-[#F0F7F4] p-3 rounded-2xl border border-[#D8F3DC]">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Reserved Qty</span>
                    <p className="font-black text-[#1B4332] mt-0.5">
                      {booking.quantity} {booking.quantityUnit || booking.priceUnit || "kg"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Reference Price</span>
                    <p className="font-bold text-[#2D6A4F] mt-0.5">
                      ₹{booking.referencePrice} / {booking.priceUnit || "kg"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Est. Total Value</span>
                    <p className="font-black text-[#1B4332] mt-0.5">
                      ₹{(booking.estimatedValue || Number(booking.quantity) * Number(booking.referencePrice) || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 pt-1 gap-2">
                  <span className="flex items-center gap-1 font-semibold">
                    <MapPin size={13} className="text-[#2D6A4F]" /> {booking.preferredLocation || "Tamil Nadu"}
                  </span>
                  <span className="flex items-center gap-1 font-semibold">
                    <Calendar size={13} className="text-[#2D6A4F]" /> Harvest Date: {booking.preferredDate || "Flexible"}
                  </span>
                </div>

                {isPending && (
                  <p className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl p-2.5">
                    ⏳ Status is under administrative review. You will receive your official report once approved.
                  </p>
                )}

                {isApproved && (
                  <p className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5 flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    Approved & confirmed by Administrator. Official report generated and emailed to your account.
                  </p>
                )}

                <div className="pt-2 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => downloadReport(booking)}
                    disabled={downloadingId === booking.bookingId}
                    className="flex-1 bg-[#2D6A4F] hover:bg-[#1B4332] text-white py-2.5 rounded-full font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-60"
                  >
                    <Download size={14} />
                    {downloadingId === booking.bookingId ? "Generating PDF..." : "Download Official PDF Report"}
                  </button>
                  <button
                    onClick={() => navigate(`/pre-booking-details/${booking.firebaseId}`)}
                    className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-full font-bold text-xs transition-all"
                  >
                    View Timeline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
