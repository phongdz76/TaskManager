import React from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import useUserAuth from "../../hooks/useUserAuth";

export default function ManagerUser() {
  useUserAuth();

  return (
    <DashboardLayout activeMenu="Manager User">
      <div className="ManagerUser">
        <h1 className="text-3xl font-semibold">Manager User</h1>
      </div>
    </DashboardLayout>
  );
}
