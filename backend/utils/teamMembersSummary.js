import Task from "../models/Task.js";
import User from "../models/User.js";

export const getTaskProgress = (task) => {
  if (typeof task?.progress === "number") {
    return Math.max(0, Math.min(100, task.progress));
  }
  if (task?.status === "Completed") return 100;
  if (task?.status === "In-Progress") return 50;
  return 0;
};

export const isTaskOverdue = (task) => {
  if (!task?.dueDate || task?.status === "Completed") return false;
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dueDate < today;
};

export const buildWorkspaceTeamMembersSummary = async (currentUserId) => {
  const currentId = currentUserId.toString();
  const tasks = await Task.find({
    $or: [{ assignedTo: currentUserId }, { createdBy: currentUserId }],
  })
    .select("assignedTo createdBy status progress dueDate")
    .lean();

  const toIdString = (value) => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (value?._id) return value._id.toString();
    return value.toString();
  };

  const collaboratorsInTasks = [];
  const collaboratorIds = new Set();

  tasks.forEach((task) => {
    const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : [];
    const participantIds = new Set(
      assignees.map((assignee) => toIdString(assignee)).filter(Boolean),
    );

    const creatorId = toIdString(task.createdBy);
    if (creatorId) participantIds.add(creatorId);

    participantIds.delete(currentId);

    if (participantIds.size > 0) {
      participantIds.forEach((id) => collaboratorIds.add(id));
      collaboratorsInTasks.push({ task, participantIds });
    }
  });

  if (collaboratorIds.size === 0) {
    return [];
  }

  const users = await User.find({ _id: { $in: Array.from(collaboratorIds) } })
    .select("_id username email role profileImageUrl")
    .lean();

  const summaryMap = new Map(
    users.map((user) => [
      user._id.toString(),
      {
        _id: user._id.toString(),
        username: user.username || "Unknown",
        email: user.email || "",
        role: user.role || "user",
        profileImageUrl: user.profileImageUrl || "",
        taskCount: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        totalProgress: 0,
        completionLevel: 0,
      },
    ]),
  );

  collaboratorsInTasks.forEach(({ task, participantIds }) => {
    const taskProgress = getTaskProgress(task);
    const overdue = isTaskOverdue(task);

    participantIds.forEach((participantId) => {
      const summary = summaryMap.get(participantId);
      if (!summary) return;

      summary.taskCount += 1;
      summary.totalProgress += taskProgress;

      if (task.status === "Pending") {
        summary.pendingTasks += 1;
      } else if (
        task.status === "In-Progress" ||
        task.status === "In Progress"
      ) {
        summary.inProgressTasks += 1;
      } else if (task.status === "Completed") {
        summary.completedTasks += 1;
      }

      if (overdue) {
        summary.overdueTasks += 1;
      }

      summary.completionLevel = summary.taskCount
        ? Math.round(summary.totalProgress / summary.taskCount)
        : 0;
    });
  });

  return Array.from(summaryMap.values())
    .filter((member) => member.taskCount > 0)
    .sort((a, b) => {
      if (b.taskCount !== a.taskCount) return b.taskCount - a.taskCount;
      return (a.username || "").localeCompare(b.username || "");
    });
};
