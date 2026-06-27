import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRequireAuth } from "@/components/auth/RequireAuth";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard"),
  useRouter: vi.fn(() => ({ replace })),
}));

vi.mock("@/lib/api", () => ({
  authRequired: vi.fn(() => true),
  getAuthToken: vi.fn(() => null),
}));

import { usePathname } from "next/navigation";
import { authRequired, getAuthToken } from "@/lib/api";

describe("useRequireAuth", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.mocked(authRequired).mockReturnValue(true);
    vi.mocked(getAuthToken).mockReturnValue(null);
    vi.mocked(usePathname).mockReturnValue("/dashboard");
  });

  it("redirects to login when JWT required and no token", async () => {
    renderHook(() => useRequireAuth());
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login?next=%2Fdashboard");
    });
  });

  it("does not redirect on public paths", async () => {
    vi.mocked(usePathname).mockReturnValue("/login");
    renderHook(() => useRequireAuth());
    await waitFor(() => {
      expect(replace).not.toHaveBeenCalled();
    });
  });

  it("does not redirect when token is present", async () => {
    vi.mocked(getAuthToken).mockReturnValue("test-token");
    renderHook(() => useRequireAuth());
    await waitFor(() => {
      expect(replace).not.toHaveBeenCalled();
    });
  });

  it("does not redirect when JWT is not required", async () => {
    vi.mocked(authRequired).mockReturnValue(false);
    renderHook(() => useRequireAuth());
    await waitFor(() => {
      expect(replace).not.toHaveBeenCalled();
    });
  });
});
