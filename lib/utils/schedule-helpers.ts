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

// Validation constants
export const VALIDATION = {
  DATE_RANGE_DAYS_MIN: 1,
  DATE_RANGE_DAYS_MAX: 365,
  CUSTOM_INTERVAL_MIN: 1,
  CUSTOM_INTERVAL_MAX: 365,
  NAME_MAX_LENGTH: 100,
} as const;

/**
 * Validate that a timezone string is a valid IANA timezone
 * Returns true if valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
export function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Get timezone offset in milliseconds
 */
function getTimezoneOffset(timezone: string): number {
  try {
    const now = new Date();
    const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tz = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return utc.getTime() - tz.getTime();
  } catch {
    return 0;
  }
}

/**
 * Calculate the next run time for a schedule
 * 
 * @param frequency - weekly, biweekly, monthly, or custom
 * @param dayOfWeek - 0-6 (Sunday-Saturday) for weekly/biweekly
 * @param dayOfMonth - 1-28 for monthly
 * @param customIntervalDays - number of days for custom interval
 * @param generationTime - HH:MM or HH:MM:SS format
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @param lastRunAt - Optional last run timestamp for biweekly tracking
 * @returns Date of next scheduled run (in UTC)
 */
export function calculateNextRun(
  frequency: ScheduleFrequency,
  dayOfWeek: number | undefined,
  dayOfMonth: number | undefined,
  customIntervalDays: number | undefined,
  generationTime: string,
  timezone: string,
  lastRunAt?: Date
): Date {
  // Get current time in the user's timezone
  const now = new Date();
  const tzOffset = getTimezoneOffset(timezone);
  const nowInTz = new Date(now.getTime() - tzOffset);
  
  // Parse generation time (HH:MM:SS or HH:MM)
  const [hours, minutes] = generationTime.split(':').map(Number);
  
  const nextRun = new Date(nowInTz);
  
  switch (frequency) {
    case 'weekly': {
      const currentDay = nowInTz.getDay();
      const targetDay = dayOfWeek ?? 1; // Default to Monday
      let daysUntil = targetDay - currentDay;
      if (daysUntil < 0) daysUntil += 7;
      if (daysUntil === 0) {
        // Same day - check if time has passed
        const targetTime = new Date(nowInTz);
        targetTime.setHours(hours, minutes, 0, 0);
        if (targetTime <= nowInTz) {
          daysUntil = 7; // Move to next week
        }
      }
      nextRun.setDate(nowInTz.getDate() + daysUntil);
      nextRun.setHours(hours, minutes, 0, 0);
      break;
    }
    case 'biweekly': {
      // For biweekly, we need to ensure 2-week spacing between runs
      const currentDay = nowInTz.getDay();
      const targetDay = dayOfWeek ?? 1;
      
      // Calculate the week number since epoch
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const weeksSinceEpoch = Math.floor(nowInTz.getTime() / msPerWeek);
      
      let daysUntil = targetDay - currentDay;
      if (daysUntil < 0) daysUntil += 7;
      
      // Check if we're on the target day and time has passed
      if (daysUntil === 0) {
        const targetTime = new Date(nowInTz);
        targetTime.setHours(hours, minutes, 0, 0);
        if (targetTime <= nowInTz) {
          daysUntil = 7; // Move to next week (we'll check spacing below)
        }
      }
      
      // Now check if we need to skip a week based on lastRunAt or parity
      if (lastRunAt) {
        // Use lastRunAt to determine if we should skip a week
        const lastRunWeek = Math.floor(lastRunAt.getTime() / msPerWeek);
        const weeksSinceLastRun = weeksSinceEpoch - lastRunWeek;
        // If last run was less than 2 weeks ago, ensure we skip to maintain 2-week spacing
        if (weeksSinceLastRun < 2 && daysUntil < 14) {
          daysUntil += 7;
        }
      } else {
        // No lastRunAt - use epoch week parity as fallback for initial scheduling
        const isEvenWeek = weeksSinceEpoch % 2 === 0;
        if (!isEvenWeek && daysUntil < 14) {
          daysUntil += 7;
        }
      }
      
      nextRun.setDate(nowInTz.getDate() + daysUntil);
      nextRun.setHours(hours, minutes, 0, 0);
      break;
    }
    case 'monthly': {
      const targetDay = Math.min(Math.max(dayOfMonth ?? 1, 1), 28); // Clamp to 1-28
      nextRun.setDate(targetDay);
      nextRun.setHours(hours, minutes, 0, 0);
      // If target day has passed this month, move to next month
      if (nextRun <= nowInTz) {
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(targetDay); // Reset date in case month change affected it
      }
      break;
    }
    case 'custom': {
      const days = Math.min(
        Math.max(customIntervalDays ?? 7, VALIDATION.CUSTOM_INTERVAL_MIN),
        VALIDATION.CUSTOM_INTERVAL_MAX
      );
      nextRun.setDate(nowInTz.getDate() + days);
      nextRun.setHours(hours, minutes, 0, 0);
      break;
    }
  }
  
  // Convert back to UTC
  return new Date(nextRun.getTime() + tzOffset);
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

