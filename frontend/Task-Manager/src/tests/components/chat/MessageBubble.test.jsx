import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MessageBubble from "@frontend/components/chat/MessageBubble.jsx";

const message = {
  id: "message-1",
  sender: { id: "user-1", username: "Alice" },
  clientMessageId: "client-1",
  sequence: 1,
  text: "<script>alert('hello')</script>",
  createdAt: "2026-10-22T08:00:00.000Z",
};

describe("MessageBubble", () => {
  it("renders message content as text", () => {
    const { container } = render(
      <MessageBubble
        message={message}
        isOwnMessage={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText(message.text)).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
  });

  it("retries the same failed message", () => {
    const onRetry = vi.fn();
    const failedMessage = { ...message, status: "failed" };

    render(
      <MessageBubble message={failedMessage} isOwnMessage onRetry={onRetry} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(onRetry).toHaveBeenCalledWith(failedMessage);
  });

  it("shows saved messages without claiming the recipient has read them", () => {
    render(<MessageBubble message={message} isOwnMessage onRetry={vi.fn()} />);

    expect(screen.getByText("Đã gửi")).toBeInTheDocument();
    expect(screen.queryByText("Đã xem")).not.toBeInTheDocument();
  });
});
