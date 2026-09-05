import React, { useState } from "react";
import { addDoc, collection, serverTimestamp, doc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useLanguage } from "../lib/i18n";

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
  const quantity = Number(formData.requiredQuantity) || 0;
  const priceUnit = listing.priceUnit || listing.unit;
  const { t, crop, language } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      setError(t("Please login before creating a pre-booking."));
      return;
    }
    const recipientEmail = auth.currentUser.email;
    if (!recipientEmail) {
      setError(t("Your account does not have a registered email address."));
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const bookingId = `AGR-${now.getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
      const recordId = `REC-${now.getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;

      const bookingData = {
        bookingId: bookingId,
        recordId: recordId,
        userId: auth.currentUser.uid,
        userName: formData.userName,
        userEmail: recipientEmail,
        mobileNumber: formData.mobileNumber,
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
        emailStatus: "sending",
      };

      const farmRecordData = {
        recordId: recordId,
        bookingId: bookingId,
        userId: auth.currentUser.uid,
        userName: formData.userName,
        userEmail: recipientEmail,
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
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await auth.currentUser!.getIdToken()}`,
            },
            body: JSON.stringify({
              bookingDocId: docRef.id,
              bookingData: {
                ...bookingData,
                bookingDate: now.toLocaleString(),
                bookingStatus: bookingData.status,
                language,
              }
            }),
          });

          if (response.ok) {
            setBookingDetails((prev: any) => ({ ...prev, emailSent: true }));
          } else {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.error || `Email failed with status ${response.status}`);
          }
        } catch (e) {
          console.error("Email/PDF error:", e);
          const emailError = e instanceof Error ? e.message : String(e);
          try {
            await updateDoc(doc(db, "preBookings", docRef.id), { emailStatus: "failed", emailError });
          } catch (statusError) {
            console.error("Unable to record failed email status:", statusError);
          }
          setBookingDetails((prev: any) => ({ ...prev, emailSent: false, emailError }));
        }
      })();
    } catch (err: any) {
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
            {bookingDetails.emailSent === 'pending' ? `🎉 ${t("Pre-Booking Confirmed")}` :
              bookingDetails.emailSent === true ? `🎉 ${t("Pre-Booking Confirmed")}` : `⚠️ ${t("Pre-Booking Saved")}`}
          </h2>
          <div className="text-sm space-y-2 mb-6 text-gray-700">
            <p><strong>{t("Booking ID")}:</strong> {bookingDetails.bookingId}</p>
            <p><strong>{t("Crop")}:</strong> {crop(bookingDetails.cropName)}</p>
            <p><strong>{t("Status")}:</strong> {t(bookingDetails.status)}</p>
            <p className="font-medium text-[#2D6A4F]">
              {bookingDetails.emailSent === 'pending' ? "Pre-Booking was successful. Sending your confirmation PDF..." :
                bookingDetails.emailSent === true ? "Your Pre-Booking confirmation PDF has been sent to your registered email." : "Pre-Booking was successful, but the confirmation email could not be sent."}
            </p>
          </div>
          {bookingDetails.emailSent === false && <button className="w-full bg-red-100 text-red-700 py-3 rounded-full font-bold mb-2">Retry Email</button>}
          {bookingDetails.emailSent === true && bookingDetails.pdfUrl && <a href={bookingDetails.pdfUrl} download className="block text-center w-full bg-blue-100 text-blue-700 py-3 rounded-full font-bold mb-2">Download PDF</a>}
          <button onClick={() => window.location.href = "/my-bookings"} className="w-full bg-gray-100 text-[#2D6A4F] py-3 rounded-full font-bold mb-2">{t("View My Pre-Bookings")}</button>
          <button onClick={onClose} className="w-full bg-[#2D6A4F] text-white py-3 rounded-full font-bold">{t("Back to Marketplace")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
      <div className="bg-white p-6 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-black text-[#1B4332] mb-4">{t("Pre-Book")} {crop(listing.cropName || listing.commodity)}</h2>
        <p className="text-sm text-gray-500 mb-4">{t("Reference Price")}: ₹{listing.price || listing.modal} / {priceUnit}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" placeholder={t("Name")} className="w-full p-3 border rounded-xl" required onChange={e => setFormData({ ...formData, userName: e.target.value })} />
          <input type="tel" placeholder={t("Mobile Number")} className="w-full p-3 border rounded-xl" required onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })} />
          <div className="flex gap-2">
            <input type="number" placeholder={t("Quantity")} className="w-full p-3 border rounded-xl" required min="1" onChange={e => setFormData({ ...formData, requiredQuantity: e.target.value })} />
            <input type="text" value={formData.unit} className="w-20 p-3 border rounded-xl bg-gray-50" readOnly />
          </div>
          {quantity > 0 && <p className="text-sm font-bold text-[#1B4332]">Estimated value: ₹{quantity * Number(listing.price || listing.modal)}</p>}
          <input type="text" placeholder={t("Preferred Location")} className="w-full p-3 border rounded-xl" required onChange={e => setFormData({ ...formData, preferredLocation: e.target.value })} />
          <input type="date" className="w-full p-3 border rounded-xl" required onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} />
          <textarea placeholder={t("Notes (Optional)")} className="w-full p-3 border rounded-xl" onChange={e => setFormData({ ...formData, notes: e.target.value })} />

          {error && <p className="text-red-500 text-xs font-bold p-2 bg-red-50 rounded">{error}</p>}
          <button type="submit" className="w-full bg-[#2D6A4F] text-white py-3 rounded-full font-bold" disabled={loading}>{loading ? t("Saving") : t("Confirm Pre-Booking")}</button>
          <button type="button" onClick={onClose} className="w-full py-3 rounded-full font-bold text-gray-500">{t("Cancel")}</button>
        </form>
      </div>
    </div>
  );
}

