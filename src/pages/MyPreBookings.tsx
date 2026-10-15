import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, where, orderBy } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import BackButton from "../components/BackButton";
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
        Cancelled: "bg-gray-100 text-gray-800 border border-gray-300",
    };
    const icons: Record<string, string> = {
        "Pending Admin Approval": "🟡",
        Pending: "🟡",
        Approved: "🟢",
        "In Progress": "🔵",
        "Ready for Delivery": "🟣",
        Completed: "✅",
        Rejected: "🔴",
        Cancelled: "⚪",
    };
    return <span className={`text-xs font-bold px-3 py-1 rounded-full ${colors[status] || "bg-gray-100 text-gray-800"}`}>{icons[status] || "○"} {status}</span>;
};

export default function MyPreBookings() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!auth.currentUser) return;
        const q = query(
            collection(db, "preBookings"), 
            where("userId", "==", auth.currentUser.uid),
            orderBy("createdAt", "desc")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
            setBookings(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="p-6 pb-20 min-h-screen bg-[#F0F7F4]">
            <BackButton />
            <h1 className="text-xl font-black text-[#1B4332] mb-6">📋 My Pre-Bookings</h1>
            
            {loading ? (
                <p>Loading bookings...</p>
            ) : bookings.length === 0 ? (
                <div className="text-center mt-10">
                    <p className="text-gray-500 mb-4">No Pre-Bookings Found</p>
                    <button onClick={() => navigate("/marketplace")} className="bg-[#2D6A4F] text-white py-3 px-6 rounded-full font-bold">Go to Marketplace</button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {bookings.map(booking => (
                        <div key={booking.firebaseId} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                            <h2 className="font-bold text-lg text-[#1B4332]">🌾 {booking.cropName}</h2>
                            <p className="text-xs text-gray-600"><strong>Booking ID:</strong> {booking.bookingId}</p>
                            <p className="text-xs text-gray-600"><strong>Quantity:</strong> {booking.quantity} {booking.quantityUnit}</p>
                            <p className="text-xs text-gray-600"><strong>Reference Price:</strong> ₹{booking.referencePrice} / {booking.priceUnit}</p>
                            <div className="mt-1 mb-2">
                                <StatusBadge status={booking.status} />
                            </div>
                            <button 
                                onClick={() => navigate(`/pre-booking-details/${booking.firebaseId}`)} 
                                className="w-full bg-[#E7F5FF] text-[#2D6A4F] py-1.5 rounded-xl font-bold text-xs"
                            >
                                View Details
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
