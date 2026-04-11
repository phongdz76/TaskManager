import React, { useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import toast from "react-hot-toast";
import { FaFileExcel, FaSpinner } from "react-icons/fa";

export default function ReportDownloadButton({
  apiPath,
  fileName = "report.xlsx",
  buttonText = "Export Report",
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await axiosInstance.get(apiPath, {
        responseType: "blob", // Important for downloading files
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
      toast.success(`${fileName} downloaded successfully`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download report");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors shadow-sm flex items-center disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
    >
      {downloading ? (
        <FaSpinner className="mr-2 animate-spin" />
      ) : (
        <FaFileExcel className="mr-2" />
      )}
      {buttonText}
    </button>
  );
}
