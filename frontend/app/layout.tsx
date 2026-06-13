import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import DashboardShell from "@/components/layout/DashboardShell";
import Toaster from "@/components/ui/toaster";
import { inter, jetbrainsMono } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Infrastructure Planning Portal",
  description:
    "Official preliminary infrastructure planning system. GIS site selection, design estimation, and reporting — not for construction approval.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark h-full antialiased ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="flex h-full flex-col overflow-hidden bg-ambient font-sans">
        <ThemeProvider>
          <DashboardShell>{children}</DashboardShell>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
