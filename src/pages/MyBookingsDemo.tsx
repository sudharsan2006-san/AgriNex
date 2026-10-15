import React, { useState, useEffect } from "react";
import BackButton from "../components/BackButton";

const StatusBadge = ({ status }: { status: string }) => {
    const colors: any = {
        Pending: "bg-yellow-100 text-yellow-800",
        Confirmed: "bg-blue-100 text-blue-800",
        Processing: "bg-purple-100 text-purple-800",
        Completed: "bg-green-100 text-green-800",
        Cancelled: "bg-red-100 text-red-800"
    };
    return <span className={`text-xs font-bold px-3 py-1 rounded-full ${colors[status] || "bg-gray-100"}`}>{status}</span>;
};

export default function MyBookingsDemo() {
    const [bookings, setBookings] = useState<any[]>([]);

    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem("demoBookings") || "[]");
        setBookings(stored);
    }, []);

    return (
        <div className="p-6 pb-20 min-h-screen bg-[#F0F7F4]">
            <BackButton />
            <h1 className="text-xl font-black text-[#1B4332] mb-6">📋 My Demo Bookings</h1>
            <div className="grid gap-4">
                {bookings.map((booking: any, i: number) => (
                    <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="font-bold text-lg text-[#1B4332]">🌾 {booking.crop}</h2>
                            <StatusBadge status={booking.status} />
                        </div>
                        <p className="text-sm"><strong>Booking ID:</strong> {booking.id}</p>
                        <p className="text-sm"><strong>Quantity:</strong> {booking.quantity}</p>
                        <p className="text-sm"><strong>Location:</strong> {booking.location}</p>
                        <p className="text-sm"><strong>Date:</strong> {booking.date}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
