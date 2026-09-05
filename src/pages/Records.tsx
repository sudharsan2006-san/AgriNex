import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
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

export default function Records() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ FIX: Wait for Firebase auth state to resolve before attaching listener
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      const q = query(collection(db, "farmRecords"), where("userId", "==", user.uid));
      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const newRecords = snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
          setRecords(newRecords);
          setLoading(false);
      }, (err) => {
          console.error("Records snapshot error:", err);
          setLoading(false);
      });
      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <div className="p-6 pb-20 min-h-screen bg-[#F0F7F4]">
      <BackButton />
      <h1 className="text-[#1B4332] text-xl font-black mb-6">📂 Farm Records</h1>
      
      {loading ? (
          <p className="text-gray-500">Loading records...</p>
      ) : records.length === 0 ? (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 text-[#1B4332] shadow-sm">
              <p>No farm records found. Your pre-booking records will appear here.</p>
          </div>
      ) : (
          <div className="grid gap-4">
              {records.map(record => (
                  <div key={record.firebaseId} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <h2 className="font-bold text-lg text-[#1B4332]">🌾 {record.cropName}</h2>
                        <StatusBadge status={record.status} />
                      </div>
                      <p className="text-sm"><strong>Booking ID:</strong> {record.bookingId}</p>
                      <p className="text-sm"><strong>Quantity:</strong> {record.quantity} {record.quantityUnit}</p>
                      <p className="text-sm"><strong>Reference Price:</strong> ₹{record.referencePrice} / {record.priceUnit}</p>
                      <p className="text-sm"><strong>Location:</strong> {record.location || "—"}</p>
                      <p className="text-sm"><strong>Preferred Date:</strong> {record.preferredDate || "—"}</p>
                      <p className="text-sm"><strong>Created Date:</strong> {record.createdAt?.toDate().toLocaleString() || "N/A"}</p>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
}
