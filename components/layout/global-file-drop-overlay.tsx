"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { UploadDialog } from "./upload-dialog";

/**
 * Mounts an invisible overlay on the document that intercepts file drags anywhere
 * on the page. When a file is dragged over the window, a full-screen drop target
 * appears. On drop, the upload dialog opens with the file pre-loaded.
 *
 * Uses a drag counter ref to handle nested dragenter/dragleave events correctly
 * (browsers fire dragleave for every child element the cursor moves over).
 */
export function GlobalFileDropOverlay() {
  const [isDragging, setIsDragging] = React.useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File | undefined>(undefined);
  const dragCounterRef = React.useRef(0);

  React.useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      // Only react to actual file drags
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      dragCounterRef.current++;
      if (dragCounterRef.current === 1) setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) setIsDragging(false);
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file) {
        setPendingFile(file);
        setUploadDialogOpen(true);
      }
    };

    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  return (
    <>
      {/* Full-screen drop target overlay */}
      <div
        aria-hidden
        className={`fixed inset-0 z-[200] pointer-events-none transition-all duration-200 ${
          isDragging ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        <div className="absolute inset-4 border-2 border-dashed border-primary/50 rounded-2xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-primary">
            <div className="p-4 bg-primary/10 rounded-full">
              <Upload className="h-8 w-8" />
            </div>
            <p className="text-lg font-semibold">Drop to upload</p>
            <p className="text-sm text-muted-foreground">Release to add to your feed</p>
          </div>
        </div>
      </div>

      {/* Upload dialog opened by a global drop */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) setPendingFile(undefined);
        }}
        initialFile={pendingFile}
      />
    </>
  );
}
