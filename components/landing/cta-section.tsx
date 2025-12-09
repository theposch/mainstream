"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function LandingCTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="absolute inset-0 bg-primary/5 -z-10" />
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[100px] -z-10 rounded-full"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5] 
        }}
        transition={{ 
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut" 
        }}
      />
      
      <div className="container px-4 md:px-6 mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Stop losing work to the void.
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Give your team a home for their best work. Keep stakeholders informed without the manual grind.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg hover:shadow-primary/25 transition-all">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="h-12 px-8 text-base bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-background/80">
              Book a Demo
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
