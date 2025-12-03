import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Type, Smile, AtSign, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types/database";
import { useTypingIndicator } from "@/lib/hooks/use-typing-indicator";
import { TypingIndicator } from "./typing-indicator";

interface CommentInputProps {
  currentUser: any; // User from database with snake_case fields
  onSubmit: (content: string) => Promise<void>;
  isSubmitting?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  initialValue?: string;
  onCancel?: () => void;
  assetId?: string; // For typing indicator
}

export const CommentInput = React.memo(function CommentInput({
  currentUser,
  onSubmit,
  isSubmitting = false,
  placeholder = "Add a comment...",
  autoFocus = false,
  initialValue = "",
  onCancel,
  assetId
}: CommentInputProps) {
  const [content, setContent] = React.useState(initialValue);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const MAX_CHARS = 2000;
  
  // Typing indicator
  const { typingUsers, setTyping } = useTypingIndicator(assetId || "");

  // Mention State
  const [showMentions, setShowMentions] = React.useState(false);
  const [mentionQuery, setMentionQuery] = React.useState("");
  const [mentionIndex, setMentionIndex] = React.useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = React.useState(0);

  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

  // Filter users for mentions - TODO: Replace with API call
  const filteredUsers = React.useMemo((): User[] => {
    // For now, return empty array until we implement user search API
    return [];
  }, [mentionQuery]);

  // Auto-expand textarea
  useIsomorphicLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [content]);

  // Initial focus
  React.useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [autoFocus]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Notify typing indicator
    if (assetId && newContent.length > 0) {
      setTyping(true);
    }

    // Check for mention trigger
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newContent.slice(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      // Check if @ is at start or preceded by space/newline
      const charBeforeAt = lastAtSymbol > 0 ? textBeforeCursor[lastAtSymbol - 1] : ' ';
      if (/\s/.test(charBeforeAt)) {
        const query = textBeforeCursor.slice(lastAtSymbol + 1);
        // Check if query contains space (end of mention attempt)
        if (!/\s/.test(query)) {
          setMentionIndex(lastAtSymbol);
          setMentionQuery(query);
          setShowMentions(true);
          setSelectedMentionIndex(0);
          return;
        }
      }
    }
    
    setShowMentions(false);
  };

  const insertMention = (user: User) => {
    if (mentionIndex === -1) return;

    const beforeMention = content.slice(0, mentionIndex);
    const afterMention = content.slice(textareaRef.current?.selectionStart || content.length);
    const newContent = `${beforeMention}@${user.username} ${afterMention}`;
    
    setContent(newContent);
    setShowMentions(false);
    
    // Restore focus and position cursor after mention
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Need setTimeout to run after React render cycle updates value
      setTimeout(() => {
        if (textareaRef.current) {
            const newCursorPos = mentionIndex + user.username.length + 2; // @ + username + space
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;
    
    // Clear typing indicator
    if (assetId) setTyping(false);
    
    await onSubmit(content.trim());
    if (!onCancel) {
        setContent("");
        setShowMentions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex(prev => (prev + 1) % filteredUsers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredUsers[selectedMentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
    }
    
    if (e.key === "Escape" && onCancel) {
        onCancel();
    }
  };

  return (
    <div className="flex gap-3 relative">
        {/* Mention Popover */}
        {showMentions && filteredUsers.length > 0 && (
          <div className="absolute bottom-full left-10 mb-2 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-100">
            <div className="py-1">
              <div className="px-2 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider bg-zinc-900/50 border-b border-zinc-800/50">
                Mention
              </div>
              {filteredUsers.map((user, index) => (
                <button
                  key={user.id}
                  onClick={() => insertMention(user)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left",
                    index === selectedMentionIndex 
                      ? "bg-zinc-800 text-white" 
                      : "text-zinc-300 hover:bg-zinc-800/50 hover:text-white"
                  )}
                >
                  <Avatar className="h-6 w-6 border border-border">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate font-medium">{user.display_name}</span>
                    <span className="truncate text-xs text-zinc-500">@{user.username}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <Avatar className="h-8 w-8 shrink-0 border border-border">
            <AvatarImage src={currentUser?.avatar_url} alt={currentUser?.display_name} />
            <AvatarFallback>{currentUser?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
            <form onSubmit={handleSubmit} className="relative">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleContentChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={isSubmitting}
                    maxLength={MAX_CHARS}
                    rows={1}
                    className={cn(
                        "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 transition-all resize-none min-h-[40px] max-h-[120px] focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 disabled:opacity-50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    )}
                />
                
                <div className="flex items-center justify-between pt-1">
                    {/* Visual-only formatting toolbar */}
                    {/* TODO: Implement rich text formatting */}
                    <div className="flex items-center gap-0.5">
                        <button 
                            type="button" 
                            disabled 
                            className="p-1.5 text-zinc-600 hover:text-zinc-500 transition-colors cursor-not-allowed"
                            title="Formatting (coming soon)"
                        >
                            <Type className="h-4 w-4" />
                        </button>
                        <button 
                            type="button" 
                            disabled 
                            className="p-1.5 text-zinc-600 hover:text-zinc-500 transition-colors cursor-not-allowed"
                            title="Emoji (coming soon)"
                        >
                            <Smile className="h-4 w-4" />
                        </button>
                        <button 
                            type="button" 
                            disabled 
                            className="p-1.5 text-zinc-600 hover:text-zinc-500 transition-colors cursor-not-allowed"
                            title="Mention (coming soon)"
                        >
                            <AtSign className="h-4 w-4" />
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                         {onCancel && (
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={onCancel}
                                disabled={isSubmitting}
                                className="text-muted-foreground hover:text-foreground h-8"
                            >
                                Cancel
                            </Button>
                        )}
                        
                        <Button 
                            type="submit" 
                            variant="default" 
                            size="icon" 
                            disabled={!content.trim() || isSubmitting}
                            className="h-8 w-8"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </form>
            
            {/* Typing indicator */}
            {assetId && <TypingIndicator users={typingUsers} />}
        </div>
    </div>
  );
});
