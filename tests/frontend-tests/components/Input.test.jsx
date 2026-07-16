import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "../test-utils.jsx";
import Input from "@frontend/components/Inputs/Input.jsx";

describe("Input Component", () => {
  it("should render with label and placeholder", () => {
    render(<Input id="test-id" label="Email Address" placeholder="Enter email" />);
    
    expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter email")).toBeInTheDocument();
  });

  it("should display toggle eye icon for password type", () => {
    const { container } = render(<Input id="pwd" label="Password" type="password" />);
    
    const input = screen.getByLabelText("Password");
    expect(input.type).toBe("password");
    
    const button = container.querySelector("button");
    expect(button).toBeInTheDocument();
  });

  it("should toggle password visibility on eye icon click", () => {
    const { container } = render(<Input id="pwd2" label="Password" type="password" />);
    
    const input = screen.getByLabelText("Password");
    const button = container.querySelector("button");
    
    expect(input.type).toBe("password");
    
    fireEvent.click(button);
    expect(input.type).toBe("text");
    
    fireEvent.click(button);
    expect(input.type).toBe("password");
  });

  it("should display error message when error prop is provided", () => {
    render(<Input id="err" label="Username" error="Username is required" />);
    expect(screen.getByText("Username is required")).toBeInTheDocument();
  });

  it("should show helperText conditionally if showHelperOnFocus is true", () => {
    render(
      <Input 
        id="help" 
        label="Password" 
        helperText="Must be 8 characters" 
        showHelperOnFocus={true} 
      />
    );
    
    // Initially not visible
    expect(screen.queryByText("Must be 8 characters")).not.toBeInTheDocument();
    
    // Visible on focus
    const input = screen.getByLabelText("Password");
    fireEvent.focus(input);
    expect(screen.getByText("Must be 8 characters")).toBeInTheDocument();
    
    // Hidden on blur
    fireEvent.blur(input);
    expect(screen.queryByText("Must be 8 characters")).not.toBeInTheDocument();
  });
});
