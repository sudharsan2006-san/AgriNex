import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { useLocation } from "react-router-dom";
import BackButton from "../components/BackButton";
import { useLanguage } from "../lib/i18n";

interface HarvestData {
  productName: string;
  farmerName: string;
  batchId: string;
  harvestDate: string;
  availableQuantity: number;
  pricePerUnit: number;
  qualityGrade: string;
  farmLocation: string;
}

export default function HarvestBooking() {
  const location = useLocation();
  const harvestData: HarvestData = location.state || {
    productName: "Organic Mangoes",
    farmerName: "Ramesh Kumar",
    batchId: "B-2026-08",
    harvestDate: "Sept 15, 2026",
    availableQuantity: 500,
    pricePerUnit: 150,
    qualityGrade: "Grade A",
    farmLocation: "Krishnagiri, TN",
  };

  const [quantity, setQuantity] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const { t } = useLanguage();

  const totalAmount = quantity * harvestData.pricePerUnit;
  const advanceAmount = totalAmount * 0.2;

  return (
    <div className="p-6 pb-24 bg-[#F0F7F4] min-h-screen">
      <BackButton />
      <h1 className="text-2xl font-black text-[#1B4332] mb-1">{t("Pre-Booking")}</h1>
      <p className="text-[#2D6A4F] mb-6">{t("Reserve fresh produce directly from the upcoming harvest.")}</p>

      {!submitted ? (
        <div className="space-y-6">
          {/* Product Card */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex gap-4">
            <div className="w-20 h-20 bg-gray-200 rounded-2xl"></div>
            <div>
              <h2 className="font-black text-[#1B4332]">{harvestData.productName}</h2>
              <p className="text-sm text-gray-500">{t("Farmer")}: {harvestData.farmerName}</p>
              <p className="text-xs text-gray-400">Batch: {harvestData.batchId} | Grade: {harvestData.qualityGrade}</p>
              <p className="text-sm font-bold text-[#2D6A4F]">₹{harvestData.pricePerUnit}/kg</p>
              <p className="text-xs text-gray-400">{t("Date")}: {harvestData.harvestDate}</p>
            </div>
          </div>

          {/* Status Flow */}
          <div className="flex justify-between items-center text-[8px] text-[#1B4332] font-bold overflow-x-auto gap-1">
            <span>Booked</span> <span>→</span> <span>Ready</span> <span>→</span> <span>Checked</span> <span>→</span> <span>Packed</span> <span>→</span> <span>Delivered</span>
          </div>

          {/* Booking Form */}
          <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-full border border-gray-100">
              <span>{t("Quantity")} (kg)</span>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button>
                <span className="font-bold text-lg">{quantity}</span>
                <button type="button" onClick={() => setQuantity(Math.min(harvestData.availableQuantity, quantity + 1))}><Plus size={16} /></button>
              </div>
            </div>
            <input type="date" className="w-full p-4 bg-white border border-gray-100 rounded-full" required />
            <input type="text" placeholder={t("Preferred Location")} className="w-full p-4 bg-white border border-gray-100 rounded-full" required />
            <input type="text" placeholder={t("Name")} className="w-full p-4 bg-white border border-gray-100 rounded-full" required />
            <input type="tel" placeholder={t("Mobile Number")} className="w-full p-4 bg-white border border-gray-100 rounded-full" required />
            <textarea placeholder={t("Notes (Optional)")} className="w-full p-4 bg-white border border-gray-100 rounded-3xl" rows={3}></textarea>

            {/* Price Summary */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 space-y-2 text-sm text-[#1B4332]">
              <div className="flex justify-between"><span>{t("Quantity")}:</span><span className="font-bold">{quantity} kg</span></div>
              <div className="flex justify-between"><span>{t("Price")}:</span><span className="font-bold">₹{harvestData.pricePerUnit}</span></div>
              <div className="flex justify-between text-lg font-black"><span>{t("Estimated value")}:</span><span>₹{totalAmount}</span></div>
              <div className="flex justify-between text-[#2D6A4F] font-bold"><span>{t("Pre-Booking")} (20%):</span><span>₹{advanceAmount}</span></div>
            </div>

            <button type="submit" className="w-full bg-[#2D6A4F] text-white p-4 rounded-full font-black uppercase shadow-lg">{t("Confirm Pre-Booking")}</button>
            <p className="text-center text-xs text-gray-500">{t("Your quantity will be reserved from the upcoming harvest.")}</p>
          </form>
        </div>
      ) : (
        <div className="p-10 bg-[#D8F3DC] rounded-3xl text-[#1B4332] font-black text-center">
          {t("Pre-Booking Confirmed")}!
        </div>
      )}
    </div>
  );
}
