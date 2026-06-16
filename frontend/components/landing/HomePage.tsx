"use client";

import AccuracySection from "./AccuracySection";
import CTASection from "./CTASection";
import DemoPreview from "./DemoPreview";
import FeaturesSection from "./FeaturesSection";
import Footer from "./Footer";
import Hero from "./Hero";
import Navbar from "./Navbar";
import TrustMetrics from "./TrustMetrics";
import Workflow from "./Workflow";

export default function HomePage() {
  return (
    <div className="landing-page min-h-screen overflow-x-hidden bg-[#05070A] text-[#F8FAFC] antialiased scroll-smooth">
      <Navbar />
      <main>
        <Hero />
        <TrustMetrics />
        <FeaturesSection />
        <Workflow />
        <AccuracySection />
        <DemoPreview />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
