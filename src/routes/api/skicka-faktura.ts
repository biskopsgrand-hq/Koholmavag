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
          const body = (await request.json()) as { invoice?: Invoice; smtpPass?: string } & Partial<Invoice>;
          const invoice = (body.invoice ?? body) as Invoice;
          const smtpPass = String(body.smtpPass ?? request.headers.get("x-smtp-pass") ?? "");
          const tokenOk = await sendAllowed(sendToken);
          if (!tokenOk && !smtpPass) {
            await requireUserId(bearer);
          }
          await sendInvoiceWithPdf(null, invoice, smtpPass);
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
