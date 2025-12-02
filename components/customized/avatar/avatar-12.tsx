import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types/database";

type AvatarProps = React.ComponentProps<typeof Avatar>;

interface AvatarGroupProps extends React.ComponentProps<"div"> {
  children: React.ReactElement<AvatarProps>[];
  max?: number;
}

export const AvatarGroup = React.memo(function AvatarGroup({
  children,
  max,
  className,
  ...props
}: AvatarGroupProps) {
  // Memoize computed values
  const { totalAvatars, displayedAvatars, remainingAvatars } = React.useMemo(() => {
    const totalAvatars = React.Children.count(children);
    const displayedAvatars = React.Children.toArray(children)
      .slice(0, max)
      .reverse();
    const remainingAvatars = max ? Math.max(totalAvatars - max, 0) : 0;
    return { totalAvatars, displayedAvatars, remainingAvatars };
  }, [children, max]);

  return (
    <div
      className={cn("flex items-center flex-row-reverse", className)}
      {...props}
    >
      {remainingAvatars > 0 && (
        <Avatar className="-ml-2 hover:z-10 relative ring-2 ring-background">
          <AvatarFallback className="bg-muted-foreground text-white text-xs">
            +{remainingAvatars}
          </AvatarFallback>
        </Avatar>
      )}
      {displayedAvatars.map((avatar, index) => {
        if (!React.isValidElement(avatar)) return null;

        return (
          <div key={index} className="-ml-2 hover:z-10 relative">
            {React.cloneElement(avatar as React.ReactElement<AvatarProps>, {
              className: cn("ring-2 ring-background", (avatar as React.ReactElement<AvatarProps>).props.className),
            })}
          </div>
        );
      })}
    </div>
  );
});

/**
 * StreamFollowers component
 * 
 * Displays a group of follower avatars for a stream.
 * Accepts an array of User objects and a max count.
 */
interface StreamFollowersProps {
  followers: User[];
  max?: number;
  totalCount?: number;
  size?: "sm" | "md";
  className?: string;
}

export const StreamFollowers = React.memo(function StreamFollowers({ 
  followers, 
  max = 3, 
  totalCount,
  size = "md",
  className 
}: StreamFollowersProps) {
  // Memoize computed values to avoid recalculation on every render
  const { sizeClass, textSize, displayedFollowers, remaining } = React.useMemo(() => {
    const sizeClass = size === "sm" ? "h-6 w-6" : "h-8 w-8";
    const textSize = size === "sm" ? "text-[10px]" : "text-xs";
    
    // Slice and reverse without mutating original array
    const displayedFollowers = followers.slice(0, max).reverse();
    const remaining = totalCount 
      ? Math.max(totalCount - max, 0)
      : Math.max(followers.length - max, 0);
    
    return { sizeClass, textSize, displayedFollowers, remaining };
  }, [followers, max, totalCount, size]);

  // If no followers, show empty state
  if (!followers || followers.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center flex-row-reverse", className)}>
      {remaining > 0 && (
        <Avatar className={cn("-ml-2 hover:z-10 relative ring-2 ring-background cursor-pointer", sizeClass)}>
          <AvatarFallback className={cn("bg-muted-foreground text-white", textSize)}>
            +{remaining}
          </AvatarFallback>
        </Avatar>
      )}
      {displayedFollowers.map((user) => (
        <div key={user.id} className="-ml-2 hover:z-10 relative">
          <Avatar 
            className={cn("ring-2 ring-background cursor-pointer", sizeClass)}
            title={user.display_name || user.username}
          >
            <AvatarImage src={user.avatar_url} alt={user.display_name || user.username} />
            <AvatarFallback className={cn("bg-secondary text-secondary-foreground", textSize)}>
              {(user.display_name || user.username)?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      ))}
    </div>
  );
});

// Demo component for testing
export default function AvatarGroupDemo() {
  return (
    <AvatarGroup max={3}>
      <Avatar className="-ml-2 first:ml-0 cursor-pointer">
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback className="bg-indigo-500 text-white">CN</AvatarFallback>
      </Avatar>
      <Avatar className="-ml-2 first:ml-0 cursor-pointer">
        <AvatarFallback className="bg-green-600 text-white">CN</AvatarFallback>
      </Avatar>
      <Avatar className="-ml-2 first:ml-0 cursor-pointer">
        <AvatarFallback className="bg-red-500 text-white">AB</AvatarFallback>
      </Avatar>
      <Avatar className="-ml-2 first:ml-0 cursor-pointer">
        <AvatarFallback className="bg-indigo-500 text-white">VK</AvatarFallback>
      </Avatar>
      <Avatar className="-ml-2 first:ml-0 cursor-pointer">
        <AvatarFallback className="bg-orange-500 text-white">RS</AvatarFallback>
      </Avatar>
    </AvatarGroup>
  );
}
