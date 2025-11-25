"use client";

import * as React from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { ANIMATION_DURATION, ANIMATION_EASING } from "@/lib/constants";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  className
}: BottomSheetProps) {
  // Close on drag down
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 150 || info.velocity.y > 500) {
      onOpenChange(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: ANIMATION_DURATION.fast }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/60 z-[110] backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300 
            }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-[120] bg-zinc-950 border-t border-zinc-800 rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl",
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-label={title || "Bottom sheet"}
          >
            {/* Drag Handle */}
            <div className="w-full py-4 flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 touch-none">
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full" />
            </div>

            {/* Header (Optional) */}
            {title && (
              <div className="px-6 pb-4 border-b border-zinc-900 shrink-0">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 flex flex-col min-h-0 overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

