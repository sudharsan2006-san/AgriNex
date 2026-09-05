import { useEffect, useState } from "react";
import axios from "axios";
import BackButton from "../components/BackButton";
import { useLanguage } from "../lib/i18n";

export default function WeatherAlert() {
  const [weather, setWeather] = useState<any>(null);
  const { t } = useLanguage();

  useEffect(() => {
    axios.get("/api/weather?location=default").then((res) => setWeather(res.data));
  }, []);

  return (
    <div className="p-6 pb-24">
      <BackButton />
      <h1 className="text-2xl font-black text-[#1B4332] mb-6">{t("Weather Alert")}</h1>
      {weather ? (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <p className="text-lg font-bold text-[#2D6A4F]">{t("Temp")}: {weather.temp}°C</p>
          <p className="text-gray-600">{t("Condition")}: {weather.condition}</p>
          <p className="text-gray-600">{t("Humidity")}: {weather.humidity}%</p>
        </div>
      ) : <p className="text-gray-500">{t("Loading")}</p>}
    </div>
  );
}
