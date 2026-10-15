import "dotenv/config";
import express from "express";
import type { Request, RequestHandler } from "express";
import path from "path";
import { readFileSync } from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { sendNotificationEmail, sendPreBookingReportEmail, sendMachineryRequestReportEmail } from "./src/server/mailer";
import { generatePreBookingPdfBuffer, generateMachineryPdfBuffer } from "./src/server/pdfGenerator";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { validatePassword } from "./src/utils/passwordValidation";


async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const firebaseConfig = JSON.parse(readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
  const adminEmail = "sudharsan9001@gmail.com";

  type FirebaseIdentity = { uid: string; email: string };
  type AuthenticatedRequest = Request & { firebaseIdentity?: FirebaseIdentity };

  const authenticateFirebase: RequestHandler = async (req, res, next) => {
    const token = req.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }

    try {
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
        { idToken: token },
        { timeout: 10000 }
      );
      const account = response.data.users?.[0];
      if (!account?.localId || !account.email) {
        res.status(401).json({ error: "A valid Firebase account is required." });
        return;
      }
      (req as AuthenticatedRequest).firebaseIdentity = { uid: account.localId, email: account.email };
      next();
    } catch {
      res.status(401).json({ error: "Firebase authentication could not be verified." });
    }
  };

  const requireAdmin: RequestHandler = (req, res, next) => {
    const identity = (req as AuthenticatedRequest).firebaseIdentity;
    if (identity?.email !== adminEmail) {
      res.status(403).json({ error: "Admin access is restricted to the authorized administrator account." });
      return;
    }
    next();
  };

  const requireSelfOrAdmin = (getRecipient: (req: Request) => string | undefined): RequestHandler =>
    (req, res, next) => {
      const identity = (req as AuthenticatedRequest).firebaseIdentity;
      const recipient = getRecipient(req)?.trim().toLowerCase();
      if (identity?.email !== adminEmail && recipient !== identity?.email.toLowerCase()) {
        res.status(403).json({ error: "You may only send reports to your authenticated account." });
        return;
      }
      next();
    };

  const requireOwnerOrAdmin = (getOwner: (req: Request) => { uid?: string; email?: string }): RequestHandler =>
    (req, res, next) => {
      const identity = (req as AuthenticatedRequest).firebaseIdentity;
      const owner = getOwner(req);
      const matchesUid = !!owner.uid && owner.uid === identity?.uid;
      const matchesEmail = !!owner.email && owner.email.trim().toLowerCase() === identity?.email.toLowerCase();
      if (identity?.email !== adminEmail && !matchesUid && !matchesEmail) {
        res.status(403).json({ error: "You may only access records belonging to your authenticated account." });
        return;
      }
      next();
    };

  app.use(express.json());

  // MongoDB Connection & User Schema for MERN Authentication
  const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/agrinex";
  mongoose
    .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
      console.log(`[AgriNex MongoDB] Connected successfully to ${MONGODB_URI}`);
    })
    .catch((err) => {
      console.warn(`[AgriNex MongoDB] Connection notice: ${err?.message || err}`);
    });

  interface IUser {
    name: string;
    email: string;
    password: string;
    role: string;
    createdAt: Date;
  }

  const userSchema = new mongoose.Schema<IUser>({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // Stored as bcrypt hash. Plain-text is never stored or logged.
    role: { type: String, default: "farmer" },
    createdAt: { type: Date, default: Date.now },
  });

  // Ensure plain-text or hashed password is never returned in default JSON representations
  userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
  };

  const UserModel =
    (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>("User", userSchema);

  // ==========================================
  // AUTHENTICATION & PASSWORD VALIDATION ROUTES
  // ==========================================

  // Registration endpoint with strong password validation, bcrypt hashing, and MongoDB storage
  const handleRegister: RequestHandler = async (req, res): Promise<void> => {
    try {
      const { name, email, password, confirmPassword } = req.body || {};

      if (!name || typeof name !== "string" || !name.trim()) {
        res.status(400).json({ success: false, error: "Full Name is required." });
        return;
      }

      if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        res.status(400).json({ success: false, error: "A valid email address is required." });
        return;
      }

      // Strong password validation on backend
      const validation = validatePassword(password || "", confirmPassword !== undefined ? confirmPassword : password);

      if (!validation.isPasswordValid) {
        res.status(400).json({
          success: false,
          error: "Password does not meet complexity requirements.",
          failedRequirements: validation.failedRequirements,
          results: validation.results,
        });
        return;
      }

      if (confirmPassword !== undefined && !validation.results.match) {
        res.status(400).json({
          success: false,
          error: "Passwords do not match in the Password and Confirm Password fields.",
          failedRequirements: ["Passwords must match in both fields"],
          results: validation.results,
        });
        return;
      }

      // Connect to MongoDB if disconnected
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check if user already exists
      const existingUser = await UserModel.findOne({ email: normalizedEmail });
      if (existingUser) {
        res.status(409).json({ success: false, error: "A user with this email address already exists." });
        return;
      }

      // Hash password using bcryptjs before saving to MongoDB
      // Plain-text passwords are NEVER stored or logged!
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const newUser = new UserModel({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "farmer",
      });

      await newUser.save();
      console.log(`[AgriNex Auth] User registered successfully with bcrypt hash (email: ${normalizedEmail})`);

      res.status(201).json({
        success: true,
        message: "User registered successfully.",
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.createdAt,
        },
      });
    } catch (error: any) {
      console.error("[AgriNex Auth] Registration error:", error?.message || error);
      res.status(500).json({ success: false, error: "Registration failed on server." });
    }
  };

  app.post("/api/register", handleRegister);
  app.post("/api/auth/register", handleRegister);

  // Dedicated validation helper endpoint
  app.post("/api/validate-password", (req, res) => {
    const { password, confirmPassword } = req.body || {};
    const validation = validatePassword(password || "", confirmPassword);
    res.json({
      success: true,
      isValid: validation.isFormValid,
      isPasswordValid: validation.isPasswordValid,
      results: validation.results,
      failedRequirements: validation.failedRequirements,
    });
  });

  // Login endpoint validating credentials with bcryptjs hash in MongoDB
  const handleLogin: RequestHandler = async (req, res): Promise<void> => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        res.status(400).json({ success: false, error: "Email and password are required." });
        return;
      }

      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const user = await UserModel.findOne({ email: normalizedEmail });
      if (!user) {
        res.status(401).json({ success: false, error: "Invalid email or password." });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({ success: false, error: "Invalid email or password." });
        return;
      }

      console.log(`[AgriNex Auth] User authenticated via MongoDB bcrypt (email: ${normalizedEmail})`);
      res.json({
        success: true,
        message: "Login successful.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error: any) {
      console.error("[AgriNex Auth] Login error:", error?.message || error);
      res.status(500).json({ success: false, error: "Login failed on server." });
    }
  };

  app.post("/api/login", handleLogin);
  app.post("/api/auth/login", handleLogin);

  // API routes
  app.post("/api/send-prebooking-report", authenticateFirebase, requireSelfOrAdmin((req) => (req.body?.bookingData ?? req.body)?.userEmail), async (req, res) => {
    // Accept the current nested payload and the flat payload used by 7921524.
    const bookingData = req.body?.bookingData ?? req.body;
    if (!bookingData?.bookingId || !bookingData?.userEmail) {
      res.status(400).json({ success: false, error: "Booking ID and recipient email are required." });
      return;
    }

    try {
      console.log(`[AgriNex Backend] POST /api/send-prebooking-report booking=${bookingData.bookingId}`);
      const result = await sendPreBookingReportEmail({
        bookingId: bookingData.bookingId,
        userName: bookingData.userName || "Farmer",
        userEmail: bookingData.userEmail,
        mobileNumber: bookingData.mobileNumber || "",
        cropName: bookingData.cropName || "Crop",
        quantity: bookingData.quantity || 1,
        unit: bookingData.quantityUnit || bookingData.unit || bookingData.priceUnit || "kg",
        referencePrice: bookingData.referencePrice || 0,
        estimatedValue: bookingData.estimatedValue,
        bookingDate: bookingData.bookingDate || new Date().toLocaleDateString(),
        bookingTime: bookingData.bookingTime || new Date().toLocaleTimeString(),
        bookingStatus: bookingData.bookingStatus || bookingData.status || "Pending",
        preferredLocation: bookingData.preferredLocation,
        notes: bookingData.notes,
        t_booking_saved: bookingData.t_booking_saved,
        t_email_job_started: bookingData.t_email_job_started,
      });

      if (!result.success) {
        console.error(`[AgriNex Backend] Booking report email failed: ${result.error || "unknown error"}`);
        res.status(502).json({ success: false, emailStatus: "failed", error: result.error || "Email delivery failed." });
        return;
      }

      console.log(`[AgriNex Backend] Booking report email sent booking=${bookingData.bookingId} provider=${result.provider || "unknown"}`);
      res.json({ success: true, emailStatus: "sent", messageId: result.messageId, provider: result.provider });
    } catch (error: any) {
      console.error("[AgriNex Backend] /api/send-prebooking-report error:", error?.message || error);
      res.status(500).json({ success: false, emailStatus: "failed", error: "Booking report email could not be sent." });
    }
  });

  app.post("/api/send-prebooking-admin-email", authenticateFirebase, requireOwnerOrAdmin((req) => {
    const bookingData = req.body?.bookingData ?? req.body;
    return { uid: bookingData?.userId, email: bookingData?.userEmail };
  }), async (req, res) => {
    const bookingData = req.body?.bookingData ?? req.body;
    if (!bookingData?.bookingId) {
      res.status(400).json({ success: false, error: "Booking data is required." });
      return;
    }

    try {
      const adminEmail = (process.env.ADMIN_EMAIL || "sudharsan9001@gmail.com").trim();
      const result = await sendPreBookingReportEmail({
        bookingId: bookingData.bookingId,
        userName: bookingData.userName || "Farmer",
        userEmail: adminEmail,
        mobileNumber: bookingData.mobileNumber || "",
        cropName: bookingData.cropName || "Crop",
        quantity: bookingData.quantity || 1,
        unit: bookingData.quantityUnit || bookingData.unit || bookingData.priceUnit || "kg",
        referencePrice: bookingData.referencePrice || 0,
        estimatedValue: bookingData.estimatedValue,
        bookingDate: bookingData.bookingDate || new Date().toLocaleDateString(),
        bookingTime: bookingData.bookingTime || new Date().toLocaleTimeString(),
        bookingStatus: bookingData.bookingStatus || bookingData.status || "Pending",
        preferredLocation: bookingData.preferredLocation,
        notes: bookingData.notes,
      });

      if (!result.success) {
        console.warn("[AgriNex Backend] Admin pre-booking email failed but booking was preserved:", result.error);
        res.status(502).json({ success: false, error: result.error || "Admin email failed." });
        return;
      }

      res.json({ success: true, emailStatus: "sent", provider: result.provider, messageId: result.messageId });
    } catch (error: any) {
      console.warn("[AgriNex Backend] /api/send-prebooking-admin-email failed but booking remains saved:", error?.message || error);
      res.status(500).json({ success: false, error: "Admin email could not be sent." });
    }
  });

  app.post("/api/send-prebooking-retailer-email", authenticateFirebase, requireAdmin, async (req, res) => {
    const { bookingData, retailerEmail, retailerName } = req.body ?? {};
    if (!bookingData?.bookingId || !retailerEmail) {
      res.status(400).json({ success: false, error: "Booking data and retailer email are required." });
      return;
    }

    try {
      console.log(`[AgriNex Backend] POST /api/send-prebooking-retailer-email booking=${bookingData.bookingId} retailer=${retailerEmail}`);
      const result = await sendPreBookingReportEmail({
        bookingId: bookingData.bookingId,
        userName: retailerName ? `${retailerName} (Procurement)` : (bookingData.userName || "Retail Partner"),
        userEmail: retailerEmail.trim(),
        mobileNumber: bookingData.mobileNumber || "",
        cropName: bookingData.cropName || "Crop",
        quantity: bookingData.quantity || 1,
        unit: bookingData.quantityUnit || bookingData.unit || bookingData.priceUnit || "kg",
        referencePrice: bookingData.referencePrice || 0,
        estimatedValue: bookingData.estimatedValue,
        bookingDate: bookingData.bookingDate || new Date().toLocaleDateString(),
        bookingTime: bookingData.bookingTime || new Date().toLocaleTimeString(),
        bookingStatus: "Approved & Allocated",
        preferredLocation: bookingData.preferredLocation,
        notes: `Direct dispatch from AgriNex Administrator to Retailer / Buyer Partner (${retailerName || retailerEmail}).\nFarmer: ${bookingData.userName || 'N/A'} (Contact: ${bookingData.mobileNumber || 'N/A'}).`,
      });

      if (!result.success) {
        console.warn(`[AgriNex Backend] Retailer pre-booking email failed: ${result.error}`);
        res.status(502).json({ success: false, emailStatus: "failed", error: result.error || "Email delivery to retailer failed." });
        return;
      }

      console.log(`[AgriNex Backend] Retailer report email sent booking=${bookingData.bookingId} to=${retailerEmail}`);
      res.json({ success: true, emailStatus: "sent", provider: result.provider, messageId: result.messageId });
    } catch (error: any) {
      console.error("[AgriNex Backend] /api/send-prebooking-retailer-email error:", error?.message || error);
      res.status(500).json({ success: false, emailStatus: "failed", error: "Retailer report email could not be sent." });
    }
  });

  app.post("/api/prebooking-report", authenticateFirebase, requireOwnerOrAdmin((req) => {
    const bookingData = req.body?.bookingData;
    return { uid: bookingData?.userId, email: bookingData?.userEmail };
  }), (req, res) => {
    const bookingData = req.body?.bookingData;
    if (!bookingData?.bookingId) {
      res.status(400).json({ error: "Booking data is required." });
      return;
    }

    try {
      const pdfBuffer = generatePreBookingPdfBuffer({
        bookingId: bookingData.bookingId,
        userName: bookingData.userName || "Farmer",
        userEmail: bookingData.userEmail || "N/A",
        mobileNumber: bookingData.mobileNumber || "N/A",
        cropName: bookingData.cropName || "N/A",
        quantity: bookingData.quantity || "N/A",
        unit: bookingData.quantityUnit || bookingData.priceUnit || "kg",
        referencePrice: bookingData.referencePrice || "N/A",
        estimatedValue: bookingData.estimatedValue,
        bookingDate: bookingData.bookingDate || new Date().toLocaleDateString(),
        bookingTime: bookingData.bookingTime || "",
        bookingStatus: bookingData.status || "Pending",
        preferredLocation: bookingData.preferredLocation,
        notes: bookingData.notes,
      });

      res.type("application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="AgriNex_PreBooking_${bookingData.bookingId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Booking report generation error:", error);
      res.status(500).json({ error: "Failed to generate booking report." });
    }
  });

  app.post("/api/machinery-report", authenticateFirebase, requireOwnerOrAdmin((req) => {
    const requestData = req.body?.requestData ?? req.body;
    return { uid: requestData?.farmerId, email: requestData?.farmerEmail };
  }), (req, res) => {
    const requestData = req.body?.requestData ?? req.body;
    if (!requestData?.requestId) {
      res.status(400).json({ error: "Machinery request data is required." });
      return;
    }

    try {
      const pdfBuffer = generateMachineryPdfBuffer({
        requestId: requestData.requestId,
        farmerName: requestData.farmerName || "Farmer",
        farmerEmail: requestData.farmerEmail || "N/A",
        farmerPhone: requestData.farmerPhone || "N/A",
        machineryName: requestData.machineryName || "Agricultural Equipment",
        machineryType: requestData.machineryType || "Machinery",
        provider: requestData.provider || "AgriNex Partner",
        price: requestData.price || 0,
        rateUnit: requestData.rateUnit || "Day",
        requiredDate: requestData.requiredDate || new Date().toISOString().split("T")[0],
        duration: requestData.duration || "1 Day",
        farmLocation: requestData.farmLocation || "N/A",
        activity: requestData.activity || "Farming Activity",
        contractId: requestData.contractId,
        cropName: requestData.cropName,
        notes: requestData.notes,
        status: requestData.status || "Pending Approval",
      });

      res.type("application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="AgriNex_Machinery_${requestData.requestId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Machinery report generation error:", error);
      res.status(500).json({ error: "Failed to generate machinery report." });
    }
  });

  app.post("/api/send-machinery-request-admin-email", authenticateFirebase, requireOwnerOrAdmin((req) => {
    const requestData = req.body?.requestData ?? req.body;
    return { uid: requestData?.farmerId, email: requestData?.farmerEmail };
  }), async (req, res) => {
    const requestData = req.body?.requestData ?? req.body;
    if (!requestData?.requestId) {
      res.status(400).json({ success: false, error: "Machinery request data is required." });
      return;
    }

    try {
      const result = await sendMachineryRequestReportEmail({
        requestId: requestData.requestId,
        farmerName: requestData.farmerName || "Farmer",
        farmerEmail: requestData.farmerEmail || "",
        farmerPhone: requestData.farmerPhone || "",
        machineryName: requestData.machineryName || "Machinery",
        machineryType: requestData.machineryType || "Machinery",
        provider: requestData.provider || "AgriNex Partner",
        price: requestData.price || 0,
        rateUnit: requestData.rateUnit || "Day",
        requiredDate: requestData.requiredDate || new Date().toISOString().split("T")[0],
        duration: requestData.duration || "1 Day",
        farmLocation: requestData.farmLocation || "N/A",
        activity: requestData.activity || "Farming Activity",
        contractId: requestData.contractId,
        cropName: requestData.cropName,
        notes: requestData.notes,
        status: requestData.status || "Pending Approval",
      });

      if (!result.success) {
        console.warn("[AgriNex Backend] Machinery admin email failed but request was preserved:", result.error);
        res.status(502).json({ success: false, error: result.error || "Admin email failed." });
        return;
      }

      res.json({ success: true, emailStatus: "sent", provider: result.provider, messageId: result.messageId });
    } catch (error: any) {
      console.warn("[AgriNex Backend] /api/send-machinery-request-admin-email failed but request remains saved:", error?.message || error);
      res.status(500).json({ success: false, error: "Admin email could not be sent." });
    }
  });

  app.post("/api/send-notification-email", authenticateFirebase, requireSelfOrAdmin((req) => req.body?.toEmail), async (req, res) => {
    const { type, toEmail, userName, title, message, payload } = req.body ?? {};
    if (!type || !toEmail) {
      res.status(400).json({ success: false, error: "Notification type and recipient email are required." });
      return;
    }

    try {
      const result = await sendNotificationEmail({
        type,
        toEmail,
        userName: userName || "Farmer",
        title,
        message,
        payload,
      });

      if (!result.success) {
        res.status(502).json({ success: false, error: result.error || "Email delivery failed." });
        return;
      }

      res.json({ success: true, emailId: result.messageId || result.resendEmailId || null });
    } catch (error: any) {
      console.error("[AgriNex Backend] /api/send-notification-email error:", error?.message || error);
      res.status(500).json({ success: false, error: "Notification email could not be sent." });
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
