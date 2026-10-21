import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MessageComposer from "@frontend/components/chat/MessageComposer.jsx";

const renderComposer = (overrides = {}) => {
  const props = {
    conversationId: "conversation-1",
    value: "  Xin chào  ",
    onChange: vi.fn(),
    onSend: vi.fn(),
    disabled: false,
    ...overrides,
  };

  render(<MessageComposer {...props} />);
  return props;
};

describe("MessageComposer", () => {
  it("submits an image without requiring a caption", () => {
    const { onSend } = renderComposer({
      value: "",
      images: [
        {
          id: "image-1",
          previewUrl: "blob:preview",
          file: { name: "photo.png" },
        },
      ],
    });
    fireEvent.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));
    expect(onSend).toHaveBeenCalledWith("");
  });

  it("rejects an unsupported file before adding it", () => {
    const onAddImages = vi.fn();
    renderComposer({ onAddImages });
    fireEvent.change(screen.getByLabelText("Chọn ảnh để gửi"), {
      target: {
        files: [new File(["document"], "file.svg", { type: "image/svg+xml" })],
      },
    });
    expect(onAddImages).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Chỉ hỗ trợ ảnh JPG và PNG",
    );
  });

  it("shows the selected quote and allows cancelling a reply", () => {
    const onCancelReply = vi.fn();
    renderComposer({
      replyTo: { sender: { username: "Bob" }, text: "Original text" },
      onCancelReply,
    });
    expect(screen.getByText("Đang trả lời Bob")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hủy trả lời" }));
    expect(onCancelReply).toHaveBeenCalledOnce();
  });

  it("sends trimmed text with Enter", () => {
    const { onSend } = renderComposer();

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });

    expect(onSend).toHaveBeenCalledWith("Xin chào");
  });

  it("keeps Shift+Enter and IME composition available for typing", () => {
    const { onSend } = renderComposer();
    const input = screen.getByRole("textbox");

    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    fireEvent.keyDown(input, { key: "Enter", keyCode: 229 });

    expect(onSend).not.toHaveBeenCalled();
  });

  it("blocks blank messages", () => {
    const { onSend } = renderComposer({ value: "   " });

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });

    expect(screen.getByRole("button", { name: "Gửi tin nhắn" })).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables sending for a read-only conversation", () => {
    const { onSend } = renderComposer({ disabled: true });

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });

    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });
});
