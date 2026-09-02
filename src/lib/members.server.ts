import { getSql } from "@/lib/db";
import { getMyAccessForUserId } from "@/lib/access.server";
import {
  EMPTY_REGISTER,
  type AssociationMember,
  type MemberRegister,
} from "@/lib/members";

const REGISTER_ID = "members";

async function requireApproved(userId: string): Promise<void> {
  const access = await getMyAccessForUserId(userId);
  if (access.status !== "approved") throw new Error("Forbidden");
}

function asMember(raw: unknown): AssociationMember | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const name = String(row.name ?? "").trim();
  const email = String(row.email ?? "").trim().toLowerCase();
  if (!name && !email) return null;
  const share = Number(row.share);
  const fee = Number(row.fee);
  return {
    id: String(row.id ?? crypto.randomUUID()),
    name: name || email,
    email,
    property: String(row.property ?? "").trim(),
    address: String(row.address ?? "").trim(),
    share: Number.isFinite(share) && share > 0 ? share : 1,
    fee: Number.isFinite(fee) && fee > 0 ? Math.round(fee) : 0,
    note: String(row.note ?? "").trim(),
  };
}

function parseRegister(raw: unknown): MemberRegister {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const members = Array.isArray(data.members)
    ? data.members.map(asMember).filter((row): row is AssociationMember => row !== null)
    : [];
  return {
    members,
    defaultFee: Math.max(0, Math.round(Number(data.defaultFee) || 0)),
    dueDate: String(data.dueDate ?? ""),
    payment: String(data.payment ?? ""),
    message: String(data.message ?? ""),
  };
}

export async function loadMemberRegister(userId: string): Promise<MemberRegister> {
  await requireApproved(userId);
  const sql = await getSql();
  const rows = await sql.query<{ payload: unknown }>(
    `select payload from budget_ledger where id = $1 limit 1`,
    [REGISTER_ID],
  );
  if (!rows[0]) return EMPTY_REGISTER;
  return parseRegister(rows[0].payload);
}

export async function saveMemberRegister(userId: string, incoming: MemberRegister): Promise<MemberRegister> {
  await requireApproved(userId);
  const next = parseRegister(incoming);
  const sql = await getSql();
  await sql.query(
    `insert into budget_ledger (id, payload, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
    [REGISTER_ID, JSON.stringify(next)],
  );
  return next;
}
