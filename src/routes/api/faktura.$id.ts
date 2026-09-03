import { createFileRoute } from "@tanstack/react-router";
import { findInvoiceById, findInvoicePdf } from "@/lib/invoices.server";
import { buildInvoicePdf, invoiceFileName } from "@/lib/invoice-pdf";

export const Route = createFileRoute("/api/faktura/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const stored = await findInvoicePdf(params.id);
        if (stored?.bytes.length) {
          return new Response(new Uint8Array(stored.bytes), {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `inline; filename="${stored.filename}"`,
              "Cache-Control": "private, max-age=300",
            },
          });
        }
        const invoice = await findInvoiceById(params.id);
        if (!invoice) return new Response("Fakturan hittades inte.", { status: 404 });
        const bytes = await buildInvoicePdf(invoice);
        const copy = new Uint8Array(bytes.byteLength);
        copy.set(bytes);
        return new Response(copy, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${invoiceFileName(invoice)}"`,
            "Cache-Control": "private, max-age=300",
          },
        });
      },
    },
  },
});
