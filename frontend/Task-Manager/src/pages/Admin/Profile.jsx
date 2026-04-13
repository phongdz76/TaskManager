import React from "react";
import useUserAuth from "../../hooks/useUserAuth";
import ProfilePage from "../../components/profile/ProfilePage";

export default function AdminProfile() {
  useUserAuth();

  return <ProfilePage activeMenu="Profile" title="Profile 😎" />;
}
