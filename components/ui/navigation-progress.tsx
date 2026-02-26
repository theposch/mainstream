"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * NavigationProgress
 *
 * A thin progress bar at the top of the page that appears when the user
 * navigates between routes. Works with Next.js App Router by intercepting
 * link clicks and completing when the URL changes.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const startProgress = React.useCallback(() => {
    // Clear any existing timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    setProgress(0);
    setVisible(true);

    // Simulate progress: fast to 70%, then slow down
    let current = 0;
    timerRef.current = setInterval(() => {
      current += current < 70 ? 8 : 1;
      if (current >= 95) {
        if (timerRef.current) clearInterval(timerRef.current);
        current = 95;
      }
      setProgress(current);
    }, 80);
  }, []);

  const completeProgress = React.useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  }, []);

  // Complete progress bar whenever the URL changes
  React.useEffect(() => {
    completeProgress();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Intercept link clicks via event delegation on document
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as Element).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Only intercept internal links
      const isInternal = href.startsWith("/") || href.startsWith(window.location.origin);
      const isNewTab = target.getAttribute("target") === "_blank";
      const isDownload = target.hasAttribute("download");

      if (!isInternal || isNewTab || isDownload) return;

      // Don't show for same-page hash links
      const url = new URL(href, window.location.origin);
      if (url.pathname === window.location.pathname && url.hash) return;

      startProgress();
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [startProgress]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-0.5 pointer-events-none">
      <div
        className="h-full bg-primary transition-all duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: visible ? 1 : 0 }}
      />
    </div>
  );
}
