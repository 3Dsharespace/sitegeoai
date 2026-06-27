"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuthUser } from "@/lib/useAuthUser";

interface UsageEntry {
  id: number;
  user_id: number | null;
  project_id: number | null;
  event_type: string;
  units: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

interface UsageResponse {
  total: number;
  limit: number;
  offset: number;
  entries: UsageEntry[];
}

export default function UsageAdminPage() {
  const { isAdmin, loading: authLoading } = useAuthUser();
  const [data, setData] = useState<UsageResponse | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api
      .get<UsageResponse>("/api/admin/usage?limit=100")
      .then(setData)
      .catch((e) => setError(String(e instanceof Error ? e.message : e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full px-6 py-8 space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usage Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Metered usage events across projects and users.
            {!isAdmin && !authLoading ? " Read-only view." : ""}
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card float className="overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <table className="data-table w-full min-w-[640px]">
              <thead>
                <tr>
                  {["Time", "User", "Project", "Event", "Units"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="text-xs font-data whitespace-nowrap">
                      {entry.created_at ? new Date(entry.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="text-xs">{entry.user_id ?? "—"}</td>
                    <td className="text-xs">{entry.project_id ?? "—"}</td>
                    <td>
                      <Badge variant="accent" className="text-[10px]">
                        {entry.event_type}
                      </Badge>
                    </td>
                    <td className="text-xs font-data">{entry.units ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.entries.length && !error && (
              <p className="p-6 text-sm text-muted-foreground text-center">No usage events recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
