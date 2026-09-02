import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { MemberRegister } from "@/lib/members";

export const loadMembers = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(() => ({}))
  .handler(async ({ context }): Promise<MemberRegister> => {
    const { loadMemberRegister } = await import("@/lib/members.server");
    return loadMemberRegister(context.userId);
  });

export const saveMembers = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: MemberRegister) => input)
  .handler(async ({ context, data }): Promise<MemberRegister> => {
    const { saveMemberRegister } = await import("@/lib/members.server");
    return saveMemberRegister(context.userId, data);
  });
