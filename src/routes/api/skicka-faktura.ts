import { createFileRoute } from "@tanstack/react-router";
import { UnauthorizedError, requireUserId } from "@/lib/auth/verify.server";
import { sendAllowed, sendInvoiceWithPdf } from "@/lib/mail.server";
import type { Invoice } from "@/lib/invoices";

export const maxDuration = 60;

export const Route = createFileRoute("/api/skicka-faktura")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const sendToken = request.headers.get("x-send-token");
          const header = request.headers.get("authorization");
          const bearer = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : undefined;
          const tokenOk = await sendAllowed(sendToken);
          if (!tokenOk) {
            await requireUserId(bearer);
          }
          const invoice = (await request.json()) as Invoice;
          await sendInvoiceWithPdf(null, invoice);
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
