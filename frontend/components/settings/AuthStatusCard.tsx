"use client";

import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authRequired, clearAuthToken, getAuthToken } from "@/lib/api";
import { useAuthUser } from "@/lib/useAuthUser";

export default function AuthStatusCard() {
  const { user, loading, reload } = useAuthUser();

  function logout() {
    clearAuthToken();
    if (authRequired()) {
      window.location.href = "/login";
    } else {
      reload();
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Account</p>
          <p className="text-xs text-muted-foreground">
            {loading
              ? "Checking session…"
              : user
                ? `${user.name} · ${user.email}${user.role ? ` · ${user.role}` : ""}`
                : authRequired()
                  ? "Not signed in"
                  : "Dev mode — mock user when no token"}
          </p>
        </div>
        {user && getAuthToken() ? (
          <Button type="button" variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-1" />
            Sign out
          </Button>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            <LogIn className="h-4 w-4 mr-1" />
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
