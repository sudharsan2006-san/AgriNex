import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackButton() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <button 
      onClick={handleBack}
      className="p-2 mb-4 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"
      aria-label="Go back"
    >
      <ArrowLeft size={20} className="text-[#1B4332]" />
    </button>
  );
}
