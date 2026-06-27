import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import DashboardShell from "@/components/layout/DashboardShell";
import Toaster from "@/components/ui/toaster";
import { inter, jetbrainsMono } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "GeoAI Infrastructure Studio",
  description:
    "AI-powered 3D infrastructure planning — GIS site selection, terrain analysis, design estimation, and reporting.",
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <DashboardShell>{children}</DashboardShell>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
