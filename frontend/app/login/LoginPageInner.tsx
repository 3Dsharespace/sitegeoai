"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, authRequired, setAuthToken } from "@/lib/api";

type AuthResponse = {
  access_token: string;
};

export default function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : { name: name.trim() || email.split("@")[0], email, password };
      const res = await api.post<AuthResponse>(path, body);
      setAuthToken(res.access_token);
      router.replace(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{mode === "login" ? "Sign in" : "Create account"}</CardTitle>
          <CardDescription>
            {authRequired()
              ? "Authentication is required for this deployment."
              : "Optional in local dev — the API falls back to a mock user when JWT is off."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "register" && (
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Name</span>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </label>
            )}
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Email</span>
              <input
                type="email"
                required
                className="w-full rounded-md border bg-background px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Password</span>
              <input
                type="password"
                required
                minLength={8}
                className="w-full rounded-md border bg-background px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Register"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                No account?{" "}
                <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => setMode("register")}>
                  Register
                </button>
              </>
            ) : (
              <>
                Already registered?{" "}
                <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => setMode("login")}>
                  Sign in
                </button>
              </>
            )}
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Continue to dashboard
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
