import { randomBytes, randomUUID } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import { APP_NAME } from "@/lib/brand";
import {
  OWNER_EMAIL,
  asMemberList,
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
    where lower(trim(email)) = ${email}
    order by case status when 'approved' then 0 when 'pending' then 1 else 2 end
    limit 1
  `;
  return rows[0] ?? null;
}

async function memberForUser(userId: string, email: string): Promise<MemberRow | null> {
  const sql = await getSql();
  const rows = await sql<MemberRow>`
    select email, user_id, name, status, token, requested_at::text, decided_at::text
    from access_members
    where lower(trim(email)) = ${email} or user_id = ${userId}
    order by case status when 'approved' then 0 when 'pending' then 1 else 2 end
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
  const member = await memberForUser(userId, profile.email);
  const listed = (await readDirectory()).find((row) => row.email === profile.email);
  if ((listed && listed.status === "approved") || parseAccessStatus(member?.status) === "approved") {
    try {
      const sql = await getSql();
      await sql`
        insert into access_members (email, user_id, name, status, decided_at, decided_by)
        values (${profile.email}, ${userId}, ${member?.name || listed?.name || profile.name}, 'approved', now(), ${OWNER_EMAIL})
        on conflict (email) do update set
          user_id = excluded.user_id,
          name = coalesce(excluded.name, access_members.name),
          status = 'approved'
      `;
    } catch (err) {
      console.error("approved member sync failed", err);
    }
    return closedState({ status: "approved", email: profile.email });
  }
  if (!member) return closedState({ email: profile.email });
  const status = parseAccessStatus(member.status);
  if (status === "pending") {
    const token = await ensurePendingToken(member);
    return pendingState(profile.email, member.name || profile.name, token, false);
  }
  return closedState({ status, email: profile.email });
}

export async function requestAccessForUserId(userId: string): Promise<AccessState> {
  const profile = await profileForUserId(userId);
  if (!profile) return closedState();
  if (isOwnerEmail(profile.email)) return upsertOwner(userId, profile.name);

  const existing = await memberForUser(userId, profile.email);
  const listed = (await readDirectory()).find((row) => row.email === profile.email);
  if (
    parseAccessStatus(existing?.status) === "approved" ||
    listed?.status === "approved"
  ) {
    const saved = await upsertMemberStatus(profile.email, "approved", profile.name);
    await rememberMember({ ...saved, name: saved.name || profile.name });
    const sql = await getSql();
    await sql`
      update access_members
      set user_id = ${userId}, name = ${profile.name}
      where lower(trim(email)) = ${profile.email}
    `;
    return closedState({ status: "approved", email: profile.email });
  }
  if (existing && parseAccessStatus(existing.status) === "pending") {
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
      status = case
        when access_members.status = 'approved' then 'approved'
        else 'pending'
      end,
      token = case
        when access_members.status = 'approved' then access_members.token
        else excluded.token
      end,
      requested_at = case
        when access_members.status = 'approved' then access_members.requested_at
        else now()
      end,
      decided_at = case
        when access_members.status = 'approved' then access_members.decided_at
        else null
      end,
      decided_by = case
        when access_members.status = 'approved' then access_members.decided_by
        else null
      end
  `;
  const saved = await memberForUser(userId, profile.email);
  if (parseAccessStatus(saved?.status) === "approved") {
    return closedState({ status: "approved", email: profile.email });
  }
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

function toMember(row: {
  email?: string | null;
  name?: string | null;
  status?: string | null;
  requested_at?: string | null;
  decided_at?: string | null;
}): AccessMember | null {
  const email = normalizeEmail(row.email ?? "");
  if (!email.includes("@")) return null;
  const parsed = isOwnerEmail(email) ? "approved" : parseAccessStatus(row.status);
  return {
    email,
    name: row.name ? String(row.name) : null,
    status: parsed === "none" ? "pending" : parsed,
    requestedAt: String(row.requested_at ?? ""),
    decidedAt: row.decided_at ? String(row.decided_at) : null,
  };
}

function sortMembers(members: AccessMember[]): AccessMember[] {
  const order = { pending: 0, approved: 1, denied: 2, none: 3 };
  return [...members].sort(
    (a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.email.localeCompare(b.email),
  );
}

function mergeMembers(...groups: AccessMember[][]): AccessMember[] {
  const byEmail = new Map<string, AccessMember>();
  for (const group of groups) {
    for (const member of group) {
      const previous = byEmail.get(member.email);
      if (!previous) {
        byEmail.set(member.email, member);
        continue;
      }
      byEmail.set(member.email, {
        email: member.email,
        name: member.name || previous.name,
        status: strongerAccessStatus(member.status, previous.status),
        requestedAt: member.requestedAt || previous.requestedAt,
        decidedAt: member.decidedAt || previous.decidedAt,
      });
    }
  }
  return sortMembers([...byEmail.values()]);
}

const DIRECTORY_ID = "directory";

async function readDirectory(): Promise<AccessMember[]> {
  const sql = await getSql();
  const rows = await sql
    .query<{ payload: unknown }>(`select payload from budget_ledger where id = $1 limit 1`, [DIRECTORY_ID])
    .catch(() => []);
  const payload = rows[0]?.payload;
  if (Array.isArray(payload)) return asMemberList(payload);
  if (payload && typeof payload === "object") {
    return asMemberList((payload as { members?: unknown }).members ?? payload);
  }
  return [];
}

async function writeDirectory(members: AccessMember[]): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `insert into budget_ledger (id, payload, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
    [DIRECTORY_ID, JSON.stringify({ members })],
  );
}

async function rememberMember(member: AccessMember): Promise<AccessMember[]> {
  const directory = mergeMembers(await readDirectory(), [member]);
  try {
    await writeDirectory(directory);
  } catch (err) {
    console.error("directory write failed", err);
  }
  return directory;
}

async function readMemberRows(): Promise<AccessMember[]> {
  const sql = await getSql();
  const users = await sql
    .query<{ email: string; name: string | null; requested_at: string }>(
      `select lower(trim(email)) as email, name, "createdAt"::text as requested_at from "user"`,
    )
    .catch((err) => {
      console.error("user table read failed", err);
      return [];
    });
  const fromUsers = users.flatMap((row) => {
    const member = toMember({
      ...row,
      status: isOwnerEmail(row.email) ? "approved" : "pending",
    });
    return member ? [member] : [];
  });
  const rows = await sql
    .query<{
      email: string;
      name: string | null;
      status: string;
      requested_at: string;
      decided_at: string | null;
    }>(
      `select lower(trim(email)) as email, name, status, requested_at::text as requested_at, decided_at::text as decided_at from access_members`,
    )
    .catch((err) => {
      console.error("access_members read failed", err);
      return [];
    });
  const fromMembers = rows.flatMap((row) => {
    const member = toMember(row);
    return member ? [member] : [];
  });
  return mergeMembers(fromUsers, fromMembers, await readDirectory());
}

async function upsertMemberStatus(
  email: string,
  status: "approved" | "denied",
  name?: string,
): Promise<AccessMember> {
  const fallback: AccessMember = {
    email,
    name: name?.trim() || null,
    status,
    requestedAt: new Date().toISOString(),
    decidedAt: new Date().toISOString(),
  };
  try {
    const sql = await getSql();
    await sql.query(`delete from access_members where lower(trim(email)) = $1 and email <> $1`, [email]);
    const rows = await sql.query<{
      email: string;
      name: string | null;
      status: string;
      requested_at: string;
      decided_at: string | null;
    }>(
      `insert into access_members (email, name, status, decided_at, decided_by)
       values ($1, nullif($2, ''), $3, now(), $4)
       on conflict (email) do update set
         name = coalesce(nullif(excluded.name, ''), access_members.name),
         status = excluded.status,
         decided_at = now(),
         decided_by = excluded.decided_by
       returning lower(trim(email)) as email, name, status, requested_at::text as requested_at, decided_at::text as decided_at`,
      [email, name?.trim() || "", status, OWNER_EMAIL],
    );
    return toMember(rows[0] ?? fallback) ?? fallback;
  } catch (err) {
    console.error("access_members upsert failed", err);
    return fallback;
  }
}

export async function listMembersForAdmin(userId: string): Promise<AccessMember[]> {
  await requireAdmin(userId);
  return readMemberRows();
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
  const saved = await upsertMemberStatus(normalized, status);
  const directory = await rememberMember(saved);
  return mergeMembers(await readMemberRows(), directory, [saved]);
}

export async function inviteMemberForAdmin(userId: string, email: string, name: string): Promise<AccessMember[]> {
  await requireAdmin(userId);
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) throw new Error("Ogiltig e-post.");
  const saved = await upsertMemberStatus(normalized, "approved", name);
  const directory = await rememberMember(saved);
  return mergeMembers(await readMemberRows(), directory, [saved]);
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
  await rememberMember({
    email: normalizeEmail(current.email),
    name: current.name,
    status: decision,
    requestedAt: "",
    decidedAt: new Date().toISOString(),
  });
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
