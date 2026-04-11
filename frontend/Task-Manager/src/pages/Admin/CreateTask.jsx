import React, { useState, useEffect, useContext } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import useUserAuth from "../../hooks/useUserAuth";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import {
  FaPlus,
  FaTrash,
  FaSpinner,
  FaTasks,
  FaUserPlus,
  FaTimes,
  FaCalendarAlt,
  FaLink,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/userContext";
import moment from "moment";
import Pagination from "../../components/Pagination";

const INITIAL_STATE = {
  title: "",
  description: "",
  priority: "Medium",
  startDate: "",
  dueDate: "",
  assignedTo: [],
  attachments: [],
  todoChecklist: [],
};

const ASSIGNEE_PAGE_LIMIT = 10;

export default function CreateTask() {
  useUserAuth();
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState(INITIAL_STATE);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTodo, setNewTodo] = useState("");
  const [newAttachment, setNewAttachment] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [assigneePage, setAssigneePage] = useState(1);

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.USERS.GET_ASSIGNABLE_USERS,
      );
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to fetch users", error);
      toast.error("Failed to load users.");
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await fetchUsers();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleRefresh = () => {
    setFormData(INITIAL_STATE);
    setNewTodo("");
    setNewAttachment("");
    setUserSearch("");
    setAssigneePage(1);
    loadInitialData();
    toast.success("Form has been reset");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ── Assignee management ──
  const toggleAssignee = (userId) => {
    setFormData((prev) => {
      const exists = prev.assignedTo.includes(userId);
      return {
        ...prev,
        assignedTo: exists
          ? prev.assignedTo.filter((id) => id !== userId)
          : [...prev.assignedTo, userId],
      };
    });
  };

  const removeAssignee = (userId) => {
    setFormData((prev) => ({
      ...prev,
      assignedTo: prev.assignedTo.filter((id) => id !== userId),
    }));
  };

  const getAssignedUsers = () => {
    return users.filter((u) => formData.assignedTo.includes(u._id));
  };

  const filteredUsers = users.filter((u) => {
    // Exclude current user from the list
    if (u._id === user?._id) return false;
    const query = userSearch.toLowerCase();
    const name = (u.username || u.name || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const assigneeTotalPages = Math.max(
    Math.ceil(filteredUsers.length / ASSIGNEE_PAGE_LIMIT),
    1,
  );

  const paginatedUsers = filteredUsers.slice(
    (assigneePage - 1) * ASSIGNEE_PAGE_LIMIT,
    assigneePage * ASSIGNEE_PAGE_LIMIT,
  );

  useEffect(() => {
    if (assigneePage > assigneeTotalPages) {
      setAssigneePage(assigneeTotalPages);
    }
  }, [assigneePage, assigneeTotalPages]);

  const handleAssigneePageChange = (newPage) => {
    if (newPage < 1 || newPage > assigneeTotalPages) return;
    setAssigneePage(newPage);
  };

  const normalizeAttachmentUrl = (value) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return null;

    const candidate = /^https?:\/\//i.test(trimmedValue)
      ? trimmedValue
      : `https://${trimmedValue}`;

    try {
      const parsedUrl = new URL(candidate);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) return null;
      return parsedUrl.toString();
    } catch {
      return null;
    }
  };

  const handleAddAttachment = () => {
    const normalizedAttachment = normalizeAttachmentUrl(newAttachment);

    if (!normalizedAttachment) {
      toast.error("Please enter a valid file link");
      return;
    }

    if (formData.attachments.includes(normalizedAttachment)) {
      toast.error("This file link is already added");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, normalizedAttachment],
    }));
    setNewAttachment("");
  };

  const handleRemoveAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  };

  // ── Todo Checklist ──
  const handleAddTodo = () => {
    if (!newTodo.trim()) return;
    setFormData((prev) => ({
      ...prev,
      todoChecklist: [
        ...prev.todoChecklist,
        { text: newTodo.trim(), completed: false },
      ],
    }));
    setNewTodo("");
  };

  const handleRemoveTodo = (index) => {
    setFormData((prev) => ({
      ...prev,
      todoChecklist: prev.todoChecklist.filter((_, i) => i !== index),
    }));
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        startDate: formData.startDate
          ? new Date(formData.startDate).toISOString()
          : undefined,
        dueDate: formData.dueDate
          ? new Date(formData.dueDate).toISOString()
          : undefined,
        assignedTo:
          formData.assignedTo.length > 0 ? formData.assignedTo : undefined,
        attachments:
          formData.attachments.length > 0 ? formData.attachments : undefined,
        todoChecklist:
          formData.todoChecklist.length > 0
            ? formData.todoChecklist
            : undefined,
      };

      await axiosInstance.post(API_PATHS.TASKS.CREATE, payload);
      toast.success("Task created successfully!");
      navigate("/admin/dashboard");
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error(error?.response?.data?.message || "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const todayFormatted = moment().format("dddd, MMMM Do YYYY");

  return (
    <DashboardLayout activeMenu="Create Task">
      <div className="max-w-7xl mx-auto pt-4 pb-10 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Create New Task
            </h1>
            <p className="mt-2 font-medium text-gray-700">{todayFormatted}</p>
            <p className="mt-1 text-gray-500">
              Fill in the details below to create and assign a task.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            type="button"
            className="mt-4 md:mt-0 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm flex items-center"
          >
            <FaSpinner className={`mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500 font-medium">
              Loading form data...
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* ────── Left Column ────── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Task Information Card */}
              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-5 border-b border-gray-100 pb-3 flex items-center gap-2">
                  <FaTasks className="text-blue-600" />
                  Task Information
                </h3>

                <div className="space-y-5">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="E.g., Redesign the landing page"
                      maxLength={200}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition bg-gray-50/50 focus:bg-white"
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {formData.title.length}/200
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="5"
                      maxLength={2000}
                      placeholder="Provide a detailed description of the task..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition bg-gray-50/50 focus:bg-white resize-none"
                    ></textarea>
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {formData.description.length}/2000
                    </p>
                  </div>

                  <div>
                    <label className="flex text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                      <FaLink className="text-indigo-500" />
                      Attachments (File Links)
                    </label>

                    <div className="flex gap-3 mb-3">
                      <input
                        type="text"
                        value={newAttachment}
                        onChange={(e) => setNewAttachment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddAttachment();
                          }
                        }}
                        placeholder="Paste file URL (Google Drive, Dropbox, etc.)"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleAddAttachment}
                        className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium flex items-center gap-2 transition text-sm"
                      >
                        <FaPlus size={12} /> Add Link
                      </button>
                    </div>

                    {formData.attachments.length > 0 ? (
                      <ul className="space-y-2">
                        {formData.attachments.map((attachment, index) => (
                          <li
                            key={`${attachment}-${index}`}
                            className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
                          >
                            <a
                              href={attachment}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-700 hover:underline truncate"
                              title={attachment}
                            >
                              {attachment}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(index)}
                              className="text-gray-300 hover:text-red-500 transition p-1 shrink-0"
                            >
                              <FaTrash size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-400 italic py-2">
                        No file links added yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Assign Users Card */}
              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-5 border-b border-gray-100 pb-3 flex items-center gap-2">
                  <FaUserPlus className="text-indigo-600" />
                  Assign Members
                </h3>

                {/* Selected Users */}
                {getAssignedUsers().length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {getAssignedUsers().map((u) => (
                      <span
                        key={u._id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm font-medium"
                      >
                        {u.profileImageUrl ? (
                          <img
                            src={u.profileImageUrl}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-700">
                            {(u.username || u.name || "?")[0].toUpperCase()}
                          </span>
                        )}
                        {u.username || u.name}
                        <button
                          type="button"
                          onClick={() => removeAssignee(u._id)}
                          className="text-blue-400 hover:text-red-500 transition"
                        >
                          <FaTimes size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search */}
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setAssigneePage(1);
                  }}
                  placeholder="Search users by name or email..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none mb-3 text-sm"
                />

                {/* User List */}
                <div className="max-h-55 overflow-y-auto rounded-xl border border-gray-100">
                  {paginatedUsers.length > 0 ? (
                    paginatedUsers.map((u) => {
                      const isSelected = formData.assignedTo.includes(u._id);
                      return (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() => toggleAssignee(u._id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-b border-gray-50 last:border-b-0 ${
                            isSelected ? "bg-blue-50/70" : "hover:bg-gray-50/70"
                          }`}
                        >
                          {u.profileImageUrl ? (
                            <img
                              src={u.profileImageUrl}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <span className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                              {(u.username || u.name || "?")[0].toUpperCase()}
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {u.username || u.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {u.email}
                            </p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                              isSelected
                                ? "bg-blue-600 border-blue-600"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-6 italic">
                      No users found
                    </p>
                  )}
                </div>

                {filteredUsers.length > 0 && assigneeTotalPages > 1 && (
                  <Pagination
                    currentPage={assigneePage}
                    totalPages={assigneeTotalPages}
                    onPageChange={handleAssigneePageChange}
                    variant="compact"
                    buttonType="button"
                    containerClassName="mt-3"
                  />
                )}
              </div>

              {/* Todo Checklist Card */}
              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-5 border-b border-gray-100 pb-3">
                  Todo Checklist
                </h3>

                <div className="flex gap-3 mb-4">
                  <input
                    type="text"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTodo();
                      }
                    }}
                    placeholder="Add a sub-task..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddTodo}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium flex items-center gap-2 transition text-sm"
                  >
                    <FaPlus size={12} /> Add
                  </button>
                </div>

                {formData.todoChecklist.length > 0 ? (
                  <ul className="space-y-2">
                    {formData.todoChecklist.map((todo, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="text-gray-700 text-sm">
                            {todo.text}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTodo(index)}
                          className="text-gray-300 group-hover:text-red-500 transition p-1"
                        >
                          <FaTrash size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    No sub-tasks added yet. Type above and press Enter or click
                    Add.
                  </p>
                )}
              </div>
            </div>

            {/* ────── Right Column ────── */}
            <div className="space-y-6">
              {/* Settings Card */}
              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-5 border-b border-gray-100 pb-3">
                  Settings
                </h3>

                <div className="space-y-5">
                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          val: "Low",
                          label: "Low",
                          color: "bg-green-50 text-green-700 border-green-200",
                          active: "bg-green-600 text-white border-green-600",
                        },
                        {
                          val: "Medium",
                          label: "Medium",
                          color:
                            "bg-yellow-50 text-yellow-700 border-yellow-200",
                          active: "bg-yellow-500 text-white border-yellow-500",
                        },
                        {
                          val: "High",
                          label: "High",
                          color: "bg-red-50 text-red-700 border-red-200",
                          active: "bg-red-600 text-white border-red-600",
                        },
                      ].map((p) => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              priority: p.val,
                            }))
                          }
                          className={`py-2.5 px-3 rounded-xl border text-sm font-semibold transition ${
                            formData.priority === p.val ? p.active : p.color
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="flex text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                      <FaCalendarAlt className="text-green-500" />
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none text-gray-700 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Defaults to today if not set. Cannot be in the past.
                    </p>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="flex text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                      <FaCalendarAlt className="text-red-400" />
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleChange}
                      min={
                        formData.startDate
                          ? new Date(formData.startDate)
                              .toISOString()
                              .split("T")[0]
                          : new Date().toISOString().split("T")[0]
                      }
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none text-gray-700 text-sm"
                    />
                  </div>

                  {/* Date visual */}
                  {formData.dueDate && (
                    <div className="bg-linear-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
                        Timeline
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="font-medium">
                          {formData.startDate
                            ? moment(formData.startDate).format("MMM DD")
                            : moment().format("MMM DD")}
                        </span>
                        <span className="flex-1 h-px bg-blue-300 relative">
                          <span className="absolute -top-1 left-0 w-2 h-2 rounded-full bg-green-500"></span>
                          <span className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-red-500"></span>
                        </span>
                        <span className="font-medium">
                          {moment(formData.dueDate).format("MMM DD")}
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        {moment(formData.dueDate).diff(
                          formData.startDate
                            ? moment(formData.startDate)
                            : moment(),
                          "days",
                        )}{" "}
                        days remaining
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                  Summary
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Priority</span>
                    <span
                      className={`font-semibold ${
                        formData.priority === "High"
                          ? "text-red-600"
                          : formData.priority === "Medium"
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {formData.priority}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Assignees</span>
                    <span className="font-semibold text-gray-800">
                      {formData.assignedTo.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sub-tasks</span>
                    <span className="font-semibold text-gray-800">
                      {formData.todoChecklist.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Attachments</span>
                    <span className="font-semibold text-gray-800">
                      {formData.attachments.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Due Date</span>
                    <span className="font-semibold text-gray-800">
                      {formData.dueDate
                        ? moment(formData.dueDate).format("MMM DD, YYYY")
                        : "Not set"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" /> Creating...
                  </>
                ) : (
                  "Create Task"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
