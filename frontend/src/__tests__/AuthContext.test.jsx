import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";

// Mock the API calls
vi.mock("../services/api", () => ({
  authAPI: {
    currentUser: vi.fn(),
    logout: vi.fn(),
  },
}));

const TestComponent = () => {
  const { user, isLoggedIn, loading } = useAuth();
  
  if (loading) return <div data-testid="loading">Loading...</div>;
  if (!isLoggedIn) return <div data-testid="logged-out">Logged Out</div>;
  return <div data-testid="logged-in">{user.name}</div>;
};

describe("AuthContext", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows loading initially and then logged out if api fails", async () => {
    authAPI.currentUser.mockRejectedValueOnce(new Error("Not logged in"));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId("loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("logged-out")).toBeInTheDocument();
    });
  });

  it("shows logged in if api returns user", async () => {
    authAPI.currentUser.mockResolvedValueOnce({
      user: { id: "123", name: "John Doe", role: "admin" }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("logged-in")).toHaveTextContent("John Doe");
    });
  });
});
