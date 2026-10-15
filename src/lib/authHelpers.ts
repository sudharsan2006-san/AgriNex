import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export const ADMIN_EMAIL = "sudharsan9001@gmail.com";

export function isAdminUserEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export async function syncUserToFirestore(user: any, additionalData: any = {}) {
  if (!user?.uid) return null;
  const userRef = doc(db, "users", user.uid);
  let existingData: Record<string, any> = {};

  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      existingData = userSnap.data() || {};
    }
  } catch (err: any) {
    console.warn(`[AgriNex Auth] getDoc notice for ${user.uid} (${err?.code || err?.message || err})`);
  }

  const isAdminAccount = isAdminUserEmail(user.email);
  const allowedUserRoles = ["farmer", "buyer", "retailer"];
  const requestedRole = allowedUserRoles.includes(existingData.role)
    ? existingData.role
    : allowedUserRoles.includes(additionalData.role)
      ? additionalData.role
      : "farmer";

  const userData = {
    ...additionalData,
    uid: user.uid,
    email: user.email,
    role: isAdminAccount ? "admin" : requestedRole,
    isAdmin: isAdminAccount,
    lastLogin: serverTimestamp(),
    ...(!existingData.createdAt ? { createdAt: serverTimestamp() } : {}),
  };

  try {
    await setDoc(userRef, userData, { merge: true });
  } catch (err: any) {
    console.error(`[AgriNex Auth] setDoc error for ${user.uid} (${err?.code || err?.message || err})`);
  }
  return userData;
}

export async function getFirebaseAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error("Authentication is required.");
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}
