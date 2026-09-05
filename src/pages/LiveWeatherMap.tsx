import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import { MapPin, RefreshCw, Droplets, Wind } from "lucide-react";
import BackButton from "../components/BackButton";
import { useLanguage } from "../lib/i18n";

// Fix for default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });

// Dynamic Radar Layer Controller
function RadarLayer({ framePath }: { framePath: string | null }) {
  const map = useMap();
  const layerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!framePath || !map) return;

    // Remove old layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    const layer = L.tileLayer(`https://tilecache.rainviewer.com${framePath}/256/{z}/{x}/{y}/2/1_1.png`, {
      opacity: 0.6,
      minZoom: 2,
      maxNativeZoom: 7,
      maxZoom: 19,
    });
    layer.on("tileerror", (event) => console.warn("RainViewer radar tile failed", event.tile?.src));
    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [framePath, map]);
  return null;
}

export default function LiveWeatherMap() {
  const { t } = useLanguage();
  const mapRef = useRef<L.Map | null>(null);
  const [weather, setWeather] = useState<any>(() => JSON.parse(localStorage.getItem('agrinex_weather') || 'null'));
  const [aiRec, setAiRec] = useState<any>(() => JSON.parse(localStorage.getItem('agrinex_ai_rec') || 'null'));
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [forecast, setForecast] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => {
    const saved = localStorage.getItem('agrinex_last_updated');
    return saved ? new Date(saved) : null;
  });
  const [iotData, setIotData] = useState<any>(() => JSON.parse(localStorage.getItem('agrinex_iot') || 'null'));
  const [isOffline, setIsOffline] = useState(false);

  // Radar state
  const [radarFramePath, setRadarFramePath] = useState<string | null>(null);
  const [radarMeta, setRadarMeta] = useState<any>(null);

  const fetchRadarMeta = async () => {
    try {
      const res = await axios.get("https://api.rainviewer.com/public/weather-maps.json");
      const allFrames = [...res.data.radar.past, ...res.data.radar.nowcast];
      const frame = allFrames[allFrames.length - 1];
      setRadarFramePath(frame.path);
      setRadarMeta({ timestamp: new Date(frame.time * 1000) });
    } catch (e) {
      console.error("Error fetching radar meta:", e);
    }
  };

  const fetchWeather = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const [res, iotRes] = await Promise.all([
        axios.get(`/api/weather-data?lat=${lat}&lng=${lng}`),
        axios.get(`/api/iot-sensor-data`)
      ]);
      setWeather(res.data);
      setForecast(res.data);
      setIotData(iotRes.data);
      const now = new Date();
      setLastUpdated(now);
      setIsOffline(false);

      // Cache
      localStorage.setItem('agrinex_weather', JSON.stringify(res.data));
      localStorage.setItem('agrinex_iot', JSON.stringify(iotRes.data));
      localStorage.setItem('agrinex_last_updated', now.toISOString());
    } catch (e) {
      console.error("Error fetching live data:", e);
      setIsOffline(true);
      throw e; // Rethrow to handle in button handlers
    } finally {
      setLoading(false);
    }
  };

  const handleMyLocation = () => {
    alert(t("Getting your current location..."));
    setPermissionDenied(false);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });

        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 13);
        }

        try {
          await fetchWeather(latitude, longitude);
          await fetchRadarMeta();
          getAiRec();
        } catch (e) {
          alert(t("Unable to get your current location or weather."));
        }
      },
      () => {
        setPermissionDenied(true);
        alert(t("Unable to get your current location."));
      }
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (location) {
        await fetchWeather(location.lat, location.lng);
        await fetchRadarMeta();
        alert(t("Updated just now"));
      } else {
        throw new Error("Location not set");
      }
    } catch (e) {
      alert(t("Unable to refresh live weather data."));
    } finally {
      setRefreshing(false);
    }
  };

  const requestLocation = () => {
    setPermissionDenied(false);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        fetchWeather(latitude, longitude);
      },
      () => {
        setPermissionDenied(true);
      }
    );
  };

  useEffect(() => {
    requestLocation();
    fetchRadarMeta();

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      if (location) fetchWeather(location.lat, location.lng);
      fetchRadarMeta();
    }, 300000);
    return () => clearInterval(interval);
  }, [location]);

  const getAiRec = async () => {
    if (!weather || !iotData) return;
    setLoading(true);
    try {
      const response = await axios.post("/api/ai-weather-recommendation", {
        weather: weather,
        iot: iotData
      });
      setAiRec(response.data);
      localStorage.setItem('agrinex_ai_rec', JSON.stringify(response.data));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="relative w-screen h-screen">
      {location ? (
        <MapContainer center={[location.lat, location.lng]} zoom={10} className="w-full h-full" ref={mapRef}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            minZoom={2}
            maxZoom={19}
          />
          <Marker position={[location.lat, location.lng]}><Popup>{t("Current Location")}</Popup></Marker>
          <RadarLayer framePath={radarFramePath} />
        </MapContainer>
      ) : (
        <div className="flex h-full items-center justify-center bg-gray-900 text-white">{t("Loading Map...")}</div>
      )}


      {/* Floating Controls */}
      <div className="absolute top-4 right-4 z-[1000] space-y-2">
        <button onClick={handleMyLocation} className="bg-white p-3 rounded-lg shadow-md block"><MapPin size={20} /></button>
        <button onClick={handleRefresh} className="bg-white p-3 rounded-lg shadow-md block flex items-center gap-2">
          <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? t("Refreshing...") : t("Refresh")}
        </button>
      </div>

      {/* Weather Panel */}
      {weather && (
        <div className="absolute bottom-4 left-4 z-[1000] w-[calc(100vw-32px)] md:w-96 space-y-4">
          <div className="bg-white/90 p-4 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold text-lg flex items-center gap-2"><Droplets size={20} /> {t("LIVE STATUS")}</h2>
              <div className={`text-xs font-bold flex items-center gap-1 ${isOffline ? 'text-yellow-600' : 'text-green-600'}`}>
                {isOffline ? `⚠️ ${t("USING CACHED DATA")}` : `🟢 ${t("LIVE DATA")}`}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <p>{t("Weather")}: {weather.current.condition}</p>
              <p>{t("Rain Probability")}: {weather.current.rainProb}%</p>
              <p>{t("Expected Rainfall")}: {weather.current.expectedRain} mm</p>
              <p>{t("Temperature")}: {weather.current.temp}°C</p>
              <p>{t("Wind Speed")}: {weather.current.windSpeed} km/h</p>
              <p className="font-bold mt-2 text-green-700">{t("Soil Moisture")}: {iotData?.soilMoisture}%</p>
              <p className="text-xs text-gray-500">Last Updated: {lastUpdated?.toLocaleTimeString()}</p>
            </div>

            <div className="mt-4 p-2 bg-green-50 rounded text-xs font-semibold text-green-800">
              <p className="flex items-center gap-1 font-bold"><Wind size={14} /> {t("AI Farmer Alert")}</p>
              {aiRec ? aiRec.recommendation : <button onClick={getAiRec} className="underline">{t("Get Recommendation")}</button>}
            </div>
          </div>

          <div className="bg-white/90 p-4 rounded-xl shadow-lg flex gap-2 overflow-x-auto">
            {weather.hourly.map((f: any) => (
              <div key={f.time} className="flex-shrink-0 text-center p-2 bg-gray-50 rounded-lg min-w-[80px]">
                <p className="font-bold">{f.time}</p>
                <p className="text-xl">{f.condition === "Rain" ? "🌧" : f.condition === "Light Rain" ? "🌦" : "☁️"}</p>
                <p className="text-xs">{f.prob}%</p>
                <p className="text-xs">{f.rain} mm</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Radar Indicator */}
      {radarMeta && (
        <div className="absolute top-20 left-4 z-[1000] bg-white/90 p-2 rounded text-xs">
          <p className="font-bold text-green-600">🟢 {t("LIVE RADAR")}</p>
          <p>Updated: {radarMeta.timestamp.toLocaleTimeString()}</p>
          <p>{t("Source")}: RainViewer</p>
        </div>
      )}

      {/* Back Button */}
      <div className="absolute top-4 left-4 z-[1000]">
        <BackButton />
      </div>
    </div>
  );
}
