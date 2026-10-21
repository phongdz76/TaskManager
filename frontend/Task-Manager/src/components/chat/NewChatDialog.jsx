import React, { useEffect, useRef, useState } from "react";
import { LuX } from "react-icons/lu";
import chatApi from "../../utils/chatApi";
import useChat from "../../hooks/useChat";

export default function NewChatDialog({ onClose, onOpen }) {
  const { openDirect } = useChat();
  const [search, setSearch] = useState("");
  const [result, setResult] = useState({
    items: [],
    nextCursor: null,
    loading: true,
    error: "",
  });
  const [opening, setOpening] = useState(false);
  const dialogRef = useRef(null);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setResult({ items: [], loading: true, error: "" });
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleDialogKeyDown = (event) => {
    if (event.key === "Escape") {
      onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const controls = [
      ...dialogRef.current.querySelectorAll("button:not(:disabled), input"),
    ];
    const firstControl = controls[0];
    const lastControl = controls.at(-1);

    if (event.shiftKey && document.activeElement === firstControl) {
      event.preventDefault();
      lastControl.focus();
    } else if (!event.shiftKey && document.activeElement === lastControl) {
      event.preventDefault();
      firstControl.focus();
    }
  };

  const handleOpenConversation = async (userId) => {
    setOpening(true);

    try {
      const conversation = await openDirect(userId);
      if (conversation) {
        onOpen(conversation.id);
      }
    } catch (error) {
      setResult((previous) => ({
        ...previous,
        error:
          error?.response?.data?.message || "Không thể mở cuộc trò chuyện.",
      }));
    } finally {
      setOpening(false);
    }
  };

  const handleLoadMoreUsers = async () => {
    setOpening(true);

    try {
      const data = await chatApi.getUsers({
        search,
        cursor: result.nextCursor,
      });

      setResult((previous) => ({
        ...data,
        items: [...previous.items, ...data.items],
        error: "",
      }));
    } catch {
      setResult((previous) => ({
        ...previous,
        error: "Không thể tải thêm thành viên.",
      }));
    } finally {
      setOpening(false);
    }
  };

  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.querySelector("input")?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await chatApi.getUsers({ search });
        if (!cancelled) setResult({ ...data, loading: false, error: "" });
      } catch {
        if (!cancelled)
          setResult({
            items: [],
            loading: false,
            error: "Không thể tải danh bạ.",
          });
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-chat-title"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-5 text-gray-800 dark:text-gray-100 shadow-xl"
        onKeyDown={handleDialogKeyDown}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="new-chat-title" className="text-lg font-bold">
            Cuộc trò chuyện mới
          </h2>
          <button
            aria-label="Đóng danh bạ"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <LuX />
          </button>
        </div>
        <input
          aria-label="Tìm thành viên"
          placeholder="Tìm theo tên thành viên..."
          maxLength={100}
          disabled={opening}
          value={search}
          onChange={handleSearchChange}
          className="mb-4 w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <div className="max-h-80 overflow-y-auto">
          {result.loading && (
            <p role="status" className="p-3 text-sm text-gray-500">
              Đang tải...
            </p>
          )}
          {result.error && (
            <p role="alert" className="p-3 text-sm text-red-500">
              {result.error}
            </p>
          )}
          {!result.loading && !result.error && !result.items.length && (
            <p className="p-3 text-sm text-gray-500">
              Không tìm thấy thành viên.
            </p>
          )}
          {result.items.map((person) => (
            <button
              key={person.id}
              disabled={opening}
              onClick={() => handleOpenConversation(person.id)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-blue-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                {person.username[0]}
              </span>
              <div>
                <p className="text-sm font-semibold">{person.username}</p>
                <p className="text-xs text-gray-500">
                  {person.role === "admin" ? "Admin" : "Thành viên"}
                </p>
              </div>
            </button>
          ))}
          {result.nextCursor && (
            <button
              disabled={opening}
              onClick={handleLoadMoreUsers}
              className="w-full p-3 text-sm text-blue-600"
            >
              Tải thêm
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
