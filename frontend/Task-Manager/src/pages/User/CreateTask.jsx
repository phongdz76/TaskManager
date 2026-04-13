import React from "react";
import useUserAuth from "../../hooks/useUserAuth";
import CreateTaskPage from "../../components/tasks/CreateTaskPage";

export default function CreateTask() {
  useUserAuth();

  return (
    <CreateTaskPage
      description="Fill in the details below to create a new task."
      successMode="navigate"
      successRedirectPath="/user/dashboard"
      successMessage="Task created successfully!"
      emptyAssigneeText="You (default)"
    />
  );
}
