import React from "react";

export default function ConversationInfoPanel({ conversation }) {
  if (!conversation) return null;
  return (
    <aside
      aria-label="Thông tin hội thoại"
      className="hidden 2xl:block w-60 shrink-0 border-l border-gray-100 dark:border-slate-700 p-5 text-sm"
    >
      <h3 className="font-bold mb-4">Thông tin hội thoại</h3>
      <p className="text-xs leading-5 text-gray-500 dark:text-gray-400 mb-5">
        {conversation.type === "task"
          ? "Người tạo, người được giao và quản trị viên có quyền xem thảo luận. Thành viên mới được xem toàn bộ lịch sử."
          : "Chỉ hai thành viên có quyền xem cuộc trò chuyện này."}
      </p>
      {conversation.task && (
        <div className="mb-5 space-y-2 text-xs">
          <p>Ưu tiên: {conversation.task.priority}</p>
          <p>Tiến độ: {conversation.task.progress}%</p>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${conversation.task.progress}%` }}
            />
          </div>
        </div>
      )}
      <h4 className="font-semibold text-xs mb-3">
        {conversation.type === "task" ? "Người tham gia" : "Thành viên"}
      </h4>
      <div className="space-y-3">
        {conversation.participants.map((person) => (
          <div key={person.id} className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-slate-700 text-xs text-blue-600 dark:text-blue-300">
              {person.username.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{person.username}</p>
              <p className="text-[10px] text-gray-400">
                {person.id === conversation.task?.createdBy
                  ? "Người tạo"
                  : conversation.type === "task"
                    ? "Người được giao"
                    : person.role === "admin"
                      ? "Admin"
                      : "Thành viên"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
