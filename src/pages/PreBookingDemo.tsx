import React, { useState } from "react";
import BackButton from "../components/BackButton";

const CROPS = ["Paddy", "Chilli", "Maize", "Tomato", "Wheat"];

export default function PreBookingDemo() {
    const [selectedCrop, setSelectedCrop] = useState("");
    const [formData, setFormData] = useState({ quantity: "", location: "", date: "" });
    const [confirmation, setConfirmation] = useState<any>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const demoBooking = {
            id: `AGR-DEMO-${Math.floor(Math.random() * 900000 + 100000)}`,
            crop: selectedCrop,
            ...formData,
            status: "Pending",
            date: new Date().toLocaleDateString()
        };
        
        const existing = JSON.parse(localStorage.getItem("demoBookings") || "[]");
        localStorage.setItem("demoBookings", JSON.stringify([...existing, demoBooking]));
        
        setConfirmation(demoBooking);
    }

    if (confirmation) {
        return (
            <div className="p-6">
                <h2 className="text-xl font-black text-[#1B4332] mb-4">🎉 Pre-Booking Successful</h2>
                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-2 mb-6">
                    <p><strong>Booking ID:</strong> {confirmation.id}</p>
                    <p><strong>Crop:</strong> {confirmation.crop}</p>
                    <p><strong>Quantity:</strong> {confirmation.quantity}</p>
                    <p><strong>Location:</strong> {confirmation.location}</p>
                    <p><strong>Status:</strong> 🟡 Pending</p>
                </div>
                <button onClick={() => window.location.href = "/my-bookings-demo"} className="w-full bg-gray-100 text-[#2D6A4F] py-3 rounded-full font-bold mb-2">View My Bookings</button>
                <button onClick={() => window.location.href = "/marketplace"} className="w-full bg-[#2D6A4F] text-white py-3 rounded-full font-bold">Back to Marketplace</button>
            </div>
        )
    }

    return (
        <div className="p-6">
            <BackButton />
            <h1 className="text-[#1B4332] text-xl font-black mb-6">🌾 Pre-Booking (Demo)</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <select className="w-full p-3 border rounded-xl" required onChange={e => setSelectedCrop(e.target.value)}>
                    <option value="">Select Crop</option>
                    {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" placeholder="Quantity" className="w-full p-3 border rounded-xl" required onChange={e => setFormData({...formData, quantity: e.target.value})} />
                <input type="text" placeholder="Preferred Location" className="w-full p-3 border rounded-xl" required onChange={e => setFormData({...formData, location: e.target.value})} />
                <input type="date" className="w-full p-3 border rounded-xl" required onChange={e => setFormData({...formData, date: e.target.value})} />
                <button type="submit" className="w-full bg-[#2D6A4F] text-white py-3 rounded-full font-bold">Confirm Pre-Booking</button>
            </form>
        </div>
    )
}
