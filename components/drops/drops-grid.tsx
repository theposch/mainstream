"use client";

import * as React from "react";
import { DropCard } from "./drop-card";
import type { Drop, User } from "@/lib/types/database";

interface DropsGridProps {
  drops: Array<Drop & {
    creator?: User;
    post_count?: number;
    preview_images?: string[];
  }>;
}

export function DropsGrid({ drops }: DropsGridProps) {
  if (drops.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-medium text-zinc-400">No drops yet</p>
        <p className="text-sm text-zinc-500 mt-2">
          Create your first drop to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {drops.map((drop) => (
        <DropCard key={drop.id} drop={drop} />
      ))}
    </div>
  );
}

