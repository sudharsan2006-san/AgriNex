import BackButton from "../components/BackButton";
import { useLanguage } from "../lib/i18n";

export default function IoTTools() {
  const { t } = useLanguage();
  return (
    <div className="p-6">
      <BackButton />
      <h1 className="text-[#1B4332] text-xl font-black mb-6">{t("IoT Tools")}</h1>
      <div className="bg-white p-6 rounded-3xl border border-gray-100 text-[#1B4332] shadow-sm">
        <p>{t("No IoT devices connected.")}</p>
      </div>
    </div>
  );
}
