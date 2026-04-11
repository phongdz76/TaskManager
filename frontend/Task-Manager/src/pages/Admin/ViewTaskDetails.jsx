import React from "react";
import useUserAuth from "../../hooks/useUserAuth";
import TaskDetailsPage from "../../components/tasks/TaskDetailsPage";

export default function ViewTaskDetails() {
  useUserAuth();

  return (
    <TaskDetailsPage activeMenu="Manager My Task" backPath="/admin/tasks" />
  );
}
