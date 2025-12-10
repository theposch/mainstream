"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SettingsDialog } from "@/components/layout/settings-dialog";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/auth/use-user";
import { Button } from "@/components/ui/button";
import { User, Settings, LogOut, Shield, Sun, Moon, Monitor, Check } from "lucide-react";

export function UserMenu() {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const router = useRouter();
  const { user, loading } = useUser();
  const { theme, setTheme } = useTheme();

  // Prevent hydration mismatch by only rendering theme UI after mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/auth/login");
      router.refresh();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
    );
  }

  // Show sign in button if not authenticated
  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={() => router.push("/auth/login")}>
        Sign In
      </Button>
    );
  }

  return (
    <>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative h-9 w-9 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-border transition-all outline-none cursor-pointer">
          <Avatar className="h-full w-full">
            <AvatarImage src={user.avatarUrl} alt={user.username} />
            <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-popover border-border text-popover-foreground" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-foreground">{user.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">@{user.username}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem asChild className="focus:bg-accent focus:text-accent-foreground cursor-pointer">
          <Link href={`/u/${user.username}`}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="focus:bg-accent focus:text-accent-foreground cursor-pointer"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        
        {/* Theme Selector */}
        {mounted && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="focus:bg-accent focus:text-accent-foreground cursor-pointer">
              {theme === "light" ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : theme === "dark" ? (
                <Moon className="mr-2 h-4 w-4" />
              ) : (
                <Monitor className="mr-2 h-4 w-4" />
              )}
              <span>Theme</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="bg-popover border-border text-popover-foreground">
                <DropdownMenuItem 
                  className="focus:bg-accent focus:text-accent-foreground cursor-pointer"
                  onClick={() => setTheme("light")}
                >
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Light</span>
                  {theme === "light" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="focus:bg-accent focus:text-accent-foreground cursor-pointer"
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Dark</span>
                  {theme === "dark" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="focus:bg-accent focus:text-accent-foreground cursor-pointer"
                  onClick={() => setTheme("system")}
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  <span>System</span>
                  {theme === "system" && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        )}
        
        {user.platformRole && ['admin', 'owner'].includes(user.platformRole) && (
          <DropdownMenuItem asChild className="focus:bg-accent focus:text-accent-foreground cursor-pointer">
            <Link href="/admin">
              <Shield className="mr-2 h-4 w-4" />
              <span>Admin</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem 
          className="focus:bg-accent cursor-pointer text-destructive focus:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}
