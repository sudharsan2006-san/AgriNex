import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../lib/firebase";
import { MachineryItem, MachineryType } from "../types/machinery";
import { seedMachineryIfEmpty, INITIAL_MACHINERY } from "../utils/machinerySeed";
import { isAdminUserEmail } from "../lib/authHelpers";
import BackButton from "../components/BackButton";
import NotificationBell from "../components/NotificationBell";
import MachineryDetailsModal from "../components/MachineryDetailsModal";
import MachineryRequestModal from "../components/MachineryRequestModal";
import { Search, Wrench, MapPin, ClipboardList, Shield, Sparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getMachineryImageUrl } from "../utils/machineryImages";

const MACHINERY_TYPES: MachineryType[] = [
  "Tractor",
  "Harvester",
  "Rotavator",
  "Cultivator",
  "Seed Drill",
  "Power Tiller",
  "Tractor Trailer",
  "Sprayer",
  "Thresher",
  "Plough",
  "Paddy Transplanter",
  "Reaper",
  "Weeder",
  "Baler",
  "Water Pump",
  "Other",
];

const STATUS_PILL: Record<string, { bg: string; text: string; label: string }> = {
  Available: { bg: "bg-emerald-100", text: "text-emerald-800", label: "🟢 Available" },
  Booked: { bg: "bg-amber-100", text: "text-amber-800", label: "🟡 Booked" },
  Maintenance: { bg: "bg-purple-100", text: "text-purple-800", label: "🟣 Maintenance" },
  Unavailable: { bg: "bg-rose-100", text: "text-rose-800", label: "🔴 Unavailable" },
};

export default function Machinery() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [machineryList, setMachineryList] = useState<MachineryItem[]>([]);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedLocation, setSelectedLocation] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"featured" | "price_asc" | "price_desc">("featured");

  // Modals
  const [activeDetailsItem, setActiveDetailsItem] = useState<MachineryItem | null>(null);
  const [activeRequestItem, setActiveRequestItem] = useState<MachineryItem | null>(null);

  // Contract context from query params if navigated from contract
  const contractIdParam = searchParams.get("contractId") || "";
  const cropParam = searchParams.get("crop") || "";

  // Helper to build curated 10-15 machinery inventory, reusing Firestore data and preventing duplicates
  const buildCuratedList = (dbDocs: MachineryItem[]): MachineryItem[] => {
    const MAX_MACHINERY_LIMIT = 15;
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const uniqueDbItems: MachineryItem[] = [];

    // 1. Deduplicate real database records
    for (const item of dbDocs) {
      const normName = (item.name || "").trim().toLowerCase();
      if (!seenIds.has(item.id) && !seenNames.has(normName)) {
        seenIds.add(item.id);
        seenNames.add(normName);
        uniqueDbItems.push(item);
      }
    }

    // 2. Sort real database items by recency
    uniqueDbItems.sort((a: any, b: any) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

    const result: MachineryItem[] = [...uniqueDbItems];

    // 3. Supplement with INITIAL_MACHINERY if fewer than 15 to ensure 10-15 items
    if (result.length < MAX_MACHINERY_LIMIT) {
      for (let i = 0; i < INITIAL_MACHINERY.length && result.length < MAX_MACHINERY_LIMIT; i++) {
        const sample = INITIAL_MACHINERY[i];
        const sampleName = sample.name.trim().toLowerCase();
        const sampleType = sample.type.trim().toLowerCase();

        const nameExists = seenNames.has(sampleName);
        const typeExists = result.some((m) => m.type.trim().toLowerCase() === sampleType);

        if (!nameExists && !typeExists) {
          seenNames.add(sampleName);
          result.push({
            ...sample,
            id: `sample-machinery-${i + 1}`,
          });
        }
      }

      for (let i = 0; i < INITIAL_MACHINERY.length && result.length < MAX_MACHINERY_LIMIT; i++) {
        const sample = INITIAL_MACHINERY[i];
        const sampleName = sample.name.trim().toLowerCase();
        if (!seenNames.has(sampleName)) {
          seenNames.add(sampleName);
          result.push({
            ...sample,
            id: `sample-machinery-${i + 1}`,
          });
        }
      }
    }

    // Strictly limit to a maximum of 15 items
    return result.slice(0, MAX_MACHINERY_LIMIT);
  };

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;

    const stopListening = () => {
      unsubscribeSnapshot?.();
    };

    setLoading(true);
    setHasLoaded(false);
    setErrorMessage(null);

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        stopListening();

        if (!user) {
          // If not authenticated yet, present the curated sample inventory gracefully
          const fallback = buildCuratedList([]);
          setMachineryList(fallback);
          setLoading(false);
          setHasLoaded(true);
          return;
        }

        if (isAdminUserEmail(user.email)) {
          seedMachineryIfEmpty().catch(() => undefined);
        }

        setErrorMessage(null);

        unsubscribeSnapshot = onSnapshot(
          collection(db, "machinery"),
          (snapshot) => {
            const items: MachineryItem[] = snapshot.docs
              .map((docSnap) => {
                const data = docSnap.data() as any;
                if (!data) return null;

                const normalized: MachineryItem = {
                  id: docSnap.id,
                  name: data.name || data.title || "Machinery",
                  type: data.type || data.category || "Other",
                  provider: data.provider || data.owner || "AgriNex Partner",
                  providerPhone: data.providerPhone || data.phone || "",
                  location: data.location || data.address || "Unknown Location",
                  price: Number(data.price ?? data.rentalRate ?? data.rate ?? 0),
                  rateUnit: data.rateUnit || data.rentalRateUnit || data.unit || "Day",
                  status: data.status || (data.available === false ? "Unavailable" : "Available"),
                  description: data.description || data.details || "",
                  imageUrl: getMachineryImageUrl(
                    data.name || data.title || "",
                    data.imageUrl || data.image || data.photo
                  ),
                  horsePower: data.horsePower || data.hp || "",
                  fuelType: data.fuelType || "",
                  modelYear: data.modelYear || data.year || "",
                  capacity: data.capacity || "",
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt,
                };
                return normalized;
              })
              .filter(Boolean) as MachineryItem[];

            const curated = buildCuratedList(items);
            setMachineryList(curated);
            setLoading(false);
            setHasLoaded(true);
            setErrorMessage(null);
          },
          (error) => {
            console.warn("Firestore machinery load warning:", error);
            // Fall back to the curated 15 agricultural items so demo/display is never broken
            const fallback = buildCuratedList([]);
            setMachineryList(fallback);
            setLoading(false);
            setHasLoaded(true);
            setErrorMessage(null);
          }
        );
      },
      (error) => {
        console.warn("Authentication setup warning for machinery:", error);
        const fallback = buildCuratedList([]);
        setMachineryList(fallback);
        setLoading(false);
        setHasLoaded(true);
        setErrorMessage(null);
      }
    );

    return () => {
      stopListening();
      unsubscribeAuth();
    };
  }, [retryKey]);

  // Extract unique locations for filtering
  const locations = Array.from(
    new Set(machineryList.map((m) => (m.location || "").trim()).filter(Boolean))
  );

  // Filter & Search Logic
  const filteredMachinery = machineryList.filter((item) => {
    const name = (item.name || "").trim().toLowerCase();
    const type = (item.type || "").trim().toLowerCase();
    const location = (item.location || "").trim().toLowerCase();
    const provider = (item.provider || "").trim().toLowerCase();
    const description = (item.description || "").trim().toLowerCase();
    const search = searchTerm.trim().toLowerCase();

    const matchesSearch =
      !search ||
      name.includes(search) ||
      type.includes(search) ||
      location.includes(search) ||
      provider.includes(search) ||
      description.includes(search);

    const matchesType =
      selectedType === "All" || type === selectedType.trim().toLowerCase();

    const itemStatus = (item.status || "Available").trim().toLowerCase();
    const matchesStatus =
      selectedStatus === "All"
        ? true
        : selectedStatus === "Available"
          ? itemStatus === "available"
          : itemStatus !== "available";

    const matchesLocation =
      selectedLocation === "All" || location === selectedLocation.trim().toLowerCase();

    return matchesSearch && matchesType && matchesStatus && matchesLocation;
  });

  // Sorting
  const sortedMachinery = [...filteredMachinery].sort((a, b) => {
    const priceA = Number(a.price) || 0;
    const priceB = Number(b.price) || 0;
    if (sortBy === "price_asc") return priceA - priceB;
    if (sortBy === "price_desc") return priceB - priceA;
    return 0;
  });

  const showNoResultsState =
    hasLoaded && !loading && !errorMessage && machineryList.length > 0 && sortedMachinery.length === 0;

  const showNoMachineryState =
    hasLoaded && !loading && !errorMessage && machineryList.length === 0;

  return (
    <div className="p-6 pb-24 min-h-screen bg-[#F0F7F4] text-[#1B4332]">
      {/* Top Bar with BackButton & Action Buttons */}
      <div className="flex items-center justify-between mb-4">
        <BackButton />
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/my-machinery-requests")}
            className="flex items-center gap-1.5 bg-white text-[#2D6A4F] px-3.5 py-2 rounded-full font-bold text-xs shadow-sm border border-gray-100 hover:bg-[#E8F5E9] transition-colors"
          >
            <ClipboardList size={15} /> My Requests
          </button>
          {isAdminUserEmail(auth.currentUser?.email) && (
            <button
              onClick={() => navigate("/admin/machinery")}
              className="flex items-center gap-1.5 bg-[#2D6A4F] text-white px-3.5 py-2 rounded-full font-bold text-xs shadow-sm hover:bg-[#1B4332] transition-colors"
            >
              <Shield size={14} /> Admin Hub
            </button>
          )}
          <NotificationBell />
        </div>
      </div>

      {/* Hero Title Section */}
      <div className="bg-gradient-to-br from-[#2D6A4F] to-[#1B4332] text-white p-6 rounded-3xl mb-6 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-white/20 text-[#D8F3DC] px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-2 backdrop-blur-md">
            <Sparkles size={12} /> Agricultural Equipment Service
          </div>
          <h1 className="text-2xl sm:text-3xl font-black leading-tight">🚜 Machinery Management</h1>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-md">
            Find and hire verified tractors, harvesters, rotavators, and implements tailored for your farm lifecycle.
          </p>
        </div>
        <div className="absolute right-3 -bottom-4 text-7xl opacity-20 select-none">🌾</div>
      </div>

      {/* Contract Integration Banner (If navigated with contract context) */}
      {contractIdParam && (
        <div className="bg-[#E8F5E9] border border-[#A5D6A7] p-4 rounded-2xl mb-6 flex items-center justify-between">
          <div className="text-xs">
            <span className="font-bold text-[#2D6A4F] uppercase tracking-wide">Contract Support Active:</span>
            <p className="text-[#1B4332] font-black mt-0.5">
              Contract #{contractIdParam} {cropParam ? `(${cropParam})` : ""}
            </p>
          </div>
          <span className="text-[10px] font-bold bg-[#2D6A4F] text-white px-2.5 py-1 rounded-full">
            Linked Mode
          </span>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mb-6 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search machinery by name, type, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-[#1B4332] focus:bg-white focus:outline-none focus:border-[#2D6A4F]"
          />
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Machinery Type */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
            >
              <option value="All">All Machinery Types</option>
              {MACHINERY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
            >
              <option value="All">All Availability</option>
              <option value="Available">Available Now</option>
              <option value="Unavailable">Booked / Unavailable</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
            >
              <option value="All">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Price */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Quick Type Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          <button
            onClick={() => setSelectedType("All")}
            className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${selectedType === "All"
                ? "bg-[#2D6A4F] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
          >
            All ({machineryList.length})
          </button>
          {MACHINERY_TYPES.map((type) => {
            const count = machineryList.filter((m) => (m.type || "").trim().toLowerCase() === type.toLowerCase()).length;
            if (count === 0) return null;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${selectedType === type
                    ? "bg-[#2D6A4F] text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
              >
                {type} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-black uppercase tracking-wider text-gray-500">
          Showing {sortedMachinery.length} {sortedMachinery.length === 1 ? "Machine" : "Machines"}
        </p>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white p-4 rounded-3xl border border-gray-100 animate-pulse space-y-3">
              <div className="h-40 bg-gray-200 rounded-2xl w-full"></div>
              <div className="h-5 bg-gray-200 rounded-md w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded-md w-1/2"></div>
              <div className="h-10 bg-gray-200 rounded-full w-full"></div>
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center shadow-sm max-w-md mx-auto my-8">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wrench size={32} />
          </div>
          <h3 className="text-lg font-black text-[#1B4332] mb-1">Machinery could not be loaded</h3>
          <p className="text-xs text-gray-500 mb-6">{errorMessage}</p>
          <button
            onClick={() => setRetryKey((value) => value + 1)}
            className="bg-[#2D6A4F] text-white px-6 py-2.5 rounded-full font-bold text-xs shadow-sm hover:bg-[#1B4332]"
          >
            Retry
          </button>
        </div>
      ) : showNoResultsState ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center shadow-sm max-w-md mx-auto my-8">
          <div className="w-16 h-16 bg-[#F0F7F4] text-[#2D6A4F] rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={28} />
          </div>
          <h3 className="text-lg font-black text-[#1B4332] mb-1">No matching machinery found</h3>
          <p className="text-xs text-gray-500 mb-6">
            Try adjusting your search query, location, or machinery type filters.
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedType("All");
              setSelectedStatus("All");
              setSelectedLocation("All");
            }}
            className="bg-[#2D6A4F] text-white px-6 py-2.5 rounded-full font-bold text-xs shadow-sm hover:bg-[#1B4332]"
          >
            Reset Filters
          </button>
        </div>
      ) : showNoMachineryState ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center shadow-sm max-w-md mx-auto my-8">
          <div className="w-16 h-16 bg-[#F0F7F4] text-[#2D6A4F] rounded-full flex items-center justify-center mx-auto mb-4">
            <Wrench size={32} />
          </div>
          <h3 className="text-lg font-black text-[#1B4332] mb-1">No Machinery Found</h3>
          <p className="text-xs text-gray-500 mb-6">
            There are currently no machinery records available in the system.
          </p>
        </div>
      ) : (
        /* Machinery Grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedMachinery.map((item) => {
            const statusCfg = STATUS_PILL[item.status] || STATUS_PILL.Available;
            const isAvailable = item.status === "Available";
            const imageUrl = getMachineryImageUrl(item.name, item.imageUrl);
            const showImage = imageUrl && !failedImageIds.has(item.id);

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Card Image */}
                  <div className="relative h-44 -mx-4 -mt-4 mb-3 overflow-hidden rounded-t-3xl bg-slate-900">
                    {showImage ? (
                      <img
                        src={imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={() => {
                          setFailedImageIds((failed) => {
                            const next = new Set(failed);
                            next.add(item.id);
                            return next;
                          });
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#2D6A4F] text-white">
                        <Wrench size={40} className="opacity-40" />
                      </div>
                    )}
                    <span className="absolute top-3 left-3 bg-white/95 text-[#1B4332] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                      {item.type}
                    </span>
                    <span
                      className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${statusCfg.bg} ${statusCfg.text}`}
                    >
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Card Title & Provider */}
                  <div className="mb-2">
                    <h3 className="font-black text-[#1B4332] text-base line-clamp-1 leading-snug">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5 font-medium">
                      <MapPin size={13} className="text-[#2D6A4F] shrink-0" />
                      <span className="truncate">{item.location}, TN</span>
                      <span>•</span>
                      <span className="truncate text-gray-600">{item.provider}</span>
                    </div>
                  </div>

                  {/* Description preview */}
                  <p className="text-xs text-gray-600 line-clamp-2 mb-3 bg-[#F0F7F4]/60 p-2.5 rounded-xl">
                    {item.description}
                  </p>
                </div>

                <div>
                  {/* Price Row */}
                  <div className="flex items-baseline justify-between pt-2 border-t border-gray-100 mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Rate</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-[#2D6A4F]">₹{item.price.toLocaleString()}</span>
                        <span className="text-xs text-gray-500 font-bold">/ {item.rateUnit}</span>
                      </div>
                    </div>
                    {item.horsePower && (
                      <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                        ⚡ {item.horsePower}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setActiveDetailsItem(item)}
                      className="w-full bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[#1B4332] py-2.5 rounded-full font-bold text-xs transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => setActiveRequestItem(item)}
                      disabled={!isAvailable}
                      className={`w-full py-2.5 rounded-full font-black text-xs transition-all shadow-sm ${isAvailable
                          ? "bg-[#2D6A4F] hover:bg-[#1B4332] text-white active:scale-95"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                    >
                      {isAvailable ? "Request Now" : "Unavailable"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {activeDetailsItem && (
        <MachineryDetailsModal
          machinery={activeDetailsItem}
          onClose={() => setActiveDetailsItem(null)}
          onRequest={(item) => {
            setActiveDetailsItem(null);
            setActiveRequestItem(item);
          }}
        />
      )}

      {/* Request Form Modal */}
      {activeRequestItem && (
        <MachineryRequestModal
          machinery={activeRequestItem}
          initialContractId={contractIdParam}
          initialCropName={cropParam}
          onClose={() => setActiveRequestItem(null)}
          onSuccess={() => { }}
        />
      )}
    </div>
  );
}
