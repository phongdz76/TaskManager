import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const getVisiblePages = (totalPages, currentPage) => {
  return Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((page) => {
      if (totalPages <= 5) return true;
      if (page === 1 || page === totalPages) return true;
      return Math.abs(page - currentPage) <= 1;
    })
    .reduce((acc, page, index, pages) => {
      if (index > 0 && page - pages[index - 1] > 1) {
        acc.push("...");
      }
      acc.push(page);
      return acc;
    }, []);
};

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems,
  itemLabel = "items",
  onPageChange,
  variant = "default",
  buttonType = "button",
  containerClassName = "",
}) {
  if (!totalPages || totalPages <= 1) return null;

  const handleGoToPage = (page) => {
    if (!onPageChange) return;
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };

  if (variant === "compact") {
    return (
      <div
        className={`flex items-center justify-between ${containerClassName}`}
      >
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Page{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-200">{currentPage}</span> of{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-200">{totalPages}</span>
        </p>
        <div className="flex items-center gap-1">
          <button
            type={buttonType}
            onClick={() => handleGoToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-md border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FaChevronLeft size={12} />
          </button>
          <button
            type={buttonType}
            onClick={() => handleGoToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-md border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FaChevronRight size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between ${containerClassName}`}
    >
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-0">
        Showing page{" "}
        <span className="font-semibold text-gray-700 dark:text-gray-200">{currentPage}</span> of{" "}
        <span className="font-semibold text-gray-700 dark:text-gray-200">{totalPages}</span>
        {typeof totalItems === "number" ? (
          <>
            {" "}
            (<span>{totalItems}</span> {itemLabel})
          </>
        ) : null}
      </p>

      <div className="flex items-center gap-1">
        <button
          type={buttonType}
          onClick={() => handleGoToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <FaChevronLeft size={14} />
        </button>

        {getVisiblePages(totalPages, currentPage).map((page, index) =>
          page === "..." ? (
            <span key={`dots-${index}`} className="px-2 text-gray-400 dark:text-gray-500">
              ...
            </span>
          ) : (
            <button
              key={page}
              type={buttonType}
              onClick={() => handleGoToPage(page)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
              }`}
            >
              {page}
            </button>
          ),
        )}

        <button
          type={buttonType}
          onClick={() => handleGoToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <FaChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
