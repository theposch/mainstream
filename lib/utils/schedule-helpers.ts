/**
 * Shared utilities for drop schedules
 */

import type { ScheduleFrequency } from "@/lib/types/database";

// Days of the week for schedule configuration
export const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
] as const;

// Days of the week as simple array (for display)
export const DAYS_OF_WEEK_NAMES = [
  "Sunday",
  "Monday", 
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

// Days of month for monthly schedules (capped at 28 for safety)
export const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

// Frequency options for schedule configuration
export const FREQUENCIES: { value: ScheduleFrequency; label: string; description: string }[] = [
  { value: "weekly", label: "Weekly", description: "Every week" },
  { value: "biweekly", label: "Biweekly", description: "Every two weeks" },
  { value: "monthly", label: "Monthly", description: "Once a month" },
  { value: "custom", label: "Custom", description: "Custom interval" },
];

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
export function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Calculate the next run time for a schedule
 * 
 * @param frequency - weekly, biweekly, monthly, or custom
 * @param dayOfWeek - 0-6 (Sunday-Saturday) for weekly/biweekly
 * @param dayOfMonth - 1-28 for monthly
 * @param customIntervalDays - number of days for custom interval
 * @param generationTime - HH:MM or HH:MM:SS format
 * @param _timezone - timezone string (currently unused, uses server time)
 * @returns Date of next scheduled run
 */
export function calculateNextRun(
  frequency: ScheduleFrequency,
  dayOfWeek: number | undefined,
  dayOfMonth: number | undefined,
  customIntervalDays: number | undefined,
  generationTime: string,
  _timezone: string // TODO: Implement proper timezone handling
): Date {
  const now = new Date();
  
  // Parse generation time (HH:MM:SS or HH:MM)
  const [hours, minutes] = generationTime.split(':').map(Number);
  
  let nextRun = new Date(now);
  
  switch (frequency) {
    case 'weekly': {
      const currentDay = now.getDay();
      const targetDay = dayOfWeek ?? 1; // Default to Monday
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      nextRun.setDate(now.getDate() + daysUntil);
      nextRun.setHours(hours, minutes, 0, 0);
      // If it's the same day but time has passed, move to next week
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7);
      }
      break;
    }
    case 'biweekly': {
      const currentDay = now.getDay();
      const targetDay = dayOfWeek ?? 1;
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      nextRun.setDate(now.getDate() + daysUntil);
      nextRun.setHours(hours, minutes, 0, 0);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 14);
      }
      break;
    }
    case 'monthly': {
      const targetDay = Math.min(dayOfMonth ?? 1, 28); // Cap at 28 for safety
      nextRun.setDate(targetDay);
      nextRun.setHours(hours, minutes, 0, 0);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;
    }
    case 'custom': {
      const days = Math.max(customIntervalDays ?? 7, 1); // Ensure at least 1 day
      nextRun.setDate(now.getDate() + days);
      nextRun.setHours(hours, minutes, 0, 0);
      break;
    }
  }
  
  return nextRun;
}

/**
 * Get a human-readable description of a schedule
 */
export function getScheduleDescription(
  frequency: ScheduleFrequency,
  dayOfWeek: number | undefined,
  dayOfMonth: number | undefined,
  customIntervalDays: number | undefined,
  generationTime: string
): string {
  const time = generationTime.slice(0, 5); // HH:MM
  
  switch (frequency) {
    case "weekly":
      return `Every ${DAYS_OF_WEEK_NAMES[dayOfWeek ?? 1]} at ${time}`;
    case "biweekly":
      return `Every other ${DAYS_OF_WEEK_NAMES[dayOfWeek ?? 1]} at ${time}`;
    case "monthly":
      return `On the ${dayOfMonth ?? 1}${getOrdinalSuffix(dayOfMonth ?? 1)} of each month at ${time}`;
    case "custom":
      return `Every ${customIntervalDays ?? 7} days at ${time}`;
  }
}

