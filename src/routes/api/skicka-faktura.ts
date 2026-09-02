import { createFileRoute } from "@tanstack/react-router";
import { UnauthorizedError, requireUserId } from "@/lib/auth/verify.server";
import { sendInvoiceWithPdf } from "@/lib/mail.server";
import type { Invoice } from "@/lib/invoices";

export const maxDuration = 60;

export const Route = createFileRoute("/api/skicka-faktura")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const header = request.headers.get("authorization");
          const bearer = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : undefined;
          const userId = await requireUserId(bearer);
          const invoice = (await request.json()) as Invoice;
          await sendInvoiceWithPdf(userId, invoice);
          return Response.json({ ok: true });
        } catch (err) {
          const status = err instanceof UnauthorizedError ? 401 : 400;
          const error = err instanceof Error ? err.message : "Kunde inte skicka.";
          return Response.json({ error }, { status });
        }
      },
    },
  },
});
