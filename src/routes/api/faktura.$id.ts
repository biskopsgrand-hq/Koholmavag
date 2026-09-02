import { createFileRoute } from "@tanstack/react-router";
import { findInvoiceById } from "@/lib/invoices.server";
import { buildInvoicePdf, invoiceFileName } from "@/lib/invoice-pdf";

export const Route = createFileRoute("/api/faktura/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
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
