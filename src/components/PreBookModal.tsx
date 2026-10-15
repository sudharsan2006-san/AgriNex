import React, { useState } from "react";
import { addDoc, collection, serverTimestamp, doc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { getFirebaseAuthHeaders } from "../lib/authHelpers";
import { CheckCircle2, Clock, MapPin, X } from "lucide-react";

interface Props {
  listing: any;
  onClose: () => void;
}

export default function PreBookModal({ listing, onClose }: Props) {
  const [formData, setFormData] = useState({
    userName: "",
    mobileNumber: "",
    requiredQuantity: "",
    unit: listing.unit || "kg",
    preferredLocation: "",
    purchaseDate: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || bookingConfirmed) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("Please login before creating a pre-booking.");
      return;
    }

    if (!formData.userName.trim() || !formData.mobileNumber.trim() || !formData.requiredQuantity || !formData.preferredLocation.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    const now = new Date();
    const bookingId = `AGR-${now.getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
    const recordId = `REC-${now.getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
    const cropName = listing.cropName || listing.commodity;
    const referencePrice = Number(listing.price || listing.modal || 0);
    const quantity = Number(formData.requiredQuantity);
    const estimatedValue = Number.isFinite(quantity) ? quantity * referencePrice : 0;
    const bookingDate = now.toLocaleDateString();
    const bookingTime = now.toLocaleTimeString();

    const bookingData = {
      bookingId,
      recordId,
      userId: currentUser.uid,
      userName: formData.userName.trim(),
      userEmail: currentUser.email,
      mobileNumber: formData.mobileNumber.trim(),
      crop: cropName,
      cropName,
      price: referencePrice,
      referencePrice,
      estimatedValue,
      priceUnit: formData.unit,
      quantity: formData.requiredQuantity,
      quantityUnit: formData.unit,
      unit: formData.unit,
      preferredLocation: formData.preferredLocation.trim(),
      preferredDate: formData.purchaseDate || "Flexible",
      bookingDate,
      notes: formData.notes.trim(),
      status: "Pending Admin Approval",
      lastNotifiedStatus: "Pending Admin Approval",
      reportStatus: "pending",
      emailStatus: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const farmRecordData = {
      recordId,
      bookingId,
      userId: currentUser.uid,
      userName: formData.userName.trim(),
      userEmail: currentUser.email,
      crop: cropName,
      cropName,
      price: referencePrice,
      referencePrice,
      estimatedValue,
      priceUnit: formData.unit,
      quantity: formData.requiredQuantity,
      quantityUnit: formData.unit,
      preferredLocation: formData.preferredLocation.trim(),
      preferredDate: formData.purchaseDate || "Flexible",
      bookingDate,
      bookingStatus: "Pending Admin Approval",
      status: "Pending Admin Approval",
      reportStatus: "pending",
      emailStatus: "pending",
      recordCreatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      // 1. FAST FIRESTORE SAVE FIRST: Save Pre-Booking document directly to Firestore
      const docRef = await addDoc(collection(db, "preBookings"), bookingData);
      console.log("[AgriNex] Pre-Booking saved successfully in Firestore docId:", docRef.id);

      // Also persist to user's farm records without blocking
      setDoc(doc(db, "users", currentUser.uid, "farmRecords", recordId), farmRecordData)
        .catch((recErr) => console.warn("[AgriNex] farmRecords sync note:", recErr?.message || recErr));

      // 2. IMMEDIATE SUCCESS CONFIRMATION (User does NOT wait for PDF / Email)
      setBookingConfirmed({ ...bookingData, id: docRef.id });
      setLoading(false);

      // 3. BACKGROUND NOTIFICATIONS & USER EMAIL REPORT (Non-blocking)
      (async () => {
        try {
          const authHeaders = await getFirebaseAuthHeaders().catch(() => ({}));
          const bookingPayload = {
            ...bookingData,
            bookingDate,
            bookingTime,
          };

          // Background Report Document Initial Save
          setDoc(
            doc(db, "reports", `prebooking-${bookingId}`),
            {
              userId: currentUser.uid,
              bookingId,
              type: "Pre-Booking",
              status: "Pending Admin Approval",
              cropName,
              quantity: bookingData.quantity,
              unit: bookingData.quantityUnit,
              referencePrice,
              estimatedValue,
              reportName: `AgriNex_PreBooking_${bookingId}.pdf`,
              emailRecipient: currentUser.email,
              reportStatus: "pending",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          ).catch((e) => console.warn("[AgriNex] Report collection sync note:", e));

          // 1. Send User Confirmation & PDF Report Email
          const userEmailPromise = fetch("/api/send-prebooking-report", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({ bookingData: bookingPayload }),
          })
            .then(async (res) => {
              const data = await res.json().catch(() => ({}));
              if (res.ok && data?.success) {
                await updateDoc(doc(db, "preBookings", docRef.id), {
                  emailStatus: "sent",
                  reportStatus: "generated",
                  emailSentAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                }).catch(() => {});
                await updateDoc(doc(db, "reports", `prebooking-${bookingId}`), {
                  reportStatus: "sent",
                  updatedAt: serverTimestamp(),
                }).catch(() => {});
              } else {
                console.warn("[AgriNex] User report email delivery status failed:", data?.error);
                await updateDoc(doc(db, "preBookings", docRef.id), {
                  emailStatus: "failed",
                  reportStatus: "failed",
                  emailError: data?.error || "User report email delivery failed.",
                  updatedAt: serverTimestamp(),
                }).catch(() => {});
                await updateDoc(doc(db, "reports", `prebooking-${bookingId}`), {
                  reportStatus: "failed",
                  updatedAt: serverTimestamp(),
                }).catch(() => {});
              }
            })
            .catch(async (err) => {
              console.warn("[AgriNex] Background user report email dispatch exception:", err);
              await updateDoc(doc(db, "preBookings", docRef.id), {
                emailStatus: "failed",
                reportStatus: "failed",
                emailError: err?.message || String(err),
                updatedAt: serverTimestamp(),
              }).catch(() => {});
            });

          // 2. Send Admin Notification Email
          const adminEmailPromise = fetch("/api/send-prebooking-admin-email", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({ bookingData: bookingPayload }),
          }).catch((err) => console.warn("[AgriNex] Background admin notice error:", err));

          await Promise.allSettled([userEmailPromise, adminEmailPromise]);
        } catch (bgErr) {
          console.warn("[AgriNex] Background task execution note:", bgErr);
        }
      })();
    } catch (err: any) {
      console.error("[AgriNex] Pre-Booking Firestore save failed:", {
        code: err?.code,
        message: err?.message,
        uid: currentUser?.uid,
        email: currentUser?.email,
      });
      setError(`Unable to save pre-booking: ${err.message || "Please try again."}`);
      setLoading(false);
    }
  };

  if (bookingConfirmed) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-in fade-in duration-150">
        <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-gray-100 text-center">
          <div className="w-14 h-14 bg-emerald-100 text-[#2D6A4F] rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={32} />
          </div>

          <h2 className="text-xl font-black text-[#1B4332] mb-1">Pre-Booking Submitted!</h2>
          <p className="text-xs text-gray-500 mb-4">Pre-Booking submitted successfully.</p>

          <div className="bg-[#F0F7F4] p-4 rounded-2xl border border-[#D8F3DC] text-left text-xs space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-500 font-bold">Booking ID:</span>
              <span className="font-mono font-bold text-[#1B4332]">{bookingConfirmed.bookingId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-bold">Crop:</span>
              <span className="font-bold text-[#1B4332]">🌾 {bookingConfirmed.cropName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-bold">Quantity:</span>
              <span className="font-bold text-[#2D6A4F]">
                {bookingConfirmed.quantity} {bookingConfirmed.quantityUnit}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-bold">Estimated Value:</span>
              <span className="font-bold text-[#1B4332]">₹{bookingConfirmed.estimatedValue?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-[#D8F3DC]">
              <span className="text-gray-500 font-bold">Status:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                Pending Admin Approval
              </span>
            </div>
          </div>

          <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
            Your reservation is in queue. Once approved by the administrator, the official confirmation report will be delivered directly to your registered email (<strong>{bookingConfirmed.userEmail}</strong>) and available in your account.
          </p>

          <div className="space-y-2">
            <button
              onClick={() => {
                onClose();
                window.location.href = "/my-pre-bookings";
              }}
              className="w-full bg-[#2D6A4F] hover:bg-[#1B4332] text-white py-3 rounded-full font-bold text-xs shadow-md transition-all"
            >
              View My Pre-Bookings
            </button>
            <button
              onClick={onClose}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-full font-bold text-xs transition-all"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white p-6 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-black text-[#1B4332]">Pre-Book {listing.cropName || listing.commodity}</h2>
            <p className="text-xs text-[#2D6A4F] font-bold">
              Benchmark Rate: ₹{listing.price || listing.modal} / {listing.unit || "kg"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Farmer / Contact Name *</label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={formData.userName}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332] focus:outline-none focus:border-[#2D6A4F]"
              required
              onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Mobile Number *</label>
            <input
              type="tel"
              placeholder="+91 98421 00000"
              value={formData.mobileNumber}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332] focus:outline-none focus:border-[#2D6A4F]"
              required
              onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Quantity *</label>
              <input
                type="number"
                placeholder="100"
                value={formData.requiredQuantity}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332] focus:outline-none focus:border-[#2D6A4F]"
                required
                min="1"
                onChange={(e) => setFormData({ ...formData, requiredQuantity: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Unit</label>
              <input
                type="text"
                value={formData.unit}
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 font-bold"
                readOnly
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Preferred Location *</label>
            <input
              type="text"
              placeholder="e.g. Thanjavur, Tamil Nadu"
              value={formData.preferredLocation}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332] focus:outline-none focus:border-[#2D6A4F]"
              required
              onChange={(e) => setFormData({ ...formData, preferredLocation: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Preferred Harvest Date</label>
            <input
              type="date"
              value={formData.purchaseDate}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332] focus:outline-none focus:border-[#2D6A4F]"
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Notes / Specifications (Optional)</label>
            <textarea
              placeholder="Quality grade, packaging requirements, etc."
              rows={2}
              value={formData.notes}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-[#2D6A4F]"
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {error && (
            <p className="text-rose-600 text-xs font-bold p-2.5 bg-rose-50 rounded-xl border border-rose-200">{error}</p>
          )}

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-full font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#2D6A4F] hover:bg-[#1B4332] text-white py-3 rounded-full font-black uppercase text-xs tracking-wider shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                "Confirm Pre-Booking"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
