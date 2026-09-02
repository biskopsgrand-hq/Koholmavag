import { useEffect } from "react";

export function useLiveSync(refresh: () => void | Promise<void>, ms = 4000) {
  useEffect(() => {
    function run() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void refresh();
    }
    run();
    window.addEventListener("focus", run);
    window.addEventListener("pageshow", run);
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", run);
    const timer = window.setInterval(run, ms);
    return () => {
      window.removeEventListener("focus", run);
      window.removeEventListener("pageshow", run);
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", run);
      window.clearInterval(timer);
    };
  }, [refresh, ms]);
}
