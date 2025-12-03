"use client";

import * as React from "react";
import { Share2, Download, Flag, X, Trash2, Pencil } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/lib/utils";

interface MoreMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: () => void;
  onDownload: () => void;
  onReport: () => void;
  onEdit?: () => void;
  canEdit?: boolean;
  onDelete?: () => void;
  canDelete?: boolean;
}

export function MoreMenuSheet({
  open,
  onOpenChange,
  onShare,
  onDownload,
  onReport,
  onEdit,
  canEdit = false,
  onDelete,
  canDelete = false
}: MoreMenuSheetProps) {
  const menuItems = [
    ...(canEdit && onEdit ? [{
      icon: Pencil,
      label: "Edit Post",
      onClick: onEdit,
      variant: "default" as const
    }] : []),
    {
      icon: Share2,
      label: "Share",
      onClick: onShare,
      variant: "default"
    },
    {
      icon: Download,
      label: "Download",
      onClick: onDownload,
      variant: "default"
    },
    ...(canDelete && onDelete ? [{
      icon: Trash2,
      label: "Delete Asset",
      onClick: onDelete,
      variant: "destructive" as const
    }] : [])
  ];

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="More Options">
      <div className="p-4 space-y-2 pb-[max(24px,env(safe-area-inset-bottom))]">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              item.onClick();
              onOpenChange(false);
            }}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-xl transition-colors bg-zinc-900/50 active:bg-zinc-800",
              item.variant === "destructive" ? "text-red-500" : "text-zinc-200"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
        
        <button
          onClick={() => onOpenChange(false)}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-zinc-900 text-zinc-400 mt-4 font-medium active:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
}

