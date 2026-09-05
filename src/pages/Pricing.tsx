import React from "react";
import BackButton from "../components/BackButton";
import { useLanguage } from "../lib/i18n";
import { getCropImageUrl } from "../utils/cropImages";

const REFERENCE_PRICES = [
    { commodity: "Paddy", min: 1800, max: 2200, modal: 2000, unit: "₹ / Quintal" },
    { commodity: "Maize", min: 1500, max: 2000, modal: 1750, unit: "₹ / Quintal" },
    { commodity: "Wheat", min: 2100, max: 2500, modal: 2300, unit: "₹ / Quintal" },
    { commodity: "Millet", min: 1600, max: 2000, modal: 1800, unit: "₹ / Quintal" },
    { commodity: "Sugarcane", min: 2800, max: 3500, modal: 3100, unit: "₹ / Tonne" },
    { commodity: "Groundnut", min: 4500, max: 5500, modal: 5000, unit: "₹ / Quintal" },
    { commodity: "Cotton", min: 6000, max: 7500, modal: 6750, unit: "₹ / Quintal" },
    { commodity: "Tomato", min: 10, max: 25, modal: 18, unit: "₹ / Kg" },
    { commodity: "Onion", min: 20, max: 45, modal: 32, unit: "₹ / Kg" },
    { commodity: "Potato", min: 15, max: 30, modal: 22, unit: "₹ / Kg" },
    { commodity: "Brinjal", min: 10, max: 20, modal: 15, unit: "₹ / Kg" },
    { commodity: "Banana", min: 20, max: 40, modal: 30, unit: "₹ / Kg" },
    { commodity: "Mango", min: 40, max: 90, modal: 65, unit: "₹ / Kg" },
    { commodity: "Coconut", min: 15, max: 30, modal: 22, unit: "₹ / Piece" },
    { commodity: "Chilli", min: 70, max: 140, modal: 105, unit: "₹ / Kg" },
];

export default function Pricing() {
    const { t, crop } = useLanguage();
    return (
        <div className="p-6 pb-20">
            <BackButton />
            <h1 className="text-[#1B4332] text-xl font-black mb-6">📈 {t("Agricultural Market Prices")}</h1>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {REFERENCE_PRICES.map((item, i) => (
                    <div key={i} className="bg-white p-3 rounded-2xl text-sm shadow-sm border border-gray-100 flex flex-col">
                        <div className="h-32 w-full -mx-3 -mt-3 mb-3 overflow-hidden rounded-t-2xl bg-gray-50 flex items-center justify-center">
                            <img src={getCropImageUrl(item.commodity)} alt={crop(item.commodity)} className="w-full h-full object-cover" />
                        </div>
                        <p className="font-bold text-[#1B4332] text-lg mb-1">🌾 {crop(item.commodity)}</p>
                        <p className="text-sm text-gray-700">{t("Min")}: <span className="font-bold text-[#1B4332]">₹{item.min}</span></p>
                        <p className="text-sm text-gray-700">{t("Max")}: <span className="font-bold text-[#1B4332]">₹{item.max}</span></p>
                        <p className="text-sm text-gray-700">{t("Modal")}: <span className="font-bold text-[#1B4332]">₹{item.modal}</span></p>
                        <p className="text-xs text-gray-500 mt-1">{t("Unit")}: {item.unit}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
