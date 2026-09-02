import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { AccessMember, AccessState } from "@/lib/access";

export const getMyAccess = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AccessState> => {
    const { getMyAccessForUserId } = await import("@/lib/access.server");
    return getMyAccessForUserId(context.userId);
  });

export const requestAccess = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AccessState> => {
    const { requestAccessForUserId } = await import("@/lib/access.server");
    return requestAccessForUserId(context.userId);
  });

export const listAccessMembers = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AccessMember[]> => {
    const { listMembersForAdmin } = await import("@/lib/access.server");
    return listMembersForAdmin(context.userId);
  });

export const decideAccessMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { email: string; status: "approved" | "denied" }) => input)
  .handler(async ({ context, data }): Promise<AccessMember[]> => {
    const { decideMemberForAdmin } = await import("@/lib/access.server");
    return decideMemberForAdmin(context.userId, data.email, data.status);
  });

export const inviteAccessMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { email: string; name: string }) => input)
  .handler(async ({ context, data }): Promise<AccessMember[]> => {
    const { inviteMemberForAdmin } = await import("@/lib/access.server");
    return inviteMemberForAdmin(context.userId, data.email, data.name);
  });

export const setOwnerPassword = createServerFn({ method: "POST" })
  .validator((input: { password: string; name: string }) => input)
  .handler(async ({ data }): Promise<void> => {
    const { setOwnerCredentialPassword } = await import("@/lib/access.server");
    await setOwnerCredentialPassword(data.password, data.name);
  });

export const changeOwnPassword = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { password: string; confirm: string }) => input)
  .handler(async ({ context, data }): Promise<void> => {
    if (data.password.trim() !== data.confirm.trim()) {
      throw new Error("Lösenorden stämmer inte överens.");
    }
    const { changeOwnPassword: save } = await import("@/lib/access.server");
    await save(context.userId, data.password);
  });

export const setMemberPassword = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { email: string; password: string }) => input)
  .handler(async ({ context, data }): Promise<void> => {
    const { setMemberPasswordForAdmin } = await import("@/lib/access.server");
    await setMemberPasswordForAdmin(context.userId, data.email, data.password);
  });
