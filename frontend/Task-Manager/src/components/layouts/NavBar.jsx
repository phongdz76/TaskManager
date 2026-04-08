import React from "react";
import SideMenu from "./SideMenu";
import { HiOutlineMenuAlt3, HiOutlineX } from "react-icons/hi";
import { Link } from "react-router-dom";
import { useState } from "react";
import { MdTaskAlt } from "react-icons/md";

export default function NavBar({ activeMenu }) {
  const [openSideMenu, setOpenSideMenu] = useState(false);
  return (
    <div className="flex gap-5 bg-white border border-b border-gray-200/50 backdrop-blur-[2px] px-7 py-4 sticky top-0 z-30">
      <button
        className="block lg:hidden text-black"
        onClick={() => {
          setOpenSideMenu(!openSideMenu);
        }}
      >
        {openSideMenu ? (
          <HiOutlineX className="text-2xl" />
        ) : (
          <HiOutlineMenuAlt3 className="text-2xl" />
        )}
      </button>

      <div className="hidden lg:flex items-center gap-2">
        <MdTaskAlt className="text-blue-600 text-3xl" />
        <h2 className="text-lg font-bold text-black">Task Manager</h2>
      </div>

      {openSideMenu && (
        <div className="fixed top-15.25 -ml-4 bg-white">
          <SideMenu activeMenu={activeMenu} />
        </div>
      )}
    </div>
  );
}
