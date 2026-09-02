export const OWNER_EMAIL = "biskopsgrand@gmail.com";

export type AccessStatus = "approved" | "pending" | "denied" | "none";

export type AccessState = {
  status: AccessStatus;
  isAdmin: boolean;
  email: string | null;
  mailto: string | null;
  freshRequest?: boolean;
};

export type AccessMember = {
  email: string;
  name: string | null;
  status: AccessStatus;
  requestedAt: string;
  decidedAt: string | null;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  return normalizeEmail(email ?? "") === OWNER_EMAIL;
}

export function isApproved(status: AccessStatus | null | undefined): boolean {
  return status === "approved";
}

export function parseAccessStatus(value: unknown): AccessStatus {
  const status = String(value ?? "").trim().toLowerCase();
  if (status === "approved" || status === "pending" || status === "denied") return status;
  return "none";
}

function statusRank(status: AccessStatus): number {
  if (status === "approved") return 3;
  if (status === "denied") return 2;
  if (status === "pending") return 1;
  return 0;
}

export function strongerAccessStatus(a: AccessStatus, b: AccessStatus): AccessStatus {
  return statusRank(a) >= statusRank(b) ? a : b;
}

export function combineAccessStatus(previous: AccessStatus | undefined, next: AccessStatus): AccessStatus {
  if (next === "approved" || next === "denied") return next;
  if (previous === "approved" || previous === "denied") return previous;
  return next;
}

export function asMemberList(value: unknown): AccessMember[] {
  const raw = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { members?: unknown }).members)
      ? (value as { members: unknown[] }).members
      : [];
  const byEmail = new Map<string, AccessMember>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const data = row as Record<string, unknown>;
    const email = normalizeEmail(String(data.email ?? ""));
    if (!email.includes("@")) continue;
    const parsed = isOwnerEmail(email) ? "approved" : parseAccessStatus(data.status);
    byEmail.set(email, {
      email,
      name: data.name ? String(data.name) : null,
      status: parsed === "none" ? "pending" : parsed,
      requestedAt: String(data.requestedAt ?? data.requested_at ?? ""),
      decidedAt:
        data.decidedAt == null && data.decided_at == null
          ? null
          : String(data.decidedAt ?? data.decided_at),
    });
  }
  return [...byEmail.values()];
}

export function mergeMemberLists(
  previous: AccessMember[] | null | undefined,
  next: AccessMember[],
): AccessMember[] {
  const byEmail = new Map<string, AccessMember>();
  for (const member of previous ?? []) byEmail.set(normalizeEmail(member.email), member);
  for (const member of next) {
    const email = normalizeEmail(member.email);
    const previousMember = byEmail.get(email);
    byEmail.set(email, {
      email,
      name: member.name || previousMember?.name || null,
      status: combineAccessStatus(previousMember?.status, member.status),
      requestedAt: member.requestedAt || previousMember?.requestedAt || "",
      decidedAt: member.decidedAt || previousMember?.decidedAt || null,
    });
  }
  return [...byEmail.values()];
}
