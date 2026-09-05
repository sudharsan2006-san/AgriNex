import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, where, orderBy } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import BackButton from "../components/BackButton";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../lib/i18n";

const StatusBadge = ({ status, label }: { status: string; label: string }) => {
    const colors: any = {
        Pending: "bg-yellow-100 text-yellow-800",
        Confirmed: "bg-blue-100 text-blue-800",
        Processing: "bg-purple-100 text-purple-800",
        Completed: "bg-green-100 text-green-800",
        Cancelled: "bg-red-100 text-red-800"
    };
    const icons: any = {
        Pending: "🟡",
        Confirmed: "🔵",
        Processing: "🟣",
        Completed: "🟢",
        Cancelled: "🔴"
    };
    return <span className={`text-xs font-bold px-3 py-1 rounded-full ${colors[status] || "bg-gray-100"}`}>{icons[status] || "○"} {label}</span>;
};

export default function MyPreBookings() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { t, crop } = useLanguage();

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
        }, () => setLoading(false));
        return () => unsubscribe();
    }, []);

    return (
        <div className="p-6 pb-20 min-h-screen bg-[#F0F7F4]">
            <BackButton />
            <h1 className="text-xl font-black text-[#1B4332] mb-6">📋 {t("My Pre-Bookings")}</h1>

            {loading ? (
                <p>{t("Loading bookings...")}</p>
            ) : bookings.length === 0 ? (
                <div className="text-center mt-10">
                    <p className="text-gray-500 mb-4">{t("No pre-bookings found.")}</p>
                    <button onClick={() => navigate("/marketplace")} className="bg-[#2D6A4F] text-white py-3 px-6 rounded-full font-bold">{t("Marketplace")}</button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {bookings.map(booking => (
                        <div key={booking.firebaseId} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                            <h2 className="font-bold text-lg text-[#1B4332]">🌾 {crop(booking.cropName)}</h2>
                            <p className="text-xs text-gray-600"><strong>{t("Booking ID")}:</strong> {booking.bookingId}</p>
                            <p className="text-xs text-gray-600"><strong>{t("Quantity")}:</strong> {booking.quantity} {booking.quantityUnit}</p>
                            <p className="text-xs text-gray-600"><strong>{t("Reference Price")}:</strong> ₹{booking.referencePrice} / {booking.priceUnit}</p>
                            <div className="mt-1 mb-2">
                                <StatusBadge status={booking.status} label={t(booking.status)} />
                            </div>
                            <button
                                onClick={() => navigate(`/pre-booking-details/${booking.firebaseId}`)}
                                className="w-full bg-[#E7F5FF] text-[#2D6A4F] py-1.5 rounded-xl font-bold text-xs"
                            >
                                {t("View Details")}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
