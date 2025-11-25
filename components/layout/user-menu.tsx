"use client";

import * as React from "react";
import Link from "next/link";
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
// TODO: Replace with real auth session
import { currentUser } from "@/lib/mock-data/users";
import { User, Settings, LogOut, CreditCard } from "lucide-react";

// TODO: Implement authentication
// import { useSession, signOut } from 'next-auth/react';
// or import { useAuth } from '@/contexts/auth-context';

export function UserMenu() {
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  // TODO: Replace with real session data
  // const { data: session, status } = useSession();
  // const user = session?.user;
  
  // TODO: Show sign in button if not authenticated
  // if (status === 'unauthenticated') {
  //   return <Button onClick={() => signIn()}>Sign In</Button>;
  // }

  return (
    <>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative h-9 w-9 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-border transition-all outline-none">
          <Avatar className="h-full w-full">
            <AvatarImage src={currentUser.avatarUrl} alt={currentUser.username} />
            <AvatarFallback>{currentUser.username.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          {/* TODO: Implement real online status
              - Use WebSocket or presence system
              - Update based on user activity
          */}
          <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-background translate-x-[2px] translate-y-[2px]"></div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-zinc-950 border-zinc-800 text-zinc-400" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-white">{currentUser.displayName}</p>
            <p className="text-xs leading-none text-zinc-500">@{currentUser.username}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem asChild className="focus:bg-zinc-900 focus:text-white cursor-pointer">
          <Link href={`/u/${currentUser.username}`}>
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
        {/* TODO: Navigate to billing/subscription page
            - Show current plan
            - Upgrade/downgrade options
            - Payment history
        */}
        <DropdownMenuItem className="focus:bg-zinc-900 focus:text-white cursor-pointer">
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-800" />
        {/* TODO: Implement real logout
            - Clear authentication token
            - Clear user session
            - Redirect to sign in page
            - await signOut({ redirect: true, callbackUrl: '/signin' });
        */}
        <DropdownMenuItem className="focus:bg-zinc-900 focus:text-white cursor-pointer text-red-500 focus:text-red-400">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}
