import Task from "../models/Task.js";
import User from "../models/User.js";
import excelJS from "exceljs";
import {
  getTaskProgress,
  isTaskOverdue,
  buildWorkspaceTeamMembersSummary,
} from "../utils/teamMembersSummary.js";

// Shared style maps for report cells
const STATUS_COLORS = {
  Pending: { bg: "FFFEFCE8", text: "FFA16207" },
  "In-Progress": { bg: "FFEFF6FF", text: "FF1D4ED8" },
  Completed: { bg: "FFF0FDF4", text: "FF15803D" },
  Overdue: { bg: "FFFEE2E2", text: "FFB91C1C" },
};

const PRIORITY_COLORS = {
  Low: { bg: "FFD1FAE5", text: "FF065F46" },
  Medium: { bg: "FFFEF3C7", text: "FF92400E" },
  High: { bg: "FFFEE2E2", text: "FF991B1B" },
};

// Shared border style
const THIN_BORDER = {
  top: { style: "thin", color: { argb: "FFE5E7EB" } },
  left: { style: "thin", color: { argb: "FFE5E7EB" } },
  bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
  right: { style: "thin", color: { argb: "FFE5E7EB" } },
};

// Helpers
const applyHeaderStyle = (worksheet) => {
  const headerRow = worksheet.getRow(1);
  headerRow.height = 32;
  headerRow.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" },
  };
  headerRow.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "medium", color: { argb: "FF3730A3" } },
      left: { style: "thin", color: { argb: "FF3730A3" } },
      bottom: { style: "medium", color: { argb: "FF3730A3" } },
      right: { style: "thin", color: { argb: "FF3730A3" } },
    };
  });
};

const applyRowBorders = (row) => {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = THIN_BORDER;
    if (!cell.alignment) {
      cell.alignment = { vertical: "middle", wrapText: true };
    }
  });
};

const styleStatusCell = (row, statusValue) => {
  const cell = row.getCell("status");
  const colors = STATUS_COLORS[statusValue];
  if (cell && colors) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colors.bg },
    };
    cell.font = { color: { argb: colors.text }, bold: true };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = THIN_BORDER;
  }
};

const stylePriorityCell = (row, priorityValue) => {
  const cell = row.getCell("priority");
  const colors = PRIORITY_COLORS[priorityValue];
  if (cell && colors) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colors.bg },
    };
    cell.font = { color: { argb: colors.text }, bold: true };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = THIN_BORDER;
  }
};

// @desc    Export tasks report (admin only)
// @route   GET /api/reports/export/tasks
// @access  Private/Admin
export const exportTasksReport = async (req, res) => {
  try {
    const tasks = await Task.find().populate("assignedTo", "username email");
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Tasks Report");

    worksheet.columns = [
      { header: "Title", key: "title", width: 32 },
      { header: "Description", key: "description", width: 50 },
      { header: "Priority", key: "priority", width: 14 },
      { header: "Status", key: "status", width: 15 },
      { header: "Progress", key: "progress", width: 12 },
      { header: "Assigned To", key: "assignedTo", width: 30 },
      { header: "Start Date", key: "startDate", width: 18 },
      { header: "Due Date", key: "dueDate", width: 18 },
    ];

    tasks.forEach((task) => {
      const assignedTo = task.assignedTo.map((u) => u.username).join(", ");
      const isOverdue = isTaskOverdue(task);
      const displayStatus = isOverdue ? "Overdue" : task.status;

      const row = worksheet.addRow({
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: displayStatus,
        progress: `${task.progress || 0}%`,
        assignedTo: assignedTo || "Unassigned",
        startDate: task.startDate
          ? task.startDate.toISOString().split("T")[0]
          : "N/A",
        dueDate: task.dueDate
          ? task.dueDate.toISOString().split("T")[0]
          : "N/A",
      });

      row.height = 22;
      applyRowBorders(row);
      styleStatusCell(row, displayStatus);
      stylePriorityCell(row, task.priority);
    });

    applyHeaderStyle(worksheet);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=tasks_report.xlsx",
    );
    res.attachment("tasks_report.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Export users report (admin only)
// @route   GET /api/reports/export/users
// @access  Private/Admin
export const exportUsersReport = async (req, res) => {
  try {
    const users = await User.find().select("username email _id").lean();
    const userTasks = await Task.find().populate(
      "assignedTo",
      "username email _id",
    );

    const userTaskMap = {};
    users.forEach((user) => {
      userTaskMap[user._id] = {
        username: user.username,
        email: user.email,
        taskCount: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
      };
    });

    userTasks.forEach((task) => {
      if (task.assignedTo) {
        task.assignedTo.forEach((assignUser) => {
          if (userTaskMap[assignUser._id]) {
            userTaskMap[assignUser._id].taskCount += 1;
            if (task.status === "Pending") {
              userTaskMap[assignUser._id].pendingTasks += 1;
            } else if (task.status === "In-Progress") {
              userTaskMap[assignUser._id].inProgressTasks += 1;
            } else if (task.status === "Completed") {
              userTaskMap[assignUser._id].completedTasks += 1;
            }
            if (isTaskOverdue(task)) {
              userTaskMap[assignUser._id].overdueTasks += 1;
            }
          }
        });
      }
    });

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Users Report");
    worksheet.columns = [
      { header: "Username", key: "username", width: 26 },
      { header: "Email", key: "email", width: 32 },
      { header: "Total Tasks", key: "taskCount", width: 14 },
      { header: "Pending", key: "pendingTasks", width: 13 },
      { header: "In-Progress", key: "inProgressTasks", width: 14 },
      { header: "Completed", key: "completedTasks", width: 13 },
      { header: "Overdue", key: "overdueTasks", width: 13 },
    ];

    Object.values(userTaskMap).forEach((user) => {
      const row = worksheet.addRow({
        username: user.username,
        email: user.email,
        taskCount: user.taskCount,
        pendingTasks: user.pendingTasks,
        inProgressTasks: user.inProgressTasks,
        completedTasks: user.completedTasks,
        overdueTasks: user.overdueTasks,
      });
      row.height = 22;
      applyRowBorders(row);

      // Color the numeric cells
      const pendingCell = row.getCell("pendingTasks");
      pendingCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEFCE8" },
      };
      pendingCell.font = { color: { argb: "FFA16207" }, bold: true };
      pendingCell.alignment = { vertical: "middle", horizontal: "center" };

      const inProgressCell = row.getCell("inProgressTasks");
      inProgressCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEFF6FF" },
      };
      inProgressCell.font = { color: { argb: "FF1D4ED8" }, bold: true };
      inProgressCell.alignment = { vertical: "middle", horizontal: "center" };

      const completedCell = row.getCell("completedTasks");
      completedCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0FDF4" },
      };
      completedCell.font = { color: { argb: "FF15803D" }, bold: true };
      completedCell.alignment = { vertical: "middle", horizontal: "center" };

      const overdueCell = row.getCell("overdueTasks");
      overdueCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEE2E2" },
      };
      overdueCell.font = { color: { argb: "FFB91C1C" }, bold: true };
      overdueCell.alignment = { vertical: "middle", horizontal: "center" };
    });

    applyHeaderStyle(worksheet);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=users_report.xlsx",
    );
    res.attachment("users_report.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Export user's own tasks
// @route   GET /api/reports/export/my-tasks
// @access  Private
export const exportMyTasks = async (req, res) => {
  try {
    const userId = req.user._id;
    const tasks = await Task.find({
      $or: [{ assignedTo: userId }, { createdBy: userId }],
    })
      .populate("assignedTo", "username email")
      .populate("createdBy", "username email");

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("My Tasks");

    worksheet.columns = [
      { header: "Title", key: "title", width: 32 },
      { header: "Description", key: "description", width: 50 },
      { header: "Priority", key: "priority", width: 14 },
      { header: "Status", key: "status", width: 15 },
      { header: "Progress", key: "progress", width: 12 },
      { header: "Assigned To", key: "assignedTo", width: 30 },
      { header: "Created By", key: "createdBy", width: 24 },
      { header: "Start Date", key: "startDate", width: 18 },
      { header: "Due Date", key: "dueDate", width: 18 },
    ];

    tasks.forEach((task) => {
      const assignedTo = task.assignedTo.map((u) => u.username).join(", ");
      const createdBy = task.createdBy?.username || "Unknown";
      const isOverdue = isTaskOverdue(task);
      const displayStatus = isOverdue ? "Overdue" : task.status;

      const row = worksheet.addRow({
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: displayStatus,
        progress: `${task.progress}%`,
        assignedTo: assignedTo || "Unassigned",
        createdBy,
        startDate: task.startDate
          ? task.startDate.toISOString().split("T")[0]
          : "N/A",
        dueDate: task.dueDate
          ? task.dueDate.toISOString().split("T")[0]
          : "N/A",
      });

      row.height = 22;
      applyRowBorders(row);
      styleStatusCell(row, displayStatus);
      stylePriorityCell(row, task.priority);
    });

    applyHeaderStyle(worksheet);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=my_tasks.xlsx");
    res.attachment("my_tasks.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Export team members task summary (any authenticated user)
// @route   GET /api/reports/export/team-members
// @access  Private
export const exportTeamMembers = async (req, res) => {
  try {
    const teamMembers = await buildWorkspaceTeamMembersSummary(req.user._id);

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Team Members");

    worksheet.columns = [
      { header: "Username", key: "username", width: 26 },
      { header: "Email", key: "email", width: 32 },
      { header: "Task Count", key: "taskCount", width: 14 },
      { header: "Pending", key: "pendingTasks", width: 12 },
      { header: "In-Progress", key: "inProgressTasks", width: 14 },
      { header: "Completed", key: "completedTasks", width: 13 },
      { header: "Overdue", key: "overdueTasks", width: 13 },
      { header: "Completion Level", key: "completionLevel", width: 18 },
    ];

    teamMembers.forEach((member) => {
      const row = worksheet.addRow({
        username: member.username,
        email: member.email,
        taskCount: member.taskCount,
        pendingTasks: member.pendingTasks,
        inProgressTasks: member.inProgressTasks,
        completedTasks: member.completedTasks,
        overdueTasks: member.overdueTasks,
        completionLevel: `${member.completionLevel}%`,
      });

      row.height = 22;
      applyRowBorders(row);

      const taskCountCell = row.getCell("taskCount");
      taskCountCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEFF6FF" },
      };
      taskCountCell.font = { color: { argb: "FF1D4ED8" }, bold: true };
      taskCountCell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      const pendingCell = row.getCell("pendingTasks");
      pendingCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEFCE8" },
      };
      pendingCell.font = { color: { argb: "FFA16207" }, bold: true };
      pendingCell.alignment = { vertical: "middle", horizontal: "center" };

      const inProgressCell = row.getCell("inProgressTasks");
      inProgressCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEFF6FF" },
      };
      inProgressCell.font = { color: { argb: "FF1D4ED8" }, bold: true };
      inProgressCell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      const completedCell = row.getCell("completedTasks");
      completedCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0FDF4" },
      };
      completedCell.font = { color: { argb: "FF15803D" }, bold: true };
      completedCell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      const overdueCell = row.getCell("overdueTasks");
      overdueCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEE2E2" },
      };
      overdueCell.font = { color: { argb: "FFB91C1C" }, bold: true };
      overdueCell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      const completionLevelCell = row.getCell("completionLevel");
      completionLevelCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0FDF4" },
      };
      completionLevelCell.font = {
        color: { argb: "FF15803D" },
        bold: true,
      };
      completionLevelCell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    });

    applyHeaderStyle(worksheet);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=team_members_report.xlsx",
    );
    res.attachment("team_members_report.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export default {
  exportTasksReport,
  exportUsersReport,
  exportMyTasks,
  exportTeamMembers,
};
