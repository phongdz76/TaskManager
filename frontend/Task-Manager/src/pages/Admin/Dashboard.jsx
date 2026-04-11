import React, { useContext, useEffect, useState } from "react";
import { UserContext } from "../../context/userContext";
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
} from "react-icons/fa";
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
import moment from "moment";
import Pagination from "../../components/Pagination";
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

const PAGE_LIMIT = 10;

export default function Dashboard() {
  useUserAuth();

  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [pieChartData, setPieChartData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const getDashboardData = async (page = currentPage) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(
        `${API_PATHS.TASKS.DASHBOARD_DATA}?page=${page}&limit=${PAGE_LIMIT}`,
      );
      const data = response.data;
      setDashboardData(data);
      setPagination(data.pagination || null);

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
      console.error("Error fetching dashboard data:", error);
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

  return (
    <DashboardLayout activeMenu="Dashboard">
      <PageContainer>
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Admin Dashboard
            </h1>
            <p className="mt-2 font-medium text-gray-700">
              {moment().format("dddd, MMMM Do YYYY")}
            </p>
            <p className="mt-2 text-gray-500">
              Welcome back,{" "}
              <span className="font-medium text-gray-700">
                {user?.name || user?.username || "Admin"}
              </span>
              . Here's what's happening today.
            </p>
          </div>
          <button
            onClick={() => getDashboardData(currentPage)}
            className="mt-4 md:mt-0 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm flex items-center"
          >
            <FaSpinner className={`mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>

        {loading && !dashboardData ? (
          <PageLoader message="Loading your insights..." />
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              <SummaryCard
                title="Total Tasks"
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
                  Task Distribution
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
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">
                  Recent Tasks
                </h3>
                <button
                  onClick={() => navigate("/admin/all-user-tasks")}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left">
                  <thead>
                    <tr className="border-b border-gray-100 uppercase text-xs tracking-wider text-gray-500">
                      <th className="pb-4 px-4 font-semibold w-[36%]">Title</th>
                      <th className="pb-4 px-4 font-semibold w-[20%]">
                        Created By
                      </th>
                      <th className="pb-4 px-4 font-semibold w-[14%]">
                        Status
                      </th>
                      <th className="pb-4 px-4 font-semibold w-[14%]">
                        Priority
                      </th>
                      <th className="pb-4 px-4 font-semibold w-[16%]">
                        Due Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recentTasks?.length > 0 ? (
                      dashboardData.recentTasks.map((task) => (
                        <tr
                          key={task._id}
                          className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
                        >
                          <td className="py-4 px-4 align-top">
                            <p
                              className="text-gray-800 font-semibold whitespace-normal wrap-break-word leading-6"
                              title={task.title}
                            >
                              {task.title}
                            </p>
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
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                                task.status === "Pending"
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  : task.status === "In-Progress"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-green-50 text-green-700 border-green-200"
                              }`}
                            >
                              {task.status === "In-Progress"
                                ? "In Progress"
                                : task.status}
                            </span>
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
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="5"
                          className="py-8 text-center text-gray-500"
                        >
                          No recent tasks found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

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
    </DashboardLayout>
  );
}
