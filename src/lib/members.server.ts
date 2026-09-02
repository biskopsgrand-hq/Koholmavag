import { getSql } from "@/lib/db";
import { getMyAccessForUserId } from "@/lib/access.server";
import {
  EMPTY_REGISTER,
  ensurePostal,
  mergeMemberLists,
  repairMember,
  type AssociationMember,
  type MemberRegister,
} from "@/lib/members";
import { KOHOLMA_MEMBERS } from "@/lib/members-seed";

const REGISTER_ID = "members";
const BACKUP_ID = "members-backup";

async function requireApproved(userId: string): Promise<void> {
  const access = await getMyAccessForUserId(userId);
  if (access.status !== "approved") throw new Error("Forbidden");
}

function asRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function asMember(raw: unknown): AssociationMember | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const name = String(row.name ?? "").trim();
  const email = String(row.email ?? "").trim().toLowerCase();
  const property = String(row.property ?? "").trim();
  if (!name && !email && !property) return null;
  const share = Number(row.share);
  const fee = Number(row.fee);
  const mapped: AssociationMember = {
    id: String(row.id ?? crypto.randomUUID()),
    name: name || property || email || "Medlem",
    email,
    property,
    address: String(row.address ?? "").trim(),
    zip: String(row.zip ?? row.postnr ?? "").trim(),
    city: String(row.city ?? row.postort ?? "").trim(),
    postal: String(row.postal ?? "").trim(),
    phone: String(row.phone ?? row.telefon ?? "").trim(),
    customerNo: String(row.customerNo ?? "").trim(),
    share: Number.isFinite(share) && share > 0 ? share : 1,
    fee: Number.isFinite(fee) && fee > 0 ? Math.round(fee) : 0,
    note: String(row.note ?? "").trim(),
  };
  const filled = ensurePostal(mapped);
  if (filled.phone || filled.address || filled.email || filled.zip || filled.city || filled.postal) return filled;
  return repairMember(filled);
}

function parseRegister(raw: unknown): MemberRegister {
  const data = asRecord(raw);
  const members = Array.isArray(data.members)
    ? data.members.map(asMember).filter((row): row is AssociationMember => row !== null)
    : [];
  const deletedIds = Array.isArray(data.deletedIds)
    ? data.deletedIds.map((id) => String(id)).filter(Boolean)
    : [];
  return {
    members,
    deletedIds,
    defaultFee: Math.max(0, Math.round(Number(data.defaultFee) || 0)),
    dueDate: String(data.dueDate ?? ""),
    payment: String(data.payment ?? ""),
    message: String(data.message ?? ""),
    listId: String(data.listId ?? ""),
  };
}

async function readRow(id: string): Promise<MemberRegister> {
  const sql = await getSql();
  const rows = await sql.query<{ payload: unknown }>(
    `select payload from budget_ledger where id = $1 limit 1`,
    [id],
  );
  if (!rows[0]) return EMPTY_REGISTER;
  return parseRegister(rows[0].payload);
}

async function writeRow(id: string, register: MemberRegister): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `insert into budget_ledger (id, payload, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
    [id, JSON.stringify(register)],
  );
}

export async function loadMemberRegister(userId: string): Promise<MemberRegister> {
  await requireApproved(userId);
  const live = await readRow(REGISTER_ID);
  const backup = await readRow(BACKUP_ID);
  const members = mergeMemberLists(
    [KOHOLMA_MEMBERS, live.members, backup.members],
    KOHOLMA_MEMBERS,
  ).map(ensurePostal);
  const recovered: MemberRegister = {
    ...EMPTY_REGISTER,
    ...live,
    defaultFee: live.defaultFee || backup.defaultFee,
    dueDate: live.dueDate || backup.dueDate,
    payment: live.payment || backup.payment,
    message: live.message || backup.message,
    listId: live.listId || backup.listId || "",
    deletedIds: [...new Set([...live.deletedIds, ...backup.deletedIds])],
    members,
  };
  const livePhones = live.members.filter((row) => row.phone.trim()).length;
  const recoveredPhones = members.filter((row) => row.phone.trim()).length;
  const liveZip = live.members.filter((row) => (row.zip || row.city || "").trim()).length;
  const recoveredZip = members.filter((row) => (row.zip || row.city || "").trim()).length;
  if (recoveredPhones > livePhones || recoveredZip > liveZip || (live.members.length === 0 && members.length > 0)) {
    await writeRow(REGISTER_ID, recovered);
  }
  return recovered;
}

export async function saveMemberRegister(userId: string, incoming: MemberRegister): Promise<MemberRegister> {
  await requireApproved(userId);
  const parsed = parseRegister(incoming);
  const existing = await readRow(REGISTER_ID);
  const fallback = existing.members.length > 0 ? existing : await readRow(BACKUP_ID);
  const replaceAll = parsed.deletedIds.includes("__all__");
  if (replaceAll) {
    const next: MemberRegister = {
      ...EMPTY_REGISTER,
      ...parsed,
      deletedIds: fallback.members.map((member) => member.id),
      members: parsed.members,
    };
    if (fallback.members.length > 0) await writeRow(BACKUP_ID, fallback);
    await writeRow(REGISTER_ID, next);
    return next;
  }
  const deleted = [...new Set([...fallback.deletedIds, ...parsed.deletedIds])];
  const deletedSet = new Set(deleted);
  if (fallback.members.length > 0 && parsed.members.length === 0 && parsed.deletedIds.length === 0) {
    return fallback;
  }
  const merged: MemberRegister = {
    defaultFee: parsed.defaultFee || fallback.defaultFee,
    dueDate: parsed.dueDate || fallback.dueDate,
    payment: parsed.payment || fallback.payment,
    message: parsed.message || fallback.message,
    listId: parsed.listId || fallback.listId || "",
    deletedIds: deleted,
    members: mergeMemberLists([fallback.members, parsed.members], KOHOLMA_MEMBERS).filter(
      (member) => !deletedSet.has(member.id),
    ),
  };
  if (fallback.members.length > 0) await writeRow(BACKUP_ID, fallback);
  await writeRow(REGISTER_ID, merged);
  return merged;
}
