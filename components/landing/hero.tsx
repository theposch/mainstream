"use client";

import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export function LandingHero() {
  return (
    <section className="relative pt-32 pb-16 md:pt-48 md:pb-32 overflow-hidden min-h-[90vh] flex items-center justify-center">
      {/* Moving Gradient Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500/20 rounded-full blur-[120px] -z-10 animate-pulse-slow" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] -z-10 animate-float" />
      
      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="px-4 py-2 text-sm rounded-full backdrop-blur-sm bg-secondary/50 border border-border">
              <span className="text-primary mr-2">New</span>
              <span>AI-Powered Drops are here</span>
            </Badge>
          </motion.div>
          
          <motion.h1 
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Your design work is <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              drowning in Slack.
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Mainstream gives your team a home for design work — organized, visible, and effortlessly shared with stakeholders.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link href="/auth/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base shadow-[0_0_30px_-10px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.6)] transition-shadow">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-base bg-background/50 backdrop-blur-sm hover:bg-background/80">
              <Play className="mr-2 h-4 w-4 fill-current" />
              Watch Demo
            </Button>
          </motion.div>
        </div>
        
        {/* Visual / Placeholder */}
        <motion.div 
          className="mt-16 md:mt-24 relative max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        >
          <div className="aspect-[16/9] rounded-xl border border-border bg-card/50 backdrop-blur-sm shadow-2xl overflow-hidden group relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
            
            {/* Placeholder Content */}
            <div className="w-full h-full flex items-center justify-center bg-muted/20">
              <div className="text-center p-8">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <span className="text-4xl">📸</span>
                </div>
                <p className="text-muted-foreground font-medium">Product Dashboard Preview</p>
                <p className="text-sm text-muted-foreground/60 mt-2">Replace with actual screenshot</p>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-emerald-500/20 blur-xl opacity-50 -z-10" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
