import React, { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
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
        alert("Please login to book.");
        return;
    }
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const bookingId = `AGR-${now.getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;

      await addDoc(collection(db, "preBookings"), {
        ...formData,
        bookingId: bookingId,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        userName: formData.userName,
        cropName: listing.cropName || listing.commodity,
        referencePrice: listing.price || listing.modal,
        priceUnit: listing.unit || "kg",
        status: "Pending",
        lastNotifiedStatus: "Pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      setBookingDetails({
        id: bookingId,
        ...formData,
        cropName: listing.cropName || listing.commodity,
        referencePrice: listing.price || listing.modal,
        status: "Pending",
      });
    } catch (err: any) {
      console.error("Firebase booking error:", err);
      setError(`Unable to save your pre-booking: ${err.code} - ${err.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  if (bookingDetails) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
        <div className="bg-white p-6 rounded-3xl w-full max-w-sm">
          <h2 className="text-xl font-black text-[#1B4332] mb-4">🎉 Pre-Booking Confirmed</h2>
          <div className="text-sm space-y-2 mb-6 text-gray-700">
            <p><strong>Booking ID:</strong> {bookingDetails.id}</p>
            <p><strong>Crop:</strong> {bookingDetails.cropName}</p>
            <p><strong>Reference Price:</strong> ₹{bookingDetails.referencePrice} / {bookingDetails.unit}</p>
            <p><strong>Quantity:</strong> {bookingDetails.requiredQuantity} {bookingDetails.unit}</p>
            <p><strong>Status:</strong> {bookingDetails.status}</p>
            <p><strong>Booking Date:</strong> {new Date().toLocaleDateString()}</p>
          </div>
          <button onClick={() => window.location.href = "/my-bookings"} className="w-full bg-gray-100 text-[#2D6A4F] py-3 rounded-full font-bold mb-2">View My Bookings</button>
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

