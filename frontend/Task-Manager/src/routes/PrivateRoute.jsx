import React from "react";
import { Outlet } from "react-router-dom";

export default function PrivateRoute({ allowedRoles }) {
  return <Outlet />;
}
