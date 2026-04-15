import React, { useEffect, useMemo, useState } from "react";
import useUserAuth from "../../hooks/useUserAuth";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import {
  FaTasks,
  FaClock,
  FaSpinner,
  FaCheckCircle,
  FaExclamationCircle,
  FaSearch,
} from "react-icons/fa";
import toast from "react-hot-toast";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Pagination from "../../components/Pagination";
import ReportDownloadButton from "../../components/ReportDownloadButton";
import PageContainer from "../../components/common/PageContainer";
import PageLoader from "../../components/common/PageLoader";
import TaskListTable from "../../components/tasks/TaskListTable";

const SummaryCard = ({ title, value, icon, bgColor, textColor }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 flex items-center justify-between hover:shadow-lg transition-shadow duration-300">
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
        {title}
      </p>
      <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
        {value || 0}
      </h3>
    </div>
    <div className={`p-4 rounded-xl ${bgColor} ${textColor}`}>{icon}</div>
  </div>
);

const STATUS_FILTERS = [
  "All",
  "Pending",
  "In-Progress",
  "Completed",
  "Overdue",
];

export default function ManagerAllTasks() {
  useUserAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [pieChartData, setPieChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [adminUserIds, setAdminUserIds] = useState([]);

  // Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    taskId: null,
    taskTitle: "",
  });

  const openConfirmModal = (taskId, taskTitle) => {
    setConfirmModal({
      isOpen: true,
      taskId,
      taskTitle,
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      taskId: null,
      taskTitle: "",
    });
  };

  const executeDeleteTask = async () => {
    try {
      await axiosInstance.delete(API_PATHS.TASKS.DELETE(confirmModal.taskId));
      toast.success("Task deleted successfully");
      getTasks(currentPage);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete task");
    } finally {
      closeConfirmModal();
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await axiosInstance.put(API_PATHS.TASKS.UPDATE_STATUS(taskId), {
        status: newStatus,
      });
      getTasks(currentPage);
      toast.success(`Status changed to ${newStatus}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const togglePinTask = async (taskId) => {
    try {
      await axiosInstance.patch(API_PATHS.TASKS.TOGGLE_PIN(taskId));
      getTasks(currentPage, statusFilter);
      toast.success("Task pin status updated!");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to toggle pin status",
      );
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ADMINS);
      const admins = response.data.admins || response.data || [];
      const adminIds = admins.map((a) => a._id);
      setAdminUserIds(adminIds);
    } catch (error) {
      console.error("Failed to fetch admins", error);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const getTasks = async (
    page = currentPage,
    currentStatusFilter = statusFilter,
  ) => {
    setLoading(true);
    try {
      let url = `${API_PATHS.TASKS.GET_ALL_TASKS}?page=${page}&limit=10`;
      if (currentStatusFilter && currentStatusFilter !== "All") {
        url += `&status=${currentStatusFilter}`;
      }

      const response = await axiosInstance.get(url);
      const data = response.data;
      setTasks(data.tasks || []);
      setStats(data.statusSummary || {});
      if (data.pagination) setPagination(data.pagination);

      if (data.statusSummary) {
        setPieChartData(
          [
            {
              name: "Pending",
              value: data.statusSummary.pending || 0,
              color: "#f59e0b",
            },
            {
              name: "In Progress",
              value: data.statusSummary.inProgress || 0,
              color: "#3b82f6",
            },
            {
              name: "Completed",
              value: data.statusSummary.completed || 0,
              color: "#10b981",
            },
          ].filter((item) => item.value > 0),
        );
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Also reset page when status filter changes
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    getTasks(currentPage, statusFilter);
  }, [currentPage, statusFilter]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || (pagination && newPage > pagination.totalPages)) return;
    setCurrentPage(newPage);
  };

  const filteredTasks = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    const query = searchQuery.trim().toLowerCase();

    return list.filter((task) => {
      const createdByUsername = task.createdBy?.username || "";
      const createdByEmail = task.createdBy?.email || "";

      const matchesQuery =
        !query ||
        task.title?.toLowerCase().includes(query) ||
        createdByUsername.toLowerCase().includes(query) ||
        createdByEmail.toLowerCase().includes(query);

      return matchesQuery;
    });
  }, [tasks, searchQuery]);

  return (
    <DashboardLayout activeMenu="Manager All Task">
      <PageContainer>
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              All Tasks Overview
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Manage and track all tasks created by system.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
            <ReportDownloadButton
              apiPath={API_PATHS.REPORTS.EXPORT_TASKS}
              fileName="all_tasks_report.xlsx"
              buttonText="Export Tasks"
            />
            <button
              onClick={() => getTasks(currentPage, statusFilter)}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm flex items-center"
            >
              <FaSpinner className={`mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh Data
            </button>
          </div>
        </div>

        {loading && tasks.length === 0 ? (
          <PageLoader message="Loading users tasks..." />
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              <SummaryCard
                title="Total User Tasks"
                value={stats.total}
                icon={<FaTasks size={24} />}
                bgColor="bg-indigo-50 dark:bg-indigo-900/30"
                textColor="text-indigo-600 dark:text-indigo-400"
              />
              <SummaryCard
                title="Pending"
                value={stats.pending}
                icon={<FaClock size={24} />}
                bgColor="bg-yellow-50 dark:bg-yellow-900/30"
                textColor="text-yellow-600 dark:text-yellow-400"
              />
              <SummaryCard
                title="In Progress"
                value={stats.inProgress}
                icon={<FaSpinner size={24} />}
                bgColor="bg-blue-50 dark:bg-blue-900/30"
                textColor="text-blue-600 dark:text-blue-400"
              />
              <SummaryCard
                title="Completed"
                value={stats.completed}
                icon={<FaCheckCircle size={24} />}
                bgColor="bg-green-50 dark:bg-green-900/30"
                textColor="text-green-600 dark:text-green-400"
              />
              <SummaryCard
                title="Overdue"
                value={stats.overdue}
                icon={<FaExclamationCircle size={24} />}
                bgColor="bg-red-50 dark:bg-red-900/30"
                textColor="text-red-600 dark:text-red-400"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mt-8">
              {/* Task Distribution Pie Chart */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6">
                  Task Status Distribution
                </h3>
                <div className="h-75">
                  {pieChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={0}
                          stroke="#ffffff"
                          strokeWidth={2}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                          }}
                        />
                        <Legend
                          payload={[
                            {
                              value: "Pending",
                              type: "circle",
                              id: "pending",
                              color: "#f59e0b",
                            },
                            {
                              value: "In Progress",
                              type: "circle",
                              id: "inprogress",
                              color: "#3b82f6",
                            },
                            {
                              value: "Completed",
                              type: "circle",
                              id: "completed",
                              color: "#10b981",
                            },
                          ]}
                          wrapperStyle={{ paddingTop: "20px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                      No data available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tasks Table */}
            <div className="mt-8 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  All Users Tasks
                </h3>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
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
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 rounded-lg text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {STATUS_FILTERS.map((status) => (
                      <option key={status} value={status}>
                        {status === "In-Progress" ? "In Progress" : status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <TaskListTable
                tasks={filteredTasks}
                emptyMessage="No users tasks found."
                onStatusChange={updateTaskStatus}
                onTogglePinTask={togglePinTask}
                onViewTask={(task) =>
                  navigate(
                    `/admin/task-details/${task._id}?source=all-user-tasks`,
                  )
                }
                onEditTask={(task) =>
                  navigate(
                    `/admin/tasks/edit/${task._id}?source=all-user-tasks`,
                  )
                }
                onDeleteTask={(task) => openConfirmModal(task._id, task.title)}
                canEditTask={(task) =>
                  !adminUserIds.includes(task?.createdBy?._id)
                }
                canDeleteTask={(task) =>
                  !adminUserIds.includes(task?.createdBy?._id)
                }
                hideEditWhenForbidden
                hideDeleteWhenForbidden
              />

              {/* Pagination */}
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
          </>
        )}
      </PageContainer>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-xl w-full max-w-md p-6 transform transition-all">
            <h3 className="text-xl font-bold mb-2 text-red-600">Delete Task</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 font-medium">
              Are you sure you want to delete the task{" "}
              <span className="font-bold text-gray-800 dark:text-gray-100">
                "{confirmModal.taskTitle}"
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeConfirmModal}
                className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteTask}
                className="px-4 py-2 font-medium text-white rounded-lg transition-colors bg-red-600 hover:bg-red-700"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
