import { randomBytes, randomUUID } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import { APP_NAME } from "@/lib/brand";
import {
  OWNER_EMAIL,
  isOwnerEmail,
  normalizeEmail,
  parseAccessStatus,
  strongerAccessStatus,
  type AccessMember,
  type AccessState,
  type AccessStatus,
} from "@/lib/access";

type MemberRow = {
  email: string;
  user_id: string | null;
  name: string | null;
  status: AccessStatus;
  token: string | null;
  requested_at: string;
  decided_at: string | null;
};

function newToken(): string {
  return randomBytes(24).toString("hex");
}

function publicOrigin(): string {
  try {
    const request = getRequest();
    if (!request) return "";
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const protoHeader = request.headers.get("x-forwarded-proto");
    if (host) {
      const hostname = host.split(",")[0]!.trim();
      const local = hostname.startsWith("127.0.0.1") || hostname.startsWith("localhost") || hostname.startsWith("[::1]");
      const proto = (protoHeader || (local ? "http" : "https")).split(",")[0]!.trim().replace(/:$/, "");
      return `${proto}://${hostname}`;
    }
    try {
      return new URL(request.url).origin;
    } catch {
      return "";
    }
  } catch {
    return "";
  }
}

export function buildMailto(name: string | null, email: string, token: string): string {
  const origin = publicOrigin();
  const link = `${origin}/api/godkann?token=${encodeURIComponent(token)}`;
  const subject = `${APP_NAME}: ${name || email} vill ha tillgång`;
  const body = [
    "Hej,",
    "",
    `${name || "En person"} (${email}) vill ha tillgång till ${APP_NAME}.`,
    "",
    "Godkänn eller neka med länken:",
    link,
    "",
    "Bara personer du godkänt kan logga in.",
    "",
    `— ${APP_NAME}`,
  ].join("\n");
  return `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function closedState(partial?: Partial<AccessState>): AccessState {
  return {
    status: "none",
    isAdmin: false,
    email: null,
    mailto: null,
    freshRequest: false,
    ...partial,
  };
}

async function profileForUserId(userId: string): Promise<{ email: string; name: string } | null> {
  const sql = await getSql();
  const rows = await sql<{ email: string; name: string }>`
    select email, name from "user" where id = ${userId} limit 1
  `;
  const row = rows[0];
  if (!row?.email) return null;
  return { email: normalizeEmail(row.email), name: row.name };
}

async function memberByEmail(email: string): Promise<MemberRow | null> {
  const sql = await getSql();
  const rows = await sql<MemberRow>`
    select email, user_id, name, status, token, requested_at::text, decided_at::text
    from access_members
    where lower(email) = ${email}
    limit 1
  `;
  return rows[0] ?? null;
}

async function ensurePendingToken(member: MemberRow): Promise<string> {
  if (member.token) return member.token;
  const token = newToken();
  const sql = await getSql();
  await sql`
    update access_members
    set token = ${token}
    where email = ${member.email} and token is null
  `;
  return token;
}

async function upsertOwner(userId: string, name: string): Promise<AccessState> {
  const sql = await getSql();
  await sql`
    insert into access_members (email, user_id, name, status, decided_at, decided_by)
    values (${OWNER_EMAIL}, ${userId}, ${name || "Ägare"}, 'approved', now(), 'system')
    on conflict (email) do update set
      user_id = excluded.user_id,
      name = excluded.name,
      status = 'approved'
  `;
  return closedState({
    status: "approved",
    isAdmin: true,
    email: OWNER_EMAIL,
  });
}

function pendingState(
  email: string,
  name: string | null,
  token: string,
  freshRequest: boolean,
): AccessState {
  return closedState({
    status: "pending",
    email,
    mailto: buildMailto(name, email, token),
    freshRequest,
  });
}

export async function getMyAccessForUserId(userId: string): Promise<AccessState> {
  const profile = await profileForUserId(userId);
  if (!profile) return closedState();
  if (isOwnerEmail(profile.email)) return upsertOwner(userId, profile.name);
  const member = await memberByEmail(profile.email);
  if (!member) return closedState({ email: profile.email });
  if (member.status === "approved") {
    const sql = await getSql();
    await sql`
      update access_members
      set user_id = ${userId}, name = ${member.name || profile.name}
      where email = ${profile.email}
    `;
    return closedState({ status: "approved", email: profile.email });
  }
  if (member.status === "pending") {
    const token = await ensurePendingToken(member);
    return pendingState(profile.email, member.name || profile.name, token, false);
  }
  return closedState({ status: member.status, email: profile.email });
}

export async function requestAccessForUserId(userId: string): Promise<AccessState> {
  const profile = await profileForUserId(userId);
  if (!profile) return closedState();
  if (isOwnerEmail(profile.email)) return upsertOwner(userId, profile.name);

  const existing = await memberByEmail(profile.email);
  if (existing?.status === "approved") {
    const sql = await getSql();
    await sql`
      update access_members
      set user_id = ${userId}, name = ${profile.name}
      where email = ${profile.email}
    `;
    return closedState({ status: "approved", email: profile.email });
  }
  if (existing?.status === "pending") {
    const token = await ensurePendingToken(existing);
    return pendingState(existing.email, existing.name || profile.name, token, false);
  }

  const token = existing?.token || newToken();
  const sql = await getSql();
  await sql`
    insert into access_members (email, user_id, name, status, token, requested_at)
    values (${profile.email}, ${userId}, ${profile.name}, 'pending', ${token}, now())
    on conflict (email) do update set
      user_id = excluded.user_id,
      name = excluded.name,
      status = 'pending',
      token = excluded.token,
      requested_at = now(),
      decided_at = null,
      decided_by = null
  `;
  const approveUrl = `${publicOrigin()}/api/godkann?token=${encodeURIComponent(token)}`;
  void import("@/lib/notify-owner.server")
    .then(({ notifyOwnerOfAccessRequest }) =>
      notifyOwnerOfAccessRequest({
        name: profile.name,
        email: profile.email,
        approveUrl,
      }),
    )
    .catch((err) => {
      console.error("owner access notification failed", err);
    });
  return pendingState(profile.email, profile.name, token, true);
}

async function requireAdmin(userId: string): Promise<void> {
  const profile = await profileForUserId(userId);
  if (!profile || !isOwnerEmail(profile.email)) {
    throw new Error("Forbidden");
  }
}

export async function listMembersForAdmin(userId: string): Promise<AccessMember[]> {
  await requireAdmin(userId);
  const sql = await getSql();
  const byEmail = new Map<string, AccessMember>();

  const users = await sql
    .query<{ email: string; name: string | null; requested_at: string }>(
      `select lower(trim(email)) as email, name, "createdAt"::text as requested_at from "user"`,
    )
    .catch((err) => {
      console.error("user table read failed", err);
      return [];
    });
  for (const row of users) {
    const email = normalizeEmail(row.email ?? "");
    if (!email.includes("@")) continue;
    byEmail.set(email, {
      email,
      name: row.name,
      status: isOwnerEmail(email) ? "approved" : "pending",
      requestedAt: row.requested_at,
      decidedAt: null,
    });
  }

  const members = await sql.query<MemberRow>(
    `select lower(trim(email)) as email, user_id, name, status, token, requested_at::text, decided_at::text from access_members`,
  );
  for (const row of members) {
    const email = normalizeEmail(row.email ?? "");
    if (!email.includes("@")) continue;
    const previous = byEmail.get(email);
    const status = isOwnerEmail(email)
      ? "approved"
      : strongerAccessStatus(parseAccessStatus(row.status), previous?.status ?? "none");
    byEmail.set(email, {
      email,
      name: row.name || previous?.name || null,
      status: status === "none" ? "pending" : status,
      requestedAt: row.requested_at || previous?.requestedAt || "",
      decidedAt: row.decided_at,
    });
  }

  return [...byEmail.values()].sort((a, b) => {
    const order = { pending: 0, approved: 1, denied: 2, none: 3 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.email.localeCompare(b.email);
  });
}

export async function decideMemberForAdmin(
  userId: string,
  email: string,
  status: "approved" | "denied",
): Promise<AccessMember[]> {
  await requireAdmin(userId);
  const normalized = normalizeEmail(email);
  if (isOwnerEmail(normalized) && status !== "approved") {
    throw new Error("Ägaren kan inte nekas.");
  }
  const sql = await getSql();
  const updated = await sql<{ email: string }>`
    update access_members
    set status = ${status},
        decided_at = now(),
        decided_by = ${OWNER_EMAIL},
        user_id = coalesce(
          user_id,
          (select id from "user" where lower(email) = ${normalized} limit 1)
        ),
        name = coalesce(
          name,
          (select name from "user" where lower(email) = ${normalized} limit 1)
        )
    where lower(email) = ${normalized}
    returning email
  `;
  if (!updated[0]) {
    await sql`
      insert into access_members (email, user_id, name, status, decided_at, decided_by)
      values (
        ${normalized},
        (select id from "user" where lower(email) = ${normalized} limit 1),
        coalesce((select name from "user" where lower(email) = ${normalized} limit 1), ${normalized}),
        ${status},
        now(),
        ${OWNER_EMAIL}
      )
    `;
  }
  return listMembersForAdmin(userId);
}

export async function inviteMemberForAdmin(userId: string, email: string, name: string): Promise<AccessMember[]> {
  await requireAdmin(userId);
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) throw new Error("Ogiltig e-post.");
  const sql = await getSql();
  await sql`
    insert into access_members (email, user_id, name, status, decided_at, decided_by)
    values (
      ${normalized},
      (select id from "user" where lower(email) = ${normalized} limit 1),
      ${name || null},
      'approved',
      now(),
      ${OWNER_EMAIL}
    )
    on conflict (email) do update set
      name = coalesce(excluded.name, access_members.name),
      status = 'approved',
      decided_at = now(),
      decided_by = ${OWNER_EMAIL}
  `;
  return listMembersForAdmin(userId);
}

export async function peekAccessToken(token: string): Promise<{ email: string; name: string | null; status: AccessStatus } | null> {
  if (!token) return null;
  const sql = await getSql();
  const rows = await sql<MemberRow>`
    select email, user_id, name, status, token, requested_at::text, decided_at::text
    from access_members
    where token = ${token}
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return { email: row.email, name: row.name, status: row.status };
}

export async function applyAccessToken(
  token: string,
  decision: "approved" | "denied",
): Promise<{ email: string; name: string | null; status: AccessStatus } | null> {
  const current = await peekAccessToken(token);
  if (!current) return null;
  if (isOwnerEmail(current.email) && decision !== "approved") {
    return { ...current, status: "approved" };
  }
  const sql = await getSql();
  await sql`
    update access_members
    set status = ${decision},
        decided_at = now(),
        decided_by = ${OWNER_EMAIL},
        user_id = coalesce(
          user_id,
          (select id from "user" where lower(email) = access_members.email limit 1)
        )
    where token = ${token}
  `;
  return { ...current, status: decision };
}

export async function setCredentialPassword(
  email: string,
  password: string,
  name?: string,
): Promise<void> {
  const normalized = normalizeEmail(email);
  const trimmed = password.trim();
  if (trimmed.length < 8) {
    throw new Error("Lösenordet måste vara minst 8 tecken.");
  }
  if (!normalized.includes("@")) {
    throw new Error("Ogiltig e-post.");
  }
  const { hashPassword } = await import("better-auth/crypto");
  const hashed = await hashPassword(trimmed);
  const sql = await getSql();
  const existing = await sql<{ id: string; name: string }>`
    select id, name from "user" where lower(email) = ${normalized} limit 1
  `;
  const displayName = name?.trim() || existing[0]?.name || normalized;
  const userId = existing[0]?.id ?? randomUUID();
  if (!existing[0]) {
    await sql`
      insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
      values (${userId}, ${displayName}, ${normalized}, true, now(), now())
    `;
  } else if (name?.trim()) {
    await sql`
      update "user"
      set name = ${displayName}, "updatedAt" = now()
      where id = ${userId}
    `;
  }
  const credential = await sql<{ id: string }>`
    select id from "account"
    where "userId" = ${userId} and "providerId" = 'credential'
    limit 1
  `;
  if (credential[0]) {
    await sql`
      update "account"
      set password = ${hashed}, "updatedAt" = now()
      where id = ${credential[0].id}
    `;
  } else {
    await sql`
      insert into "account" (
        id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
      )
      values (
        ${randomUUID()}, ${userId}, 'credential', ${userId}, ${hashed}, now(), now()
      )
    `;
  }
  if (isOwnerEmail(normalized)) {
    await upsertOwner(userId, displayName);
  }
}

export async function setOwnerCredentialPassword(password: string, name: string): Promise<void> {
  await setCredentialPassword(OWNER_EMAIL, password, name);
}

export async function changeOwnPassword(userId: string, password: string): Promise<void> {
  const profile = await profileForUserId(userId);
  if (!profile) throw new Error("Hittade inte kontot.");
  const access = await getMyAccessForUserId(userId);
  if (access.status !== "approved") throw new Error("Forbidden");
  await setCredentialPassword(profile.email, password, profile.name);
}

export async function setMemberPasswordForAdmin(
  adminId: string,
  email: string,
  password: string,
): Promise<void> {
  await requireAdmin(adminId);
  const normalized = normalizeEmail(email);
  if (!isOwnerEmail(normalized)) {
    const member = await memberByEmail(normalized);
    if (member?.status !== "approved") {
      throw new Error("Bara godkända personer kan få ett nytt lösenord.");
    }
  }
  await setCredentialPassword(normalized, password);
}
