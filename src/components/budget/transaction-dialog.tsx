import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
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
import { categoriesFor, defaultCategory } from "@/lib/categories";
import type { TxType } from "@/lib/categories";
import { parseAmountInput, todayIso } from "@/lib/format";
import { useBudgetStore, type Transaction } from "@/lib/budget-store";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Transaction | null;
  onManageCategories?: () => void;
};

const fieldClass =
  "flex h-11 w-full rounded-md bg-bg px-3 text-base text-ink shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm";

export function TransactionDialog({ open, onOpenChange, editing, onManageCategories }: Props) {
  const addTransaction = useBudgetStore((s) => s.addTransaction);
  const updateTransaction = useBudgetStore((s) => s.updateTransaction);
  const addCategory = useBudgetStore((s) => s.addCategory);
  const categories = useBudgetStore((s) => s.categories);
  const selectedMonth = useBudgetStore((s) => s.selectedMonth);

  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(defaultCategory(categories, "expense"));
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const [newCat, setNewCat] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);

  const cats = useMemo(() => categoriesFor(categories, type), [categories, type]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setCategoryId(editing.categoryId);
      setNote(editing.note);
      setDate(editing.date);
    } else {
      setType("expense");
      setAmount("");
      setCategoryId(defaultCategory(categories, "expense"));
      setNote("");
      const today = todayIso();
      setDate(today.startsWith(selectedMonth) ? today : `${selectedMonth}-01`);
    }
    setError(null);
    setNewCat("");
    setShowNewCat(false);
  }, [open, editing, selectedMonth]);

  function handleType(next: TxType) {
    setType(next);
    if (!categoriesFor(categories, next).some((c) => c.id === categoryId)) {
      setCategoryId(defaultCategory(categories, next));
    }
  }

  function handleCreateCategory() {
    const id = addCategory(newCat, type);
    if (!id) {
      toast(newCat.trim() ? "Kategorin finns redan." : "Ange ett namn.");
      return;
    }
    setCategoryId(id);
    setNewCat("");
    setShowNewCat(false);
    toast("Kategorin lades till");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseAmountInput(amount);
    if (parsed === null) {
      setError("Ange ett belopp större än 0.");
      return;
    }
    const payload = { type, amount: parsed, categoryId, note, date };
    if (editing) {
      updateTransaction(editing.id, payload);
      toast("Transaktionen uppdaterades");
    } else {
      addTransaction(payload);
      toast("Transaktionen lades till");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Redigera transaktion" : "Ny transaktion"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Uppdatera belopp, kategori eller datum."
              : "Lägg till en inkomst eller utgift i budgeten."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
            <button
              type="button"
              onClick={() => handleType("expense")}
              className={cn(
                "h-10 rounded-md text-sm font-medium transition-[background-color,color] duration-150",
                type === "expense" ? "bg-surface text-ink shadow-[var(--shadow-border)]" : "text-muted",
              )}
            >
              Utgift
            </button>
            <button
              type="button"
              onClick={() => handleType("income")}
              className={cn(
                "h-10 rounded-md text-sm font-medium transition-[background-color,color] duration-150",
                type === "income" ? "bg-surface text-ink shadow-[var(--shadow-border)]" : "text-muted",
              )}
            >
              Inkomst
            </button>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">Belopp (kr)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
              }}
              className="tabular-nums"
            />
            {error ? <p className="text-sm text-clay">{error}</p> : null}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="category">Kategori</Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-sm font-medium text-pine"
                  onClick={() => setShowNewCat((v) => !v)}
                >
                  Ny kategori
                </button>
                {onManageCategories ? (
                  <button
                    type="button"
                    className="text-sm font-medium text-muted"
                    onClick={onManageCategories}
                  >
                    Hantera
                  </button>
                ) : null}
              </div>
            </div>
            <select
              id="category"
              className={fieldClass}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {showNewCat ? (
              <div className="flex gap-2">
                <Input
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  placeholder="Namn, t.ex. Barn"
                  maxLength={32}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                />
                <Button type="button" onClick={handleCreateCategory} className="shrink-0">
                  <Plus />
                  Skapa
                </Button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Datum</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="note">Anteckning</Label>
            <Input
              id="note"
              placeholder="Valfritt"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={80}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit">{editing ? "Spara" : "Lägg till"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
