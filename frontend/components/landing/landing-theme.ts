/** Premium landing page design tokens — scoped to GeoAI marketing pages. */
export const landing = {
  bg: "#05070A",
  bgElevated: "#070A0F",
  surface: "#0D1117",
  surfaceGlass: "rgba(13, 17, 23, 0.72)",
  card: "#111827",
  primary: "#38BDF8",
  secondary: "#6366F1",
  success: "#10B981",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  border: "rgba(255, 255, 255, 0.08)",
  borderCyan: "rgba(56, 189, 248, 0.2)",
} as const;

export const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Accuracy", href: "#accuracy" },
  { label: "Pricing", href: "#pricing" },
] as const;
