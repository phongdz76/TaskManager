import React, { useContext, useEffect, useState } from "react";
import { FaUser } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/userContext";
import { ADMIN_SIDE_MENU_DATA, USER_SIDE_MENU_DATA } from "../../utils/data";

export default function SideMenu({ activeMenu }) {
  const { user, clearUser } = useContext(UserContext);
  const [sideMenuData, setSideMenuData] = useState([]);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const navigate = useNavigate();

  const avatarUrl =
    user?.profileImageUrl?.trim?.() || user?.avatar?.trim?.() || "";

  const handleLogout = () => {
    clearUser();
    navigate("/login");
  };

  const handleClick = (route) => {
    if (route === "/logout") {
      handleLogout();
      return;
    }
    navigate(route);
  };

  useEffect(() => {
    if (user?.role === "admin") {
      setSideMenuData(ADMIN_SIDE_MENU_DATA);
    } else {
      setSideMenuData(USER_SIDE_MENU_DATA);
    }
  }, [user]);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [avatarUrl]);

  return (
    <div className="w-64 h-[calc(100vh-61px)] bg-white border-r border-gray-200/50 sticky top-15.25 p-3">
      <div className="flex flex-col items-center justify-center mb-6 pt-2">
        <div className="relative">
          {avatarUrl && !avatarLoadError ? (
            <img
              src={avatarUrl}
              alt="Profile Image"
              className="w-20 h-20 bg-slate-200 rounded-full object-cover"
              onError={() => setAvatarLoadError(true)}
            />
          ) : (
            <div className="w-20 h-20 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
              <FaUser className="text-3xl text-gray-500" />
            </div>
          )}
        </div>

        {user?.role === "admin" && (
          <div className="text-[10px] font-medium text-white bg-blue-600 px-3 py-0.5 rounded mt-1">
            Admin
          </div>
        )}

        <h5 className="text-gray-950 font-medium leading-6 mt-3">
          {user?.name || user?.username || "N/A"}
        </h5>
        <p className="text-sm text-gray-500">{user?.email || ""}</p>
      </div>

      {sideMenuData.map((item) => {
        const Icon = item.icon;
        const isActive = activeMenu === item.label;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleClick(item.path)}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left transition ${
              isActive
                ? "bg-blue-100 text-blue-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Icon className="text-lg" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
