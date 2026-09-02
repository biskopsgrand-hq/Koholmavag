import type { AppUser } from "@/lib/auth/use-current-user";

const KEY = "koholma-last-user";

export function readSessionUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppUser;
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSessionUser(user: AppUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) window.localStorage.setItem(KEY, JSON.stringify(user));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
