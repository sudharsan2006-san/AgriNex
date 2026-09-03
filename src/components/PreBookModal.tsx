import React, { useState } from "react";
import { addDoc, collection, serverTimestamp, doc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

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
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
        setError("Please login before creating a pre-booking.");
        return;
    }
    setLoading(true);
    setError(null);

    const timeout = setTimeout(() => {
        if (loading) {
            setLoading(false);
            setError("Booking request failed. Please try again.");
        }
    }, 15000);

    try {
      const now = new Date();
      const bookingId = `AGR-${now.getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
      const recordId = `REC-${now.getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;

      const bookingData = {
        bookingId: bookingId,
        recordId: recordId,
        userId: auth.currentUser.uid,
        userName: formData.userName,
        userEmail: auth.currentUser.email,
        cropName: listing.cropName || listing.commodity,
        referencePrice: listing.price || listing.modal,
        priceUnit: formData.unit,
        quantity: formData.requiredQuantity,
        quantityUnit: formData.unit,
        preferredLocation: formData.preferredLocation,
        preferredDate: formData.purchaseDate,
        notes: formData.notes,
        status: "Pending",
        lastNotifiedStatus: "Pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const farmRecordData = {
        recordId: recordId,
        bookingId: bookingId,
        userId: auth.currentUser.uid,
        userName: formData.userName,
        userEmail: auth.currentUser.email,
        cropName: listing.cropName || listing.commodity,
        referencePrice: listing.price || listing.modal,
        priceUnit: formData.unit,
        quantity: formData.requiredQuantity,
        quantityUnit: formData.unit,
        preferredLocation: formData.preferredLocation,
        preferredDate: formData.purchaseDate,
        bookingStatus: "Pending",
        recordCreatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log("Attempting to save pre-booking and farm record to Firestore...");

      // 1. Save to Firestore
      const docRef = await addDoc(collection(db, "preBookings"), bookingData);
      await setDoc(doc(db, "users", auth.currentUser.uid, "farmRecords", recordId), farmRecordData);
      
      console.log("Booking and Farm Record saved successfully! Doc ID:", docRef.id);

      // 2. Immediate Success State
      setBookingDetails({ ...bookingData, id: docRef.id, emailSent: 'pending' });
      setLoading(false); // Stop loading UI *before* triggering async email

      // 3. Async Background Task
      (async () => {
        try {
          const response = await fetch("/api/send-prebooking-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                bookingData: {
                    ...bookingData,
                    bookingDate: bookingData.createdAt?.toDate ? bookingData.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString(),
                    bookingStatus: bookingData.status
                } 
            }),
          });
          
          if (response.ok) {
            await updateDoc(doc(db, "preBookings", docRef.id), { 
                emailStatus: "sent", 
                emailSentAt: serverTimestamp() 
            });
            setBookingDetails((prev: any) => ({ ...prev, emailSent: true }));
          } else {
            throw new Error("Email failed");
          }
        } catch (e) {
            console.error("Email/PDF error:", e);
            await updateDoc(doc(db, "preBookings", docRef.id), { 
                emailStatus: "failed"
            });
            setBookingDetails((prev: any) => ({ ...prev, emailSent: false }));
        }
      })();
    } catch (err: any) {
      clearTimeout(timeout);
      console.error("PRE-BOOKING ERROR:", err);
      setError(`Unable to save your pre-booking: ${err.code} - ${err.message}. Please try again.`);
      setLoading(false);
    }
  };

  if (bookingDetails) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
        <div className="bg-white p-6 rounded-3xl w-full max-w-sm">
          <h2 className="text-xl font-black text-[#1B4332] mb-4">
            {bookingDetails.emailSent === 'pending' ? "🎉 Pre-Booking Confirmed" : 
             bookingDetails.emailSent === true ? "🎉 Pre-Booking Confirmed" : "⚠️ Pre-Booking Saved"}
          </h2>
          <div className="text-sm space-y-2 mb-6 text-gray-700">
            <p><strong>Booking ID:</strong> {bookingDetails.bookingId}</p>
            <p><strong>Crop:</strong> {bookingDetails.cropName}</p>
            <p><strong>Status:</strong> {bookingDetails.status}</p>
            <p className="font-medium text-[#2D6A4F]">
                {bookingDetails.emailSent === 'pending' ? "Generating and sending your confirmation report..." : 
                 bookingDetails.emailSent === true ? "📧 A confirmation email with your booking PDF has been sent." : "Pre-Booking saved successfully, but confirmation email could not be sent."}
            </p>
          </div>
          {bookingDetails.emailSent === false && <button className="w-full bg-red-100 text-red-700 py-3 rounded-full font-bold mb-2">Retry Email</button>}
          {bookingDetails.emailSent === true && bookingDetails.pdfUrl && <a href={bookingDetails.pdfUrl} download className="block text-center w-full bg-blue-100 text-blue-700 py-3 rounded-full font-bold mb-2">Download PDF</a>}
          <button onClick={() => window.location.href = "/my-bookings"} className="w-full bg-gray-100 text-[#2D6A4F] py-3 rounded-full font-bold mb-2">View My Pre-Bookings</button>
          <button onClick={onClose} className="w-full bg-[#2D6A4F] text-white py-3 rounded-full font-bold">Back to Marketplace</button>
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
            <input type="number" placeholder="Quantity" className="w-full p-3 border rounded-xl" required min="1" onChange={e => setFormData({...formData, requiredQuantity: e.target.value})} />
            <input type="text" value={formData.unit} className="w-20 p-3 border rounded-xl bg-gray-50" readOnly />
          </div>
          <input type="text" placeholder="Preferred Location" className="w-full p-3 border rounded-xl" required onChange={e => setFormData({...formData, preferredLocation: e.target.value})} />
          <input type="date" className="w-full p-3 border rounded-xl" required onChange={e => setFormData({...formData, purchaseDate: e.target.value})} />
          <textarea placeholder="Notes (Optional)" className="w-full p-3 border rounded-xl" onChange={e => setFormData({...formData, notes: e.target.value})} />
          
          {error && <p className="text-red-500 text-xs font-bold p-2 bg-red-50 rounded">{error}</p>}
          <button type="submit" className="w-full bg-[#2D6A4F] text-white py-3 rounded-full font-bold" disabled={loading}>{loading ? "Saving..." : "Confirm Pre-Booking"}</button>
          <button type="button" onClick={onClose} className="w-full py-3 rounded-full font-bold text-gray-500">Cancel</button>
        </form>
      </div>
    </div>
  );
}

