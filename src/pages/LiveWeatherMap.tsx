import React, { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import {
  MapPin, RefreshCw, Droplets, Wind, Search, Navigation,
  CloudRain, Sun, Cloud, AlertTriangle, CheckCircle2,
  Calendar, Clock, Layers, Sparkles, Sprout, ArrowRight, X
} from "lucide-react";
import BackButton from "../components/BackButton";

// Fix for Leaflet default marker icons in bundlers
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const customMarkerIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [26, 42],
  iconAnchor: [13, 42],
  popupAnchor: [0, -36],
});

// Dynamic map controller to smoothly pan/zoom when location changes
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 11, { duration: 1.2 });
  }, [center, map]);
  return null;
}

// Live Radar Layer from RainViewer API
function RadarLayer({ timestamp, enabled }: { timestamp: number | null; enabled: boolean }) {
  const map = useMap();
  const layerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!enabled || !timestamp || !map) return;

    const layer = L.tileLayer(
      `https://tilecache.rainviewer.com/v2/radar/${timestamp}/256/{z}/{x}/{y}/2/1_1.png`,
      {
        opacity: 0.7,
        minZoom: 2,
        maxZoom: 18,
        errorTileUrl: "",
      }
    );
    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [timestamp, enabled, map]);

  return null;
}

interface LocationItem {
  id?: number | string;
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
  displayName?: string;
}

const QUICK_LOCATIONS: LocationItem[] = [
  { name: "Chennai", latitude: 13.0827, longitude: 80.2707, admin1: "Tamil Nadu", country: "India", displayName: "Chennai, Tamil Nadu" },
  { name: "Madurai", latitude: 9.919, longitude: 78.1195, admin1: "Tamil Nadu", country: "India", displayName: "Madurai, Tamil Nadu" },
  { name: "Coimbatore", latitude: 11.0168, longitude: 76.9558, admin1: "Tamil Nadu", country: "India", displayName: "Coimbatore, Tamil Nadu" },
  { name: "Salem", latitude: 11.6643, longitude: 78.146, admin1: "Tamil Nadu", country: "India", displayName: "Salem, Tamil Nadu" },
  { name: "Tiruchirappalli", latitude: 10.7905, longitude: 78.7047, admin1: "Tamil Nadu", country: "India", displayName: "Tiruchirappalli, Tamil Nadu" },
  { name: "Thanjavur", latitude: 10.787, longitude: 79.1378, admin1: "Tamil Nadu", country: "India", displayName: "Thanjavur, Tamil Nadu" },
  { name: "Tirunelveli", latitude: 8.7139, longitude: 77.7567, admin1: "Tamil Nadu", country: "India", displayName: "Tirunelveli, Tamil Nadu" },
];

export default function LiveWeatherMap() {
  // Current selected location (defaults to Chennai, Tamil Nadu)
  const [selectedLocation, setSelectedLocation] = useState<LocationItem>(() => {
    const saved = localStorage.getItem("agrinex_selected_location");
    return saved ? JSON.parse(saved) : QUICK_LOCATIONS[0];
  });

  // Weather data & loading states
  const [weather, setWeather] = useState<any>(() => {
    const saved = localStorage.getItem("agrinex_weather_cache");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => {
    const saved = localStorage.getItem("agrinex_weather_last_updated");
    return saved ? new Date(saved) : null;
  });

  // Location search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Geolocation & permissions
  const [gpsLoading, setGpsLoading] = useState(false);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  // Radar Layer
  const [radarEnabled, setRadarEnabled] = useState(true);
  const [radarTimestamp, setRadarTimestamp] = useState<number | null>(null);
  const [radarTimeStr, setRadarTimeStr] = useState<string | null>(null);

  // Fetch Radar frames from RainViewer
  const fetchRadarMeta = useCallback(async () => {
    try {
      const res = await axios.get("https://api.rainviewer.com/public/weather-maps.json", { timeout: 5000 });
      const pastFrames = res.data?.radar?.past || [];
      const nowcastFrames = res.data?.radar?.nowcast || [];
      const allFrames = [...pastFrames, ...nowcastFrames].map((f: any) => f.time);
      if (allFrames.length > 0) {
        const latestTime = allFrames[allFrames.length - 1];
        setRadarTimestamp(latestTime);
        setRadarTimeStr(new Date(latestTime * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    } catch (err) {
      console.warn("RainViewer radar meta unavailable:", err);
    }
  }, []);

  // Fetch Weather Forecast from backend
  const fetchWeatherData = useCallback(async (lat: number, lng: number, locName?: string) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/weather-data?lat=${lat}&lng=${lng}`, { timeout: 9000 });
      const data = res.data;
      setWeather(data);
      setIsCached(false);
      const now = new Date();
      setLastUpdated(now);

      // Save to localStorage
      localStorage.setItem("agrinex_weather_cache", JSON.stringify(data));
      localStorage.setItem("agrinex_weather_last_updated", now.toISOString());
      if (locName) {
        const locObj = { name: locName, latitude: lat, longitude: lng, displayName: locName };
        localStorage.setItem("agrinex_selected_location", JSON.stringify(locObj));
      }
    } catch (err: any) {
      console.error("Failed to fetch weather data:", err);
      // If network fails, attempt cache fallback
      const cached = localStorage.getItem("agrinex_weather_cache");
      if (cached) {
        setWeather(JSON.parse(cached));
        setIsCached(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Location select handler
  const handleSelectLocation = (loc: LocationItem) => {
    setSelectedLocation(loc);
    setShowDropdown(false);
    setSearchQuery("");
    setPermissionNotice(null);
    fetchWeatherData(loc.latitude, loc.longitude, loc.displayName || loc.name);
  };

  // Search input change with debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await axios.get(`/api/location-search?query=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(res.data || []);
        setShowDropdown(true);
      } catch (err) {
        console.error("Location search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Detect GPS Location
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setPermissionNotice("Geolocation is not supported by your browser. Please search for your farming location.");
      return;
    }

    setGpsLoading(true);
    setPermissionNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const { latitude, longitude } = pos.coords;
        const myLoc: LocationItem = {
          name: "My Farm Location",
          latitude,
          longitude,
          displayName: `Current Location (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`,
        };
        setSelectedLocation(myLoc);
        fetchWeatherData(latitude, longitude, myLoc.displayName);
        fetchRadarMeta();
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionNotice("Location permission denied. Showing default / selected location. You can search any village or city above.");
        } else {
          setPermissionNotice("Unable to detect current GPS location. Please choose a nearby farming center or search above.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Manual Refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchWeatherData(selectedLocation.latitude, selectedLocation.longitude, selectedLocation.displayName || selectedLocation.name);
    fetchRadarMeta();
  };

  // Initial load
  useEffect(() => {
    fetchWeatherData(selectedLocation.latitude, selectedLocation.longitude, selectedLocation.displayName || selectedLocation.name);
    fetchRadarMeta();

    // Auto-refresh weather every 5 minutes
    const interval = setInterval(() => {
      fetchWeatherData(selectedLocation.latitude, selectedLocation.longitude);
      fetchRadarMeta();
    }, 300000);

    return () => clearInterval(interval);
  }, [fetchWeatherData, fetchRadarMeta, selectedLocation.latitude, selectedLocation.longitude]);

  // Rain status calculations
  const rainStatus = weather?.current?.rainStatus || "none";
  const statusBadgeConfig = {
    heavy: {
      title: "🌧️ Heavy Rain Expected",
      bg: "bg-red-50 border-red-200 text-red-900",
      pill: "bg-red-600 text-white",
      desc: "Substantial precipitation forecast. Prepare farm drainage.",
    },
    light: {
      title: "🌦️ Light Rain Possible",
      bg: "bg-blue-50 border-blue-200 text-blue-900",
      pill: "bg-blue-600 text-white",
      desc: "Scattered showers or drizzle expected. Plan activities accordingly.",
    },
    none: {
      title: "☁️ No Rain Expected",
      bg: "bg-emerald-50 border-emerald-200 text-emerald-900",
      pill: "bg-emerald-600 text-white",
      desc: "Dry weather conditions forecast for the immediate hours ahead.",
    },
  }[rainStatus as "heavy" | "light" | "none"] || {
    title: "☁️ No Rain Expected",
    bg: "bg-emerald-50 border-emerald-200 text-emerald-900",
    pill: "bg-emerald-600 text-white",
    desc: "Dry weather conditions forecast.",
  };

  return (
    <div className="min-h-screen bg-[#F0F7F4] text-[#1B4332] pb-24">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-lg font-black text-[#1B4332] flex items-center gap-1.5">
                <CloudRain className="text-[#2D6A4F]" size={22} />
                Live Rain Prediction
              </h1>
              <p className="text-xs text-gray-500 font-medium">Real-time Doppler Radar & Precipitation Forecast</p>
            </div>
          </div>
          <button
            id="rain-refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-50 text-[#2D6A4F] border border-green-200 hover:bg-green-100 transition-all disabled:opacity-50"
            title="Refresh weather data"
          >
            <RefreshCw size={14} className={refreshing || loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{refreshing ? "Updating..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4 space-y-4">
        {/* Permission / Fallback Notice */}
        {permissionNotice && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-2xl text-xs flex items-start gap-2 shadow-xs animate-in fade-in">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{permissionNotice}</p>
            </div>
            <button onClick={() => setPermissionNotice(null)} className="text-amber-600 hover:text-amber-900">
              <X size={14} />
            </button>
          </div>
        )}

        {/* 1. Location Search Section */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2" ref={searchContainerRef}>
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Search size={18} />
              </div>
              <input
                id="rain-location-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                placeholder="Search location (e.g. Chennai, Madurai, Salem, Coimbatore)..."
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs sm:text-sm text-[#1B4332] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}

              {/* Autocomplete Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                  {searchResults.map((loc, idx) => (
                    <button
                      key={`${loc.latitude}-${loc.longitude}-${idx}`}
                      onClick={() => handleSelectLocation(loc)}
                      className="w-full text-left px-4 py-2.5 hover:bg-green-50 text-xs border-b border-gray-50 flex items-center justify-between text-[#1B4332] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-[#2D6A4F] shrink-0" />
                        <span className="font-semibold">{loc.displayName || loc.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">Select</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Use My GPS Button */}
            <button
              id="rain-gps-btn"
              onClick={handleDetectLocation}
              disabled={gpsLoading}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-[#2D6A4F] text-white hover:bg-[#1B4332] active:scale-98 transition-all shrink-0 shadow-xs disabled:opacity-60"
            >
              <Navigation size={14} className={gpsLoading ? "animate-spin" : ""} />
              <span>{gpsLoading ? "Detecting..." : "Use My Location"}</span>
            </button>
          </div>

          {/* Quick Hub Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">Hubs:</span>
            {QUICK_LOCATIONS.map((loc) => {
              const isSelected = selectedLocation.name === loc.name;
              return (
                <button
                  key={loc.name}
                  onClick={() => handleSelectLocation(loc)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-[#2D6A4F] text-white shadow-xs"
                      : "bg-gray-100 hover:bg-green-100 text-[#1B4332]"
                  }`}
                >
                  {loc.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Interactive Map Section */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
          <div className="p-3.5 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-green-100 text-[#1B4332] text-[11px]">
                <MapPin size={12} className="text-[#2D6A4F]" />
                {selectedLocation.displayName || selectedLocation.name}
              </span>
              <span className="text-gray-400 text-[11px] hidden sm:inline">
                [{selectedLocation.latitude.toFixed(3)}°N, {selectedLocation.longitude.toFixed(3)}°E]
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setRadarEnabled((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border ${
                  radarEnabled
                    ? "bg-blue-50 border-blue-200 text-blue-800"
                    : "bg-gray-100 border-gray-200 text-gray-600"
                }`}
              >
                <Layers size={12} />
                <span>{radarEnabled ? "Radar Active" : "Radar Off"}</span>
              </button>
              {radarTimeStr && radarEnabled && (
                <span className="text-[10px] text-gray-400 hidden md:inline">Radar time: {radarTimeStr}</span>
              )}
            </div>
          </div>

          {/* Leaflet Map Frame */}
          <div className="relative w-full h-80 sm:h-96 z-0">
            <MapContainer
              center={[selectedLocation.latitude, selectedLocation.longitude]}
              zoom={10}
              scrollWheelZoom={true}
              className="w-full h-full"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                minZoom={2}
                maxZoom={18}
              />
              <MapController center={[selectedLocation.latitude, selectedLocation.longitude]} />
              <Marker
                position={[selectedLocation.latitude, selectedLocation.longitude]}
                icon={customMarkerIcon}
              >
                <Popup>
                  <div className="text-xs p-1">
                    <p className="font-bold text-[#1B4332]">{selectedLocation.displayName || selectedLocation.name}</p>
                    <p className="text-gray-600">Rain Prob: {weather?.current?.rainProb ?? 0}%</p>
                    <p className="text-gray-600">Expected: {weather?.current?.expectedRain ?? 0} mm</p>
                  </div>
                </Popup>
              </Marker>
              <RadarLayer timestamp={radarTimestamp} enabled={radarEnabled} />
            </MapContainer>

            {/* Radar Legend Overlay */}
            {radarEnabled && (
              <div className="absolute bottom-2 right-2 z-[1000] bg-white/90 backdrop-blur-xs px-2 py-1 rounded-lg text-[9px] font-semibold text-gray-600 shadow-xs border border-gray-200">
                <span>RainViewer Live Radar</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Rain Status Card & Key Metrics */}
        {weather && (
          <div className={`rounded-3xl p-5 border shadow-sm transition-all ${statusBadgeConfig.bg}`}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 shadow-xs bg-white/80">
                  <Droplets size={14} className="text-blue-600" />
                  <span>Rain Status</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{statusBadgeConfig.title}</h2>
                <p className="text-xs mt-1 opacity-80 leading-relaxed max-w-lg">{statusBadgeConfig.desc}</p>
              </div>

              <div className="text-right">
                <span className="text-3xl sm:text-4xl font-black">{weather.current.temp}°C</span>
                <p className="text-xs font-semibold opacity-90 flex items-center justify-end gap-1">
                  <span>{weather.current.icon}</span>
                  <span>{weather.current.condition}</span>
                </p>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-black/10">
              <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl">
                <p className="text-[11px] font-bold opacity-70 uppercase tracking-wider">Rain Probability</p>
                <p className="text-xl sm:text-2xl font-black text-blue-700 mt-0.5">{weather.current.rainProb}%</p>
              </div>

              <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl">
                <p className="text-[11px] font-bold opacity-70 uppercase tracking-wider">Expected Rainfall</p>
                <p className="text-xl sm:text-2xl font-black text-blue-700 mt-0.5">{weather.current.expectedRain} <span className="text-xs font-bold text-gray-500">mm</span></p>
              </div>

              <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl">
                <p className="text-[11px] font-bold opacity-70 uppercase tracking-wider">Precipitation Now</p>
                <p className="text-xl sm:text-2xl font-black text-blue-700 mt-0.5">{weather.current.precipitation} <span className="text-xs font-bold text-gray-500">mm</span></p>
              </div>

              <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl">
                <p className="text-[11px] font-bold opacity-70 uppercase tracking-wider">Wind & Humidity</p>
                <p className="text-xs sm:text-sm font-black text-gray-800 mt-1">{weather.current.windSpeed} km/h • {weather.current.humidity}%</p>
              </div>
            </div>

            {/* Metadata Footer */}
            <div className="mt-3 pt-2.5 flex flex-wrap items-center justify-between text-[10px] opacity-70 border-t border-black/5">
              <span>Forecast Time: <strong>{weather.current.forecastTime || "Live"}</strong></span>
              <span>Last Updated: <strong>{lastUpdated ? lastUpdated.toLocaleTimeString() : "Just now"}</strong> {isCached && "(Cached)"}</span>
            </div>
          </div>
        )}

        {/* 4. Agricultural Farmer Alert */}
        {weather?.current?.farmerAlert && (
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-start gap-3">
            <div className="p-2.5 bg-green-50 text-[#2D6A4F] rounded-2xl shrink-0">
              <Sprout size={22} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2D6A4F] bg-green-50 px-2 py-0.5 rounded-md">
                  FARMER IRRIGATION ADVISORY
                </span>
                <span className="text-[10px] text-gray-400">Data-driven forecast</span>
              </div>
              <p className="text-sm font-bold text-[#1B4332] leading-snug">
                {weather.current.farmerAlert}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Calculated automatically from Doppler radar and institutional meteorological predictions for {selectedLocation.name}.
              </p>
            </div>
          </div>
        )}

        {/* 5. Next Few Hours Forecast (Hourly Timeline) */}
        {weather?.hourly && weather.hourly.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-[#1B4332] flex items-center gap-1.5">
                <Clock size={16} className="text-[#2D6A4F]" />
                Next 24 Hours Rain Prediction
              </h3>
              <span className="text-[11px] text-gray-400">Hourly breakdown</span>
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar">
              {weather.hourly.map((h: any, i: number) => {
                const hasRain = h.rain > 0 || h.prob >= 30;
                return (
                  <div
                    key={`${h.time}-${i}`}
                    className={`shrink-0 p-3 rounded-2xl text-center min-w-[90px] border transition-all ${
                      hasRain
                        ? "bg-blue-50/80 border-blue-200 text-blue-900"
                        : "bg-gray-50 border-gray-100 text-[#1B4332]"
                    }`}
                  >
                    <p className="text-[11px] font-bold text-gray-500 mb-1">{h.time}</p>
                    <span className="text-2xl block mb-1">{h.icon || "⛅"}</span>
                    <p className="text-xs font-black">{h.temp}°C</p>
                    <div className="mt-1.5 pt-1.5 border-t border-black/5">
                      <span className={`text-[11px] font-bold block ${h.prob >= 40 ? "text-blue-600" : "text-gray-500"}`}>
                        {h.prob}%
                      </span>
                      <span className="text-[10px] text-gray-400 block">{h.rain} mm</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Upcoming Days Forecast (7-Day Outlook) */}
        {weather?.daily && weather.daily.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-[#1B4332] flex items-center gap-1.5">
                <Calendar size={16} className="text-[#2D6A4F]" />
                7-Day Rainfall Outlook
              </h3>
              <span className="text-[11px] text-gray-400">Weekly trend</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {weather.daily.map((d: any, i: number) => (
                <div
                  key={d.date}
                  className={`p-3 rounded-2xl text-center border transition-all ${
                    i === 0
                      ? "bg-green-50/80 border-green-200"
                      : d.rainSum > 1 || d.probMax >= 40
                      ? "bg-blue-50/60 border-blue-200"
                      : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <p className="text-xs font-black text-[#1B4332]">{i === 0 ? "Today" : d.day}</p>
                  <p className="text-[10px] text-gray-400 mb-1">{d.formattedDate}</p>
                  <span className="text-2xl block my-1">{d.icon || "⛅"}</span>
                  <p className="text-xs font-bold text-[#1B4332]">
                    {d.tempMax}° <span className="text-[10px] text-gray-400 font-normal">/ {d.tempMin}°</span>
                  </p>
                  <div className="mt-1 pt-1 border-t border-black/5">
                    <p className="text-[10px] font-bold text-blue-600">{d.probMax}%</p>
                    <p className="text-[9px] text-gray-500">{d.rainSum} mm</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

