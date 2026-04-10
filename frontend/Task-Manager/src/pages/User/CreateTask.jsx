import React from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import useUserAuth from "../../hooks/useUserAuth";

export default function CreateTask() {
  useUserAuth();

  return (
    <DashboardLayout activeMenu="Create Task">
      <div className="CreateTask">
        <h1 className="text-3xl font-semibold">Create Task</h1>
      </div>
    </DashboardLayout>
  );
}
