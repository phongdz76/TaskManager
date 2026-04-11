import React from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import useUserAuth from "../../hooks/useUserAuth";

export default function ManagerAllTasks() {
  useUserAuth();

  return (
    <DashboardLayout activeMenu="Manager All Task">
      <div className="AllUserTasks">
        <h1 className="text-3xl font-semibold">Manager All Task User</h1>
        <p className="mt-2 text-gray-600">
          Track and manage tasks across all users.
        </p>
      </div>
    </DashboardLayout>
  );
}
