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
