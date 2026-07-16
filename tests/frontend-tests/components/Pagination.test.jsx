import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "../test-utils.jsx";
import Pagination from "@frontend/components/Pagination.jsx";

describe("Pagination Component", () => {
  it("should return null if totalPages <= 1", () => {
    const { container } = render(<Pagination totalPages={1} />);
    expect(container.firstChild).toBeNull();
  });

  it("should display page numbers correctly", () => {
    render(<Pagination currentPage={2} totalPages={5} />);
    
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should call onPageChange when clicking a page number", () => {
    const handlePageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={3} onPageChange={handlePageChange} />);
    
    fireEvent.click(screen.getByText("2"));
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it("should disable previous button on page 1", () => {
    const { container } = render(<Pagination currentPage={1} totalPages={3} />);
    
    // Previous button is the first button in the navigation controls
    const buttons = container.querySelectorAll("button");
    const prevButton = buttons[0];
    
    expect(prevButton).toBeDisabled();
  });

  it("should render compact variant correctly", () => {
    render(<Pagination currentPage={2} totalPages={4} variant="compact" />);
    
    // In compact variant, the text is "2 / 4"
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("/ 4")).toBeInTheDocument();
  });
});
