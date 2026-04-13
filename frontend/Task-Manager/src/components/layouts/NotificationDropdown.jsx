import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiBell } from "react-icons/fi";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import moment from "moment";
import toast from "react-hot-toast";

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.NOTIFICATIONS.GET_ALL);
      setNotifications(response.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id, isRead) => {
    if (isRead) return;
    try {
      await axiosInstance.put(API_PATHS.NOTIFICATIONS.MARK_AS_READ(id));
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axiosInstance.put(API_PATHS.NOTIFICATIONS.MARK_ALL_AS_READ);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all notifications as read");
    }
  };

  const handleClearAllNotifications = async () => {
    if (notifications.length === 0 || isClearingAll) return;

    try {
      setIsClearingAll(true);
      await axiosInstance.delete(API_PATHS.NOTIFICATIONS.CLEAR_ALL);
      setNotifications([]);
      setIsClearAllConfirmOpen(false);
      toast.success("All notifications deleted");
    } catch (error) {
      console.error("Error clearing notifications:", error);
      toast.error("Failed to delete notifications");
    } finally {
      setIsClearingAll(false);
    }
  };

  const openClearAllConfirmModal = () => {
    if (notifications.length === 0 || isClearingAll) return;
    setIsClearAllConfirmOpen(true);
  };

  const closeClearAllConfirmModal = () => {
    if (isClearingAll) return;
    setIsClearAllConfirmOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition duration-200"
        aria-label="Notifications"
      >
        <FiBell className="text-2xl text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full border-2 border-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden flex flex-col max-h-[80vh]">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-800">Notifications</h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all as read
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  onClick={openClearAllConfirmModal}
                  disabled={isClearingAll}
                  className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isClearingAll ? "Clearing..." : "Clear all"}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                You have no notifications.
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() =>
                    handleMarkAsRead(notification._id, notification.isRead)
                  }
                  className={`p-3 rounded-md cursor-pointer transition-colors duration-150 ${
                    notification.isRead
                      ? "bg-white hover:bg-gray-50"
                      : "bg-blue-50/60 border-l-4 border-blue-500 hover:bg-blue-100/50"
                  }`}
                >
                  <p
                    className={`text-sm ${
                      notification.isRead
                        ? "text-gray-600"
                        : "text-gray-900 font-medium"
                    }`}
                  >
                    {notification.message}
                  </p>
                  <span className="text-xs text-gray-400 mt-1 block">
                    {moment(notification.createdAt).fromNow()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isClearAllConfirmOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
            onClick={closeClearAllConfirmModal}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl transform transition-all"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-2 text-red-600">
                Delete All Notifications
              </h3>
              <p className="mb-6 font-medium text-gray-600">
                Are you sure you want to delete all notifications? This action
                cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeClearAllConfirmModal}
                  disabled={isClearingAll}
                  className="px-4 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAllNotifications}
                  disabled={isClearingAll}
                  className="px-4 py-2 font-medium text-white rounded-lg transition-colors bg-red-600 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isClearingAll ? "Deleting..." : "Delete all"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
