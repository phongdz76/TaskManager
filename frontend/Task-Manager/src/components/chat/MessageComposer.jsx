import React, { useRef, useState } from "react";
import { LuImagePlus, LuSend, LuX } from "react-icons/lu";

export default function MessageComposer({
  conversationId,
  value,
  onChange,
  onSend,
  disabled,
  images = [],
  onAddImages,
  onRemoveImage,
  replyTo,
  onCancelReply,
}) {
  const inputRef = useRef(null);
  const [imageError, setImageError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (
      !disabled &&
      (value.trim() || images.length) &&
      value.trim().length <= 4000
    ) {
      setImageError("");
      onSend(value.trim());
    }
  };

  const handleAddImages = (files) => {
    if (!files.length || disabled) return;

    if (images.length + files.length > 4) {
      setImageError("Mỗi tin nhắn được gửi tối đa 4 ảnh.");
      return;
    }

    if (
      files.some((file) => !["image/jpeg", "image/png"].includes(file.type))
    ) {
      setImageError("Chỉ hỗ trợ ảnh JPG và PNG.");
      return;
    }

    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      setImageError("Mỗi ảnh phải nhỏ hơn hoặc bằng 5 MB.");
      return;
    }

    setImageError("");
    onAddImages?.(files);
  };

  const handleSelectImages = (event) => {
    handleAddImages([...event.target.files]);
    event.target.value = "";
  };

  const handlePaste = (event) => {
    const files = [...event.clipboardData.files];
    if (files.length) {
      event.preventDefault();
      handleAddImages(files);
    }
  };

  const handleKeyDown = (event) => {
    const isEnter = event.key === "Enter";
    const isComposing = event.nativeEvent.isComposing || event.keyCode === 229;

    if (isEnter && !event.shiftKey && !isComposing) {
      handleSubmit(event);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-gray-100 dark:border-slate-700 p-3"
    >
      {replyTo && (
        <div className="mb-2 flex items-start gap-2 rounded-lg border-l-2 border-blue-500 bg-blue-50 px-3 py-2 text-xs dark:bg-slate-700">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-blue-600 dark:text-blue-300">
              Đang trả lời {replyTo.sender.username}
            </p>
            <p className="mt-1 line-clamp-2 break-words text-gray-500 dark:text-gray-300">
              {replyTo.text || "Ảnh"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Hủy trả lời"
            onClick={onCancelReply}
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-100"
          >
            <LuX />
          </button>
        </div>
      )}

      {images.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2" aria-label="Ảnh đã chọn">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative rounded-lg border border-gray-200 p-1 dark:border-slate-600"
            >
              <img
                src={image.previewUrl}
                alt={image.file.name}
                className="h-16 w-16 rounded object-cover"
              />
              <button
                type="button"
                aria-label={`Bỏ ảnh ${image.file.name}`}
                onClick={() => onRemoveImage(image.id)}
                className="absolute -right-1 -top-1 rounded-full bg-gray-700 p-0.5 text-white"
              >
                <LuX size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {imageError && (
        <p role="alert" className="mb-2 text-xs text-red-500">
          {imageError}
        </p>
      )}

      <div className="flex items-end gap-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 p-2 focus-within:border-blue-500">
        {onAddImages && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              aria-label="Chọn ảnh để gửi"
              onChange={handleSelectImages}
              disabled={disabled}
              className="hidden"
            />
            <button
              type="button"
              aria-label="Thêm ảnh"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || images.length >= 4}
              className="rounded-lg p-2 text-gray-500 hover:text-blue-600 disabled:opacity-40 dark:text-gray-400"
            >
              <LuImagePlus size={19} />
            </button>
          </>
        )}
        <textarea
          id={`chat-composer-${conversationId}`}
          aria-label="Tin nhắn"
          rows={2}
          maxLength={4000}
          disabled={disabled}
          placeholder="Nhập tin nhắn..."
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className="min-w-0 flex-1 resize-none bg-transparent text-sm text-gray-800 dark:text-gray-100 outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          aria-label="Gửi tin nhắn"
          disabled={disabled || (!value.trim() && !images.length)}
          className="rounded-lg bg-blue-600 p-2.5 text-white hover:bg-blue-700 disabled:opacity-40"
        >
          <LuSend size={18} />
        </button>
      </div>
      <p className="mt-1.5 text-right text-[10px] text-gray-400">
        {value.length}/4000 · Shift+Enter xuống dòng
      </p>
    </form>
  );
}
