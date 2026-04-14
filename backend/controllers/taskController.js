import Task from "../models/Task.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { createNotification } from "./notificationController.js";

// --- Validation constants ---
const VALID_PRIORITIES = ["Low", "Medium", "High"];
const VALID_STATUSES = ["Pending", "In-Progress", "Completed"];
const MAX_PAGE_LIMIT = 100;
const ALLOWED_URL_PROTOCOLS = new Set(["http:", "https:"]);
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const isValidDate = (d) => !isNaN(Date.parse(d));

const normalizeAssignedTo = (assignedTo) => {
  if (assignedTo === undefined) return undefined;

  const rawAssignedIds = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
  const dedupedAssignedIds = [];
  const seenAssignedIds = new Set();

  for (const assigneeId of rawAssignedIds) {
    const key = assigneeId?.toString();
    if (!seenAssignedIds.has(key)) {
      seenAssignedIds.add(key);
      dedupedAssignedIds.push(assigneeId);
    }
  }

  return dedupedAssignedIds;
};

const hasPastDate = (value) => {
  const dateOnly = new Date(value);
  dateOnly.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dateOnly < today;
};

const toDateOnlyTimestamp = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const isStartDateAfterDueDate = (startDate, dueDate) => {
  return toDateOnlyTimestamp(startDate) > toDateOnlyTimestamp(dueDate);
};

const normalizeHttpUrl = (rawValue) => {
  if (typeof rawValue !== "string") return null;

  const trimmed = rawValue.trim();
  if (!trimmed || trimmed.length > 500) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (!ALLOWED_URL_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

const validateAndNormalizeAttachments = (attachments) => {
  if (!Array.isArray(attachments)) {
    return { error: "Attachments must be an array" };
  }

  if (attachments.length > 20) {
    return { error: "Maximum 20 attachments allowed" };
  }

  const normalized = [];
  for (const item of attachments) {
    if (typeof item !== "string" || item.trim().length === 0) {
      return { error: "Each attachment must be a non-empty string" };
    }

    const normalizedUrl = normalizeHttpUrl(item);
    if (!normalizedUrl) {
      return {
        error:
          "Each attachment must be a valid HTTP/HTTPS URL and at most 500 characters",
      };
    }

    normalized.push(normalizedUrl);
  }

  return { normalized };
};

const isTaskAssignedToUser = (taskAssignedTo, userId) => {
  if (!taskAssignedTo) return false;
  const assignedIds = Array.isArray(taskAssignedTo)
    ? taskAssignedTo
    : [taskAssignedTo];

  return assignedIds.some((assignee) => {
    const id = assignee?._id || assignee;
    return id?.toString() === userId.toString();
  });
};

const validateAssignedUsersExist = async (assignedIds) => {
  const uniqueIds = [...new Set(assignedIds.map((id) => id.toString()))];
  const existingUsersCount = await User.countDocuments({
    _id: { $in: uniqueIds },
  });

  return existingUsersCount === uniqueIds.length;
};

const getUniqueIdStrings = (ids = []) => {
  return [...new Set(ids.map((id) => id.toString()))];
};

const validateAndNormalizeTodoChecklist = (todoChecklist) => {
  if (!Array.isArray(todoChecklist)) {
    return { error: "todoChecklist must be an array" };
  }

  if (todoChecklist.length > 50) {
    return {
      error: "Maximum 50 checklist items allowed",
    };
  }

  const normalized = [];
  for (const item of todoChecklist) {
    const text = typeof item?.text === "string" ? item.text.trim() : "";
    if (!text) {
      return {
        error: "Each checklist item must have a non-empty text field",
      };
    }

    if (text.length > 500) {
      return {
        error: "Checklist item text exceeds 500 characters",
      };
    }

    if (item.completed !== undefined && typeof item.completed !== "boolean") {
      return { error: "completed must be a boolean" };
    }

    normalized.push({
      text,
      completed: item.completed === true,
    });
  }

  return { normalized };
};

// @desc   Get all tasks (Admin: all tasks, User: assigned or created tasks)
// @route  GET /api/tasks
// @access Private
export const getTasks = async (req, res) => {
  try {
    const { status } = req.query;
    const ignorePinned = req.query.ignorePinned === "true";
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      MAX_PAGE_LIMIT,
    );
    const skip = (page - 1) * limit;
    let filter = {};

    if (status) {
      if (status === "Overdue") {
        filter.dueDate = { $ne: null, $lt: startOfToday };
        filter.status = { $ne: "Completed" };
      } else if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          message: `Invalid status filter. Valid options: ${VALID_STATUSES.join(", ")}, Overdue`,
        });
      } else {
        filter.status = status;
      }
    }

    const baseUserFilter =
      req.user.role === "admin"
        ? {}
        : { $or: [{ assignedTo: req.user._id }, { createdBy: req.user._id }] };

    const listFilter = {
      ...baseUserFilter,
      ...filter,
    };

    const sortCriteria = ignorePinned
      ? { createdAt: -1, _id: -1 }
      : { isPinned: -1, createdAt: -1, _id: -1 };

    let tasks = await Task.find(listFilter)
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .populate("assignedTo", "username email profileImageUrl role")
      .populate("createdBy", "username email profileImageUrl role");

    const totalFilteredTasks = await Task.countDocuments(listFilter);

    // Add completed todoChecklist count to each task
    tasks = tasks.map((task) => {
      const completedCount = task.todoChecklist.filter(
        (item) => item.completed,
      ).length;
      return {
        ...task._doc,
        completedTodoCount: completedCount,
      };
    });

    // Status summary count
    const allTasks = await Task.countDocuments(baseUserFilter);

    const pendingTasks = await Task.countDocuments({
      status: "Pending",
      ...baseUserFilter,
    });

    const inProgressTasks = await Task.countDocuments({
      status: "In-Progress",
      ...baseUserFilter,
    });

    const completedTasks = await Task.countDocuments({
      status: "Completed",
      ...baseUserFilter,
    });

    const overdueTasks = await Task.countDocuments({
      ...baseUserFilter,
      dueDate: { $ne: null, $lt: startOfToday },
      status: { $ne: "Completed" },
    });

    res.json({
      tasks,
      statusSummary: {
        total: allTasks,
        pending: pendingTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
        overdue: overdueTasks,
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalFilteredTasks / limit),
        totalTasks: totalFilteredTasks,
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Get task by ID (Admin: any task, User: assigned or created task)
// @route  GET /api/tasks/:id
// @access Private
export const getTaskById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "username email profileImageUrl role")
      .populate("createdBy", "username email profileImageUrl role");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permission: admin, assigned user, or task creator
    const isAdmin = req.user.role === "admin";
    const isAssigned = isTaskAssignedToUser(task.assignedTo, req.user._id);
    const creatorId = task.createdBy?._id || task.createdBy;
    const isCreator = creatorId.toString() === req.user._id.toString();

    if (!isAdmin && !isAssigned && !isCreator) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Create new task (All authenticated users)
// @route  POST /api/tasks
// @access Private
export const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      startDate,
      dueDate,
      assignedTo,
      attachments,
      todoChecklist,
    } = req.body;

    // Validate title
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (title.trim().length < 3) {
      return res.status(400).json({
        message: "Title must be at least 3 characters",
      });
    }
    if (title.trim().length > 200) {
      return res
        .status(400)
        .json({ message: "Title must be at most 200 characters" });
    }

    // Validate description
    if (description !== undefined && typeof description !== "string") {
      return res.status(400).json({ message: "Description must be a string" });
    }
    if (description && description.trim().length > 2000) {
      return res
        .status(400)
        .json({ message: "Description must be at most 2000 characters" });
    }

    // Validate priority
    if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        message: `Priority must be one of: ${VALID_PRIORITIES.join(", ")}`,
      });
    }

    // Validate startDate
    if (
      startDate !== undefined &&
      startDate !== null &&
      !isValidDate(startDate)
    ) {
      return res.status(400).json({ message: "Invalid start date" });
    }
    if (
      startDate !== undefined &&
      startDate !== null &&
      hasPastDate(startDate)
    ) {
      return res.status(400).json({
        message: "Start date cannot be in the past",
      });
    }

    // Validate dueDate
    if (dueDate !== undefined && dueDate !== null && !isValidDate(dueDate)) {
      return res.status(400).json({ message: "Invalid due date" });
    }
    if (dueDate !== undefined && dueDate !== null && hasPastDate(dueDate)) {
      return res.status(400).json({
        message: "Due date cannot be in the past",
      });
    }

    // Validate startDate vs dueDate
    const finalStartDate = startDate ?? new Date();
    if (dueDate !== undefined && dueDate !== null) {
      if (isStartDateAfterDueDate(finalStartDate, dueDate)) {
        return res
          .status(400)
          .json({ message: "Start date cannot be after due date" });
      }
    }

    // Handle assignedTo based on user role
    let normalizedAssignedTo;
    if (assignedTo !== undefined) {
      // Both admin and regular users can assign to anyone
      normalizedAssignedTo = normalizeAssignedTo(assignedTo);
      if (!normalizedAssignedTo || normalizedAssignedTo.length === 0) {
        return res.status(400).json({
          message: "assignedTo must contain at least one user ID",
        });
      }
      const hasInvalidAssignee = normalizedAssignedTo.some(
        (id) => !isValidObjectId(id),
      );
      if (hasInvalidAssignee) {
        return res
          .status(400)
          .json({ message: "Each assignedTo value must be a valid user ID" });
      }

      const allAssigneesExist =
        await validateAssignedUsersExist(normalizedAssignedTo);
      if (!allAssigneesExist) {
        return res.status(400).json({
          message: "User assigned to task does not exist",
        });
      }
    } else {
      // If no assignedTo provided, assign to creator by default
      normalizedAssignedTo = [req.user._id];
    }

    let normalizedAttachments = attachments;
    let normalizedTodoChecklist = todoChecklist;

    // Validate attachments
    if (attachments !== undefined) {
      const attachmentValidation = validateAndNormalizeAttachments(attachments);
      if (attachmentValidation.error) {
        return res.status(400).json({ message: attachmentValidation.error });
      }

      normalizedAttachments = attachmentValidation.normalized;
    }

    // Validate todoChecklist
    if (todoChecklist !== undefined) {
      const checklistValidation =
        validateAndNormalizeTodoChecklist(todoChecklist);
      if (checklistValidation.error) {
        return res.status(400).json({ message: checklistValidation.error });
      }

      normalizedTodoChecklist = checklistValidation.normalized;
    }

    // Calculate initial progress and status based on todoChecklist
    let initialProgress = 0;
    let initialStatus = "Pending";

    if (normalizedTodoChecklist && normalizedTodoChecklist.length > 0) {
      const completedCount = normalizedTodoChecklist.filter(
        (item) => item.completed,
      ).length;
      initialProgress = Math.round(
        (completedCount / normalizedTodoChecklist.length) * 100,
      );

      // Set initial status based on progress
      if (initialProgress === 100) {
        initialStatus = "Completed";
      } else if (initialProgress > 0 && initialProgress < 100) {
        initialStatus = "In-Progress";
      } else {
        initialStatus = "Pending";
      }
    }

    const task = await Task.create({
      title: title.trim(),
      description: description?.trim(),
      priority,
      startDate: startDate || new Date(),
      dueDate,
      assignedTo: normalizedAssignedTo,
      createdBy: req.user._id,
      todoChecklist: normalizedTodoChecklist,
      attachments: normalizedAttachments,
      progress: initialProgress,
      status: initialStatus,
    });

    // Create notifications for creation
    await createNotification(
      req.user._id,
      `Task "${task.title}" created successfully`,
      "task_created",
      task._id,
    );

    if (task.assignedTo && task.assignedTo.length > 0) {
      const uniqueAssignedUserIds = getUniqueIdStrings(task.assignedTo);
      for (const assignedId of uniqueAssignedUserIds) {
        if (assignedId !== req.user._id.toString()) {
          await createNotification(
            assignedId,
            `You have been assigned to task "${task.title}"`,
            "task_assigned",
            task._id,
          );
        }
      }
    }

    res.status(201).json({ message: "Task created successfully", task });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc   Update task (Admin or task creator)
// @route  PUT /api/tasks/:id
// @access Private
export const updateTask = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permission: admin or task creator
    const isAdmin = req.user.role === "admin";
    const creatorId = task.createdBy?._id || task.createdBy;
    const isCreator = creatorId.toString() === req.user._id.toString();

    if (!isAdmin && !isCreator) {
      return res.status(403).json({
        message: "Access denied. You can only edit tasks you created.",
      });
    }

    const {
      title,
      description,
      priority,
      startDate,
      dueDate,
      assignedTo,
      attachments,
      todoChecklist,
      status,
    } = req.body;

    // Reject if user tries to update status directly (use updateTaskStatus endpoint instead)
    if (status !== undefined) {
      return res.status(400).json({
        message:
          "Cannot update status directly. Please update todoChecklist to auto-sync status.",
      });
    }

    // Both admin and creator can change assignedTo
    // (Permission already checked above: only admin or creator can reach here)

    // Validate from fields if provided
    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return res
          .status(400)
          .json({ message: "Title must be a non-empty string" });
      }
      if (title.trim().length < 3) {
        return res.status(400).json({
          message: "Title must be at least 3 characters",
        });
      }
      if (title.trim().length > 200) {
        return res
          .status(400)
          .json({ message: "Title must be at most 200 characters" });
      }
    }
    if (description !== undefined && typeof description !== "string") {
      return res.status(400).json({ message: "Description must be a string" });
    }
    if (description && description.trim().length > 2000) {
      return res
        .status(400)
        .json({ message: "Description must be at most 2000 characters" });
    }
    if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        message: `Priority must be one of: ${VALID_PRIORITIES.join(", ")}`,
      });
    }
    if (dueDate !== undefined && dueDate !== null && !isValidDate(dueDate)) {
      return res.status(400).json({ message: "Invalid due date" });
    }
    // Only block past dates if the user is actually changing to a new date
    // (Allow keeping the original date even if it's in the past)
    if (dueDate !== undefined && dueDate !== null && hasPastDate(dueDate)) {
      const existingDueDate = task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : null;
      const newDueDate = new Date(dueDate).toISOString().split("T")[0];
      if (existingDueDate !== newDueDate) {
        return res.status(400).json({
          message: "Due date cannot be in the past",
        });
      }
    }

    if (
      startDate !== undefined &&
      startDate !== null &&
      !isValidDate(startDate)
    ) {
      return res.status(400).json({ message: "Invalid start date" });
    }
    if (
      startDate !== undefined &&
      startDate !== null &&
      hasPastDate(startDate)
    ) {
      const existingStartDate = task.startDate
        ? new Date(task.startDate).toISOString().split("T")[0]
        : task.createdAt
          ? new Date(task.createdAt).toISOString().split("T")[0]
          : null;
      const newStartDate = new Date(startDate).toISOString().split("T")[0];
      if (existingStartDate !== newStartDate) {
        return res.status(400).json({
          message: "Start date cannot be changed to a past date",
        });
      }
    }

    const finalStartDate = startDate !== undefined ? startDate : task.startDate;
    const finalDueDate = dueDate !== undefined ? dueDate : task.dueDate;
    if (
      finalStartDate &&
      finalDueDate &&
      isStartDateAfterDueDate(finalStartDate, finalDueDate)
    ) {
      return res
        .status(400)
        .json({ message: "Start date cannot be after due date" });
    }

    const normalizedAssignedTo = normalizeAssignedTo(assignedTo);
    if (
      normalizedAssignedTo !== undefined &&
      normalizedAssignedTo.length === 0
    ) {
      return res.status(400).json({
        message: "assignedTo must contain at least one user ID",
      });
    }
    if (
      normalizedAssignedTo !== undefined &&
      normalizedAssignedTo.some((id) => !isValidObjectId(id))
    ) {
      return res
        .status(400)
        .json({ message: "Each assignedTo value must be a valid user ID" });
    }
    if (normalizedAssignedTo !== undefined) {
      const allAssigneesExist =
        await validateAssignedUsersExist(normalizedAssignedTo);
      if (!allAssigneesExist) {
        return res.status(400).json({
          message: "User assigned to task does not exist",
        });
      }
    }
    let normalizedAttachments;
    let normalizedTodoChecklist;
    if (attachments !== undefined) {
      const attachmentValidation = validateAndNormalizeAttachments(attachments);
      if (attachmentValidation.error) {
        return res.status(400).json({ message: attachmentValidation.error });
      }
      normalizedAttachments = attachmentValidation.normalized;
    }
    if (todoChecklist !== undefined) {
      const checklistValidation =
        validateAndNormalizeTodoChecklist(todoChecklist);
      if (checklistValidation.error) {
        return res.status(400).json({ message: checklistValidation.error });
      }

      normalizedTodoChecklist = checklistValidation.normalized;
    }

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (priority !== undefined) task.priority = priority;
    if (startDate !== undefined) task.startDate = startDate;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (normalizedAssignedTo !== undefined)
      task.assignedTo = normalizedAssignedTo;
    if (attachments !== undefined) task.attachments = normalizedAttachments;
    if (todoChecklist !== undefined) {
      task.todoChecklist = normalizedTodoChecklist;

      // Automatically recalculate progress and status when todoChecklist changes
      const completedCount = normalizedTodoChecklist.filter(
        (item) => item.completed,
      ).length;
      task.progress =
        normalizedTodoChecklist.length > 0
          ? Math.round((completedCount / normalizedTodoChecklist.length) * 100)
          : 0;

      // Automatically update status based on progress
      if (task.progress === 100) {
        task.status = "Completed";
      } else if (task.progress > 0 && task.progress < 100) {
        task.status = "In-Progress";
      } else {
        task.status = "Pending";
      }
    }

    const updatedTask = await task.save();

    // Create notifications for update
    await createNotification(
      req.user._id,
      `Task "${task.title}" updated successfully`,
      "task_updated",
      task._id,
    );
    if (task.assignedTo && task.assignedTo.length > 0) {
      const uniqueAssignedUserIds = getUniqueIdStrings(task.assignedTo);
      for (const assignedId of uniqueAssignedUserIds) {
        if (assignedId !== req.user._id.toString()) {
          await createNotification(
            assignedId,
            `Task "${task.title}" has been updated`,
            "task_updated",
            task._id,
          );
        }
      }
    }

    res.json({ message: "Task updated successfully", updatedTask });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Delete task (Admin or task creator)
// @route  DELETE /api/tasks/:id
// @access Private
export const deleteTask = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permission: admin or task creator
    const isAdmin = req.user.role === "admin";
    const creatorId = task.createdBy?._id || task.createdBy;
    const isCreator = creatorId.toString() === req.user._id.toString();

    if (!isAdmin && !isCreator) {
      return res.status(403).json({
        message: "Access denied. You can only delete tasks you created.",
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    await createNotification(
      req.user._id,
      `Task "${task.title}" deleted successfully`,
      "task_deleted",
    );
    if (task.assignedTo && task.assignedTo.length > 0) {
      const uniqueAssignedUserIds = getUniqueIdStrings(task.assignedTo);
      for (const assignedId of uniqueAssignedUserIds) {
        if (assignedId !== req.user._id.toString()) {
          await createNotification(
            assignedId,
            `Task "${task.title}" has been deleted`,
            "task_deleted",
          );
        }
      }
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Update task status (Admin, assigned user, or task creator)
// @route  PUT /api/tasks/:id/status
// @access Private
export const updateTaskStatus = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permission: admin, assigned user, or task creator
    const isAdmin = req.user.role === "admin";
    const isAssigned = isTaskAssignedToUser(task.assignedTo, req.user._id);
    const creatorId = task.createdBy?._id || task.createdBy;
    const isCreator = creatorId.toString() === req.user._id.toString();

    if (!isAdmin && !isAssigned && !isCreator) {
      return res.status(403).json({ message: "Access denied" });
    }

    // If task has NO checklist items, allow free status change
    if (!task.todoChecklist || task.todoChecklist.length === 0) {
      task.status = status;
      if (status === "Completed") {
        task.progress = 100;
      } else if (status === "In-Progress") {
        task.progress = 50;
      } else {
        task.progress = 0;
      }
    } else {
      // Task has checklist items
      if (status === "Completed") {
        // When switching to Completed: mark all checklist items as true
        task.todoChecklist.forEach((item) => (item.completed = true));
        task.progress = 100;
        task.status = status;
      } else {
        // Prevent contradicting checklist state
        const completedCount = task.todoChecklist.filter(
          (item) => item.completed,
        ).length;
        const calculatedProgress =
          task.todoChecklist.length > 0
            ? Math.round((completedCount / task.todoChecklist.length) * 100)
            : 0;

        if (calculatedProgress === 100) {
          return res.status(400).json({
            message:
              "Cannot change status when all checklist items are completed. Uncomplete some items first.",
          });
        }

        task.status = status;
        task.progress = calculatedProgress;
      }
    }

    await task.save();

    const notifyUsers = [
      ...new Set([
        task.createdBy.toString(),
        ...(task.assignedTo?.map((id) => id.toString()) || []),
      ]),
    ];
    for (const userId of notifyUsers) {
      if (userId !== req.user._id.toString()) {
        await createNotification(
          userId,
          `Status of task "${task.title}" changed to ${task.status}`,
          "progress_updated",
          task._id,
        );
      }
    }

    res.json({ message: "Task status updated successfully", task });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Update task checklist (Admin, assigned user, or task creator)
// @route  PUT /api/tasks/:id/todo
// @access Private
export const updateTaskChecklist = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const { todoChecklist } = req.body;

    if (!Array.isArray(todoChecklist)) {
      return res
        .status(400)
        .json({ message: "todoChecklist must be an array" });
    }

    const checklistValidation =
      validateAndNormalizeTodoChecklist(todoChecklist);
    if (checklistValidation.error) {
      return res.status(400).json({ message: checklistValidation.error });
    }
    const normalizedTodoChecklist = checklistValidation.normalized;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permission: admin, assigned user, or task creator
    const isAdmin = req.user.role === "admin";
    const isAssigned = isTaskAssignedToUser(task.assignedTo, req.user._id);
    const creatorId = task.createdBy?._id || task.createdBy;
    const isCreator = creatorId.toString() === req.user._id.toString();

    if (!isAdmin && !isAssigned && !isCreator) {
      return res.status(403).json({ message: "Access denied" });
    }

    task.todoChecklist = normalizedTodoChecklist;

    // Automatically calculate progress from checklist
    const completedCount = normalizedTodoChecklist.filter(
      (item) => item.completed,
    ).length;
    task.progress =
      normalizedTodoChecklist.length > 0
        ? Math.round((completedCount / normalizedTodoChecklist.length) * 100)
        : 0;

    // If all checklist items are completed, automatically set task status to Completed
    if (task.progress === 100) {
      task.status = "Completed";
    }
    // If some checklist items are completed but not 100%, set status to In-Progress
    else if (task.progress > 0 && task.progress < 100) {
      task.status = "In-Progress";
    } else {
      task.status = "Pending";
    }
    await task.save();

    const notifyUsers = [
      ...new Set([
        task.createdBy.toString(),
        ...(task.assignedTo?.map((id) => id.toString()) || []),
      ]),
    ];
    for (const userId of notifyUsers) {
      if (userId !== req.user._id.toString()) {
        await createNotification(
          userId,
          `Checklist in task "${task.title}" was updated`,
          "checklist_completed",
          task._id,
        );
      } else {
        await createNotification(
          req.user._id,
          `Checklist in task "${task.title}" updated successfully`,
          "checklist_completed",
          task._id,
        );
      }
    }

    const updatedTask = await Task.findById(req.params.id)
      .populate("assignedTo", "username email profileImageUrl role")
      .populate("createdBy", "username email profileImageUrl role");
    res.json({
      message: "Task checklist updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Get dashboard data (Admin only)
// @route  GET /api/tasks/dashboard-data
// @access Private/Admin
export const getDashboardData = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      MAX_PAGE_LIMIT,
    );
    const skip = (page - 1) * limit;

    const totalTasks = await Task.countDocuments();
    const pendingTasks = await Task.countDocuments({ status: "Pending" });
    const inProgressTasks = await Task.countDocuments({
      status: "In-Progress",
    });
    const completedTasks = await Task.countDocuments({ status: "Completed" });
    const overdueTasks = await Task.countDocuments({
      dueDate: { $lt: new Date() },
      status: { $ne: "Completed" },
    });

    // ensure all possible statuses are included
    const taskStatuses = ["Pending", "In-Progress", "Completed"];
    const taskDistributionRaw = await Task.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);
    const taskDistribution = taskStatuses.reduce((acc, status) => {
      const formattedKey = status.replace(/\s/g, "");
      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0;
      return acc;
    }, {});

    taskDistribution["All"] = totalTasks;

    // Ensure all priority levels are included
    const taskPriorities = ["Low", "Medium", "High"];
    const taskPriorityLevelsRaw = await Task.aggregate([
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]);
    const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
      return acc;
    }, {});

    // Fetch paginated recent tasks
    const recentTaskDocs = await Task.find()
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        "title status priority dueDate createdAt createdBy isPinned todoChecklist progress",
      )
      .populate("createdBy", "username profileImageUrl email");

    const recentTasks = recentTaskDocs.map((task) => {
      const completedTodoCount = Array.isArray(task.todoChecklist)
        ? task.todoChecklist.filter((item) => item.completed).length
        : 0;

      return {
        ...task.toObject(),
        completedTodoCount,
      };
    });

    const totalPages = Math.max(Math.ceil(totalTasks / limit), 1);

    res.json({
      statistics: {
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels,
      },
      recentTasks,
      pagination: {
        currentPage: page,
        totalPages,
        totalTasks,
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Get user dashboard data
// @route  GET /api/tasks/user-dashboard-data
// @access Private
export const getUserDashboardData = async (req, res) => {
  try {
    const userId = req.user._id;
    const applyPinnedSort = req.query.applyPinnedSort === "true";
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      MAX_PAGE_LIMIT,
    );
    const skip = (page - 1) * limit;

    // User sees tasks assigned to them OR tasks they created
    const userFilter = {
      $or: [{ assignedTo: userId }, { createdBy: userId }],
    };

    // Fetch statistics for user-specific data
    const totalTasks = await Task.countDocuments(userFilter);
    const pendingTasks = await Task.countDocuments({
      ...userFilter,
      status: "Pending",
    });
    const inProgressTasks = await Task.countDocuments({
      ...userFilter,
      status: "In-Progress",
    });
    const completedTasks = await Task.countDocuments({
      ...userFilter,
      status: "Completed",
    });
    const overdueTasks = await Task.countDocuments({
      ...userFilter,
      dueDate: { $lt: new Date() },
      status: { $ne: "Completed" },
    });

    // Task distribution by status for user
    const taskStatuses = ["Pending", "In-Progress", "Completed"];
    const taskDistributionRaw = await Task.aggregate([
      { $match: userFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);
    const taskDistribution = taskStatuses.reduce((acc, status) => {
      const formattedKey = status.replace(/\s/g, "");
      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0;
      return acc;
    }, {});

    // Task distribution by priority for user
    const taskPriorities = ["Low", "Medium", "High"];
    const taskPriorityLevelsRaw = await Task.aggregate([
      { $match: userFilter },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]);
    const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
      return acc;
    }, {});

    // Fetch paginated tasks for user
    const recentTaskDocs = await Task.find(userFilter)
      .sort(
        applyPinnedSort
          ? { isPinned: -1, createdAt: -1, _id: -1 }
          : { createdAt: -1, _id: -1 },
      )
      .skip(skip)
      .limit(limit)
      .select(
        "title status priority dueDate createdAt createdBy isPinned todoChecklist progress",
      )
      .populate("createdBy", "username profileImageUrl email");

    const recentTasks = recentTaskDocs.map((task) => {
      const completedTodoCount = Array.isArray(task.todoChecklist)
        ? task.todoChecklist.filter((item) => item.completed).length
        : 0;

      return {
        ...task.toObject(),
        completedTodoCount,
      };
    });

    const totalPages = Math.max(Math.ceil(totalTasks / limit), 1);

    res.json({
      statistics: {
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels,
      },
      recentTasks,
      pagination: {
        currentPage: page,
        totalPages,
        totalTasks,
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Toggle pin status of a task
// @route  PATCH /api/tasks/:id/pin
// @access Private
export const togglePinTask = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permission: admin, assigned user, or task creator
    const isAdmin = req.user.role === "admin";
    const isAssigned = isTaskAssignedToUser(task.assignedTo, req.user._id);
    const creatorId = task.createdBy?._id || task.createdBy;
    const isCreator = creatorId?.toString() === req.user._id.toString();

    if (!isAdmin && !isAssigned && !isCreator) {
      return res.status(403).json({ message: "Access denied" });
    }

    task.isPinned = !task.isPinned;
    await task.save();

    res.json({ message: "Task pin status updated", isPinned: task.isPinned });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export default {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskChecklist,
  getDashboardData,
  getUserDashboardData,
  togglePinTask,
};
