import { useState, type FormEvent } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { OWNER_EMAIL, isOwnerEmail } from "@/lib/access";
import { requestAccess, setOwnerPassword } from "@/lib/access-fns";
import { APP_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const { user } = useCurrentUserState();
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

  async function handleProvider(providerId: string) {
    setError(null);
    setPending(providerId);
    try {
      await signIn(providerId, { callbackURL: "/", errorCallbackURL: "/login" });
    } catch (err) {
      setPending(null);
      setError(
        err instanceof Error
          ? swedishAuthError(err.message)
          : "Google-inloggningen misslyckades. Skapa ett lösenord nedan i stället.",
      );
    }
  }

  async function handleEmail(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending("email");
    const trimmedEmail = email.trim();
    try {
      if (isOwnerEmail(trimmedEmail)) {
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
        try {
          await authClient.getSession();
          await requestAccess();
        } catch {
          /* AuthGate retries after redirect */
        }
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
                {mode === "signin" ? "Första gången?" : "Har du redan ett lösenord?"}{" "}
                <button
                  type="button"
                  className="font-medium text-pine"
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setError(null);
                  }}
                >
                  {mode === "signin" ? "Begär tillgång" : "Logga in"}
                </button>
              </p>

              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="text-xs font-medium tracking-wide text-muted uppercase">
                  eller
                </span>
                <span className="h-px flex-1 bg-line" />
              </div>

              <div className="grid gap-2">
                {GROK_PROVIDERS.map((provider) => (
                  <Button
                    key={provider.providerId}
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full justify-center"
                    disabled={pending !== null}
                    onClick={() => void handleProvider(provider.providerId)}
                  >
                    {provider.idp === "google" ? <GoogleMark /> : <XMark />}
                    {pending === provider.providerId
                      ? "Öppnar…"
                      : `Fortsätt med ${provider.label}`}
                  </Button>
                ))}
              </div>
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

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M21.6 12.23c0-.74-.06-1.45-.18-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z"
      />
      <path
        fill="currentColor"
        d="M12 22c2.7 0 4.97-.9 6.63-2.35l-3.24-2.5c-.9.6-2.05.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.58A10 10 0 0 0 12 22Z"
        opacity="0.85"
      />
      <path
        fill="currentColor"
        d="M6.4 13.99A6 6 0 0 1 6.08 12c0-.69.12-1.36.32-1.99V7.43H3.06A10 10 0 0 0 2 12c0 1.61.38 3.14 1.06 4.57l3.34-2.58Z"
        opacity="0.7"
      />
      <path
        fill="currentColor"
        d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.96 2.97 14.7 2 12 2A10 10 0 0 0 3.06 7.43l3.34 2.58C7.19 7.72 9.4 5.96 12 5.96Z"
        opacity="0.55"
      />
    </svg>
  );
}

function XMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M18.24 2H21.5l-7.19 8.21L22.5 22h-6.59l-5.16-6.74L5.2 22H1.92l7.7-8.8L1.5 2h6.76l4.66 6.18L18.24 2Zm-1.16 18.02h1.83L7.01 3.88H5.05l12.03 16.14Z"
      />
    </svg>
  );
}

function keepPreviewSession(token: string | null) {
  if (!token || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem("grok-auth.bearer-token", token);
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
  try {
    await authClient.getSession();
    if (!isOwnerEmail(email)) await requestAccess();
  } catch {
    /* next page load will recover */
  }
  window.location.assign("/");
}

function swedishAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("popup")) return "Tillåt popup-fönster för att logga in.";
  if (lower.includes("invalid origin") || lower.includes("unable to verify")) {
    return "Inloggningen kunde inte verifieras. Ladda om sidan och försök igen.";
  }
  if (lower.includes("invalid email or password") || lower.includes("invalid password")) {
    return "Fel e-post eller lösenord. Skriv minst 8 tecken och klicka Öppna.";
  }
  if (lower.includes("exist") || lower.includes("already")) {
    return "Det finns redan ett konto med den e-postadressen.";
  }
  if (lower.includes("cancel")) return "Inloggningen avbröts.";
  return message;
}
