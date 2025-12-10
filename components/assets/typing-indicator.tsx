"use client";

import { motion } from "framer-motion";

interface TypingUser {
  id: string;
  username: string;
  display_name: string;
}

interface TypingIndicatorProps {
  users: TypingUser[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const getText = () => {
    if (users.length === 1) {
      return `${users[0].display_name} is typing`;
    } else if (users.length === 2) {
      return `${users[0].display_name} and ${users[1].display_name} are typing`;
    } else {
      return `${users[0].display_name} and ${users.length - 1} others are typing`;
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
      <div className="flex gap-0.5">
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0 }}
        />
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
        />
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
        />
      </div>
      <span>{getText()}</span>
    </div>
  );
}

