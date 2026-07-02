import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ResultsPage from "../pages/ResultsPage";
import * as routerDom from "react-router-dom";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useLocation: vi.fn(),
  };
});

describe("ResultsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders a fallback message when no result is present", () => {
    routerDom.useLocation.mockReturnValue({ state: null });

    render(
      <BrowserRouter>
        <ResultsPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/No assessment result was found in this session/i)).toBeInTheDocument();
  });

  it("renders the result when provided in state", () => {
    routerDom.useLocation.mockReturnValue({
      state: {
        result: {
          riskScore: 0.85,
          riskLevel: "high",
          confidence: 0.92,
        },
      },
    });

    render(
      <BrowserRouter>
        <ResultsPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/high/i)).toBeInTheDocument();
    expect(screen.getByText(/85.0%/i)).toBeInTheDocument();
    expect(screen.getByText(/92.0%/i)).toBeInTheDocument();
  });
});
