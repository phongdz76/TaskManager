import React from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import ProfileEditor from "./ProfileEditor";
import PageContainer from "../common/PageContainer";

export default function ProfilePage({
  activeMenu = "Profile",
  title = "Profile 😎",
}) {
  return (
    <DashboardLayout activeMenu={activeMenu}>
      <PageContainer>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
          <div className="mt-4">
            <ProfileEditor />
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
}
