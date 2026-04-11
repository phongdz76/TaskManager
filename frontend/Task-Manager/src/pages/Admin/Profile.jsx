import React from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import useUserAuth from "../../hooks/useUserAuth";
import ProfileEditor from "../../components/profile/ProfileEditor";
import PageContainer from "../../components/common/PageContainer";

export default function AdminProfile() {
  useUserAuth();

  return (
    <DashboardLayout activeMenu="Profile">
      <PageContainer>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800">Profile 😎</h1>
          <div className="mt-4">
            <ProfileEditor />
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
}
