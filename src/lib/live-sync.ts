import { useEffect, useRef } from "react";

export function useLiveSync(refresh: () => void | Promise<void>, ms = 4000) {
  // Keep a stable ref to the latest refresh so the interval never needs to
  // restart when the callback identity changes between renders.
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });

  useEffect(() => {
    let debounceTimer: number | undefined;

    function run() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      // Debounce rapid-fire events (focus + visibilitychange can fire together).
      if (debounceTimer !== undefined) return;
      debounceTimer = window.setTimeout(() => {
        debounceTimer = undefined;
        void refreshRef.current();
      }, 150);
    }

    window.addEventListener("focus", run);
    window.addEventListener("pageshow", run);
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", run);

    // Cross-tab / cross-window notification: when another tab saves it
    // broadcasts a storage event so this tab refreshes immediately instead
    // of waiting for the next poll interval.
    function onStorage(e: StorageEvent) {
      if (e.key === "koholma-data-changed") run();
    }
    window.addEventListener("storage", onStorage);

    const timer = window.setInterval(() => void refreshRef.current(), ms);

    return () => {
      window.clearTimeout(debounceTimer);
      window.clearInterval(timer);
      window.removeEventListener("focus", run);
      window.removeEventListener("pageshow", run);
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("storage", onStorage);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms]); // only restart when the interval duration changes, not on every render
}
