import React from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import useUserAuth from "../../hooks/useUserAuth";

export default function UserTeamMembers() {
  useUserAuth();

  return (
    <DashboardLayout activeMenu="Team Members">
      <div className="UserTeamMembers">
        <h1 className="text-3xl font-semibold">Team Members</h1>
        <p className="mt-2 text-gray-600">See members in your working team.</p>
      </div>
    </DashboardLayout>
  );
}
