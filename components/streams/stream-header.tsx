"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Lock, Globe, Plus, MoreHorizontal, Share, Hash, Archive, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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

interface StreamHeaderProps {
  stream: any;  // Stream from database
  owner: any;   // User or Team from database
}

export function StreamHeader({ stream, owner }: StreamHeaderProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const isTeam = stream.owner_type === 'team';
  const isUser = stream.owner_type === 'user';
  
  // Get owner name - Team has 'name', User has 'display_name'
  const ownerName = isTeam ? owner.name : owner.display_name;
  const ownerInitial = ownerName?.substring(0, 1).toUpperCase() || 'O';

  // Fetch current user
  React.useEffect(() => {
    const fetchCurrentUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUser(profile);
      }
    };
    fetchCurrentUser();
  }, []);

  const handleDelete = async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/streams/${stream.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete stream');
      }

      // Success - redirect to streams page
      router.push('/streams');
    } catch (error) {
      console.error('Error deleting stream:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete stream');
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/stream/${stream.name}`;
    navigator.clipboard.writeText(url);
    // TODO: Show toast notification
  };

  const canDelete = currentUser && stream.owner_type === 'user' && stream.owner_id === currentUser.id;
  
  return (
    <div className="flex flex-col gap-6 mb-10">
      {/* Breadcrumb / Meta */}
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        {isUser ? (
          <Link 
            href={`/u/${owner.username}`}
            className="flex items-center gap-2 hover:text-foreground transition-colors"
          >
            <Avatar className="h-5 w-5">
              <AvatarImage src={owner.avatar_url} />
              <AvatarFallback>{ownerInitial}</AvatarFallback>
            </Avatar>
            <span>{ownerName}</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={owner.avatar_url} />
              <AvatarFallback>{ownerInitial}</AvatarFallback>
            </Avatar>
            <span>{ownerName}</span>
          </div>
        )}
        <span className="text-zinc-600">/</span>
        <div className="flex items-center gap-1.5">
          <Hash className="h-3 w-3" />
          <span className="text-foreground">Stream</span>
        </div>
        <span className="text-zinc-600">/</span>
        <div className="flex items-center gap-1.5">
           {stream.is_private ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
           <span className="text-foreground">{stream.is_private ? 'Private' : 'Public'}</span>
        </div>
        {stream.status === 'archived' && (
          <>
            <span className="text-zinc-600">/</span>
            <div className="flex items-center gap-1.5 text-orange-500">
              <Archive className="h-3 w-3" />
              <span>Archived</span>
            </div>
          </>
        )}
      </div>

      {/* Main Header Content */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            {stream.name}
          </h1>
          {stream.description && (
            <p className="text-lg text-zinc-400 leading-relaxed">
              {stream.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
            {/* Stream Members/Followers */}
            <div className="flex -space-x-2 mr-4">
                {[1,2,3].map((i) => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground">
                       M{i}
                    </div>
                ))}
                 <div className="h-8 w-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground hover:bg-accent cursor-pointer">
                       +5
                </div>
            </div>
            
            {/* Follow/Unfollow Button */}
            <Button variant="secondary" size="default">
                <Plus className="h-4 w-4 mr-2" />
                Follow
            </Button>
            
            {/* Share Stream */}
            <Button variant="secondary" size="default" onClick={handleShare}>
                <Share className="h-4 w-4 mr-2" />
                Share
            </Button>
            
            {/* Add Asset to Stream */}
            <Button variant="default" size="default">
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
            </Button>
            
            {/* Stream Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[110]">
                <DropdownMenuItem onClick={handleShare}>
                  <Share className="h-4 w-4" />
                  Share Stream
                </DropdownMenuItem>
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Stream
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stream?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the stream. Assets in this stream will remain in your feed but won't be associated with this stream anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

