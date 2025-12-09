import * as React from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface LikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  onLike: (e: React.MouseEvent) => void;
  isLoading?: boolean;
  size?: "sm" | "default" | "lg";
  variant?: "ghost" | "solid";
  className?: string;
}

/**
 * A delightful Like button with a "heartbeat" spring animation and 
 * upward floating particle effects when clicked.
 */
export function LikeButton({ 
  isLiked, 
  likeCount, 
  onLike, 
  isLoading = false,
  size = "default",
  variant = "ghost",
  className 
}: LikeButtonProps) {
  const [showParticles, setShowParticles] = React.useState(false);

  const handleClick = (e: React.MouseEvent) => {
    // Only trigger animation on "Like" (not unlike)
    if (!isLiked) {
      setShowParticles(true);
      // Reset after animation
      setTimeout(() => setShowParticles(false), 1000);
    }
    onLike(e);
  };

  const iconSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-lg" : "text-sm";

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "relative group flex items-center gap-1.5 transition-colors focus:outline-none cursor-pointer",
        variant === "solid" && "p-2.5 rounded-full backdrop-blur-md shadow-lg",
        variant === "solid" && (isLiked ? "bg-red-500 text-white" : "bg-white/90 hover:bg-white text-black"),
        variant === "ghost" && "text-zinc-400 hover:text-white",
        isLoading && "opacity-50 cursor-wait",
        className
      )}
    >
      <div className="relative">
        <motion.div
          animate={isLiked ? { scale: 1.2 } : { scale: 1 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 15 }}
        >
          <Heart 
            className={cn(
              iconSize,
              isLiked 
                ? (variant === "solid" ? "fill-current" : "fill-red-500 text-red-500") 
                : (variant === "solid" ? "" : "group-hover:text-white")
            )} 
          />
        </motion.div>

        {/* Floating Hearts Particles */}
        <AnimatePresence>
          {showParticles && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0], 
                    scale: [0, 1.2, 0], 
                    x: (Math.random() - 0.5) * 40,
                    y: -20 - Math.random() * 30
                  }}
                  transition={{ 
                    duration: 0.8, 
                    ease: "easeOut",
                    delay: Math.random() * 0.1
                  }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <Heart className={cn("fill-red-500 text-red-500", i % 2 === 0 ? "h-4 w-4" : "h-3 w-3")} />
                </motion.div>
              ))}
              
              {/* Center burst circle */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 0.5, 0], scale: 2 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="w-10 h-10 bg-red-500/20 rounded-full blur-md" />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {likeCount > 0 && (
        <span 
          className={cn(
            "font-medium tabular-nums",
            textSize,
            variant === "ghost" && isLiked && "text-red-500"
          )}
        >
          {likeCount}
        </span>
      )}
    </button>
  );
}

