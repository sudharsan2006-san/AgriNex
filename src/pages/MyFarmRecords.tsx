import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
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

export default function MyFarmRecords() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth.currentUser) return;
        const q = query(collection(db, "users", auth.currentUser.uid, "farmRecords"), orderBy("recordCreatedAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
            setRecords(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="p-6 pb-20 min-h-screen bg-[#F0F7F4]">
            <BackButton />
            <h1 className="text-xl font-black text-[#1B4332] mb-6">🌾 My Farm Records</h1>
            
            {loading ? (
                <p>Loading records...</p>
            ) : records.length === 0 ? (
                <p>No farm records found.</p>
            ) : (
                <div className="grid gap-4">
                    {records.map(record => (
                        <div key={record.firebaseId} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="font-bold text-lg text-[#1B4332]">🌾 {record.cropName}</h2>
                                <StatusBadge status={record.bookingStatus} />
                            </div>
                            <p className="text-sm"><strong>Booking ID:</strong> {record.bookingId}</p>
                            <p className="text-sm"><strong>Quantity:</strong> {record.quantity} {record.quantityUnit}</p>
                            <p className="text-sm"><strong>Reference Price:</strong> ₹{record.referencePrice} / {record.priceUnit}</p>
                            <p className="text-sm"><strong>Location:</strong> {record.preferredLocation}</p>
                            <p className="text-sm"><strong>Preferred Date:</strong> {record.preferredDate}</p>
                            <p className="text-sm"><strong>Created:</strong> {record.recordCreatedAt?.toDate().toLocaleString() || "N/A"}</p>
                            
                            <button className="mt-3 w-full bg-[#E7F5FF] text-[#2D6A4F] py-2 rounded-xl font-bold text-sm">View Details</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
