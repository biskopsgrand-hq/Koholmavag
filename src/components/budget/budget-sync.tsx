import { useEffect, type ReactNode } from "react";
import { hydrateSharedBudget, refreshSharedBudget, useBudgetStore } from "@/lib/budget-store";

export function BudgetSync({ children }: { children: ReactNode }) {
  const ready = useBudgetStore((s) => s.ready);

  useEffect(() => {
    void hydrateSharedBudget();
  }, []);

  useEffect(() => {
    function onFocus() {
      if (document.visibilityState === "hidden") return;
      void refreshSharedBudget();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void refreshSharedBudget();
    }, 8000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.clearInterval(timer);
    };
  }, []);

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-4">
        <p className="text-sm text-muted">Hämtar gemensamma böckerna…</p>
      </main>
    );
  }

  return children;
}