import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthGate } from "@/components/budget/auth-gate";
import { BudgetApp } from "@/components/budget/budget-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <AuthGate>
      <main className="min-h-dvh overflow-x-clip bg-bg text-ink">
        <BudgetApp />
        <Toaster
          position="top-center"
          offset={16}
          toastOptions={{
            className:
              "!bg-surface !text-ink !border-0 !shadow-[var(--shadow-raised)] !font-sans",
          }}
        />
      </main>
    </AuthGate>
  );
}
