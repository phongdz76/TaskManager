import React from "react";
import useUserAuth from "../../hooks/useUserAuth";

export default function UserDashboard() {
  useUserAuth();
  return (
    <div className="UserDashboard">
      <h1 className="text-3xl">User Dashboard</h1>
    </div>
  );
}
