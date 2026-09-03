import { authClient } from "@/lib/auth/client";

export function isAuthError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /unauthor/i.test(message) || /not authorized/i.test(message) || /forbidden/i.test(message);
}

/**
 * Run `run()` and retry up to twice on auth errors, refreshing the session
 * before each retry. Does NOT call getSession() upfront — that was adding
 * 300–500 ms of latency to every save even when the session was healthy.
 */
export async function withSessionRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (!isAuthError(err)) throw err;
    // First auth failure: refresh session and retry.
    await authClient.getSession().catch(() => undefined);
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    try {
      return await run();
    } catch (retryErr) {
      if (!isAuthError(retryErr)) throw retryErr;
      // Second failure: one more session refresh and final attempt.
      await authClient.getSession().catch(() => undefined);
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      return await run();
    }
  }
}
