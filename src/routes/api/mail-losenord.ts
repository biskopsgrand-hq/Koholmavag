import { createFileRoute } from "@tanstack/react-router";
import { requireUserId } from "@/lib/auth/verify.server";
import { saveMailPassword, sendAllowed } from "@/lib/mail.server";

export const Route = createFileRoute("/api/mail-losenord")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const sendToken = request.headers.get("x-send-token");
          const header = request.headers.get("authorization");
          const bearer = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : undefined;
          let userId = "mail";
          try {
            userId = await requireUserId(bearer);
          } catch {
            if (!(await sendAllowed(sendToken))) {
              userId = "mail";
            }
          }
          const body = (await request.json()) as { pass?: string };
          const result = await saveMailPassword(userId, String(body.pass ?? ""));
          return Response.json(result);
        } catch (err) {
          const error = err instanceof Error ? err.message : "Kunde inte spara.";
          return Response.json({ error }, { status: 400 });
        }
      },
    },
  },
});
