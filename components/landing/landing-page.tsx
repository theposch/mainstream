"use client";

import { LandingNavbar } from "./navbar";
import { LandingHero } from "./hero";
import { LogoMarquee } from "./logo-marquee";
import { LandingFeatures } from "./features";
import { LandingProblem } from "./problem-section";
import { LandingCTA } from "./cta-section";
import { LandingFooter } from "./footer";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <LogoMarquee />
        <LandingProblem />
        <LandingFeatures />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
