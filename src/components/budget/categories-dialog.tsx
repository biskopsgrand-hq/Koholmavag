import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { categoriesFor, fallbackCategoryId, type TxType } from "@/lib/categories";
import { useBudgetStore } from "@/lib/budget-store";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: TxType;
};

export function CategoriesDialog({ open, onOpenChange, initialType = "expense" }: Props) {
  const categories = useBudgetStore((s) => s.categories);
  const transactions = useBudgetStore((s) => s.transactions);
  const addCategory = useBudgetStore((s) => s.addCategory);
  const renameCategory = useBudgetStore((s) => s.renameCategory);
  const deleteCategory = useBudgetStore((s) => s.deleteCategory);

  const [type, setType] = useState<TxType>(initialType);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!open) return;
    setType(initialType);
    setNewName("");
    setEditingId(null);
    setDraft("");
  }, [open, initialType]);

  const list = useMemo(() => categoriesFor(categories, type), [categories, type]);

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    const id = addCategory(newName, type);
    if (!id) {
      toast(newName.trim() ? "Kategorin finns redan." : "Ange ett namn.");
      return;
    }
    setNewName("");
    toast("Kategorin lades till");
  }

  function startRename(id: string, name: string) {
    setEditingId(id);
    setDraft(name);
  }

  function commitRename() {
    if (!editingId) return;
    const current = categories.find((c) => c.id === editingId);
    if (current && draft.trim() === current.name) {
      setEditingId(null);
      return;
    }
    const ok = renameCategory(editingId, draft);
    if (!ok) {
      toast(draft.trim() ? "Kategorin finns redan." : "Ange ett namn.");
      return;
    }
    setEditingId(null);
    toast("Kategorin bytte namn");
  }

  function handleDelete(id: string) {
    const fallback = fallbackCategoryId(categories, type, id);
    if (!fallback) {
      toast("Minst en kategori måste finnas kvar.");
      return;
    }
    const count = transactions.filter((tx) => tx.categoryId === id).length;
    const fallbackName = categories.find((c) => c.id === fallback)?.name ?? "Övrigt";
    const ok = deleteCategory(id);
    if (!ok) {
      toast("Kategorin kunde inte tas bort.");
      return;
    }
    toast(
      count > 0
        ? `Kategorin togs bort. ${count} transaktioner flyttades till ${fallbackName}.`
        : "Kategorin togs bort",
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kategorier</DialogTitle>
          <DialogDescription>
            Byt namn, ta bort eller lägg till. Transaktioner i en borttagen kategori flyttas till Övrigt.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
          <button
            type="button"
            onClick={() => {
              setType("expense");
              setEditingId(null);
            }}
            className={cn(
              "h-10 rounded-md text-sm font-medium transition-[background-color,color] duration-150",
              type === "expense" ? "bg-surface text-ink shadow-[var(--shadow-border)]" : "text-muted",
            )}
          >
            Utgifter
          </button>
          <button
            type="button"
            onClick={() => {
              setType("income");
              setEditingId(null);
            }}
            className={cn(
              "h-10 rounded-md text-sm font-medium transition-[background-color,color] duration-150",
              type === "income" ? "bg-surface text-ink shadow-[var(--shadow-border)]" : "text-muted",
            )}
          >
            Inkomster
          </button>
        </div>

        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {list.map((cat) => {
            const inEdit = editingId === cat.id;
            const used = transactions.filter((tx) => tx.categoryId === cat.id).length;
            return (
              <li key={cat.id} className="flex items-center gap-2 rounded-md px-1 py-1">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: cat.swatch }}
                  aria-hidden
                />
                {inEdit ? (
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitRename();
                      }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                    maxLength={32}
                    className="h-10 flex-1"
                    aria-label="Nytt kategorinamn"
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                    {cat.name}
                    {used > 0 ? (
                      <span className="ml-2 font-normal text-muted tabular-nums">{used}</span>
                    ) : null}
                  </span>
                )}
                {inEdit ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Spara namn"
                      onClick={commitRename}
                    >
                      <Check />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Avbryt"
                      onClick={() => setEditingId(null)}
                    >
                      <X />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Byt namn på ${cat.name}`}
                      className="text-muted"
                      onClick={() => startRename(cat.id, cat.name)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Ta bort ${cat.name}`}
                      className="text-muted hover:text-clay"
                      onClick={() => handleDelete(cat.id)}
                    >
                      <Trash2 />
                    </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>

        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={type === "income" ? "Ny inkomstkategori" : "Ny utgiftskategori"}
            maxLength={32}
            aria-label="Ny kategori"
          />
          <Button type="submit" className="shrink-0">
            <Plus />
            Lägg till
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
