import { useState, type FormEvent } from "react";
import axios from "axios";
import { API_BASE } from "../lib/apiBase";
import BackButton from "../components/BackButton";

interface RecommendationResult {
  recommendation: string;
  riskLevel: string;
  reason: string;
  suggestedAction: string;
}

export default function AIRecommendation() {
  const [data, setData] = useState({ moisture: "", cropType: "", weather: "", rainForecast: "" });
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await axios.post<RecommendationResult>(`${API_BASE}/api/ai-recommendation`, data);
      setResult(response.data);
    } catch (requestError) {
      console.error("[AIRecommendation] Recommendation request failed:", requestError);
      if (axios.isAxiosError(requestError)) {
        const apiError = requestError.response?.data?.error;
        if (typeof apiError === "string") {
          setError(apiError);
        } else if (requestError.response?.status && requestError.response.status >= 500) {
          setError("The AI service is temporarily unavailable. Please check the backend and try again.");
        } else if (requestError.code === "ERR_NETWORK") {
          setError("The AI service could not be reached. Please try again when the backend is online.");
        } else {
          setError("The AI recommendation could not be generated. Please try again.");
        }
      } else {
        setError("The AI recommendation could not be generated. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 pb-24">
      <BackButton />
      <h1 className="text-2xl font-black text-[#1B4332] mb-6">AI Smart Recommendation</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="sr-only">Soil Moisture %</span>
          <input
            type="number"
            min="0"
            max="100"
            step="any"
            placeholder="Soil Moisture % (optional)"
            value={data.moisture}
            className="w-full p-4 bg-white border border-gray-100 rounded-3xl"
            onChange={(e) => setData({ ...data, moisture: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="sr-only">Crop Type</span>
          <input
            type="text"
            placeholder="Crop Type (required)"
            value={data.cropType}
            required
            maxLength={100}
            className="w-full p-4 bg-white border border-gray-100 rounded-3xl"
            onChange={(e) => setData({ ...data, cropType: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="sr-only">Weather conditions</span>
          <input
            type="text"
            placeholder="Weather (e.g. hot and sunny)"
            value={data.weather}
            maxLength={200}
            className="w-full p-4 bg-white border border-gray-100 rounded-3xl"
            onChange={(e) => setData({ ...data, weather: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="sr-only">Rain forecast</span>
          <input
            type="text"
            placeholder="Rain Forecast (e.g. 20% chance tomorrow)"
            value={data.rainForecast}
            maxLength={200}
            className="w-full p-4 bg-white border border-gray-100 rounded-3xl"
            onChange={(e) => setData({ ...data, rainForecast: e.target.value })}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#2D6A4F] text-white p-4 rounded-full font-bold uppercase shadow-lg disabled:opacity-60"
        >
          {loading ? "Analyzing..." : "Get Recommendation"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}
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
