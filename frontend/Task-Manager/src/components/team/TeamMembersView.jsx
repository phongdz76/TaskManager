import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaSearch, FaSpinner, FaUser } from "react-icons/fa";
import DashboardLayout from "../layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import Pagination from "../Pagination";
import useUserAuth from "../../hooks/useUserAuth";
import ReportDownloadButton from "../ReportDownloadButton";
import PageContainer from "../common/PageContainer";
import PageLoader from "../common/PageLoader";

const StatItem = ({ label, value, valueClass }) => (
  <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg px-3 py-2 border border-gray-100 dark:border-slate-700">
    <p className={`text-sm font-bold ${valueClass}`}>{value}</p>
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
  </div>
);

const TeamMemberAvatar = ({ imageUrl, username }) => {
  const [hasImageError, setHasImageError] = useState(false);
  const normalizedImageUrl =
    typeof imageUrl === "string" ? imageUrl.trim() : "";

  if (!normalizedImageUrl || hasImageError) {
    return (
      <div className="w-12 h-12 rounded-full border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
        <FaUser className="text-gray-500 dark:text-gray-400" size={18} />
      </div>
    );
  }

  return (
    <img
      src={normalizedImageUrl}
      alt={username || "User"}
      className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-slate-700"
      onError={() => setHasImageError(true)}
    />
  );
};

const PAGE_LIMIT = 10;

export default function TeamMembersView({ activeMenu, subtitle }) {
  useUserAuth();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(
        API_PATHS.USERS.TEAM_MEMBERS_SUMMARY,
      );
      const teamMembers = Array.isArray(response?.data?.teamMembers)
        ? response.data.teamMembers
        : [];

      setMembers(teamMembers);
      setCurrentPage(1);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load team members",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filteredMembers = useMemo(() => {
    const activeMembers = members.filter(
      (member) => (member?.taskCount || 0) > 0,
    );

    const query = searchQuery.trim().toLowerCase();
    if (!query) return activeMembers;

    return activeMembers.filter((member) => {
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
      <PageContainer>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Team Members</h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ReportDownloadButton
              apiPath={API_PATHS.REPORTS.EXPORT_TEAM_MEMBERS}
              fileName="team_members_report.xlsx"
              buttonText="Export Team Members"
            />
            <button
              onClick={fetchMembers}
              disabled={loading}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm flex items-center disabled:opacity-60"
            >
              <FaSpinner className={`mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 mb-6">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" size={14} />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-slate-600 dark:bg-slate-900/50 dark:text-white rounded-lg text-sm flex-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
          <PageLoader message="Loading team members..." />
        ) : filteredMembers.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {paginatedMembers.map((member) => (
                <div
                  key={member._id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <TeamMemberAvatar
                      imageUrl={member.profileImageUrl}
                      username={member.username}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {member.username}
                        </h3>
                        {member.role === "admin" && (
                          <span className="text-[10px] font-medium text-white bg-blue-600 dark:bg-blue-500 px-2 py-0.5 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <StatItem
                      label="Shared Tasks"
                      value={member.taskCount || 0}
                      valueClass="text-indigo-600 dark:text-indigo-400"
                    />
                    <StatItem
                      label="Completion Level"
                      value={`${member.completionLevel || 0}%`}
                      valueClass="text-emerald-600 dark:text-emerald-400"
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
                containerClassName="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700"
              />
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-10 text-center text-gray-500 dark:text-gray-400">
            No team members found.
          </div>
        )}
      </PageContainer>
    </DashboardLayout>
  );
}
