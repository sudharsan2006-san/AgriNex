import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";

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

  app.get("/api/weather-data", async (req, res) => {
    try {
      const { lat, lng } = req.query;
      const apiKey = process.env.WEATHER_API_KEY;
      if (!apiKey) {
        throw new Error("WEATHER_API_KEY is not defined");
      }

      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
      );
      const data = response.data;

      // Transform to our format
      const weatherData = {
        current: {
          temp: data.list[0].main.temp,
          condition: data.list[0].weather[0].main,
          humidity: data.list[0].main.humidity,
          windSpeed: data.list[0].wind.speed,
          rainfall: data.list[0].rain?.['3h'] || 0,
          rainProb: data.list[0].pop * 100 || 0,
          expectedRain: data.list[0].rain?.['3h'] || 0
        },
        hourly: data.list.slice(0, 7).map((h: any) => ({
          time: new Date(h.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          condition: h.weather[0].main,
          prob: h.pop * 100,
          rain: h.rain?.['3h'] || 0,
          temp: h.main.temp
        })),
        lastUpdated: new Date().toISOString()
      };

      res.json(weatherData);
    } catch (error) {
      console.error("Weather API Error:", error);
      res.status(500).json({ error: "Unable to fetch live weather data. Please check your internet connection or API connection." });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
