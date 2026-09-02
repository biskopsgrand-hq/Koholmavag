import { createFileRoute } from "@tanstack/react-router";
import { BudgetApp } from "@/components/budget/budget-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="min-h-dvh overflow-x-clip bg-bg text-ink">
      <BudgetApp />
    </main>
  );
}
