"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DEMO_PROJECT_ID } from "@/lib/navigation";

/** Resolve demo project id from API (seeds on first request); falls back to constant. */
export function useDemoProjectId(): number {
  const [id, setId] = useState(DEMO_PROJECT_ID);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ id: number }>("/api/projects/demo")
      .then((p) => {
        if (!cancelled) setId(p.id);
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return id;
}
