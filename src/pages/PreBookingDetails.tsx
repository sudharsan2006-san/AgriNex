import React, { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useParams } from "react-router-dom";
import BackButton from "../components/BackButton";
import { useLanguage } from "../lib/i18n";

const STATUSES = ["Pending", "Confirmed", "Processing", "Completed", "Cancelled"];

export default function PreBookingDetails() {
    const { bookingId } = useParams<{ bookingId: string }>();
    const [booking, setBooking] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const { t, crop, formatDate } = useLanguage();

    useEffect(() => {
        if (!bookingId) return;
        const unsubscribe = onSnapshot(doc(db, "preBookings", bookingId), (doc) => {
            if (doc.exists()) {
                setBooking({ firebaseId: doc.id, ...doc.data() });
            } else {
                setError(t("This booking could not be found."));
            }
        }, () => setError(t("Unable to load this booking. Please try again.")));
        return () => unsubscribe();
    }, [bookingId]);

    if (error) return <div className="p-6 text-red-600">{error}</div>;
    if (!booking) return <div className="p-6">{t("Loading")}</div>;

    const currentStatusIndex = STATUSES.indexOf(booking.status);

    return (
        <div className="p-6 min-h-screen bg-[#F0F7F4]">
            <BackButton />
            <h1 className="text-xl font-black text-[#1B4332] mb-6">{t("Booking Details")}</h1>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-2 mb-6">
                <p><strong>{t("Crop")}:</strong> {crop(booking.cropName)}</p>
                <p><strong>{t("Booking ID")}:</strong> {booking.bookingId}</p>
                <p><strong>{t("Quantity")}:</strong> {booking.quantity} {booking.quantityUnit}</p>
                <p><strong>{t("Reference Price")}:</strong> ₹{booking.referencePrice} / {booking.priceUnit}</p>
                <p><strong>{t("Preferred Location")}:</strong> {booking.preferredLocation}</p>
                <p><strong>{t("Preferred Date")}:</strong> {booking.preferredDate}</p>
                <p><strong>{t("Date")}:</strong> {booking.createdAt ? formatDate(booking.createdAt.toDate()) : "-"}</p>
                <p><strong>{t("Status")}:</strong> {t(booking.status)}</p>
            </div>

            <h2 className="font-bold text-[#1B4332] mb-4">{t("Status Timeline")}</h2>
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#2D6A4F] font-bold">✓ Pre-Booking Created</div>
                {STATUSES.map((status, index) => (
                    <React.Fragment key={status}>
                        <div className="text-gray-400">↓</div>
                        <div className={`flex items-center gap-2 font-bold ${index <= currentStatusIndex ? 'text-[#1B4332]' : 'text-gray-400'}`}>
                            {index <= currentStatusIndex ? '●' : '○'} {t(status)}
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </div>
    )
}
