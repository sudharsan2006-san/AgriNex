import React, { useState } from "react";
import BackButton from "../components/BackButton";
import { useLanguage } from "../lib/i18n";

const CROPS = ["Paddy", "Chilli", "Maize", "Tomato", "Wheat"];

export default function PreBookingDemo() {
    const [selectedCrop, setSelectedCrop] = useState("");
    const [formData, setFormData] = useState({ quantity: "", location: "", date: "" });
    const [confirmation, setConfirmation] = useState<any>(null);
    const { t, crop } = useLanguage();

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
                <h2 className="text-xl font-black text-[#1B4332] mb-4">🎉 {t("Pre-Booking Confirmed")}</h2>
                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-2 mb-6">
                    <p><strong>{t("Booking ID")}:</strong> {confirmation.id}</p>
                    <p><strong>{t("Crop")}:</strong> {crop(confirmation.crop)}</p>
                    <p><strong>{t("Quantity")}:</strong> {confirmation.quantity}</p>
                    <p><strong>{t("Location")}:</strong> {confirmation.location}</p>
                    <p><strong>{t("Status")}:</strong> 🟡 {t("Pending")}</p>
                </div>
                <button onClick={() => window.location.href = "/my-bookings-demo"} className="w-full bg-gray-100 text-[#2D6A4F] py-3 rounded-full font-bold mb-2">{t("My Bookings")}</button>
                <button onClick={() => window.location.href = "/marketplace"} className="w-full bg-[#2D6A4F] text-white py-3 rounded-full font-bold">{t("Back to Marketplace")}</button>
            </div>
        )
    }

    return (
        <div className="p-6">
            <BackButton />
            <h1 className="text-[#1B4332] text-xl font-black mb-6">🌾 {t("Pre-Booking")}</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <select className="w-full p-3 border rounded-xl" required onChange={e => setSelectedCrop(e.target.value)}>
                    <option value="">{t("Crop")}</option>
                    {CROPS.map(c => <option key={c} value={c}>{crop(c)}</option>)}
                </select>
                <input type="number" placeholder={t("Quantity")} className="w-full p-3 border rounded-xl" required onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
                <input type="text" placeholder={t("Preferred Location")} className="w-full p-3 border rounded-xl" required onChange={e => setFormData({ ...formData, location: e.target.value })} />
                <input type="date" className="w-full p-3 border rounded-xl" required onChange={e => setFormData({ ...formData, date: e.target.value })} />
                <button type="submit" className="w-full bg-[#2D6A4F] text-white py-3 rounded-full font-bold">{t("Confirm Pre-Booking")}</button>
            </form>
        </div>
    )
}
