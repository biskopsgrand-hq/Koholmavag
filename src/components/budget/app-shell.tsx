import { Outlet, useRouterState } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthGate } from "@/components/budget/auth-gate";
import { BudgetSync } from "@/components/budget/budget-sync";

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = pathname === "/login";
  if (isPublic) return <Outlet />;
  return (
    <AuthGate>
      <BudgetSync>
        <Outlet />
        <Toaster
          position="top-center"
          offset={16}
          toastOptions={{
            className:
              "!bg-surface !text-ink !border-0 !shadow-[var(--shadow-raised)] !font-sans",
          }}
        />
      </BudgetSync>
    </AuthGate>
  );
}
