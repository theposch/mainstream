"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface RichTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onHashtagTrigger?: (
    query: string, 
    position: { top: number; left: number },
    replaceHashtag: (newText: string) => void
  ) => void;
  onHashtagComplete?: () => void;
  disabled?: boolean;
}

export const RichTextArea = React.forwardRef<HTMLDivElement, RichTextAreaProps>(
  ({ value, onChange, placeholder, className, onHashtagTrigger, onHashtagComplete, disabled }, ref) => {
    const editorRef = React.useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = React.useState(false);
    const isComposingRef = React.useRef(false);
    
    // Track current hashtag being edited for replacement
    const currentHashtagRef = React.useRef<{
      textNode: Text;
      startIndex: number;
      endIndex: number;
    } | null>(null);

    // Track cursor position before updates
    const cursorPositionRef = React.useRef<number>(0);

    // Cooldown mechanism to prevent immediate re-trigger after hashtag replacement
    const justReplacedRef = React.useRef(false);
    const cooldownTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    // Merge refs
    React.useImperativeHandle(ref, () => editorRef.current as HTMLDivElement);

    // Cleanup cooldown timer on unmount
    React.useEffect(() => {
      return () => {
        if (cooldownTimerRef.current) {
          clearTimeout(cooldownTimerRef.current);
        }
      };
    }, []);

    // Save cursor position before external value changes
    React.useLayoutEffect(() => {
      if (!editorRef.current) return;
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Calculate absolute cursor position in text
        let absolutePosition = 0;
        const walker = document.createTreeWalker(
          editorRef.current,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        let node;
        while ((node = walker.nextNode())) {
          if (node === range.startContainer) {
            absolutePosition += range.startOffset;
            break;
          }
          absolutePosition += node.textContent?.length || 0;
        }
        
        cursorPositionRef.current = absolutePosition;
      }
    });

    // Sync external value with contenteditable
    React.useEffect(() => {
      if (editorRef.current && editorRef.current.textContent !== value) {
        editorRef.current.textContent = value;

        // Restore cursor position
        const selection = window.getSelection();
        if (selection) {
          try {
            const targetPosition = cursorPositionRef.current;
            const walker = document.createTreeWalker(
              editorRef.current,
              NodeFilter.SHOW_TEXT,
              null
            );
            
            let offset = 0;
            let node;
            while ((node = walker.nextNode())) {
              const nodeLength = node.textContent?.length || 0;
              if (offset + nodeLength >= targetPosition) {
                const newRange = document.createRange();
                newRange.setStart(node, Math.min(targetPosition - offset, nodeLength));
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
                break;
              }
              offset += nodeLength;
            }
          } catch {
            // Cursor restoration failed, ignore
          }
        }
      }
    }, [value]);

    // Replace hashtag text with autocomplete selection
    const replaceHashtag = React.useCallback((newText: string) => {
      const hashtagInfo = currentHashtagRef.current;
      if (!hashtagInfo || !editorRef.current) return;

      const { textNode, startIndex, endIndex } = hashtagInfo;
      
      try {
        // Get full editor text
        const fullText = editorRef.current.textContent || "";
        
        // Find the hashtag in the full text
        // We need to calculate the actual position in the full text
        let nodeOffset = 0;
        let found = false;
        
        // Walk through text nodes to find our target node's offset
        const walker = document.createTreeWalker(
          editorRef.current,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        let currentNode;
        while ((currentNode = walker.nextNode())) {
          if (currentNode === textNode) {
            found = true;
            break;
          }
          nodeOffset += currentNode.textContent?.length || 0;
        }
        
        if (!found) {
          // Fallback: use simple replacement
          const currentText = textNode.textContent || "";
          const newContent = 
            currentText.slice(0, startIndex) + 
            newText + 
            currentText.slice(endIndex);
          textNode.textContent = newContent;
        } else {
          // Calculate absolute positions
          const absoluteStart = nodeOffset + startIndex;
          const absoluteEnd = nodeOffset + endIndex;
          
          // Replace in full text
          const newFullText = 
            fullText.slice(0, absoluteStart) + 
            newText + 
            fullText.slice(absoluteEnd);
          
          // Update editor
          editorRef.current.textContent = newFullText;
          
          // Position cursor after the replaced text
          const selection = window.getSelection();
          if (selection) {
            const newRange = document.createRange();
            const newCursorPos = absoluteStart + newText.length;
            
            // Find the text node at cursor position
            const walker2 = document.createTreeWalker(
              editorRef.current,
              NodeFilter.SHOW_TEXT,
              null
            );
            
            let offset = 0;
            let targetNode = walker2.nextNode();
            
            while (targetNode) {
              const nodeLength = targetNode.textContent?.length || 0;
              if (offset + nodeLength >= newCursorPos) {
                newRange.setStart(targetNode, newCursorPos - offset);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
                break;
              }
              offset += nodeLength;
              targetNode = walker2.nextNode();
            }
          }
        }
        
        // Update parent value
        onChange(editorRef.current.textContent || "");
        
        // Set cooldown to prevent immediate re-trigger
        justReplacedRef.current = true;
        if (cooldownTimerRef.current) {
          clearTimeout(cooldownTimerRef.current);
        }
        cooldownTimerRef.current = setTimeout(() => {
          justReplacedRef.current = false;
        }, 200); // 200ms cooldown
        
      } catch (error) {
        console.error('Failed to replace hashtag:', error);
      } finally {
        // Clear tracking
        currentHashtagRef.current = null;
      }
    }, [onChange]);

    // Detect hashtag trigger
    const checkForHashtag = React.useCallback(() => {
      if (!onHashtagTrigger || !editorRef.current) return;
      
      // Skip check during cooldown period
      if (justReplacedRef.current) {
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;
      
      if (textNode.nodeType !== Node.TEXT_NODE) return;

      const textContent = textNode.textContent || "";
      const cursorPosition = range.startOffset;

      // Find the last # before cursor
      const textBeforeCursor = textContent.slice(0, cursorPosition);
      const lastHashIndex = textBeforeCursor.lastIndexOf("#");

      if (lastHashIndex === -1) {
        currentHashtagRef.current = null;
        onHashtagComplete?.();
        return;
      }

      // Check if there's a space between # and cursor (means hashtag is complete)
      const textAfterHash = textBeforeCursor.slice(lastHashIndex);
      if (/\s/.test(textAfterHash)) {
        currentHashtagRef.current = null;
        onHashtagComplete?.();
        return;
      }

      // Extract query after #
      const query = textAfterHash.slice(1); // Remove #

      // Store hashtag info for replacement
      currentHashtagRef.current = {
        textNode: textNode as Text,
        startIndex: lastHashIndex,
        endIndex: cursorPosition,
      };

      // Create a new range at the # character to get accurate position
      const hashRange = document.createRange();
      hashRange.setStart(textNode, lastHashIndex);
      hashRange.setEnd(textNode, cursorPosition);
      
      // Get cursor screen position (viewport coordinates for fixed positioning)
      const rect = hashRange.getBoundingClientRect();
      
      onHashtagTrigger(query, {
        top: rect.bottom + 2, // Small offset below the line
        left: rect.left,
      }, replaceHashtag);
    }, [onHashtagTrigger, onHashtagComplete, replaceHashtag]);

    const handleInput = React.useCallback((e: React.FormEvent<HTMLDivElement>) => {
      if (isComposingRef.current) return;

      const newValue = e.currentTarget.textContent || "";
      onChange(newValue);
      checkForHashtag();
    }, [onChange, checkForHashtag]);

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        // Close hashtag dropdown if open
        onHashtagComplete?.();
      }
      
      if (e.key === "Enter" && !e.shiftKey) {
        // Allow Enter for new lines
      }
      
      // Check for hashtag on every keystroke
      setTimeout(checkForHashtag, 0);
    }, [checkForHashtag, onHashtagComplete]);

    const handleCompositionStart = React.useCallback(() => {
      isComposingRef.current = true;
    }, []);

    const handleCompositionEnd = React.useCallback((e: React.CompositionEvent<HTMLDivElement>) => {
      isComposingRef.current = false;
      handleInput(e);
    }, [handleInput]);

    const handleFocus = React.useCallback(() => {
      setIsFocused(true);
    }, []);

    const handleBlur = React.useCallback(() => {
      setIsFocused(false);
      onHashtagComplete?.();
    }, [onHashtagComplete]);

    const showPlaceholder = !value && !isFocused;

    return (
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "min-h-[40px] w-full outline-none whitespace-pre-wrap break-words",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          role="textbox"
          aria-multiline="true"
          aria-placeholder={placeholder}
          suppressContentEditableWarning
        />
        {showPlaceholder && (
          <div
            className="absolute inset-0 pointer-events-none text-zinc-600"
            aria-hidden="true"
          >
            {placeholder}
          </div>
        )}
      </div>
    );
  }
);

RichTextArea.displayName = "RichTextArea";

