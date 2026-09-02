import type { Category } from "@/lib/categories";
import type { Transaction, YearBook } from "@/lib/budget-store";

export type BudgetPayload = {
  monthlyBudget: number;
  categories: Category[];
  transactions: Transaction[];
  yearBooks: Record<string, YearBook>;
  deletedIds?: string[];
};

export type LoadedBudget = BudgetPayload & { existed: boolean };
