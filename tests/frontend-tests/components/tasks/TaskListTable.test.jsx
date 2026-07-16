import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "../../../test-utils.jsx";
import TaskListTable from "@frontend/components/tasks/TaskListTable.jsx";

const mockTasks = [
  {
    _id: "task1",
    title: "Write unit tests",
    description: "Write tests for frontend components",
    status: "Pending",
    priority: "High",
    isPinned: true,
    progress: 0,
    todoChecklist: [{ completed: false }, { completed: true }], // progress should be 50%
    createdAt: "2023-01-01T00:00:00.000Z",
    dueDate: "2023-01-05T00:00:00.000Z",
    createdBy: {
      username: "Alice",
    },
  },
  {
    _id: "task2",
    title: "Deploy application",
    status: "Completed",
    priority: "High",
    isPinned: false,
    progress: 100,
    todoChecklist: [],
    createdAt: "2023-01-02T00:00:00.000Z",
    dueDate: "2022-12-01T00:00:00.000Z", // Overdue, but Completed so shouldn't show Overdue badge
    createdBy: null,
  },
];

describe("TaskListTable Component", () => {
  it("should render empty message when no tasks", () => {
    render(<TaskListTable tasks={[]} emptyMessage="No tasks found dummy" />);
    expect(screen.getByText("No tasks found dummy")).toBeInTheDocument();
  });

  it("should render task list with correct info", () => {
    render(
      <TaskListTable 
        tasks={mockTasks} 
        showDescription={true} 
      />
    );

    // Titles
    expect(screen.getByText("Write unit tests")).toBeInTheDocument();
    expect(screen.getByText("Deploy application")).toBeInTheDocument();

    // Descriptions
    expect(screen.getByText("Write tests for frontend components")).toBeInTheDocument();

    // Creators
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();

    // Checklists / Progress
    // task1 has 2 items, 1 completed => 1/2 completed
    expect(screen.getByText("1/2 completed")).toBeInTheDocument();
    // task2 has no checklist => No checklist (100%)
    expect(screen.getByText("No checklist (100%)")).toBeInTheDocument();

    // Badges
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument(); // completed task is not overdue
  });

  it("should trigger callbacks when actions are clicked", () => {
    const onTogglePinTask = vi.fn();
    const onViewTask = vi.fn();
    const onEditTask = vi.fn();
    const onDeleteTask = vi.fn();
    const onStatusChange = vi.fn();

    render(
      <TaskListTable 
        tasks={[mockTasks[0]]}
        onTogglePinTask={onTogglePinTask}
        onViewTask={onViewTask}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
        onStatusChange={onStatusChange}
      />
    );

    // Unpin button (since isPinned is true)
    const pinBtn = screen.getByTitle("Unpin");
    fireEvent.click(pinBtn);
    expect(onTogglePinTask).toHaveBeenCalledWith("task1");

    // View button
    const viewBtn = screen.getByTitle("View Task Details");
    fireEvent.click(viewBtn);
    expect(onViewTask).toHaveBeenCalledWith(mockTasks[0]);

    // Edit button
    const editBtn = screen.getByTitle("Edit Task");
    fireEvent.click(editBtn);
    expect(onEditTask).toHaveBeenCalledWith(mockTasks[0]);

    // Delete button
    const deleteBtn = screen.getByTitle("Delete Task");
    fireEvent.click(deleteBtn);
    expect(onDeleteTask).toHaveBeenCalledWith(mockTasks[0]);

    // Status change
    const statusSelect = screen.getByRole("combobox");
    fireEvent.change(statusSelect, { target: { value: "In-Progress" } });
    expect(onStatusChange).toHaveBeenCalledWith("task1", "In-Progress");
  });

  it("should disable edit and delete actions when forbidden", () => {
    render(
      <TaskListTable 
        tasks={[mockTasks[0]]}
        onEditTask={vi.fn()}
        onDeleteTask={vi.fn()}
        canEditTask={() => false}
        canDeleteTask={() => false}
        editForbiddenTitle="Nope edit"
        deleteForbiddenTitle="Nope delete"
      />
    );

    const editBtn = screen.getByTitle("Nope edit");
    expect(editBtn).toBeDisabled();

    const deleteBtn = screen.getByTitle("Nope delete");
    expect(deleteBtn).toBeDisabled();
  });
});
