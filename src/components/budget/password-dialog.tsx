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
import { changeOwnPassword, setMemberPassword } from "@/lib/access-fns";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email?: string | null;
  name?: string | null;
};

export function PasswordDialog({ open, onOpenChange, email, name }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const forSomeoneElse = Boolean(email);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setConfirm("");
    setError(null);
    setBusy(false);
  }, [open, email]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.trim().length < 8) {
      setError("Lösenordet måste vara minst 8 tecken.");
      return;
    }
    if (password.trim() !== confirm.trim()) {
      setError("Lösenorden stämmer inte överens.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (email) {
        await setMemberPassword({ data: { email, password } });
      } else {
        await changeOwnPassword({ data: { password, confirm } });
      }
      toast(email ? `Nytt lösenord sparat för ${name || email}.` : "Lösenordet är bytt.");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte spara lösenordet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Byt lösenord</DialogTitle>
            <DialogDescription>
              {forSomeoneElse
                ? `Sätt ett nytt lösenord för ${name || email}. Det gamla går inte att läsa.`
                : "Skriv ett nytt lösenord. Det gamla går inte att läsa."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="new-password">Nytt lösenord</Label>
            <Input
              id="new-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Upprepa lösenord</Label>
            <Input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error ? <p className="text-sm text-clay">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Sparar…" : "Spara lösenord"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
