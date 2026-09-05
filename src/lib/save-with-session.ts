import { authClient } from "@/lib/auth/client";

export function isAuthError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /unauthor/i.test(message) || /not authorized/i.test(message) || /forbidden/i.test(message);
}

async function refreshToken(): Promise<void> {
  try {
    // Get a fresh session and store the token in localStorage so subsequent
    // server calls can use it as bearer auth.
    const result = await authClient.getSession();
    const token = (result as unknown as { data?: { session?: { token?: string } } })?.data?.session?.token;
    if (token) {
      window.localStorage.setItem("koholma-auth.session-token", token);
    }
  } catch {
    /* ignore — we'll fail naturally on the next attempt */
  }
}

/**
 * Run `run()` and retry up to twice on auth errors, refreshing the session
 * before each retry.
 */
export async function withSessionRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (!isAuthError(err)) throw err;
    await refreshToken();
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    try {
      return await run();
    } catch (retryErr) {
      if (!isAuthError(retryErr)) throw retryErr;
      await refreshToken();
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      return await run();
    }
  }
}
