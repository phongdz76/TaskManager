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
  FaEye,
  FaEdit,
  FaSearch,
  FaTrash,
  FaPlus,
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
import moment from "moment";
import Pagination from "../../components/Pagination";
import ReportDownloadButton from "../../components/ReportDownloadButton";
import PageContainer from "../../components/common/PageContainer";
import PageLoader from "../../components/common/PageLoader";

const SummaryCard = ({ title, value, icon, bgColor, textColor }) => (
  <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 flex items-center justify-between hover:shadow-lg transition-shadow duration-300">
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-gray-800">{value || 0}</h3>
    </div>
    <div className={`p-4 rounded-xl ${bgColor} ${textColor}`}>{icon}</div>
  </div>
);

const STATUS_FILTERS = ["All", "Pending", "In-Progress", "Completed"];

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
      let url = `${API_PATHS.TASKS.GET_ALL_TASKS}?page=${page}&limit=10&ignorePinned=true`;
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
            <h1 className="text-3xl font-bold text-gray-800">
              All Tasks Overview
            </h1>
            <p className="mt-2 text-gray-500">
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
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm flex items-center"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <SummaryCard
                title="Total User Tasks"
                value={stats.total}
                icon={<FaTasks size={24} />}
                bgColor="bg-indigo-50"
                textColor="text-indigo-600"
              />
              <SummaryCard
                title="Pending"
                value={stats.pending}
                icon={<FaClock size={24} />}
                bgColor="bg-yellow-50"
                textColor="text-yellow-600"
              />
              <SummaryCard
                title="In Progress"
                value={stats.inProgress}
                icon={<FaSpinner size={24} />}
                bgColor="bg-blue-50"
                textColor="text-blue-600"
              />
              <SummaryCard
                title="Completed"
                value={stats.completed}
                icon={<FaCheckCircle size={24} />}
                bgColor="bg-green-50"
                textColor="text-green-600"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mt-8">
              {/* Task Distribution Pie Chart */}
              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6">
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
                    <div className="h-full flex items-center justify-center text-gray-400">
                      No data available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tasks Table */}
            <div className="mt-8 bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-bold text-gray-800">
                  All Users Tasks
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
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-225 text-left">
                  <thead>
                    <tr className="border-b border-gray-100 uppercase text-xs tracking-wider text-gray-500">
                      <th className="pb-4 px-4 font-semibold w-[28%]">Title</th>
                      <th className="pb-4 px-4 font-semibold w-[20%]">
                        Created By
                      </th>
                      <th className="pb-4 px-4 font-semibold w-[14%]">
                        Checklist
                      </th>
                      <th className="pb-4 px-4 font-semibold w-[12%]">
                        Status
                      </th>
                      <th className="pb-4 px-4 font-semibold w-[12%]">
                        Priority
                      </th>
                      <th className="pb-4 px-4 font-semibold w-[12%]">
                        Due Date
                      </th>
                      <th className="pb-4 px-4 font-semibold w-[12%] text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map((task) => {
                        const checklist = getChecklistProgress(task);

                        return (
                          <tr
                            key={task._id}
                            className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
                          >
                            <td className="py-4 px-4 align-top">
                              <div className="flex items-start gap-2">
                                <p
                                  className="text-gray-800 font-semibold whitespace-normal wrap-break-word leading-6"
                                  title={task.title}
                                >
                                  {task.title}
                                </p>
                              </div>
                            </td>
                            <td className="py-4 px-4 align-top">
                              {task.createdBy ? (
                                <div className="flex items-center">
                                  {task.createdBy.profileImageUrl ? (
                                    <img
                                      src={task.createdBy.profileImageUrl}
                                      alt={task.createdBy.username}
                                      className="w-6 h-6 rounded-full object-cover mr-2 border border-gray-200"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-2">
                                      {task.createdBy.username
                                        .charAt(0)
                                        .toUpperCase()}
                                    </div>
                                  )}
                                  <span
                                    className="text-sm text-gray-700 truncate"
                                    title={task.createdBy.email}
                                  >
                                    {task.createdBy.username}
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
                                  updateTaskStatus(task._id, e.target.value)
                                }
                                className={`appearance-none cursor-pointer px-2.5 py-1 rounded-full text-xs font-medium border outline-none transition-colors ${
                                  task.status === "Pending"
                                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                    : task.status === "In-Progress"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-green-50 text-green-700 border-green-200"
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
                                  task.priority === "Low"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : task.priority === "Medium"
                                      ? "bg-orange-50 text-orange-700 border-orange-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                }`}
                              >
                                {task.priority}
                              </span>
                            </td>
                            <td className="py-4 px-4 align-top text-gray-500 text-sm font-medium">
                              {task.dueDate
                                ? moment(task.dueDate).format("MMM DD, YYYY")
                                : "No due date"}
                            </td>
                            <td className="py-4 px-4 align-top text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() =>
                                    navigate(`/admin/task-details/${task._id}`)
                                  }
                                  className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors group relative"
                                  title="View Task Details"
                                >
                                  <FaEye size={16} />
                                </button>
                                {!adminUserIds.includes(
                                  task.createdBy?._id,
                                ) && (
                                  <>
                                    <button
                                      onClick={() =>
                                        navigate(
                                          `/admin/tasks/edit/${task._id}`,
                                        )
                                      }
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group relative"
                                      title="Edit Task"
                                    >
                                      <FaEdit size={16} />
                                    </button>
                                    <button
                                      onClick={() =>
                                        openConfirmModal(task._id, task.title)
                                      }
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors group relative"
                                      title="Delete Task"
                                    >
                                      <FaTrash size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan="7"
                          className="py-8 text-center text-gray-500"
                        >
                          No users tasks found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

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
