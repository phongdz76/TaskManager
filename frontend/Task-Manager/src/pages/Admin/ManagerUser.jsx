import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import useUserAuth from "../../hooks/useUserAuth";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import {
  FaSpinner,
  FaSearch,
  FaUserShield,
  FaUser,
  FaTrash,
  FaUserEdit,
} from "react-icons/fa";
import toast from "react-hot-toast";
import Pagination from "../../components/Pagination";

const PAGE_LIMIT = 10;

export default function ManagerUser() {
  const { user: currentUser } = useUserAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Custom Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    actionType: "", // "DELETE" or "PROMOTE"
    userId: null,
    title: "",
    message: "",
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch both admins and users
      const [adminsRes, usersRes] = await Promise.all([
        axiosInstance.get(API_PATHS.USERS.GET_ADMINS),
        axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS),
      ]);

      setUsers([...adminsRes.data, ...usersRes.data]);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openConfirmModal = (actionType, userId, uName) => {
    if (actionType === "DELETE") {
      setConfirmModal({
        isOpen: true,
        actionType,
        userId,
        title: "Delete User",
        message: `Are you sure you want to delete user "${uName}"? This action cannot be undone.`,
      });
    } else if (actionType === "PROMOTE") {
      setConfirmModal({
        isOpen: true,
        actionType,
        userId,
        title: "Promote to Admin",
        message: `Are you sure you want to promote "${uName}" to Admin? They will have full access.`,
      });
    }
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      actionType: "",
      userId: null,
      title: "",
      message: "",
    });
  };

  const executeAction = async () => {
    const { actionType, userId } = confirmModal;
    closeConfirmModal(); // Close modal immediately

    if (actionType === "PROMOTE") {
      try {
        await axiosInstance.patch(API_PATHS.USERS.UPDATE_ROLE(userId), {
          role: "admin",
        });
        toast.success(`User role updated to admin`);
        fetchUsers(); // Refresh the list
      } catch (error) {
        console.error("Error updating role:", error);
        toast.error(error.response?.data?.message || "Failed to update role");
      }
    } else if (actionType === "DELETE") {
      try {
        await axiosInstance.delete(API_PATHS.USERS.DELETE_USER(userId));
        toast.success("User deleted successfully");
        fetchUsers(); // Refresh the list
      } catch (error) {
        console.error("Error deleting user:", error);
        toast.error(error.response?.data?.message || "Failed to delete user");
      }
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "admin" && u.role === "admin") ||
        (roleFilter === "user" && u.role !== "admin");

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const totalPages = Math.max(Math.ceil(filteredUsers.length / PAGE_LIMIT), 1);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_LIMIT;
    return filteredUsers.slice(start, start + PAGE_LIMIT);
  }, [filteredUsers, currentPage]);

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
    <DashboardLayout activeMenu="Manager User">
      <div className="max-w-7xl mx-auto pt-4 pb-10 animate-fade-in">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Manager User</h1>
            <p className="mt-2 text-gray-500">
              Manage roles, permissions, and accounts for your platform users.
            </p>
          </div>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm flex items-center"
            disabled={loading}
          >
            <FaSpinner className={`mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white p-4 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 mb-6 flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center flex-1 w-full bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            <FaSearch className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-transparent border-none outline-none text-gray-700 placeholder-gray-400"
            />
          </div>
          <div className="w-full md:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full md:w-48 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="admin">Administrators</option>
              <option value="user">Users</option>
            </select>
          </div>
        </div>

        {/* Content Section */}
        {loading && users.length === 0 ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500 font-medium">Loading users...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-left">
                <thead className="bg-gray-50/50">
                  <tr className="border-b border-gray-100 uppercase text-xs tracking-wider text-gray-500">
                    <th className="py-4 px-6 font-semibold w-[30%]">User</th>
                    <th className="py-4 px-6 font-semibold w-[20%]">Role</th>
                    <th className="py-4 px-6 font-semibold w-[25%] text-center">
                      Tasks (P / IP / C)
                    </th>
                    <th className="py-4 px-6 font-semibold w-[25%] text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length > 0 ? (
                    paginatedUsers.map((u) => {
                      const isSelf = currentUser?._id === u._id;
                      const isAdmin = u.role === "admin";
                      // Only users can be modified, admins cannot be modified
                      const canModify = !isAdmin;

                      return (
                        <tr
                          key={u._id}
                          className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                        >
                          {/* User Info */}
                          <td className="py-4 px-6">
                            <div className="flex items-center">
                              {u.profileImageUrl ? (
                                <img
                                  src={u.profileImageUrl}
                                  alt={u.username}
                                  className="w-10 h-10 rounded-full object-cover mr-4"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg mr-4">
                                  {u.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="text-gray-800 font-semibold">
                                  {u.username}
                                </p>
                                <p className="text-gray-500 text-sm">
                                  {u.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                                isAdmin
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                              }`}
                            >
                              {isAdmin ? (
                                <FaUserShield className="mr-1.5" />
                              ) : (
                                <FaUser className="mr-1.5" />
                              )}
                              {isAdmin ? "Admin" : "User"}
                            </span>
                          </td>

                          {/* Tasks count (if any) */}
                          <td className="py-4 px-6 text-center text-sm font-medium text-gray-500">
                            {!isAdmin ? (
                              <div className="flex justify-center space-x-2">
                                <span
                                  className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded"
                                  title="Pending Tasks"
                                >
                                  {u.pendingTasks || 0}
                                </span>
                                <span>/</span>
                                <span
                                  className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded"
                                  title="In Progress Tasks"
                                >
                                  {u.inProgressTasks || 0}
                                </span>
                                <span>/</span>
                                <span
                                  className="text-green-600 bg-green-50 px-2 py-0.5 rounded"
                                  title="Completed Tasks"
                                >
                                  {u.completedTasks || 0}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">N/A</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end space-x-3">
                              {!canModify ? (
                                <span className="text-xs text-gray-400 italic px-2">
                                  {isSelf ? "It's You" : "Cannot modify admin"}
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() =>
                                      openConfirmModal(
                                        "PROMOTE",
                                        u._id,
                                        u.username,
                                      )
                                    }
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors group relative"
                                    title="Make Admin"
                                  >
                                    <FaUserEdit size={18} />
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                      Promote to Admin
                                    </span>
                                  </button>
                                  <button
                                    onClick={() =>
                                      openConfirmModal(
                                        "DELETE",
                                        u._id,
                                        u.username,
                                      )
                                    }
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors group relative"
                                    title="Delete User"
                                  >
                                    <FaTrash size={18} />
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-red-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                      Delete User
                                    </span>
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
                        colSpan="4"
                        className="py-8 text-center text-gray-500"
                      >
                        No users found matching "{searchQuery}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredUsers.length > 0 && totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredUsers.length}
                itemLabel="users"
                onPageChange={handlePageChange}
                containerClassName="px-6 py-4 border-t border-gray-100"
              />
            )}
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 transform transition-all">
            <h3
              className={`text-xl font-bold mb-2 ${confirmModal.actionType === "DELETE" ? "text-red-600" : "text-indigo-600"}`}
            >
              {confirmModal.title}
            </h3>
            <p className="text-gray-600 mb-6 font-medium">
              {confirmModal.message}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeConfirmModal}
                className="px-4 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                className={`px-4 py-2 font-medium text-white rounded-lg transition-colors ${
                  confirmModal.actionType === "DELETE"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
