import { authRequired } from "@/lib/api";

/** Login URL with optional post-auth redirect target. */
export function loginPath(next = "/dashboard"): string {
  return `/login?next=${encodeURIComponent(next)}`;
}

/** Entry path for protected app areas — login when JWT is required. */
export function appEntryPath(next = "/dashboard"): string {
  return authRequired() ? loginPath(next) : next;
}

export const PUBLIC_APP_PATHS = new Set(["/", "/login"]);
