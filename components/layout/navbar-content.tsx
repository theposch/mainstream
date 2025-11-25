"use client";

import Link from "next/link";
import { Zap, Bookmark, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "./search-bar";
import { UserMenu } from "./user-menu";
import { CreateDialog } from "./create-dialog";
import { NotificationsPopover } from "./notifications-popover";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border supports-[backdrop-filter]:bg-background/50">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left Section */}
          <div className="flex items-center gap-8 shrink-0">
            <Link href="/home" className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">COSMOS®</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link 
                href="/teams" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Teams
              </Link>
              <Link 
                href="/streams" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Streams
              </Link>
            </div>
          </div>

          {/* Center Section - Search */}
          <div className="flex-1 max-w-xl hidden sm:block">
            <SearchBar />
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3 shrink-0">
            <CreateDialog>
                <Button 
                  variant="cosmos"
                  className="h-9 px-5"
                  aria-label="Create new project or upload asset"
                >
                  Create
                </Button>
            </CreateDialog>
            
            <NotificationsPopover />
            
            <button 
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Bookmarks"
              title="Bookmarks"
            >
              <Bookmark className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="pl-2 flex items-center gap-1">
              <UserMenu />
              <ChevronDown 
                className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" 
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

