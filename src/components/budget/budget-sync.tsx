import { useEffect, type ReactNode } from "react";
import { hydrateSharedBudget, refreshSharedBudget, useBudgetStore } from "@/lib/budget-store";
import { useLiveSync } from "@/lib/live-sync";

export function BudgetSync({ children }: { children: ReactNode }) {
  const ready = useBudgetStore((s) => s.ready);

  useEffect(() => {
    void hydrateSharedBudget();
  }, []);

  useLiveSync(() => refreshSharedBudget(), 4000);

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-4">
        <p className="text-sm text-muted">Hämtar gemensamma böckerna…</p>
      </main>
    );
  }

  return children;
}