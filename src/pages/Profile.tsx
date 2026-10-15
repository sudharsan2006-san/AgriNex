import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db, storage } from "../lib/firebase";
import BackButton from "../components/BackButton";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { isAdminUserEmail } from "../lib/authHelpers";

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  phoneNumber: string;
  location: string;
  farmName: string;
  farmSize: string;
  primaryCrop: string;
  role: string;
  loginMethod: string;
  createdAt: string;
}

interface ProfileForm {
  name: string;
  phoneNumber: string;
  location: string;
  farmName: string;
  farmSize: string;
  primaryCrop: string;
}

function displayDate(value: unknown, fallback: string): string {
  if (value instanceof Timestamp) {
    return value.toDate().toLocaleDateString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value.toLocaleDateString();
  }
  return typeof value === "string" ? value : fallback;
}

function profileText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function getAuthProfile(user: NonNullable<typeof auth.currentUser>): UserProfile {
  return {
    uid: user.uid,
    name: user.displayName || "AgriNex User",
    email: user.email || "",
    photoURL: user.photoURL,
    phoneNumber: "",
    location: "",
    farmName: "",
    farmSize: "",
    primaryCrop: "",
    role: "",
    loginMethod: user.providerData[0]?.providerId === "google.com" ? "Google" : "Email/Password",
    createdAt: user.metadata.creationTime
      ? new Date(user.metadata.creationTime).toLocaleDateString()
      : "Unknown",
  };
}

export default function Profile() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<ProfileForm>({
    name: "", phoneNumber: "", location: "", farmName: "", farmSize: "", primaryCrop: ""
  });

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          if (active) setLoading(false);
          navigate("/login", { replace: true });
          return;
        }

        const initialData = getAuthProfile(user);
        if (active) {
          setUserData(initialData);
          setForm({
            name: initialData.name,
            phoneNumber: "",
            location: "",
            farmName: "",
            farmSize: "",
            primaryCrop: "",
          });
          setLoading(true);
          setError(null);
        }
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (!active) return;

          if (userSnap.exists()) {
            const dbData = userSnap.data();
            setUserData({
              ...initialData,
              name: profileText(dbData.name, initialData.name),
              email: profileText(dbData.email, initialData.email),
              photoURL: profileText(dbData.photoURL, initialData.photoURL || "") || null,
              phoneNumber: profileText(dbData.phoneNumber),
              location: profileText(dbData.location),
              farmName: profileText(dbData.farmName),
              farmSize: profileText(dbData.farmSize),
              primaryCrop: profileText(dbData.primaryCrop),
              role: profileText(dbData.role),
              loginMethod: profileText(dbData.loginMethod, initialData.loginMethod),
              createdAt: displayDate(dbData.createdAt, initialData.createdAt),
            });
            setForm({
              name: profileText(dbData.name, initialData.name),
              phoneNumber: profileText(dbData.phoneNumber),
              location: profileText(dbData.location),
              farmName: profileText(dbData.farmName),
              farmSize: profileText(dbData.farmSize),
              primaryCrop: profileText(dbData.primaryCrop),
            });
          } else {
            await setDoc(userRef, {
              ...initialData,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        } catch (err) {
          console.error("Error loading profile data:", err);
          if (active) {
            setError("Saved profile details could not be loaded. Showing your account information.");
          }
        } finally {
          if (active) setLoading(false);
        }
      },
      (authError) => {
        console.error("Unable to verify the profile session:", authError);
        if (active) {
          setError("We could not verify your session. Please sign in again.");
          setLoading(false);
        }
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigate]);

  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !userData) {
      setError("Your session has expired. Please sign in again.");
      navigate("/login", { replace: true });
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await setDoc(doc(db, "users", currentUser.uid), {
        ...form,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setUserData({ ...userData, ...form });
      setEditing(false);
      setSuccess("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Unable to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentUser = auth.currentUser;
    const file = e.target.files?.[0];
    if (!file) return;
    if (!currentUser) {
      setError("Your session has expired. Please sign in again.");
      navigate("/login", { replace: true });
      return;
    }

    setError(null);
    try {
      const storageRef = ref(storage, `profiles/${currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await setDoc(doc(db, "users", currentUser.uid), {
        photoURL: url,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setUserData((prev) => prev ? { ...prev, photoURL: url } : prev);
    } catch (err) {
      console.error("Error uploading profile photo:", err);
      setError("Unable to upload profile photo. Please try again.");
    }
  };

  if (!userData && loading) {
    return (
      <div className="p-6 min-h-screen bg-[#F0F7F4] text-[#1B4332]">
        <BackButton />
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100" role="status">
          <p className="font-bold">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="p-6 min-h-screen bg-[#F0F7F4] text-[#1B4332]">
        <BackButton />
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100" role="alert">
          <h1 className="text-2xl font-black mb-2">Profile unavailable</h1>
          <p>We could not load your account information. Please sign in again.</p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="w-full bg-[#2D6A4F] text-white py-3 rounded-full font-bold mt-4"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-[#F0F7F4]">
      <BackButton />
      <h1 className="text-2xl font-black text-[#1B4332] mb-6 flex items-center gap-2">👤 Profile</h1>

      {loading && <p className="text-sm text-[#2D6A4F] mb-4" role="status">Loading saved profile details...</p>}
      {success && <p className="bg-green-100 text-green-800 p-3 rounded-xl mb-4 font-bold">{success}</p>}
      {error && <p className="bg-red-100 text-red-800 p-3 rounded-xl mb-4 font-bold">{error}</p>}

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-gray-200 mb-4 overflow-hidden border-2 border-[#2D6A4F]">
            {userData?.photoURL ? (
              <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">No Photo</div>
            )}
          </div>
          <label className="cursor-pointer bg-[#2D6A4F] text-white px-4 py-2 rounded-lg font-bold text-sm">
            Change Photo
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleFileChange} />
          </label>
        </div>

        {!editing ? (
          <div className="space-y-4">
            <div><p className="text-xs text-gray-500 font-bold uppercase">Full Name</p><p className="text-lg font-bold text-[#1B4332]">{userData?.name}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">Email Address</p><p className="text-lg font-bold text-[#1B4332]">{userData?.email}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">Mobile Number</p><p className="text-lg font-bold text-[#1B4332]">{userData?.phoneNumber || "Not set"}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">Location</p><p className="text-lg font-bold text-[#1B4332]">{userData?.location || "Not set"}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">Farm Name</p><p className="text-lg font-bold text-[#1B4332]">{userData?.farmName || "Not set"}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">Farm Size</p><p className="text-lg font-bold text-[#1B4332]">{userData?.farmSize || "Not set"}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">Primary Crop</p><p className="text-lg font-bold text-[#1B4332]">{userData?.primaryCrop || "Not set"}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">Account Role</p><p className="text-lg font-bold text-[#1B4332]">{isAdminUserEmail(auth.currentUser?.email) ? "🛡️ Administrator" : userData.role === "buyer" || userData.role === "retailer" ? "🛒 Buyer" : "🌾 Farmer"}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">Firebase UID</p><p className="text-sm font-mono text-gray-700 bg-gray-100 p-2 rounded">{userData?.uid}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">Login Method</p><p className="text-lg font-bold text-[#1B4332] capitalize">{userData?.loginMethod}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">Member Since</p><p className="text-lg font-bold text-[#1B4332]">{userData?.createdAt}</p></div>
            <button onClick={() => setEditing(true)} className="w-full bg-[#2D6A4F] text-white py-4 rounded-full font-bold text-lg mt-6">Edit Profile</button>
          </div>
        ) : (
          <div className="space-y-4">
            <input type="text" placeholder="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-3 border rounded-xl" />
            <input type="tel" placeholder="Mobile Number" value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} className="w-full p-3 border rounded-xl" />
            <input type="text" placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full p-3 border rounded-xl" />
            <input type="text" placeholder="Farm Name" value={form.farmName} onChange={e => setForm({ ...form, farmName: e.target.value })} className="w-full p-3 border rounded-xl" />
            <input type="text" placeholder="Farm Size" value={form.farmSize} onChange={e => setForm({ ...form, farmSize: e.target.value })} className="w-full p-3 border rounded-xl" />
            <input type="text" placeholder="Primary Crop" value={form.primaryCrop} onChange={e => setForm({ ...form, primaryCrop: e.target.value })} className="w-full p-3 border rounded-xl" />
            <div className="flex gap-4 mt-6">
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#2D6A4F] text-white py-4 rounded-full font-bold text-lg">{saving ? "Saving..." : "Save Changes"}</button>
              <button onClick={() => setEditing(false)} className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-full font-bold text-lg">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mb-6 space-y-2">
        <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2 px-2">Services & Management</h3>
        <a href="/machinery" className="flex items-center justify-between p-3 rounded-2xl bg-[#F0F7F4] hover:bg-[#E8F5E9] font-bold text-xs text-[#1B4332] transition-colors">
          <span>🚜 Browse Farm Machinery</span>
          <span>→</span>
        </a>
        <a href="/my-machinery-requests" className="flex items-center justify-between p-3 rounded-2xl bg-[#F0F7F4] hover:bg-[#E8F5E9] font-bold text-xs text-[#1B4332] transition-colors">
          <span>📋 My Machinery Requests</span>
          <span>→</span>
        </a>
        {isAdminUserEmail(auth.currentUser?.email) && (
          <a href="/admin" className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 font-bold text-xs text-amber-950 border border-amber-200 transition-colors">
            <span>🛡️ Open Admin Control Center</span>
            <span>→</span>
          </a>
        )}
      </div>
      <button
        onClick={async () => {
          await signOut(auth);
          navigate("/login", { replace: true });
        }}
        className="w-full bg-red-500 hover:bg-red-600 transition-colors text-white py-4 rounded-full font-bold text-lg mb-20 shadow-sm"
      >
        Logout
      </button>
    </div>
  );
}
