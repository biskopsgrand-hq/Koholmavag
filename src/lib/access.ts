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
