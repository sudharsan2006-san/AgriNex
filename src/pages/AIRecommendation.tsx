import { useState } from "react";
import axios from "axios";
import BackButton from "../components/BackButton";

export default function AIRecommendation() {
  const [data, setData] = useState({ moisture: "", cropType: "", weather: "", rainForecast: "" });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await axios.post("/api/ai-recommendation", data);
      setResult(response.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 pb-24">
      <BackButton />
      <h1 className="text-2xl font-black text-[#1B4332] mb-6">AI Smart Recommendation</h1>
      <div className="space-y-4">
        <input type="number" placeholder="Soil Moisture %" className="w-full p-4 bg-white border border-gray-100 rounded-3xl" onChange={(e) => setData({...data, moisture: e.target.value})} />
        <input type="text" placeholder="Crop Type" className="w-full p-4 bg-white border border-gray-100 rounded-3xl" onChange={(e) => setData({...data, cropType: e.target.value})} />
        <input type="text" placeholder="Weather" className="w-full p-4 bg-white border border-gray-100 rounded-3xl" onChange={(e) => setData({...data, weather: e.target.value})} />
        <input type="text" placeholder="Rain Forecast" className="w-full p-4 bg-white border border-gray-100 rounded-3xl" onChange={(e) => setData({...data, rainForecast: e.target.value})} />
        <button onClick={handleSubmit} className="w-full bg-[#2D6A4F] text-white p-4 rounded-full font-bold uppercase shadow-lg">
          {loading ? "Analyzing..." : "Get Recommendation"}
        </button>
      </div>
      {result && (
        <div className="mt-6 p-6 bg-white rounded-3xl shadow-sm border border-gray-100">
          <h3 className="font-black text-[#1B4332] mb-2">Recommendation</h3>
          <p className="text-sm text-gray-600 mb-2">{result.recommendation}</p>
          <p className="text-sm font-bold text-[#D9480F]">Risk: {result.riskLevel}</p>
          <p className="text-sm text-gray-600">Reason: {result.reason}</p>
          <p className="text-sm text-gray-600">Action: {result.suggestedAction}</p>
        </div>
      )}
    </div>
  );
}
