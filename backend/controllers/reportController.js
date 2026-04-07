import Task from "../models/Task.js";
import User from "../models/User.js";
import excelJS from "exceljs";

// @desc    Export tasks report (admin only)
// @route   GET /api/reports/export/tasks
// @access  Private/Admin

export const exportTasksReport = async (req, res) => {
  try {
    const tasks = await Task.find().populate("assignedTo", "username email");
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Tasks Report");
    worksheet.columns = [
      { header: "Task ID", key: "id", width: 30 },
      { header: "Title", key: "title", width: 30 },
      { header: "Description", key: "description", width: 50 },
      { header: "Priority", key: "priority", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Assigned To", key: "assignedTo", width: 30 },
      { header: "Due Date", key: "dueDate", width: 20 },
    ];
    tasks.forEach((task) => {
      const assignedTo = task.assignedTo
        .map((user) => user.username)
        .join(", ");
      worksheet.addRow({
        id: task._id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        assignedTo: assignedTo || "Unassigned",
        dueDate: task.dueDate
          ? task.dueDate.toISOString().split("T")[0]
          : "N/A",
      });
    });
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
          }
        });
      }
    });

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Users Report");
    worksheet.columns = [
      { header: "Username", key: "username", width: 30 },
      { header: "Email", key: "email", width: 30 },
      { header: "Total Tasks", key: "taskCount", width: 15 },
      { header: "Pending Tasks", key: "pendingTasks", width: 15 },
      { header: "In-Progress Tasks", key: "inProgressTasks", width: 15 },
      { header: "Completed Tasks", key: "completedTasks", width: 15 },
    ];
    Object.values(userTaskMap).forEach((user) => {
      worksheet.addRow({
        username: user.username,
        email: user.email,
        taskCount: user.taskCount,
        pendingTasks: user.pendingTasks,
        inProgressTasks: user.inProgressTasks,
        completedTasks: user.completedTasks,
      });
    });
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

// @desc    Export user's own tasks (assigned to or created by user)
// @route   GET /api/reports/export/my-tasks
// @access  Private
export const exportMyTasks = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get tasks assigned to user or created by user
    const tasks = await Task.find({
      $or: [{ assignedTo: userId }, { createdBy: userId }],
    })
      .populate("assignedTo", "username email")
      .populate("createdBy", "username email");

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("My Tasks");

    worksheet.columns = [
      { header: "Task ID", key: "id", width: 30 },
      { header: "Title", key: "title", width: 30 },
      { header: "Description", key: "description", width: 50 },
      { header: "Priority", key: "priority", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Progress", key: "progress", width: 12 },
      { header: "Assigned To", key: "assignedTo", width: 30 },
      { header: "Created By", key: "createdBy", width: 25 },
      { header: "Due Date", key: "dueDate", width: 20 },
    ];

    tasks.forEach((task) => {
      const assignedTo = task.assignedTo
        .map((user) => user.username)
        .join(", ");
      const createdBy = task.createdBy?.username || "Unknown";

      worksheet.addRow({
        id: task._id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        progress: `${task.progress}%`,
        assignedTo: assignedTo || "Unassigned",
        createdBy: createdBy,
        dueDate: task.dueDate
          ? task.dueDate.toISOString().split("T")[0]
          : "N/A",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=my_tasks.xlsx",
    );
    res.attachment("my_tasks.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export default { exportTasksReport, exportUsersReport, exportMyTasks };
