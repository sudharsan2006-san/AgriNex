import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import BackButton from "../components/BackButton";
import { CropPriceItem, DEFAULT_REFERENCE_PRICES, subscribeMarketPrices } from "../utils/priceService";

export default function MarketDetails() {
  const { cropName } = useParams<{ cropName: string }>();
  const [marketPrices, setMarketPrices] = useState<CropPriceItem[]>(DEFAULT_REFERENCE_PRICES);

  useEffect(() => {
    const unsubscribe = subscribeMarketPrices((prices) => setMarketPrices(prices));
    return () => unsubscribe();
  }, []);

  const cropData = marketPrices.find((item) => item.commodity.toLowerCase() === cropName?.toLowerCase());

  return (
    <div className="p-6 pb-24">
      <BackButton />
      <h1 className="text-2xl font-black text-[#1B4332] mb-6">{cropName} Price Details</h1>

      {cropData ? (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="font-bold text-[#1B4332] text-lg mb-4">🌾 {cropData.commodity}</p>
          <p>General Minimum Price: <span className="font-bold">₹{cropData.min}</span></p>
          <p>General Maximum Price: <span className="font-bold">₹{cropData.max}</span></p>
          <p>Reference Modal Price: <span className="font-bold">₹{cropData.modal}</span></p>
          <p className="text-xs mt-4 text-gray-500">Unit: {cropData.unit}</p>
          <p className="text-xs mt-4 text-gray-400 italic">These are general reference prices for demonstration purposes. Actual market prices may vary based on location, market, quality, and date.</p>
        </div>
      ) : (
        <p className="text-gray-500">No reference data available for {cropName}.</p>
      )}
    </div>
  );
}
