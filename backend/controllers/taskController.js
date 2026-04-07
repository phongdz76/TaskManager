import Task from "../models/Task.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// --- Validation constants ---
const VALID_PRIORITIES = ["Low", "Medium", "High"];
const VALID_STATUSES = ["Pending", "In-Progress", "Completed"];
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const isValidDate = (d) => !isNaN(Date.parse(d));

const normalizeAssignedTo = (assignedTo) => {
  if (assignedTo === undefined) return undefined;
  if (Array.isArray(assignedTo)) return assignedTo;
  return [assignedTo];
};

const hasPastDate = (value) => {
  const dateOnly = new Date(value);
  dateOnly.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dateOnly < today;
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

// @desc   Get all tasks (Admin : all tasks, User : assigned tasks)
// @route  GET /api/tasks
// @access Private
export const getTasks = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          message: `Invalid status filter. Valid options: ${VALID_STATUSES.join(", ")}`,
        });
      }
      filter.status = status;
    }

    let tasks;
    if (req.user.role === "admin") {
      tasks = await Task.find(filter)
        .populate("assignedTo", "username email profileImageUrl")
        .populate("createdBy", "username email profileImageUrl");
    } else {
      // User can see tasks assigned to them OR tasks they created
      tasks = await Task.find({
        ...filter,
        $or: [{ assignedTo: req.user._id }, { createdBy: req.user._id }],
      })
        .populate("assignedTo", "username email profileImageUrl")
        .populate("createdBy", "username email profileImageUrl");
    }

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
    const baseUserFilter =
      req.user.role === "admin"
        ? {}
        : { $or: [{ assignedTo: req.user._id }, { createdBy: req.user._id }] };

    const allTasks = await Task.countDocuments(baseUserFilter);

    const pendingTasks = await Task.countDocuments({
      ...filter,
      status: "Pending",
      ...baseUserFilter,
    });

    const inProgressTasks = await Task.countDocuments({
      ...filter,
      status: "In-Progress",
      ...baseUserFilter,
    });

    const completedTasks = await Task.countDocuments({
      ...filter,
      status: "Completed",
      ...baseUserFilter,
    });

    res.json({
      tasks,
      statusSummary: {
        total: allTasks,
        pending: pendingTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Get task by ID (Admin : any task, User : assigned task)
// @route  GET /api/tasks/:id
// @access Private
export const getTaskById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "username email profileImageUrl")
      .populate("createdBy", "username email profileImageUrl");
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
      dueDate,
      assignedTo,
      attachments,
      todoChecklist,
    } = req.body;

    // Validate title
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ message: "Title is required" });
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

    // Validate dueDate
    if (dueDate !== undefined && dueDate !== null && !isValidDate(dueDate)) {
      return res.status(400).json({ message: "Invalid due date" });
    }
    if (dueDate !== undefined && dueDate !== null && hasPastDate(dueDate)) {
      return res.status(400).json({
        message: "Due date cannot be in the past",
      });
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

    // Validate attachments
    if (attachments !== undefined) {
      if (!Array.isArray(attachments)) {
        return res
          .status(400)
          .json({ message: "Attachments must be an array" });
      }
      for (const item of attachments) {
        if (typeof item !== "string" || item.trim().length === 0) {
          return res
            .status(400)
            .json({ message: "Each attachment must be a non-empty string" });
        }
      }
    }

    // Validate todoChecklist
    if (todoChecklist !== undefined) {
      if (!Array.isArray(todoChecklist)) {
        return res
          .status(400)
          .json({ message: "todoChecklist must be an array" });
      }
      for (const item of todoChecklist) {
        if (
          !item.text ||
          typeof item.text !== "string" ||
          item.text.trim().length === 0
        ) {
          return res.status(400).json({
            message: "Each checklist item must have a non-empty text field",
          });
        }
        if (
          item.completed !== undefined &&
          typeof item.completed !== "boolean"
        ) {
          return res
            .status(400)
            .json({ message: "completed must be a boolean" });
        }
      }
    }

    // Calculate initial progress and status based on todoChecklist
    let initialProgress = 0;
    let initialStatus = "Pending";

    if (todoChecklist && todoChecklist.length > 0) {
      const completedCount = todoChecklist.filter(
        (item) => item.completed,
      ).length;
      initialProgress = Math.round(
        (completedCount / todoChecklist.length) * 100,
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
      dueDate,
      assignedTo: normalizedAssignedTo,
      createdBy: req.user._id,
      todoChecklist,
      attachments,
      progress: initialProgress,
      status: initialStatus,
    });

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
    if (dueDate !== undefined && dueDate !== null && hasPastDate(dueDate)) {
      return res.status(400).json({
        message: "Due date cannot be in the past",
      });
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
    if (attachments !== undefined) {
      if (!Array.isArray(attachments)) {
        return res
          .status(400)
          .json({ message: "Attachments must be an array" });
      }
      for (const item of attachments) {
        if (typeof item !== "string" || item.trim().length === 0) {
          return res
            .status(400)
            .json({ message: "Each attachment must be a non-empty string" });
        }
      }
    }
    if (todoChecklist !== undefined) {
      if (!Array.isArray(todoChecklist)) {
        return res
          .status(400)
          .json({ message: "todoChecklist must be an array" });
      }
      for (const item of todoChecklist) {
        if (
          !item.text ||
          typeof item.text !== "string" ||
          item.text.trim().length === 0
        ) {
          return res.status(400).json({
            message: "Each checklist item must have a non-empty text field",
          });
        }
        if (
          item.completed !== undefined &&
          typeof item.completed !== "boolean"
        ) {
          return res
            .status(400)
            .json({ message: "completed must be a boolean" });
        }
      }
    }

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (normalizedAssignedTo !== undefined)
      task.assignedTo = normalizedAssignedTo;
    if (attachments !== undefined) task.attachments = attachments;
    if (todoChecklist !== undefined) {
      task.todoChecklist = todoChecklist;

      // Automatically recalculate progress and status when todoChecklist changes
      const completedCount = todoChecklist.filter(
        (item) => item.completed,
      ).length;
      task.progress =
        todoChecklist.length > 0
          ? Math.round((completedCount / todoChecklist.length) * 100)
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
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Update task status (Admin or assigned user)
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

    if (status === "Completed") {
      // When switching to Completed: mark all checklist items as true
      task.status = status;
      task.todoChecklist.forEach((item) => (item.completed = true));
      task.progress = 100;
    } else {
      // When switching back to Pending/In-Progress: validate checklist state first
      const completedCount = task.todoChecklist.filter(
        (item) => item.completed,
      ).length;
      const calculatedProgress =
        task.todoChecklist.length > 0
          ? Math.round((completedCount / task.todoChecklist.length) * 100)
          : 0;

      // Prevent setting to Pending/In-Progress when all checklist items are completed
      if (calculatedProgress === 100 && task.todoChecklist.length > 0) {
        return res.status(400).json({
          message:
            "Cannot set status to Pending/In-Progress when all checklist items are completed. Please uncomplete some items first or use PUT /api/tasks/:id/todo endpoint.",
        });
      }

      task.status = status;
      task.progress = calculatedProgress;
    }

    await task.save();
    res.json({ message: "Task status updated successfully", task });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Update task checklist (Admin or assigned user)
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
    for (const item of todoChecklist) {
      if (
        !item.text ||
        typeof item.text !== "string" ||
        item.text.trim().length === 0
      ) {
        return res.status(400).json({
          message: "Each checklist item must have a non-empty text field",
        });
      }
      if (item.completed !== undefined && typeof item.completed !== "boolean") {
        return res.status(400).json({ message: "completed must be a boolean" });
      }
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

    task.todoChecklist = todoChecklist;

    // Automatically calculate progress from checklist
    const completedCount = todoChecklist.filter(
      (item) => item.completed,
    ).length;
    task.progress =
      todoChecklist.length > 0
        ? Math.round((completedCount / todoChecklist.length) * 100)
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
    const updatedTask = await Task.findById(req.params.id)
      .populate("assignedTo", "username email profileImageUrl")
      .populate("createdBy", "username email profileImageUrl");
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

    // Fetch recent 10 tasks
    const recentTasks = await Task.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt");

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

    // Fetch recent 10 tasks for user
    const recentTasks = await Task.find(userFilter)
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt");

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
    });
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
};
