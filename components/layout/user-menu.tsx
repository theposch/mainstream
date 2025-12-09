"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SettingsDialog } from "@/components/layout/settings-dialog";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/auth/use-user";
import { Button } from "@/components/ui/button";
import { User, Settings, LogOut, Shield } from "lucide-react";

export function UserMenu() {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const router = useRouter();
  const { user, loading } = useUser();

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
      <div className="h-9 w-9 rounded-full bg-zinc-800 animate-pulse" />
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
      <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-zinc-400" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-white">{user.displayName}</p>
            <p className="text-xs leading-none text-zinc-500">@{user.username}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem asChild className="focus:bg-zinc-900 focus:text-white cursor-pointer">
          <Link href={`/u/${user.username}`}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="focus:bg-zinc-900 focus:text-white cursor-pointer"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        {user.platformRole && ['admin', 'owner'].includes(user.platformRole) && (
          <DropdownMenuItem asChild className="focus:bg-zinc-900 focus:text-white cursor-pointer">
            <Link href="/admin">
              <Shield className="mr-2 h-4 w-4" />
              <span>Admin</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem 
          className="focus:bg-zinc-900 focus:text-white cursor-pointer text-red-500 focus:text-red-400"
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
