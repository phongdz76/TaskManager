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
  FaPlus,
  FaSearch,
  FaSpinner,
  FaTasks,
  FaExclamationCircle,
} from "react-icons/fa";
import Pagination from "../../components/Pagination";
import ReportDownloadButton from "../../components/ReportDownloadButton";
import PageContainer from "../../components/common/PageContainer";
import PageLoader from "../../components/common/PageLoader";
import TaskListTable from "../../components/tasks/TaskListTable";

const STATUS_FILTERS = [
  "All",
  "Pending",
  "In-Progress",
  "Completed",
  "Overdue",
];

const SummaryCard = ({ title, value, icon, bgColor, textColor }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
        {title}
      </p>
      <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        {value || 0}
      </h3>
    </div>
    <div className={`p-3 rounded-xl ${bgColor} ${textColor}`}>{icon}</div>
  </div>
);

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
    overdue: 0,
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
          overdue: 0,
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
      <PageContainer>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              My Tasks
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Track your assigned and created tasks, then open details to update
              checklist progress.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ReportDownloadButton
              apiPath={API_PATHS.REPORTS.EXPORT_MY_TASKS}
              fileName="my_tasks_report.xlsx"
              buttonText="Export My Tasks"
            />
            <button
              onClick={fetchTasks}
              disabled={loading}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm flex items-center disabled:opacity-60"
            >
              <FaSpinner className={`mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <SummaryCard
            title="Total Tasks"
            value={summary.total}
            icon={<FaTasks size={20} />}
            bgColor="bg-indigo-50 dark:bg-indigo-900/30"
            textColor="text-indigo-600 dark:text-indigo-400"
          />
          <SummaryCard
            title="Pending"
            value={summary.pending}
            icon={<FaClock size={20} />}
            bgColor="bg-yellow-50 dark:bg-yellow-900/30"
            textColor="text-yellow-600 dark:text-yellow-400"
          />
          <SummaryCard
            title="In Progress"
            value={summary.inProgress}
            icon={<FaSpinner size={20} />}
            bgColor="bg-blue-50 dark:bg-blue-900/30"
            textColor="text-blue-600 dark:text-blue-400"
          />
          <SummaryCard
            title="Completed"
            value={summary.completed}
            icon={<FaCheckCircle size={20} />}
            bgColor="bg-green-50 dark:bg-green-900/30"
            textColor="text-green-600 dark:text-green-400"
          />
          <SummaryCard
            title="Overdue"
            value={summary.overdue}
            icon={<FaExclamationCircle size={20} />}
            bgColor="bg-red-50 dark:bg-red-900/30"
            textColor="text-red-600 dark:text-red-400"
          />
        </div>

        <div className="mt-8 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-slate-700">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              Task List
            </h3>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch
                    className="text-gray-400 dark:text-gray-500"
                    size={14}
                  />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-900/50 dark:text-white rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                className="px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 rounded-lg text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-blue-500 focus:border-blue-500"
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

          {loading && tasks.length === 0 ? (
            <PageLoader message="Loading your tasks..." />
          ) : (
            <TaskListTable
              tasks={filteredTasks}
              emptyMessage="No tasks found."
              showDescription
              onStatusChange={handleUpdateTaskStatus}
              onTogglePinTask={handleTogglePinTask}
              onViewTask={(task) => navigate(`/user/task-details/${task._id}`)}
              onEditTask={(task) => navigate(`/user/tasks/edit/${task._id}`)}
              onDeleteTask={handleDeleteTask}
              canEditTask={isTaskCreator}
              canDeleteTask={isTaskCreator}
              editForbiddenTitle="Only creator can edit task"
              deleteForbiddenTitle="Only creator can delete task"
            />
          )}

          {pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalTasks}
              itemLabel="tasks"
              onPageChange={handlePageChange}
              containerClassName="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700"
            />
          )}
        </div>
      </PageContainer>
    </DashboardLayout>
  );
}
