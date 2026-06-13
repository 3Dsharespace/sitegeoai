import Link from "next/link";
import { Key, Server, Settings, Wrench } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SystemStatusPanel from "@/components/settings/SystemStatusPanel";

const SECTIONS = [
  {
    href: "/settings/api-keys",
    icon: Key,
    title: "Provider Status",
    description: "View which map and AI providers are active (configured server-side).",
  },
  {
    href: "/admin/rates",
    icon: Wrench,
    title: "Rate Library",
    description: "Edit regional material and labor rates used in cost estimates.",
  },
  {
    href: "/admin/templates",
    icon: Settings,
    title: "Project Templates",
    description: "Manage default parameters for flyover, building, road, and pipeline types.",
  },
];

export default function SettingsPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            System status, provider configuration, rates, and project defaults
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Server className="h-4 w-4 text-primary" />
            Infrastructure status
          </div>
          <SystemStatusPanel />
        </div>

        <div className="grid gap-4">
          {SECTIONS.map(({ href, icon: Icon, title, description }) => (
            <Link key={href} href={href}>
              <Card float className="hover:border-primary/40 transition-colors cursor-pointer">
                <CardHeader className="flex-row items-start gap-3 space-y-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
