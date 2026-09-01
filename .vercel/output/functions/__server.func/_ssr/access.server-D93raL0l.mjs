import { o as getRequest, s as __exportAll } from "./ssr.mjs";
import { r as getSql } from "./db-CGFkUWQz.mjs";
import { randomBytes } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/access.server-D93raL0l.js
var APP_NAME = "Koholma Byväg Samfällighet";
var OWNER_EMAIL = "biskopsgrand@gmail.com";
function normalizeEmail(email) {
	return email.trim().toLowerCase();
}
function isOwnerEmail(email) {
	return normalizeEmail(email ?? "") === OWNER_EMAIL;
}
function isApproved(status) {
	return status === "approved";
}
var access_server_exports = /* @__PURE__ */ __exportAll({
	applyAccessToken: () => applyAccessToken,
	buildMailto: () => buildMailto,
	decideMemberForAdmin: () => decideMemberForAdmin,
	getMyAccessForUserId: () => getMyAccessForUserId,
	inviteMemberForAdmin: () => inviteMemberForAdmin,
	listMembersForAdmin: () => listMembersForAdmin,
	peekAccessToken: () => peekAccessToken,
	requestAccessForUserId: () => requestAccessForUserId
});
function newToken() {
	return randomBytes(24).toString("hex");
}
function publicOrigin() {
	try {
		const request = getRequest();
		if (!request) return "";
		const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
		const protoHeader = request.headers.get("x-forwarded-proto");
		if (host) {
			const hostname = host.split(",")[0].trim();
			const local = hostname.startsWith("127.0.0.1") || hostname.startsWith("localhost") || hostname.startsWith("[::1]");
			return `${(protoHeader || (local ? "http" : "https")).split(",")[0].trim().replace(/:$/, "")}://${hostname}`;
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
function buildMailto(name, email, token) {
	const link = `${publicOrigin()}/api/godkann?token=${encodeURIComponent(token)}`;
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
		`— ${APP_NAME}`
	].join("\n");
	return `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
function closedState(partial) {
	return {
		status: "none",
		isAdmin: false,
		email: null,
		mailto: null,
		freshRequest: false,
		...partial
	};
}
async function profileForUserId(userId) {
	const row = (await (await getSql())`
    select email, name from "user" where id = ${userId} limit 1
  `)[0];
	if (!row?.email) return null;
	return {
		email: normalizeEmail(row.email),
		name: row.name
	};
}
async function memberByEmail(email) {
	return (await (await getSql())`
    select email, user_id, name, status, token, requested_at::text, decided_at::text
    from access_members
    where email = ${email}
    limit 1
  `)[0] ?? null;
}
async function ensurePendingToken(member) {
	if (member.token) return member.token;
	const token = newToken();
	await (await getSql())`
    update access_members
    set token = ${token}
    where email = ${member.email} and token is null
  `;
	return token;
}
async function upsertOwner(userId, name) {
	await (await getSql())`
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
		email: OWNER_EMAIL
	});
}
function pendingState(email, name, token, freshRequest) {
	return closedState({
		status: "pending",
		email,
		mailto: buildMailto(name, email, token),
		freshRequest
	});
}
async function getMyAccessForUserId(userId) {
	const profile = await profileForUserId(userId);
	if (!profile) return closedState();
	if (isOwnerEmail(profile.email)) return upsertOwner(userId, profile.name);
	const member = await memberByEmail(profile.email);
	if (!member) return closedState({ email: profile.email });
	if (member.status === "approved") {
		await (await getSql())`
      update access_members
      set user_id = ${userId}, name = ${member.name || profile.name}
      where email = ${profile.email}
    `;
		return closedState({
			status: "approved",
			email: profile.email
		});
	}
	if (member.status === "pending") {
		const token = await ensurePendingToken(member);
		return pendingState(profile.email, member.name || profile.name, token, false);
	}
	return closedState({
		status: member.status,
		email: profile.email
	});
}
async function requestAccessForUserId(userId) {
	const profile = await profileForUserId(userId);
	if (!profile) return closedState();
	if (isOwnerEmail(profile.email)) return upsertOwner(userId, profile.name);
	const existing = await memberByEmail(profile.email);
	if (existing?.status === "approved") {
		await (await getSql())`
      update access_members
      set user_id = ${userId}, name = ${profile.name}
      where email = ${profile.email}
    `;
		return closedState({
			status: "approved",
			email: profile.email
		});
	}
	if (existing?.status === "pending") {
		const token = await ensurePendingToken(existing);
		return pendingState(existing.email, existing.name || profile.name, token, false);
	}
	const token = existing?.token || newToken();
	await (await getSql())`
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
	return pendingState(profile.email, profile.name, token, true);
}
async function requireAdmin(userId) {
	const profile = await profileForUserId(userId);
	if (!profile || !isOwnerEmail(profile.email)) throw new Error("Forbidden");
}
async function listMembersForAdmin(userId) {
	await requireAdmin(userId);
	return (await (await getSql())`
    select email, user_id, name, status, token, requested_at::text, decided_at::text
    from access_members
    order by
      case status when 'pending' then 0 when 'approved' then 1 else 2 end,
      requested_at desc
  `).map((row) => ({
		email: row.email,
		name: row.name,
		status: row.status,
		requestedAt: row.requested_at,
		decidedAt: row.decided_at
	}));
}
async function decideMemberForAdmin(userId, email, status) {
	await requireAdmin(userId);
	const normalized = normalizeEmail(email);
	if (isOwnerEmail(normalized) && status !== "approved") throw new Error("Ägaren kan inte nekas.");
	await (await getSql())`
    update access_members
    set status = ${status},
        decided_at = now(),
        decided_by = ${OWNER_EMAIL}
    where email = ${normalized}
  `;
}
async function inviteMemberForAdmin(userId, email, name) {
	await requireAdmin(userId);
	const normalized = normalizeEmail(email);
	if (!normalized.includes("@")) throw new Error("Ogiltig e-post.");
	await (await getSql())`
    insert into access_members (email, name, status, decided_at, decided_by)
    values (${normalized}, ${name || null}, 'approved', now(), ${OWNER_EMAIL})
    on conflict (email) do update set
      name = coalesce(excluded.name, access_members.name),
      status = 'approved',
      decided_at = now(),
      decided_by = ${OWNER_EMAIL}
  `;
}
async function peekAccessToken(token) {
	if (!token) return null;
	const row = (await (await getSql())`
    select email, user_id, name, status, token, requested_at::text, decided_at::text
    from access_members
    where token = ${token}
    limit 1
  `)[0];
	if (!row) return null;
	return {
		email: row.email,
		name: row.name,
		status: row.status
	};
}
async function applyAccessToken(token, decision) {
	const current = await peekAccessToken(token);
	if (!current) return null;
	if (isOwnerEmail(current.email) && decision !== "approved") return {
		...current,
		status: "approved"
	};
	await (await getSql())`
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
	return {
		...current,
		status: decision
	};
}
//#endregion
export { isApproved as a, OWNER_EMAIL as i, applyAccessToken as n, APP_NAME as o, peekAccessToken as r, access_server_exports as t };
