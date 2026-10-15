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
  setDoc,
  serverTimestamp,
  getDocs,
  getDoc,
  runTransaction,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../lib/firebase";
import { ADMIN_EMAIL, getFirebaseAuthHeaders, isAdminUserEmail } from "../lib/authHelpers";
import { API_BASE } from "../lib/apiBase";
import {
  MachineryItem,
  MachineryRequest,
  MachineryStatus,
  MachineryType,
} from "../types/machinery";
import { createNotification } from "../utils/notificationService";
import {
  subscribeMarketPrices,
  updateCropPrice,
  CropPriceItem,
  DEFAULT_REFERENCE_PRICES,
} from "../utils/priceService";
import {
  subscribeRetailers,
  addRetailer,
  updateRetailer,
  deleteRetailer,
  RetailerItem,
} from "../utils/retailerService";
import BackButton from "../components/BackButton";
import NotificationBell from "../components/NotificationBell";
import {
  Wrench,
  CheckCircle2,
  XCircle,
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  Download,
  Search,
  LayoutDashboard,
  ClipboardList,
  Users,
  FileSpreadsheet,
  Shield,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Package,
  Store,
  DollarSign,
  Send,
  Phone,
  Mail,
  Building,
  Check,
  ExternalLink,
  Eye,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const MACHINERY_TYPES: MachineryType[] = [
  "Tractor",
  "Harvester",
  "Rotavator",
  "Cultivator",
  "Seed Drill",
  "Sprayer",
  "Thresher",
  "Baler",
  "Other",
];

interface AdminDashboardProps {
  initialSection?: "overview" | "requests" | "prebookings" | "prices" | "retailers" | "machinery" | "users" | "reports";
}

export default function AdminDashboard({ initialSection }: AdminDashboardProps = {}) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<
    "overview" | "requests" | "prebookings" | "prices" | "retailers" | "machinery" | "users" | "reports"
  >(initialSection || "overview");

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  // Real-time Firestore States
  const [machineryList, setMachineryList] = useState<MachineryItem[]>([]);
  const [requestsList, setRequestsList] = useState<MachineryRequest[]>([]);
  const [preBookingsList, setPreBookingsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [pricesList, setPricesList] = useState<CropPriceItem[]>(DEFAULT_REFERENCE_PRICES);
  const [retailersList, setRetailersList] = useState<RetailerItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search States
  const [requestFilter, setRequestFilter] = useState("All");
  const [requestSearch, setRequestSearch] = useState("");
  const [preBookingFilter, setPreBookingFilter] = useState("All");
  const [preBookingSearch, setPreBookingSearch] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  const [priceSearch, setPriceSearch] = useState("");
  const [retailerSearch, setRetailerSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // Modals & Action States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MachineryItem | null>(null);
  const [confirmApproveReq, setConfirmApproveReq] = useState<MachineryRequest | null>(null);
  const [confirmRejectReq, setConfirmRejectReq] = useState<MachineryRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Pre-Booking Modals
  const [confirmPreBooking, setConfirmPreBooking] = useState<any | null>(null);
  const [confirmRejectPreBooking, setConfirmRejectPreBooking] = useState<any | null>(null);
  const [preBookingRejectionReason, setPreBookingRejectionReason] = useState("");
  const [sendToRetailerBooking, setSendToRetailerBooking] = useState<any | null>(null);
  const [selectedRetailerEmail, setSelectedRetailerEmail] = useState("");
  const [selectedRetailerName, setSelectedRetailerName] = useState("");
  const [customRetailerEmail, setCustomRetailerEmail] = useState("");
  const [emailStatusMsg, setEmailStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Price Edit Modal
  const [editingPrice, setEditingPrice] = useState<CropPriceItem | null>(null);
  const [showAddPriceModal, setShowAddPriceModal] = useState(false);
  const [priceFormData, setPriceFormData] = useState({
    id: "",
    commodity: "",
    min: 0,
    max: 0,
    modal: 0,
    unit: "₹ / Quintal",
  });

  // Retailer Add / Edit Modal
  const [showRetailerModal, setShowRetailerModal] = useState(false);
  const [editingRetailer, setEditingRetailer] = useState<RetailerItem | null>(null);
  const [retailerFormData, setRetailerFormData] = useState({
    name: "",
    businessName: "",
    email: "",
    phone: "",
    location: "",
    categories: "",
    preferredCrops: "",
    status: "Active" as "Active" | "Inactive",
    notes: "",
  });

  const [actionLoading, setActionLoading] = useState(false);

  // Machinery Form Data
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

  // Setup Real-time Listeners
  useEffect(() => {
    // 1. Machinery
    const unsubMachinery = onSnapshot(
      query(collection(db, "machinery"), orderBy("createdAt", "desc")),
      (snap) => {
        setMachineryList(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      },
      (err) => console.warn("Machinery snapshot error", err)
    );

    // 2. Machinery Requests
    const unsubRequests = onSnapshot(
      query(collection(db, "machineryRequests"), orderBy("createdAt", "desc")),
      (snap) => {
        setRequestsList(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => console.warn("Requests snapshot error", err)
    );

    // 3. Pre-Bookings
    const unsubPreBookings = onSnapshot(
      query(collection(db, "preBookings"), orderBy("createdAt", "desc")),
      (snap) => {
        setPreBookingsList(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => console.warn("PreBookings snapshot error", err)
    );

    // 4. Users
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        setUsersList(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) })));
      },
      (err) => console.warn("Users snapshot error", err)
    );

    // 5. Market Prices
    const unsubPrices = subscribeMarketPrices((prices) => {
      setPricesList(prices);
    });

    // 6. Retailers & Buyers
    const unsubRetailers = subscribeRetailers((rets) => {
      setRetailersList(rets);
    });

    return () => {
      unsubMachinery();
      unsubRequests();
      unsubPreBookings();
      unsubUsers();
      unsubPrices();
      unsubRetailers();
    };
  }, []);

  // Machinery Handlers
  const handleSaveMachinery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.provider.trim() || !formData.location.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    setActionLoading(true);
    try {
      if (editingItem) {
        await updateDoc(doc(db, "machinery", editingItem.id), {
          ...formData,
          price: Number(formData.price),
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "machinery"), {
          ...formData,
          price: Number(formData.price),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setShowAddModal(false);
      setEditingItem(null);
      resetMachineryForm();
    } catch (err) {
      console.error("Failed to save machinery:", err);
      alert("Error saving machinery.");
    } finally {
      setActionLoading(false);
    }
  };

  const resetMachineryForm = () => {
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

  const handleEditMachinery = (item: MachineryItem) => {
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
      description: item.description || "",
      imageUrl: item.imageUrl || "",
      horsePower: item.horsePower || "",
      fuelType: item.fuelType || "",
      modelYear: item.modelYear || "2024",
      capacity: item.capacity || "",
    });
    setShowAddModal(true);
  };

  const handleStatusChange = async (id: string, status: MachineryStatus) => {
    try {
      await updateDoc(doc(db, "machinery", id), { status, updatedAt: serverTimestamp() });
    } catch (error: any) {
      console.error("[AdminDashboard] Machinery status update failed", {
        code: error?.code,
        message: error?.message || String(error),
        machineryId: id,
        uid: auth.currentUser?.uid || null,
        email: auth.currentUser?.email || null,
      });
      alert("Failed to update machinery status.");
    }
  };

  const handleDeleteMachinery = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name} from the machinery fleet?`)) return;
    try {
      await deleteDoc(doc(db, "machinery", id));
    } catch (error: any) {
      console.error("[AdminDashboard] Machinery deletion failed", {
        code: error?.code,
        message: error?.message || String(error),
        machineryId: id,
        uid: auth.currentUser?.uid || null,
        email: auth.currentUser?.email || null,
      });
      alert("Failed to delete machinery.");
    }
  };

  const handleApproveRequest = async () => {
    if (!confirmApproveReq) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "machineryRequests", confirmApproveReq.id), {
        status: "Approved",
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (confirmApproveReq.machineryId) {
        await updateDoc(doc(db, "machinery", confirmApproveReq.machineryId), {
          status: "Booked",
          updatedAt: serverTimestamp(),
        });
      }
      await createNotification({
        type: "machinery_approved",
        title: "Machinery Request Approved",
        message: `Your request for ${confirmApproveReq.machineryName} on ${confirmApproveReq.requiredDate} has been approved.`,
        targetUserId: confirmApproveReq.farmerId,
        targetUserEmail: confirmApproveReq.farmerEmail,
        payload: { requestId: confirmApproveReq.requestId, machineryName: confirmApproveReq.machineryName, status: "Approved" },
      });
      setConfirmApproveReq(null);
    } catch (error: any) {
      console.error("[AdminDashboard] Machinery request approval failed", {
        code: error?.code,
        message: error?.message || String(error),
        requestId: confirmApproveReq.requestId,
        uid: auth.currentUser?.uid || null,
        email: auth.currentUser?.email || null,
      });
      alert("Failed to approve machinery request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!confirmRejectReq) return;
    setActionLoading(true);

    try {
      await updateDoc(doc(db, "machineryRequests", confirmRejectReq.id), {
        status: "Rejected",
        rejectionReason: rejectionReason.trim() || "Machinery unavailable for selected time window",
        updatedAt: serverTimestamp(),
      });

      await createNotification({
        type: "machinery_rejected",
        title: "Machinery Request Update",
        message: `Your request for ${confirmRejectReq.machineryName} (${confirmRejectReq.requestId}) could not be approved: ${rejectionReason.trim() || "Slot unavailable"
          }`,
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
      console.error("Reject error:", err);
      alert("Failed to reject request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteRequest = async (req: MachineryRequest) => {
    if (!window.confirm(`Mark ${req.requestId} as Completed and return ${req.machineryName} to Available?`)) {
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
        message: `Service for ${req.machineryName} (${req.requestId}) is marked Completed. Fleet returned to active pool.`,
        targetUserId: req.farmerId,
        targetUserEmail: req.farmerEmail,
        payload: {
          requestId: req.requestId,
          status: "Completed",
        },
      });
    } catch (err) {
      console.error("Complete error:", err);
      alert("Error marking completed.");
    }
  };

  // Pre-Booking Approval / Rejection Handlers
  const handleApprovePreBooking = async () => {
    if (!confirmPreBooking) return;

    const booking = confirmPreBooking;
    const user = auth.currentUser;
    const logError = (label: string, error: any) => {
      console.error(label, {
        code: error?.code || "unknown",
        message: error?.message || String(error),
        bookingId: booking.bookingId || booking.id,
        uid: user?.uid || null,
        email: user?.email || null,
      });
    };

    setActionLoading(true);
    try {
      if (!user || !user.email || user.email !== ADMIN_EMAIL) {
        throw Object.assign(new Error("Admin access is restricted to the authorized administrator account."), {
          code: "permission-denied",
        });
      }

      const bookingRef = doc(db, "preBookings", booking.id);
      const approved = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(bookingRef);
        if (!snapshot.exists()) {
          throw Object.assign(new Error("The pre-booking no longer exists."), { code: "not-found" });
        }

        const currentStatus = snapshot.data().status;
        if (currentStatus === "Approved") return false;
        if (currentStatus !== "Pending Admin Approval" && currentStatus !== "Pending") {
          throw Object.assign(new Error(`Cannot approve a booking with status '${currentStatus || "unknown"}'.`), {
            code: "failed-precondition",
          });
        }

        transaction.update(bookingRef, {
          status: "Approved",
          approvedAt: serverTimestamp(),
          approvedBy: user.uid,
          updatedAt: serverTimestamp(),
        });
        return true;
      });

      setConfirmPreBooking(null);
      if (!approved) {
        alert("Booking is already approved.");
        return;
      }

      setSendToRetailerBooking(booking);
      alert("Booking Approved.");

      void (async () => {
        try {
          await updateDoc(bookingRef, {
            emailStatus: "processing",
            reportStatus: "processing",
            updatedAt: serverTimestamp(),
          });

          const ownerSnapshot = await getDoc(doc(db, "users", booking.userId));
          const registeredEmail = ownerSnapshot.exists() ? ownerSnapshot.data().email : null;
          if (!registeredEmail) {
            throw Object.assign(new Error("The booking owner's registered email is unavailable."), {
              code: "owner-email-missing",
            });
          }

          const response = await fetch(`${API_BASE}/api/send-prebooking-report`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...await getFirebaseAuthHeaders() },
            body: JSON.stringify({
              bookingData: {
                bookingId: booking.bookingId,
                userId: booking.userId,
                userName: ownerSnapshot.data().name || booking.userName || "Farmer",
                userEmail: registeredEmail,
                mobileNumber: booking.mobileNumber || "",
                cropName: booking.cropName || "Crop",
                quantity: booking.quantity || 0,
                quantityUnit: booking.quantityUnit || booking.priceUnit || "kg",
                referencePrice: booking.referencePrice || 0,
                estimatedValue: booking.estimatedValue || 0,
                bookingDate: booking.createdAt?.toDate?.().toLocaleDateString?.() || new Date().toLocaleDateString(),
                bookingTime: booking.createdAt?.toDate?.().toLocaleTimeString?.() || new Date().toLocaleTimeString(),
                bookingStatus: "Approved",
                preferredLocation: booking.preferredLocation || "",
                notes: booking.notes || "",
              },
            }),
          });
          const responseData = await response.json().catch(() => ({}));
          if (!response.ok || !responseData.success) {
            throw Object.assign(new Error(responseData.error || `Report service returned HTTP ${response.status}.`), {
              code: `report/http-${response.status}`,
            });
          }

          await setDoc(doc(db, "reports", `prebooking-${booking.bookingId}`), {
            userId: booking.userId,
            bookingId: booking.bookingId,
            type: "Pre-Booking",
            status: "Approved",
            reportName: `AgriNex_PreBooking_${booking.bookingId}.pdf`,
            reportUrl: "",
            reportStatus: "sent",
            emailRecipient: registeredEmail,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });

          await updateDoc(bookingRef, {
            emailStatus: "sent",
            reportStatus: "generated",
            emailSentAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (error: any) {
          logError("[AdminDashboard] Approved booking report/email failed", error);
          try {
            await updateDoc(bookingRef, {
              emailStatus: "failed",
              reportStatus: "failed",
              emailError: error?.message || "Report generation or email delivery failed.",
              updatedAt: serverTimestamp(),
            });
          } catch (statusError: any) {
            logError("[AdminDashboard] Could not save report failure status", statusError);
          }
        }
      })();

      void createNotification({
        type: "booking_confirmed",
        title: "Pre-Booking Approved & Confirmed! 🎉",
        message: `Your pre-booking for ${booking.cropName} (${booking.quantity} ${booking.quantityUnit || "kg"}) has been approved and confirmed.`,
        targetUserId: booking.userId,
        targetUserEmail: booking.userEmail,
        recipientName: booking.userName || "Farmer",
        payload: {
          bookingId: booking.bookingId,
          cropName: booking.cropName,
          quantity: booking.quantity,
          unit: booking.quantityUnit || "kg",
          status: "Approved",
        },
      }).catch((error) => logError("[AdminDashboard] Approval notification failed", error));
    } catch (error: any) {
      logError("[AdminDashboard] Pre-booking approval failed", error);
      if (error?.code === "failed-precondition" && error?.message?.includes("already approved")) {
        alert("Booking is already approved.");
      } else {
        const detail = error?.code ? ` (${error.code})` : "";
        alert(`Approval failed. Please check Firebase configuration or permissions.${detail}`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPreBooking = async () => {
    if (!confirmRejectPreBooking) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "preBookings", confirmRejectPreBooking.id), {
        status: "Rejected",
        rejectionReason: preBookingRejectionReason.trim() || "Quantity/schedule specifications could not be verified.",
        updatedAt: serverTimestamp(),
      });

      await createNotification({
        type: "booking_status",
        title: "Pre-Booking Status Update",
        message: `Your pre-booking for ${confirmRejectPreBooking.cropName} (${confirmRejectPreBooking.bookingId}) was not approved: ${preBookingRejectionReason.trim() || "Requirements not met."
          }`,
        targetUserId: confirmRejectPreBooking.userId,
        targetUserEmail: confirmRejectPreBooking.userEmail,
        payload: {
          bookingId: confirmRejectPreBooking.bookingId,
          status: "Rejected",
        },
      });

      setConfirmRejectPreBooking(null);
      setPreBookingRejectionReason("");
    } catch (err) {
      console.error("Pre-booking reject error:", err);
      alert("Failed to reject booking.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePreBookingStatusChange = async (bk: any, newStatus: string) => {
    if (!newStatus || newStatus === bk.status) return;
    const currentAdmin = auth.currentUser;
    try {
      await updateDoc(doc(db, "preBookings", bk.id), {
        status: newStatus,
        previousStatus: bk.status || "Pending Admin Approval",
        updatedAt: serverTimestamp(),
        updatedBy: currentAdmin?.uid || "admin",
        updatedByEmail: currentAdmin?.email || "sudharsan9001@gmail.com",
      });

      await createNotification({
        type: "booking_status",
        title: `Pre-Booking Status: ${newStatus}`,
        message: `Your pre-booking for ${bk.cropName} (${bk.bookingId}) has been updated to "${newStatus}".`,
        targetUserId: bk.userId,
        targetUserEmail: bk.userEmail,
        recipientName: bk.userName || "Farmer",
        payload: {
          bookingId: bk.bookingId,
          cropName: bk.cropName,
          status: newStatus,
          previousStatus: bk.status,
          updatedAt: new Date().toISOString(),
        },
      });

      if (newStatus === "Approved") {
        await setDoc(
          doc(db, "reports", `prebooking-${bk.bookingId}`),
          {
            userId: bk.userId,
            bookingId: bk.bookingId,
            type: "Pre-Booking",
            status: "Approved",
            cropName: bk.cropName,
            quantity: bk.quantity,
            unit: bk.quantityUnit || bk.priceUnit || "kg",
            referencePrice: bk.referencePrice,
            estimatedValue: bk.estimatedValue,
            reportName: `AgriNex_PreBooking_${bk.bookingId}.pdf`,
            emailRecipient: bk.userEmail || "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        fetch(`${API_BASE}/api/send-prebooking-report`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...await getFirebaseAuthHeaders() },
          body: JSON.stringify({
            bookingData: {
              ...bk,
              bookingStatus: "Approved",
              status: "Approved",
              bookingDate: bk.createdAt?.toDate?.().toLocaleDateString?.() || new Date().toLocaleDateString(),
              bookingTime: bk.createdAt?.toDate?.().toLocaleTimeString?.() || new Date().toLocaleTimeString(),
            },
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.success) {
              updateDoc(doc(db, "preBookings", bk.id), {
                emailStatus: "sent",
                reportStatus: "generated",
                emailSentAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              }).catch(() => { });
              updateDoc(doc(db, "reports", `prebooking-${bk.bookingId}`), {
                reportStatus: "sent",
                updatedAt: serverTimestamp(),
              }).catch(() => { });
            } else {
              updateDoc(doc(db, "preBookings", bk.id), {
                emailStatus: "failed",
                reportStatus: "failed",
                emailError: data?.error || "Email delivery failed",
                updatedAt: serverTimestamp(),
              }).catch(() => { });
              updateDoc(doc(db, "reports", `prebooking-${bk.bookingId}`), {
                reportStatus: "failed",
                updatedAt: serverTimestamp(),
              }).catch(() => { });
            }
          })
          .catch((err) => {
            console.warn("[AdminDashboard] User report email dispatch error:", err);
            updateDoc(doc(db, "preBookings", bk.id), {
              emailStatus: "failed",
              reportStatus: "failed",
              emailError: err.message,
              updatedAt: serverTimestamp(),
            }).catch(() => { });
          });
      }
    } catch (err) {
      console.error("Failed to update pre-booking status:", err);
      alert("Error updating status.");
    }
  };

  // Send Approved Pre-Booking to Retailer / Buyer
  const handleSendToRetailer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendToRetailerBooking) return;

    const targetEmail = (customRetailerEmail || selectedRetailerEmail).trim();
    if (!targetEmail) {
      alert("Please select a registered retailer or enter a recipient email.");
      return;
    }

    setActionLoading(true);
    setEmailStatusMsg(null);

    try {
      const response = await fetch(`${API_BASE}/api/send-prebooking-retailer-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...await getFirebaseAuthHeaders() },
        body: JSON.stringify({
          bookingData: sendToRetailerBooking,
          retailerEmail: targetEmail,
          retailerName: selectedRetailerName || "Retailer Partner",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        setEmailStatusMsg({
          text: `Failed to deliver email: ${data.error || "Email delivery failed"}. The booking remains approved in Firestore.`,
          isError: true,
        });
      } else {
        setEmailStatusMsg({
          text: `Report and PDF successfully sent to ${targetEmail}!`,
          isError: false,
        });
        setTimeout(() => {
          setSendToRetailerBooking(null);
          setSelectedRetailerEmail("");
          setCustomRetailerEmail("");
          setSelectedRetailerName("");
          setEmailStatusMsg(null);
        }, 2000);
      }
    } catch (err: any) {
      setEmailStatusMsg({
        text: `Network error sending email: ${err.message}. Record is preserved.`,
        isError: true,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Price Management Handlers
  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceFormData.commodity.trim() || priceFormData.modal <= 0) {
      alert("Please enter a valid crop name and reference price.");
      return;
    }

    setActionLoading(true);
    try {
      const id = priceFormData.id || priceFormData.commodity.toLowerCase().replace(/\s+/g, "-");
      await updateCropPrice(id, {
        commodity: priceFormData.commodity,
        min: Number(priceFormData.min),
        max: Number(priceFormData.max),
        modal: Number(priceFormData.modal),
        unit: priceFormData.unit,
      });

      setEditingPrice(null);
      setShowAddPriceModal(false);
    } catch (err) {
      console.error("Error updating price:", err);
      alert("Failed to update crop price.");
    } finally {
      setActionLoading(false);
    }
  };

  const openPriceEdit = (p: CropPriceItem) => {
    setPriceFormData({
      id: p.id,
      commodity: p.commodity,
      min: p.min,
      max: p.max,
      modal: p.modal,
      unit: p.unit,
    });
    setEditingPrice(p);
  };

  // Retailer Management Handlers
  const handleSaveRetailer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retailerFormData.businessName.trim() || !retailerFormData.email.trim()) {
      alert("Business Name and Email are required.");
      return;
    }

    setActionLoading(true);
    try {
      const categoriesArray = retailerFormData.categories
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      if (editingRetailer) {
        await updateRetailer(editingRetailer.id, {
          name: retailerFormData.name,
          businessName: retailerFormData.businessName,
          email: retailerFormData.email,
          phone: retailerFormData.phone,
          location: retailerFormData.location,
          categories: categoriesArray,
          preferredCrops: retailerFormData.preferredCrops,
          status: retailerFormData.status,
          notes: retailerFormData.notes,
        });
      } else {
        await addRetailer({
          name: retailerFormData.name,
          businessName: retailerFormData.businessName,
          email: retailerFormData.email,
          phone: retailerFormData.phone,
          location: retailerFormData.location,
          categories: categoriesArray,
          preferredCrops: retailerFormData.preferredCrops,
          status: retailerFormData.status,
          notes: retailerFormData.notes,
        });
      }

      setShowRetailerModal(false);
      setEditingRetailer(null);
      setRetailerFormData({
        name: "",
        businessName: "",
        email: "",
        phone: "",
        location: "",
        categories: "",
        preferredCrops: "",
        status: "Active",
        notes: "",
      });
    } catch (err) {
      console.error("Error saving retailer:", err);
      alert("Failed to save retailer.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleRetailerStatus = async (ret: RetailerItem) => {
    const nextStatus = ret.status === "Active" ? "Inactive" : "Active";
    try {
      await updateRetailer(ret.id, { status: nextStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRetailerItem = async (id: string, name: string) => {
    if (!window.confirm(`Delete retailer partner "${name}"?`)) return;
    try {
      await deleteRetailer(id);
    } catch (err) {
      console.error(err);
    }
  };

  // User Role Management
  const handleToggleUserRole = async (targetUid: string, currentRole: string) => {
    const newRole = currentRole === "buyer" || currentRole === "retailer" ? "farmer" : "buyer";
    if (!window.confirm(`Change role of user ${targetUid} to "${newRole}"?`)) return;

    try {
      await updateDoc(doc(db, "users", targetUid), {
        role: newRole,
        isAdmin: false,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Role update failed:", err);
      alert("Failed to update user role.");
    }
  };

  // Check overlap for a given machinery request against other approved requests.
  const hasOverlapConflict = (req: MachineryRequest) => {
    if (!req?.machineryId || !req?.requiredDate) return false;

    return requestsList.some((other) => {
      if (other.id === req.id) return false;
      if (other.machineryId !== req.machineryId) return false;
      if (other.requiredDate !== req.requiredDate) return false;
      return other.status === "Approved" || other.status === "Booked";
    });
  };

  // Metrics Calculations
  const totalFleet = machineryList.length;
  const availableCount = machineryList.filter((m) => m.status === "Available").length;
  const bookedCount = machineryList.filter((m) => m.status === "Booked").length;
  const maintenanceCount = machineryList.filter((m) => m.status === "Maintenance").length;
  const pendingRequestsCount = requestsList.filter((r) => r.status === "Pending Approval").length;
  const approvedRequestsCount = requestsList.filter((r) => r.status === "Approved" || r.status === "Booked").length;

  const totalPreBookings = preBookingsList.length;
  const pendingPreBookingsCount = preBookingsList.filter((bk) => {
    const s = String(bk.status || "");
    return s === "Pending" || s === "Pending Admin Approval";
  }).length;
  const approvedPreBookingsCount = preBookingsList.filter((bk) => bk.status === "Approved").length;

  const totalFarmers = usersList.filter((u) => u.email !== ADMIN_EMAIL && u.role !== "buyer" && u.role !== "retailer").length;
  const activeRetailersCount = retailersList.filter((r) => r.status === "Active").length;

  // Filtered lists
  const filteredRequests = requestsList.filter((req) => {
    const matchesFilter = requestFilter === "All" || req.status === requestFilter;
    const matchesSearch =
      req.requestId.toLowerCase().includes(requestSearch.toLowerCase()) ||
      req.farmerName.toLowerCase().includes(requestSearch.toLowerCase()) ||
      req.machineryName.toLowerCase().includes(requestSearch.toLowerCase()) ||
      req.farmLocation.toLowerCase().includes(requestSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredPreBookings = preBookingsList.filter((bk) => {
    const status = bk.status || "Pending Admin Approval";
    const matchesFilter =
      preBookingFilter === "All" ||
      (preBookingFilter === "Pending" && (status === "Pending" || status === "Pending Admin Approval")) ||
      status === preBookingFilter;

    const matchesSearch =
      (bk.bookingId || "").toLowerCase().includes(preBookingSearch.toLowerCase()) ||
      (bk.cropName || "").toLowerCase().includes(preBookingSearch.toLowerCase()) ||
      (bk.userName || "").toLowerCase().includes(preBookingSearch.toLowerCase()) ||
      (bk.userEmail || "").toLowerCase().includes(preBookingSearch.toLowerCase()) ||
      (bk.preferredLocation || "").toLowerCase().includes(preBookingSearch.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const filteredInventory = machineryList.filter(
    (m) =>
      m.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      m.type.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      m.location.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      m.provider.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  const filteredPrices = pricesList.filter((p) =>
    p.commodity.toLowerCase().includes(priceSearch.toLowerCase())
  );

  const filteredRetailers = retailersList.filter(
    (r) =>
      r.businessName.toLowerCase().includes(retailerSearch.toLowerCase()) ||
      r.name.toLowerCase().includes(retailerSearch.toLowerCase()) ||
      r.email.toLowerCase().includes(retailerSearch.toLowerCase()) ||
      r.location.toLowerCase().includes(retailerSearch.toLowerCase())
  );

  const filteredUsers = usersList.filter(
    (u) =>
      (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.role || "").toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="p-6 pb-24 min-h-screen bg-[#F0F7F4] text-[#1B4332]">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <BackButton />
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/user-dashboard")}
            className="text-xs font-bold text-[#2D6A4F] bg-white px-3.5 py-1.5 rounded-full border border-gray-100 hover:bg-[#E8F5E9] transition-colors flex items-center gap-1 shadow-sm"
          >
            ← User Dashboard
          </button>
          <button
            onClick={async () => {
              await signOut(auth);
              navigate("/admin-login", { replace: true });
            }}
            className="text-xs font-bold text-rose-700 bg-rose-50 px-3.5 py-1.5 rounded-full border border-rose-200 hover:bg-rose-100 transition-colors flex items-center gap-1 shadow-sm"
          >
            <LogOut size={13} /> Admin Logout
          </button>
          <NotificationBell />
        </div>
      </div>

      {/* Admin Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 bg-[#1B4332] text-white px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-1 shadow-sm">
          <Shield size={12} className="text-emerald-400" /> AgriNex Administrator Command Hub
        </div>
        <h1 className="text-2xl font-black text-[#1B4332]">Admin Control Center</h1>
        <p className="text-xs text-[#2D6A4F] font-semibold">
          Manage machinery fleet, approve pre-bookings, configure crop prices, coordinate buyers, and oversee users.
        </p>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-white p-1.5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-1 overflow-x-auto mb-6 no-scrollbar text-xs font-bold">
        <button
          onClick={() => setActiveSection("overview")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl whitespace-nowrap transition-all ${activeSection === "overview" ? "bg-[#2D6A4F] text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
            }`}
        >
          <LayoutDashboard size={14} /> Overview
        </button>

        <button
          onClick={() => setActiveSection("prebookings")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl whitespace-nowrap transition-all ${activeSection === "prebookings" ? "bg-[#2D6A4F] text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
            }`}
        >
          <Package size={14} /> Pre-Bookings
          {pendingPreBookingsCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-400 text-amber-950 rounded-full text-[10px] font-black">
              {pendingPreBookingsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSection("requests")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl whitespace-nowrap transition-all ${activeSection === "requests" ? "bg-[#2D6A4F] text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
            }`}
        >
          <ClipboardList size={14} /> Machinery Requests
          {pendingRequestsCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-400 text-amber-950 rounded-full text-[10px] font-black">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSection("prices")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl whitespace-nowrap transition-all ${activeSection === "prices" ? "bg-[#2D6A4F] text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
            }`}
        >
          <DollarSign size={14} /> Price Management
        </button>

        <button
          onClick={() => setActiveSection("retailers")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl whitespace-nowrap transition-all ${activeSection === "retailers" ? "bg-[#2D6A4F] text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
            }`}
        >
          <Store size={14} /> Retailers & Buyers ({retailersList.length})
        </button>

        <button
          onClick={() => setActiveSection("machinery")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl whitespace-nowrap transition-all ${activeSection === "machinery" ? "bg-[#2D6A4F] text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
            }`}
        >
          <Wrench size={14} /> Machinery Fleet ({totalFleet})
        </button>

        <button
          onClick={() => setActiveSection("users")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl whitespace-nowrap transition-all ${activeSection === "users" ? "bg-[#2D6A4F] text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
            }`}
        >
          <Users size={14} /> Users ({usersList.length})
        </button>

        <button
          onClick={() => setActiveSection("reports")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl whitespace-nowrap transition-all ${activeSection === "reports" ? "bg-[#2D6A4F] text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
            }`}
        >
          <FileSpreadsheet size={14} /> Reports
        </button>
      </div>

      {/* ================= 1. OVERVIEW SECTION ================= */}
      {activeSection === "overview" && (
        <div className="space-y-6">
          {/* Main KPI Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-gray-400">Total Users</span>
              <p className="text-2xl font-black text-[#1B4332] mt-1">{usersList.length}</p>
              <span className="text-[10px] text-[#2D6A4F] font-bold">{totalFarmers} Farmers Registered</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-gray-400">Pre-Bookings</span>
              <p className="text-2xl font-black text-purple-700 mt-1">{totalPreBookings}</p>
              <span className="text-[10px] text-purple-800 font-bold">{pendingPreBookingsCount} Pending Approvals</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-gray-400">Machinery Fleet</span>
              <p className="text-2xl font-black text-[#2D6A4F] mt-1">{totalFleet}</p>
              <span className="text-[10px] text-gray-500 font-bold">{availableCount} Available • {bookedCount} Booked</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-gray-400">Retailers / Buyers</span>
              <p className="text-2xl font-black text-blue-700 mt-1">{retailersList.length}</p>
              <span className="text-[10px] text-blue-800 font-bold">{activeRetailersCount} Active Procurement Partners</span>
            </div>
          </div>

          {/* Quick Action Widgets */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Pending Pre-Bookings */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-[#1B4332] text-sm flex items-center gap-2">
                  <Package size={16} className="text-purple-600" /> Harvest Pre-Bookings ({pendingPreBookingsCount} Pending)
                </h3>
                <button
                  onClick={() => setActiveSection("prebookings")}
                  className="text-xs font-bold text-[#2D6A4F] hover:underline"
                >
                  Manage All →
                </button>
              </div>

              {pendingPreBookingsCount === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No pre-bookings awaiting approval.</p>
              ) : (
                <div className="space-y-2">
                  {preBookingsList
                    .filter((bk) => (bk.status || "Pending").includes("Pending"))
                    .slice(0, 3)
                    .map((bk) => (
                      <div
                        key={bk.id}
                        className="bg-[#F0F7F4] p-3 rounded-2xl border border-[#D8F3DC] flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-[#1B4332]">🌾 {bk.cropName}</span>
                          <span className="text-gray-500"> • {bk.quantity} {bk.quantityUnit || "kg"}</span>
                          <p className="text-[10px] text-gray-400">{bk.userName || bk.userEmail} • {bk.bookingId}</p>
                        </div>
                        <button
                          onClick={() => {
                            setActiveSection("prebookings");
                            setPreBookingFilter("Pending");
                          }}
                          className="px-3 py-1 bg-[#2D6A4F] text-white rounded-full font-bold text-[11px]"
                        >
                          Review
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Pending Machinery Requests */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-[#1B4332] text-sm flex items-center gap-2">
                  <ClipboardList size={16} className="text-[#2D6A4F]" /> Machinery Requests ({pendingRequestsCount} Pending)
                </h3>
                <button
                  onClick={() => setActiveSection("requests")}
                  className="text-xs font-bold text-[#2D6A4F] hover:underline"
                >
                  Manage All →
                </button>
              </div>

              {pendingRequestsCount === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No machinery requests awaiting review.</p>
              ) : (
                <div className="space-y-2">
                  {requestsList
                    .filter((r) => r.status === "Pending Approval")
                    .slice(0, 3)
                    .map((req) => (
                      <div
                        key={req.id}
                        className="bg-[#F0F7F4] p-3 rounded-2xl border border-[#D8F3DC] flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-[#1B4332]">{req.farmerName}</span>
                          <span className="text-gray-500"> requested <strong>{req.machineryName}</strong></span>
                          <p className="text-[10px] text-gray-400">{req.requiredDate} • {req.farmLocation}</p>
                        </div>
                        <button
                          onClick={() => {
                            setActiveSection("requests");
                            setRequestFilter("Pending Approval");
                          }}
                          className="px-3 py-1 bg-[#2D6A4F] text-white rounded-full font-bold text-[11px]"
                        >
                          Review
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= 2. PRE-BOOKING MANAGEMENT ================= */}
      {activeSection === "prebookings" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ID, crop, farmer name, location..."
                value={preBookingSearch}
                onChange={(e) => setPreBookingSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#2D6A4F]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
              {["All", "Pending", "Approved", "Rejected"].map((st) => (
                <button
                  key={st}
                  onClick={() => setPreBookingFilter(st)}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${preBookingFilter === st ? "bg-[#2D6A4F] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {filteredPreBookings.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center shadow-sm">
              <Package size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="font-bold text-gray-600 text-sm">No pre-bookings match your search or filter.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredPreBookings.map((bk) => {
                const status = bk.status || "Pending Admin Approval";
                const isPending = status === "Pending" || status === "Pending Admin Approval";
                const isApproved = status === "Approved";

                return (
                  <div key={bk.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base text-[#1B4332]">🌾 {bk.cropName}</span>
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold">
                            {bk.bookingId}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-semibold mt-0.5">
                          Farmer: <strong className="text-[#1B4332]">{bk.userName || "Farmer"}</strong> • {bk.userEmail} {bk.mobileNumber ? `• ${bk.mobileNumber}` : ""}
                        </p>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${isApproved
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : status === "Rejected"
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-[#F0F7F4] p-3 rounded-2xl border border-[#D8F3DC]">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400">Reserved Quantity</span>
                        <p className="font-black text-[#1B4332] mt-0.5">
                          {bk.quantity} {bk.quantityUnit || bk.priceUnit || "kg"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400">Benchmark Price</span>
                        <p className="font-bold text-[#2D6A4F] mt-0.5">
                          ₹{bk.referencePrice} / {bk.priceUnit || bk.quantityUnit || "kg"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400">Estimated Value</span>
                        <p className="font-black text-[#1B4332] mt-0.5">
                          ₹{(bk.estimatedValue || Number(bk.quantity) * Number(bk.referencePrice) || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400">Location</span>
                        <p className="font-bold text-[#1B4332] mt-0.5 truncate flex items-center gap-1">
                          <MapPin size={12} className="text-[#2D6A4F]" /> {bk.preferredLocation || "Tamil Nadu"}
                        </p>
                      </div>
                    </div>

                    {bk.notes && (
                      <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <strong>Farmer Notes:</strong> {bk.notes}
                      </p>
                    )}

                    <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-500 font-bold">Admin Status Control:</span>
                        <select
                          value={status}
                          onChange={(e) => handlePreBookingStatusChange(bk, e.target.value)}
                          className="text-xs font-bold px-2.5 py-1 rounded-xl bg-gray-50 border border-gray-200 text-[#1B4332] focus:outline-none focus:border-[#2D6A4F]"
                        >
                          <option value="Pending Admin Approval">🟡 Pending Admin Approval</option>
                          <option value="Approved">🟢 Approved</option>
                          <option value="In Progress">🔵 In Progress</option>
                          <option value="Ready for Delivery">🟣 Ready for Delivery</option>
                          <option value="Completed">✅ Completed</option>
                          <option value="Rejected">🔴 Rejected</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPending && (
                          <>
                            <button
                              onClick={() => setConfirmRejectPreBooking(bk)}
                              className="px-3.5 py-1.5 rounded-full font-bold text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => setConfirmPreBooking(bk)}
                              className="px-4 py-1.5 rounded-full font-black text-xs text-white bg-[#2D6A4F] hover:bg-[#1B4332] transition-colors shadow-sm"
                            >
                              Approve Booking
                            </button>
                          </>
                        )}

                        {status !== "Rejected" && (
                          <button
                            onClick={() => {
                              setSendToRetailerBooking(bk);
                              setEmailStatusMsg(null);
                            }}
                            className="px-3.5 py-1.5 rounded-full font-bold text-xs text-[#2D6A4F] bg-[#E8F5E9] hover:bg-[#C8E6C9] border border-[#A5D6A7] transition-colors flex items-center gap-1.5"
                          >
                            <Send size={13} /> Send to Retailer / Buyer
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

      {/* ================= 3. PRICE MANAGEMENT ================= */}
      {activeSection === "prices" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search crops / commodities..."
                value={priceSearch}
                onChange={(e) => setPriceSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#2D6A4F]"
              />
            </div>

            <button
              onClick={() => {
                setPriceFormData({
                  id: "",
                  commodity: "",
                  min: 0,
                  max: 0,
                  modal: 0,
                  unit: "₹ / Quintal",
                });
                setShowAddPriceModal(true);
              }}
              className="flex items-center gap-1.5 bg-[#2D6A4F] hover:bg-[#1B4332] text-white px-4 py-2.5 rounded-full font-black text-xs shadow-sm transition-all"
            >
              <Plus size={15} /> Add Crop Price
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPrices.map((p) => (
              <div
                key={p.id}
                className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-black text-[#1B4332]">🌾 {p.commodity}</span>
                    <button
                      onClick={() => openPriceEdit(p)}
                      className="p-1.5 text-gray-500 hover:text-[#2D6A4F] hover:bg-gray-100 rounded-xl transition-colors"
                      title="Edit Price"
                    >
                      <Edit2 size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 bg-[#F0F7F4] p-2.5 rounded-2xl border border-[#D8F3DC] text-center mb-2">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Min</span>
                      <span className="font-bold text-[#1B4332] text-xs">₹{p.min}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Modal</span>
                      <span className="font-black text-[#2D6A4F] text-xs">₹{p.modal}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Max</span>
                      <span className="font-bold text-[#1B4332] text-xs">₹{p.max}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-bold">
                  <span>Unit: {p.unit}</span>
                  <span className="text-emerald-700">Live in User App</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= 4. RETAILER & BUYER MANAGEMENT ================= */}
      {activeSection === "retailers" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search retailers by company, contact person, city..."
                value={retailerSearch}
                onChange={(e) => setRetailerSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#2D6A4F]"
              />
            </div>

            <button
              onClick={() => {
                setEditingRetailer(null);
                setRetailerFormData({
                  name: "",
                  businessName: "",
                  email: "",
                  phone: "",
                  location: "",
                  categories: "",
                  preferredCrops: "",
                  status: "Active",
                  notes: "",
                });
                setShowRetailerModal(true);
              }}
              className="flex items-center gap-1.5 bg-[#2D6A4F] hover:bg-[#1B4332] text-white px-4 py-2.5 rounded-full font-black text-xs shadow-sm transition-all"
            >
              <Plus size={15} /> Add Retailer / Buyer
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRetailers.map((ret) => (
              <div
                key={ret.id}
                className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-black text-[#1B4332] leading-tight flex items-center gap-1.5">
                      <Building size={16} className="text-[#2D6A4F]" /> {ret.businessName}
                    </span>
                    <button
                      onClick={() => handleToggleRetailerStatus(ret)}
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${ret.status === "Active"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                    >
                      {ret.status}
                    </button>
                  </div>

                  <p className="text-xs text-gray-600 font-semibold mb-1">Contact: {ret.name}</p>

                  <div className="space-y-1 text-xs text-gray-500 font-semibold">
                    <p className="flex items-center gap-1.5">
                      <Mail size={12} className="text-[#2D6A4F]" /> {ret.email}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone size={12} className="text-[#2D6A4F]" /> {ret.phone}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-[#2D6A4F]" /> {ret.location}
                    </p>
                  </div>

                  {ret.preferredCrops && (
                    <div className="mt-2 text-[11px] bg-[#F0F7F4] p-2 rounded-xl border border-[#D8F3DC] text-[#1B4332] font-semibold">
                      🌾 Target Crops: {ret.preferredCrops}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-gray-400 font-semibold">Procurement Partner</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingRetailer(ret);
                        setRetailerFormData({
                          name: ret.name,
                          businessName: ret.businessName,
                          email: ret.email,
                          phone: ret.phone,
                          location: ret.location,
                          categories: (ret.categories || []).join(", "),
                          preferredCrops: ret.preferredCrops || "",
                          status: ret.status,
                          notes: ret.notes || "",
                        });
                        setShowRetailerModal(true);
                      }}
                      className="p-2 text-gray-600 hover:text-[#2D6A4F] hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteRetailerItem(ret.id, ret.businessName)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
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

      {/* ================= 5. MACHINERY FLEET MANAGEMENT ================= */}
      {activeSection === "machinery" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search fleet by name, provider, location..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#2D6A4F]"
              />
            </div>

            <button
              onClick={() => {
                setEditingItem(null);
                resetMachineryForm();
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 bg-[#2D6A4F] hover:bg-[#1B4332] text-white px-4 py-2.5 rounded-full font-black text-xs shadow-sm transition-all"
            >
              <Plus size={15} /> Add Machinery
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredInventory.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-3 hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#2D6A4F]">
                      {item.type}
                    </span>
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value as MachineryStatus)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${item.status === "Available"
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
                      onClick={() => handleEditMachinery(item)}
                      className="p-2 text-gray-600 hover:text-[#2D6A4F] hover:bg-gray-100 rounded-xl"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteMachinery(item.id, item.name)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl"
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

      {/* ================= 6. MACHINERY REQUESTS MANAGEMENT ================= */}
      {activeSection === "requests" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
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
              {["All", "Pending Approval", "Approved", "Booked", "Completed", "Rejected"].map((st) => (
                <button
                  key={st}
                  onClick={() => setRequestFilter(st)}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${requestFilter === st ? "bg-[#2D6A4F] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center shadow-sm">
              <ClipboardList size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="font-bold text-gray-600 text-sm">No machinery requests match your filter.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredRequests.map((req) => {
                const conflict = hasOverlapConflict(req);

                return (
                  <div key={req.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
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
                            <AlertTriangle size={12} /> Schedule Overlap
                          </span>
                        )}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${req.status === "Approved" || req.status === "Booked"
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

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500 font-bold">
                        Provider: <strong>{req.provider}</strong> • ₹{req.price}/{req.rateUnit}
                      </span>

                      <div className="flex items-center gap-2">
                        {req.status === "Pending Approval" && (
                          <>
                            <button
                              onClick={() => setConfirmRejectReq(req)}
                              className="px-3.5 py-1.5 rounded-full font-bold text-xs text-rose-700 bg-rose-50 hover:bg-rose-100"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => setConfirmApproveReq(req)}
                              className="px-4 py-1.5 rounded-full font-black text-xs text-white bg-[#2D6A4F] hover:bg-[#1B4332]"
                            >
                              Approve Request
                            </button>
                          </>
                        )}

                        {(req.status === "Approved" || req.status === "Booked") && (
                          <button
                            onClick={() => handleCompleteRequest(req)}
                            className="px-4 py-1.5 rounded-full font-bold text-xs text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200"
                          >
                            Mark Completed & Release
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

      {/* ================= 7. USER MANAGEMENT ================= */}
      {activeSection === "users" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email, role..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#2D6A4F]"
              />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <h3 className="font-black text-base text-[#1B4332] mb-1">Registered Platform Users</h3>
            <p className="text-xs text-gray-500 mb-4">
              Authorized view of user profiles. Sensitive authentication credentials and passwords are strictly protected by Firebase Auth.
            </p>

            <div className="space-y-3">
              {filteredUsers.map((u) => (
                <div
                  key={u.uid}
                  className="p-4 bg-[#F0F7F4] rounded-2xl border border-[#D8F3DC] flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-bold text-[#1B4332] text-sm">{u.name || "AgriNex User"}</span>
                    <p className="text-gray-500 font-mono mt-0.5">{u.email}</p>
                    <p className="text-[10px] text-gray-400 font-mono">UID: {u.uid}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${isAdminUserEmail(u.email)
                        ? "bg-amber-200 text-amber-950 font-black"
                        : u.role === "buyer" || u.role === "retailer"
                          ? "bg-blue-100 text-blue-900"
                          : "bg-white text-[#2D6A4F] border border-[#A5D6A7]"
                        }`}
                    >
                      {isAdminUserEmail(u.email) ? "🛡️ Administrator" : u.role === "buyer" || u.role === "retailer" ? "🛒 Buyer" : "🌾 Farmer"}
                    </span>

                    {u.email !== ADMIN_EMAIL && (
                      <button
                        onClick={() => handleToggleUserRole(u.uid, u.role || "farmer")}
                        className="text-xs font-bold text-[#2D6A4F] bg-white hover:bg-[#E8F5E9] px-3 py-1.5 rounded-xl border border-gray-200 transition-colors"
                      >
                        {u.role === "buyer" || u.role === "retailer" ? "Change to Farmer" : "Change to Buyer"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= 8. REPORTS & PDF EXPORTS ================= */}
      {activeSection === "reports" && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-[#1B4332] text-lg">Export AgriNex Operational Summary</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Generate printable PDF reports detailing machinery inventory, active schedules, and farmer harvest pre-bookings.
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-[#2D6A4F] hover:bg-[#1B4332] text-white px-6 py-3 rounded-full font-black text-xs shadow-md transition-all"
            >
              <Download size={16} /> Print / Export Dashboard Report
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT MACHINERY ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 my-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-[#1B4332]">
                {editingItem ? "Edit Machinery Equipment" : "Add New Machinery"}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
              >
                ✕
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
                  <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Type *</label>
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
                  <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Provider *</label>
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
                  <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Location *</label>
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
                  {actionLoading ? "Saving..." : "Save Equipment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT CROP PRICE ================= */}
      {(editingPrice || showAddPriceModal) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-black text-[#1B4332] mb-1">
              {editingPrice ? `Edit ${editingPrice.commodity} Price` : "Add Crop Price"}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Changes will update live across the Farmer Marketplace and User Dashboards.
            </p>

            <form onSubmit={handleSavePrice} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Crop / Commodity *</label>
                <input
                  type="text"
                  required
                  value={priceFormData.commodity}
                  onChange={(e) => setPriceFormData({ ...priceFormData, commodity: e.target.value })}
                  placeholder="e.g. Paddy"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Min (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={priceFormData.min}
                    onChange={(e) => setPriceFormData({ ...priceFormData, min: Number(e.target.value) })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Modal (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={priceFormData.modal}
                    onChange={(e) => setPriceFormData({ ...priceFormData, modal: Number(e.target.value) })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-black text-[#2D6A4F]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Max (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={priceFormData.max}
                    onChange={(e) => setPriceFormData({ ...priceFormData, max: Number(e.target.value) })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Unit</label>
                <input
                  type="text"
                  required
                  value={priceFormData.unit}
                  onChange={(e) => setPriceFormData({ ...priceFormData, unit: e.target.value })}
                  placeholder="e.g. ₹ / Quintal or ₹ / Kg"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPrice(null);
                    setShowAddPriceModal(false);
                  }}
                  className="flex-1 py-2.5 rounded-full font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-full font-black text-white bg-[#2D6A4F] hover:bg-[#1B4332]"
                >
                  {actionLoading ? "Updating..." : "Save Price"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT RETAILER ================= */}
      {showRetailerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-black text-[#1B4332] mb-1">
              {editingRetailer ? "Edit Retailer / Buyer Details" : "Add Retailer / Buyer"}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Registered procurement partners who receive approved crop pre-booking contracts.
            </p>

            <form onSubmit={handleSaveRetailer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={retailerFormData.businessName}
                  onChange={(e) => setRetailerFormData({ ...retailerFormData, businessName: e.target.value })}
                  placeholder="e.g. Kaveri Organics Wholesale Corp"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={retailerFormData.name}
                    onChange={(e) => setRetailerFormData({ ...retailerFormData, name: e.target.value })}
                    placeholder="e.g. R. Sundaram"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={retailerFormData.phone}
                    onChange={(e) => setRetailerFormData({ ...retailerFormData, phone: e.target.value })}
                    placeholder="+91 98421 00000"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Procurement Email *</label>
                <input
                  type="email"
                  required
                  value={retailerFormData.email}
                  onChange={(e) => setRetailerFormData({ ...retailerFormData, email: e.target.value })}
                  placeholder="procurement@kaveriagro.com"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Location</label>
                  <input
                    type="text"
                    value={retailerFormData.location}
                    onChange={(e) => setRetailerFormData({ ...retailerFormData, location: e.target.value })}
                    placeholder="e.g. Tiruchirappalli, TN"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Status</label>
                  <select
                    value={retailerFormData.status}
                    onChange={(e) => setRetailerFormData({ ...retailerFormData, status: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Preferred Crops</label>
                <input
                  type="text"
                  value={retailerFormData.preferredCrops}
                  onChange={(e) => setRetailerFormData({ ...retailerFormData, preferredCrops: e.target.value })}
                  placeholder="e.g. Paddy, Groundnut, Tomato"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRetailerModal(false)}
                  className="flex-1 py-2.5 rounded-full font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-full font-black text-white bg-[#2D6A4F] hover:bg-[#1B4332]"
                >
                  {actionLoading ? "Saving..." : "Save Retailer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SEND TO RETAILER ================= */}
      {sendToRetailerBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-emerald-100 text-[#2D6A4F] rounded-full flex items-center justify-center mx-auto mb-3">
              <Send size={24} />
            </div>

            <h3 className="text-lg font-black text-[#1B4332] text-center mb-1">Dispatch Booking to Retailer</h3>
            <p className="text-xs text-gray-500 text-center mb-4">
              Send the official confirmation & generated PDF report for{" "}
              <strong>{sendToRetailerBooking.cropName}</strong> ({sendToRetailerBooking.bookingId}) to a registered buyer.
            </p>

            <form onSubmit={handleSendToRetailer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">
                  Select Registered Retailer / Buyer
                </label>
                <select
                  value={selectedRetailerEmail}
                  onChange={(e) => {
                    const selEmail = e.target.value;
                    setSelectedRetailerEmail(selEmail);
                    const found = retailersList.find((r) => r.email === selEmail);
                    setSelectedRetailerName(found ? found.businessName : "");
                    if (selEmail) setCustomRetailerEmail("");
                  }}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                >
                  <option value="">-- Choose an active procurement partner --</option>
                  {retailersList
                    .filter((r) => r.status === "Active")
                    .map((r) => (
                      <option key={r.id} value={r.email}>
                        {r.businessName} ({r.location}) - {r.email}
                      </option>
                    ))}
                </select>
              </div>

              <div className="text-center font-bold text-gray-400 text-[10px] uppercase">OR Enter Custom Email</div>

              <div>
                <input
                  type="email"
                  value={customRetailerEmail}
                  onChange={(e) => {
                    setCustomRetailerEmail(e.target.value);
                    if (e.target.value) {
                      setSelectedRetailerEmail("");
                      setSelectedRetailerName("Procurement Buyer");
                    }
                  }}
                  placeholder="custom.buyer@wholesalemarket.com"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-[#1B4332]"
                />
              </div>

              {emailStatusMsg && (
                <div
                  className={`p-3 rounded-2xl text-xs font-bold ${emailStatusMsg.isError
                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}
                >
                  {emailStatusMsg.text}
                </div>
              )}

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSendToRetailerBooking(null);
                    setEmailStatusMsg(null);
                  }}
                  className="flex-1 py-3 rounded-full font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-full font-black text-white bg-[#2D6A4F] hover:bg-[#1B4332] shadow-sm flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? (
                    "Sending PDF..."
                  ) : (
                    <>
                      <Send size={14} /> Send Approved PDF
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: APPROVE PRE-BOOKING ================= */}
      {confirmPreBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-emerald-100 text-[#2D6A4F] rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-black text-[#1B4332] mb-1">Approve Pre-Booking?</h3>
            <p className="text-xs text-gray-500 mb-4">
              Approve <strong>{confirmPreBooking.cropName}</strong> ({confirmPreBooking.quantity} {confirmPreBooking.quantityUnit || "kg"}) for{" "}
              <strong>{confirmPreBooking.userName || confirmPreBooking.userEmail}</strong>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmPreBooking(null)}
                className="flex-1 py-3 rounded-full font-bold text-xs text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleApprovePreBooking}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-full font-black text-xs text-white bg-[#2D6A4F] hover:bg-[#1B4332]"
              >
                {actionLoading ? "Updating..." : "Confirm & Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REJECT PRE-BOOKING ================= */}
      {confirmRejectPreBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <XCircle size={32} />
            </div>
            <h3 className="text-lg font-black text-[#1B4332] mb-2">Reject Pre-Booking</h3>
            <p className="text-xs text-gray-500 mb-3">
              State the reason for rejecting booking <strong>{confirmRejectPreBooking.bookingId}</strong>.
            </p>
            <textarea
              rows={3}
              value={preBookingRejectionReason}
              onChange={(e) => setPreBookingRejectionReason(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-2xl text-xs text-gray-700 bg-gray-50 mb-4 focus:outline-none focus:border-rose-400"
              placeholder="e.g. Quantity exceeds batch capacity or logistics unavailable..."
            />
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmRejectPreBooking(null)}
                className="flex-1 py-3 rounded-full font-bold text-xs text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectPreBooking}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-full font-black text-xs text-white bg-rose-600 hover:bg-rose-700"
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: APPROVE MACHINERY REQUEST ================= */}
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
              <strong className="text-[#1B4332]">{confirmApproveReq.requiredDate}</strong> and update equipment status to Booked.
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

      {/* ================= MODAL: REJECT MACHINERY REQUEST ================= */}
      {confirmRejectReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <XCircle size={32} />
            </div>

            <h3 className="text-lg font-black text-[#1B4332] mb-1">Reject Machinery Request</h3>
            <p className="text-xs text-gray-500 mb-3">
              Reason for rejecting request <strong>{confirmRejectReq.requestId}</strong>.
            </p>

            <textarea
              rows={2}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Schedule unavailable, maintenance required..."
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold mb-4 focus:outline-none focus:border-rose-400"
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
