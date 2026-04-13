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
  FaPlus,
} from "react-icons/fa";
import toast from "react-hot-toast";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import Pagination from "../../components/Pagination";
import ReportDownloadButton from "../../components/ReportDownloadButton";
import PageContainer from "../../components/common/PageContainer";
import PageLoader from "../../components/common/PageLoader";
import TaskListTable from "../../components/tasks/TaskListTable";

const SummaryCard = ({ title, value, icon, bgColor, textColor }) => (
  <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 flex items-center justify-between hover:shadow-lg transition-shadow duration-300">
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-gray-800">{value || 0}</h3>
    </div>
    <div className={`p-4 rounded-xl ${bgColor} ${textColor}`}>{icon}</div>
  </div>
);

const STATUS_FILTERS = ["All", "Pending", "In-Progress", "Completed", "Overdue"];

export default function ManagerTask() {
  useUserAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [pieChartData, setPieChartData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

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
      getDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete task");
    } finally {
      closeConfirmModal();
    }
  };

  const togglePinTask = async (taskId) => {
    try {
      await axiosInstance.patch(API_PATHS.TASKS.TOGGLE_PIN(taskId));
      getDashboardData();
      toast.success("Task pin status updated!");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to toggle pin status",
      );
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await axiosInstance.put(API_PATHS.TASKS.UPDATE_STATUS(taskId), {
        status: newStatus,
      });
      getDashboardData();
      toast.success(`Status changed to ${newStatus}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const getDashboardData = async (page = currentPage) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(
        `${API_PATHS.TASKS.USER_DASHBOARD_DATA}?page=${page}&limit=10`,
      );
      const data = response.data;
      setDashboardData(data);
      if (data.pagination) setPagination(data.pagination);

      if (data.statistics) {
        setPieChartData(
          [
            {
              name: "Pending",
              value: data.statistics.pendingTasks || 0,
              color: "#f59e0b",
            },
            {
              name: "In Progress",
              value: data.statistics.inProgressTasks || 0,
              color: "#3b82f6",
            },
            {
              name: "Completed",
              value: data.statistics.completedTasks || 0,
              color: "#10b981",
            },
          ].filter((item) => item.value > 0),
        );
      }

      if (data.charts?.taskPriorityLevels) {
        setBarChartData([
          {
            name: "Low",
            value: data.charts.taskPriorityLevels["Low"] || 0,
            color: "#10b981",
          },
          {
            name: "Medium",
            value: data.charts.taskPriorityLevels["Medium"] || 0,
            color: "#f59e0b",
          },
          {
            name: "High",
            value: data.charts.taskPriorityLevels["High"] || 0,
            color: "#ef4444",
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching user tasks data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getDashboardData(currentPage);
  }, [currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || (pagination && newPage > pagination.totalPages)) return;
    setCurrentPage(newPage);
  };

  const stats = dashboardData?.statistics || {};

  const filteredRecentTasks = useMemo(() => {
    const tasks = Array.isArray(dashboardData?.recentTasks)
      ? dashboardData.recentTasks
      : [];

    const query = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const createdByUsername = task.createdBy?.username || "";
      const createdByEmail = task.createdBy?.email || "";

      const matchesQuery =
        !query ||
        task.title?.toLowerCase().includes(query) ||
        createdByUsername.toLowerCase().includes(query) ||
        createdByEmail.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || task.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [dashboardData, searchQuery, statusFilter]);

  return (
    <DashboardLayout activeMenu="Manager My Task">
      <PageContainer>
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              My Tasks Overview
            </h1>
            <p className="mt-2 text-gray-500">
              A personal summary of tasks assigned to you or created by you.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
            <ReportDownloadButton
              apiPath={API_PATHS.REPORTS.EXPORT_MY_TASKS}
              fileName="my_tasks_report.xlsx"
              buttonText="Export My Tasks"
            />
            <button
              onClick={() => getDashboardData()}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm flex items-center"
            >
              <FaSpinner className={`mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh Data
            </button>
          </div>
        </div>

        {loading && !dashboardData ? (
          <PageLoader message="Loading your tasks..." />
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              <SummaryCard
                title="Total Personal Tasks"
                value={stats.totalTasks}
                icon={<FaTasks size={24} />}
                bgColor="bg-indigo-50"
                textColor="text-indigo-600"
              />
              <SummaryCard
                title="Pending"
                value={stats.pendingTasks}
                icon={<FaClock size={24} />}
                bgColor="bg-yellow-50"
                textColor="text-yellow-600"
              />
              <SummaryCard
                title="In Progress"
                value={stats.inProgressTasks}
                icon={<FaSpinner size={24} />}
                bgColor="bg-blue-50"
                textColor="text-blue-600"
              />
              <SummaryCard
                title="Completed"
                value={stats.completedTasks}
                icon={<FaCheckCircle size={24} />}
                bgColor="bg-green-50"
                textColor="text-green-600"
              />
              <SummaryCard
                title="Overdue"
                value={stats.overdueTasks}
                icon={<FaExclamationCircle size={24} />}
                bgColor="bg-red-50"
                textColor="text-red-600"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {/* Task Distribution Pie Chart */}
              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6">
                  Personal Task Distribution
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
                    <div className="h-full flex items-center justify-center text-gray-400">
                      No data available
                    </div>
                  )}
                </div>
              </div>

              {/* Priority Bar Chart */}
              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6">
                  Tasks by Priority
                </h3>
                <div className="h-75">
                  {barChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barChartData}
                        margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f3f4f6"
                        />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6b7280", fontWeight: 500 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6b7280" }}
                        />
                        <RechartsTooltip
                          cursor={{ fill: "#f9fafb" }}
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                          }}
                        />
                        <Bar
                          dataKey="value"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={60}
                        >
                          {barChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      No data available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Tasks Table */}
            <div className="mt-8 bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-bold text-gray-800">
                  Recent Personal Tasks
                </h3>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
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
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {STATUS_FILTERS.map((status) => (
                      <option key={status} value={status}>
                        {status === "In-Progress" ? "In Progress" : status}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => navigate("/admin/create-task")}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                  >
                    <FaPlus size={12} />
                    Create New Task
                  </button>
                </div>
              </div>
              <TaskListTable
                tasks={filteredRecentTasks}
                emptyMessage="No recent tasks found."
                onStatusChange={updateTaskStatus}
                onTogglePinTask={togglePinTask}
                onViewTask={(task) =>
                  navigate(`/admin/task-details/${task._id}`)
                }
                onEditTask={(task) => navigate(`/admin/tasks/edit/${task._id}`)}
                onDeleteTask={(task) => openConfirmModal(task._id, task.title)}
              />

              {/* Pagination */}
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
          </>
        )}
      </PageContainer>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 transform transition-all">
            <h3 className="text-xl font-bold mb-2 text-red-600">Delete Task</h3>
            <p className="text-gray-600 mb-6 font-medium">
              Are you sure you want to delete the task{" "}
              <span className="font-bold text-gray-800">
                "{confirmModal.taskTitle}"
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeConfirmModal}
                className="px-4 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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
