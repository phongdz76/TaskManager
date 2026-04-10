import React from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import useUserAuth from "../../hooks/useUserAuth";
import ProfileEditor from "../../components/profile/ProfileEditor";

export default function UserProfile() {
  useUserAuth();

  return (
    <DashboardLayout activeMenu="Profile">
      <div className="UserProfile pt-4">
        <h1 className="text-3xl font-bold text-gray-800">Profile 😎</h1>
        <div className="mt-4">
          <ProfileEditor />
        </div>
      </div>
    </DashboardLayout>
  );
}
