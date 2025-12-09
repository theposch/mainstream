"use client";

import { cn } from "@/lib/utils";

const logos = [
  { name: "Acme", text: "ACME" },
  { name: "Relume", text: "Relume" },
  { name: "Figma", text: "Figma" },
  { name: "Vercel", text: "Vercel" },
  { name: "Supabase", text: "Supabase" },
  { name: "Stripe", text: "Stripe" },
  { name: "Linear", text: "Linear" },
  { name: "Raycast", text: "Raycast" },
];

export function LogoMarquee() {
  return (
    <div className="w-full py-12 border-y border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden relative">
      <div className="container mx-auto px-4 mb-8 text-center">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
          Trusted by design teams at
        </p>
      </div>
      
      <div className="relative flex overflow-hidden group">
        <div className="flex animate-marquee whitespace-nowrap">
          {/* First set of logos */}
          {logos.map((logo, idx) => (
            <div
              key={idx}
              className="mx-8 md:mx-16 flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity cursor-default"
            >
              <span className="text-xl md:text-2xl font-bold tracking-tight text-foreground/80">
                {logo.text}
              </span>
            </div>
          ))}
          
          {/* Duplicate set for seamless loop */}
          {logos.map((logo, idx) => (
            <div
              key={`dup-${idx}`}
              className="mx-8 md:mx-16 flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity cursor-default"
            >
              <span className="text-xl md:text-2xl font-bold tracking-tight text-foreground/80">
                {logo.text}
              </span>
            </div>
          ))}
        </div>
        
        {/* Gradient Fade Edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-background to-transparent" />
      </div>
    </div>
  );
}

