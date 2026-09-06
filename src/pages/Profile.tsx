import { signOut, onAuthStateChanged, RecaptchaVerifier, ConfirmationResult, linkWithPhoneNumber } from "firebase/auth";
import { auth, db, storage } from "../lib/firebase";
import BackButton from "../components/BackButton";
import React, { useState, useEffect, useRef } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useLanguage } from "../lib/i18n";

function getFirebaseErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code || "unknown") : "unknown";
}

function getFirebaseErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getDevelopmentFirebaseError(error: unknown) {
  return `${getFirebaseErrorCode(error)}: ${getFirebaseErrorMessage(error)}`;
}

type ProfileData = {
  uid: string;
  userId: string;
  name: string;
  email: string | null;
  photoURL?: string | null;
  loginMethod: string;
  createdAt: string;
  location?: string;
  farmName?: string;
  farmSize?: string;
  primaryCrop?: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
};

export default function Profile() {
  const user = auth.currentUser;
  const { t } = useLanguage();
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const requestedPhoneRef = useRef<string | null>(null);
  const mobileRequestRef = useRef(false);

  const [userData, setUserData] = useState<ProfileData | null>(user ? {
    uid: user.uid,
    userId: user.uid,
    name: user.displayName || "AgriNex User",
    email: user.email,
    photoURL: user.photoURL,
    loginMethod: user.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Email/Password',
    createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "Unknown",
  } : null);

  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mobileMode, setMobileMode] = useState<"idle" | "enter" | "verify">("idle");
  const [countryCode, setCountryCode] = useState("+91");
  const [mobileInput, setMobileInput] = useState("");
  const [otp, setOtp] = useState("");
  const [mobileBusy, setMobileBusy] = useState(false);
  const [mobileError, setMobileError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", location: "", farmName: "", farmSize: "", primaryCrop: ""
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }

      // Update with latest Auth data
      const initialData = {
        uid: user.uid,
        userId: user.uid,
        name: user.displayName || "AgriNex User",
        email: user.email,
        photoURL: user.photoURL,
        loginMethod: user.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Email/Password',
        createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "Unknown",
      };
      setUserData((prev: any) => ({ ...prev, ...initialData }));

      // Fetch Firestore in background
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
          const dbData = userSnap.data();
          setUserData((prev: any) => ({ ...prev, ...dbData }));
          setForm({
            name: dbData.name || initialData.name,
            location: dbData.location || "",
            farmName: dbData.farmName || "",
            farmSize: dbData.farmSize || "",
            primaryCrop: dbData.primaryCrop || "",
          });
        } else {
          await setDoc(doc(db, "users", user.uid), {
            ...initialData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      } catch (err) {
        console.error("Error fetching background data:", err);
        setError(t("Unable to load saved profile details. Please try again."));
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => () => {
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
  }, []);

  const getRecaptcha = () => {
    if (!document.getElementById("recaptcha-container")) {
      const error = new Error("The reCAPTCHA container is not available.");
      Object.assign(error, { code: "auth/captcha-check-failed" });
      throw error;
    }
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      if (import.meta.env.DEV) {
        console.info("[AgriNex][Firebase Phone Auth] RecaptchaVerifier initialized");
      }
    }
    return recaptchaRef.current;
  };

  const resetRecaptcha = () => {
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
  };

  const normalizedPhone = () => {
    const rawInput = mobileInput.trim();
    if (!/^[0-9\s()-]+$/.test(rawInput)) {
      const error = new Error(t("Enter a valid mobile number."));
      Object.assign(error, { code: "auth/invalid-phone-number" });
      throw error;
    }
    const digits = rawInput.replace(/\D/g, "");
    if (countryCode === "+91" && !/^[6-9][0-9]{9}$/.test(digits)) {
      const error = new Error(t("Enter a valid mobile number."));
      Object.assign(error, { code: "auth/invalid-phone-number" });
      throw error;
    }
    if (countryCode !== "+91" && (digits.length < 6 || digits.length > 15)) {
      const error = new Error(t("Enter a valid mobile number."));
      Object.assign(error, { code: "auth/invalid-phone-number" });
      throw error;
    }
    return `${countryCode}${digits}`;
  };

  const mobileAuthMessage = (error: unknown) => {
    const code = getFirebaseErrorCode(error);
    switch (code) {
      case "auth/invalid-phone-number": return t("Enter a valid mobile number.");
      case "auth/too-many-requests": return t("Too many OTP requests. Please try again later.");
      case "auth/quota-exceeded": return t("OTP quota has been exceeded.");
      case "auth/billing-not-enabled": return t("Firebase Phone Authentication requires Cloud Billing (Blaze plan) to be enabled in Firebase Console.");
      case "auth/captcha-check-failed":
      case "auth/invalid-app-credential":
      case "auth/missing-app-credential": return t("Security verification failed. Please refresh and try again.");
      case "auth/operation-not-allowed": return t("Mobile OTP authentication is not enabled.");
      case "auth/unauthorized-domain":
      case "auth/app-not-authorized": return t("OTP verification is not configured for this domain.");
      case "auth/network-request-failed": return t("Network error. Please check your connection and try again.");
      case "auth/code-expired": return t("OTP expired. Please request a new OTP.");
      case "auth/credential-already-in-use": return t("This mobile number is already linked to another account.");
      case "auth/invalid-verification-code": return t("Invalid OTP. Please try again.");
      case "auth/requires-recent-login": return t("Please sign in again before linking a mobile number.");
      default: return `${t("Unable to send OTP. Please try again.")} (${code}: ${getFirebaseErrorMessage(error)})`;
    }
  };

  const sendMobileOtp = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || mobileBusy || mobileRequestRef.current) return;
    mobileRequestRef.current = true;
    setMobileBusy(true);
    setMobileError(null);
    setError(null);
    try {
      const phoneNumber = normalizedPhone();
      const verifier = getRecaptcha();
      await verifier.render();
      confirmationResultRef.current = await linkWithPhoneNumber(currentUser, phoneNumber, verifier);
      requestedPhoneRef.current = phoneNumber;
      if (import.meta.env.DEV) {
        console.info("[AgriNex][Firebase Phone Auth] ConfirmationResult received", { phoneNumberRequested: true });
      }
      setMobileMode("verify");
    } catch (err: any) {
      console.error("CAPTURE_OTP_ERROR:", {
        code: err?.code,
        message: err?.message,
        full: err
      });
      console.error("error.code:", err?.code);
      console.error("error.message:", err?.message);
      console.error("full error object:", err);
      (window as any).__LAST_OTP_ERROR__ = {
        code: err?.code,
        message: err?.message,
        full: err
      };
      resetRecaptcha();
      const displayMsg = mobileAuthMessage(err);
      setMobileError(displayMsg);
    } finally {
      mobileRequestRef.current = false;
      setMobileBusy(false);
    }
  };

  const verifyMobileOtp = async () => {
    const currentUser = auth.currentUser;
    const confirmationResult = confirmationResultRef.current;
    const requestedPhone = requestedPhoneRef.current;
    if (!currentUser || !confirmationResult || !requestedPhone) return;
    setMobileBusy(true);
    setMobileError(null);
    try {
      await confirmationResult.confirm(otp.trim());
      await updateDoc(doc(db, "users", currentUser.uid), {
        userId: currentUser.uid,
        email: currentUser.email,
        phoneNumber: requestedPhone,
        phoneVerified: true,
        phoneVerifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setUserData((prev: any) => ({ ...prev, userId: currentUser.uid, email: currentUser.email, phoneNumber: requestedPhone, phoneVerified: true }));
      setMobileMode("idle");
      setOtp("");
      confirmationResultRef.current = null;
      requestedPhoneRef.current = null;
      setSuccess(t("Mobile number verified successfully."));
    } catch (err: any) {
      const code = getFirebaseErrorCode(err);
      if (import.meta.env.DEV) {
        console.error("FULL OTP ERROR:", err);
        console.error("OTP ERROR CODE:", code);
        console.error("OTP ERROR MESSAGE:", getFirebaseErrorMessage(err));
        console.error("[AgriNex][Firebase Phone Auth] OTP verification failed", {
          code,
          message: getFirebaseErrorMessage(err),
          projectId: auth.app.options.projectId,
          host: window.location.hostname,
        });
      }
      setMobileError(code === "auth/code-expired" ? t("OTP expired. Please request a new OTP.") : code === "auth/invalid-verification-code" ? t("Invalid OTP. Please try again.") : mobileAuthMessage(err));
    } finally {
      setMobileBusy(false);
    }
  };

  const startMobileLinking = () => {
    resetRecaptcha();
    setMobileError(null);
    setSuccess(null);
    setMobileInput("");
    setOtp("");
    confirmationResultRef.current = null;
    requestedPhoneRef.current = null;
    setMobileMode("enter");
  };

  const handleSave = async () => {
    if (!userData?.uid) {
      setError(t("Unable to update profile. Please try again."));
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateDoc(doc(db, "users", userData.uid), {
        ...form,
        updatedAt: serverTimestamp()
      });
      setUserData({ ...userData, ...form });
      setEditing(false);
      setSuccess(t("Profile updated successfully!"));
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(t("Unable to update profile. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && auth.currentUser) {
      const file = e.target.files[0];
      try {
        const storageRef = ref(storage, `profiles/${auth.currentUser.uid}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "users", auth.currentUser.uid), { photoURL: url });
        setUserData((prev: any) => ({ ...prev, photoURL: url }));
      } catch (err) {
        console.error("Error uploading photo:", err);
      }
    }
  };

  return (
    <div className="p-6 min-h-screen bg-[#F0F7F4]">
      <BackButton />
      <h1 className="text-2xl font-black text-[#1B4332] mb-6 flex items-center gap-2">👤 {t("Profile")}</h1>

      {success && <p className="bg-green-100 text-green-800 p-3 rounded-xl mb-4 font-bold">{success}</p>}
      {error && <p className="bg-red-100 text-red-800 p-3 rounded-xl mb-4 font-bold">{error}</p>}

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-gray-200 mb-4 overflow-hidden border-2 border-[#2D6A4F]">
            {userData?.photoURL ? (
              <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">{t("No Photo")}</div>
            )}
          </div>
          <label className="cursor-pointer bg-[#2D6A4F] text-white px-4 py-2 rounded-lg font-bold text-sm">
            {t("Change Photo")}
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleFileChange} />
          </label>
        </div>

        {!editing ? (
          <div className="space-y-4">
            <div><p className="text-xs text-gray-500 font-bold uppercase">{t("Full Name")}</p><p className="text-lg font-bold text-[#1B4332]">{userData?.name}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">{t("Email Address")}</p><p className="text-lg font-bold text-[#1B4332]">{userData?.email}</p></div>
            <div className="border-t pt-4">
              <p className="text-xs text-gray-500 font-bold uppercase">{t("Mobile Number")}</p>
              {!userData?.phoneNumber ? (
                <>
                  <p className="text-lg font-bold text-[#1B4332]">{t("Not linked")}</p>
                  <button type="button" onClick={startMobileLinking} className="mt-2 bg-[#2D6A4F] text-white px-4 py-2 rounded-full font-bold">+ {t("Link My Mobile Number")}</button>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-[#1B4332]">{userData.phoneNumber}</p>
                  <p className={`text-sm font-bold ${userData.phoneVerified ? "text-green-700" : "text-yellow-700"}`}>{userData.phoneVerified ? `✓ ${t("Verified")}` : `⚠ ${t("Not Verified")}`}</p>
                  <button type="button" onClick={startMobileLinking} className="mt-2 bg-gray-100 text-[#2D6A4F] px-4 py-2 rounded-full font-bold">{userData.phoneVerified ? t("Change Number") : t("Verify")}</button>
                </>
              )}
              {mobileMode !== "idle" && (
                <div className="mt-4 space-y-3 rounded-2xl bg-[#F0F7F4] p-4">
                  {mobileMode === "enter" ? (
                    <>
                      <div className="flex gap-2">
                        <select value={countryCode} onChange={e => setCountryCode(e.target.value)} className="w-24 p-3 border rounded-xl bg-white" aria-label={t("Country code")}>
                          <option value="+91">+91</option>
                          <option value="+1">+1</option>
                          <option value="+44">+44</option>
                          <option value="+61">+61</option>
                        </select>
                        <input id="mobile-number-input" type="tel" value={mobileInput} onChange={e => setMobileInput(e.target.value)} placeholder={t("Mobile Number")} className="min-w-0 flex-1 p-3 border rounded-xl" autoComplete="tel" />
                      </div>
                      <button type="button" id="send-otp-button" onClick={sendMobileOtp} disabled={mobileBusy} className="w-full bg-[#2D6A4F] text-white py-3 rounded-full font-bold">{mobileBusy ? t("Sending") : t("Send OTP")}</button>
                    </>
                  ) : (
                    <>
                      <input type="text" inputMode="numeric" value={otp} onChange={e => setOtp(e.target.value)} placeholder={t("Enter OTP")} className="w-full p-3 border rounded-xl" autoComplete="one-time-code" />
                      <button type="button" onClick={verifyMobileOtp} disabled={mobileBusy || !otp.trim()} className="w-full bg-[#2D6A4F] text-white py-3 rounded-full font-bold">{mobileBusy ? t("Verifying") : t("Verify OTP")}</button>
                      <button type="button" onClick={() => { resetRecaptcha(); setMobileMode("enter"); setOtp(""); }} className="w-full py-2 text-gray-600 font-bold">{t("Request New OTP")}</button>
                    </>
                  )}
                  <div id="recaptcha-container" />
                  {mobileError && <p id="mobile-otp-error-display" className="text-red-600 text-sm font-bold bg-red-50 p-3 rounded-xl border border-red-200">{mobileError}</p>}
                </div>
              )}
            </div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">{t("Location")}</p><p className="text-lg font-bold text-[#1B4332]">{userData?.location || t("Not set")}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">{t("Farm Name")}</p><p className="text-lg font-bold text-[#1B4332]">{userData?.farmName || t("Not set")}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">{t("Farm Size")}</p><p className="text-lg font-bold text-[#1B4332]">{userData?.farmSize || t("Not set")}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">{t("Primary Crop")}</p><p className="text-lg font-bold text-[#1B4332]">{userData?.primaryCrop || t("Not set")}</p></div>
            <hr className="my-4" />
            <div><p className="text-xs text-gray-500 font-bold uppercase">Firebase UID</p><p className="text-sm font-mono text-gray-700 bg-gray-100 p-2 rounded">{userData?.uid}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">Login Method</p><p className="text-lg font-bold text-[#1B4332] capitalize">{userData?.loginMethod}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">Member Since</p><p className="text-lg font-bold text-[#1B4332]">{userData?.createdAt}</p></div>
            <button onClick={() => setEditing(true)} className="w-full bg-[#2D6A4F] text-white py-4 rounded-full font-bold text-lg mt-6">{t("Edit Profile")}</button>
          </div>
        ) : (
          <div className="space-y-4">
            <input type="text" placeholder={t("Full Name")} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-3 border rounded-xl" />
            <input type="text" placeholder={t("Location")} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full p-3 border rounded-xl" />
            <input type="text" placeholder={t("Farm Name")} value={form.farmName} onChange={e => setForm({ ...form, farmName: e.target.value })} className="w-full p-3 border rounded-xl" />
            <input type="text" placeholder={t("Farm Size")} value={form.farmSize} onChange={e => setForm({ ...form, farmSize: e.target.value })} className="w-full p-3 border rounded-xl" />
            <input type="text" placeholder={t("Primary Crop")} value={form.primaryCrop} onChange={e => setForm({ ...form, primaryCrop: e.target.value })} className="w-full p-3 border rounded-xl" />
            <div className="flex gap-4 mt-6">
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#2D6A4F] text-white py-4 rounded-full font-bold text-lg">{saving ? t("Saving") : t("Save Changes")}</button>
              <button onClick={() => setEditing(false)} className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-full font-bold text-lg">{t("Cancel")}</button>
            </div>
          </div>
        )}
      </div>

      <button onClick={() => signOut(auth)} className="w-full bg-red-500 text-white py-4 rounded-full font-bold text-lg mb-20">{t("Logout")}</button>
    </div>
  );
}
