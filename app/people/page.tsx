"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { PeoplePageClient } from "./people-page-client";

export default function PeoplePage() {
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [followingMap, setFollowingMap] = React.useState<Map<string, boolean>>(
    new Map()
  );
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Fetch current user and following data on mount
  React.useEffect(() => {
    const initialize = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setCurrentUserId(user.id);

        // Fetch who the current user follows
        const { data: follows } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", user.id);

        if (follows) {
          const map = new Map<string, boolean>();
          follows.forEach((f) => map.set(f.following_id, true));
          setFollowingMap(map);
        }
      }

      setIsInitialized(true);
    };

    initialize();
  }, []);

  // Show nothing until initialized to prevent hydration mismatch
  if (!isInitialized) {
    return (
      <div className="w-full min-h-screen pb-20">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div className="px-4 py-2 rounded-full bg-muted animate-pulse w-24 h-9" />
            <div className="px-4 py-2 rounded-full bg-muted/50 animate-pulse w-24 h-9" />
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <PeoplePageClient
      currentUserId={currentUserId}
      initialFollowingMap={followingMap}
    />
  );
}
