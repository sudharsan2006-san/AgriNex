import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db, storage } from "../lib/firebase";
import BackButton from "../components/BackButton";
import React, { useState, useEffect } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export default function Profile() {
  const user = auth.currentUser;

  const [userData, setUserData] = useState<any>(user ? {
    uid: user.uid,
    userId: user.uid,
    name: user.displayName || "AgriNex User",
    email: user.email,
    photoURL: user.photoURL,
    loginMethod: user.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Email/Password',
    createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "Unknown",
  } : null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
        setError("Unable to load saved profile details. Please try again.");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
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
      setSuccess("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Unable to update profile. Please try again.");
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
      <h1 className="text-2xl font-black text-[#1B4332] mb-6 flex items-center gap-2">👤 Profile</h1>

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
            <div><p className="text-xs text-gray-500 font-bold uppercase">Location</p><p className="text-lg font-bold text-[#1B4332]">{userData?.location || "Not set"}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">Farm Name</p><p className="text-lg font-bold text-[#1B4332]">{userData?.farmName || "Not set"}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">Farm Size</p><p className="text-lg font-bold text-[#1B4332]">{userData?.farmSize || "Not set"}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">Primary Crop</p><p className="text-lg font-bold text-[#1B4332]">{userData?.primaryCrop || "Not set"}</p></div>
            <hr className="my-4" />
            <div><p className="text-xs text-gray-500 font-bold uppercase">Firebase UID</p><p className="text-sm font-mono text-gray-700 bg-gray-100 p-2 rounded">{userData?.uid}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">Login Method</p><p className="text-lg font-bold text-[#1B4332] capitalize">{userData?.loginMethod}</p></div>
            <div><p className="text-xs text-gray-500 font-bold uppercase">Member Since</p><p className="text-lg font-bold text-[#1B4332]">{userData?.createdAt}</p></div>
            <button onClick={() => setEditing(true)} className="w-full bg-[#2D6A4F] text-white py-4 rounded-full font-bold text-lg mt-6">Edit Profile</button>
          </div>
        ) : (
          <div className="space-y-4">
            <input type="text" placeholder="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-3 border rounded-xl" />
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

      <button onClick={() => signOut(auth)} className="w-full bg-red-500 text-white py-4 rounded-full font-bold text-lg mb-20">Logout</button>
    </div>
  );
}
