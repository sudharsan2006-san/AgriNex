import React, { useState } from "react";
import { addDoc, collection, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { createNotification } from "../utils/notificationService";

interface Props {
  listing: any;
  onClose: () => void;
}

// 20 second timeout for the email API request
const EMAIL_API_TIMEOUT_MS = 20000;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export default function PreBookModal({ listing, onClose }: Props) {
  const [formData, setFormData] = useState({
    userName: "",
    mobileNumber: "",
    quantity: "",
    unit: listing.unit || "kg",
    preferredLocation: "",
    purchaseDate: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ FIX: Initialize to null (not to the loading message)
  // The loading message only shows AFTER booking is submitted
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<boolean | null>(null);
  const [emailPending, setEmailPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Validate Firebase authenticated user & email
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      alert("Please login with an authenticated email account to pre-book.");
      return;
    }

    const rawEmail = currentUser.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rawEmail)) {
      alert("The logged-in account has an invalid email format.");
      return;
    }

    const userEmail = rawEmail.toLowerCase();
    console.log("Logged-in user email detected: YES");
    console.log("Recipient email source: Firebase authenticated user");

    setLoading(true);
    setError(null);

    const t_booking_saved = Date.now();
    const bookingId = `AGR-${Math.floor(Math.random() * 900000 + 100000)}`;
    const now = new Date();
    const bookingDate = formData.purchaseDate || now.toISOString().split("T")[0];
    const bookingTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const demoBooking = {
      id: bookingId,
      ...formData,
      userEmail,
      cropName: listing.cropName || listing.commodity,
      referencePrice: listing.price || listing.modal,
      status: "Pending",
      bookingDate,
      bookingTime,
    };

    // Persist locally for zero-latency UI update
    const localBookings = JSON.parse(localStorage.getItem("demoBookings") || "[]");
    localStorage.setItem("demoBookings", JSON.stringify([...localBookings, demoBooking]));

    // Show "Pre-Booking Successful" immediately
    setBookingDetails(demoBooking);
    setLoading(false);

    // Fire booking_confirmed notification (in-app bell + email) — non-blocking
    createNotification({
      type: "booking_confirmed",
      title: "🎉 Booking Confirmed",
      message: `Your pre-booking for ${demoBooking.cropName} (${bookingId}) has been confirmed.`,
      payload: {
        bookingId,
        cropName: demoBooking.cropName,
        quantity: formData.quantity,
        unit: formData.unit,
        status: "Pending",
      },
    }).catch((e) => console.warn("[PreBookModal] Notification error:", e));
    
    // Show email sending status in modal
    setEmailPending(true);
    setEmailStatus("Sending confirmation PDF to registered email...");
    setEmailSuccess(null);

    const t_email_job_started = Date.now();
    console.log("=== [AgriNex Pre-Booking Performance Trace] ===");
    console.log(`1. Booking successfully saved: ${t_booking_saved}ms`);
    console.log(`2. Email job started: ${t_email_job_started}ms (Delay from booking save: ${t_email_job_started - t_booking_saved}ms)`);

    // Parallelize Firestore save without blocking email job dispatch
    const preBookingDocRefPromise = addDoc(collection(db, "preBookings"), {
      ...formData,
      quantity: formData.quantity,
      quantityUnit: formData.unit,
      bookingId,
      userId: auth.currentUser?.uid,
      userEmail,
      userName: formData.userName || auth.currentUser?.displayName || "Farmer",
      cropName: listing.cropName || listing.commodity,
      referencePrice: listing.price || listing.modal,
      priceUnit: listing.unit || "kg",
      status: "Pending",
      lastNotifiedStatus: "Pending",
      emailStatus: "processing",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch(err => console.warn("- Firestore preBookings save warning:", err));

    addDoc(collection(db, "farmRecords"), {
      bookingId,
      userId: auth.currentUser?.uid,
      cropName: listing.cropName || listing.commodity,
      quantity: formData.quantity,
      quantityUnit: formData.unit,
      referencePrice: listing.price || listing.modal,
      priceUnit: listing.unit || "kg",
      location: formData.preferredLocation,
      preferredDate: formData.purchaseDate,
      status: "Pending",
      createdAt: serverTimestamp(),
    }).catch(err => console.warn("- Firestore farmRecords save warning:", err));

    // ✅ STEP 3: Dispatch Email API request immediately
    try {
      const response = await fetchWithTimeout(
        "/api/send-prebooking-report",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId,
            userName: formData.userName || auth.currentUser?.displayName || "Farmer",
            userEmail,
            mobileNumber: formData.mobileNumber,
            cropName: listing.cropName || listing.commodity,
            quantity: formData.quantity,
            unit: formData.unit || listing.unit || "kg",
            referencePrice: listing.price || listing.modal,
            bookingDate,
            bookingTime,
            bookingStatus: "Pre-Booked",
            preferredLocation: formData.preferredLocation,
            notes: formData.notes,
            sync: true, // synchronous execution to receive exact step timing breakdown
            t_booking_saved,
            t_email_job_started
          }),
        },
        EMAIL_API_TIMEOUT_MS
      );

      console.log(`Email API request completed: ${response.ok ? "YES" : "NO"}`);

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        data = { success: false, error: "Backend returned non-JSON response (HTTP " + response.status + ")" };
      }

      const preBookingDocRef: any = await preBookingDocRefPromise;

      if (data && data.success === true) {
        setEmailSuccess(true);
        setEmailStatus("Pre-Booking successful! Confirmation PDF has been sent to your email.");
        if (preBookingDocRef) {
          try {
            await updateDoc(preBookingDocRef, {
              emailStatus: "sent",
              resendEmailId: data.resendEmailId || data.messageId || null,
              emailSentAt: serverTimestamp(),
            });
          } catch (_) {}
        }
        // Fire pdf_report notification in bell
        createNotification({
          type: "pdf_report",
          title: "📄 PDF Report Sent",
          message: `Your pre-booking report for ${listing.cropName || listing.commodity} has been emailed to you.`,
          payload: { bookingId, cropName: listing.cropName || listing.commodity, status: "Pre-Booked" },
        }).catch(() => {});
      } else {
        const errReason = data?.error || data?.emailError || "Email delivery failed";
        console.error("- Exact error if email failed:", errReason);
        setEmailSuccess(false);
        setEmailStatus("Pre-Booking successful, but confirmation email could not be sent.");
        if (preBookingDocRef) {
          try {
            await updateDoc(preBookingDocRef, {
              emailStatus: "failed",
              emailError: errReason
            });
          } catch (_) {}
        }
      }
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      const errReason = isTimeout ? "Email request timed out (>20s)" : (err?.message || String(err));
      console.error("- Email API error:", errReason);
      setEmailSuccess(false);
      setEmailStatus("Pre-Booking successful, but confirmation email could not be sent.");
      const preBookingDocRef: any = await preBookingDocRefPromise;
      if (preBookingDocRef) {
        try {
          await updateDoc(preBookingDocRef, {
            emailStatus: "failed",
            emailError: errReason
          });
        } catch (_) {}
      }
    } finally {
      setEmailPending(false);
    }
  };

  if (bookingDetails) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
        <div className="bg-white p-6 rounded-3xl w-full max-w-sm">
          <h2 className="text-xl font-black text-[#1B4332] mb-4">🎉 Pre-Booking Successful</h2>
          <div className="text-sm space-y-2 mb-6 text-gray-700">
            <p><strong>Booking ID:</strong> {bookingDetails.id}</p>
            <p><strong>Crop:</strong> {bookingDetails.cropName}</p>
            <p><strong>Quantity:</strong> {bookingDetails.quantity} {bookingDetails.unit}</p>
            <p><strong>Reference Price:</strong> ₹{bookingDetails.referencePrice} / {bookingDetails.unit}</p>
            <p><strong>Status:</strong> 🟡 {bookingDetails.status}</p>
          </div>

          {/* Email status — always resolves, never stuck */}
          {emailPending && (
            <div className="p-3 rounded-2xl mb-4 text-xs font-bold flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200">
              <span className="animate-spin">⏳</span>
              <span>{emailStatus}</span>
            </div>
          )}
          {!emailPending && emailStatus && (
            <div className={`p-3 rounded-2xl mb-4 text-xs font-bold flex items-center gap-2 ${
              emailSuccess === true
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}>
              <span>{emailSuccess === true ? "✅" : "⚠️"}</span>
              <span>{emailStatus}</span>
            </div>
          )}

          <button
            onClick={() => window.location.href = "/my-bookings"}
            className="w-full bg-gray-100 text-[#2D6A4F] py-3 rounded-full font-bold mb-2"
          >
            View My Bookings
          </button>
          <button
            onClick={onClose}
            className="w-full bg-[#2D6A4F] text-white py-3 rounded-full font-bold"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
      <div className="bg-white p-6 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-black text-[#1B4332] mb-4">Pre-Book {listing.cropName || listing.commodity}</h2>
        <p className="text-sm text-gray-500 mb-4">Reference Price: ₹{listing.price || listing.modal} / {listing.unit}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" placeholder="Name" className="w-full p-3 border rounded-xl" required onChange={e => setFormData({...formData, userName: e.target.value})} />
          <input type="tel" placeholder="Mobile Number" className="w-full p-3 border rounded-xl" required onChange={e => setFormData({...formData, mobileNumber: e.target.value})} />
          <div className="flex gap-2">
            <input type="number" placeholder="Quantity" className="w-full p-3 border rounded-xl" required min="1" onChange={e => setFormData({...formData, quantity: e.target.value})} />
            <input type="text" value={formData.unit} className="w-20 p-3 border rounded-xl bg-gray-50" readOnly />
          </div>
          <input type="text" placeholder="Preferred Location" className="w-full p-3 border rounded-xl" required onChange={e => setFormData({...formData, preferredLocation: e.target.value})} />
          <input type="date" className="w-full p-3 border rounded-xl" required onChange={e => setFormData({...formData, purchaseDate: e.target.value})} />
          <textarea placeholder="Notes (Optional)" className="w-full p-3 border rounded-xl" onChange={e => setFormData({...formData, notes: e.target.value})} />

          {error && <p className="text-red-500 text-xs font-bold p-2 bg-red-50 rounded">{error}</p>}
          <button
            type="submit"
            className="w-full bg-[#2D6A4F] text-white py-3 rounded-full font-bold"
            disabled={loading}
          >
            {loading ? "Saving..." : "Confirm Pre-Booking"}
          </button>
          <button type="button" onClick={onClose} className="w-full py-3 rounded-full font-bold text-gray-500">
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
