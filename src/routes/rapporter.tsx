import { createFileRoute } from "@tanstack/react-router";
import { AnnualReports } from "@/components/budget/annual-reports";
import { APP_NAME } from "@/lib/brand";

export const Route = createFileRoute("/rapporter")({
  component: ReportsPage,
  head: () => ({
    meta: [
      { title: `Årsrapport — ${APP_NAME}` },
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
    </main>
  );
}
