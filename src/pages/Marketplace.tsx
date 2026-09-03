import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import BackButton from "../components/BackButton";
import PreBookModal from "../components/PreBookModal";

interface Listing {
  id: string;
  cropName: string;
  farmerName: string;
  price: number;
  unit: string;
  availableQuantity: number;
  harvestDate: string;
}

import React from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, ResponsiveContainer } from "recharts";
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

const generateTrendData = (modalPrice: number) => {
    const data = [];
    let price = modalPrice;
    for (let i = 0; i < 30; i++) {
        const change = price * (Math.random() * 0.1 - 0.05);
        price += change;
        data.push({ day: i, price: Math.round(price) });
    }
    return data;
};

export default function Marketplace() {
  const navigate = useNavigate();

  return (
    <div className="p-6 pb-20">
      <BackButton />
      <h1 className="text-[#1B4332] text-xl font-black mb-6">🛒 Marketplace</h1>
      
      <div className="grid gap-4 mb-8">
        <button onClick={() => navigate("/pricing")} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
            <span className="font-black text-[#1B4332]">📈 View Detailed Pricing</span>
            <span className="text-gray-400">→</span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REFERENCE_PRICES.map((item, i) => {
              const data = generateTrendData(item.modal);
              return (
                <div key={i} className="bg-white p-3 rounded-2xl text-sm shadow-sm border border-gray-100 flex flex-col">
                    {item.image && (
                        <div className="h-32 w-full -mx-3 -mt-3 mb-3 overflow-hidden rounded-t-2xl">
                            <img src={item.image} alt={item.commodity} className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-[#1B4332] text-lg">🌾 {item.commodity}</p>
                      <div className="h-8 w-20">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <Line type="monotone" dataKey="price" stroke={data[data.length-1].price >= data[0].price ? "#2D6A4F" : "#DC2626"} strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">Min: <span className="font-bold text-[#1B4332]">₹{item.min}</span></p>
                    <p className="text-sm text-gray-700">Max: <span className="font-bold text-[#1B4332]">₹{item.max}</span></p>
                    <p className="text-sm text-gray-700">Modal: <span className="font-bold text-[#1B4332]">₹{item.modal}</span></p>
                    <p className="text-xs text-gray-500 mt-1 mb-3">Unit: {item.unit}</p>
                    <button onClick={() => navigate("/pre-booking-demo")} className="w-full bg-[#2D6A4F] text-white py-2 rounded-full font-bold mt-auto text-sm">Book Now</button>
                </div>
              );
          })}
      </div>
    </div>
  );
}


