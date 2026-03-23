import React from "react";
import { AiOutlineCheckCircle } from "react-icons/ai";

export default function LoadingRedirect({ message, role }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Success Icon */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <AiOutlineCheckCircle className="w-12 h-12 text-green-600" />
        </div>
        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full bg-green-200 animate-ping opacity-20"></div>
      </div>

      {/* Message */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{message}</h2>
        <p className="text-gray-600">
          Redirecting to {role === "admin" ? "Admin" : "User"} Dashboard...
        </p>
      </div>

      {/* Loading Dots */}
      <div className="flex gap-2">
        <div
          className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        ></div>
        <div
          className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        ></div>
        <div
          className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        ></div>
      </div>

      {/* Progress Bar */}
      <div className="w-64 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full animate-progress"></div>
      </div>

      <style jsx>{`
        @keyframes progress {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }
        .animate-progress {
          animation: progress 2s ease-in-out;
        }
      `}</style>
    </div>
  );
}
