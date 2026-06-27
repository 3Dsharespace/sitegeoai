import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/DisclaimerBanner", () => ({
  default: () => null,
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(async (url: string) => {
      if (url === "/api/projects") return [];
      if (url === "/api/projects/summaries") return [];
      return [];
    }),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
    }
  },
  authRequired: vi.fn(() => false),
  getAuthToken: vi.fn(() => null),
}));

vi.mock("@/lib/useAuthUser", () => ({
  useAuthUser: vi.fn(() => ({
    user: { id: 1, name: "Dev", email: "dev@example.com", role: "user" },
    loading: false,
    isAdmin: false,
    reload: vi.fn(),
  })),
}));

vi.mock("@/lib/scenario-api", () => ({
  parseScenarioList: vi.fn(() => []),
}));

import DashboardPage from "@/app/dashboard/page";
import { api } from "@/lib/api";
import { useAuthUser } from "@/lib/useAuthUser";

describe("DashboardPage", () => {
  it("renders empty state workflow steps", async () => {
    render(<DashboardPage />);
    expect(await screen.findByText(/No projects yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Draw site/i)).toBeInTheDocument();
    expect(screen.getByText(/Generate design/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Create project/i).length).toBeGreaterThan(0);
  });

  it("hides Clear Projects for non-admin users", async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === "/api/projects") {
        return [
          {
            id: 1,
            name: "Test",
            project_type: "flyover",
            center_lat: 12,
            center_lng: 77,
            location_name: "Site",
            boundary_geojson: null,
            alignment_geojson: null,
            created_at: "",
            updated_at: "",
          },
        ];
      }
      if (url === "/api/projects/summaries") {
        return [
          {
            project_id: 1,
            has_location: true,
            has_boundary: false,
            has_analysis: false,
            has_parameters: false,
            has_design: false,
            has_estimate: false,
            scenario_count: 0,
            progress: 10,
          },
        ];
      }
      return [];
    });
    vi.mocked(useAuthUser).mockReturnValue({
      user: { id: 1, name: "User", email: "u@example.com", role: "user" },
      loading: false,
      isAdmin: false,
      reload: vi.fn(),
    });
    render(<DashboardPage />);
    expect(await screen.findByText("Test")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Clear Projects/i })).not.toBeInTheDocument();
  });

  it("shows Clear Projects for admin when projects exist", async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === "/api/projects") {
        return [
          {
            id: 1,
            name: "Admin Project",
            project_type: "flyover",
            center_lat: 12,
            center_lng: 77,
            location_name: "Site",
            boundary_geojson: null,
            alignment_geojson: null,
            created_at: "",
            updated_at: "",
          },
        ];
      }
      if (url === "/api/projects/summaries") {
        return [
          {
            project_id: 1,
            has_location: true,
            has_boundary: false,
            has_analysis: false,
            has_parameters: false,
            has_design: false,
            has_estimate: false,
            scenario_count: 0,
            progress: 10,
          },
        ];
      }
      return [];
    });
    vi.mocked(useAuthUser).mockReturnValue({
      user: { id: 1, name: "Admin", email: "a@example.com", role: "admin" },
      loading: false,
      isAdmin: true,
      reload: vi.fn(),
    });
    render(<DashboardPage />);
    expect(await screen.findByRole("button", { name: /Clear Projects/i })).toBeInTheDocument();
  });
});
