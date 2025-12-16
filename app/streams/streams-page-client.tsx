"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { StreamsGrid, StreamGridData } from "@/components/streams/streams-grid";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StreamDialog } from "@/components/layout/stream-dialog";

type Tab = "all" | "following";

interface StreamsPageClientProps {
  allStreams: StreamGridData[];
  followingStreams: StreamGridData[];
}

export function StreamsPageClient({ allStreams, followingStreams }: StreamsPageClientProps) {
  const [activeTab, setActiveTab] = React.useState<Tab>("all");
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  const displayedStreams = activeTab === "all" ? allStreams : followingStreams;

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

        <Button variant="outline" className="gap-2" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New Stream
        </Button>
      </div>

      {/* Streams Grid */}
      {displayedStreams.length > 0 ? (
        <StreamsGrid streams={displayedStreams} />
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

