import { useState, type FormEvent } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { OWNER_EMAIL, isOwnerEmail } from "@/lib/access";
import { requestAccess, setOwnerPassword } from "@/lib/access-fns";
import { APP_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthPending } from "@/components/budget/auth-gate";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({
    meta: [
      { title: `Logga in — ${APP_NAME}` },
      { name: "description", content: "Privat inloggning. Bara godkända personer kommer in." },
    ],
  }),
});

function Login() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <AuthPending />;
  if (user) return <Navigate to="/" />;
  return <LoginScreen />;
}

function LoginScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  // Safety net: re-enable the button after 12 s in case navigation stalls,
  // so the user is never permanently locked out of the form.
  const pendingTimerRef = useState<number | null>(null);

  async function handleEmail(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (pendingTimerRef[0]) clearTimeout(pendingTimerRef[0]);
    pendingTimerRef[1](window.setTimeout(() => setPending(null), 12000));
    setPending("email");
    const trimmedEmail = email.trim();
    try {
      if (isOwnerEmail(trimmedEmail)) {
        // Try sign-in first; if credentials don't exist yet, set them and sign in.
        // Run setOwnerPassword and sign-in in one attempt to avoid a waterfall.
        const { error: signInError } = await authClient.signIn.email({
          email: OWNER_EMAIL,
          password,
          fetchOptions: { onSuccess(ctx) { keepPreviewSession(readAuthToken(ctx)); } },
        });
        if (!signInError) {
          window.location.assign(nextPath());
          return;
        }
        // First sign-in failed — credentials may not exist yet; create them.
        await setOwnerPassword({ data: { password, name: name.trim() || "Ägare" } });
        await completeEmailSignIn(OWNER_EMAIL, password);
        return;
      }
      if (mode === "signup") {
        const { error: signUpError } = await authClient.signUp.email({
          email: trimmedEmail,
          password,
          name: name.trim() || trimmedEmail,
          fetchOptions: {
            onSuccess(ctx) {
              keepPreviewSession(readAuthToken(ctx));
            },
          },
        });
        if (signUpError) {
          const message = signUpError.message || "";
          if (message.toLowerCase().includes("exist") || message.toLowerCase().includes("already")) {
            await completeEmailSignIn(trimmedEmail, password);
            return;
          }
          throw new Error(signUpError.message);
        }
        // Fire-and-forget access request — AuthGate will handle it on arrival.
        requestAccess({ data: {} }).catch(() => {});
        window.location.assign("/");
        return;
      }
      await completeEmailSignIn(trimmedEmail, password);
    } catch (err) {
      setPending(null);
      setError(err instanceof Error ? swedishAuthError(err.message) : "Något gick fel.");
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center overflow-x-clip bg-bg px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-raised)] lg:grid-cols-5">
        <aside className="bg-pine px-6 py-6 text-pine-fg lg:col-span-2 lg:flex lg:flex-col lg:justify-between lg:px-8 lg:py-10">
          <div>
            <LedgerMark className="size-9 text-pine-fg" />
            <p className="mt-5 font-display text-3xl font-medium tracking-tight text-balance leading-[1.15]">
              {APP_NAME}
            </p>
            <p className="mt-2 max-w-xs text-sm text-pine-fg/80">
              Inte öppet för alla. Nya personer måste godkännas via e-post.
            </p>
          </div>
          <ul className="mt-6 hidden space-y-2 text-sm text-pine-fg/80 lg:block">
            <li>Inloggning bara för godkända</li>
            <li>Godkännande via e-post</li>
            <li>Live saldo och årsrapport</li>
          </ul>
        </aside>

        <section className="px-5 py-7 sm:px-8 sm:py-10 lg:col-span-3">
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
            {mode === "signin" ? "Logga in" : "Begär tillgång"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {mode === "signin"
              ? "Skriv e-post och lösenord."
              : "Skapa ett konto. Du släpps in när en administratör godkänt dig."}
          </p>

          {!authEnabled ? (
            <p className="mt-8 text-sm text-muted">Inloggning är avstängd.</p>
          ) : (
            <>
              <form onSubmit={(event) => void handleEmail(event)} className="mt-7 grid gap-4">
                {mode === "signup" ? (
                  <div className="grid gap-2">
                    <Label htmlFor="name">Namn</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      maxLength={80}
                    />
                  </div>
                ) : null}
                <div className="grid gap-2">
                  <Label htmlFor="email">E-post</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Lösenord</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </div>
                {error ? <p className="text-sm text-clay">{error}</p> : null}
                <Button type="submit" size="lg" className="w-full" disabled={pending !== null}>
                  {pending === "email"
                    ? "Väntar…"
                    : mode === "signin"
                      ? "Logga in"
                      : "Begär tillgång"}
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-muted">
                {mode === "signin" ? "Loggar in första gången?" : "Har du redan ett lösenord?"}{" "}
                <button
                  type="button"
                  className="font-medium text-pine"
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setError(null);
                  }}
                >
                  {mode === "signin" ? "Skapa konto" : "Logga in"}
                </button>
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function LedgerMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" className={className} aria-hidden>
      <rect x="3" y="5" width="30" height="5" rx="1.5" fill="currentColor" opacity="0.35" />
      <rect x="3" y="15.5" width="22" height="5" rx="1.5" fill="currentColor" />
      <rect x="3" y="26" width="14" height="5" rx="1.5" fill="currentColor" opacity="0.65" />
    </svg>
  );
}

function keepPreviewSession(token: string | null) {
  if (!token || typeof window === "undefined") return;
  try {
    const isPreview = window.location.hostname.endsWith(".grok-sandbox.com");
    if (isPreview) {
      window.sessionStorage.setItem("grok-auth.bearer-token", token);
    } else {
      // On production: store in localStorage so it survives page reloads.
      // This is needed because Vercel doesn't reliably forward cookies on
      // POST /_serverFn/ requests, so we send the token as a bearer header instead.
      window.localStorage.setItem("koholma-auth.session-token", token);
    }
  } catch {
    /* storage unavailable */
  }
}

function readAuthToken(ctx: { data?: unknown; response?: Response }): string | null {
  const header = ctx.response?.headers.get("set-auth-token");
  if (header) return header;
  if (ctx.data && typeof ctx.data === "object" && "token" in ctx.data) {
    const token = (ctx.data as { token?: unknown }).token;
    if (typeof token === "string" && token) return token;
  }
  return null;
}

async function completeEmailSignIn(email: string, password: string): Promise<void> {
  let token: string | null = null;
  const { data, error } = await authClient.signIn.email({
    email,
    password,
    fetchOptions: {
      onSuccess(ctx) {
        token = readAuthToken(ctx);
      },
    },
  });
  if (error) throw new Error(error.message);
  if (!token && data && typeof data === "object" && "token" in data) {
    const value = (data as { token?: unknown }).token;
    if (typeof value === "string") token = value;
  }
  keepPreviewSession(token);
  // Navigate immediately — the session cookie/bearer is now set.
  // A redundant getSession() round-trip here added ~300–600 ms with no benefit.
  window.location.assign(nextPath());
}

function nextPath(): string {
  if (typeof window === "undefined") return "/";
  try {
    if (sessionStorage.getItem("koholma-pending-invoice")) return "/medlemmar";
  } catch {
    /* ignore */
  }
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") ? next : "/";
}

function swedishAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("popup")) return "Tillåt popup-fönster för att logga in.";
  if (lower.includes("invalid origin") || lower.includes("unable to verify")) {
    return "Inloggningen kunde inte verifieras. Ladda om sidan och försök igen.";
  }
  if (lower.includes("invalid email or password") || lower.includes("invalid password")) {
    return "Fel e-post eller lösenord.";
  }
  if (lower.includes("exist") || lower.includes("already")) {
    return "Det finns redan ett konto med den e-postadressen.";
  }
  if (lower.includes("cancel")) return "Inloggningen avbröts.";
  return message;
}
