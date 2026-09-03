import React, { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useParams } from "react-router-dom";
import BackButton from "../components/BackButton";

const STATUSES = ["Pending", "Confirmed", "Processing", "Completed", "Cancelled"];

export default function PreBookingDetails() {
    const { bookingId } = useParams<{ bookingId: string }>();
    const [booking, setBooking] = useState<any>(null);

    useEffect(() => {
        if (!bookingId) return;
        const unsubscribe = onSnapshot(doc(db, "preBookings", bookingId), (doc) => {
            if (doc.exists()) {
                setBooking({ firebaseId: doc.id, ...doc.data() });
            }
        });
        return () => unsubscribe();
    }, [bookingId]);

    if (!booking) return <div className="p-6">Loading...</div>;

    const currentStatusIndex = STATUSES.indexOf(booking.status);

    return (
        <div className="p-6 min-h-screen bg-[#F0F7F4]">
            <BackButton />
            <h1 className="text-xl font-black text-[#1B4332] mb-6">Booking Details</h1>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-2 mb-6">
                <p><strong>Crop:</strong> {booking.cropName}</p>
                <p><strong>Booking ID:</strong> {booking.bookingId}</p>
                <p><strong>Quantity:</strong> {booking.quantity} {booking.quantityUnit}</p>
                <p><strong>Reference Price:</strong> ₹{booking.referencePrice} / {booking.priceUnit}</p>
                <p><strong>Preferred Location:</strong> {booking.preferredLocation}</p>
                <p><strong>Preferred Date:</strong> {booking.preferredDate}</p>
                <p><strong>Booking Date:</strong> {booking.createdAt?.toDate().toLocaleDateString()}</p>
                <p><strong>Status:</strong> {booking.status}</p>
            </div>

            <h2 className="font-bold text-[#1B4332] mb-4">Status Timeline</h2>
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#2D6A4F] font-bold">✓ Pre-Booking Created</div>
                {STATUSES.map((status, index) => (
                    <React.Fragment key={status}>
                        <div className="text-gray-400">↓</div>
                        <div className={`flex items-center gap-2 font-bold ${index <= currentStatusIndex ? 'text-[#1B4332]' : 'text-gray-400'}`}>
                            {index <= currentStatusIndex ? '●' : '○'} {status}
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </div>
    )
}
