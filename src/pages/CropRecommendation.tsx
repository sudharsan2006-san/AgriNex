import { useState } from "react";
import BackButton from "../components/BackButton";
import { useLanguage } from "../lib/i18n";

export default function CropRecommendation() {
  const [inputs, setInputs] = useState({ soil: "", pH: "", n: "", p: "", k: "", season: "" });
  const [rec, setRec] = useState<any>(null);
  const { t, crop } = useLanguage();

  const handleRec = () => {
    // Rule based logic example
    if (inputs.soil === "clay" && parseFloat(inputs.pH) >= 5.5 && parseFloat(inputs.pH) <= 7.0) {
      setRec({ crop: "Paddy", score: 95, reason: "Soil pH and type are ideal for Paddy.", advice: "Ensure adequate water supply." });
    } else {
      setRec({ crop: "Wheat", score: 80, reason: "General suitable crop.", advice: "Maintain soil health." });
    }
  };

  return (
    <div className="p-6 pb-24">
      <BackButton />
      <h1 className="text-2xl font-black text-[#1B4332] mb-6">{t("Crop Recommendation")}</h1>
      <div className="space-y-4">
        <input type="text" placeholder={t("Soil Type (clay/sandy)")} className="w-full p-4 bg-white border border-gray-100 rounded-3xl" onChange={(e) => setInputs({ ...inputs, soil: e.target.value })} />
        <input type="number" placeholder="pH" className="w-full p-4 bg-white border border-gray-100 rounded-3xl" onChange={(e) => setInputs({ ...inputs, pH: e.target.value })} />
        <button onClick={handleRec} className="w-full bg-[#FF922B] text-white p-4 rounded-full font-bold uppercase shadow-lg">{t("Recommend")}</button>
      </div>
      {rec && (
        <div className="mt-6 p-6 bg-white rounded-3xl shadow-sm border border-gray-100">
          <h3 className="font-black text-[#2D6A4F] text-lg mb-2">{crop(rec.crop)}</h3>
          <p className="text-sm text-gray-600">{rec.reason}</p>
        </div>
      )}
    </div>
  );
}
