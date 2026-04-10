import React from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import useUserAuth from "../../hooks/useUserAuth";

export default function TeamMembers() {
  useUserAuth();

  return (
    <DashboardLayout activeMenu="Team Members">
      <div className="TeamMembers">
        <h1 className="text-3xl font-semibold">Team Members</h1>
        <p className="mt-2 text-gray-600">
          View and manage your team members here.
        </p>
      </div>
    </DashboardLayout>
  );
}
