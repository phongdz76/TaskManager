import React from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import useUserAuth from "../../hooks/useUserAuth";

export default function ManagerTask() {
  useUserAuth();

  return (
    <DashboardLayout activeMenu="Manager My Task">
      <div className="ManagerTask">
        <h1 className="text-3xl font-semibold">Manager My Task</h1>
      </div>
    </DashboardLayout>
  );
}
