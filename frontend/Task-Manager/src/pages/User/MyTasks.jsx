import React from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import useUserAuth from "../../hooks/useUserAuth";

export default function MyTasks() {
  useUserAuth();

  return (
    <DashboardLayout activeMenu="My Tasks">
      <div className="MyTasks">
        <h1 className="text-3xl font-semibold">My Tasks</h1>
      </div>
    </DashboardLayout>
  );
}
