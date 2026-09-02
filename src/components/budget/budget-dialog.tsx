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
import { fiscalYearFromIso, fiscalYearLabel, parseAmountInput } from "@/lib/format";
import { useBudgetStore } from "@/lib/budget-store";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
};

export function BudgetDialog({ open, onOpenChange, month }: Props) {
  const year = fiscalYearFromIso(`${month}-01`);
  const yearBooks = useBudgetStore((s) => s.yearBooks);
  const monthlyBudget = useBudgetStore((s) => s.monthlyBudget);
  const setAnnualBudget = useBudgetStore((s) => s.setAnnualBudget);
  const current = yearBooks[String(year)]?.annualBudget || monthlyBudget || 0;
  const [amount, setAmount] = useState(current ? String(current) : "100000");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(current ? String(current) : "100000");
    setError(null);
  }, [open, current]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseAmountInput(amount);
    if (parsed === null) {
      setError("Ange en årsbudget större än 0.");
      return;
    }
    setAnnualBudget(year, parsed);
    toast(`Årsbudget ${fiscalYearLabel(year)} sparad.`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Årsbudget {fiscalYearLabel(year)}</DialogTitle>
          <DialogDescription>
            Sätt budgeten för räkenskapsåret 1 juli–30 juni. Månadernas utgifter summeras mot beloppet.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="budget-amount">Årsbudget (kr)</Label>
            <Input
              id="budget-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
              }}
              className="tabular-nums"
              placeholder="100000"
            />
            {error ? <p className="text-sm text-clay">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit">Spara årsbudget</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
