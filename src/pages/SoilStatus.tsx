import BackButton from "../components/BackButton";
import { useLanguage } from "../lib/i18n";

export default function SoilStatus() {
  const { t } = useLanguage();
  return (
    <div className="p-6">
      <BackButton />
      <h1 className="text-[#1B4332] text-xl font-black mb-6">{t("Soil Status")}</h1>
      <div className="bg-white p-6 rounded-3xl border border-gray-100 text-[#1B4332] shadow-sm">
        <p className="text-sm">{t("Sensor not connected")}</p>
        <button className="mt-4 bg-[#2D6A4F] text-white py-2 px-4 rounded-xl font-bold">{t("Connect Device")}</button>
      </div>
    </div>
  );
}
