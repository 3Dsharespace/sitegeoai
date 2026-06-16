import Link from "next/link";
import { Box } from "lucide-react";

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Workflow", href: "#workflow" },
    { label: "Launch Platform", href: "/projects/new" },
  ],
  Resources: [
    { label: "Documentation", href: "/settings" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Demo Project", href: "/dashboard" },
  ],
  Legal: [
    { label: "Contact", href: "mailto:support@geoai.example" },
    { label: "Privacy", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#05070A]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(56,189,248,0.25)] bg-[rgba(56,189,248,0.08)]">
                <Box className="h-4 w-4 text-[#38BDF8]" />
              </div>
              <span className="font-semibold text-[#F8FAFC]">GeoAI 3D</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#94A3B8]">
              AI-powered 3D infrastructure planning from real-world maps. Select locations, analyze
              terrain, and generate civil engineering layouts with material estimates.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-4">
                {group}
              </p>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-[#94A3B8] transition-colors hover:text-[#38BDF8]"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/[0.06] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#64748B]">
            © {new Date().getFullYear()} GeoAI 3D. Preliminary planning only — not for construction
            approval.
          </p>
          <p className="text-xs text-[#64748B]">
            Final drawings require licensed engineer verification.
          </p>
        </div>
      </div>
    </footer>
  );
}
