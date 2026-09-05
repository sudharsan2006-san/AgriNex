import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import { applicationDefault, cert, getApps, initializeApp as initializeAdminApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore, Timestamp } from "firebase-admin/firestore";
import fs from "fs";

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  return initializeAdminApp({
    credential: serviceAccount ? cert(JSON.parse(serviceAccount)) : applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || "agrinex-59bd9",
  });
}

function getAdminDb() {
  return getAdminFirestore(getAdminApp(), process.env.FIRESTORE_DATABASE_ID || "ai-studio-agrinex-d499a7f0-c357-4880-ac81-ff5bc653b4ef");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/send-prebooking-report", async (req, res) => {
    let bookingDocId: string | undefined;
    try {
      const authorization = req.headers.authorization;
      if (!authorization?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authentication is required." });
      }

      const token = await getAdminAuth(getAdminApp()).verifyIdToken(authorization.slice(7));
      const { bookingData, bookingDocId: requestedDocId, language = "en" } = req.body;
      const isTamil = language === "ta";
      bookingDocId = requestedDocId;
      if (!bookingData || !bookingDocId || bookingData.userId !== token.uid || !token.email) {
        return res.status(403).json({ error: "The booking does not belong to the authenticated user." });
      }

      const {
        bookingId, userName, cropName, quantity, quantityUnit, referencePrice,
        priceUnit, mobileNumber, bookingDate, bookingStatus,
      } = bookingData;
      const tamilStatuses: Record<string, string> = { Pending: "நிலுவையில் உள்ளது", Processing: "செயலாக்கத்தில் உள்ளது", Confirmed: "உறுதிப்படுத்தப்பட்டது", Completed: "முடிந்தது", Cancelled: "ரத்து செய்யப்பட்டது" };
      const tamilCrops: Record<string, string> = { Paddy: "நெல்", Maize: "மக்காச்சோளம்", Tomato: "தக்காளி", Onion: "வெங்காயம்", Potato: "உருளைக்கிழங்கு", Brinjal: "கத்தரிக்காய்", Okra: "வெண்டைக்காய்", Carrot: "கேரட்", Banana: "வாழைப்பழம்" };
      const displayCropName = isTamil ? tamilCrops[cropName] || cropName : cropName;
      const displayBookingStatus = isTamil ? tamilStatuses[bookingStatus] || bookingStatus : bookingStatus;
      const userEmail = token.email;
      console.log("[prebooking-email] Authenticated recipient:", userEmail);
      const adminDb = getAdminDb();
      const bookingRef = adminDb.collection("preBookings").doc(bookingDocId);
      const savedBooking = await bookingRef.get();
      if (!savedBooking.exists || savedBooking.data()?.userId !== token.uid) {
        return res.status(404).json({ error: "Booking was not found." });
      }
      console.log("[prebooking-email] Booking found; generating PDF:", { bookingDocId, bookingId });

      // 1. Generate PDF in memory
      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const tamilFont = process.env.TAMIL_FONT_PATH || "C:\\Windows\\Fonts\\latha.ttf";
        if (isTamil && !fs.existsSync(tamilFont)) throw new Error("Tamil PDF font is not configured. Set TAMIL_FONT_PATH to a Tamil-capable .ttf file.");
        const pdfFont = isTamil ? tamilFont : "Helvetica";
        if (isTamil) doc.font(pdfFont);
        doc.rect(50, 45, 42, 42).fill("#2D6A4F");
        doc.fillColor("white").fontSize(25).font("Helvetica-Bold").text("A", 62, 53);
        doc.fillColor("#1B4332").fontSize(24).text("AgriNex", 105, 50);
        doc.font(isTamil ? pdfFont : "Helvetica").fillColor("#52796F").fontSize(10).text(isTamil ? "ஸ்மார்ட் பண்ணைகள் • சிறந்த நாளை" : "Smart Farming • Better Tomorrow", 107, 78);
        doc.moveTo(50, 105).lineTo(545, 105).strokeColor("#B7D7C5").stroke();
        doc.font(isTamil ? pdfFont : "Helvetica-Bold").fillColor("#1B4332").fontSize(20).text(isTamil ? "முன்பதிவு உறுதிப்படுத்தல்" : "Pre-Booking Confirmation", 50, 135);
        if (!isTamil) doc.font("Helvetica");
        doc.fillColor("#333333").fontSize(11);
        const details = [
          [isTamil ? "முன்பதிவு எண்" : "Booking ID", bookingId], [isTamil ? "பயனர் பெயர்" : "User Name", userName], [isTamil ? "பயனர் மின்னஞ்சல்" : "User Email", userEmail],
          [isTamil ? "கைபேசி எண்" : "Mobile Number", mobileNumber], [isTamil ? "பயிர் பெயர்" : "Crop Name", displayCropName], [isTamil ? "அளவு" : "Quantity", `${quantity} ${quantityUnit}`],
          [isTamil ? "குறிப்பு விலை" : "Reference Price", `₹${referencePrice} / ${priceUnit}`], [isTamil ? "முன்பதிவு தேதி மற்றும் நேரம்" : "Booking Date and Time", bookingDate],
          [isTamil ? "முன்பதிவு நிலை" : "Booking Status", displayBookingStatus],
        ];
        let y = 185;
        for (const [label, value] of details) {
          doc.font(isTamil ? pdfFont : "Helvetica-Bold").fillColor("#1B4332").text(`${label}:`, 65, y, { width: 165 });
          doc.font(isTamil ? pdfFont : "Helvetica").fillColor("#333333").text(String(value || "-"), 235, y, { width: 290 });
          y += 28;
        }
        doc.font(isTamil ? pdfFont : "Helvetica").fillColor("#52796F").fontSize(9).text(isTamil ? "AgriNex-ஐ தேர்ந்தெடுத்ததற்கு நன்றி." : "Thank you for choosing AgriNex.", 50, y + 25);
        doc.end();
      });
      if (!pdfBuffer.length) {
        throw new Error("PDF generation returned an empty attachment.");
      }
      console.log("[prebooking-email] PDF generated:", { bookingId, bytes: pdfBuffer.length });

      // 2. Send Email through Resend when configured, otherwise use SMTP.
      const attachmentName = `AgriNex_PreBooking_${bookingId}.pdf`;
      if (process.env.RESEND_API_KEY) {
        const resendResponse = await axios.post("https://api.resend.com/emails", {
          from: process.env.RESEND_FROM_EMAIL || "AgriNex <onboarding@resend.dev>",
          to: [userEmail],
          subject: isTamil ? `AgriNex - உங்கள் முன்பதிவு உறுதிப்படுத்தப்பட்டது` : `AgriNex - Your Booking Has Been Confirmed`,
          text: isTamil ? `${userName}, வணக்கம்.\n\nஉங்கள் AgriNex முன்பதிவு வெற்றிகரமாக பதிவு செய்யப்பட்டது.\n\nAgriNex-ஐ பயன்படுத்தியதற்கு நன்றி.` : `Hello ${userName},\n\nYour AgriNex Pre-Booking has been successfully submitted.\n\nThank you for using AgriNex.`,
          attachments: [{ filename: attachmentName, content: pdfBuffer.toString("base64") }],
        }, { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, timeout: 15000 });
        console.log("[prebooking-email] Resend accepted email:", { bookingId, response: resendResponse.data, attachment: attachmentName });
      } else {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
          throw new Error("Email delivery is not configured. Set RESEND_API_KEY or EMAIL_USER and EMAIL_PASS.");
        }
        const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
        await transporter.verify();
        const mailResult = await transporter.sendMail({
          from: `"AgriNex Team" <${process.env.EMAIL_USER}>`, to: userEmail,
          subject: isTamil ? `AgriNex - உங்கள் முன்பதிவு உறுதிப்படுத்தப்பட்டது` : `AgriNex - Your Booking Has Been Confirmed`,
          text: isTamil ? `${userName}, வணக்கம்.\n\nஉங்கள் AgriNex முன்பதிவு வெற்றிகரமாக பதிவு செய்யப்பட்டது.\n\nஉங்கள் உறுதிப்படுத்தல் அறிக்கை PDF ஆக இணைக்கப்பட்டுள்ளது.` : `Hello ${userName},\n\nYour AgriNex Pre-Booking has been successfully submitted.\n\nYour AgriNex confirmation report is attached as a PDF.`,
          attachments: [{ filename: attachmentName, content: pdfBuffer }],
        });
        if (!mailResult.accepted.includes(userEmail)) throw new Error(`Email provider did not accept recipient ${userEmail}.`);
        console.log("[prebooking-email] SMTP accepted email:", { bookingId, messageId: mailResult.messageId, attachment: attachmentName });
      }

      await bookingRef.update({ emailStatus: "sent", emailSentAt: Timestamp.now() });
      res.json({ success: true });
    } catch (error) {
      const emailError = getErrorMessage(error);
      console.error("[prebooking-email] FAILED:", { bookingDocId, emailError, error });
      if (bookingDocId) {
        try {
          await getAdminDb().collection("preBookings").doc(bookingDocId).update({ emailStatus: "failed", emailError });
        } catch (statusError) {
          console.error("Unable to record failed email status:", statusError);
        }
      }
      res.status(500).json({ error: "Failed to generate confirmation." });
    }
  });

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
