import { useState, type FormEvent } from "react";
import { Plus, Minus } from "lucide-react";
import { useLocation } from "react-router-dom";
import { addDoc, collection, serverTimestamp, doc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { getFirebaseAuthHeaders } from "../lib/authHelpers";
import { API_BASE } from "../lib/apiBase";
import BackButton from "../components/BackButton";

interface HarvestData {
  productName: string;
  farmerName: string;
  batchId: string;
  harvestDate: string;
  availableQuantity: number;
  pricePerUnit: number;
  qualityGrade: string;
  farmLocation: string;
}

export default function HarvestBooking() {
  const location = useLocation();
  const harvestData: HarvestData = location.state || {
    productName: "Organic Mangoes",
    farmerName: "Ramesh Kumar",
    batchId: "B-2026-08",
    harvestDate: "Sept 15, 2026",
    availableQuantity: 500,
    pricePerUnit: 150,
    qualityGrade: "Grade A",
    farmLocation: "Krishnagiri, TN",
  };

  const [quantity, setQuantity] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [bookingInfo, setBookingInfo] = useState<any>(null);

  const totalAmount = quantity * harvestData.pricePerUnit;
  const advanceAmount = totalAmount * 0.2;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || submitted) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("Please log in before submitting a harvest booking.");
      return;
    }

    if (!customerName.trim() || !mobileNumber.trim() || !deliveryLocation.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    const now = new Date();
    const bookingId = `AGR-${now.getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
    const recordId = `REC-${now.getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
    const cropName = harvestData.productName;
    const bookingDate = now.toLocaleDateString();
    const bookingTime = now.toLocaleTimeString();

    const bookingData = {
      bookingId,
      recordId,
      batchId: harvestData.batchId,
      userId: currentUser.uid,
      userName: customerName.trim(),
      userEmail: currentUser.email,
      mobileNumber: mobileNumber.trim(),
      crop: cropName,
      cropName,
      quantity,
      unit: "kg",
      quantityUnit: "kg",
      price: harvestData.pricePerUnit,
      referencePrice: harvestData.pricePerUnit,
      estimatedValue: totalAmount,
      advanceAmount,
      preferredLocation: deliveryLocation.trim(),
      preferredDate: deliveryDate || harvestData.harvestDate || "Flexible",
      bookingDate,
      notes: specialNotes.trim() ? `${specialNotes.trim()} (Batch: ${harvestData.batchId}, Farmer: ${harvestData.farmerName})` : `Batch: ${harvestData.batchId}, Farmer: ${harvestData.farmerName}`,
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
      userName: customerName.trim(),
      userEmail: currentUser.email,
      crop: cropName,
      cropName,
      price: harvestData.pricePerUnit,
      referencePrice: harvestData.pricePerUnit,
      estimatedValue: totalAmount,
      priceUnit: "kg",
      quantity,
      quantityUnit: "kg",
      preferredLocation: deliveryLocation.trim(),
      preferredDate: deliveryDate || harvestData.harvestDate || "Flexible",
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
      console.log("[AgriNex] Harvest Pre-Booking saved successfully in Firestore docId:", docRef.id);

      // Also persist to user's farm records without blocking
      setDoc(doc(db, "users", currentUser.uid, "farmRecords", recordId), farmRecordData)
        .catch((recErr) => console.warn("[AgriNex] farmRecords sync note:", recErr?.message || recErr));

      // 2. IMMEDIATE SUCCESS CONFIRMATION TO USER
      setBookingInfo({ ...bookingData, id: docRef.id });
      setSubmitted(true);
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
              quantity,
              unit: "kg",
              referencePrice: harvestData.pricePerUnit,
              estimatedValue: totalAmount,
              reportName: `AgriNex_PreBooking_${bookingId}.pdf`,
              emailRecipient: currentUser.email,
              reportStatus: "pending",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          ).catch((e) => console.warn("[AgriNex] Report collection sync note:", e));

          // 1. Send User Confirmation & PDF Report Email
          const userEmailPromise = fetch(`${API_BASE}/api/send-prebooking-report`, {
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
                }).catch(() => { });
                await updateDoc(doc(db, "reports", `prebooking-${bookingId}`), {
                  reportStatus: "sent",
                  updatedAt: serverTimestamp(),
                }).catch(() => { });
              } else {
                console.warn("[AgriNex] User report email delivery status failed:", data?.error);
                await updateDoc(doc(db, "preBookings", docRef.id), {
                  emailStatus: "failed",
                  reportStatus: "failed",
                  emailError: data?.error || "User report email delivery failed.",
                  updatedAt: serverTimestamp(),
                }).catch(() => { });
                await updateDoc(doc(db, "reports", `prebooking-${bookingId}`), {
                  reportStatus: "failed",
                  updatedAt: serverTimestamp(),
                }).catch(() => { });
              }
            })
            .catch(async (err) => {
              console.warn("[AgriNex] Background user report email dispatch exception:", err);
              await updateDoc(doc(db, "preBookings", docRef.id), {
                emailStatus: "failed",
                reportStatus: "failed",
                emailError: err?.message || String(err),
                updatedAt: serverTimestamp(),
              }).catch(() => { });
            });

          // 2. Send Admin Notification Email
          const adminEmailPromise = fetch(`${API_BASE}/api/send-prebooking-admin-email`, {
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
      console.error("[AgriNex] Harvest booking Firestore save failed:", {
        code: err?.code,
        message: err?.message,
        uid: currentUser?.uid,
        email: currentUser?.email,
      });
      setError(`Unable to save harvest booking: ${err.message || "Please try again."}`);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 pb-24 bg-[#F0F7F4] min-h-screen">
      <BackButton />
      <h1 className="text-2xl font-black text-[#1B4332] mb-1">Harvest Booking</h1>
      <p className="text-[#2D6A4F] mb-6">Reserve fresh produce directly from the upcoming harvest.</p>

      {!submitted ? (
        <div className="space-y-6">
          {/* Product Card */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex gap-4">
            <div className="w-20 h-20 bg-gray-200 rounded-2xl"></div>
            <div>
              <h2 className="font-black text-[#1B4332]">{harvestData.productName}</h2>
              <p className="text-sm text-gray-500">Farmer: {harvestData.farmerName}</p>
              <p className="text-xs text-gray-400">Batch: {harvestData.batchId} | Grade: {harvestData.qualityGrade}</p>
              <p className="text-sm font-bold text-[#2D6A4F]">₹{harvestData.pricePerUnit}/kg</p>
              <p className="text-xs text-gray-400">Harvest Date: {harvestData.harvestDate}</p>
            </div>
          </div>

          {/* Status Flow */}
          <div className="flex justify-between items-center text-[8px] text-[#1B4332] font-bold overflow-x-auto gap-1">
            <span>Booked</span> <span>→</span> <span>Ready</span> <span>→</span> <span>Checked</span> <span>→</span> <span>Packed</span> <span>→</span> <span>Delivered</span>
          </div>

          {/* Booking Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-full border border-gray-100">
              <span>Quantity (kg)</span>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button>
                <span className="font-bold text-lg">{quantity}</span>
                <button type="button" onClick={() => setQuantity(Math.min(harvestData.availableQuantity, quantity + 1))}><Plus size={16} /></button>
              </div>
            </div>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full p-4 bg-white border border-gray-100 rounded-full"
              required
            />
            <input
              type="text"
              placeholder="Delivery Location"
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
              className="w-full p-4 bg-white border border-gray-100 rounded-full"
              required
            />
            <input
              type="text"
              placeholder="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full p-4 bg-white border border-gray-100 rounded-full"
              required
            />
            <input
              type="tel"
              placeholder="Mobile Number"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              className="w-full p-4 bg-white border border-gray-100 rounded-full"
              required
            />
            <textarea
              placeholder="Special Requirements (Optional)"
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              className="w-full p-4 bg-white border border-gray-100 rounded-3xl"
              rows={3}
            ></textarea>

            {error && (
              <p className="text-rose-600 text-xs font-bold p-3 bg-rose-50 rounded-2xl border border-rose-200">{error}</p>
            )}

            {/* Price Summary */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 space-y-2 text-sm text-[#1B4332]">
              <div className="flex justify-between"><span>Selected Quantity:</span><span className="font-bold">{quantity} kg</span></div>
              <div className="flex justify-between"><span>Price per unit:</span><span className="font-bold">₹{harvestData.pricePerUnit}</span></div>
              <div className="flex justify-between text-lg font-black"><span>Estimated Total:</span><span>₹{totalAmount}</span></div>
              <div className="flex justify-between text-[#2D6A4F] font-bold"><span>Booking Advance (20%):</span><span>₹{advanceAmount}</span></div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2D6A4F] hover:bg-[#1B4332] text-white p-4 rounded-full font-black uppercase shadow-lg disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {loading ? "SAVING PRE-BOOKING..." : "BOOK HARVEST"}
            </button>
            <p className="text-center text-xs text-gray-500">Your quantity will be reserved from the upcoming harvest.</p>
          </form>
        </div>
      ) : (
        <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm text-center space-y-4">
          <div className="p-6 bg-[#D8F3DC] rounded-2xl text-[#1B4332] font-black text-lg">
            🎉 Harvest Booking Confirmed!
          </div>
          <p className="text-xs text-gray-600">
            Batch <strong>{harvestData.batchId}</strong> ({harvestData.productName}) has been reserved for {bookingInfo?.userName || customerName}.
          </p>
          {bookingInfo?.bookingId && (
            <p className="text-xs font-mono font-bold text-[#1B4332] bg-gray-50 p-2 rounded-xl border border-gray-100">
              Booking ID: {bookingInfo.bookingId}
            </p>
          )}
          <div className="pt-2 flex flex-col gap-2">
            <a
              href={`/machinery?contractId=${harvestData.batchId}&crop=${encodeURIComponent(harvestData.productName)}`}
              className="w-full bg-[#2D6A4F] text-white py-3 rounded-full font-bold text-xs shadow-sm hover:bg-[#1B4332] transition-colors"
            >
              🚜 Request Harvesting / Transport Machinery
            </a>
            <a
              href="/my-pre-bookings"
              className="w-full bg-emerald-50 text-[#2D6A4F] py-3 rounded-full font-bold text-xs hover:bg-emerald-100 transition-colors border border-emerald-200"
            >
              View My Pre-Bookings
            </a>
            <a
              href="/marketplace"
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-full font-bold text-xs hover:bg-gray-200 transition-colors"
            >
              Back to Marketplace
            </a>
          </div>
        </div>
      )}
    </div>
  );
}


