import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AnnualReports } from "@/components/budget/annual-reports";

export const Route = createFileRoute("/rapporter")({
  component: ReportsPage,
  head: () => ({
    meta: [
      { title: "Årsrapport — Saldo" },
      {
        name: "description",
        content: "Resultaträkning och balansräkning för räkenskapsåret 1 juli–30 juni.",
      },
    ],
  }),
});

function ReportsPage() {
  return (
    <main className="min-h-dvh overflow-x-clip bg-bg text-ink">
      <AnnualReports />
      <Toaster
        position="top-center"
        offset={16}
        toastOptions={{
          className:
            "!bg-surface !text-ink !border-0 !shadow-[var(--shadow-raised)] !font-sans",
        }}
      />
    </main>
  );
}
