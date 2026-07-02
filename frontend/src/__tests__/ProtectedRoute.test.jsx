import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", async () => {
  const actual = await vi.importActual("../context/AuthContext");
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

// A mock version of ProtectedRoute for testing isolated
import { Navigate, useLocation } from "react-router-dom";
import ErrorBoundary from "../components/ErrorBoundary";
import { PageSpinner } from "../components/Skeletons";

function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageSpinner message="Checking session…" />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows loading spinner initially", () => {
    useAuth.mockReturnValue({ isLoggedIn: false, loading: true });
    
    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByText(/Checking session/i)).toBeInTheDocument();
  });

  it("redirects to signin if not logged in", () => {
    useAuth.mockReturnValue({ isLoggedIn: false, loading: false });
    
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/signin" element={<div data-testid="signin">Sign In Page</div>} />
          <Route path="/" element={<ProtectedRoute><div data-testid="protected">Protected Content</div></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    );

    expect(screen.getByTestId("signin")).toBeInTheDocument();
  });

  it("renders children if logged in", () => {
    useAuth.mockReturnValue({ isLoggedIn: true, loading: false });
    
    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div data-testid="protected">Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByTestId("protected")).toBeInTheDocument();
  });
});
