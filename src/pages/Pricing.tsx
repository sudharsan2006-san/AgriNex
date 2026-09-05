import React from "react";
import BackButton from "../components/BackButton";
import cropFallbackImage from "../assets/images/pre_booking_screen_1787907548775.jpg";

const paddyImage = cropFallbackImage;
const maizeImage = cropFallbackImage;
const wheatImage = cropFallbackImage;
const milletImage = cropFallbackImage;
const sugarcaneImage = cropFallbackImage;
const cottonImage = cropFallbackImage;
const tomatoImage = cropFallbackImage;
const onionImage = cropFallbackImage;
const potatoImage = cropFallbackImage;
const brinjalImage = cropFallbackImage;
const bananaImage = cropFallbackImage;
const mangoImage = cropFallbackImage;
const coconutImage = cropFallbackImage;
const chilliImage = cropFallbackImage;
const groundnutImage = cropFallbackImage;
import { useLanguage } from "../lib/i18n";

const REFERENCE_PRICES = [
    { commodity: "Paddy", min: 1800, max: 2200, modal: 2000, unit: "₹ / Quintal", image: paddyImage },
    { commodity: "Maize", min: 1500, max: 2000, modal: 1750, unit: "₹ / Quintal", image: maizeImage },
    { commodity: "Wheat", min: 2100, max: 2500, modal: 2300, unit: "₹ / Quintal", image: wheatImage },
    { commodity: "Millet", min: 1600, max: 2000, modal: 1800, unit: "₹ / Quintal", image: milletImage },
    { commodity: "Sugarcane", min: 2800, max: 3500, modal: 3100, unit: "₹ / Tonne", image: sugarcaneImage },
    { commodity: "Groundnut", min: 4500, max: 5500, modal: 5000, unit: "₹ / Quintal", image: groundnutImage },
    { commodity: "Cotton", min: 6000, max: 7500, modal: 6750, unit: "₹ / Quintal", image: cottonImage },
    { commodity: "Tomato", min: 10, max: 25, modal: 18, unit: "₹ / Kg", image: tomatoImage },
    { commodity: "Onion", min: 20, max: 45, modal: 32, unit: "₹ / Kg", image: onionImage },
    { commodity: "Potato", min: 15, max: 30, modal: 22, unit: "₹ / Kg", image: potatoImage },
    { commodity: "Brinjal", min: 10, max: 20, modal: 15, unit: "₹ / Kg", image: brinjalImage },
    { commodity: "Banana", min: 20, max: 40, modal: 30, unit: "₹ / Kg", image: bananaImage },
    { commodity: "Mango", min: 40, max: 90, modal: 65, unit: "₹ / Kg", image: mangoImage },
    { commodity: "Coconut", min: 15, max: 30, modal: 22, unit: "₹ / Piece", image: coconutImage },
    { commodity: "Chilli", min: 70, max: 140, modal: 105, unit: "₹ / Kg", image: chilliImage },
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
                        {item.image && (
                            <div className="h-32 w-full -mx-3 -mt-3 mb-3 overflow-hidden rounded-t-2xl">
                                <img src={item.image} alt={crop(item.commodity)} className="w-full h-full object-cover" />
                            </div>
                        )}
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
