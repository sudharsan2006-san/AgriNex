import React, { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getFirebaseAuthHeaders } from "../lib/authHelpers";
import { API_BASE } from "../lib/apiBase";
import { useParams } from "react-router-dom";
import BackButton from "../components/BackButton";

const STATUSES = ["Pending Admin Approval", "Approved", "In Progress", "Ready for Delivery", "Completed"];

export default function PreBookingDetails() {
    const { bookingId } = useParams<{ bookingId: string }>();
    const [booking, setBooking] = useState<any>(null);
    const [reportLoading, setReportLoading] = useState(false);

    useEffect(() => {
        if (!bookingId) return;
        const unsubscribe = onSnapshot(doc(db, "preBookings", bookingId), (doc) => {
            if (doc.exists()) {
                setBooking({ firebaseId: doc.id, ...doc.data() });
            }
        });
        return () => unsubscribe();
    }, [bookingId]);

    const downloadReport = async () => {
        if (!booking) return;
        setReportLoading(true);
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
                        quantityUnit: booking.quantityUnit,
                        referencePrice: booking.referencePrice,
                        estimatedValue: booking.estimatedValue,
                        bookingDate: booking.createdAt?.toDate?.().toLocaleDateString(),
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
            console.error("Booking report download error:", error);
        } finally {
            setReportLoading(false);
        }
    };

    if (!booking) return <div className="p-6">Loading...</div>;

    const normalizedStatus = booking.status === "Pending" ? "Pending Admin Approval" : booking.status === "Confirmed" ? "Approved" : booking.status;
    const currentStatusIndex = STATUSES.indexOf(normalizedStatus);
    const isRejected = normalizedStatus === "Rejected";

    return (
        <div className="p-6 min-h-screen bg-[#F0F7F4]">
            <BackButton />
            <h1 className="text-xl font-black text-[#1B4332] mb-6">Booking Details</h1>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-2 mb-6">
                <p><strong>Crop:</strong> {booking.cropName}</p>
                <p><strong>Booking ID:</strong> {booking.bookingId}</p>
                <p><strong>Quantity:</strong> {booking.quantity} {booking.quantityUnit || "kg"}</p>
                <p><strong>Reference Price:</strong> ₹{booking.referencePrice} / {booking.priceUnit || "kg"}</p>
                <p><strong>Preferred Location:</strong> {booking.preferredLocation || "Tamil Nadu"}</p>
                <p><strong>Preferred Date:</strong> {booking.preferredDate || "Flexible"}</p>
                <p><strong>Booking Date:</strong> {booking.createdAt?.toDate?.().toLocaleDateString() || "Recent"}</p>
                <p><strong>Status:</strong> <span className={`font-bold ${isRejected ? 'text-rose-600' : 'text-[#2D6A4F]'}`}>{booking.status}</span></p>
                {booking.rejectionReason && (
                    <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 mt-2">
                        <strong>Reason:</strong> {booking.rejectionReason}
                    </p>
                )}
            </div>
            <button onClick={downloadReport} disabled={reportLoading} className="w-full bg-[#2D6A4F] text-white py-3 rounded-full font-bold mb-6">
                {reportLoading ? "Preparing Report..." : "Download Booking Report"}
            </button>

            <h2 className="font-bold text-[#1B4332] mb-4">Status Timeline</h2>
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#2D6A4F] font-bold">✓ Pre-Booking Created</div>
                {isRejected ? (
                    <>
                        <div className="text-gray-400">↓</div>
                        <div className="flex items-center gap-2 font-bold text-rose-600">● Rejected</div>
                    </>
                ) : (
                    STATUSES.map((status, index) => (
                        <React.Fragment key={status}>
                            <div className="text-gray-400">↓</div>
                            <div className={`flex items-center gap-2 font-bold ${index <= currentStatusIndex ? 'text-[#1B4332]' : 'text-gray-400'}`}>
                                {index <= currentStatusIndex ? '●' : '○'} {status}
                            </div>
                        </React.Fragment>
                    ))
                )}
            </div>
        </div>
    );
}
