import React, { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { getFirebaseAuthHeaders } from "../lib/authHelpers";
import { API_BASE } from "../lib/apiBase";
import { MachineryItem, FarmingActivityType } from "../types/machinery";
import { createNotification } from "../utils/notificationService";
import { X, Calendar, Clock, MapPin, CheckCircle2, AlertCircle, Sparkles, FileText, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  machinery: MachineryItem;
  onClose: () => void;
  onSuccess?: () => void;
  initialContractId?: string;
  initialCropName?: string;
}

const ACTIVITIES: FarmingActivityType[] = [
  "Land Preparation",
  "Ploughing",
  "Sowing",
  "Spraying",
  "Harvesting",
  "Transportation",
  "Threshing",
  "Baling",
  "Other",
];

const DURATIONS = [
  "4 Hours (Half Day)",
  "8 Hours (Full Day)",
  "1 Day",
  "2 Days",
  "3 Days",
  "5 Days",
  "1 Week",
];

export default function MachineryRequestModal({
  machinery,
  onClose,
  onSuccess,
  initialContractId = "",
  initialCropName = "",
}: Props) {
  const user = auth.currentUser;
  const navigate = useNavigate();

  const [farmerName, setFarmerName] = useState(user?.displayName || "");
  const [farmerPhone, setFarmerPhone] = useState("");
  const [farmLocation, setFarmLocation] = useState(machinery.location || "");
  const [requiredDate, setRequiredDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [duration, setDuration] = useState("1 Day");
  const [activity, setActivity] = useState<FarmingActivityType>("Ploughing");
  const [contractId, setContractId] = useState(initialContractId);
  const [cropName, setCropName] = useState(initialCropName);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<any | null>(null);

  // Preload user profile from Firestore if available
  useEffect(() => {
    async function loadUserProfile() {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.name && !farmerName) setFarmerName(data.name);
          if (data.phoneNumber && !farmerPhone) setFarmerPhone(data.phoneNumber);
          if (data.location && !farmLocation) setFarmLocation(data.location);
          if (data.primaryCrop && !cropName) setCropName(data.primaryCrop);
        }
      } catch (err) {
        console.warn("Could not prefill user profile", err);
      }
    }
    loadUserProfile();
  }, [user]);

  // Check if this machinery already has an Approved/Booked request on the selected date
  useEffect(() => {
    async function checkDateAvailability() {
      if (!machinery.id || !requiredDate) return;
      setCheckingConflict(true);
      setConflictWarning(null);

      try {
        const q = query(
          collection(db, "machineryRequests"),
          where("machineryId", "==", machinery.id),
          where("requiredDate", "==", requiredDate)
        );
        const snap = await getDocs(q);
        const activeBookings = snap.docs.filter((d) => {
          const status = d.data().status;
          return status === "Approved" || status === "Booked";
        });

        if (activeBookings.length > 0) {
          setConflictWarning(
            `⚠️ Notice: This ${machinery.type} already has an approved booking scheduled on ${requiredDate}. Admin will review scheduling flexibility.`
          );
        }
      } catch (err) {
        console.warn("Availability check error:", err);
      } finally {
        setCheckingConflict(false);
      }
    }

    checkDateAvailability();
  }, [machinery.id, requiredDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Please login to submit a machinery request.");
      return;
    }

    if (machinery.status && machinery.status !== "Available") {
      setError(`This equipment is marked as "${machinery.status}" by the Administrator and is currently not open for requests.`);
      return;
    }
    if (!farmerName.trim()) {
      setError("Please enter farmer name.");
      return;
    }
    if (!farmerPhone.trim()) {
      setError("Please enter a valid contact phone number.");
      return;
    }
    if (!farmLocation.trim()) {
      setError("Please enter the farm location / village.");
      return;
    }
    if (!requiredDate) {
      setError("Please select the required date.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const requestId = `MCH-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const requestPayload = {
        requestId,
        farmerId: user.uid,
        farmerName: farmerName.trim(),
        farmerEmail: user.email || "",
        farmerPhone: farmerPhone.trim(),
        machineryId: machinery.id,
        machineryName: machinery.name,
        machineryType: machinery.type,
        provider: machinery.provider,
        price: machinery.price,
        rateUnit: machinery.rateUnit,
        requiredDate,
        duration,
        farmLocation: farmLocation.trim(),
        activity,
        contractId: contractId.trim() || null,
        cropName: cropName.trim() || null,
        notes: notes.trim(),
        status: "Pending Approval",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "machineryRequests"), {
        ...requestPayload,
        emailStatus: "pending",
      });

      try {
        const emailRes = await fetch(`${API_BASE}/api/send-machinery-request-admin-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...await getFirebaseAuthHeaders() },
          body: JSON.stringify({
            requestData: {
              ...requestPayload,
              requestId,
              status: "Pending Approval",
            },
          }),
        });
        const emailData = await emailRes.json().catch(() => ({}));
        await updateDoc(doc(db, "machineryRequests", docRef.id), {
          emailStatus: emailData?.success ? "sent" : "failed",
          emailError: emailData?.error || null,
          updatedAt: serverTimestamp(),
        });
        if (!emailData?.success) {
          console.warn("Machinery admin email failed but request was saved:", emailData?.error || "Unknown email issue");
        }
      } catch (emailErr) {
        console.warn("Machinery admin email dispatch error; request was kept in Firestore:", emailErr);
        await updateDoc(doc(db, "machineryRequests", docRef.id), {
          emailStatus: "failed",
          emailError: "Admin email dispatch failed but request was retained.",
          updatedAt: serverTimestamp(),
        });
      }

      // Create farmer in-app notification
      await createNotification({
        type: "machinery_request",
        title: "Machinery Request Submitted",
        message: `Your request for ${machinery.name} on ${requiredDate} for ${activity} has been submitted (Status: Pending Approval).`,
        payload: {
          requestId,
          machineryId: machinery.id,
          machineryName: machinery.name,
          machineryType: machinery.type,
          requiredDate,
          status: "Pending Approval",
        },
      });

      setSubmittedRequest({ ...requestPayload, id: docRef.id });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Failed to submit machinery request:", err);
      setError(err?.message || "Failed to submit request. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  // Success Confirmation Screen
  if (submittedRequest) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-[#2D6A4F] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} />
          </div>

          <h2 className="text-2xl font-black text-[#1B4332] mb-1">Request Submitted!</h2>
          <p className="text-xs text-gray-500 mb-5">
            Your machinery request is now <strong className="text-amber-600">Pending Approval</strong> by the AgriNex fleet manager.
          </p>

          <div className="bg-[#F0F7F4] p-4 rounded-2xl border border-[#D8F3DC] text-left text-xs space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-500 font-bold">Request ID:</span>
              <span className="font-mono font-bold text-[#1B4332]">{submittedRequest.requestId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-bold">Machinery:</span>
              <span className="font-bold text-[#1B4332]">{submittedRequest.machineryName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-bold">Scheduled Date:</span>
              <span className="font-bold text-[#2D6A4F]">{submittedRequest.requiredDate} ({submittedRequest.duration})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-bold">Farming Activity:</span>
              <span className="font-bold text-[#1B4332]">{submittedRequest.activity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-bold">Farm Location:</span>
              <span className="font-bold text-[#1B4332]">{submittedRequest.farmLocation}</span>
            </div>
            {submittedRequest.cropName && (
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">Contract / Crop:</span>
                <span className="font-bold text-[#2D6A4F]">🌾 {submittedRequest.cropName}</span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline">
              <span className="text-gray-500 font-bold">Estimated Rate:</span>
              <span className="text-sm font-black text-[#2D6A4F]">
                ₹{submittedRequest.price} / {submittedRequest.rateUnit}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => {
                onClose();
                navigate("/my-machinery-requests");
              }}
              className="w-full bg-[#2D6A4F] text-white py-3.5 rounded-full font-black text-sm shadow-md hover:bg-[#1B4332] transition-colors"
            >
              View My Machinery Requests
            </button>
            <button
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-700 py-3.5 rounded-full font-bold text-sm hover:bg-gray-200 transition-colors"
            >
              Back to Machinery Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-[#2D6A4F] to-[#1B4332] text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#A5D6A7] bg-white/10 px-2.5 py-0.5 rounded-full">
              Machinery Request
            </span>
            <h2 className="text-lg font-black mt-1 leading-snug">{machinery.name}</h2>
            <p className="text-xs text-white/80">
              ₹{machinery.price} / {machinery.rateUnit} • {machinery.location}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-2xl border border-red-200 flex items-center gap-2 font-bold">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {conflictWarning && (
            <div className="p-3 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200 flex items-start gap-2 font-semibold">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{conflictWarning}</span>
            </div>
          )}

          {/* Farmer Details */}
          <div>
            <label className="block font-black text-gray-600 uppercase text-[10px] tracking-wider mb-1">
              Farmer Full Name *
            </label>
            <input
              type="text"
              required
              value={farmerName}
              onChange={(e) => setFarmerName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-[#1B4332] focus:bg-white focus:outline-none focus:border-[#2D6A4F]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-black text-gray-600 uppercase text-[10px] tracking-wider mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={farmerPhone}
                onChange={(e) => setFarmerPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-[#1B4332] focus:bg-white focus:outline-none focus:border-[#2D6A4F]"
              />
            </div>
            <div>
              <label className="block font-black text-gray-600 uppercase text-[10px] tracking-wider mb-1">
                Farm Village / Location *
              </label>
              <input
                type="text"
                required
                value={farmLocation}
                onChange={(e) => setFarmLocation(e.target.value)}
                placeholder="e.g. Mannargudi, Thiruvarur"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-[#1B4332] focus:bg-white focus:outline-none focus:border-[#2D6A4F]"
              />
            </div>
          </div>

          {/* Schedule & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-black text-gray-600 uppercase text-[10px] tracking-wider mb-1">
                Required Date *
              </label>
              <input
                type="date"
                required
                value={requiredDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-[#1B4332] focus:bg-white focus:outline-none focus:border-[#2D6A4F]"
              />
            </div>
            <div>
              <label className="block font-black text-gray-600 uppercase text-[10px] tracking-wider mb-1">
                Required Duration *
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-[#1B4332] focus:bg-white focus:outline-none focus:border-[#2D6A4F]"
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Farming Activity */}
          <div>
            <label className="block font-black text-gray-600 uppercase text-[10px] tracking-wider mb-1">
              Farming Activity *
            </label>
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value as FarmingActivityType)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-[#1B4332] focus:bg-white focus:outline-none focus:border-[#2D6A4F]"
            >
              {ACTIVITIES.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          {/* Contract Farming Integration (Section 9) */}
          <div className="p-4 bg-[#F0F7F4] rounded-2xl border border-[#D8F3DC] space-y-2.5">
            <div className="flex items-center gap-1.5 text-[#2D6A4F] font-black text-[11px] uppercase tracking-wide">
              <Sparkles size={14} /> Contract Farming Support
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">
                  Linked Contract ID (Optional)
                </label>
                <input
                  type="text"
                  value={contractId}
                  onChange={(e) => setContractId(e.target.value)}
                  placeholder="e.g. AGR-2026-88190"
                  className="w-full p-2.5 bg-white border border-[#A5D6A7] rounded-xl font-medium text-[#1B4332]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">
                  Target Crop
                </label>
                <input
                  type="text"
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  placeholder="e.g. Paddy, Cotton, Maize"
                  className="w-full p-2.5 bg-white border border-[#A5D6A7] rounded-xl font-medium text-[#1B4332]"
                />
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block font-black text-gray-600 uppercase text-[10px] tracking-wider mb-1">
              Additional Notes / Specific Requirements (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Need driver assistance, plot has deep clay soil..."
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl font-medium text-[#1B4332] focus:bg-white focus:outline-none focus:border-[#2D6A4F]"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-full font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 rounded-full font-black text-sm tracking-wide bg-[#2D6A4F] text-white hover:bg-[#1B4332] shadow-md transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
