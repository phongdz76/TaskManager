import React, { useState, useEffect, useContext, useRef } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import {
  FaPlus,
  FaTrash,
  FaSpinner,
  FaTasks,
  FaUserPlus,
  FaUser,
  FaTimes,
  FaCalendarAlt,
  FaLink,
  FaUpload,
} from "react-icons/fa";
import { generateGoogleCalendarLink } from "../../utils/calendarUtils";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/userContext";
import moment from "moment";
import Pagination from "../Pagination";
import PageContainer from "../common/PageContainer";
import PageLoader from "../common/PageLoader";

const isImageUrl = (url) => {
  if (!url) return false;
  if (/\.(jpeg|jpg|gif|png|webp|svg|avif)(\?.*)?$/i.test(url)) return true;
  if (url.includes("res.cloudinary.com") && url.includes("/image/upload")) return true;
  return false;
};

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
const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_ATTACHMENTS = 20;
const MAX_ATTACHMENT_URL_LENGTH = 500;
const MAX_TODO_ITEMS = 50;
const MAX_TODO_TEXT_LENGTH = 500;

const MemberAvatar = ({
  imageUrl,
  displayName,
  sizeClass = "w-8 h-8",
  fallbackClass = "bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400",
  iconSize = 12,
}) => {
  const [hasImageError, setHasImageError] = useState(false);
  const normalizedImageUrl =
    typeof imageUrl === "string" ? imageUrl.trim() : "";

  if (!normalizedImageUrl || hasImageError) {
    return (
      <span
        className={`${sizeClass} rounded-full ${fallbackClass} flex items-center justify-center shrink-0`}
      >
        <FaUser size={iconSize} />
      </span>
    );
  }

  return (
    <img
      src={normalizedImageUrl}
      alt={displayName || "User"}
      referrerPolicy="no-referrer"
      className={`${sizeClass} rounded-full object-cover border border-gray-200 dark:border-slate-700 shrink-0`}
      onError={() => setHasImageError(true)}
    />
  );
};

export default function CreateTaskPage({
  activeMenu = "Create Task",
  description = "Fill in the details below to create a new task.",
  successMode = "navigate",
  successRedirectPath = "/user/dashboard",
  successMessage = "Task created successfully!",
  emptyAssigneeText = "You (default)",
}) {
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
  const [syncToCalendar, setSyncToCalendar] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef(null);

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
    if (trimmedValue.length > MAX_ATTACHMENT_URL_LENGTH) return null;

    const candidate = /^https?:\/\//i.test(trimmedValue)
      ? trimmedValue
      : `https://${trimmedValue}`;

    try {
      const parsedUrl = new URL(candidate);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) return null;
      const normalizedUrl = parsedUrl.toString();
      if (normalizedUrl.length > MAX_ATTACHMENT_URL_LENGTH) return null;
      return normalizedUrl;
    } catch {
      return null;
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (formData.attachments.length >= MAX_ATTACHMENTS) {
      toast.error(`You can add up to ${MAX_ATTACHMENTS} attachments`);
      return;
    }

    const fileFormData = new FormData();
    fileFormData.append("image", file);

    try {
      setIsUploadingAttachment(true);
      const res = await axiosInstance.post(API_PATHS.IMAGES.UPLOAD_GENERAL_IMAGE, fileFormData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const imageUrl = res.data.imageUrl;
      setFormData((prev) => ({
        ...prev,
        attachments: [...prev.attachments, imageUrl],
      }));
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.message || "Failed to upload file");
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAddAttachment = () => {
    if (formData.attachments.length >= MAX_ATTACHMENTS) {
      toast.error(`You can add up to ${MAX_ATTACHMENTS} attachments`);
      return;
    }

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
    const trimmedTodo = newTodo.trim();
    if (!trimmedTodo) return;

    if (formData.todoChecklist.length >= MAX_TODO_ITEMS) {
      toast.error(`You can add up to ${MAX_TODO_ITEMS} checklist items`);
      return;
    }

    if (trimmedTodo.length > MAX_TODO_TEXT_LENGTH) {
      toast.error(
        `Checklist item must be at most ${MAX_TODO_TEXT_LENGTH} characters`,
      );
      return;
    }

    setFormData((prev) => ({
      ...prev,
      todoChecklist: [
        ...prev.todoChecklist,
        { text: trimmedTodo, completed: false },
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

    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) {
      toast.error("Title is required");
      return;
    }

    if (trimmedTitle.length < MIN_TITLE_LENGTH) {
      toast.error(`Title must be at least ${MIN_TITLE_LENGTH} characters`);
      return;
    }

    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      toast.error(`Title must be at most ${MAX_TITLE_LENGTH} characters`);
      return;
    }

    const trimmedDescription = formData.description.trim();
    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      toast.error(
        `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`,
      );
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    if (formData.startDate && formData.startDate < today) {
      toast.error("Start date cannot be in the past");
      return;
    }

    const effectiveStartDate = formData.startDate || today;
    if (formData.dueDate && formData.dueDate < effectiveStartDate) {
      toast.error("Due date cannot be earlier than start date");
      return;
    }

    if (formData.attachments.length > MAX_ATTACHMENTS) {
      toast.error(`You can add up to ${MAX_ATTACHMENTS} attachments`);
      return;
    }

    const normalizedAttachments = [];
    for (const attachment of formData.attachments) {
      const normalizedAttachment = normalizeAttachmentUrl(attachment);
      if (!normalizedAttachment) {
        toast.error(
          "Each attachment must be a valid HTTP/HTTPS URL and within length limit",
        );
        return;
      }
      normalizedAttachments.push(normalizedAttachment);
    }

    if (formData.todoChecklist.length > MAX_TODO_ITEMS) {
      toast.error(`You can add up to ${MAX_TODO_ITEMS} checklist items`);
      return;
    }

    const normalizedTodoChecklist = [];
    for (const todo of formData.todoChecklist) {
      const text = typeof todo?.text === "string" ? todo.text.trim() : "";
      if (!text) {
        toast.error("Checklist items cannot be empty");
        return;
      }

      if (text.length > MAX_TODO_TEXT_LENGTH) {
        toast.error(
          `Checklist item must be at most ${MAX_TODO_TEXT_LENGTH} characters`,
        );
        return;
      }

      normalizedTodoChecklist.push({
        text,
        completed: todo.completed === true,
      });
    }

    const uniqueAssignedTo = [...new Set(formData.assignedTo)];

    setIsSubmitting(true);
    try {
      const payload = {
        title: trimmedTitle,
        description: trimmedDescription || undefined,
        priority: formData.priority,
        startDate: formData.startDate
          ? new Date(formData.startDate).toISOString()
          : undefined,
        dueDate: formData.dueDate
          ? new Date(formData.dueDate).toISOString()
          : undefined,
        assignedTo: uniqueAssignedTo.length > 0 ? uniqueAssignedTo : undefined,
        attachments:
          normalizedAttachments.length > 0 ? normalizedAttachments : undefined,
        todoChecklist:
          normalizedTodoChecklist.length > 0
            ? normalizedTodoChecklist
            : undefined,
      };

      await axiosInstance.post(API_PATHS.TASKS.CREATE, payload);
      toast.success(successMessage);

      if (syncToCalendar) {
        const guestEmails = getAssignedUsers()
          .map((u) => u.email)
          .filter(Boolean);
        window.open(
          generateGoogleCalendarLink(formData, guestEmails),
          "_blank",
        );
      }

      if (successMode === "reset") {
        setFormData(INITIAL_STATE);
        setNewTodo("");
        setNewAttachment("");
        setUserSearch("");
        setAssigneePage(1);
        return;
      }

      if (successRedirectPath) {
        navigate(successRedirectPath);
      }
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error(error?.response?.data?.message || "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const todayFormatted = moment().format("dddd, MMMM Do YYYY");
  const todayDate = new Date().toISOString().split("T")[0];
  const dueDateMin = formData.startDate || todayDate;
  const assigneeSummaryValue =
    formData.assignedTo.length > 0
      ? formData.assignedTo.length
      : (emptyAssigneeText ?? 0);

  return (
    <DashboardLayout activeMenu={activeMenu}>
      <PageContainer>
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
              Create New Task
            </h1>
            <p className="mt-2 font-medium text-gray-700 dark:text-gray-300">{todayFormatted}</p>
            <p className="mt-1 text-gray-500 dark:text-gray-400">{description}</p>
          </div>
          <button
            onClick={handleRefresh}
            type="button"
            className="mt-4 md:mt-0 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm flex items-center"
          >
            <FaSpinner className={`mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>

        {/* Loading */}
        {loading ? (
          <PageLoader message="Loading form data..." />
        ) : (
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* ────── Left Column ────── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Task Information Card */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-5 border-b border-gray-100 dark:border-slate-700 pb-3 flex items-center gap-2">
                  <FaTasks className="text-blue-600 dark:text-blue-400" />
                  Task Information
                </h3>

                <div className="space-y-5">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="E.g., Redesign the landing page"
                      minLength={MIN_TITLE_LENGTH}
                      maxLength={200}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 flex-1 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition bg-gray-50/50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-800 text-gray-800 dark:text-gray-100"
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {formData.title.length}/200
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="5"
                      maxLength={2000}
                      placeholder="Provide a detailed description of the task..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition bg-gray-50/50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-800 text-gray-800 dark:text-gray-100 resize-none"
                    ></textarea>
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {formData.description.length}/2000
                    </p>
                  </div>

                  <div>
                    <label className="flex text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 items-center gap-2">
                      <FaLink className="text-indigo-500 dark:text-indigo-400" />
                      Attachments (File Links)
                    </label>

                    <div className="flex gap-3 mb-3">
                      <input
                        type="text"
                        value={newAttachment}
                        onChange={(e) => setNewAttachment(e.target.value)}
                        maxLength={MAX_ATTACHMENT_URL_LENGTH}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddAttachment();
                          }
                        }}
                        placeholder="Paste file URL (For example: Links Google Drive, Youtube, ...)"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 focus:border-blue-500 outline-none text-sm dark:bg-slate-800 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddAttachment}
                        className="px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 font-medium flex items-center gap-2 transition text-sm whitespace-nowrap"
                      >
                        <FaPlus size={12} /> Add Link
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAttachment}
                        className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-medium flex items-center gap-2 transition text-sm whitespace-nowrap disabled:opacity-50"
                      >
                        {isUploadingAttachment ? <FaSpinner className="animate-spin" size={12} /> : <FaUpload size={12} />}
                        {isUploadingAttachment ? "Uploading..." : "Upload File"}
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileUpload}
                      />
                    </div>

                    {formData.attachments.length > 0 ? (
                      <ul className="space-y-2">
                        {formData.attachments.map((attachment, index) => {
                          const isImage = isImageUrl(attachment);
                          return (
                            <li
                              key={`${attachment}-${index}`}
                              className={`flex justify-between gap-3 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700 ${isImage ? "flex-col items-start" : "items-center"}`}
                            >
                              {isImage ? (
                                <a href={attachment} target="_blank" rel="noreferrer" className="block w-full">
                                  <img src={attachment} alt="Attachment" className="max-h-48 rounded-lg object-contain bg-gray-100 dark:bg-slate-800" />
                                </a>
                              ) : (
                                <a
                                  href={attachment}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline truncate"
                                  title={attachment}
                                >
                                  {attachment}
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(index)}
                                className={`text-red-500 hover:text-red-700 p-1 ${isImage ? "self-end" : ""}`}
                                title="Remove attachment"
                              >
                                <FaTimes size={14} />
                              </button>
                            </li>
                          );
                        })}
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
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-5 border-b border-gray-100 dark:border-slate-700 pb-3 flex items-center gap-2">
                  <FaUserPlus className="text-indigo-600 dark:text-indigo-400" />
                  Assign Members
                </h3>

                {/* Selected Users */}
                {getAssignedUsers().length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {getAssignedUsers().map((u) => (
                      <span
                        key={u._id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50 rounded-full text-sm font-medium"
                      >
                        <MemberAvatar
                          imageUrl={u.profileImageUrl}
                          displayName={u.username || u.name}
                          sizeClass="w-5 h-5"
                          fallbackClass="bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200"
                          iconSize={10}
                        />
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
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 focus:border-blue-500 outline-none mb-3 text-sm dark:bg-slate-800 dark:text-white"
                />

                {/* User List */}
                <div className="max-h-55 overflow-y-auto rounded-xl border border-gray-100 dark:border-slate-700">
                  {paginatedUsers.length > 0 ? (
                    paginatedUsers.map((u) => {
                      const isSelected = formData.assignedTo.includes(u._id);
                      return (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() => toggleAssignee(u._id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-b border-gray-50 dark:border-slate-700/50 last:border-b-0 ${
                            isSelected ? "bg-blue-50/70 dark:bg-blue-900/30" : "hover:bg-gray-50/70 dark:hover:bg-slate-700/50"
                          }`}
                        >
                          <MemberAvatar
                            imageUrl={u.profileImageUrl}
                            displayName={u.username || u.name}
                            sizeClass="w-8 h-8"
                            fallbackClass="bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400"
                            iconSize={12}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                              {u.username || u.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {u.email}
                            </p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                              isSelected
                                ? "bg-blue-600 border-blue-600"
                                : "border-gray-300 dark:border-slate-500"
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
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-5 border-b border-gray-100 dark:border-slate-700 pb-3">
                  Todo Checklist
                </h3>

                <div className="flex gap-3 mb-4">
                  <input
                    type="text"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    maxLength={MAX_TODO_TEXT_LENGTH}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTodo();
                      }
                    }}
                    placeholder="Add a sub-task..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 focus:border-blue-500 outline-none text-sm dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddTodo}
                    className="px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 font-medium flex items-center gap-2 transition text-sm"
                  >
                    <FaPlus size={12} /> Add
                  </button>
                </div>

                {formData.todoChecklist.length > 0 ? (
                  <ul className="space-y-2">
                    {formData.todoChecklist.map((todo, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700 group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300 text-sm">
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
                  <p className="text-sm text-gray-400 italic text-center py-6 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                    No sub-tasks added yet. Type above and press Enter or click
                    Add.
                  </p>
                )}
              </div>
            </div>

            {/* ────── Right Column ────── */}
            <div className="space-y-6">
              {/* Settings Card */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-5 border-b border-gray-100 dark:border-slate-700 pb-3">
                  Settings
                </h3>

                <div className="space-y-5">
                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          val: "Low",
                          label: "Low",
                          color: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700/50",
                          active: "bg-green-600 dark:bg-green-600 text-white border-green-600",
                        },
                        {
                          val: "Medium",
                          label: "Medium",
                          color: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 border-yellow-200 dark:border-yellow-700/50",
                          active: "bg-yellow-500 dark:bg-yellow-600 text-white border-yellow-500 dark:border-yellow-600",
                        },
                        {
                          val: "High",
                          label: "High",
                          color: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700/50",
                          active: "bg-red-600 dark:bg-red-600 text-white border-red-600",
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
                    <label className="flex text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 items-center gap-2">
                      <FaCalendarAlt className="text-green-500" />
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      min={todayDate}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 focus:border-blue-500 outline-none text-gray-700 dark:text-white text-sm dark:bg-slate-800"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Defaults to today if not set. Cannot be in the past.
                    </p>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="flex text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 items-center gap-2">
                      <FaCalendarAlt className="text-red-400" />
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleChange}
                      min={dueDateMin}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 focus:border-blue-500 outline-none text-gray-700 dark:text-white text-sm dark:bg-slate-800"
                    />
                  </div>

                  {/* Date visual */}
                  {formData.dueDate && (
                    <div className="bg-linear-to-r from-blue-50 dark:from-blue-900/20 to-indigo-50 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">
                        Timeline
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
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
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
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
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-slate-700">
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                  Summary
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Priority</span>
                    <span
                      className={`font-semibold ${
                        formData.priority === "High"
                          ? "text-red-600 dark:text-red-400"
                          : formData.priority === "Medium"
                            ? "text-yellow-600 dark:text-yellow-500"
                            : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      {formData.priority}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Assignees</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {assigneeSummaryValue}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Sub-tasks</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {formData.todoChecklist.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Attachments</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {formData.attachments.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Due Date</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {formData.dueDate
                        ? moment(formData.dueDate).format("MMM DD, YYYY")
                        : "Not set"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl">
                <input
                  type="checkbox"
                  id="syncCalendar"
                  checked={syncToCalendar}
                  onChange={(e) => setSyncToCalendar(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 dark:border-slate-600 dark:bg-slate-800 rounded focus:ring-blue-500 cursor-pointer accent-blue-600"
                />
                <label
                  htmlFor="syncCalendar"
                  className="text-sm font-semibold text-blue-900 dark:text-blue-300 cursor-pointer"
                >
                  Sync to Google Calendar after creating
                </label>
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
      </PageContainer>
    </DashboardLayout>
  );
}
