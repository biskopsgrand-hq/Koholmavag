import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseAmountInput } from "@/lib/format";
import { useBudgetStore } from "@/lib/budget-store";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BudgetDialog({ open, onOpenChange }: Props) {
  const monthlyBudget = useBudgetStore((s) => s.monthlyBudget);
  const setMonthlyBudget = useBudgetStore((s) => s.setMonthlyBudget);
  const [amount, setAmount] = useState(String(monthlyBudget));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(String(monthlyBudget));
    setError(null);
  }, [open, monthlyBudget]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseAmountInput(amount);
    if (parsed === null) {
      setError("Ange en budget större än 0.");
      return;
    }
    setMonthlyBudget(parsed);
    toast("Budgeten uppdaterades");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Månadsbudget</DialogTitle>
          <DialogDescription>
            Sätt hur mycket du får lägga på utgifter den här månaden. Använt belopp räknas mot budgeten.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="budget-amount">Budget (kr)</Label>
            <Input
              id="budget-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
              }}
              className="tabular-nums"
            />
            {error ? <p className="text-sm text-clay">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit">Spara budget</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
