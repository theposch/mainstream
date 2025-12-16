"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { StreamsList, StreamListData } from "@/components/streams/streams-list";
import { Plus, Users, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StreamDialog } from "@/components/layout/stream-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Tab = "all" | "following";
type SortOption = "recent" | "posts" | "followers" | "alphabetical";

const sortLabels: Record<SortOption, string> = {
  recent: "Recent Activity",
  posts: "Most Posts",
  followers: "Most Followers",
  alphabetical: "A-Z",
};

interface StreamsPageClientProps {
  allStreams: StreamListData[];
  followingStreams: StreamListData[];
}

export function StreamsPageClient({ allStreams, followingStreams }: StreamsPageClientProps) {
  const [activeTab, setActiveTab] = React.useState<Tab>("all");
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<SortOption>("recent");

  const sortStreams = React.useCallback((streams: StreamListData[]) => {
    const sorted = [...streams];
    switch (sortBy) {
      case "recent":
        return sorted.sort((a, b) => 
          new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
        );
      case "posts":
        return sorted.sort((a, b) => b.assetsCount - a.assetsCount);
      case "followers":
        return sorted.sort((a, b) => b.followerCount - a.followerCount);
      case "alphabetical":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return sorted;
    }
  }, [sortBy]);

  const displayedStreams = React.useMemo(() => {
    const streams = activeTab === "all" ? allStreams : followingStreams;
    return sortStreams(streams);
  }, [activeTab, allStreams, followingStreams, sortStreams]);

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Tabs and New Button */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-1" role="tablist" aria-label="Streams content">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "all"}
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              activeTab === "all"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            All Streams
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "following"}
            onClick={() => setActiveTab("following")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              activeTab === "following"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Following
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9"
                    aria-label={`Sort by ${sortLabels[sortBy]}`}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Sort: {sortLabels[sortBy]}</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() => setSortBy(option)}
                  className={cn(sortBy === option && "bg-muted")}
                >
                  {sortLabels[option]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" className="gap-2" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Stream</span>
          </Button>
        </div>
      </div>

      {/* Streams List */}
      {displayedStreams.length > 0 ? (
        <StreamsList streams={displayedStreams} />
      ) : activeTab === "following" ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-semibold mb-2">No streams yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Follow some streams to see them here. Discover creative work from teams and individuals.
          </p>
          <Button 
            variant="default" 
            size="lg"
            onClick={() => setActiveTab("all")}
          >
            <Users className="w-4 h-4 mr-2" />
            Browse All Streams
          </Button>
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-lg font-medium text-muted-foreground">No streams yet.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Create your first stream to get started.
          </p>
        </div>
      )}

      {/* Create Stream Dialog */}
      <StreamDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        mode="create"
      />
    </div>
  );
}

