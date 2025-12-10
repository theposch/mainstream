"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FolderPlus, Upload, Link as LinkIcon } from "lucide-react";
import { UploadDialog } from "./upload-dialog";
import { EmbedUrlDialog } from "./embed-url-dialog";

// Dynamic import for StreamDialog - only loaded when opened
const StreamDialog = dynamic(
  () => import("./stream-dialog").then((mod) => mod.StreamDialog),
  { ssr: false }
);

export function CreateDialog({ children }: { children: React.ReactNode }) {
  const [mainDialogOpen, setMainDialogOpen] = React.useState(false);
  const [streamDialogOpen, setStreamDialogOpen] = React.useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [embedDialogOpen, setEmbedDialogOpen] = React.useState(false);

  const handleNewStream = () => {
    setMainDialogOpen(false);
    // Delay opening to prevent dialog overlap
    setTimeout(() => setStreamDialogOpen(true), 100);
  };

  const handleUploadFiles = () => {
    setMainDialogOpen(false);
    // Delay opening to prevent dialog overlap
    setTimeout(() => setUploadDialogOpen(true), 100);
  };

  const handleAddUrl = () => {
    setMainDialogOpen(false);
    // Delay opening to prevent dialog overlap
    setTimeout(() => setEmbedDialogOpen(true), 100);
  };

  return (
    <>
      <Dialog open={mainDialogOpen} onOpenChange={setMainDialogOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-popover border-border sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create New</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
           <Button 
              variant="outline" 
              className="h-14 justify-start px-4 border-border hover:bg-accent hover:text-accent-foreground text-foreground bg-background"
              onClick={handleNewStream}
           >
              <FolderPlus className="mr-4 h-6 w-6" />
              <div className="flex flex-col items-start">
                 <span className="font-semibold">New Stream</span>
                 <span className="text-xs text-muted-foreground font-normal">Create a stream to organize your work</span>
              </div>
           </Button>
           
           <Button 
              variant="outline" 
              className="h-14 justify-start px-4 border-border hover:bg-accent hover:text-accent-foreground text-foreground bg-background"
              onClick={handleUploadFiles}
           >
              <Upload className="mr-4 h-6 w-6" />
              <div className="flex flex-col items-start">
                 <span className="font-semibold">Upload Image</span>
                 <span className="text-xs text-muted-foreground font-normal">Drag & drop images or GIFs</span>
              </div>
           </Button>

           <Button 
              variant="outline" 
              className="h-14 justify-start px-4 border-border hover:bg-accent hover:text-accent-foreground text-foreground bg-background"
              onClick={handleAddUrl}
           >
              <LinkIcon className="mr-4 h-6 w-6" />
              <div className="flex flex-col items-start">
                 <span className="font-semibold">Add via URL</span>
                 <span className="text-xs text-muted-foreground font-normal">Embed Figma files, videos & more</span>
              </div>
           </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Separate dialogs for Create Stream, Upload, and Embed */}
    <StreamDialog open={streamDialogOpen} onOpenChange={setStreamDialogOpen} mode="create" />
    <UploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />
    <EmbedUrlDialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen} />
    </>
  );
}
