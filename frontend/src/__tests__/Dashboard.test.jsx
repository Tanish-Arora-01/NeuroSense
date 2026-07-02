import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock the API modules to prevent actual network calls during tests
vi.mock("../api/dashboard", () => ({
  getDashboardHistory: vi.fn().mockResolvedValue({ totalResults: 0, trend: [] }),
  getDeclineAnalysis: vi.fn().mockRejectedValue(new Error("No data")),
}));
vi.mock("../api/recommendations", () => ({
  getSpecialists: vi.fn().mockResolvedValue({ specialists: [] }),
}));

describe("Dashboard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders a sign in prompt if the user is not logged in", () => {
    useAuth.mockReturnValue({ isLoggedIn: false, user: null, signOut: vi.fn() });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText(/Dashboard Access Required/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Sign In/i)[0]).toBeInTheDocument();
  });

  it("renders the dashboard overview if the user is logged in", () => {
    useAuth.mockReturnValue({
      isLoggedIn: true,
      user: { name: "Test User", role: "patient" },
      signOut: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText(/Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Test User/i)).toBeInTheDocument();
  });
});
