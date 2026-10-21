import React, { useEffect, useState } from "react";
import chatApi from "../../utils/chatApi";

export default function ChatImage({ conversationId, messageId, image }) {
  const [source, setSource] = useState("");
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (image.previewUrl) return;

    const controller = new AbortController();
    let objectUrl;

    const loadImage = async () => {
      try {
        const blob = await chatApi.getImage(
          conversationId,
          messageId,
          image.id,
          controller.signal,
        );
        if (controller.signal.aborted) return;

        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
        setError(false);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    };

    void loadImage();

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [conversationId, messageId, image.id, image.previewUrl, reload]);

  const imageSource = image.previewUrl || source;

  if (error && !imageSource) {
    return (
      <button
        type="button"
        onClick={() => setReload(reload + 1)}
        className="rounded-lg bg-gray-100 p-4 text-xs text-gray-500 dark:bg-slate-700 dark:text-gray-300"
      >
        Không tải được ảnh. Bấm để thử lại.
      </button>
    );
  }

  if (!imageSource) {
    return (
      <div
        role="status"
        className="rounded-lg bg-gray-100 p-6 text-xs text-gray-500 dark:bg-slate-700"
      >
        Đang tải ảnh...
      </div>
    );
  }

  return (
    <a
      href={imageSource}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Mở ảnh ${image.originalName}`}
    >
      <img
        src={imageSource}
        alt={image.originalName}
        width={image.width || undefined}
        height={image.height || undefined}
        className="max-h-64 max-w-full rounded-xl object-contain"
      />
    </a>
  );
}
