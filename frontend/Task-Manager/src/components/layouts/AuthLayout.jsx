import React from "react";
import { MdTaskAlt } from "react-icons/md";
import UI_IMG from "../../assets/images/auth-img.png";

export default function AuthLayout({ children }) {
  return (
    <div className="flex">
      <div className="w-screen h-screen md:w-[60vw] relative">
        <div className="absolute top-8 left-12 flex items-center gap-2 z-10">
          <MdTaskAlt className="text-blue-600 text-3xl" />
          <h2 className="text-2xl font-bold text-black">Task-Manager</h2>
        </div>
        <div className="w-full h-full flex items-center justify-center px-12">{children}</div>
      </div>

      <div className="hidden md:flex w-[40vw] h-screen overflow-hidden bg-blue-500 items-center justify-center">
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
