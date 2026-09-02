import { createFileRoute } from "@tanstack/react-router";
import { MembersApp } from "@/components/budget/members-app";
import { APP_NAME } from "@/lib/brand";

export const Route = createFileRoute("/medlemmar")({
  component: MembersPage,
  head: () => ({
    meta: [
      { title: `Medlemsregister — ${APP_NAME}` },
      { name: "description", content: "Läs in medlemmar från CSV eller Excel och maila fakturor." },
    ],
  }),
});

function MembersPage() {
  return (
    <main className="min-h-dvh overflow-x-clip bg-bg text-ink">
      <MembersApp />
    </main>
  );
}
