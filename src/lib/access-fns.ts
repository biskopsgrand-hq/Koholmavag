import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { AccessMember, AccessState } from "@/lib/access";

export const getMyAccess = createServerFn({ method: "GET" })
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

export const listAccessMembers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AccessMember[]> => {
    const { listMembersForAdmin } = await import("@/lib/access.server");
    return listMembersForAdmin(context.userId);
  });

export const decideAccessMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { email: string; status: "approved" | "denied" }) => input)
  .handler(async ({ context, data }): Promise<void> => {
    const { decideMemberForAdmin } = await import("@/lib/access.server");
    await decideMemberForAdmin(context.userId, data.email, data.status);
  });

export const inviteAccessMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { email: string; name: string }) => input)
  .handler(async ({ context, data }): Promise<void> => {
    const { inviteMemberForAdmin } = await import("@/lib/access.server");
    await inviteMemberForAdmin(context.userId, data.email, data.name);
  });

export const setOwnerPassword = createServerFn({ method: "POST" })
  .validator((input: { password: string; name: string }) => input)
  .handler(async ({ data }): Promise<void> => {
    const { setOwnerCredentialPassword } = await import("@/lib/access.server");
    await setOwnerCredentialPassword(data.password, data.name);
  });
