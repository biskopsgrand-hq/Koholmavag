import { useEffect, type ReactNode } from "react";
import { hydrateSharedBudget, refreshSharedBudget, useBudgetStore } from "@/lib/budget-store";
import { useLiveSync } from "@/lib/live-sync";

export function BudgetSync({ children }: { children: ReactNode }) {
  const ready = useBudgetStore((s) => s.ready);

  useEffect(() => {
    void hydrateSharedBudget();
  }, []);

  // Poll every 3 s (down from 4 s) and refresh immediately on focus/online/tab-visible.
  // The storage-event cross-tab signal in useLiveSync ensures the other tab
  // refreshes within ~150 ms of a save completing.
  useLiveSync(refreshSharedBudget, 3000);

  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-4">
        <p className="text-sm text-muted">Hämtar gemensamma böckerna…</p>
      </main>
    );
  }

  return children;
}