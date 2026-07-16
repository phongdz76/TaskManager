import React, { useState } from "react";
import moment from "moment";
import { FaEdit, FaEye, FaThumbtack, FaTrash, FaUser } from "react-icons/fa";

const STATUS_STYLES = {
  Pending: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 border-yellow-200 dark:border-yellow-700/50",
  "In-Progress": "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700/50",
  Completed: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700/50",
};

const PRIORITY_STYLES = {
  Low: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/50",
  Medium: "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-700/50",
  High: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700/50",
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

const CreatorAvatar = ({ imageUrl, creatorName }) => {
  const [hasImageError, setHasImageError] = useState(false);
  const normalizedImageUrl =
    typeof imageUrl === "string" ? imageUrl.trim() : "";

  if (!normalizedImageUrl || hasImageError) {
    return (
      <div className="w-6 h-6 rounded-full border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 flex items-center justify-center mr-2">
        <FaUser size={11} />
      </div>
    );
  }

  return (
    <img
      src={normalizedImageUrl}
      alt={creatorName}
      referrerPolicy="no-referrer"
      className="w-6 h-6 rounded-full object-cover mr-2 border border-gray-200 dark:border-slate-700"
      onError={() => setHasImageError(true)}
    />
  );
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
          <tr className="border-b border-gray-100 dark:border-slate-700 uppercase text-xs tracking-wider text-gray-500 dark:text-gray-400">
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
                  className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors"
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
                        className="text-gray-800 dark:text-gray-100 font-semibold whitespace-normal wrap-break-word leading-6"
                        title={task.title}
                      >
                        {task.title}
                      </p>
                    </div>
                    {showDescription && task.description && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate max-w-65">
                        {task.description}
                      </p>
                    )}
                  </td>

                  <td className="py-4 px-4 align-top">
                    {task?.createdBy && typeof task.createdBy === "object" ? (
                      <div className="flex items-center">
                        <CreatorAvatar
                          imageUrl={task.createdBy.profileImageUrl}
                          creatorName={creatorName}
                        />
                        <span
                          className="text-sm text-gray-700 dark:text-gray-300 truncate"
                          title={creatorEmail}
                        >
                          {creatorName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500 italic">
                        Unknown
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-4 align-top">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      {checklist.total > 0
                        ? `${checklist.completed}/${checklist.total} completed`
                        : `No checklist (${checklist.progress}%)`}
                    </p>
                    <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
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
                        "bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700"
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
                        "bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </td>

                  <td className="py-4 px-4 align-top text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {task.createdAt
                      ? moment(task.createdAt).format("MMM DD, YYYY")
                      : "N/A"}
                  </td>

                  <td className="py-4 px-4 align-top text-sm">
                    <div className="font-medium text-gray-500 dark:text-gray-300">
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
                              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30"
                              : "text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400"
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
                          className="p-2 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors"
                          title="View Task Details"
                        >
                          <FaEye size={16} />
                        </button>
                      )}

                      {showEditAction && (
                        <button
                          onClick={() => onEditTask(task)}
                          disabled={!canEdit}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:text-gray-300 dark:disabled:text-gray-600 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          title={canEdit ? "Edit Task" : editForbiddenTitle}
                        >
                          <FaEdit size={16} />
                        </button>
                      )}

                      {showDeleteAction && (
                        <button
                          onClick={() => onDeleteTask(task)}
                          disabled={!canDelete}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:text-gray-300 dark:disabled:text-gray-600 disabled:hover:bg-transparent disabled:cursor-not-allowed"
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
              <td colSpan="8" className="py-10 text-center text-gray-500 dark:text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
