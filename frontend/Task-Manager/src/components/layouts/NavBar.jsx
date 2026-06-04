import React from "react";
import SideMenu from "./SideMenu";
import { HiOutlineMenu, HiOutlineX, HiOutlineSun, HiOutlineMoon } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { MdTaskAlt } from "react-icons/md";
import { UserContext } from "../../context/userContext";
import NotificationDropdown from "./NotificationDropdown";

export default function NavBar({ activeMenu }) {
  const { user } = useContext(UserContext);
  const [openSideMenu, setOpenSideMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        return savedTheme === "dark";
      }
      return false;
    }
    return false;
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const [isVietnamese, setIsVietnamese] = useState(() => {
    if (typeof window !== "undefined") {
      return document.cookie.includes("googtrans=/en/vi");
    }
    return false;
  });

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const toggleLanguage = () => {
    if (isVietnamese) {
      document.cookie = "googtrans=/en/en; path=/";
      document.cookie = "googtrans=/en/en; domain=" + window.location.hostname + "; path=/";
    } else {
      document.cookie = "googtrans=/en/vi; path=/";
      document.cookie = "googtrans=/en/vi; domain=" + window.location.hostname + "; path=/";
    }
    window.location.reload();
  };

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
    <div className="flex gap-5 items-center justify-between bg-white dark:bg-slate-800 border-b border-gray-200/50 dark:border-slate-700 backdrop-blur-[2px] px-7 py-4 sticky top-0 z-30 transition-colors duration-300">
      <div className="flex items-center gap-5">
        <button
          className="block lg:hidden text-black dark:text-white"
          onClick={() => {
            setOpenSideMenu(!openSideMenu);
          }}
        >
          {openSideMenu ? (
            <HiOutlineX className="text-2xl" />
          ) : (
            <HiOutlineMenu className="text-2xl" />
          )}
        </button>

        <button
          type="button"
          onClick={handleGoDashboard}
          className="flex items-center gap-2"
          aria-label="Go to dashboard"
        >
          <MdTaskAlt className="text-blue-600 text-3xl" />
          <h2 className="text-lg font-bold text-black dark:text-white">Task Manager</h2>
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* Language Toggle Button */}
        <button
          onClick={toggleLanguage}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-200 dark:hover:bg-slate-600 transition-colors"
          aria-label="Toggle Language"
        >
          {isVietnamese ? "VN" : "EN"}
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <HiOutlineMoon className="text-2xl" /> : <HiOutlineSun className="text-2xl" />}
        </button>
        <NotificationDropdown />
      </div>

      {openSideMenu && (
        <div className="fixed top-15.25 -ml-4 bg-white dark:bg-slate-800">
          <SideMenu activeMenu={activeMenu} />
        </div>
      )}
    </div>
  );
}
