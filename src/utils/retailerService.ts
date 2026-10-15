import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export interface RetailerItem {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  location: string;
  categories: string[];
  status: "Active" | "Inactive";
  preferredCrops?: string;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

const DEFAULT_RETAILERS: Omit<RetailerItem, "id">[] = [
  {
    name: "Murugan Agro Traders",
    businessName: "Delta Agri Wholesale Corp",
    email: "retailer.delta@agrinex-demo.com",
    phone: "+91 98421 55678",
    location: "Thanjavur, Tamil Nadu",
    categories: ["Paddy", "Wheat", "Maize"],
    status: "Active",
    preferredCrops: "Paddy, Maize, Groundnut",
    notes: "Primary grain aggregator for Thanjavur district.",
  },
  {
    name: "Kaveri Fresh Mart",
    businessName: "Kaveri Organics Pvt Ltd",
    email: "buyer.kaveri@agrinex-demo.com",
    phone: "+91 97890 12345",
    location: "Tiruchirappalli, Tamil Nadu",
    categories: ["Tomato", "Onion", "Potato", "Chilli"],
    status: "Active",
    preferredCrops: "Vegetables & Horticulture",
    notes: "Direct retail procurement for 15 supermarket outlets.",
  },
  {
    name: "TN Cotton & Fiber Mills",
    businessName: "Kongu Textiles Agro Procurement",
    email: "purchase.kongu@agrinex-demo.com",
    phone: "+91 94432 88990",
    location: "Coimbatore, Tamil Nadu",
    categories: ["Cotton", "Sugarcane"],
    status: "Active",
    preferredCrops: "Cotton, Sugarcane",
    notes: "Industrial buyer for long-staple cotton.",
  },
];

/**
 * Initialize default retailers in Firestore if empty
 */
export async function initializeRetailers(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, "retailers"));
    if (snap.empty) {
      console.log("[RetailerService] Initializing default retailers...");
      for (const ret of DEFAULT_RETAILERS) {
        await addDoc(collection(db, "retailers"), {
          ...ret,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    console.warn("[RetailerService] Could not initialize retailers:", err);
  }
}

/**
 * Subscribe to real-time retailers list
 */
export function subscribeRetailers(callback: (retailers: RetailerItem[]) => void): () => void {
  const q = query(collection(db, "retailers"), orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        initializeRetailers().catch(() => {});
      }
      const items: RetailerItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      callback(items);
    },
    (err) => {
      console.warn("[RetailerService] Snapshot error:", err);
      callback([]);
    }
  );
}

/**
 * Add a new Retailer / Buyer
 */
export async function addRetailer(data: Omit<RetailerItem, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, "retailers"), {
    ...data,
    status: data.status || "Active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update Retailer / Buyer details
 */
export async function updateRetailer(id: string, data: Partial<RetailerItem>): Promise<void> {
  const docRef = doc(db, "retailers", id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete Retailer / Buyer
 */
export async function deleteRetailer(id: string): Promise<void> {
  const docRef = doc(db, "retailers", id);
  await deleteDoc(docRef);
}
