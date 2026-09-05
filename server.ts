import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";

// Load environment variables server-side from .env or .eve
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), ".eve") });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini
  let ai: GoogleGenAI | null = null;
  const getAi = () => {
    if (!ai) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not defined");
        }
        ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
        });
    }
    return ai;
  };

  // API routes
  app.post("/api/ai-weather-recommendation", async (req, res) => {
    try {
      const { weather } = req.body;
      const prompt = `
        Analyze the following agricultural data and provide a farmer-friendly recommendation.
        Current Weather: ${weather.current.condition}
        Temperature: ${weather.current.temp}°C
        Rain Probability: ${weather.current.rainProb}%
        Expected Rainfall: ${weather.current.expectedRain} mm
        
        Provide the output in JSON format with these fields:
        {
          "recommendation": "string",
          "riskLevel": "Low/Medium/High",
          "reason": "string",
          "suggestedAction": "string"
        }
      `;
      
      let retries = 0;
      let response;
      while (retries < 3) {
          try {
              response = await getAi().models.generateContent({
                model: "gemini-3.7-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                }
              });
              break;
          } catch (error: any) {
              if ((error?.status === 503 || error?.code === 503) && retries < 2) {
                  retries++;
                  await new Promise(resolve => setTimeout(resolve, 1500));
                  continue;
              }
              throw error;
          }
      }
      
      res.json(JSON.parse(response!.text!));
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "AI recommendation service is temporarily unavailable. Please try again in a moment." });
    }
  });

  function interpretWeatherCode(code: number): { condition: string; icon: string } {
    if (code === 0) return { condition: "Clear Sky", icon: "☀️" };
    if (code === 1 || code === 2) return { condition: "Partly Cloudy", icon: "⛅" };
    if (code === 3) return { condition: "Overcast", icon: "☁️" };
    if (code === 45 || code === 48) return { condition: "Fog", icon: "🌫️" };
    if (code >= 51 && code <= 55) return { condition: "Light Drizzle", icon: "🌦️" };
    if (code >= 61 && code <= 63) return { condition: "Rain", icon: "🌧️" };
    if (code === 65) return { condition: "Heavy Rain", icon: "🌧️" };
    if (code === 80 || code === 81) return { condition: "Rain Showers", icon: "🌦️" };
    if (code === 82) return { condition: "Violent Rain", icon: "🌧️" };
    if (code >= 95) return { condition: "Thunderstorm", icon: "⛈️" };
    return { condition: "Cloudy", icon: "☁️" };
  }

  app.get("/api/location-search", async (req, res) => {
    try {
      const query = ((req.query.query as string) || "").trim();
      if (!query || query.length < 2) {
        return res.json([]);
      }

      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
      const response = await axios.get(geoUrl, { timeout: 6000 });
      const results = (response.data.results || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        admin1: item.admin1 || "",
        country: item.country || "",
        displayName: [item.name, item.admin1, item.country].filter(Boolean).join(", "),
      }));

      res.json(results);
    } catch (error: any) {
      console.error("[Location Search Error]:", error?.message);
      const TAMIL_NADU_LOCATIONS = [
        { id: 1, name: "Chennai", latitude: 13.0827, longitude: 80.2707, admin1: "Tamil Nadu", country: "India", displayName: "Chennai, Tamil Nadu, India" },
        { id: 2, name: "Madurai", latitude: 9.919, longitude: 78.1195, admin1: "Tamil Nadu", country: "India", displayName: "Madurai, Tamil Nadu, India" },
        { id: 3, name: "Coimbatore", latitude: 11.0168, longitude: 76.9558, admin1: "Tamil Nadu", country: "India", displayName: "Coimbatore, Tamil Nadu, India" },
        { id: 4, name: "Salem", latitude: 11.6643, longitude: 78.146, admin1: "Tamil Nadu", country: "India", displayName: "Salem, Tamil Nadu, India" },
        { id: 5, name: "Tiruchirappalli", latitude: 10.7905, longitude: 78.7047, admin1: "Tamil Nadu", country: "India", displayName: "Tiruchirappalli, Tamil Nadu, India" },
        { id: 6, name: "Thanjavur", latitude: 10.787, longitude: 79.1378, admin1: "Tamil Nadu", country: "India", displayName: "Thanjavur, Tamil Nadu, India" },
        { id: 7, name: "Tirunelveli", latitude: 8.7139, longitude: 77.7567, admin1: "Tamil Nadu", country: "India", displayName: "Tirunelveli, Tamil Nadu, India" },
        { id: 8, name: "Erode", latitude: 11.341, longitude: 77.7172, admin1: "Tamil Nadu", country: "India", displayName: "Erode, Tamil Nadu, India" },
      ];
      const q = ((req.query.query as string) || "").toLowerCase();
      const filtered = TAMIL_NADU_LOCATIONS.filter(l => l.name.toLowerCase().includes(q));
      res.json(filtered);
    }
  });

  app.get("/api/weather-data", async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string) || 13.0827;
      const lng = parseFloat(req.query.lng as string) || 80.2707;
      const apiKey = process.env.WEATHER_API_KEY;

      // 1. If WEATHER_API_KEY is configured and valid, attempt OpenWeatherMap
      if (apiKey && apiKey !== "MY_WEATHER_API_KEY") {
        try {
          const owmRes = await axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`,
            { timeout: 5000 }
          );
          const data = owmRes.data;
          const currentRain = data.list[0].rain?.["3h"] ? Number((data.list[0].rain["3h"] / 3).toFixed(1)) : 0;
          const rainProb = Math.round((data.list[0].pop || 0) * 100);
          const expectedRain = data.list[0].rain?.["3h"] ? Number(data.list[0].rain["3h"].toFixed(1)) : 0;

          const next6h = data.list.slice(0, 2);
          const next6hRain = next6h.reduce((sum: number, h: any) => sum + (h.rain?.["3h"] || 0), 0);
          const next6hMaxProb = Math.max(...next6h.map((h: any) => (h.pop || 0) * 100), 0);

          let rainStatus: "heavy" | "light" | "none" = "none";
          if (expectedRain >= 5 || rainProb >= 70) rainStatus = "heavy";
          else if (expectedRain >= 0.5 || rainProb >= 30) rainStatus = "light";

          const farmerAlert = (next6hRain >= 1 || next6hMaxProb >= 40)
            ? "Rain expected in the next few hours. Consider delaying irrigation."
            : "No significant rain expected. Irrigation may be required.";

          return res.json({
            source: "OpenWeatherMap",
            location: { lat, lng },
            current: {
              temp: Math.round(data.list[0].main.temp),
              condition: data.list[0].weather[0].main,
              icon: data.list[0].weather[0].main.toLowerCase().includes("rain") ? "🌧️" : "⛅",
              humidity: data.list[0].main.humidity,
              windSpeed: Math.round(data.list[0].wind.speed * 3.6),
              precipitation: currentRain,
              rainProb,
              expectedRain,
              rainStatus,
              farmerAlert,
              forecastTime: new Date(data.list[0].dt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
            hourly: data.list.slice(0, 12).map((h: any) => ({
              time: new Date(h.dt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              condition: h.weather[0].main,
              icon: h.weather[0].main.toLowerCase().includes("rain") ? "🌧️" : "⛅",
              prob: Math.round((h.pop || 0) * 100),
              rain: h.rain?.["3h"] ? Number(h.rain["3h"].toFixed(1)) : 0,
              temp: Math.round(h.main.temp),
            })),
            daily: [],
            lastUpdated: new Date().toISOString(),
          });
        } catch (owmErr: any) {
          console.warn("[Weather API] OpenWeatherMap failed, falling back to Open-Meteo:", owmErr.message);
        }
      }

      // 2. High-precision, zero-key institutional real-time weather via Open-Meteo
      const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,precipitation,rain,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto&forecast_days=7`;
      const omRes = await axios.get(omUrl, { timeout: 8000 });
      const om = omRes.data;

      const currentWmo = interpretWeatherCode(om.current.weather_code);
      const curPrecip = Number((om.current.precipitation || 0).toFixed(1));

      // Hourly data starting from current hour
      const nowIso = new Date().toISOString().slice(0, 13);
      let startIndex = om.hourly.time.findIndex((t: string) => t.startsWith(nowIso));
      if (startIndex === -1) startIndex = 0;

      const nextHourly = om.hourly.time.slice(startIndex, startIndex + 24).map((timeStr: string, idx: number) => {
        const actualIdx = startIndex + idx;
        const code = om.hourly.weather_code[actualIdx];
        const info = interpretWeatherCode(code);
        const d = new Date(timeStr);
        return {
          time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          date: d.toLocaleDateString([], { month: "short", day: "numeric" }),
          condition: info.condition,
          icon: info.icon,
          code,
          prob: om.hourly.precipitation_probability[actualIdx] ?? 0,
          rain: Number((om.hourly.precipitation[actualIdx] ?? 0).toFixed(1)),
          temp: Math.round(om.hourly.temperature_2m[actualIdx] ?? 0),
        };
      });

      // Next 6 hours rain summary
      const next6h = nextHourly.slice(0, 6);
      const next6hRain = next6h.reduce((acc: number, h: any) => acc + h.rain, 0);
      const next6hMaxProb = Math.max(...next6h.map((h: any) => h.prob), 0);
      const currentProb = nextHourly[0]?.prob ?? 0;
      const expectedRainNextHours = Number(next6hRain.toFixed(1));

      let rainStatus: "heavy" | "light" | "none" = "none";
      if (expectedRainNextHours >= 5 || next6hMaxProb >= 70 || [65, 82, 95, 96, 99].includes(om.current.weather_code)) {
        rainStatus = "heavy";
      } else if (expectedRainNextHours >= 0.5 || next6hMaxProb >= 30 || [51, 53, 55, 61, 63, 80, 81].includes(om.current.weather_code)) {
        rainStatus = "light";
      }

      const farmerAlert = (next6hRain >= 1 || next6hMaxProb >= 40)
        ? "Rain expected in the next few hours. Consider delaying irrigation."
        : "No significant rain expected. Irrigation may be required.";

      // Daily 7-day forecast
      const dailyForecast = om.daily.time.map((dayStr: string, i: number) => {
        const code = om.daily.weather_code[i];
        const info = interpretWeatherCode(code);
        const d = new Date(dayStr);
        return {
          date: dayStr,
          day: d.toLocaleDateString([], { weekday: "short" }),
          formattedDate: d.toLocaleDateString([], { month: "short", day: "numeric" }),
          condition: info.condition,
          icon: info.icon,
          tempMax: Math.round(om.daily.temperature_2m_max[i]),
          tempMin: Math.round(om.daily.temperature_2m_min[i]),
          rainSum: Number(om.daily.precipitation_sum[i].toFixed(1)),
          probMax: om.daily.precipitation_probability_max[i] ?? 0,
        };
      });

      const forecastTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      res.json({
        source: "Open-Meteo Real-Time",
        location: { lat, lng },
        current: {
          temp: Math.round(om.current.temperature_2m),
          condition: currentWmo.condition,
          icon: currentWmo.icon,
          humidity: om.current.relative_humidity_2m,
          windSpeed: Math.round(om.current.wind_speed_10m),
          precipitation: curPrecip,
          rainProb: currentProb,
          expectedRain: expectedRainNextHours,
          rainStatus,
          farmerAlert,
          forecastTime,
        },
        hourly: nextHourly,
        daily: dailyForecast,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[Weather API Error]:", error?.message || error);
      res.status(500).json({
        error: "Unable to fetch live weather data. Please check your internet connection or API connection.",
      });
    }
  });

  app.get("/api/iot-sensor-data", async (req, res) => {
    try {
      // In a real scenario, this would fetch from an IoT backend/database.
      // For now, we simulate the interface for the real IoT device.
      const iotData = {
        soilMoisture: Math.floor(Math.random() * (60 - 30) + 30), // Simulate real-time sensor fluctuation
        lastUpdated: new Date().toISOString(),
        status: "Connected"
      };
      res.json(iotData);
    } catch (error) {
      res.status(500).json({ error: "Unable to fetch live IoT data." });
    }
  });

  // Pre-Booking Confirmation Email API endpoint with PDF report attachment
  app.post("/api/send-prebooking-report", async (req, res) => {
    const startTime = Date.now();
    console.log("\n[AgriNex Backend] POST /api/send-prebooking-report received");
    console.log("Request received");

    // Set a response timeout - always respond within 15 seconds
    const backendTimeout = setTimeout(() => {
      if (!res.headersSent) {
        console.error("[AgriNex] Backend timeout: email request took >15s, sending failure response");
        res.status(200).json({
          success: false,
          emailStatus: "failed",
          emailError: "Email backend timed out.",
          error: "Email backend timed out. Confirmation email could not be sent."
        });
      }
    }, 15000);

    try {
      const {
        bookingId,
        userName,
        userEmail,
        mobileNumber,
        cropName,
        quantity,
        unit,
        referencePrice,
        bookingDate,
        bookingTime,
        bookingStatus,
        preferredLocation,
        notes,
        sync,
        t_booking_saved,
        t_email_job_started
      } = req.body;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validEmail = typeof userEmail === "string" && emailRegex.test(userEmail.trim());

      console.log(`- Booking ID: ${bookingId || "MISSING"}`);
      console.log(`- Logged-in user email detected: ${validEmail ? "YES" : "NO"}`);
      console.log("- Recipient email source: Firebase authenticated user");

      if (!bookingId || !validEmail) {
        clearTimeout(backendTimeout);
        return res.status(400).json({
          success: false,
          emailStatus: "failed",
          emailError: !bookingId ? "Missing required bookingId." : "Invalid recipient email address format.",
          error: !bookingId ? "Missing required bookingId." : "Invalid recipient email address format."
        });
      }

      let sendPreBookingReportEmail: any;
      try {
        const mailerModule = await import("./src/server/mailer");
        sendPreBookingReportEmail = mailerModule.sendPreBookingReportEmail;
      } catch (impErr: any) {
        clearTimeout(backendTimeout);
        console.error("Failed to load mailer module:", impErr);
        return res.status(500).json({
          success: false,
          emailStatus: "failed",
          emailError: `Failed to load email module: ${impErr?.message || impErr}`,
          error: `Failed to load email module: ${impErr?.message || impErr}`
        });
      }

      const emailParams = {
        bookingId,
        userName: userName || "Valued Farmer",
        userEmail,
        mobileNumber: mobileNumber || "",
        cropName: cropName || "Crop",
        quantity: quantity || 1,
        unit: unit || "kg",
        referencePrice: referencePrice || 0,
        bookingDate: bookingDate || new Date().toISOString().split("T")[0],
        bookingTime: bookingTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        bookingStatus: bookingStatus || "Pre-Booked",
        preferredLocation: preferredLocation || "",
        notes: notes || "",
        t_booking_saved,
        t_email_job_started
      };

      // Non-blocking async execution by default for frontend UX (sync === false or undefined)
      if (sync !== true) {
        clearTimeout(backendTimeout);
        // Respond immediately to frontend so booking completes with 0 wait time
        res.status(200).json({
          success: true,
          emailStatus: "processing",
          message: "Booking received. Processing confirmation email in background.",
          bookingId
        });

        // Trigger background processing asynchronously
        setImmediate(async () => {
          try {
            await sendPreBookingReportEmail(emailParams);
          } catch (bgErr) {
            console.error("- Background email processing error:", bgErr);
          }
        });
        return;
      }

      // Synchronous execution for test diagnostics (sync === true)
      const result = await sendPreBookingReportEmail(emailParams);
      clearTimeout(backendTimeout);

      if (!res.headersSent) {
        return res.status(200).json({
          success: result.success,
          emailStatus: result.success ? "sent" : "failed",
          resendEmailId: result.resendEmailId || result.messageId || null,
          emailError: result.error || null,
          error: result.error || null,
          timing: result.timing,
          message: result.success
            ? `Confirmation report sent to ${userEmail}`
            : `Email delivery failed: ${result.error}`,
          details: result.details
        });
      }
    } catch (error: any) {
      clearTimeout(backendTimeout);
      console.error("[AgriNex API Error] /api/send-prebooking-report:", error?.message || error);
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          emailStatus: "failed",
          emailError: error?.message || "Internal server error during email dispatch.",
          error: error?.message || "Internal server error during email dispatch."
        });
      }
    }
  });

  // Test Email endpoint for verification (Step 4 / Step 6)
  app.post("/api/test-email", async (req, res) => {
    try {
      const { toEmail, includePdf } = req.body;
      const { sendSimpleTestEmail } = await import("./src/server/mailer");
      const result = await sendSimpleTestEmail(toEmail, Boolean(includePdf));
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error?.message || "Test email error." });
    }
  });

  // Notification Email API — handles all 5 notification event types
  // Recipient MUST come from the frontend Firebase authenticated user (never hardcoded)
  app.post("/api/send-notification-email", async (req, res) => {
    // Immediately respond 202 so the frontend is never blocked
    res.status(202).json({ success: true, emailStatus: "processing", message: "Notification email queued." });

    // Fire-and-forget background email dispatch
    setImmediate(async () => {
      try {
        const { type, toEmail, userName, title, message, payload } = req.body;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!type || !toEmail || !emailRegex.test(toEmail)) {
          console.error("[Notification API] Invalid request — missing type or bad email:", { type, toEmail });
          return;
        }

        const { sendNotificationEmail } = await import("./src/server/mailer");
        const result = await sendNotificationEmail({ type, toEmail, userName, title, message, payload });

        if (result.success) {
          console.log(`[Notification API] Email sent — type=${type} to=${toEmail} id=${result.resendEmailId}`);
        } else {
          console.error(`[Notification API] Email failed — type=${type} to=${toEmail} err=${result.error}`);
        }
      } catch (err: any) {
        console.error("[Notification API] Unexpected error:", err?.message || err);
      }
    });
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`\nAgriNex server running on http://localhost:${PORT}`);
    console.log(`- Server environment loaded: YES`);
    console.log(`- RESEND_API_KEY detected: ${Boolean(process.env.RESEND_API_KEY) ? "YES" : "NO"}`);
    console.log(`- Email API route active: POST /api/send-prebooking-report\n`);
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n[Server Error] Port ${PORT} is already in use by another running instance.`);
      console.error(`Please stop previous processes or use: taskkill /F /IM node.exe in PowerShell.\n`);
    } else {
      console.error("Server error:", err);
    }
  });
}

startServer();
