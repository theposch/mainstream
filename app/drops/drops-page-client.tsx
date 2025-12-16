"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, CalendarClock, MoreVertical } from "lucide-react";
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
import { ManageSchedulesModal } from "@/components/drops/manage-schedules-modal";
import type { Drop, User, DropSchedule } from "@/lib/types/database";

type EnrichedDrop = Drop & {
  creator?: User;
  post_count?: number;
  preview_images?: string[];
};

interface DropsPageClientProps {
  initialDrops: EnrichedDrop[];
  scheduledDrops?: EnrichedDrop[];
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
  scheduledDrops: initialScheduledDrops,
  currentTab,
  isAuthenticated,
  currentUserId,
  schedules = [],
  scheduleTabContent,
}: DropsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [manageSchedulesOpen, setManageSchedulesOpen] = React.useState(false);
  
  // Local state for optimistic updates
  const [drops, setDrops] = React.useState(initialDrops);
  const [scheduledDrops, setScheduledDrops] = React.useState(initialScheduledDrops || []);

  // Sync with server data when initialDrops changes (e.g., tab change)
  React.useEffect(() => {
    setDrops(initialDrops);
    setScheduledDrops(initialScheduledDrops || []);
  }, [initialDrops, initialScheduledDrops]);

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
    setScheduledDrops((prev) => prev.filter((drop) => drop.id !== dropId));
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
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setManageSchedulesOpen(true)}>
                  <CalendarClock className="h-4 w-4 mr-2" />
                  Manage Scheduled Drops
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Drop
            </Button>
          </div>
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
      ) : currentTab === "drafts" && scheduledDrops.length > 0 ? (
        // Drafts tab with scheduled drops section
        <div className="space-y-8">
          {/* Scheduled Drafts Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Scheduled
              </h2>
            </div>
            <DropsGrid
              drops={scheduledDrops}
              currentUserId={currentUserId}
              onDropDeleted={handleDropDeleted}
            />
          </div>

          {/* Other Drafts Section */}
          {drops.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                Other
              </h2>
              <DropsGrid
                drops={drops}
                currentUserId={currentUserId}
                onDropDeleted={handleDropDeleted}
              />
            </div>
          )}
        </div>
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
