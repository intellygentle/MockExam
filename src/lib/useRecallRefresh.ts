"use client";

import { useCallback, useEffect, useState } from "react";

const progressEvent = "scholars-arena-recall-updated";

export function notifyRecallProgress() {
  window.dispatchEvent(new Event(progressEvent));
  try { localStorage.setItem(progressEvent, String(Date.now())); } catch { /* Other tabs can refresh on focus. */ }
}

export function useRecallRefresh(nextDueAt?: string | null, enabled = true) {
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let lastRefresh = 0;
    let pending: number | undefined;
    const update = () => {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(pending);
      pending = window.setTimeout(() => { lastRefresh = Date.now(); refresh(); }, Math.max(0, 500 - (Date.now() - lastRefresh)));
    };
    const onStorage = (event: StorageEvent) => { if (event.key === progressEvent) update(); };
    window.addEventListener("focus", update);
    window.addEventListener(progressEvent, update);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearTimeout(pending);
      window.removeEventListener("focus", update);
      window.removeEventListener(progressEvent, update);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", update);
    };
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled || !nextDueAt) return;
    const delay = new Date(nextDueAt).getTime() - Date.now();
    if (!Number.isFinite(delay) || delay <= 0) return;
    const timer = window.setTimeout(refresh, Math.min(delay + 250, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [nextDueAt, enabled, refresh, version]);

  return [version, refresh] as const;
}
