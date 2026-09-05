import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import BackButton from "../components/BackButton";
import PreBookModal from "../components/PreBookModal";
import { getCropImageUrl } from "../utils/cropImages";

interface Listing {
  id: string;
  cropName: string;
  farmerName: string;
  price: number;
  unit: string;
  availableQuantity: number;
  harvestDate: string;
}

/*
 * Primary image sources – high-quality Unsplash photos.
 * If any URL fails to load the <img> onError handler
 * swaps in a guaranteed-to-work inline SVG from cropImages.ts.
 */
const CROP_PHOTO_URLS: Record<string, string> = {
  Paddy:     "https://images.unsplash.com/photo-1599748365498-98a0a9ebb0c5?w=400&h=280&fit=crop&q=80",
  Maize:     "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=400&h=280&fit=crop&q=80",
  Wheat:     "https://images.unsplash.com/photo-1437252611977-07f74518abd7?w=400&h=280&fit=crop&q=80",
  Millet:    "https://images.unsplash.com/photo-1595855759920-86fac2ec2457?w=400&h=280&fit=crop&q=80",
  Sugarcane: "https://images.unsplash.com/photo-1559242804-43b8f0b86b48?w=400&h=280&fit=crop&q=80",
  Groundnut: "https://images.unsplash.com/photo-1543158181-1274e5362710?w=400&h=280&fit=crop&q=80",
  Cotton:    "https://images.unsplash.com/photo-1605618826115-fb9e63cbf726?w=400&h=280&fit=crop&q=80",
  Tomato:    "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=280&fit=crop&q=80",
  Onion:     "https://images.unsplash.com/photo-1580201092675-a0a6a6cafbb1?w=400&h=280&fit=crop&q=80",
  Potato:    "https://images.unsplash.com/photo-1518977676601-b53f82abb48a?w=400&h=280&fit=crop&q=80",
  Brinjal:   "https://images.unsplash.com/photo-1613881553903-4e0b0c3cf5f0?w=400&h=280&fit=crop&q=80",
  Banana:    "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400&h=280&fit=crop&q=80",
  Mango:     "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&h=280&fit=crop&q=80",
  Coconut:   "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=280&fit=crop&q=80",
  Chilli:    "https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=400&h=280&fit=crop&q=80",
};

const getCropColor = (name: string) => {
  if (["Tomato", "Chilli"].includes(name)) return "bg-red-50 border-red-200";
  if (["Paddy", "Wheat", "Maize", "Millet", "Banana"].includes(name)) return "bg-yellow-50 border-yellow-200";
  if (["Onion", "Brinjal"].includes(name)) return "bg-purple-50 border-purple-200";
  if (["Cotton", "Coconut"].includes(name)) return "bg-amber-50 border-amber-200";
  return "bg-green-50 border-green-200";
};

export default function Marketplace() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const REFERENCE_PRICES = [
    { commodity: "Paddy", min: 1800, max: 2200, modal: 2000, unit: "₹ / Quintal" },
    { commodity: "Maize", min: 1500, max: 2000, modal: 1750, unit: "₹ / Quintal" },
    { commodity: "Wheat", min: 2100, max: 2500, modal: 2300, unit: "₹ / Quintal" },
    { commodity: "Millet", min: 1600, max: 2000, modal: 1800, unit: "₹ / Quintal" },
    { commodity: "Sugarcane", min: 2800, max: 3500, modal: 3100, unit: "₹ / Tonne" },
    { commodity: "Groundnut", min: 4500, max: 5500, modal: 5000, unit: "₹ / Quintal" },
    { commodity: "Cotton", min: 6000, max: 7500, modal: 6750, unit: "₹ / Quintal" },
    { commodity: "Tomato", min: 10, max: 25, modal: 18, unit: "₹ / Kg" },
    { commodity: "Onion", min: 20, max: 45, modal: 32, unit: "₹ / Kg" },
    { commodity: "Potato", min: 15, max: 30, modal: 22, unit: "₹ / Kg" },
    { commodity: "Brinjal", min: 10, max: 20, modal: 15, unit: "₹ / Kg" },
    { commodity: "Banana", min: 20, max: 40, modal: 30, unit: "₹ / Kg" },
    { commodity: "Mango", min: 40, max: 90, modal: 65, unit: "₹ / Kg" },
    { commodity: "Coconut", min: 15, max: 30, modal: 22, unit: "₹ / Piece" },
    { commodity: "Chilli", min: 70, max: 140, modal: 105, unit: "₹ / Kg" },
  ];

  const [marketPrices, setMarketPrices] = useState(REFERENCE_PRICES);

  const handleRefresh = () => {
    setMarketPrices([...REFERENCE_PRICES]);
    fetchListings(false);
  };

  const fetchListings = async (showLoading: boolean = true) => {
    if (showLoading) setLoading(true);
    try {
      const q = query(collection(db, "listings"));
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 10000)
      );
      const snapshotPromise = getDocs(q);
      const snapshot = (await Promise.race([snapshotPromise, timeoutPromise])) as any;
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Listing));
      setListings(data);
    } catch (error) {
      console.warn("Error fetching listings (gracefully handled):", error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleImageError = (commodity: string) => {
    setImgErrors((prev) => ({ ...prev, [commodity]: true }));
  };

  /** Resolve the best image source for a given crop */
  const getImageSrc = (commodity: string): string => {
    if (imgErrors[commodity]) {
      // External URL failed → use guaranteed inline SVG
      return getCropImageUrl(commodity);
    }
    // Try external photo first
    return CROP_PHOTO_URLS[commodity] || getCropImageUrl(commodity);
  };

  return (
    <div className="p-6 pb-20">
      <BackButton />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-[#1B4332] text-xl font-black">🛒 AgriNex Marketplace</h1>
        <button onClick={handleRefresh} className="text-[#2D6A4F] text-xs font-bold">Refresh</button>
      </div>

      <div className="bg-[#E7F5FF] p-6 rounded-3xl mb-6 text-[#1B4332]">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h2 className="font-bold">📈 TAMIL NADU AGRICULTURAL MARKET PRICES</h2>
          <div className="text-xs font-bold bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
            📊 GENERAL REFERENCE PRICES
          </div>
        </div>

        <p className="text-xs mb-2">General Market Price Reference for Tamil Nadu</p>
        <p className="text-xs mb-6">
          📊 These values are general reference prices for demonstration purposes.
          Actual market prices may vary based on location, market, quality, and date.
        </p>

        {/* ───────── Product Cards Grid ───────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {marketPrices.map((item, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl shadow-md border border-gray-100 flex flex-col hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              {/* ── Crop Image ── */}
              <div
                className={`w-full flex items-center justify-center border-b overflow-hidden ${getCropColor(item.commodity)}`}
                style={{ height: "180px" }}
              >
                <img
                  src={getImageSrc(item.commodity)}
                  alt={item.commodity}
                  style={{ height: "180px", width: "100%", objectFit: "cover" }}
                  onError={() => handleImageError(item.commodity)}
                  loading="lazy"
                />
              </div>

              {/* ── Card Body ── */}
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="font-black text-2xl text-[#1B4332] mb-5">{item.commodity}</h3>

                <div className="space-y-4 mb-6 text-gray-700 flex-grow">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <span className="text-gray-500 text-base">Minimum Price</span>
                    <span className="font-bold text-lg text-gray-800">₹{item.min}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <span className="text-gray-500 text-base">Maximum Price</span>
                    <span className="font-bold text-lg text-gray-800">₹{item.max}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <span className="text-[#2D6A4F] font-bold text-base">Modal Price</span>
                    <span className="font-black text-xl text-[#2D6A4F]">₹{item.modal}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2">
                    <span className="text-gray-400 uppercase tracking-wider font-bold">Unit</span>
                    <span className="bg-gray-100 px-3 py-1 rounded-full text-gray-600 font-bold">{item.unit}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedListing(item)}
                  className="w-full bg-[#2D6A4F] hover:bg-[#1B4332] text-white py-4 px-4 rounded-2xl text-lg font-black transition-colors shadow-sm"
                >
                  Pre-Book Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ───────── Farmer Listings ───────── */}
      {loading ? (
        <p>Loading...</p>
      ) : listings.length === 0 ? (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 text-[#1B4332] shadow-sm">
          <p>No farmer crop listings yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <h2 className="font-bold text-[#1B4332]">🌾 Available Crops</h2>
          {listings.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <h2 className="font-bold">{item.cropName}</h2>
              <p className="text-sm">Farmer: {item.farmerName}</p>
              <p className="text-sm font-bold text-[#2D6A4F]">₹{item.price}/{item.unit}</p>
              <p className="text-xs text-gray-500">Available: {item.availableQuantity} {item.unit}</p>
              <div className="flex gap-2">
                <button onClick={() => navigate(`/market-details/${item.cropName}`)} className="mt-2 bg-gray-100 text-[#2D6A4F] py-2 px-4 rounded-full text-xs font-bold">View Details</button>
                <button onClick={() => setSelectedListing(item)} className="mt-2 bg-[#2D6A4F] text-white py-2 px-4 rounded-full text-xs font-bold">🟢 Pre-Book Now</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedListing && <PreBookModal listing={selectedListing} onClose={() => setSelectedListing(null)} />}
    </div>
  );
}
