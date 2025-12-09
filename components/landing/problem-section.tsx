"use client";

import { XCircle, AlertCircle, HelpCircle } from "lucide-react";

export function LandingProblem() {
  return (
    <section className="py-24 border-y border-border/50 bg-background">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 relative">
             {/* Abstract Visual Representation of Chaos */}
            <div className="relative aspect-square md:aspect-video rounded-xl bg-destructive/5 border border-destructive/20 p-8 flex flex-col justify-center items-center overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-destructive/40 via-transparent to-transparent" />
              
              {/* Floating "Slack" messages */}
              <div className="space-y-4 w-full max-w-sm opacity-60 blur-[1px]">
                 <div className="bg-background p-3 rounded-lg shadow-sm border border-border w-3/4">
                    <div className="h-2 w-12 bg-muted rounded mb-2" />
                    <div className="h-2 w-full bg-muted rounded" />
                 </div>
                 <div className="bg-background p-3 rounded-lg shadow-sm border border-border w-3/4 ml-auto">
                    <div className="h-2 w-12 bg-muted rounded mb-2" />
                    <div className="h-2 w-2/3 bg-muted rounded" />
                 </div>
                 <div className="bg-background p-3 rounded-lg shadow-sm border border-border w-1/2">
                    <div className="h-2 w-8 bg-muted rounded mb-2" />
                    <div className="h-2 w-full bg-muted rounded" />
                 </div>
              </div>
              
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="bg-background/90 backdrop-blur-md px-6 py-4 rounded-full border border-destructive/30 shadow-2xl">
                    <span className="font-semibold text-destructive flex items-center gap-2">
                       <AlertCircle className="w-5 h-5" />
                       Context Lost
                    </span>
                 </div>
              </div>
            </div>
          </div>
          
          <div className="order-1 md:order-2 space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              &quot;This week in design&quot; shouldn&apos;t take all week.
            </h2>
            
            <ul className="space-y-6">
              <li className="flex gap-4 items-start">
                <div className="mt-1 bg-destructive/10 p-1 rounded-full">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Buried by Lunch</h3>
                  <p className="text-muted-foreground">You share work in Slack. It gets a few eyes, then disappears under 200 messages about server outages.</p>
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <div className="mt-1 bg-destructive/10 p-1 rounded-full">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">The Newsletter Slog</h3>
                  <p className="text-muted-foreground">You spend Friday afternoons screenshot-hunting and copy-pasting into Google Docs that nobody reads.</p>
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <div className="mt-1 bg-destructive/10 p-1 rounded-full">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Context Collapse</h3>
                  <p className="text-muted-foreground">Six weeks later, you find the Figma link, but the decisions and feedback are lost in three different tools.</p>
                </div>
              </li>
            </ul>
            
            <div className="pt-4">
              <p className="text-xl font-medium text-foreground">
                Design work deserves better than chat threads and Google Docs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

