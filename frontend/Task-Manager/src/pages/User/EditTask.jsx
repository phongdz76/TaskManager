import React from "react";
import useUserAuth from "../../hooks/useUserAuth";
import EditTaskPage from "../../components/tasks/EditTaskPage";

export default function EditTask() {
  useUserAuth();

  return (
    <EditTaskPage
      activeMenu="My Tasks"
      backToTasksPath="/user/my-tasks"
      submitRedirectPath="/user/my-tasks"
    />
  );
}
