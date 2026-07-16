import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "../test-utils.jsx";
import Button from "@frontend/components/Button.jsx";
import { FaPlus } from "react-icons/fa";

describe("Button Component", () => {
  it("should render with label", () => {
    render(<Button label="Submit Form" />);
    expect(screen.getByText("Submit Form")).toBeInTheDocument();
  });

  it("should call onClick handler when clicked", () => {
    const handleClick = vi.fn();
    render(<Button label="Click Me" onClick={handleClick} />);
    
    fireEvent.click(screen.getByText("Click Me"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should not call onClick when disabled", () => {
    const handleClick = vi.fn();
    render(<Button label="Disabled" onClick={handleClick} disabled={true} />);
    
    const button = screen.getByText("Disabled").closest("button");
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("should apply outline classes when outline prop is true", () => {
    render(<Button label="Outline" outline={true} />);
    
    const button = screen.getByText("Outline").closest("button");
    expect(button.className).toContain("bg-white");
    expect(button.className).toContain("border-gray-300");
  });

  it("should render icon when icon prop is provided", () => {
    const { container } = render(<Button label="With Icon" icon={FaPlus} />);
    // Check if SVG icon is rendered inside button
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
