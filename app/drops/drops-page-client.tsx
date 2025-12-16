"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, ChevronDown, MoreHorizontal, Plus, Send, Sparkles } from "lucide-react";
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
import { ManageSchedulesModal } from "@/components/drops/manage-schedules-modal";
import type { Drop, User, DropSchedule } from "@/lib/types/database";

type EnrichedDrop = Drop & {
    creator?: User;
    post_count?: number;
    preview_images?: string[];
};

interface DropsPageClientProps {
  initialDrops: EnrichedDrop[];
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

// Maximum visible schedule tabs before showing "More..." dropdown
const MAX_VISIBLE_SCHEDULE_TABS = 4;

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
  const [manageSchedulesOpen, setManageSchedulesOpen] = React.useState(false);
  
  // Local state for optimistic updates
  const [drops, setDrops] = React.useState(initialDrops);

  // Sync with server data when initialDrops changes (e.g., tab change)
  React.useEffect(() => {
    setDrops(initialDrops);
  }, [initialDrops]);

  // Build tabs: static tabs + user's schedules (split into visible and overflow)
  const { visibleTabs, overflowTabs } = React.useMemo(() => {
    const allTabs = [...STATIC_TABS];
    const scheduleTabs: Array<{ id: string; label: string; isSchedule: boolean }> = [];
    
    schedules.forEach(schedule => {
      scheduleTabs.push({
        id: schedule.id,
        label: schedule.name,
        isSchedule: true,
      });
    });
    
    // Split schedule tabs into visible and overflow
    const visibleScheduleTabs = scheduleTabs.slice(0, MAX_VISIBLE_SCHEDULE_TABS);
    const overflowScheduleTabs = scheduleTabs.slice(MAX_VISIBLE_SCHEDULE_TABS);
    
    return {
      visibleTabs: [...allTabs.map(t => ({ ...t, isSchedule: false })), ...visibleScheduleTabs],
      overflowTabs: overflowScheduleTabs,
    };
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
  
  // Check if the current tab is in overflow (for highlighting "More" button)
  const isOverflowTabActive = overflowTabs.some(t => t.id === currentTab);

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Tabs + Actions Row */}
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-1">
          {visibleTabs.map((tab) => {
          // Hide "My Drafts" for unauthenticated users
          if (tab.id === "drafts" && !isAuthenticated) return null;
          
          const isActive = currentTab === tab.id;
            
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                  px-4 py-2 text-sm font-medium transition-all rounded-full whitespace-nowrap
                ${isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }
              `}
            >
              {tab.label}
            </button>
          );
        })}
          
          {/* Overflow tabs dropdown */}
          {overflowTabs.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`
                    px-4 py-2 text-sm font-medium transition-all rounded-full whitespace-nowrap
                    flex items-center gap-1
                    ${isOverflowTabActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span>More</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {overflowTabs.map((tab) => (
                  <DropdownMenuItem
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={currentTab === tab.id ? "bg-accent" : ""}
                  >
                    {tab.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setManageSchedulesOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Manage All Schedules
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Actions */}
        {isAuthenticated && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Create dropdown with both options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setCreateDialogOpen(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  <div>
                    <div className="font-medium">One-time Drop</div>
                    <div className="text-xs text-muted-foreground">Create a single newsletter</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreateSeriesDialogOpen(true)}>
                  <CalendarClock className="h-4 w-4 mr-2" />
                  <div>
                    <div className="font-medium">Scheduled Series</div>
                    <div className="text-xs text-muted-foreground">Auto-generate on a schedule</div>
                  </div>
                </DropdownMenuItem>
                {schedules.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setManageSchedulesOpen(true)}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Manage Schedules
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pt-8">
        {/* First-run experience for scheduled drops */}
        {isAuthenticated && schedules.length === 0 && currentTab === "all" && (
          <div className="mb-8 rounded-xl border border-border bg-gradient-to-br from-primary/5 via-transparent to-transparent p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <CalendarClock className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  Save time with Scheduled Drops
                </h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-xl">
                  Set up recurring newsletters that auto-generate drafts on a schedule. 
                  Perfect for weekly design updates, monthly recaps, or any regular cadence. 
                  We&apos;ll notify you when each draft is ready to review.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCreateSeriesDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Schedule
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {isScheduleTab && scheduleTabContent ? (
          // Schedule tab shows SeriesTabContent
          scheduleTabContent
        ) : (
          // All other tabs show DropsGrid
      <DropsGrid 
        drops={drops}
        currentUserId={currentUserId}
        onDropDeleted={handleDropDeleted}
      />
        )}
      </div>

      {/* Create Drop Dialog */}
      <CreateDropDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Create Series Dialog */}
      <CreateSeriesDialog
        open={createSeriesDialogOpen}
        onOpenChange={setCreateSeriesDialogOpen}
        onSuccess={() => router.refresh()}
      />

      {/* Manage Schedules Modal */}
      <ManageSchedulesModal
        open={manageSchedulesOpen}
        onOpenChange={setManageSchedulesOpen}
        schedules={schedules}
        onSchedulesChange={() => router.refresh()}
      />
    </div>
  );
}
