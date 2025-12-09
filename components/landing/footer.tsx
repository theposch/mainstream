"use client";

import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/50 bg-background py-12">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">MAINSTREAM</span>
          </div>
          
          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-foreground transition-colors">GitHub</Link>
          </div>
          
          <div className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Mainstream. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

