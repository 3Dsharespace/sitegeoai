"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { BRAND_NAME } from "@/components/landing/landing-theme";
import { api, authRequired, formatApiErrorMessage, setAuthToken } from "@/lib/api";

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
      setError(formatApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 min-h-screen">
      <div className="hidden lg:flex flex-1 flex-col justify-center gap-6 p-12 bg-[var(--background-secondary)] border-r border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 border border-primary/30">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-lg">{BRAND_NAME}</p>
            <p className="text-sm text-muted-foreground">AI-powered infrastructure planning</p>
          </div>
        </div>
        <ul className="space-y-3 text-sm text-muted-foreground max-w-md">
          <li>· Select sites on real-world maps and draw boundaries</li>
          <li>· Generate preliminary 3D designs with AI assistance</li>
          <li>· Export BOQ, cost estimates, and PDF reports</li>
        </ul>
        <p className="text-xs text-muted-foreground/80 max-w-md">
          Preliminary planning output only — not for construction approval.
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{mode === "login" ? "Sign in" : "Create account"}</CardTitle>
            <CardDescription>
              {authRequired()
                ? "Sign in to access your projects and workspace."
                : "Optional in local dev — mock user when JWT is off."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "register" && (
                <FormField label="Name" htmlFor="name">
                  <input
                    id="name"
                    className="w-full rounded-md border bg-background px-3 py-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </FormField>
              )}
              <FormField label="Email" htmlFor="email">
                <input
                  id="email"
                  type="email"
                  required
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </FormField>
              <FormField label="Password" htmlFor="password" hint="Minimum 8 characters">
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </FormField>
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
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
            {!authRequired() && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                <Link href="/dashboard" className="hover:text-foreground">
                  Continue to dashboard
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
