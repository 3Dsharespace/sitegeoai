/** Landing page tokens — reads from globals.css CSS variables where possible. */

export const BRAND_NAME = "GeoAI Infrastructure Studio";

export const landing = {
  bg: "var(--background)",
  bgElevated: "var(--background-elevated)",
  surface: "var(--background-secondary)",
  surfaceGlass: "var(--glass-bg)",
  card: "var(--card)",
  primary: "var(--marketing-primary)",
  secondary: "var(--marketing-secondary)",
  success: "var(--success)",
  text: "var(--foreground)",
  textMuted: "var(--muted-foreground)",
  border: "var(--border-marketing)",
  borderCyan: "rgba(56, 189, 248, 0.2)",
} as const;

export const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Accuracy", href: "#accuracy" },
  { label: "Pricing", href: "#pricing" },
] as const;
