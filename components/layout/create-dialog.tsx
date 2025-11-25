"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, FolderPlus, Upload, Link } from "lucide-react";
import { CreateStreamDialog } from "./create-stream-dialog";
import { UploadDialog } from "./upload-dialog";

export function CreateDialog({ children }: { children: React.ReactNode }) {
  const [mainDialogOpen, setMainDialogOpen] = React.useState(false);
  const [streamDialogOpen, setStreamDialogOpen] = React.useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);

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
                 <span className="font-semibold">Upload Files</span>
                 <span className="text-xs text-muted-foreground font-normal">Drag & drop images or videos</span>
              </div>
           </Button>
           
           {/* TODO: Implement Save from URL functionality in future */}
           <Button 
              variant="outline" 
              className="h-14 justify-start px-4 border-border text-foreground bg-background opacity-50 cursor-not-allowed"
              disabled
              title="Coming soon"
           >
              <Link className="mr-4 h-6 w-6" />
              <div className="flex flex-col items-start">
                 <span className="font-semibold">Save from URL</span>
                 <span className="text-xs text-muted-foreground font-normal">Coming soon</span>
              </div>
           </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Separate dialogs for Create Stream and Upload */}
    <CreateStreamDialog open={streamDialogOpen} onOpenChange={setStreamDialogOpen} />
    <UploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />
    </>
  );
}
