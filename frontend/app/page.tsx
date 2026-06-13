import Link from "next/link";
import {
  ArrowRight,
  Box,
  Building2,
  FileSpreadsheet,
  Globe2,
  Layers,
  MapPin,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoProjectLink } from "@/components/layout/DemoProjectLink";

const FEATURES = [
  {
    icon: MapPin,
    title: "Satellite site selection",
    body: "Search any address, toggle satellite and terrain views, and draw site boundaries on real-world maps.",
  },
  {
    icon: Sparkles,
    title: "AI design generation",
    body: "Describe flyovers, buildings, roads, or pipelines. The system produces concept designs with engineering parameters.",
  },
  {
    icon: Box,
    title: "3D BIM-style model",
    body: "Preview conceptual 3D structures with layer toggles for foundation, steel, concrete, and utilities.",
  },
  {
    icon: Layers,
    title: "Material estimation",
    body: "Deterministic calculators produce cement, steel, sand, aggregate, and labor quantities.",
  },
  {
    icon: TrendingUp,
    title: "Cost and timeline prediction",
    body: "Low, medium, and high cost ranges with construction sequences and timeline estimates.",
  },
  {
    icon: FileSpreadsheet,
    title: "PDF and Excel reports",
    body: "Export preliminary reports, CSV BOQ, GLB 3D models, and GeoJSON site data.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex-1 bg-ambient overflow-x-hidden">
      <section className="border-b border-border bg-background-secondary">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Building2 className="h-5 w-5 text-primary" aria-hidden />
            <span className="text-[12px] font-semibold tracking-wide uppercase text-muted-foreground">
              Official preliminary planning system
            </span>
          </div>
          <h1 className="text-display text-[28px] md:text-[44px] text-center max-w-4xl mx-auto mb-6 text-foreground">
            Infrastructure Planning Portal
          </h1>
          <p className="text-body-thin text-base md:text-lg text-center max-w-2xl mx-auto mb-10 leading-relaxed">
            GIS site selection, design generation, BIM visualization, bill of quantities, and cost
            analysis for civil engineers and infrastructure authorities.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/projects/new">
              <Button size="lg" className="gap-2 h-11 px-8">
                Start New Project
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <DemoProjectLink />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <DisclaimerBanner />
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <Card className="overflow-hidden">
          <div className="grid md:grid-cols-12 min-h-[280px]">
            <div className="md:col-span-2 border-r border-border p-4 space-y-1 hidden md:block bg-background">
              {["Dashboard", "Map", "3D Model", "BOQ", "Reports"].map((item) => (
                <div key={item} className="text-[12px] px-2 py-2 text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>
            <div className="md:col-span-7 relative flex items-center justify-center min-h-[220px] bg-background">
              <Globe2 className="h-14 w-14 text-primary/40" aria-hidden />
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
                <Button size="sm" className="gap-1.5 pointer-events-none">
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Design
                </Button>
              </div>
            </div>
            <div className="md:col-span-3 border-l border-border p-4 hidden md:block bg-background-secondary">
              <p className="text-[12px] font-semibold mb-3 text-foreground">Planning Assistant</p>
              <div className="space-y-2">
                <div className="text-[11px] chat-bubble-user px-3 py-2">
                  Design a 2-lane flyover here
                </div>
                <div className="text-[11px] chat-bubble-ai px-3 py-2">
                  Elevated RC deck, 4 piers, preliminary estimate
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-display text-2xl md:text-3xl mb-3">System capabilities</h2>
          <p className="text-body-thin max-w-lg mx-auto">
            From satellite selection to downloadable BOQ — one portal for concept-stage infrastructure
            planning.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="h-full">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center bg-primary/10 border border-primary/30 mb-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{body}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-background">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="text-display text-2xl mb-4">Begin a new planning record</h2>
          <p className="text-body-thin mb-8">
            Create a project record in minutes. All outputs remain preliminary until reviewed by
            licensed engineers.
          </p>
          <Link href="/projects/new">
            <Button size="lg" className="gap-2">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
