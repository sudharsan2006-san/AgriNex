import { useState } from "react";
import BackButton from "../components/BackButton";

export default function SoilStatus() {
  const [notice, setNotice] = useState("");

  return (
    <div className="p-6">
      <BackButton />
      <h1 className="text-[#1B4332] text-xl font-black mb-6">Soil Status</h1>
      <div className="bg-white p-6 rounded-3xl border border-gray-100 text-[#1B4332] shadow-sm">
        <p className="text-sm">Sensor not connected</p>
        <button
          type="button"
          onClick={() => setNotice("Device setup is not available yet. No soil sensor is configured for this account.")}
          className="mt-4 bg-[#2D6A4F] text-white py-2 px-4 rounded-xl font-bold"
        >
          Connect Device
        </button>
        {notice && <p role="status" className="mt-3 text-sm text-amber-800">{notice}</p>}
      </div>
    </div>
  );
}
