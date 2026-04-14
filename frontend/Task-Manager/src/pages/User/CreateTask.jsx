import React from "react";
import useUserAuth from "../../hooks/useUserAuth";
import CreateTaskPage from "../../components/tasks/CreateTaskPage";

export default function CreateTask() {
  useUserAuth();

  return (
    <CreateTaskPage
      description="Fill in the details below to create a new task."
      successMode="reset"
      successMessage="Task created successfully. You can create another task."
      emptyAssigneeText="You (default)"
    />
  );
}
