"use client";

import * as React from "react";
import { differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditSeriesDialog } from "./edit-series-dialog";
import { toast } from "sonner";
import type { DropSchedule } from "@/lib/types/database";

interface ScheduleCountdownCardProps {
  schedule: DropSchedule;
  onScheduleUpdated?: (schedule: DropSchedule) => void;
}

// Slack icon component
function SlackIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor"
    >
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  );
}

export function ScheduleCountdownCard({
  schedule,
  onScheduleUpdated,
}: ScheduleCountdownCardProps) {
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [, setTick] = React.useState(0);

  // Auto-refresh countdown every minute
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, []);

  // Calculate countdown
  const getCountdown = () => {
    if (!schedule.next_run_at || schedule.status !== "active") {
      return null;
    }

    const now = new Date();
    const nextRun = new Date(schedule.next_run_at);
    const daysUntil = differenceInDays(nextRun, now);
    const hoursUntil = differenceInHours(nextRun, now);
    const minutesUntil = differenceInMinutes(nextRun, now);

    if (daysUntil > 1) {
      return { value: daysUntil, unit: "days" };
    } else if (daysUntil === 1) {
      return { value: 1, unit: "day" };
    } else if (hoursUntil > 1) {
      return { value: hoursUntil, unit: "hours" };
    } else if (hoursUntil === 1) {
      return { value: 1, unit: "hour" };
    } else if (minutesUntil > 1) {
      return { value: minutesUntil, unit: "minutes" };
    } else if (minutesUntil === 1) {
      return { value: 1, unit: "minute" };
    } else {
      return { value: 0, unit: "soon" };
    }
  };

  const countdown = getCountdown();

  const handleRemindTeam = async () => {
    const message = `📢 Reminder: The next ${schedule.name} is coming up! Share your work-in-progress to be included.`;
    
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Message copied to clipboard", {
        description: "Paste it in Slack to remind your team",
      });
    } catch {
      toast.error("Failed to copy message");
    }
  };

  const handleEditSchedule = () => {
    setEditDialogOpen(true);
  };

  const handleEditSuccess = (updated: DropSchedule) => {
    setEditDialogOpen(false);
    onScheduleUpdated?.(updated);
  };

  // If schedule is paused, show paused state
  if (schedule.status === "paused") {
    return (
      <>
        <div className="bg-card/50 rounded-xl border border-border overflow-hidden hover:border-border/80 transition-colors p-4 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-foreground mb-2">
              Schedule paused
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This schedule is currently paused. Resume it to continue generating drops automatically.
            </p>
          </div>

          <div className="space-y-2 mt-4">
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={handleEditSchedule}
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit schedule
            </Button>
          </div>
        </div>

        <EditSeriesDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          schedule={schedule}
          onSuccess={handleEditSuccess}
        />
      </>
    );
  }

  return (
    <>
      <div className="bg-card/50 rounded-xl border border-border overflow-hidden hover:border-border/80 transition-colors p-4 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-foreground mb-2">
            {countdown ? (
              countdown.unit === "soon" ? (
                "Drop coming soon"
              ) : (
                `${countdown.value} ${countdown.unit} til the next drop`
              )
            ) : (
              "Next drop scheduled"
            )}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {countdown && countdown.value > 0 ? (
              <>
                The next drop is going out in {countdown.value} {countdown.unit}. 
                Post your work-in-progress before then to have it included.
              </>
            ) : countdown?.unit === "soon" ? (
              <>
                The next drop is going out very soon! 
                Make sure your latest work is posted.
              </>
            ) : (
              <>
                Share your work-in-progress to have it included in the next drop.
              </>
            )}
          </p>
        </div>

        <div className="space-y-2 mt-4">
          <Button 
            variant="secondary" 
            className="w-full justify-center"
            onClick={handleRemindTeam}
          >
            <SlackIcon className="h-4 w-4 mr-2" />
            Remind your team
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-center"
            onClick={handleEditSchedule}
          >
            Edit schedule
          </Button>
        </div>
      </div>

      <EditSeriesDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        schedule={schedule}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}

