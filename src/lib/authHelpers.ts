import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function syncUserToFirestore(user: any, additionalData: any = {}) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  const userData = {
    uid: user.uid,
    email: user.email,
    lastLogin: serverTimestamp(),
    ...additionalData,
    ...(userSnap.exists() ? {} : { createdAt: serverTimestamp() }),
  };

  await setDoc(userRef, userData, { merge: true });
}
