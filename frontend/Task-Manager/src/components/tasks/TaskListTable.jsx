import React from "react";
import moment from "moment";
import { FaEdit, FaEye, FaThumbtack, FaTrash } from "react-icons/fa";

const STATUS_STYLES = {
  Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  "In-Progress": "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-green-50 text-green-700 border-green-200",
};

const PRIORITY_STYLES = {
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-orange-50 text-orange-700 border-orange-200",
  High: "bg-red-50 text-red-700 border-red-200",
};

const getStatusBasedProgress = (task) => {
  const rawProgress =
    typeof task?.progress === "number"
      ? Math.max(0, Math.min(100, task.progress))
      : 0;

  if (task?.status === "Completed") return 100;
  if (task?.status === "Pending") return 0;
  if (task?.status === "In-Progress") {
    return rawProgress > 0 ? Math.min(rawProgress, 99) : 50;
  }

  return rawProgress;
};

const getChecklistProgress = (task) => {
  const checklist = Array.isArray(task?.todoChecklist)
    ? task.todoChecklist
    : [];
  const total = checklist.length;

  if (total === 0) {
    return {
      total: 0,
      completed: 0,
      progress: getStatusBasedProgress(task),
    };
  }

  const completed =
    typeof task.completedTodoCount === "number"
      ? task.completedTodoCount
      : checklist.filter((item) => item.completed).length;

  const safeCompleted = Math.max(0, Math.min(total, completed));

  return {
    total,
    completed: safeCompleted,
    progress: Math.round((safeCompleted / total) * 100),
  };
};

const getCreatorName = (createdBy) => {
  if (!createdBy || typeof createdBy !== "object") {
    return "Unknown";
  }

  return createdBy.username || createdBy.name || createdBy.email || "Unknown";
};

export default function TaskListTable({
  tasks = [],
  emptyMessage = "No tasks found.",
  showDescription = false,
  showPinIndicator = true,
  onTogglePinTask,
  onViewTask,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  canEditTask = () => true,
  canDeleteTask = () => true,
  canPinTask = () => true,
  hideEditWhenForbidden = false,
  hideDeleteWhenForbidden = false,
  editForbiddenTitle = "Only creator can edit task",
  deleteForbiddenTitle = "Only creator can delete task",
}) {
  const hasTasks = Array.isArray(tasks) && tasks.length > 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-225 text-left">
        <thead>
          <tr className="border-b border-gray-100 uppercase text-xs tracking-wider text-gray-500">
            <th className="pb-4 px-4 font-semibold w-[24%]">Title</th>
            <th className="pb-4 px-4 font-semibold w-[16%]">Created By</th>
            <th className="pb-4 px-4 font-semibold w-[12%]">Checklist</th>
            <th className="pb-4 px-4 font-semibold w-[11%]">Status</th>
            <th className="pb-4 px-4 font-semibold w-[10%]">Priority</th>
            <th className="pb-4 px-4 font-semibold w-[11%]">Created</th>
            <th className="pb-4 px-4 font-semibold w-[12%]">Due Date</th>
            <th className="pb-4 px-4 font-semibold w-[12%] text-right">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {hasTasks ? (
            tasks.map((task) => {
              const checklist = getChecklistProgress(task);
              const creatorName = getCreatorName(task?.createdBy);
              const creatorEmail =
                task?.createdBy?.email || creatorName || "Unknown";
              const isPinned = Boolean(task?.isPinned);

              const canPin = canPinTask(task);
              const canEdit = canEditTask(task);
              const canDelete = canDeleteTask(task);

              const showPinAction = typeof onTogglePinTask === "function";
              const showViewAction = typeof onViewTask === "function";
              const showEditAction =
                typeof onEditTask === "function" &&
                (!hideEditWhenForbidden || canEdit);
              const showDeleteAction =
                typeof onDeleteTask === "function" &&
                (!hideDeleteWhenForbidden || canDelete);

              return (
                <tr
                  key={task._id}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="py-4 px-4 align-top">
                    <div className="flex items-start gap-2">
                      {showPinIndicator && isPinned && (
                        <FaThumbtack
                          className="text-indigo-500 mt-1 shrink-0"
                          size={13}
                        />
                      )}
                      <p
                        className="text-gray-800 font-semibold whitespace-normal wrap-break-word leading-6"
                        title={task.title}
                      >
                        {task.title}
                      </p>
                    </div>
                    {showDescription && task.description && (
                      <p className="mt-1 text-xs text-gray-500 truncate max-w-65">
                        {task.description}
                      </p>
                    )}
                  </td>

                  <td className="py-4 px-4 align-top">
                    {task?.createdBy && typeof task.createdBy === "object" ? (
                      <div className="flex items-center">
                        {task.createdBy.profileImageUrl ? (
                          <img
                            src={task.createdBy.profileImageUrl}
                            alt={creatorName}
                            className="w-6 h-6 rounded-full object-cover mr-2 border border-gray-200"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-2">
                            {creatorName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span
                          className="text-sm text-gray-700 truncate"
                          title={creatorEmail}
                        >
                          {creatorName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">
                        Unknown
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-4 align-top">
                    <p className="text-xs font-medium text-gray-600">
                      {checklist.total > 0
                        ? `${checklist.completed}/${checklist.total} completed`
                        : `No checklist (${checklist.progress}%)`}
                    </p>
                    <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${checklist.progress}%` }}
                      ></div>
                    </div>
                  </td>

                  <td className="py-4 px-4 align-top">
                    <select
                      value={task.status}
                      onChange={(e) =>
                        onStatusChange?.(task._id, e.target.value)
                      }
                      disabled={typeof onStatusChange !== "function"}
                      className={`appearance-none px-2.5 py-1 rounded-full text-xs font-medium border outline-none transition-colors ${
                        STATUS_STYLES[task.status] ||
                        "bg-gray-50 text-gray-700 border-gray-200"
                      } ${
                        typeof onStatusChange === "function"
                          ? "cursor-pointer"
                          : "cursor-not-allowed opacity-60"
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In-Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>

                  <td className="py-4 px-4 align-top">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        PRIORITY_STYLES[task.priority] ||
                        "bg-gray-50 text-gray-700 border-gray-200"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </td>

                  <td className="py-4 px-4 align-top text-sm text-gray-500 font-medium">
                    {task.createdAt
                      ? moment(task.createdAt).format("MMM DD, YYYY")
                      : "N/A"}
                  </td>

                  <td className="py-4 px-4 align-top text-sm">
                    <div className="font-medium text-gray-500">
                      {task.dueDate
                        ? moment(task.dueDate).format("MMM DD, YYYY")
                        : "No due date"}
                    </div>
                    {task.dueDate &&
                      task.status !== "Completed" &&
                      moment(task.dueDate).isBefore(moment(), "day") && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-lg text-[11px] font-bold tracking-wide uppercase">
                          Overdue
                        </span>
                      )}
                  </td>

                  <td className="py-4 px-4 align-top text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {showPinAction && (
                        <button
                          onClick={() => onTogglePinTask(task._id)}
                          disabled={!canPin}
                          className={`p-2 rounded-lg transition-colors ${
                            isPinned
                              ? "text-indigo-600 bg-indigo-50"
                              : "text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
                          } ${
                            canPin
                              ? ""
                              : "opacity-60 cursor-not-allowed hover:bg-transparent"
                          }`}
                          title={isPinned ? "Unpin" : "Pin to top"}
                        >
                          <FaThumbtack size={16} />
                        </button>
                      )}

                      {showViewAction && (
                        <button
                          onClick={() => onViewTask(task)}
                          className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          title="View Task Details"
                        >
                          <FaEye size={16} />
                        </button>
                      )}

                      {showEditAction && (
                        <button
                          onClick={() => onEditTask(task)}
                          disabled={!canEdit}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          title={canEdit ? "Edit Task" : editForbiddenTitle}
                        >
                          <FaEdit size={16} />
                        </button>
                      )}

                      {showDeleteAction && (
                        <button
                          onClick={() => onDeleteTask(task)}
                          disabled={!canDelete}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          title={
                            canDelete ? "Delete Task" : deleteForbiddenTitle
                          }
                        >
                          <FaTrash size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="8" className="py-10 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
