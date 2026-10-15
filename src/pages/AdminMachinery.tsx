import React, { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  where,
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import {
  MachineryItem,
  MachineryRequest,
  MachineryStatus,
  MachineryType,
  FarmingActivityType,
} from "../types/machinery";
import { createNotification } from "../utils/notificationService";
import BackButton from "../components/BackButton";
import NotificationBell from "../components/NotificationBell";
import {
  Wrench,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  Check,
  X,
  Sparkles,
} from "lucide-react";

const MACHINERY_TYPES: MachineryType[] = [
  "Tractor",
  "Harvester",
  "Rotavator",
  "Cultivator",
  "Seed Drill",
  "Power Tiller",
  "Tractor Trailer",
  "Sprayer",
  "Thresher",
  "Plough",
  "Paddy Transplanter",
  "Reaper",
  "Weeder",
  "Baler",
  "Water Pump",
  "Other",
];

export default function AdminMachinery() {
  const [activeTab, setActiveTab] = useState<"requests" | "inventory" | "reports">("requests");

  // State: Machinery Inventory
  const [machineryList, setMachineryList] = useState<MachineryItem[]>([]);
  // State: Machinery Requests
  const [requestsList, setRequestsList] = useState<MachineryRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>("All");
  const [requestSearch, setRequestSearch] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");

  // Dialog & Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MachineryItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Approval / Rejection confirmation modals
  const [confirmApproveReq, setConfirmApproveReq] = useState<MachineryRequest | null>(null);
  const [confirmRejectReq, setConfirmRejectReq] = useState<MachineryRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Add/Edit Machinery Form Data
  const [formData, setFormData] = useState({
    name: "",
    type: "Tractor" as MachineryType,
    provider: "",
    providerPhone: "",
    location: "",
    price: 1500,
    rateUnit: "Day" as "Day" | "Hour" | "Acre",
    status: "Available" as MachineryStatus,
    description: "",
    imageUrl: "",
    horsePower: "",
    fuelType: "",
    modelYear: "2024",
    capacity: "",
  });

  // Listen to machinery inventory & requests
  useEffect(() => {
    const unsubMachinery = onSnapshot(
      collection(db, "machinery"),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        items.sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return timeB - timeA;
        });
        setMachineryList(items);
        setLoading(false);
      }
    );

    const unsubRequests = onSnapshot(
      query(collection(db, "machineryRequests"), orderBy("createdAt", "desc")),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setRequestsList(items);
      }
    );

    return () => {
      unsubMachinery();
      unsubRequests();
    };
  }, []);

  // Save / Update Machinery
  const handleSaveMachinery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.provider.trim() || !formData.location.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    setActionLoading(true);
    try {
      if (editingItem) {
        // Update
        await updateDoc(doc(db, "machinery", editingItem.id), {
          ...formData,
          price: Number(formData.price),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new
        await addDoc(collection(db, "machinery"), {
          ...formData,
          price: Number(formData.price),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setShowAddModal(false);
      setEditingItem(null);
      resetForm();
    } catch (err) {
      console.error("Failed to save machinery:", err);
      alert("Error saving machinery. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "Tractor",
      provider: "",
      providerPhone: "",
      location: "",
      price: 1500,
      rateUnit: "Day",
      status: "Available",
      description: "",
      imageUrl: "",
      horsePower: "",
      fuelType: "",
      modelYear: "2024",
      capacity: "",
    });
  };

  const handleEditClick = (item: MachineryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      provider: item.provider,
      providerPhone: item.providerPhone || "",
      location: item.location,
      price: item.price,
      rateUnit: item.rateUnit,
      status: item.status,
      description: item.description,
      imageUrl: item.imageUrl || "",
      horsePower: item.horsePower || "",
      fuelType: item.fuelType || "",
      modelYear: item.modelYear || "2024",
      capacity: item.capacity || "",
    });
    setShowAddModal(true);
  };

  const handleDeleteMachinery = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from inventory?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "machinery", id));
    } catch (err) {
      console.error("Failed to delete machinery:", err);
      alert("Error deleting machinery.");
    }
  };

  const handleQuickStatusChange = async (id: string, status: MachineryStatus) => {
    try {
      await updateDoc(doc(db, "machinery", id), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  // Approve Request with Double-Booking check
  const handleApproveRequest = async () => {
    if (!confirmApproveReq) return;
    setActionLoading(true);

    try {
      // 1. Update Request status
      await updateDoc(doc(db, "machineryRequests", confirmApproveReq.id), {
        status: "Approved",
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Update Machinery status to "Booked"
      if (confirmApproveReq.machineryId) {
        await updateDoc(doc(db, "machinery", confirmApproveReq.machineryId), {
          status: "Booked",
          updatedAt: serverTimestamp(),
        });
      }

      // 3. Send Notification to Farmer
      await createNotification({
        type: "machinery_approved",
        title: "Machinery Request Approved! 🎉",
        message: `Your request for ${confirmApproveReq.machineryName} scheduled on ${confirmApproveReq.requiredDate} has been APPROVED. Provider: ${confirmApproveReq.provider}.`,
        targetUserId: confirmApproveReq.farmerId,
        targetUserEmail: confirmApproveReq.farmerEmail,
        payload: {
          requestId: confirmApproveReq.requestId,
          machineryId: confirmApproveReq.machineryId,
          machineryName: confirmApproveReq.machineryName,
          requiredDate: confirmApproveReq.requiredDate,
          status: "Approved",
        },
      });

      setConfirmApproveReq(null);
    } catch (err) {
      console.error("Approval error:", err);
      alert("Failed to approve request.");
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Request
  const handleRejectRequest = async () => {
    if (!confirmRejectReq) return;
    setActionLoading(true);

    try {
      await updateDoc(doc(db, "machineryRequests", confirmRejectReq.id), {
        status: "Rejected",
        rejectionReason: rejectionReason.trim() || "Machinery unavailable for selected time window",
        updatedAt: serverTimestamp(),
      });

      // Send notification to farmer
      await createNotification({
        type: "machinery_rejected",
        title: "Machinery Request Update",
        message: `Your request for ${confirmRejectReq.machineryName} (${confirmRejectReq.requestId}) could not be fulfilled: ${
          rejectionReason.trim() || "Slot unavailable"
        }.`,
        targetUserId: confirmRejectReq.farmerId,
        targetUserEmail: confirmRejectReq.farmerEmail,
        payload: {
          requestId: confirmRejectReq.requestId,
          machineryName: confirmRejectReq.machineryName,
          status: "Rejected",
        },
      });

      setConfirmRejectReq(null);
      setRejectionReason("");
    } catch (err) {
      console.error("Rejection error:", err);
      alert("Failed to reject request.");
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Request & return machinery to Available
  const handleMarkCompleted = async (req: MachineryRequest) => {
    if (!window.confirm(`Mark request ${req.requestId} as Completed and return ${req.machineryName} to Available?`)) {
      return;
    }

    try {
      await updateDoc(doc(db, "machineryRequests", req.id), {
        status: "Completed",
        updatedAt: serverTimestamp(),
      });

      if (req.machineryId) {
        await updateDoc(doc(db, "machinery", req.machineryId), {
          status: "Available",
          updatedAt: serverTimestamp(),
        });
      }

      await createNotification({
        type: "machinery_completed",
        title: "Machinery Usage Completed ✅",
        message: `Service for ${req.machineryName} (${req.requestId}) has been marked as Completed. Thank you for using AgriNex!`,
        targetUserId: req.farmerId,
        targetUserEmail: req.farmerEmail,
        payload: {
          requestId: req.requestId,
          status: "Completed",
        },
      });
    } catch (err) {
      console.error("Failed to complete request:", err);
      alert("Error updating status.");
    }
  };

  // Check overlap for a given request against other approved requests
  const hasDateConflict = (req: MachineryRequest) => {
    return requestsList.some(
      (other) =>
        other.id !== req.id &&
        other.machineryId === req.machineryId &&
        other.requiredDate === req.requiredDate &&
        (other.status === "Approved" || other.status === "Booked")
    );
  };

  // Export / Print Machinery Usage Report
  const handleExportReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const totalMachines = machineryList.length;
    const availableCount = machineryList.filter((m) => m.status === "Available").length;
    const bookedCount = machineryList.filter((m) => m.status === "Booked").length;
    const totalRequests = requestsList.length;
    const approvedRequests = requestsList.filter((r) => r.status === "Approved" || r.status === "Booked" || r.status === "Completed").length;

    printWindow.document.write(`
      <html>
        <head>
          <title>AgriNex Machinery Management Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1B4332; }
            h1 { color: #2D6A4F; font-size: 24px; margin-bottom: 4px; }
            .metrics { display: flex; gap: 20px; margin: 24px 0; }
            .card { background: #F0F7F4; border: 1px solid #D8F3DC; padding: 16px; border-radius: 12px; flex: 1; }
            .card h3 { margin: 0; font-size: 11px; text-transform: uppercase; color: #4B5563; }
            .card p { margin: 8px 0 0 0; font-size: 22px; font-weight: bold; color: #2D6A4F; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #E5E7EB; }
            th { background: #E8F5E9; color: #1B4332; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>🌱 AgriNex Fleet & Machinery Usage Report</h1>
          <p style="font-size: 12px; color: #6B7280;">Generated on ${new Date().toLocaleString()}</p>

          <div class="metrics">
            <div class="card"><h3>Total Machinery</h3><p>${totalMachines}</p></div>
            <div class="card"><h3>Available Fleet</h3><p>${availableCount}</p></div>
            <div class="card"><h3>Active Bookings</h3><p>${bookedCount}</p></div>
            <div class="card"><h3>Total Requests</h3><p>${totalRequests}</p></div>
            <div class="card"><h3>Fulfillment Rate</h3><p>${totalRequests ? Math.round((approvedRequests / totalRequests) * 100) : 0}%</p></div>
          </div>

          <h2>Recent Machinery Requests</h2>
          <table>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Farmer</th>
                <th>Machinery</th>
                <th>Scheduled Date</th>
                <th>Duration</th>
                <th>Activity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${requestsList
                .map(
                  (r) => `
                <tr>
                  <td><strong>${r.requestId}</strong></td>
                  <td>${r.farmerName} (${r.farmerPhone})</td>
                  <td>${r.machineryName}</td>
                  <td>${r.requiredDate}</td>
                  <td>${r.duration}</td>
                  <td>${r.activity}</td>
                  <td>${r.status}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter requests
  const filteredRequests = requestsList.filter((req) => {
    const matchesFilter = requestStatusFilter === "All" || req.status === requestStatusFilter;
    const matchesSearch =
      req.requestId.toLowerCase().includes(requestSearch.toLowerCase()) ||
      req.farmerName.toLowerCase().includes(requestSearch.toLowerCase()) ||
      req.machineryName.toLowerCase().includes(requestSearch.toLowerCase()) ||
      req.farmLocation.toLowerCase().includes(requestSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Filter inventory
  const filteredInventory = machineryList.filter(
    (m) =>
      m.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      m.type.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      m.location.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      m.provider.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  return (
    <div className="p-6 pb-24 min-h-screen bg-[#F0F7F4] text-[#1B4332]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <BackButton />
        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-[#2D6A4F] text-white px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-1">
            🛡️ Admin Control Hub
          </div>
          <h1 className="text-2xl font-black text-[#1B4332]">Machinery Management</h1>
          <p className="text-xs text-[#2D6A4F] font-semibold">
            Control fleet inventory, schedule conflicts, approve farmer requests, and view analytics.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white p-1 rounded-2xl border border-gray-200 shadow-sm flex items-center text-xs font-bold">
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === "requests" ? "bg-[#2D6A4F] text-white shadow-sm" : "text-gray-600 hover:text-black"
            }`}
          >
            Farmer Requests ({requestsList.filter((r) => r.status === "Pending Approval").length} Pending)
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === "inventory" ? "bg-[#2D6A4F] text-white shadow-sm" : "text-gray-600 hover:text-black"
            }`}
          >
            Machinery Fleet ({machineryList.length})
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === "reports" ? "bg-[#2D6A4F] text-white shadow-sm" : "text-gray-600 hover:text-black"
            }`}
          >
            Reports & Insights
          </button>
        </div>
      </div>

      {/* ================= TAB 1: REQUESTS ================= */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {/* Filter / Search Bar */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search requests by ID, farmer, machine, village..."
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#2D6A4F]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
              {["All", "Pending Approval", "Approved", "Booked", "Completed", "Rejected"].map((status) => (
                <button
                  key={status}
                  onClick={() => setRequestStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                    requestStatusFilter === status
                      ? "bg-[#2D6A4F] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Requests Listing */}
          {filteredRequests.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center shadow-sm">
              <Wrench size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="font-bold text-gray-600 text-sm">No machinery requests match your filter.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredRequests.map((req) => {
                const conflict = hasDateConflict(req);

                return (
                  <div
                    key={req.id}
                    className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3"
                  >
                    {/* Header Row */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base text-[#1B4332]">{req.machineryName}</span>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            {req.machineryType}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-semibold mt-0.5">
                          Farmer: <strong className="text-[#1B4332]">{req.farmerName}</strong> • {req.farmerPhone} • {req.farmerEmail}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {conflict && req.status === "Pending Approval" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <AlertTriangle size={12} /> Schedule Overlap Warning
                          </span>
                        )}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            req.status === "Approved" || req.status === "Booked"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : req.status === "Completed"
                              ? "bg-teal-50 text-teal-800 border-teal-200"
                              : req.status === "Rejected"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                    </div>

                    {/* Schedule & Info Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-[#F0F7F4] p-3 rounded-2xl border border-[#D8F3DC]">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400">Request ID</span>
                        <p className="font-mono font-bold text-[#1B4332] mt-0.5">{req.requestId}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400">Scheduled Date</span>
                        <p className="font-bold text-[#1B4332] flex items-center gap-1 mt-0.5">
                          <Calendar size={13} className="text-[#2D6A4F]" /> {req.requiredDate} ({req.duration})
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400">Farming Activity</span>
                        <p className="font-bold text-[#2D6A4F] mt-0.5">🌾 {req.activity}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400">Farm Location</span>
                        <p className="font-bold text-[#1B4332] mt-0.5 truncate flex items-center gap-1">
                          <MapPin size={13} className="text-[#2D6A4F]" /> {req.farmLocation}
                        </p>
                      </div>
                    </div>

                    {/* Contract & Notes */}
                    {(req.contractId || req.notes) && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {req.contractId && (
                          <span className="bg-emerald-50 text-[#2D6A4F] font-semibold px-2.5 py-1 rounded-xl border border-emerald-200">
                            🌱 Contract #{req.contractId} {req.cropName ? `(${req.cropName})` : ""}
                          </span>
                        )}
                        {req.notes && (
                          <span className="bg-gray-50 text-gray-600 px-2.5 py-1 rounded-xl border border-gray-200 flex-1">
                            <strong>Note:</strong> {req.notes}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Admin Actions */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div className="text-xs text-gray-500 font-bold">
                        Provider: <span className="text-[#1B4332]">{req.provider}</span> • ₹{req.price}/{req.rateUnit}
                      </div>

                      <div className="flex items-center gap-2">
                        {req.status === "Pending Approval" && (
                          <>
                            <button
                              onClick={() => setConfirmRejectReq(req)}
                              className="px-3.5 py-1.5 rounded-full font-bold text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => setConfirmApproveReq(req)}
                              className="px-4 py-1.5 rounded-full font-black text-xs text-white bg-[#2D6A4F] hover:bg-[#1B4332] shadow-sm transition-colors"
                            >
                              Approve Request
                            </button>
                          </>
                        )}

                        {(req.status === "Approved" || req.status === "Booked") && (
                          <button
                            onClick={() => handleMarkCompleted(req)}
                            className="px-4 py-1.5 rounded-full font-bold text-xs text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
                          >
                            Mark Completed & Release Fleet
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: INVENTORY MANAGEMENT ================= */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          {/* Top Bar with Search & Add Machinery Button */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search fleet by name, provider, location..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#2D6A4F]"
              />
            </div>

            <button
              onClick={() => {
                setEditingItem(null);
                resetForm();
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 bg-[#2D6A4F] text-white px-4 py-2.5 rounded-full font-black text-xs shadow-sm hover:bg-[#1B4332] transition-colors"
            >
              <Plus size={15} /> Add New Machinery
            </button>
          </div>

          {/* Fleet Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredInventory.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#2D6A4F]">
                      {item.type}
                    </span>
                    {/* Status Dropdown */}
                    <select
                      value={item.status}
                      onChange={(e) => handleQuickStatusChange(item.id, e.target.value as MachineryStatus)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                        item.status === "Available"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : item.status === "Booked"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : item.status === "Maintenance"
                          ? "bg-purple-50 text-purple-800 border-purple-200"
                          : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}
                    >
                      <option value="Available">🟢 Available</option>
                      <option value="Booked">🟡 Booked</option>
                      <option value="Maintenance">🟣 Maintenance</option>
                      <option value="Unavailable">🔴 Unavailable</option>
                    </select>
                  </div>

                  <h3 className="font-black text-[#1B4332] text-sm leading-snug">{item.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.location}, TN • Provider: {item.provider}
                  </p>
                  <p className="text-xs text-[#2D6A4F] font-black mt-1">
                    ₹{item.price.toLocaleString()} / {item.rateUnit}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div className="text-gray-400 text-[10px] font-bold">
                    {item.horsePower ? `⚡ ${item.horsePower}` : "Standard"}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditClick(item)}
                      className="p-2 text-gray-600 hover:text-[#2D6A4F] hover:bg-gray-100 rounded-xl transition-colors"
                      title="Edit details"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteMachinery(item.id, item.name)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 3: REPORTS & ANALYTICS ================= */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-gray-400">Total Machinery Fleet</span>
              <p className="text-2xl font-black text-[#2D6A4F] mt-1">{machineryList.length}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-gray-400">Available Machines</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {machineryList.filter((m) => m.status === "Available").length}
              </p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-gray-400">Active Bookings</span>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {machineryList.filter((m) => m.status === "Booked").length}
              </p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-gray-400">Pending Requests</span>
              <p className="text-2xl font-black text-indigo-600 mt-1">
                {requestsList.filter((r) => r.status === "Pending Approval").length}
              </p>
            </div>
          </div>

          {/* Report Download Action Box */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-[#1B4332] text-lg">Export Fleet & Booking Report</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Generate printable PDF reports detailing machinery inventory, active schedules, and farmer requests.
              </p>
            </div>
            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 bg-[#2D6A4F] hover:bg-[#1B4332] text-white px-6 py-3 rounded-full font-black text-xs shadow-md transition-colors"
            >
              <Download size={16} /> Print / Export PDF Report
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT MACHINERY ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 my-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-[#1B4332]">
                {editingItem ? "Edit Machinery" : "Add New Machinery"}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMachinery} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Machinery Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Deere 5050 D 4WD Tractor"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Equipment Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as MachineryType })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                  >
                    {MACHINERY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as MachineryStatus })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                  >
                    <option value="Available">Available</option>
                    <option value="Booked">Booked</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Unavailable">Unavailable</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Provider Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    placeholder="e.g. Delta Farm Tools"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Location / District *</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Thiruvarur"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Rental Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Rate Unit *</label>
                  <select
                    value={formData.rateUnit}
                    onChange={(e) => setFormData({ ...formData, rateUnit: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                  >
                    <option value="Day">₹ / Day</option>
                    <option value="Hour">₹ / Hour</option>
                    <option value="Acre">₹ / Acre</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Horse Power</label>
                  <input
                    type="text"
                    value={formData.horsePower}
                    onChange={(e) => setFormData({ ...formData, horsePower: e.target.value })}
                    placeholder="e.g. 50 HP"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Capacity</label>
                  <input
                    type="text"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    placeholder="e.g. 2 Acres/Hour"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Key features, suitability, implements included..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-full font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-full font-black text-white bg-[#2D6A4F] hover:bg-[#1B4332]"
                >
                  {actionLoading ? "Saving..." : editingItem ? "Update Fleet" : "Save Machinery"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: APPROVAL CONFIRMATION ================= */}
      {confirmApproveReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-emerald-100 text-[#2D6A4F] rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={32} />
            </div>

            <h3 className="text-lg font-black text-[#1B4332] mb-1">Approve Machinery Request?</h3>
            <p className="text-xs text-gray-500 mb-4">
              Approving will schedule <strong className="text-[#1B4332]">{confirmApproveReq.machineryName}</strong> for{" "}
              <strong className="text-[#2D6A4F]">{confirmApproveReq.farmerName}</strong> on{" "}
              <strong className="text-[#1B4332]">{confirmApproveReq.requiredDate}</strong>, mark equipment as Booked, and dispatch a notification.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmApproveReq(null)}
                className="flex-1 py-3 rounded-full font-bold text-xs text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveRequest}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-full font-black text-xs text-white bg-[#2D6A4F] hover:bg-[#1B4332]"
              >
                {actionLoading ? "Approving..." : "Confirm & Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REJECTION CONFIRMATION ================= */}
      {confirmRejectReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <XCircle size={32} />
            </div>

            <h3 className="text-lg font-black text-[#1B4332] mb-1">Reject Machinery Request</h3>
            <p className="text-xs text-gray-500 mb-3">
              Provide a reason for rejecting request <strong>{confirmRejectReq.requestId}</strong>.
            </p>

            <textarea
              rows={2}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Machinery undergoing maintenance, or already scheduled."
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold mb-4 focus:outline-none focus:border-rose-400"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setConfirmRejectReq(null);
                  setRejectionReason("");
                }}
                className="flex-1 py-3 rounded-full font-bold text-xs text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectRequest}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-full font-black text-xs text-white bg-rose-600 hover:bg-rose-700"
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
