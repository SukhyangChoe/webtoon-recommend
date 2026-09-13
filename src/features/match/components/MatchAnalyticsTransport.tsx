"use client";

import { useEffect } from "react";
import { flushQueuedMatchEvents } from "../analytics/client";

export function MatchAnalyticsTransport() {
  useEffect(() => {
    void flushQueuedMatchEvents();
    const interval = window.setInterval(() => void flushQueuedMatchEvents(), 15_000);
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") void flushQueuedMatchEvents();
    };
    const flushOnPageHide = () => void flushQueuedMatchEvents();
    document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("pagehide", flushOnPageHide);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      window.removeEventListener("pagehide", flushOnPageHide);
    };
  }, []);

  return null;
}
