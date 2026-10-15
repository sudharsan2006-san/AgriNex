import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import PreBookModal from "../components/PreBookModal";
import { useLanguage } from "../lib/i18n";
import { DEFAULT_REFERENCE_PRICES, subscribeMarketPrices, CropPriceItem } from "../utils/priceService";

interface Listing {
  id: string;
  cropName: string;
  farmerName: string;
  price: number;
  unit: string;
  availableQuantity: number;
  harvestDate: string;
}

import { LineChart, Line, ResponsiveContainer } from "recharts";

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
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [marketPrices, setMarketPrices] = useState<CropPriceItem[]>(DEFAULT_REFERENCE_PRICES);
  const { t, crop } = useLanguage();

  useEffect(() => {
    const unsubscribe = subscribeMarketPrices((prices) => setMarketPrices(prices));
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-24">
      <BackButton />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[#1B4332] text-2xl font-black">🛒 {t("Marketplace")}</h1>
          <p className="text-xs text-gray-500 mt-0.5">Real-time commodity rates & guaranteed pre-booking</p>
        </div>

        <button
          onClick={() => navigate("/pricing")}
          className="bg-white hover:bg-[#F0F7F4] border border-gray-200 hover:border-[#2D6A4F] px-5 py-3 rounded-2xl shadow-sm flex items-center justify-between gap-3 transition-all group"
        >
          <span className="font-bold text-sm text-[#1B4332] group-hover:text-[#2D6A4F]">📈 {t("View Detailed Pricing")}</span>
          <span className="text-gray-400 group-hover:text-[#2D6A4F] group-hover:translate-x-0.5 transition-transform">→</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {marketPrices.map((item) => {
          const data = generateTrendData(item.modal);
          const isUpTrend = data[data.length - 1].price >= data[0].price;
          return (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
            >
              {item.imageUrl && (
                <div className="w-full h-44 overflow-hidden bg-gray-100 relative">
                  <img
                    src={item.imageUrl}
                    alt={crop(item.commodity)}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-[#1B4332] shadow-sm">
                    ₹{item.modal} <span className="text-[10px] font-normal text-gray-600">{item.unit.replace("₹ / ", "/")}</span>
                  </div>
                </div>
              )}

              <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-black text-[#1B4332] text-xl">🌾 {crop(item.commodity)}</h2>
                  <div className="h-9 w-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke={isUpTrend ? "#2D6A4F" : "#DC2626"}
                          strokeWidth={2.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[#F0F7F4] p-3 rounded-2xl border border-[#D8F3DC] grid grid-cols-3 gap-2 text-center mb-4">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-500">{t("Min")}</span>
                    <span className="font-black text-sm text-[#1B4332]">₹{item.min}</span>
                  </div>
                  <div className="border-x border-[#D8F3DC]">
                    <span className="block text-[10px] uppercase font-bold text-[#2D6A4F]">{t("Modal")}</span>
                    <span className="font-black text-sm text-[#2D6A4F]">₹{item.modal}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-gray-500">{t("Max")}</span>
                    <span className="font-black text-sm text-[#1B4332]">₹{item.max}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>Standard Unit:</span>
                  <span className="font-bold text-[#1B4332]">{item.unit}</span>
                </div>

                <button
                  onClick={() =>
                    setSelectedListing({
                      ...item,
                      cropName: item.commodity,
                      price: item.modal,
                      unit: item.unit.replace("₹ / ", ""),
                      priceUnit: item.unit.replace("₹ / ", ""),
                    })
                  }
                  className="w-full mt-auto bg-[#2D6A4F] hover:bg-[#1B4332] text-white py-3 rounded-full font-bold text-sm shadow-sm hover:shadow transition-all"
                >
                  {t("Book Now")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {selectedListing && <PreBookModal listing={selectedListing} onClose={() => setSelectedListing(null)} />}
    </div>
  );
}


