import { invoiceTotals, type Invoice } from "@/lib/invoices";
import { useBudgetStore } from "@/lib/budget-store";

const FEE_CATEGORY_ID = "member-fee";
const FEE_CATEGORY_NAME = "Årsavgift";

export function invoiceTxId(invoiceId: string) {
  return `inv-${invoiceId}`;
}

function ensureFeeCategory() {
  const { categories, addCategory } = useBudgetStore.getState();
  const existing =
    categories.find((row) => row.id === FEE_CATEGORY_ID) ??
    categories.find((row) => row.type === "income" && row.name.toLowerCase() === FEE_CATEGORY_NAME.toLowerCase());
  if (existing) return existing.id;
  return addCategory(FEE_CATEGORY_NAME, "income") ?? FEE_CATEGORY_ID;
}

export function bookInvoice(invoice: Invoice, paid: boolean) {
  const totals = invoiceTotals(invoice);
  if (totals.total <= 0) return;
  const store = useBudgetStore.getState();
  const id = invoiceTxId(invoice.id);
  const categoryId = ensureFeeCategory();
  const note = `Faktura ${invoice.number} · ${invoice.name}`;
  const date = (paid ? invoice.paidAt ?? new Date().toISOString() : invoice.issuedAt).slice(0, 10);
  const input = {
    id,
    type: "income" as const,
    amount: totals.total,
    categoryId,
    note,
    date,
    accrued: !paid,
  };
  if (store.transactions.some((tx) => tx.id === id)) {
    store.updateTransaction(id, input);
    return;
  }
  store.addTransaction(input);
}

export function unbookInvoice(invoiceId: string) {
  useBudgetStore.getState().deleteTransaction(invoiceTxId(invoiceId));
}
