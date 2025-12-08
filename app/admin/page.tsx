"use client";

import * as React from "react";
import { useUser } from "@/lib/auth/use-user";
import { UserTable } from "@/components/admin/user-table";
import { Loader2, Shield, Users } from "lucide-react";

export default function AdminPage() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Double-check on client side (layout already protects server-side)
  if (!user || !['admin', 'owner'].includes(user.platformRole || '')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">Access Denied</p>
          <p className="text-sm text-muted-foreground mt-2">
            You don&apos;t have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Page Header */}
      <div className="pt-10 pb-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage users and platform settings
            </p>
          </div>
        </div>
      </div>

      {/* Admin Tabs - just Users for now */}
      <div className="border-b border-border mb-6">
        <nav className="flex gap-1">
          <button
            className="px-4 py-3 text-sm font-medium text-foreground border-b-2 border-primary flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Users
          </button>
        </nav>
      </div>

      {/* User Management Table */}
      <UserTable currentUser={user} />
    </div>
  );
}

