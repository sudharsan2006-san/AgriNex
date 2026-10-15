import React, { useEffect, useState } from "react";
import BackButton from "../components/BackButton";
import { useLanguage } from "../lib/i18n";
import { CropPriceItem, DEFAULT_REFERENCE_PRICES, subscribeMarketPrices } from "../utils/priceService";

export default function Pricing() {
  const { t, crop } = useLanguage();
  const [marketPrices, setMarketPrices] = useState<CropPriceItem[]>(DEFAULT_REFERENCE_PRICES);

  useEffect(() => {
    const unsubscribe = subscribeMarketPrices((prices) => setMarketPrices(prices));
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-24">
      <BackButton />
      <div className="mb-6">
        <h1 className="text-[#1B4332] text-2xl font-black">📈 {t("Agricultural Market Prices")}</h1>
        <p className="text-xs text-gray-500 mt-0.5">Comprehensive benchmark rates across agricultural commodities</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {marketPrices.map((item) => (
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
              <h2 className="font-black text-[#1B4332] text-xl mb-3">🌾 {crop(item.commodity)}</h2>

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

              <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-2 border-t border-gray-100">
                <span>Standard Unit:</span>
                <span className="font-bold text-[#1B4332]">{item.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
