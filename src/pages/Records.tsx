import BackButton from "../components/BackButton";

export default function Records() {
  return (
    <div className="p-6">
      <BackButton />
      <h1 className="text-[#1B4332] text-xl font-black mb-6">Farm Records</h1>
      <div className="bg-white p-6 rounded-3xl border border-gray-100 text-[#1B4332] shadow-sm">
        <p>No records found.</p>
      </div>
    </div>
  );
}
