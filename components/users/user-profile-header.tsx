"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUserFollow } from "@/lib/hooks/use-user-follow";
import { Pencil, UserPlus, UserMinus, MapPin, Briefcase } from "lucide-react";

// Dynamic import for EditProfileDialog - only loaded when opened
const EditProfileDialog = dynamic(
  () => import("@/components/users/edit-profile-dialog").then((mod) => mod.EditProfileDialog),
  { ssr: false }
);

interface UserProfileHeaderProps {
  /** The user whose profile is being displayed */
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    bio?: string;
    job_title?: string;
    location?: string;
    followersCount?: number;
    followingCount?: number;
    assetsCount?: number;
  };
  /** Whether the current user is viewing their own profile */
  isOwnProfile?: boolean;
}

/**
 * User profile header component displaying avatar, name, job title, bio, and location.
 * Shows an "Edit Profile" button when viewing own profile, or "Follow" button for others.
 */
export function UserProfileHeader({
  user,
  isOwnProfile = false,
}: UserProfileHeaderProps) {
  const { isFollowing, followerCount, toggleFollow, loading } = useUserFollow(user.username);
  const [editProfileOpen, setEditProfileOpen] = React.useState(false);

  return (
    <>
    <div className="py-8">
      {/* User Info Section */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
        {/* Left Side: Avatar + Info */}
          <div className="flex gap-5 items-start flex-1 min-w-0">
          {/* Avatar */}
          <Avatar className="h-24 w-24 rounded-xl border border-border/50 bg-background shadow-md flex-shrink-0">
            <AvatarImage src={user.avatar_url} alt={user.display_name} />
            <AvatarFallback className="text-2xl bg-secondary rounded-xl">
              {user.display_name?.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

            {/* Name, Username, Role & Location */}
          <div className="space-y-3 flex-1 min-w-0">
              <div className="space-y-1">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                {user.display_name}
              </h1>
              <p className="text-sm text-muted-foreground">
                @{user.username}
              </p>
              </div>

              {/* Role and Location */}
              {(user.job_title || user.location) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {user.job_title && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" />
                  {user.job_title}
                    </span>
              )}
                  {user.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {user.location}
                    </span>
                  )}
                </div>
              )}

              {/* Bio */}
              {user.bio && (
                <p className="text-sm text-foreground/80 leading-relaxed max-w-xl">
                  {user.bio}
                </p>
            )}
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2">
          {isOwnProfile ? (
            <Button
              variant="outline"
                onClick={() => setEditProfileOpen(true)}
              className="gap-2 h-9 px-4 text-sm font-medium"
            >
                <Pencil className="h-3.5 w-3.5" />
              Edit Profile
            </Button>
          ) : (
            <Button
              variant={isFollowing ? "outline" : "default"}
              onClick={toggleFollow}
              disabled={loading}
              className="gap-2 h-9 px-4 text-sm font-medium"
            >
              {isFollowing ? (
                <>
                  <UserMinus className="h-3.5 w-3.5" />
                  Unfollow
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  Follow
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>

      {/* Edit Profile Dialog */}
      <EditProfileDialog 
        open={editProfileOpen} 
        onOpenChange={setEditProfileOpen} 
      />
    </>
  );
}
