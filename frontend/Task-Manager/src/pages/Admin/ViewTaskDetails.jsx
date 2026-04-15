import React from "react";
import { useLocation } from "react-router-dom";
import useUserAuth from "../../hooks/useUserAuth";
import TaskDetailsPage from "../../components/tasks/TaskDetailsPage";

export default function ViewTaskDetails() {
  useUserAuth();
  const { search } = useLocation();

  const isFromAllUserTasks =
    new URLSearchParams(search).get("source") === "all-user-tasks";
  const backPath = isFromAllUserTasks
    ? "/admin/all-user-tasks"
    : "/admin/tasks";
  const activeMenu = isFromAllUserTasks
    ? "Manager All Task"
    : "Manager My Task";

  return <TaskDetailsPage activeMenu={activeMenu} backPath={backPath} />;
}
