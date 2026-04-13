import React from "react";
import SideMenu from "./SideMenu";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import { MdTaskAlt } from "react-icons/md";
import { UserContext } from "../../context/userContext";
import NotificationDropdown from "./NotificationDropdown";

export default function NavBar({ activeMenu }) {
  const { user } = useContext(UserContext);
  const [openSideMenu, setOpenSideMenu] = useState(false);
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
    <div className="flex gap-5 items-center justify-between bg-white border border-b border-gray-200/50 backdrop-blur-[2px] px-7 py-4 sticky top-0 z-30">
      <div className="flex items-center gap-5">
        <button
          className="block lg:hidden text-black"
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
          <h2 className="text-lg font-bold text-black">Task Manager</h2>
        </button>
      </div>

      <div className="flex items-center gap-4">
         <NotificationDropdown />
      </div>

      {openSideMenu && (
        <div className="fixed top-15.25 -ml-4 bg-white">
          <SideMenu activeMenu={activeMenu} />
        </div>
      )}
    </div>
  );
}
