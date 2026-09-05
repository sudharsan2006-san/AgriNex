import { addDoc, collection, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export type NotificationType =
  | "booking_confirmed"
  | "booking_status"
  | "rain_alert"
  | "price_alert"
  | "pdf_report";

export interface NotificationPayload {
  bookingId?: string;
  cropName?: string;
  quantity?: string | number;
  unit?: string;
  status?: string;
  prevStatus?: string;
  rainProb?: number;
  expectedRain?: number;
  rainStatus?: string;
  location?: string;
  commodity?: string;
  prevPrice?: number;
  newPrice?: number;
  priceUnit?: string;
  [key: string]: any;
}

interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  payload?: NotificationPayload;
}

/**
 * Unified notification creator.
 * 1. Writes notification doc to Firestore (in-app bell)
 * 2. Fires background email via /api/send-notification-email (non-blocking)
 * 3. Updates emailStatus on the Firestore doc after email result
 */
export async function createNotification({
  type,
  title,
  message,
  payload = {},
}: CreateNotificationParams): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    console.warn("[NotificationService] No authenticated user — skipping notification.");
    return;
  }

  const userEmail = user.email;
  const userId = user.uid;
  const userName = user.displayName || "Farmer";

  // 1. Write to Firestore immediately (shows in bell instantly)
  let notifDocRef: any = null;
  try {
    notifDocRef = await addDoc(collection(db, "notifications"), {
      userId,
      userEmail,
      title,
      message,
      type,
      read: false,
      createdAt: serverTimestamp(),
      emailStatus: "pending",
      payload,
    });
  } catch (err) {
    console.error("[NotificationService] Firestore write failed:", err);
    return;
  }

  // 2. Fire email async — do NOT await, so the UI is never blocked
  (async () => {
    try {
      // Mark as processing
      await updateDoc(doc(db, "notifications", notifDocRef.id), {
        emailStatus: "processing",
      });

      const res = await fetch("/api/send-notification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          toEmail: userEmail,
          userName,
          title,
          message,
          payload,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { success: false, error: "Non-JSON response from backend" };
      }

      if (data.success) {
        await updateDoc(doc(db, "notifications", notifDocRef.id), {
          emailStatus: "sent",
          emailSentAt: serverTimestamp(),
          emailProviderId: data.emailId || null,
        });
      } else {
        await updateDoc(doc(db, "notifications", notifDocRef.id), {
          emailStatus: "failed",
          emailError: data.error || "Unknown email error",
        });
      }
    } catch (err: any) {
      console.error("[NotificationService] Email dispatch error:", err);
      try {
        await updateDoc(doc(db, "notifications", notifDocRef.id), {
          emailStatus: "failed",
          emailError: err?.message || String(err),
        });
      } catch {}
    }
  })();
}
