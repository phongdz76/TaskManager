import React, { useContext } from "react";
import { UserContext } from "../../context/userContext";
import useUserAuth from "../../hooks/useUserAuth";
import DashboardLayout from "../../components/layouts/DashboardLayout";

export default function Dashboard() {
  useUserAuth();

  const { user } = useContext(UserContext);
  const token = localStorage.getItem("token");

  return (
    <DashboardLayout>
      <h1 className="text-3xl">Admin Dashboard</h1>
    </DashboardLayout>
  );
}
