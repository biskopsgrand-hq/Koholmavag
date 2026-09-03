import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { signOut, authClient } from "@/lib/auth/client";
import { useCurrentUserState, type AppUser } from "@/lib/auth/use-current-user";
import { OWNER_EMAIL, asMemberList, isApproved, type AccessState } from "@/lib/access";
import { getMyAccess, listAccessMembers, requestAccess } from "@/lib/access-fns";
import { APP_NAME } from "@/lib/brand";
import { readSessionUser, writeSessionUser } from "@/lib/session-user";
import { Button } from "@/components/ui/button";

const AccessContext = createContext<AccessState | null>(null);
let accessCache: AccessState | null = null;
let lastUser: AppUser | null = null;

export function useAccess(): AccessState | null {
  return useContext(AccessContext) ?? accessCache;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();

  if (user) {
    lastUser = user;
    writeSessionUser(user);
  }

  useEffect(() => {
    let debounce: number | undefined;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      // Debounce rapid visibility changes (e.g. tab flicker) — only fire once
      // per 2 s window to avoid stacking session requests.
      if (debounce !== undefined) return;
      debounce = window.setTimeout(() => {
        debounce = undefined;
        void authClient.getSession().catch(() => undefined);
      }, 2000);
    };
    // Initial check on mount — but defer it so the sign-in redirect can land first.
    const init = window.setTimeout(() => {
      void authClient.getSession().catch(() => undefined);
    }, 500);
    const timer = window.setInterval(() => {
      void authClient.getSession().catch(() => undefined);
    }, 120000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearTimeout(init);
      window.clearTimeout(debounce);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const current = user ?? lastUser ?? readSessionUser();
  if (isPending && !current) return <AuthPending />;
  if (!current) {
    return (
      <>
        <AuthPending />
        <RedirectToSignIn />
      </>
    );
  }
  return <AccessGate>{children}</AccessGate>;
}

function AccessGate({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<AccessState | null>(accessCache);
  const [error, setError] = useState<string | null>(null);

  function remember(state: AccessState) {
    accessCache = state;
    setAccess(state);
  }

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function load() {
      try {
        const state = await getMyAccess({ data: {} });
        if (cancelled) return;
        // Already approved or denied — just show it, no second round-trip needed.
        if (state.status === "approved" || state.status === "denied") {
          remember(state);
          return;
        }
        // Optimistic: if we have a cached approved state, keep showing it while
        // we verify — avoids a flash back to the pending screen on re-mount.
        if (accessCache && isApproved(accessCache.status)) {
          remember(accessCache);
          return;
        }
        // New user or pending — register the access request.
        const created = await requestAccess({ data: {} });
        if (!cancelled) remember({ ...created, freshRequest: state.status === "none" });
      } catch (err: unknown) {
        if (cancelled) return;
        attempts += 1;
        // Neon cold starts can take 3–5 s; use progressive backoff up to 8 attempts.
        const maxAttempts = 8;
        if (attempts < maxAttempts) {
          // Backoff: 500 ms, 1 s, 1.5 s, 2 s, 2.5 s, 3 s, 3.5 s
          const delay = Math.min(500 * attempts, 3500);
          window.setTimeout(() => {
            if (!cancelled) void load();
          }, delay);
          return;
        }
        console.error("access check failed", err);
        if (accessCache && isApproved(accessCache.status)) {
          setAccess(accessCache);
          return;
        }
        // Show a more helpful message depending on error type.
        const message = err instanceof Error ? err.message.toLowerCase() : "";
        const isDbError =
          message.includes("connect") ||
          message.includes("timeout") ||
          message.includes("econnrefused") ||
          message.includes("database");
        setError(
          isDbError
            ? "Kunde inte nå databasen. Kontrollera att Vercel-miljövariablerna är rätt inställda och ladda om sidan."
            : "Kunde inte kontrollera behörighet. Ladda om sidan.",
        );
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (access?.status !== "pending") return;
    const timer = window.setInterval(() => {
      getMyAccess({ data: {} })
        .then((state) => {
          remember({
            ...state,
            freshRequest: false,
            mailto: state.mailto ?? accessCache?.mailto ?? null,
          });
        })
        .catch(() => {});
    }, 12000);
    return () => window.clearInterval(timer);
  }, [access?.status]);

  if (error === "session") {
    return (
      <PendingShell>
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Kunde inte läsa inloggningen</h1>
        <p className="mt-2 text-sm text-muted">Du är inloggad, men sidan kunde inte läsa behörigheten. Ladda om och försök igen.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" onClick={() => window.location.reload()}>
            Ladda om
          </Button>
          <SignOutButton />
        </div>
      </PendingShell>
    );
  }
  if (!access && !error) return <AuthPending />;
  if (error) {
    return (
      <PendingShell>
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Något gick fel</h1>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <SignOutButton />
      </PendingShell>
    );
  }
  if (!access || !isApproved(access.status)) {
    return (
      <AccessContext.Provider value={access}>
        <PendingAccess
          access={access}
          onRefresh={async () => {
            const state = await getMyAccess({ data: {} });
            remember({ ...state, freshRequest: false });
          }}
        />
      </AccessContext.Provider>
    );
  }
  return <AccessContext.Provider value={access}>{children}</AccessContext.Provider>;
}

function PendingAccess({
  access,
  onRefresh,
}: {
  access: AccessState | null;
  onRefresh: () => Promise<void>;
}) {
  const denied = access?.status === "denied";
  const mailto = access?.mailto ?? null;
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (denied || !access?.email) return;
    const key = `koholma-access-mail-${access.email}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    const who = access.email;
    void fetch(`https://formsubmit.co/ajax/${encodeURIComponent(OWNER_EMAIL)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: `${APP_NAME}: ${who} vill ha tillgång`,
        _template: "box",
        _captcha: "false",
        _replyto: who,
        name: who,
        email: who,
        message: `${who} vill ha tillgång till ${APP_NAME}. Godkänn under Godkännanden eller via länken i mejlet.`,
      }),
    }).catch(() => {});
    if (mailto) window.open(mailto, "_blank", "noopener,noreferrer");
  }, [access?.email, denied, mailto]);

  return (
    <PendingShell>
      <p className="text-sm font-medium text-muted text-balance">{APP_NAME}</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink">
        {denied ? "Åtkomst nekad" : "Väntar på godkännande"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {denied
          ? `Du har inte tillgång till ${APP_NAME}. Kontakta ${OWNER_EMAIL} om det är fel.`
          : `${APP_NAME} är inte öppet för alla. Ett mejl skickas till ${OWNER_EMAIL}. Du släpps in när förfrågan godkänts där eller under Godkännanden i appen.`}
      </p>
      {access?.email ? (
        <p className="mt-3 break-all rounded-lg bg-bg px-3 py-2 text-sm text-ink">{access.email}</p>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Vi kunde inte läsa din e-post. Logga in med e-post och lösenord.
        </p>
      )}
      {!denied && mailto ? (
        <Button variant="outline" className="mt-6 w-full" size="lg" asChild>
          <a href={mailto}>Skicka extra mejl manuellt</a>
        </Button>
      ) : null}
      {!denied ? (
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full"
          disabled={checking}
          onClick={() => {
            setChecking(true);
            void onRefresh().finally(() => setChecking(false));
          }}
        >
          {checking ? "Kollar…" : "Jag är godkänd — öppna budgeten"}
        </Button>
      ) : null}
      <p className="mt-4 text-sm text-muted">
        {denied
          ? "Nekade konton kommer inte in i budgeten."
          : "Mejlet skickas automatiskt. När du är godkänd klickar du knappen ovan."}
      </p>
      <SignOutButton />
    </PendingShell>
  );
}

function PendingShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center overflow-x-clip bg-bg px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-[var(--shadow-raised)] sm:p-8">
        {children}
      </div>
    </main>
  );
}

function SignOutButton() {
  const [signingOut, setSigningOut] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="mt-4 w-full"
      disabled={signingOut}
      onClick={() => {
        setSigningOut(true);
        lastUser = null;
        writeSessionUser(null);
        void signOut().catch(() => setSigningOut(false));
      }}
    >
      {signingOut ? "Loggar ut…" : "Logga ut"}
    </Button>
  );
}

export function AuthPending() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <p className="text-sm font-medium text-muted">{APP_NAME}</p>
        {/* Skeleton that mirrors the app shell so the transition feels smooth */}
        <div className="w-full space-y-3">
          <div className="h-2 w-3/4 animate-pulse rounded-full bg-surface-2" />
          <div className="h-2 w-full animate-pulse rounded-full bg-surface-2" />
          <div className="h-2 w-5/6 animate-pulse rounded-full bg-surface-2" />
        </div>
        <p className="text-xs text-muted/60">Laddar…</p>
      </div>
    </div>
  );
}

export function AdminNav() {
  const access = useAccess();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!access?.isAdmin) return;
    let cancelled = false;
    async function load() {
      try {
        const rows = await listAccessMembers({ data: {} });
        if (!cancelled) {
          setPendingCount(asMemberList(rows).filter((row) => row.status === "pending").length);
        }
      } catch {
        /* ignore */
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [access?.isAdmin]);

  if (!access?.isAdmin) return null;
  return (
    <Button variant="outline" asChild>
      <Link to="/godkannanden">
        Godkännanden
        {pendingCount > 0 ? (
          <span className="ml-1 rounded-full bg-clay px-1.5 py-0.5 text-xs font-semibold text-destructive-foreground">
            {pendingCount}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
