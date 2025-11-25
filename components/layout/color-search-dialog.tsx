"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { HexColorPicker } from "react-colorful";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  addRecentColor,
  normalizeHex,
  isValidHex,
} from "@/lib/utils/color";

interface ColorSearchPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ColorSearchPopover({ open, onOpenChange }: ColorSearchPopoverProps) {
  const router = useRouter();
  const [selectedColor, setSelectedColor] = React.useState("#ef4444"); // Default red
  const [hexInput, setHexInput] = React.useState("#ef4444");

  const handleColorSelect = (color: string) => {
    const normalized = normalizeHex(color);
    setSelectedColor(normalized);
    setHexInput(normalized);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHexInput(value);
    
    // Update color picker if valid hex
    if (isValidHex(value)) {
      setSelectedColor(normalizeHex(value));
    }
  };

  const handleSearch = () => {
    if (!isValidHex(selectedColor)) {
      return;
    }

    // Add to recent colors
    addRecentColor(selectedColor);
    
    // Navigate to search results
    const colorParam = selectedColor.replace("#", "");
    router.push(`/search?color=${colorParam}`);
    
    // Close popover
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button 
          type="button"
          className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Search by color"
        >
          <Palette className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[280px] p-4"
        align="end"
        side="bottom"
        sideOffset={8}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-full">
            <HexColorPicker
              color={selectedColor}
              onChange={handleColorSelect}
              className="!w-full !h-[180px]"
            />
          </div>

          {/* Hex Code Input */}
          <div className="w-full">
            <Input
              type="text"
              value={hexInput.toUpperCase()}
              onChange={handleHexInputChange}
              placeholder="#000000"
              className="text-center font-mono text-sm"
              maxLength={7}
              aria-label="Hex color code"
            />
          </div>

          {/* Apply Button */}
          <Button
            onClick={handleSearch}
            className="w-full"
            size="default"
            aria-label="Search for this color"
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

