import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Invoice } from "@/lib/invoices";

export const loadMailStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(() => ({}))
  .handler(async ({ context }) => {
    const { mailConfigured } = await import("@/lib/mail.server");
    return mailConfigured(context.userId);
  });

export const saveMailPassword = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { pass: string }) => input)
  .handler(async ({ context, data }) => {
    const { saveMailPassword } = await import("@/lib/mail.server");
    return saveMailPassword(context.userId, data.pass);
  });

export const sendInvoiceMail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Invoice) => input)
  .handler(async ({ context, data }) => {
    const { sendInvoiceWithPdf } = await import("@/lib/mail.server");
    return sendInvoiceWithPdf(context.userId, data);
  });
