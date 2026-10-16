import { useState, type FormEvent } from "react";
import BackButton from "../components/BackButton";

export default function CropRecommendation() {
  const [inputs, setInputs] = useState({ soil: "", pH: "" });
  const [rec, setRec] = useState<{ crop: string; score: number; reason: string; advice: string } | null>(null);

  const handleRec = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pH = Number(inputs.pH);
    if (inputs.soil.trim().toLowerCase() === "clay" && pH >= 5.5 && pH <= 7.0) {
      setRec({ crop: "Paddy", score: 95, reason: "Soil pH and type are ideal for Paddy.", advice: "Ensure adequate water supply." });
    } else {
      setRec({ crop: "Wheat", score: 80, reason: "General suitable crop.", advice: "Maintain soil health." });
    }
  };

  return (
    <div className="p-6 pb-24">
      <BackButton />
      <h1 className="text-2xl font-black text-[#1B4332] mb-6">Crop Recommendation</h1>
      <form onSubmit={handleRec} className="space-y-4">
        <label className="block">
          <span className="sr-only">Soil type</span>
          <input
            type="text"
            placeholder="Soil Type (e.g. clay or sandy)"
            value={inputs.soil}
            maxLength={80}
            required
            className="w-full p-4 bg-white border border-gray-100 rounded-3xl"
            onChange={(e) => setInputs({ ...inputs, soil: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="sr-only">Soil pH</span>
          <input
            type="number"
            placeholder="pH"
            value={inputs.pH}
            min="0"
            max="14"
            step="any"
            required
            className="w-full p-4 bg-white border border-gray-100 rounded-3xl"
            onChange={(e) => setInputs({ ...inputs, pH: e.target.value })}
          />
        </label>
        <button type="submit" className="w-full bg-[#FF922B] text-white p-4 rounded-full font-bold uppercase shadow-lg">
          Recommend
        </button>
      </form>
      {rec && (
        <div className="mt-6 p-6 bg-white rounded-3xl shadow-sm border border-gray-100">
          <h3 className="font-black text-[#2D6A4F] text-lg mb-2">{rec.crop}</h3>
          <p className="text-sm text-gray-600">{rec.reason}</p>
          <p className="text-sm text-gray-600">Suitability: {rec.score}%</p>
          <p className="text-sm text-gray-600">Advice: {rec.advice}</p>
        </div>
      )}
    </div>
  );
}
