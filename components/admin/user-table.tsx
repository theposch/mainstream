"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  Crown,
  Trash2,
  Loader2,
  UserX,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import type { User } from "@/lib/auth/get-user";
import type { PlatformRole } from "@/lib/types/database";
import { UserDetailsSheet } from "./user-details-sheet";

interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  platform_role: PlatformRole;
  created_at: string;
}

interface UserTableProps {
  currentUser: User;
}

const roleConfig: Record<PlatformRole, { label: string; icon: React.ElementType; color: string }> = {
  owner: { label: "Owner", icon: Crown, color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  admin: { label: "Admin", icon: ShieldCheck, color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  user: { label: "User", icon: Shield, color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
};

export function UserTable({ currentUser }: UserTableProps) {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [detailsSheetOpen, setDetailsSheetOpen] = React.useState(false);

  const isOwner = currentUser.platformRole === "owner";

  // Fetch users
  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search) {
        params.set("search", search);
      }

      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchUsers();
    }, 300);
  };

  // Change user role
  const handleRoleChange = async (user: AdminUser, newRole: PlatformRole) => {
    if (!isOwner) return;
    if (user.platform_role === newRole) return;

    setActionLoading(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform_role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update role");
      }

      // Refresh users to get updated data
      await fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      alert(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setActionLoading(null);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setActionLoading(userToDelete.id);
    try {
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete user");
      }

      // Refresh users
      await fetchUsers();
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      alert(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 bg-background border-border"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                User
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Role
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Joined
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <UserX className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No users found</p>
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const role = roleConfig[user.platform_role] || roleConfig.user;
                const RoleIcon = role.icon;
                const isCurrentUser = user.id === currentUser.id;
                const canChangeRole = isOwner && !isCurrentUser;
                const canDelete =
                  !isCurrentUser &&
                  user.platform_role !== "owner" &&
                  (isOwner || user.platform_role === "user");

                return (
                  <tr
                    key={user.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => {
                      setSelectedUserId(user.id);
                      setDetailsSheetOpen(true);
                    }}
                  >
                    {/* User */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {user.display_name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground flex items-center gap-1">
                            {user.display_name}
                            {isCurrentUser && (
                              <span className="text-xs text-muted-foreground">(you)</span>
                            )}
                            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3 px-4">
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      {canChangeRole ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${role.color} hover:opacity-80 transition-opacity`}
                              disabled={actionLoading === user.id}
                            >
                              {actionLoading === user.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RoleIcon className="h-3 w-3" />
                              )}
                              {role.label}
                              <ChevronDown className="h-3 w-3 opacity-50" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-40">
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(user, "user")}
                              disabled={user.platform_role === "user"}
                            >
                              <Shield className="h-4 w-4 mr-2 text-zinc-400" />
                              User
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(user, "admin")}
                              disabled={user.platform_role === "admin"}
                            >
                              <ShieldCheck className="h-4 w-4 mr-2 text-blue-500" />
                              Admin
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(user, "owner")}
                              disabled={user.platform_role === "owner"}
                              className="text-amber-500"
                            >
                              <Crown className="h-4 w-4 mr-2" />
                              Transfer Ownership
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Badge
                          variant="outline"
                          className={`inline-flex items-center gap-1.5 ${role.color}`}
                        >
                          <RoleIcon className="h-3 w-3" />
                          {role.label}
                        </Badge>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="py-3 px-4">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(user.created_at)}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {canDelete && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              disabled={actionLoading === user.id}
                            >
                              {actionLoading === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setUserToDelete(user);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {userToDelete?.display_name}
              </span>
              ? This action cannot be undone and will permanently delete their account
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading === userToDelete?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Details Sheet */}
      <UserDetailsSheet
        userId={selectedUserId}
        open={detailsSheetOpen}
        onOpenChange={setDetailsSheetOpen}
      />
    </div>
  );
}

