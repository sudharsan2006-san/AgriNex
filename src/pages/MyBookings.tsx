import React, { useState, useEffect, useRef } from "react";
import { collection, query, onSnapshot, where, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import emailjs from '@emailjs/browser';
import { auth, db } from "../lib/firebase";
import BackButton from "../components/BackButton";

const StatusBadge = ({ status }: { status: string }) => {
    const colors: any = {
        Pending: "bg-yellow-100 text-yellow-800",
        Confirmed: "bg-blue-100 text-blue-800",
        Processing: "bg-purple-100 text-purple-800",
        Completed: "bg-green-100 text-green-800",
        Cancelled: "bg-red-100 text-red-800"
    };
    return <span className={`text-xs font-bold px-3 py-1 rounded-full ${colors[status] || "bg-gray-100"}`}>{status}</span>;
};

export default function MyBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const previousBookingsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, "preBookings"), where("userId", "==", auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const newBookings = snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
        
        // Check for status changes
        newBookings.forEach(async (booking) => {
            const oldBooking = previousBookingsRef.current.find(b => b.firebaseId === booking.firebaseId);
            if (oldBooking && oldBooking.status !== booking.status) {
                // Status changed!
                handleStatusChange(booking, oldBooking.status);
            }
        });

        previousBookingsRef.current = newBookings;
        setBookings(newBookings);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (booking: any, oldStatus: string) => {
      // 1. Add Notification
      await addDoc(collection(db, "notifications"), {
          userId: auth.currentUser?.uid,
          bookingId: booking.bookingId,
          title: "Booking Status Update",
          message: `Your ${booking.cropName} booking ${booking.bookingId} has been ${booking.status}.`,
          status: booking.status,
          read: false,
          createdAt: serverTimestamp()
      });

      // 2. Send Email if not already notified
      if (booking.lastNotifiedStatus !== booking.status) {
          try {
            await emailjs.send(
                import.meta.env.VITE_EMAILJS_SERVICE_ID,
                import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
                {
                    userName: booking.userName,
                    bookingId: booking.bookingId,
                    cropName: booking.cropName,
                    status: booking.status,
                    to_email: booking.userEmail
                },
                import.meta.env.VITE_EMAILJS_PUBLIC_KEY
            );
            // Update lastNotifiedStatus in Firestore
            await updateDoc(doc(db, "preBookings", booking.firebaseId), { lastNotifiedStatus: booking.status });
          } catch (e) {
              console.error("Email failed:", e);
          }
      }

      // 3. Update status in Farm Record
      if (booking.recordId) {
          try {
            await updateDoc(doc(db, "users", auth.currentUser!.uid, "farmRecords", booking.recordId), { bookingStatus: booking.status, updatedAt: serverTimestamp() });
          } catch (e) {
              console.error("Farm record update failed:", e);
          }
      }
  }

  const handleCancel = async (firebaseId: string, recordId?: string) => {
      if(window.confirm("Are you sure you want to cancel this booking?")) {
          try {
            await updateDoc(doc(db, "preBookings", firebaseId), { status: "Cancelled", updatedAt: serverTimestamp() });
            if (recordId) {
                await updateDoc(doc(db, "users", auth.currentUser!.uid, "farmRecords", recordId), { bookingStatus: "Cancelled", updatedAt: serverTimestamp() });
            }
          } catch(e) {
              console.error(e);
              alert("Error cancelling booking.");
          }
      }
  }

  return (
    <div className="p-6 pb-20 min-h-screen bg-[#F0F7F4]">
      <BackButton />
      <h1 className="text-xl font-black text-[#1B4332] mb-6">📋 My Pre-Bookings</h1>
      
      {loading ? (
          <p>Loading bookings...</p>
      ) : bookings.length === 0 ? (
          <p>No pre-bookings found.</p>
      ) : (
          <div className="grid gap-4">
              {bookings.map(booking => (
                  <div key={booking.firebaseId} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <h2 className="font-bold text-lg text-[#1B4332]">🌾 {booking.cropName}</h2>
                        <StatusBadge status={booking.status} />
                      </div>
                      <p className="text-sm"><strong>Booking ID:</strong> {booking.bookingId}</p>
                      <p className="text-sm"><strong>Quantity:</strong> {booking.requiredQuantity} {booking.priceUnit}</p>
                      <p className="text-sm"><strong>Reference Price:</strong> ₹{booking.referencePrice} / {booking.priceUnit}</p>
                      <p className="text-sm"><strong>Location:</strong> {booking.preferredLocation}</p>
                      <p className="text-sm"><strong>Preferred Date:</strong> {booking.purchaseDate}</p>
                      <p className="text-sm"><strong>Booking Created:</strong> {booking.createdAt?.toDate().toLocaleString() || "N/A"}</p>
                      
                      {booking.status === "Pending" && (
                          <button onClick={() => handleCancel(booking.firebaseId, booking.recordId)} className="mt-3 w-full bg-red-50 text-red-600 py-2 rounded-xl font-bold text-sm">Cancel Booking</button>
                      )}
                  </div>
              ))}
          </div>
      )}
    </div>
  );
}
