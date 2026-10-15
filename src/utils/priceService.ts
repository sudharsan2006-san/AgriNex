import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../lib/firebase";

import paddyImage from "../assets/images/paddy_realistic_1788423107962.jpg";
import maizeImage from "../assets/images/maize_realistic_1788423123774.jpg";
import wheatImage from "../assets/images/wheat_realistic_1788423144242.jpg";
import milletImage from "../assets/images/millet_realistic_1788423158373.jpg";
import sugarcaneImage from "../assets/images/sugarcane_realistic_1788423179854.jpg";
import cottonImage from "../assets/images/cotton_realistic_1788423275186.jpg";
import tomatoImage from "../assets/images/tomato_realistic_1788423293307.jpg";
import onionImage from "../assets/images/onion_realistic_1788423319492.jpg";
import potatoImage from "../assets/images/potato_realistic_1788423340061.jpg";
import brinjalImage from "../assets/images/brinjal_realistic_1788423360402.jpg";
import bananaImage from "../assets/images/banana_realistic_1788423373706.jpg";
import mangoImage from "../assets/images/mango_realistic_1788423388083.jpg";
import coconutImage from "../assets/images/coconut_realistic_1788423404696.jpg";
import chilliImage from "../assets/images/chilli_realistic_1788423420382.jpg";
import groundnutImage from "../assets/images/groundnut_realistic_1788423449690.jpg";

export interface CropPriceItem {
  id: string;
  commodity: string;
  min: number;
  max: number;
  modal: number;
  unit: string;
  imageUrl?: string;
  updatedAt?: any;
}

export const DEFAULT_REFERENCE_PRICES: CropPriceItem[] = [
  { id: "paddy", commodity: "Paddy", min: 1800, max: 2200, modal: 2000, unit: "₹ / Quintal", imageUrl: paddyImage },
  { id: "maize", commodity: "Maize", min: 1500, max: 2000, modal: 1750, unit: "₹ / Quintal", imageUrl: maizeImage },
  { id: "wheat", commodity: "Wheat", min: 2100, max: 2500, modal: 2300, unit: "₹ / Quintal", imageUrl: wheatImage },
  { id: "millet", commodity: "Millet", min: 1600, max: 2000, modal: 1800, unit: "₹ / Quintal", imageUrl: milletImage },
  { id: "sugarcane", commodity: "Sugarcane", min: 2800, max: 3500, modal: 3100, unit: "₹ / Tonne", imageUrl: sugarcaneImage },
  { id: "groundnut", commodity: "Groundnut", min: 4500, max: 5500, modal: 5000, unit: "₹ / Quintal", imageUrl: groundnutImage },
  { id: "cotton", commodity: "Cotton", min: 6000, max: 7500, modal: 6750, unit: "₹ / Quintal", imageUrl: cottonImage },
  { id: "tomato", commodity: "Tomato", min: 10, max: 25, modal: 18, unit: "₹ / Kg", imageUrl: tomatoImage },
  { id: "onion", commodity: "Onion", min: 20, max: 45, modal: 32, unit: "₹ / Kg", imageUrl: onionImage },
  { id: "potato", commodity: "Potato", min: 15, max: 30, modal: 22, unit: "₹ / Kg", imageUrl: potatoImage },
  { id: "brinjal", commodity: "Brinjal", min: 10, max: 20, modal: 15, unit: "₹ / Kg", imageUrl: brinjalImage },
  { id: "banana", commodity: "Banana", min: 20, max: 40, modal: 30, unit: "₹ / Kg", imageUrl: bananaImage },
  { id: "mango", commodity: "Mango", min: 40, max: 90, modal: 65, unit: "₹ / Kg", imageUrl: mangoImage },
  { id: "coconut", commodity: "Coconut", min: 15, max: 30, modal: 22, unit: "₹ / Piece", imageUrl: coconutImage },
  { id: "chilli", commodity: "Chilli", min: 70, max: 140, modal: 105, unit: "₹ / Kg", imageUrl: chilliImage },
];

export const IMAGE_MAP: Record<string, string> = {
  paddy: paddyImage,
  maize: maizeImage,
  wheat: wheatImage,
  millet: milletImage,
  sugarcane: sugarcaneImage,
  groundnut: groundnutImage,
  cotton: cottonImage,
  tomato: tomatoImage,
  onion: onionImage,
  potato: potatoImage,
  brinjal: brinjalImage,
  banana: bananaImage,
  mango: mangoImage,
  coconut: coconutImage,
  chilli: chilliImage,
};

/**
 * Initialize crop prices in Firestore if collection is empty
 */
export async function initializeCropPrices(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, "marketPrices"));
    if (snap.empty) {
      console.log("[PriceService] Initializing default market prices in Firestore...");
      for (const item of DEFAULT_REFERENCE_PRICES) {
        await setDoc(doc(db, "marketPrices", item.id), {
          commodity: item.commodity,
          min: item.min,
          max: item.max,
          modal: item.modal,
          unit: item.unit,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    console.warn("[PriceService] Could not initialize market prices in Firestore:", err);
  }
}

/**
 * Subscribe to real-time market prices from Firestore with fallback to defaults
 */
export function subscribeMarketPrices(callback: (prices: CropPriceItem[]) => void): () => void {
  const q = query(collection(db, "marketPrices"), orderBy("commodity", "asc"));

  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        callback(DEFAULT_REFERENCE_PRICES);
        initializeCropPrices().catch(() => {});
        return;
      }
      const prices: CropPriceItem[] = snap.docs.map((d) => {
        const data = d.data();
        const docId = d.id.toLowerCase();
        return {
          id: d.id,
          commodity: data.commodity || d.id,
          min: Number(data.min) || 0,
          max: Number(data.max) || 0,
          modal: Number(data.modal) || 0,
          unit: data.unit || "₹ / Quintal",
          imageUrl: data.imageUrl || IMAGE_MAP[docId] || IMAGE_MAP[data.commodity?.toLowerCase()] || paddyImage,
          updatedAt: data.updatedAt,
        };
      });
      callback(prices);
    },
    (err) => {
      console.warn("[PriceService] Real-time prices snapshot warning:", err);
      callback(DEFAULT_REFERENCE_PRICES);
    }
  );
}

import { auth } from "../lib/firebase";

/**
 * Update crop price in Firestore with Admin audit tracking
 */
export async function updateCropPrice(
  id: string,
  priceData: { min: number; max: number; modal: number; unit?: string; commodity?: string; previousValue?: any }
): Promise<void> {
  const docRef = doc(db, "marketPrices", id);
  const currentAdmin = auth.currentUser;
  await setDoc(
    docRef,
    {
      ...priceData,
      updatedAt: serverTimestamp(),
      updatedBy: currentAdmin?.uid || "admin",
      updatedByEmail: currentAdmin?.email || "sudharsan9001@gmail.com",
    },
    { merge: true }
  );
}
