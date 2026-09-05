import { useParams } from "react-router-dom";
import BackButton from "../components/BackButton";
import { useLanguage } from "../lib/i18n";

const REFERENCE_PRICE_DATA: Record<string, { min: number; max: number; modal: number; unit: string }> = {
  "Paddy": { min: 1800, max: 2200, modal: 2000, unit: "quintal" },
  "Maize": { min: 1500, max: 2000, modal: 1750, unit: "quintal" },
  "Wheat": { min: 2100, max: 2500, modal: 2300, unit: "quintal" },
  "Millet": { min: 1600, max: 2000, modal: 1800, unit: "quintal" },
  "Sugarcane": { min: 2800, max: 3200, modal: 3000, unit: "quintal" },
  "Groundnut": { min: 4500, max: 5500, modal: 5000, unit: "quintal" },
  "Cotton": { min: 6000, max: 7000, modal: 6500, unit: "quintal" },
  "Tomato": { min: 15, max: 30, modal: 22, unit: "kg" },
  "Onion": { min: 20, max: 40, modal: 30, unit: "kg" },
  "Potato": { min: 15, max: 25, modal: 20, unit: "kg" },
  "Brinjal": { min: 10, max: 20, modal: 15, unit: "kg" },
  "Banana": { min: 20, max: 40, modal: 30, unit: "kg" },
  "Mango": { min: 50, max: 100, modal: 75, unit: "kg" },
  "Coconut": { min: 20, max: 35, modal: 28, unit: "piece" },
  "Chilli": { min: 80, max: 150, modal: 115, unit: "kg" },
};

export default function MarketDetails() {
  const { cropName } = useParams<{ cropName: string }>();
  const cropData = cropName ? REFERENCE_PRICE_DATA[cropName] : null;
  const { t, crop } = useLanguage();

  return (
    <div className="p-6 pb-24">
      <BackButton />
      <h1 className="text-2xl font-black text-[#1B4332] mb-6">{crop(cropName || "")} {t("Price")} {t("View Details")}</h1>

      {cropData ? (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="font-bold text-[#1B4332] text-lg mb-4">🌾 {crop(cropName || "")}</p>
          <p>{t("Min")}: <span className="font-bold">₹{cropData.min}</span></p>
          <p>{t("Max")}: <span className="font-bold">₹{cropData.max}</span></p>
          <p>{t("Reference Price")}: <span className="font-bold">₹{cropData.modal}</span></p>
          <p className="text-xs mt-4 text-gray-500">{t("Unit")}: ₹ / {cropData.unit}</p>
          <p className="text-xs mt-4 text-gray-400 italic">These are general reference prices for demonstration purposes. Actual market prices may vary based on location, market, quality, and date.</p>
        </div>
      ) : (
        <p className="text-gray-500">No reference data available for {cropName}.</p>
      )}
    </div>
  );
}
