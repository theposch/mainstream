"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, Plus, Hash } from "lucide-react";
import { Stream } from "@/lib/mock-data/streams";
import { cn } from "@/lib/utils";

interface StreamMentionDropdownProps {
  query: string;
  streams: Stream[];
  position: { top: number; left: number };
  onSelect: (streamName: string, isNew: boolean) => void;
  onClose: () => void;
  selectedStreamIds: string[];
}

export function StreamMentionDropdown({
  query,
  streams,
  position,
  onSelect,
  onClose,
  selectedStreamIds,
}: StreamMentionDropdownProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Filter streams by query
  const filteredStreams = React.useMemo(() => {
    if (!query) return streams.slice(0, 5);
    
    const lowerQuery = query.toLowerCase();
    return streams
      .filter(s => 
        s.status === 'active' && 
        s.name.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 5);
  }, [streams, query]);

  // Check if query matches any existing stream exactly (slug-based)
  const exactMatch = filteredStreams.some(s => 
    s.name === query.toLowerCase()
  );

  // Show create option if query is valid and doesn't match exactly
  const showCreateOption = query.length >= 2 && !exactMatch;

  const allOptions = React.useMemo(() => [
    ...filteredStreams,
    ...(showCreateOption ? [{ id: '__create__', name: query, isNew: true }] : [])
  ], [filteredStreams, showCreateOption, query]);

  // Use refs for values that change frequently to avoid recreating event listeners
  const allOptionsRef = React.useRef(allOptions);
  const selectedIndexRef = React.useRef(selectedIndex);
  
  React.useEffect(() => {
    allOptionsRef.current = allOptions;
    selectedIndexRef.current = selectedIndex;
  }, [allOptions, selectedIndex]);

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, allOptionsRef.current.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const option = allOptionsRef.current[selectedIndexRef.current];
        if (option) {
          const isNew = 'isNew' in option;
          onSelect(option.name, isNew); // Stream names are already slugs
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSelect, onClose]);

  // Click outside to close
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Scroll selected item into view
  React.useEffect(() => {
    if (dropdownRef.current) {
      // Navigate to the scrollable container (first child)
      const scrollContainer = dropdownRef.current.querySelector('.max-h-\\[240px\\]') as HTMLElement;
      if (scrollContainer) {
        const selectedElement = scrollContainer.children[selectedIndex] as HTMLElement;
        selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (allOptions.length === 0) {
    return null;
  }

  const dropdownContent = (
    <div
      ref={dropdownRef}
      className="fixed z-50 min-w-[280px] max-w-[320px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden"
      style={{
        top: `${position.top + 4}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="max-h-[240px] overflow-y-auto py-1">
        {allOptions.map((option, index) => {
          const isNew = 'isNew' in option;
          const streamName = option.name; // Stream names are already slugs
          const isSelected = !isNew && selectedStreamIds.includes(option.id);

          return (
            <button
              key={isNew ? '__create__' : option.id}
              onClick={() => onSelect(streamName, isNew)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                selectedIndex === index && "bg-zinc-800",
                "hover:bg-zinc-800"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-md shrink-0",
                isNew ? "bg-blue-500/20" : "bg-zinc-800"
              )}>
                {isNew ? (
                  <Plus className="h-4 w-4 text-blue-400" />
                ) : (
                  <Hash className="h-4 w-4 text-zinc-400" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-medium truncate",
                    isNew ? "text-blue-400" : "text-white"
                  )}>
                    #{streamName}
                  </span>
                  {isSelected && (
                    <Check className="h-3 w-3 text-green-500 shrink-0" />
                  )}
                </div>
                {isNew && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Create new stream
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="px-3 py-2 border-t border-zinc-800 bg-zinc-900/50">
        <p className="text-xs text-zinc-500">
          ↑↓ Navigate • ↵ Select • Esc Close
        </p>
      </div>
    </div>
  );

  // Render as Portal at document.body to escape dialog transforms
  if (typeof document === 'undefined') return null;
  return createPortal(dropdownContent, document.body);
}

