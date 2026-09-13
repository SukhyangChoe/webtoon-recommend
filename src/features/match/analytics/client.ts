"use client";

import { ensureAnonymousId } from "../storage/anonymousIdentity.mjs";
import { flushMatchEvents, recordMatchEvent } from "./events.mjs";

let scheduledFlush: number | null = null;

export function flushQueuedMatchEvents() {
  if (typeof window === "undefined") return Promise.resolve({ sent: 0, pending: 0 });
  const identity = ensureAnonymousId({ cookieText: document.cookie, storage: window.localStorage });
  return flushMatchEvents(window.localStorage, identity.anonymousId);
}

export function trackMatchEvent(eventName: string, properties: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return false;
  const recorded = recordMatchEvent(window.localStorage, eventName, properties);
  if (!recorded) return false;

  if (scheduledFlush === null) {
    scheduledFlush = window.setTimeout(() => {
      scheduledFlush = null;
      void flushQueuedMatchEvents();
    }, 250);
  }
  return true;
}
