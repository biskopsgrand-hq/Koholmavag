import { useEffect, type ReactNode } from "react";
import { AuthPending } from "@/components/budget/auth-gate";
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
    }, 20000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.clearInterval(timer);
    };
  }, []);

  if (!ready) return <AuthPending />;
  return children;
}
