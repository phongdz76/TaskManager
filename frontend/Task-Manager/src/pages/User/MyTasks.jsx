import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import useUserAuth from "../../hooks/useUserAuth";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import {
  FaCheckCircle,
  FaClock,
  FaEdit,
  FaEye,
  FaPlus,
  FaSearch,
  FaSpinner,
  FaTasks,
  FaThumbtack,
  FaTrash,
} from "react-icons/fa";
import moment from "moment";
import Pagination from "../../components/Pagination";

const STATUS_FILTERS = ["All", "Pending", "In-Progress", "Completed"];

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

const SummaryCard = ({ title, value, icon, bgColor, textColor }) => (
  <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value || 0}</h3>
    </div>
    <div className={`p-3 rounded-xl ${bgColor} ${textColor}`}>{icon}</div>
  </div>
);

const getChecklistProgress = (task) => {
  const checklist = Array.isArray(task?.todoChecklist)
    ? task.todoChecklist
    : [];
  const total = checklist.length;

  if (total === 0) {
    return {
      total: 0,
      completed: 0,
      progress: typeof task?.progress === "number" ? task.progress : 0,
    };
  }

  const completed =
    typeof task.completedTodoCount === "number"
      ? task.completedTodoCount
      : checklist.filter((item) => item.completed).length;

  return {
    total,
    completed,
    progress: Math.round((completed / total) * 100),
  };
};

const getUserId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return value._id.toString();
  return "";
};

export default function MyTasks() {
  const { user } = useUserAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const isTaskCreator = (task) => {
    return getUserId(task?.createdBy) === getUserId(user);
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await axiosInstance.put(API_PATHS.TASKS.UPDATE_STATUS(taskId), {
        status: newStatus,
      });
      toast.success(`Status changed to ${newStatus}`);
      fetchTasks();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update status");
    }
  };

  const handleTogglePinTask = async (taskId) => {
    try {
      await axiosInstance.patch(API_PATHS.TASKS.TOGGLE_PIN(taskId));
      toast.success("Task pin status updated!");
      fetchTasks();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to toggle pin status",
      );
    }
  };

  const handleDeleteTask = async (task) => {
    if (!isTaskCreator(task)) {
      toast.error("You can only delete tasks you created");
      return;
    }

    const shouldDelete = window.confirm(
      `Delete task "${task.title}"? This action cannot be undone.`,
    );

    if (!shouldDelete) return;

    try {
      await axiosInstance.delete(API_PATHS.TASKS.DELETE(task._id));
      toast.success("Task deleted successfully");
      fetchTasks();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete task");
    }
  };

  const fetchTasks = async (page = currentPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("limit", 10);
      if (statusFilter !== "All") {
        params.set("status", statusFilter);
      }

      const response = await axiosInstance.get(
        `${API_PATHS.TASKS.GET_ALL_TASKS}?${params.toString()}`,
      );

      setTasks(Array.isArray(response?.data?.tasks) ? response.data.tasks : []);
      setSummary(
        response?.data?.statusSummary || {
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
        },
      );
      setPagination(response?.data?.pagination || null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(currentPage);
  }, [statusFilter, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || (pagination && newPage > pagination.totalPages)) return;
    setCurrentPage(newPage);
  };

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return tasks;

    return tasks.filter((task) => {
      const createdByName =
        task?.createdBy?.username || task?.createdBy?.name || "";
      const createdByEmail = task?.createdBy?.email || "";

      return (
        task?.title?.toLowerCase().includes(query) ||
        createdByName.toLowerCase().includes(query) ||
        createdByEmail.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, tasks]);

  return (
    <DashboardLayout activeMenu="My Tasks">
      <div className="max-w-7xl mx-auto pt-4 pb-10 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Tasks</h1>
            <p className="mt-2 text-gray-500">
              Track your assigned and created tasks, then open details to update
              checklist progress.
            </p>
          </div>

          <button
            onClick={fetchTasks}
            disabled={loading}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm flex items-center disabled:opacity-60"
          >
            <FaSpinner className={`mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SummaryCard
            title="Total Tasks"
            value={summary.total}
            icon={<FaTasks size={20} />}
            bgColor="bg-indigo-50"
            textColor="text-indigo-600"
          />
          <SummaryCard
            title="Pending"
            value={summary.pending}
            icon={<FaClock size={20} />}
            bgColor="bg-yellow-50"
            textColor="text-yellow-600"
          />
          <SummaryCard
            title="In Progress"
            value={summary.inProgress}
            icon={<FaSpinner size={20} />}
            bgColor="bg-blue-50"
            textColor="text-blue-600"
          />
          <SummaryCard
            title="Completed"
            value={summary.completed}
            icon={<FaCheckCircle size={20} />}
            bgColor="bg-green-50"
            textColor="text-green-600"
          />
        </div>

        <div className="mt-8 bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold text-gray-800">Task List</h3>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400" size={14} />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Search by title or creator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {STATUS_FILTERS.map((status) => (
                  <option key={status} value={status}>
                    {status === "In-Progress" ? "In Progress" : status}
                  </option>
                ))}
              </select>

              <button
                onClick={() => navigate("/user/create-task")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
              >
                <FaPlus size={12} />
                Create New Task
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <FaSpinner className="animate-spin text-blue-500" size={28} />
              <p className="mt-3 text-sm text-gray-500">Loading tasks...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-225 text-left">
                <thead>
                  <tr className="border-b border-gray-100 uppercase text-xs tracking-wider text-gray-500">
                    <th className="pb-4 px-4 font-semibold w-[28%]">Title</th>
                    <th className="pb-4 px-4 font-semibold w-[18%]">
                      Created By
                    </th>
                    <th className="pb-4 px-4 font-semibold w-[14%]">
                      Checklist
                    </th>
                    <th className="pb-4 px-4 font-semibold w-[12%]">Status</th>
                    <th className="pb-4 px-4 font-semibold w-[10%]">
                      Priority
                    </th>
                    <th className="pb-4 px-4 font-semibold w-[12%]">
                      Due Date
                    </th>
                    <th className="pb-4 px-4 font-semibold w-[16%] text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => {
                      const checklist = getChecklistProgress(task);
                      const creatorName =
                        task?.createdBy?.username ||
                        task?.createdBy?.name ||
                        task?.createdBy?.email ||
                        "Unknown";
                      const isCreator = isTaskCreator(task);
                      const isPinned = Boolean(task?.isPinned);

                      return (
                        <tr
                          key={task._id}
                          className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="py-4 px-4 align-top">
                            <div className="flex items-start gap-2">
                              {isPinned && (
                                <FaThumbtack
                                  className="text-indigo-500 mt-1 shrink-0"
                                  size={13}
                                />
                              )}
                              <p className="font-semibold text-gray-800">
                                {task.title}
                              </p>
                            </div>
                            {task.description && (
                              <p className="mt-1 text-xs text-gray-500 truncate max-w-65">
                                {task.description}
                              </p>
                            )}
                          </td>

                          <td className="py-4 px-4 align-top">
                            <div className="flex items-center">
                              {task?.createdBy?.profileImageUrl ? (
                                <img
                                  src={task.createdBy.profileImageUrl}
                                  alt={creatorName}
                                  className="w-7 h-7 rounded-full object-cover mr-2 border border-gray-200"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-2">
                                  {creatorName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span
                                className="text-sm text-gray-700 truncate"
                                title={task?.createdBy?.email || creatorName}
                              >
                                {creatorName}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-4 align-top">
                            <p className="text-xs font-medium text-gray-600">
                              {checklist.completed}/{checklist.total} completed
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
                                handleUpdateTaskStatus(task._id, e.target.value)
                              }
                              className={`appearance-none cursor-pointer px-2.5 py-1 rounded-full text-xs font-medium border outline-none transition-colors ${
                                STATUS_STYLES[task.status] ||
                                "bg-gray-50 text-gray-700 border-gray-200"
                              }`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="In-Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </td>

                          <td className="py-4 px-4 align-top">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${PRIORITY_STYLES[task.priority] || "bg-gray-50 text-gray-700 border-gray-200"}`}
                            >
                              {task.priority}
                            </span>
                          </td>

                          <td className="py-4 px-4 align-top text-sm text-gray-500 font-medium">
                            {task.dueDate
                              ? moment(task.dueDate).format("MMM DD, YYYY")
                              : "No due date"}
                          </td>

                          <td className="py-4 px-4 align-top text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleTogglePinTask(task._id)}
                                className={`p-2 rounded-lg transition-colors ${isPinned ? "text-indigo-600 bg-indigo-50" : "text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"}`}
                                title={isPinned ? "Unpin" : "Pin to top"}
                              >
                                <FaThumbtack size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  navigate(`/user/task-details/${task._id}`)
                                }
                                className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                                title="View Task Details"
                              >
                                <FaEye size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  navigate(`/user/tasks/edit/${task._id}`)
                                }
                                disabled={!isCreator}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                                title={
                                  isCreator
                                    ? "Edit Task"
                                    : "Only creator can edit task"
                                }
                              >
                                <FaEdit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task)}
                                disabled={!isCreator}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                                title={
                                  isCreator
                                    ? "Delete Task"
                                    : "Only creator can delete task"
                                }
                              >
                                <FaTrash size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="py-10 text-center text-gray-500"
                      >
                        No tasks found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalTasks}
              itemLabel="tasks"
              onPageChange={handlePageChange}
              containerClassName="mt-6 pt-4 border-t border-gray-100"
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
