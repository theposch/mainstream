"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, CalendarClock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DropsGrid } from "@/components/drops/drops-grid";
import { CreateDropDialog } from "@/components/drops/create-drop-dialog";
import { CreateSeriesDialog } from "@/components/drops/create-series-dialog";
import type { Drop, User, DropSchedule } from "@/lib/types/database";

interface DropsPageClientProps {
  initialDrops: Array<Drop & {
    creator?: User;
    post_count?: number;
    preview_images?: string[];
  }>;
  currentTab: string;
  isAuthenticated: boolean;
  currentUserId?: string;
  schedules?: DropSchedule[];
  scheduleTabContent?: React.ReactNode;
}

// Static tabs that are always present
const STATIC_TABS = [
  { id: "all", label: "All Drops" },
  { id: "drafts", label: "My Drafts" },
];

export function DropsPageClient({
  initialDrops,
  currentTab,
  isAuthenticated,
  currentUserId,
  schedules = [],
  scheduleTabContent,
}: DropsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [createSeriesDialogOpen, setCreateSeriesDialogOpen] = React.useState(false);
  
  // Local state for optimistic updates
  const [drops, setDrops] = React.useState(initialDrops);

  // Sync with server data when initialDrops changes (e.g., tab change)
  React.useEffect(() => {
    setDrops(initialDrops);
  }, [initialDrops]);

  // Build tabs: static tabs + user's schedules
  const tabs = React.useMemo(() => {
    const allTabs = [...STATIC_TABS];
    // Add schedule tabs after static tabs
    schedules.forEach(schedule => {
      allTabs.push({
        id: schedule.id,
        label: schedule.name,
      });
    });
    return allTabs;
  }, [schedules]);

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

  // Check if current tab is a schedule
  const isScheduleTab = schedules.some(s => s.id === currentTab);

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Page Header */}
      <div className="pt-10 pb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Drops</h1>
          <p className="text-lg text-muted-foreground mt-2 max-w-2xl">
            AI-powered newsletters summarizing your team&apos;s design work.
          </p>
        </div>
        {isAuthenticated && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
            <Plus className="h-4 w-4" />
                New
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
            New Drop
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCreateSeriesDialogOpen(true)}>
                <CalendarClock className="h-4 w-4 mr-2" />
                New Series
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-8 border-b border-border overflow-x-auto">
        {tabs.map((tab) => {
          // Hide "My Drafts" for unauthenticated users
          if (tab.id === "drafts" && !isAuthenticated) return null;
          
          const isActive = currentTab === tab.id;
          const isSchedule = schedules.some(s => s.id === tab.id);
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap
                ${isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              <span className="flex items-center gap-2">
                {isSchedule && <CalendarClock className="h-3.5 w-3.5" />}
              {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isScheduleTab && scheduleTabContent ? (
        // Schedule tab shows SeriesTabContent
        scheduleTabContent
      ) : (
        // Standard tabs show DropsGrid
      <DropsGrid 
        drops={drops}
        currentUserId={currentUserId}
        onDropDeleted={handleDropDeleted}
      />
      )}

      {/* Create Drop Dialog */}
      <CreateDropDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Create Series Dialog */}
      <CreateSeriesDialog
        open={createSeriesDialogOpen}
        onOpenChange={setCreateSeriesDialogOpen}
      />
    </div>
  );
}
