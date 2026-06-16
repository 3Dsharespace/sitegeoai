"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { SystemStatus } from "@/lib/types";

export default function SystemStatusPanel() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await api.get<SystemStatus>("/api/system/status"));
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading system status…
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Could not reach backend system status. Is the API running on port 8000?
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant={status.postgis_available ? "success" : "warning"}>
            {status.database_mode_label}
          </Badge>
          <Badge variant={status.redis_available ? "success" : "secondary"}>
            Jobs: {status.job_store}
          </Badge>
          <Badge variant="outline">Storage: {status.storage_mode}</Badge>
          <Badge variant={status.survey_mode_available ? "success" : "warning"}>
            Survey: {status.survey_mode_available ? "Available" : "Limited"}
          </Badge>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Database</dt>
            <dd>{status.database_type}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">AI provider</dt>
            <dd>
              {status.ai.active_provider}
              {status.ai.mock_mode ? " (mock/demo)" : ""}
              {status.ai.configured_provider ? ` · configured: ${status.ai.configured_provider}` : ""}
            </dd>
            {status.ai.gemini_configured && status.ai.gemini_implemented === false && (
              <p className="text-xs text-amber-600 mt-1">Gemini key present but provider not implemented yet.</p>
            )}
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Ollama</dt>
            <dd>
              {status.ai.ollama.available ? (
                <>
                  Active
                  {status.ai.ollama.model_ready ? ` · ${status.ai.ollama.model}` : " · model not pulled"}
                </>
              ) : (
                <>Offline · {status.ai.ollama.base_url}</>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Maps</dt>
            <dd>
              {status.maps.osm_fallback ? "OSM fallback" : "—"}
              {status.maps.google_maps_configured ? " · Google" : ""}
              {status.maps.cesium_ion_configured ? " · Cesium Ion" : ""}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">PostGIS</dt>
            <dd>{status.postgis_available ? "Active" : "Not available (SQLite fallback)"}</dd>
          </div>
          {status.observability && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground text-xs">Observability</dt>
              <dd className="flex flex-wrap gap-2 mt-1">
                <Badge variant="outline">Request ID: {status.observability.request_id_header}</Badge>
                <Badge variant={status.observability.structured_request_logging ? "success" : "secondary"}>
                  Structured logs
                </Badge>
                <Badge variant={status.observability.sentry_enabled ? "success" : "secondary"}>
                  Sentry {status.observability.sentry_enabled ? "active" : status.observability.sentry_configured ? "configured" : "off"}
                </Badge>
              </dd>
            </div>
          )}
        </dl>
        <p className="text-[11px] text-muted-foreground border-l-2 border-primary pl-2">{status.disclaimer}</p>
      </CardContent>
    </Card>
  );
}
