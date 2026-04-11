import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import moment from "moment";
import toast from "react-hot-toast";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaExternalLinkAlt,
  FaListUl,
  FaPaperclip,
  FaSpinner,
  FaTasks,
  FaUser,
} from "react-icons/fa";
import DashboardLayout from "../layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import PageContainer from "../common/PageContainer";

const STATUS_STYLES = {
  Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  "In-Progress": "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-green-50 text-green-700 border-green-200",
};

const PRIORITY_STYLES = {
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-orange-50 text-orange-700 border-orange-200",
  High: "bg-red-50 text-red-700 border-red-200",
};

const normalizeChecklist = (checklist) => {
  if (!Array.isArray(checklist)) return [];

  return checklist
    .filter((item) => item && typeof item.text === "string")
    .map((item) => ({
      text: item.text,
      completed: Boolean(item.completed),
    }));
};

const formatTaskDate = (dateValue) => {
  if (!dateValue) return "Not set";
  return moment(dateValue).format("MMM DD, YYYY");
};

const normalizeAttachments = (attachments) => {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
};

const resolveAttachmentHref = (value) => {
  const trimmedValue = value?.trim();
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

const getStatusBasedProgress = (status, progress) => {
  const rawProgress =
    typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : 0;

  if (status === "Completed") return 100;
  if (status === "Pending") return 0;
  if (status === "In-Progress") {
    return rawProgress > 0 ? Math.min(rawProgress, 99) : 50;
  }

  return rawProgress;
};

const getAttachmentLabel = (value, index) => {
  const href = resolveAttachmentHref(value);
  if (!href) return `Attachment ${index + 1}`;

  try {
    const parsedUrl = new URL(href);
    const fileName = parsedUrl.pathname.split("/").filter(Boolean).pop();
    if (fileName) return decodeURIComponent(fileName);
    return parsedUrl.hostname;
  } catch {
    return `Attachment ${index + 1}`;
  }
};

export default function TaskDetailsPage({
  activeMenu = "My Tasks",
  backPath = "/user/my-tasks",
}) {
  const navigate = useNavigate();
  const { id } = useParams();

  const [task, setTask] = useState(null);
  const [checklistDraft, setChecklistDraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);

  const fetchTaskDetails = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(
        API_PATHS.TASKS.GET_TASK_BY_ID(id),
      );
      const fetchedTask = response?.data;

      setTask(fetchedTask);
      setChecklistDraft(normalizeChecklist(fetchedTask?.todoChecklist));
    } catch (error) {
      console.error("Failed to fetch task details", error);
      toast.error(
        error?.response?.data?.message || "Failed to load task details",
      );
      setTask(null);
      setChecklistDraft([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    fetchTaskDetails();
  }, [id]);

  const baseChecklist = useMemo(
    () => normalizeChecklist(task?.todoChecklist),
    [task],
  );

  const attachmentLinks = useMemo(() => {
    return normalizeAttachments(task?.attachments).map((link, index) => ({
      raw: link,
      href: resolveAttachmentHref(link),
      label: getAttachmentLabel(link, index),
    }));
  }, [task]);

  const checklistProgress = useMemo(() => {
    const total = checklistDraft.length;
    const completed = checklistDraft.filter((item) => item.completed).length;
    const progress =
      total > 0
        ? Math.round((completed / total) * 100)
        : getStatusBasedProgress(task?.status, task?.progress);

    return { total, completed, progress };
  }, [checklistDraft, task]);

  const hasChecklistChanges = useMemo(() => {
    return JSON.stringify(checklistDraft) !== JSON.stringify(baseChecklist);
  }, [checklistDraft, baseChecklist]);

  const handleToggleChecklistItem = (index) => {
    setChecklistDraft((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, completed: !item.completed } : item,
      ),
    );
  };

  const handleSaveChecklist = async () => {
    if (!task?._id || !hasChecklistChanges || savingChecklist) return;

    setSavingChecklist(true);
    try {
      const response = await axiosInstance.put(
        API_PATHS.TASKS.UPDATE_CHECKLIST(task._id),
        {
          todoChecklist: checklistDraft,
        },
      );

      const updatedTask = response?.data?.task;
      setTask(updatedTask);
      setChecklistDraft(normalizeChecklist(updatedTask?.todoChecklist));
      toast.success("Checklist updated successfully");
    } catch (error) {
      console.error("Failed to update checklist", error);
      toast.error(
        error?.response?.data?.message || "Failed to update checklist",
      );
    } finally {
      setSavingChecklist(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!task?._id || task.status === newStatus || updatingStatus) return;

    setUpdatingStatus(true);
    try {
      const response = await axiosInstance.put(
        API_PATHS.TASKS.UPDATE_STATUS(task._id),
        {
          status: newStatus,
        },
      );

      const updatedTask = response?.data?.task;
      setTask(updatedTask);
      setChecklistDraft(normalizeChecklist(updatedTask?.todoChecklist));
      toast.success(`Status changed to ${newStatus}`);
    } catch (error) {
      console.error("Failed to update task status", error);
      toast.error(error?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <DashboardLayout activeMenu={activeMenu}>
      <PageContainer>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(backPath)}
              className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors shrink-0"
              title="Back"
            >
              <FaArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Task Details</h1>
              <p className="mt-2 text-gray-500">
                View full task info and manage checklist progress.
              </p>
            </div>
          </div>

          <button
            onClick={fetchTaskDetails}
            disabled={loading}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm flex items-center disabled:opacity-60"
          >
            <FaSpinner className={`mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center">
            <FaSpinner className="animate-spin text-blue-500" size={32} />
            <p className="mt-3 text-gray-500 font-medium">
              Loading task details...
            </p>
          </div>
        ) : !task ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <p className="text-gray-600 font-medium">
              Task not found or you do not have access.
            </p>
            <button
              onClick={() => navigate(backPath)}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FaTasks className="text-blue-600" />
                  Task Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                      Title
                    </p>
                    <p className="text-lg font-semibold text-gray-800 mt-1">
                      {task.title || "Untitled task"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                      Description
                    </p>
                    <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                      {task.description || "No description provided."}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                      Attachments
                    </p>
                    {attachmentLinks.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {attachmentLinks.map((attachment, index) => (
                          <div
                            key={`${attachment.raw}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              <FaPaperclip className="text-indigo-500 shrink-0" />
                              {attachment.href ? (
                                <a
                                  href={attachment.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline truncate"
                                  title={attachment.raw}
                                >
                                  {attachment.label}
                                </a>
                              ) : (
                                <span
                                  className="text-sm text-gray-700 truncate"
                                  title={attachment.raw}
                                >
                                  {attachment.raw}
                                </span>
                              )}
                            </div>
                            {attachment.href && (
                              <FaExternalLinkAlt className="text-gray-400 text-xs shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-1">
                        No attachments added.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FaListUl className="text-indigo-600" />
                  Checklist
                </h3>

                {checklistDraft.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {checklistDraft.map((item, index) => (
                        <label
                          key={`${item.text}-${index}`}
                          className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/40 transition-colors cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => handleToggleChecklistItem(index)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span
                            className={`text-sm ${item.completed ? "text-gray-500 line-through" : "text-gray-800"}`}
                          >
                            {item.text}
                          </span>
                        </label>
                      ))}
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-500 font-medium">
                        {checklistProgress.completed}/{checklistProgress.total}{" "}
                        completed
                      </p>
                      <button
                        onClick={handleSaveChecklist}
                        disabled={!hasChecklistChanges || savingChecklist}
                        className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {savingChecklist ? (
                          <>
                            <FaSpinner className="animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          "Save Checklist"
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">
                    This task has no checklist items. Progress is currently
                    based on task status ({checklistProgress.progress}%).
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Task Status
                </h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">
                      Current Status
                    </p>
                    <select
                      value={task.status || "Pending"}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      disabled={updatingStatus}
                      className={`w-full appearance-none cursor-pointer px-3 py-2.5 rounded-lg text-sm font-medium border outline-none transition-colors ${STATUS_STYLES[task.status] || "bg-gray-50 text-gray-700 border-gray-200"}`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In-Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">
                      Priority
                    </p>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${PRIORITY_STYLES[task.priority] || "bg-gray-50 text-gray-700 border-gray-200"}`}
                    >
                      {task.priority || "Medium"}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">
                      Progress
                    </p>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${checklistProgress.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 font-medium">
                      {checklistProgress.progress}% complete
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Timeline & People
                </h3>

                <div className="space-y-4 text-sm text-gray-700">
                  <div className="flex items-center gap-3">
                    <FaCalendarAlt className="text-blue-500" />
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">
                        Created
                      </p>
                      <p className="font-medium">
                        {formatTaskDate(task.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <FaClock className="text-orange-500" />
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">
                        Due Date
                      </p>
                      <p className="font-medium">
                        {formatTaskDate(task.dueDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <FaUser className="text-indigo-500 mt-1" />
                    <div className="w-full">
                      <p className="text-xs text-gray-400 uppercase tracking-wider">
                        Assignees
                      </p>
                      {Array.isArray(task.assignedTo) &&
                      task.assignedTo.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {task.assignedTo.map((assignee) => {
                            const name =
                              assignee?.username ||
                              assignee?.name ||
                              assignee?.email ||
                              "Unknown";
                            return (
                              <div
                                key={assignee?._id || name}
                                className="flex items-center gap-2"
                              >
                                {assignee?.profileImageUrl ? (
                                  <img
                                    src={assignee.profileImageUrl}
                                    alt={name}
                                    className="w-7 h-7 rounded-full object-cover border border-gray-200"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                    {name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="text-sm text-gray-700 truncate">
                                  {name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-gray-500">
                          No assignees.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <FaCheckCircle className="text-emerald-500" />
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">
                        Created By
                      </p>
                      <p className="font-medium">
                        {task?.createdBy?.username ||
                          task?.createdBy?.name ||
                          task?.createdBy?.email ||
                          "Unknown"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </DashboardLayout>
  );
}
