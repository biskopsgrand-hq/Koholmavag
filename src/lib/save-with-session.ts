import { authClient } from "@/lib/auth/client";

export function isAuthError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /unauthor/i.test(message) || /not authorized/i.test(message) || /forbidden/i.test(message);
}

export async function withSessionRetry<T>(run: () => Promise<T>): Promise<T> {
  await authClient.getSession().catch(() => undefined);
  try {
    return await run();
  } catch (err) {
    if (!isAuthError(err)) throw err;
    await authClient.getSession().catch(() => undefined);
    await new Promise((resolve) => window.setTimeout(resolve, 400));
    try {
      return await run();
    } catch (retryErr) {
      if (!isAuthError(retryErr)) throw retryErr;
      await authClient.getSession().catch(() => undefined);
      await new Promise((resolve) => window.setTimeout(resolve, 600));
      return await run();
    }
  }
}
