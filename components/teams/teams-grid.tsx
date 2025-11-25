"use client";

import * as React from "react";
import { TeamCard, TeamCardData } from "./team-card";

interface TeamsGridProps {
  teams: TeamCardData[];
}

export const TeamsGrid = React.memo(function TeamsGrid({ teams }: TeamsGridProps) {
  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg text-muted-foreground">No teams found.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Teams will appear here once they're created.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {teams.map((team) => (
        <TeamCard key={team.id} team={team} />
      ))}
    </div>
  );
});

