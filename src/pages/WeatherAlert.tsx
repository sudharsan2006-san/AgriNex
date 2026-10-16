import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../lib/apiBase";
import BackButton from "../components/BackButton";

interface WeatherData {
  current: {
    temp: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    rainfall: number;
    rainProb: number;
  };
}

interface SavedLocation {
  latitude: number;
  longitude: number;
}

export default function WeatherAlert() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWeather = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      let location: SavedLocation = { latitude: 13.0827, longitude: 80.2707 };
      const savedLocation = localStorage.getItem("agrinex_selected_location");
      if (savedLocation) {
        try {
          const parsed = JSON.parse(savedLocation) as Partial<SavedLocation>;
          if (Number.isFinite(parsed.latitude) && Number.isFinite(parsed.longitude)) {
            location = { latitude: parsed.latitude!, longitude: parsed.longitude! };
          }
        } catch (parseError) {
          console.warn("[WeatherAlert] Saved location could not be read:", parseError);
        }
      }

      const response = await axios.get<WeatherData>(`${API_BASE}/api/weather-data`, {
        params: { lat: location.latitude, lng: location.longitude },
        timeout: 9000,
        signal,
      });
      if (!response.data?.current || !Number.isFinite(response.data.current.temp)) {
        throw new Error("The weather service returned incomplete data.");
      }
      setWeather(response.data);
    } catch (requestError) {
      if (axios.isCancel(requestError)) return;
      console.error("[WeatherAlert] Weather request failed:", requestError);
      setError(
        axios.isAxiosError(requestError) && requestError.code === "ERR_NETWORK"
          ? "Weather information is unavailable because the backend could not be reached."
          : "Weather information is temporarily unavailable. Please try again."
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadWeather(controller.signal);
    return () => controller.abort();
  }, [loadWeather]);

  return (
    <div className="p-6 pb-24">
      <BackButton />
      <h1 className="text-2xl font-black text-[#1B4332] mb-6">Weather Alert</h1>
      {loading ? (
        <p role="status" className="text-gray-500">Loading weather information...</p>
      ) : error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void loadWeather()}
            className="mt-3 rounded-full bg-[#2D6A4F] px-4 py-2 font-bold text-white"
          >
            Try again
          </button>
        </div>
      ) : weather ? (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-lg font-bold text-[#2D6A4F]">Temp: {weather.current.temp}°C</p>
          <p className="text-gray-600">Condition: {weather.current.condition}</p>
          <p className="text-gray-600">Humidity: {weather.current.humidity}%</p>
          <p className="text-gray-600">Rain probability: {weather.current.rainProb}%</p>
          <p className="text-gray-600">Expected rainfall: {weather.current.rainfall} mm</p>
        </div>
      ) : null}
    </div>
  );
}
