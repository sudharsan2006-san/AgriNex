import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import BackButton from "../components/BackButton";
import PreBookModal from "../components/PreBookModal";

interface Listing {
  id: string;
  cropName: string;
  farmerName: string;
  price: number;
  unit: string;
  availableQuantity: number;
  harvestDate: string;
}

export default function Marketplace() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<any | null>(null);

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
    // Simply force a re-render/refresh of the static data
    setMarketPrices([...REFERENCE_PRICES]);
    // Do not set loading=true here to avoid full-page reload
    fetchListings(false);
  };

  const fetchListings = async (showLoading: boolean = true) => {
    if (showLoading) setLoading(true);
    
    try {
      const q = query(collection(db, "listings"));
      
      // Implement 10-second timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 10000)
      );

      const snapshotPromise = getDocs(q);

      const snapshot = await Promise.race([snapshotPromise, timeoutPromise]) as any;
      
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

  return (
    <div className="p-6 pb-20">
      <BackButton />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-[#1B4332] text-xl font-black">🛒 AgriNex Marketplace</h1>
        <button onClick={handleRefresh} className="text-[#2D6A4F] text-xs font-bold">Refresh</button>
      </div>
      
      <div className="bg-[#E7F5FF] p-6 rounded-3xl mb-6 text-[#1B4332]">
        <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold">📈 TAMIL NADU AGRICULTURAL MARKET PRICES</h2>
            <div className="text-xs font-bold bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">📊 GENERAL REFERENCE PRICES</div>
        </div>
        
        <p className="text-xs mb-4">General Market Price Reference for Tamil Nadu</p>
        <p className="text-xs mb-4">📊 These values are general reference prices for demonstration purposes. Actual market prices may vary based on location, market, quality, and date.</p>
        
        <div className="grid gap-3">
            {marketPrices.map((item, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl text-sm shadow-sm border border-gray-100">
                        <p className="font-bold text-[#1B4332]">🌾 {item.commodity}</p>
                        <p>General Minimum Price: <span className="font-bold">₹{item.min}</span></p>
                        <p>General Maximum Price: <span className="font-bold">₹{item.max}</span></p>
                        <p>Reference Modal Price: <span className="font-bold">₹{item.modal}</span></p>
                        <p className="text-xs mt-1">Unit: {item.unit}</p>
                        <button onClick={() => setSelectedListing(item)} className="mt-3 w-full bg-[#2D6A4F] text-white py-2 px-4 rounded-full text-xs font-bold">Book Now</button>
                    </div>
            ))}
        </div>
      </div>


      {loading ? (
        <p>Loading...</p>
      ) : listings.length === 0 ? (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 text-[#1B4332] shadow-sm">
            <p>No farmer crop listings yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
            <h2 className="font-bold text-[#1B4332]">🌾 Available Crops</h2>
            {listings.map(item => (
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

