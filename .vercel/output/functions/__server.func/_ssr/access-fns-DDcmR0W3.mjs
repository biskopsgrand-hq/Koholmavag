import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { t as authMiddleware } from "./middleware-Ciqh_WMw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/access-fns-DDcmR0W3.js
var getMyAccess_createServerFn_handler = createServerRpc({
	id: "f67051883ae23305a9bbdb1147bdecb7c3758a60b7fd65b055771224b3d7ccc8",
	name: "getMyAccess",
	filename: "src/lib/access-fns.ts"
}, (opts) => getMyAccess.__executeServer(opts));
var getMyAccess = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(getMyAccess_createServerFn_handler, async ({ context }) => {
	const { getMyAccessForUserId } = await import("./access.server-uGIuNPF4.mjs").then((n) => n.t);
	return getMyAccessForUserId(context.userId);
});
var requestAccess_createServerFn_handler = createServerRpc({
	id: "ef5360fe45e2500755dea6c2ac635a7a1eef4721f364dbd73438454c9c8a50f2",
	name: "requestAccess",
	filename: "src/lib/access-fns.ts"
}, (opts) => requestAccess.__executeServer(opts));
var requestAccess = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(requestAccess_createServerFn_handler, async ({ context }) => {
	const { requestAccessForUserId } = await import("./access.server-uGIuNPF4.mjs").then((n) => n.t);
	return requestAccessForUserId(context.userId);
});
var listAccessMembers_createServerFn_handler = createServerRpc({
	id: "c992ae44bf969bf4a4dffa9e5990731ca306c2c1771ec69aaf1bb594c0623a9e",
	name: "listAccessMembers",
	filename: "src/lib/access-fns.ts"
}, (opts) => listAccessMembers.__executeServer(opts));
var listAccessMembers = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listAccessMembers_createServerFn_handler, async ({ context }) => {
	const { listMembersForAdmin } = await import("./access.server-uGIuNPF4.mjs").then((n) => n.t);
	return listMembersForAdmin(context.userId);
});
var decideAccessMember_createServerFn_handler = createServerRpc({
	id: "f734280cff002c73a40ec796e30d99a20d8cf281164d7f1923f62e19eba8916c",
	name: "decideAccessMember",
	filename: "src/lib/access-fns.ts"
}, (opts) => decideAccessMember.__executeServer(opts));
var decideAccessMember = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(decideAccessMember_createServerFn_handler, async ({ context, data }) => {
	const { decideMemberForAdmin } = await import("./access.server-uGIuNPF4.mjs").then((n) => n.t);
	await decideMemberForAdmin(context.userId, data.email, data.status);
});
var inviteAccessMember_createServerFn_handler = createServerRpc({
	id: "8dcb9d3f37b35b435c4f69c3334a9e36cc273368f782b420ffcbadd6f96529b5",
	name: "inviteAccessMember",
	filename: "src/lib/access-fns.ts"
}, (opts) => inviteAccessMember.__executeServer(opts));
var inviteAccessMember = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(inviteAccessMember_createServerFn_handler, async ({ context, data }) => {
	const { inviteMemberForAdmin } = await import("./access.server-uGIuNPF4.mjs").then((n) => n.t);
	await inviteMemberForAdmin(context.userId, data.email, data.name);
});
//#endregion
export { decideAccessMember_createServerFn_handler, getMyAccess_createServerFn_handler, inviteAccessMember_createServerFn_handler, listAccessMembers_createServerFn_handler, requestAccess_createServerFn_handler };
