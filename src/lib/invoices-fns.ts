import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Invoice } from "@/lib/invoices";

export const loadInvoiceList = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(() => ({}))
  .handler(async ({ context }): Promise<Invoice[]> => {
    const { loadInvoices } = await import("@/lib/invoices.server");
    return loadInvoices(context.userId);
  });

export const saveInvoiceList = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Invoice[]) => input)
  .handler(async ({ context, data }): Promise<Invoice[]> => {
    const { saveInvoices } = await import("@/lib/invoices.server");
    return saveInvoices(context.userId, data);
  });
