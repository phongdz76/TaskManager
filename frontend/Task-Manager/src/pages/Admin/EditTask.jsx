import React from "react";
import { useLocation } from "react-router-dom";
import useUserAuth from "../../hooks/useUserAuth";
import EditTaskPage from "../../components/tasks/EditTaskPage";

export default function EditTask() {
  useUserAuth();
  const { search } = useLocation();

  const isFromAllUserTasks =
    new URLSearchParams(search).get("source") === "all-user-tasks";
  const targetPath = isFromAllUserTasks
    ? "/admin/all-user-tasks"
    : "/admin/tasks";
  const activeMenu = isFromAllUserTasks
    ? "Manager All Task"
    : "Manager My Task";

  return (
    <EditTaskPage
      activeMenu={activeMenu}
      backToTasksPath={targetPath}
      submitRedirectPath={targetPath}
    />
  );
}
