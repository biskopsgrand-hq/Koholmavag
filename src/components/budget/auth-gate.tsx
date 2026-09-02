import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState, type AppUser } from "@/lib/auth/use-current-user";
import { OWNER_EMAIL, asMemberList, isApproved, type AccessState } from "@/lib/access";
import { getMyAccess, listAccessMembers, requestAccess } from "@/lib/access-fns";
import { APP_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";

const AccessContext = createContext<AccessState | null>(null);
let accessCache: AccessState | null = null;
let lastUser: AppUser | null = null;

export function useAccess(): AccessState | null {
  return useContext(AccessContext) ?? accessCache;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const [, bump] = useState(0);

  if (user) lastUser = user;

  useEffect(() => {
    if (user || isPending) return;
    if (!lastUser) {
      bump((n) => n + 1);
      return;
    }
    const timer = window.setTimeout(() => {
      lastUser = null;
      bump((n) => n + 1);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [user, isPending]);

  const current = user ?? lastUser;
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
        if (state.status === "none" || state.status === "pending") {
          const created = await requestAccess({ data: {} });
          if (!cancelled) remember({ ...created, freshRequest: true });
          return;
        }
        remember(state);
      } catch (err: unknown) {
        if (cancelled) return;
        attempts += 1;
        if (attempts < 5) {
          window.setTimeout(() => {
            if (!cancelled) void load();
          }, 300 * attempts);
          return;
        }
        console.error("access check failed", err);
        if (accessCache && isApproved(accessCache.status)) {
          setAccess(accessCache);
          return;
        }
        setError("Kunde inte kontrollera behörighet. Ladda om sidan.");
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
        void signOut().catch(() => setSigningOut(false));
      }}
    >
      {signingOut ? "Loggar ut…" : "Logga ut"}
    </Button>
  );
}

export function AuthPending() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <p className="max-w-xs text-center text-sm font-medium text-balance text-muted">
          {APP_NAME}
        </p>
        <div className="h-1.5 w-20 animate-pulse rounded-full bg-surface-2" />
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
