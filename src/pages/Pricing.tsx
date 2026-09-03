import React from "react";
import BackButton from "../components/BackButton";
import paddyImage from "../assets/images/paddy_realistic_1788423107962.jpg";
import maizeImage from "../assets/images/maize_realistic_1788423123774.jpg";
import wheatImage from "../assets/images/wheat_realistic_1788423144242.jpg";
import milletImage from "../assets/images/millet_realistic_1788423158373.jpg";
import sugarcaneImage from "../assets/images/sugarcane_realistic_1788423179854.jpg";
import cottonImage from "../assets/images/cotton_realistic_1788423275186.jpg";
import tomatoImage from "../assets/images/tomato_realistic_1788423293307.jpg";
import onionImage from "../assets/images/onion_realistic_1788423319492.jpg";
import potatoImage from "../assets/images/potato_realistic_1788423340061.jpg";
import brinjalImage from "../assets/images/brinjal_realistic_1788423360402.jpg";
import bananaImage from "../assets/images/banana_realistic_1788423373706.jpg";
import mangoImage from "../assets/images/mango_realistic_1788423388083.jpg";
import coconutImage from "../assets/images/coconut_realistic_1788423404696.jpg";
import chilliImage from "../assets/images/chilli_realistic_1788423420382.jpg";
import groundnutImage from "../assets/images/groundnut_realistic_1788423449690.jpg";

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
    return (
        <div className="p-6 pb-20">
            <BackButton />
            <h1 className="text-[#1B4332] text-xl font-black mb-6">📈 Agricultural Market Prices</h1>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {REFERENCE_PRICES.map((item, i) => (
                    <div key={i} className="bg-white p-3 rounded-2xl text-sm shadow-sm border border-gray-100 flex flex-col">
                        {item.image && (
                            <div className="h-32 w-full -mx-3 -mt-3 mb-3 overflow-hidden rounded-t-2xl">
                                <img src={item.image} alt={item.commodity} className="w-full h-full object-cover" />
                            </div>
                        )}
                        <p className="font-bold text-[#1B4332] text-lg mb-1">🌾 {item.commodity}</p>
                        <p className="text-sm text-gray-700">Min: <span className="font-bold text-[#1B4332]">₹{item.min}</span></p>
                        <p className="text-sm text-gray-700">Max: <span className="font-bold text-[#1B4332]">₹{item.max}</span></p>
                        <p className="text-sm text-gray-700">Modal: <span className="font-bold text-[#1B4332]">₹{item.modal}</span></p>
                        <p className="text-xs text-gray-500 mt-1">Unit: {item.unit}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
