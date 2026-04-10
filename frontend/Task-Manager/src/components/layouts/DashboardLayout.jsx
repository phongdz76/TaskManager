import React, { useContext } from "react";
import NavBar from "./NavBar";
import { UserContext } from "../../context/userContext";
import SideMenu from "./SideMenu";

export default function DashboardLayout({ children, activeMenu }) {
  const { user } = useContext(UserContext);
  return (
    <div className="">
      <NavBar activeMenu={activeMenu} />

      {user && (
        <div className="flex">
          <div className="max-[1080px]:hidden">
            <SideMenu activeMenu={activeMenu} />
          </div>
          <div className="flex-1 min-w-0 px-4 sm:px-5 pb-10">{children}</div>
        </div>
      )}
    </div>
  );
}
