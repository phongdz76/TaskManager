import React from "react";
import { Link } from "react-router-dom";
import { LuArrowLeft, LuExternalLink } from "react-icons/lu";

const TASK_STATUS_LABELS = {
  Pending: "Chờ xử lý",
  "In-Progress": "Đang thực hiện",
  Completed: "Hoàn thành",
};

export default function ConversationHeader({
  conversation,
  mini,
  onBack,
  taskPath,
}) {
  const task = conversation?.task;
  const description =
    conversation?.type === "task"
      ? `${conversation.participants.length} người tham gia · Quản trị viên có quyền xem`
      : "Chat cá nhân · Chỉ hai người tham gia";

  const dueDateLabel = task?.dueDate
    ? new Date(task.dueDate).toLocaleDateString("vi-VN")
    : "Chưa đặt hạn";

  return (
    <>
      {!mini && (
        <header className="flex items-center gap-3 border-b border-gray-100 dark:border-slate-700 p-4">
          {onBack && (
            <button
              type="button"
              aria-label="Quay lại hội thoại"
              onClick={onBack}
              className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <LuArrowLeft />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold">
              {conversation?.title || "Đang tải..."}
            </h2>
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          </div>
        </header>
      )}

      {task && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 dark:border-slate-700 bg-blue-50/50 dark:bg-slate-900/40 px-4 py-2 text-xs">
          <span>
            {TASK_STATUS_LABELS[task.status]} · {dueDateLabel}
          </span>

          <Link
            to={`${taskPath}/${task.id}`}
            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400"
          >
            Xem công việc <LuExternalLink />
          </Link>
        </div>
      )}
    </>
  );
}
