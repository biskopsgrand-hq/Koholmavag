import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { BudgetPayload, LoadedBudget } from "@/lib/budget-types";

export const loadBudget = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<LoadedBudget> => {
    const { loadSharedBudget } = await import("@/lib/budget.server");
    return loadSharedBudget(context.userId);
  });

export const saveBudget = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: BudgetPayload) => input)
  .handler(async ({ context, data }): Promise<BudgetPayload> => {
    const { saveSharedBudget } = await import("@/lib/budget.server");
    return saveSharedBudget(context.userId, data);
  });
