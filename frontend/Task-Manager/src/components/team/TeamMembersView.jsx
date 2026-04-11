import React, { useEffect, useMemo, useState } from "react";
import { FaSearch, FaSpinner, FaUser } from "react-icons/fa";
import DashboardLayout from "../layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import Pagination from "../Pagination";
import useUserAuth from "../../hooks/useUserAuth";
import ReportDownloadButton from "../ReportDownloadButton";

const StatItem = ({ label, value, valueClass }) => (
  <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
    <p className={`text-sm font-bold ${valueClass}`}>{value}</p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
  </div>
);

const PAGE_LIMIT = 10;

export default function TeamMembersView({ activeMenu, subtitle }) {
  const { user } = useUserAuth();
  const isAdmin = user?.role === "admin";

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const buildMembersFromTasks = (tasks) => {
    const memberMap = new Map();

    const upsertMember = (member, status, seenIds) => {
      if (!member?._id) return;
      const id = member._id.toString();
      if (seenIds.has(id)) return;
      seenIds.add(id);

      if (!memberMap.has(id)) {
        memberMap.set(id, {
          _id: id,
          username: member.username || "Unknown",
          email: member.email || "",
          profileImageUrl: member.profileImageUrl || "",
          role: member.role || "user",
          pendingTasks: 0,
          inProgressTasks: 0,
          completedTasks: 0,
          totalTasks: 0,
        });
      }

      const current = memberMap.get(id);
      current.totalTasks += 1;

      if (status === "Pending") current.pendingTasks += 1;
      else if (status === "In-Progress") current.inProgressTasks += 1;
      else if (status === "Completed") current.completedTasks += 1;
    };

    tasks.forEach((task) => {
      const seenIds = new Set();
      const assignees = Array.isArray(task?.assignedTo) ? task.assignedTo : [];

      assignees.forEach((assignee) =>
        upsertMember(assignee, task.status, seenIds),
      );
      upsertMember(task?.createdBy, task?.status, seenIds);
    });

    return Array.from(memberMap.values()).sort((a, b) => {
      if (b.totalTasks !== a.totalTasks) return b.totalTasks - a.totalTasks;
      return (a.username || "").localeCompare(b.username || "");
    });
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const limit = 100;
      let page = 1;
      let totalPages = 1;
      const allTasks = [];

      do {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", limit.toString());

        const response = await axiosInstance.get(
          `${API_PATHS.TASKS.GET_ALL_TASKS}?${params.toString()}`,
        );

        const tasks = Array.isArray(response?.data?.tasks)
          ? response.data.tasks
          : [];

        allTasks.push(...tasks);
        totalPages = response?.data?.pagination?.totalPages || 1;
        page += 1;
      } while (page <= totalPages);

      setMembers(buildMembersFromTasks(allTasks));
      setCurrentPage(1);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load team members",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) => {
      const username = (member?.username || "").toLowerCase();
      const email = (member?.email || "").toLowerCase();
      return username.includes(query) || email.includes(query);
    });
  }, [members, searchQuery]);

  const totalPages = Math.max(
    Math.ceil(filteredMembers.length / PAGE_LIMIT),
    1,
  );

  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_LIMIT;
    return filteredMembers.slice(start, start + PAGE_LIMIT);
  }, [filteredMembers, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  return (
    <DashboardLayout activeMenu={activeMenu}>
      <div className="max-w-7xl mx-auto pt-4 pb-10 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Team Members</h1>
            <p className="mt-2 text-gray-500">{subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {isAdmin && (
              <ReportDownloadButton 
                apiPath={API_PATHS.REPORTS.EXPORT_USERS} 
                fileName="team_members_report.xlsx" 
                buttonText="Export Team Members" 
              />
            )}
            <button
              onClick={fetchMembers}
              disabled={loading}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm flex items-center disabled:opacity-60"
            >
              <FaSpinner className={`mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 mb-6">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" size={14} />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500 font-medium">
              Loading team members...
            </p>
          </div>
        ) : filteredMembers.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {paginatedMembers.map((member) => (
                <div
                  key={member._id}
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex items-center gap-3 mb-4">
                    {member.profileImageUrl ? (
                      <img
                        src={member.profileImageUrl}
                        alt={member.username}
                        className="w-12 h-12 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
                        <FaUser className="text-gray-500" size={18} />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {member.username}
                        </h3>
                        {member.role === "admin" && (
                          <span className="text-[10px] font-medium text-white bg-blue-600 px-2 py-0.5 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <StatItem
                      label="Pending"
                      value={member.pendingTasks || 0}
                      valueClass="text-violet-600"
                    />
                    <StatItem
                      label="In Progress"
                      value={member.inProgressTasks || 0}
                      valueClass="text-cyan-600"
                    />
                    <StatItem
                      label="Completed"
                      value={member.completedTasks || 0}
                      valueClass="text-indigo-600"
                    />
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredMembers.length}
                itemLabel="members"
                onPageChange={handlePageChange}
                containerClassName="mt-6 pt-4 border-t border-gray-100"
              />
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-500">
            No team members found in tasks.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
