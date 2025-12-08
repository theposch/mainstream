"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropsGrid } from "@/components/drops/drops-grid";
import { CreateDropDialog } from "@/components/drops/create-drop-dialog";
import type { Drop, User } from "@/lib/types/database";

interface DropsPageClientProps {
  initialDrops: Array<Drop & {
    creator?: User;
    post_count?: number;
    preview_images?: string[];
  }>;
  currentTab: string;
  isAuthenticated: boolean;
  currentUserId?: string;
}

const tabs = [
  { id: "all", label: "All Drops" },
  { id: "weekly", label: "Weekly" },
  { id: "drafts", label: "My Drafts" },
];

export function DropsPageClient({
  initialDrops,
  currentTab,
  isAuthenticated,
  currentUserId,
}: DropsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  
  // Local state for optimistic updates
  const [drops, setDrops] = React.useState(initialDrops);

  // Sync with server data when initialDrops changes (e.g., tab change)
  React.useEffect(() => {
    setDrops(initialDrops);
  }, [initialDrops]);

  const handleTabChange = React.useCallback((tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tabId === "all") {
      params.delete("tab");
    } else {
      params.set("tab", tabId);
    }
    router.push(`/drops${params.toString() ? `?${params.toString()}` : ""}`);
  }, [router, searchParams]);

  // Optimistic delete - remove from local state immediately
  const handleDropDeleted = React.useCallback((dropId: string) => {
    setDrops((prev) => prev.filter((drop) => drop.id !== dropId));
  }, []);

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Page Header */}
      <div className="pt-10 pb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white">Drops</h1>
          <p className="text-lg text-zinc-400 mt-2 max-w-2xl">
            AI-powered newsletters summarizing your team&apos;s design work.
          </p>
        </div>
        {isAuthenticated && (
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Drop
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-8 border-b border-zinc-800">
        {tabs.map((tab) => {
          // Hide "My Drafts" for unauthenticated users
          if (tab.id === "drafts" && !isAuthenticated) return null;
          
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                px-4 py-2.5 text-sm font-medium transition-colors relative
                ${isActive
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-300"
                }
              `}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <DropsGrid 
        drops={drops}
        currentUserId={currentUserId}
        onDropDeleted={handleDropDeleted}
      />

      {/* Create Dialog */}
      <CreateDropDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
