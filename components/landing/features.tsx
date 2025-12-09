"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search,
  Smartphone,
  Sparkles,
  Hash,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Demo Component for the Interactive Drop
function InteractiveDropDemo() {
  const [state, setState] = useState<'idle' | 'processing' | 'complete'>('idle');

  const handleGenerate = () => {
    setState('processing');
    setTimeout(() => {
      setState('complete');
    }, 2500);
  };

  const handleReset = () => {
    setState('idle');
  };

  return (
    <div className="relative w-full max-w-[420px] md:max-w-[480px] perspective-1000 transform md:translate-x-6 md:translate-y-6 mx-auto">
      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
            transition={{ duration: 0.3 }}
            className="w-full aspect-[3/4] rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col font-sans"
          >
            {/* Stream Header */}
            <div className="p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Hash className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Mobile Squad</div>
                  <div className="text-[10px] text-muted-foreground">24 members • 12 updates</div>
                </div>
              </div>
            </div>
            
            {/* Stream Content */}
            <div className="flex-1 p-4 space-y-4 overflow-hidden relative bg-muted/5">
              {[
                { user: "Alex C.", color: "bg-blue-500", time: "2h ago", title: "New Onboarding Flow" },
                { user: "Sarah M.", color: "bg-emerald-500", time: "4h ago", title: "Home Screen Icons" },
                { user: "Mike R.", color: "bg-purple-500", time: "1d ago", title: "Profile Settings" },
              ].map((post, i) => (
                <div key={i} className="bg-card rounded-lg border border-border p-3 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full ${post.color} flex items-center justify-center text-[10px] text-white`}>
                        {post.user[0]}
                      </div>
                      <span className="text-xs font-medium">{post.user}</span>
                      <span className="text-[10px] text-muted-foreground">{post.time}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-medium">{post.title}</div>
                    <div className="aspect-[2/1] rounded bg-muted/50 border border-border/50" />
                  </div>
                </div>
              ))}
              
              {/* Gradient Overlay & CTA */}
              <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/95 to-transparent flex flex-col items-center justify-end pb-8">
                 <motion.button 
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={handleGenerate}
                   className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-emerald-600 px-8 font-medium text-white shadow-lg transition-all hover:bg-emerald-700 hover:shadow-emerald-500/25"
                 >
                   <div className="absolute inset-0 flex items-center justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                    <div className="relative h-full w-8 bg-white/20" />
                   </div>
                   <Sparkles className="mr-2 h-4 w-4" />
                   Create Weekly Drop
                 </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {state === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="absolute inset-0 w-full rounded-xl border border-border bg-background/80 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center text-center p-8 font-sans"
          >
             <div className="relative mb-8">
                <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                <div className="relative bg-card border border-border rounded-xl p-4 shadow-xl">
                  <Sparkles className="w-8 h-8 text-emerald-500 animate-pulse" />
                </div>
             </div>
             
             <div className="space-y-2 mb-8">
               <h4 className="text-lg font-semibold">Generating Summary</h4>
               <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">
                 Analyzing activity from <span className="text-foreground font-medium">#mobile-squad</span> over the last 7 days...
               </p>
             </div>
             
             <div className="w-48 space-y-3">
               <div className="h-1 w-full bg-muted overflow-hidden rounded-full">
                  <motion.div 
                    className="h-full bg-emerald-500"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.5, ease: "easeInOut" }}
                  />
               </div>
               <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                 <span>Processing</span>
                 <span>12 items</span>
               </div>
             </div>
          </motion.div>
        )}

        {state === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20, rotateX: -10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="w-full aspect-[3/4] rounded-xl border border-border bg-black shadow-2xl overflow-hidden flex flex-col relative font-sans"
          >
            {/* Confetti */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
               {[...Array(6)].map((_, i) => (
                 <motion.div 
                   key={i}
                   className={`absolute w-1.5 h-1.5 rounded-full ${['bg-emerald-500', 'bg-blue-500', 'bg-purple-500'][i % 3]}`}
                   initial={{ 
                     top: '50%', 
                     left: '50%', 
                     opacity: 1, 
                     scale: 0 
                   }}
                   animate={{ 
                     top: `${20 + Math.random() * 60}%`, 
                     left: `${20 + Math.random() * 60}%`, 
                     opacity: 0, 
                     scale: 1 
                   }}
                   transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.1 }}
                 />
               ))}
            </div>

            {/* Simulated Email/Drop View */}
            <div className="flex-1 overflow-y-auto bg-black custom-scrollbar">
               <div className="max-w-md mx-auto bg-black text-white min-h-full flex flex-col">
                  
                  {/* Drop Header */}
                  <div className="p-8 text-center border-b border-white/10">
                     <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-6">Mainstream</div>
                     <h3 className="text-2xl font-bold text-white mb-3 leading-tight">Weekly Drop · Dec 12</h3>
                     <p className="text-sm text-zinc-400 leading-relaxed max-w-[280px] mx-auto">
                       Updates from the Mobile Squad including the new onboarding flow and home screen refresh.
                     </p>
                     
                     {/* Contributors */}
                     <div className="flex items-center justify-center mt-6 -space-x-2">
                       {['bg-blue-500', 'bg-emerald-500', 'bg-purple-500'].map((bg, i) => (
                         <div key={i} className={`w-8 h-8 rounded-full border-2 border-black ${bg} flex items-center justify-center text-[10px] font-bold`}>
                           {['A', 'S', 'M'][i]}
                         </div>
                       ))}
                       <div className="ml-4 text-xs text-zinc-500">
                         3 contributors
                       </div>
                     </div>
                  </div>

                  {/* Drop Content */}
                  <div className="p-6 space-y-8">
                     {/* Stream Section */}
                     <div>
                       <div className="text-sm font-semibold text-white mb-4"># Mobile Squad</div>
                       
                       {/* Post Card */}
                       <div className="space-y-3">
                         <div className="aspect-video w-full rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden relative">
                           {/* Simulated UI Content */}
                           <div className="absolute inset-0 p-4 flex gap-2">
                             <div className="w-1/3 h-full bg-zinc-800/50 rounded-sm" />
                             <div className="flex-1 h-full space-y-2">
                               <div className="w-full h-2 bg-zinc-800/50 rounded-sm" />
                               <div className="w-2/3 h-2 bg-zinc-800/50 rounded-sm" />
                             </div>
                           </div>
                         </div>
                         <div>
                           <div className="font-medium text-white text-sm">New Onboarding Flow</div>
                           <p className="text-xs text-zinc-500 mt-1">Finalized the interaction patterns for the new user signup flow.</p>
                           <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-600">
                             <span className="text-zinc-500">Alex C.</span>
                             <span>•</span>
                             <span>2h ago</span>
                           </div>
                         </div>
                       </div>
                     </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-auto p-4 border-t border-white/10 bg-zinc-900/30 flex items-center justify-between sticky bottom-0 backdrop-blur-md">
                     <button 
                       onClick={handleReset}
                       className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5"
                     >
                       <RefreshCw className="w-3 h-3" />
                       Reset
                     </button>
                     <div className="flex gap-2">
                       <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-xs font-medium text-emerald-500">Draft Ready</span>
                     </div>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LandingFeatures() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="max-w-3xl mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Create visibility for the <br /> whole team
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
          
          {/* Feature 1: AI Drops (Full Width) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="md:col-span-3 group relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-emerald-500/10 via-background to-background"
          >
            <div className="flex flex-col md:flex-row h-full">
              <div className="p-8 md:p-12 flex flex-col justify-center md:w-2/5 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6">
                  <Sparkles className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="text-3xl font-bold mb-4">Generate summaries in 1 click</h3>
                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                  Create newsletter summaries of work happening across one or more work streams. Use AI to summarize updates, so you can spend less time writing lengthy emails.
                </p>
              </div>
              
              {/* Visual: Interactive Demo */}
              <div className="md:w-3/5 relative min-h-[500px] md:min-h-[500px] bg-gradient-to-br from-emerald-500/5 to-transparent flex items-center justify-center overflow-hidden p-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent opacity-50" />
                
                <InteractiveDropDemo />
              </div>
            </div>
          </motion.div>

          {/* Feature 2: Mobile/On the go (1/3 Width) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-1 group relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-b from-blue-500/10 via-background to-background"
          >
            <div className="flex flex-col h-full relative">
               {/* Visual: Phone Mockup */}
               <div className="flex-1 min-h-[300px] flex items-end justify-center pt-12 pb-0 px-8 overflow-hidden">
                 <div className="relative w-full max-w-[240px] aspect-[9/19] rounded-t-[2.5rem] border-x-4 border-t-4 border-foreground/10 bg-background shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-foreground/10 rounded-b-xl" />
                    <div className="p-4 mt-8 space-y-4">
                       {/* Mobile Feed */}
                       <div className="aspect-square rounded-xl bg-muted/20" />
                       <div className="space-y-2">
                          <div className="w-3/4 h-3 rounded bg-muted/50" />
                          <div className="w-1/2 h-3 rounded bg-muted/30" />
                       </div>
                       <div className="aspect-square rounded-xl bg-muted/20" />
                    </div>
                 </div>
               </div>
               
               <div className="p-8 relative z-10 bg-gradient-to-t from-background via-background to-transparent pt-12">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                  <Smartphone className="h-5 w-5 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">On the go</h3>
                <p className="text-muted-foreground">Access your streams and comment on work from anywhere.</p>
              </div>
            </div>
          </motion.div>

          {/* Feature 3: Search (2/3 Width) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-2 group relative overflow-hidden rounded-3xl border border-border/50 bg-card/50"
          >
            <div className="flex flex-col h-full">
              <div className="p-8 md:p-12 pb-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Powerful Search and Filtering</h3>
                <p className="text-muted-foreground text-lg max-w-lg">
                  Filter by date, person, stream, or use full-text search to find exactly what you're looking for.
                </p>
              </div>

              {/* Visual: Search UI */}
              <div className="mt-auto p-8 md:p-12 pt-8">
                <div className="w-full bg-background rounded-xl border border-border shadow-lg overflow-hidden">
                  {/* Search Input */}
                  <div className="flex items-center px-4 py-3 border-b border-border gap-3">
                    <Search className="w-5 h-5 text-muted-foreground" />
                    <div className="h-4 w-48 bg-muted/30 rounded" />
                    <div className="ml-auto flex gap-1">
                       <div className="h-5 w-12 bg-muted/20 rounded border border-border/50" />
                    </div>
                  </div>
                  
                  {/* Results List */}
                  <div className="p-2 bg-muted/5">
                    <div className="text-xs font-medium text-muted-foreground px-3 py-2">Streams</div>
                    <div className="space-y-1">
                      {['mobile-squad', 'product-design', 'ad-revenue'].map((tag) => (
                        <div key={tag} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-default">
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{tag}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="text-xs font-medium text-muted-foreground px-3 py-2 mt-2">People</div>
                    <div className="space-y-1">
                      {['Alex Chen', 'Sarah Miller'].map((name) => (
                        <div key={name} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-default">
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary">
                             {name[0]}
                          </div>
                          <span className="text-sm font-medium">{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
