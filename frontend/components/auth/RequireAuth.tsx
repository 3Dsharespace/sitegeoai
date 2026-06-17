"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authRequired, getAuthToken } from "@/lib/api";
import { loginPath, PUBLIC_APP_PATHS } from "@/lib/auth-routes";

/** Redirect unauthenticated users to /login in production JWT mode. */
export function useRequireAuth() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!authRequired() || !pathname) return;
    if (PUBLIC_APP_PATHS.has(pathname)) return;
    if (getAuthToken()) return;
    router.replace(loginPath(pathname));
  }, [pathname, router]);
}
