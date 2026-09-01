import { useState } from "react";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";

export function AccountChip() {
  const { user, isPending } = useCurrentUserState();
  const [signingOut, setSigningOut] = useState(false);

  if (isPending) {
    return <div className="h-11 w-36 animate-pulse rounded-md bg-surface-2" />;
  }
  if (!user) return null;

  const label = user.displayName ?? user.primaryEmail ?? "Konto";

  return (
    <div className="flex min-w-0 items-center gap-2">
      {user.profileImageUrl ? (
        <img
          src={user.profileImageUrl}
          alt=""
          className="size-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-medium text-ink">
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="hidden max-w-28 truncate text-sm font-medium text-ink sm:inline">{label}</span>
      <Button
        type="button"
        variant="outline"
        disabled={signingOut}
        onClick={() => {
          setSigningOut(true);
          void signOut().catch(() => setSigningOut(false));
        }}
      >
        {signingOut ? "Loggar ut…" : "Logga ut"}
      </Button>
    </div>
  );
}
