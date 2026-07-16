import React from "react";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { UserContext } from "@frontend/context/userContext.jsx";

/**
 * Custom render function that wraps components with necessary providers.
 */
const customRender = (ui, options = {}) => {
  const { route = "/", userState = { user: null, loading: false }, ...renderOptions } = options;
  
  if (route !== "/") {
    window.history.pushState({}, "Test page", route);
  }

  const mockUserContext = {
    updateUser: () => {},
    clearUser: () => {},
    ...userState,
  };

  const Wrapper = ({ children }) => (
    <UserContext.Provider value={mockUserContext}>
      <BrowserRouter>{children}</BrowserRouter>
    </UserContext.Provider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Re-export everything
export * from "@testing-library/react";

// Override render method
export { customRender as render };
