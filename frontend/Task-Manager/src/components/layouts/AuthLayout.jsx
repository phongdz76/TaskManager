import React, { useContext } from "react";
import { MdTaskAlt } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/userContext";
import UI_IMG from "../../assets/images/auth-img.png";

export default function AuthLayout({ children }) {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const handleGoDashboard = () => {
    if (user?.role === "admin") {
      navigate("/admin/dashboard");
      return;
    }

    if (user?.role === "user") {
      navigate("/user/dashboard");
      return;
    }

    navigate("/login");
  };

  return (
    <div className="flex min-h-screen">
      <div className="w-full md:w-[55vw] lg:w-[50vw] relative flex flex-col min-h-screen">
        <button
          type="button"
          onClick={handleGoDashboard}
          className="flex items-center gap-2 px-6 md:px-12 py-6 shrink-0 text-left"
          aria-label="Go to dashboard"
        >
          <MdTaskAlt className="text-blue-600 text-3xl" />
          <h2 className="text-2xl font-bold text-black">Task Manager</h2>
        </button>
        <div className="flex-1 px-6 md:px-12 pb-8 md:pb-10 flex items-start md:items-center justify-center">
          {children}
        </div>
      </div>

      <div className="hidden md:flex w-[45vw] lg:w-[50vw] h-screen sticky top-0 overflow-hidden bg-blue-500 items-center justify-center">
        <img
          src={UI_IMG}
          alt="UI"
          className="w-full h-full object-contain"
          style={{
            imageRendering: "-webkit-optimize-contrast",
            WebkitBackfaceVisibility: "hidden",
            transform: "translateZ(0)",
          }}
        />
      </div>
    </div>
  );
}
