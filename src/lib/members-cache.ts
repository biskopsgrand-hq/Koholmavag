import { EMPTY_REGISTER, type MemberRegister } from "@/lib/members";

const KEY = "koholma-members-v1";

export function readMemberCache(): MemberRegister | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MemberRegister;
    if (!Array.isArray(parsed.members) || parsed.members.length === 0) return null;
    return {
      ...EMPTY_REGISTER,
      ...parsed,
      members: parsed.members,
      deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
    };
  } catch {
    return null;
  }
}

export function writeMemberCache(register: MemberRegister) {
  try {
    localStorage.setItem(KEY, JSON.stringify(register));
  } catch {
    /* ignore quota */
  }
}
