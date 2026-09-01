import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as Link, v as Navigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { N as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { r as createServerFn } from "./ssr.mjs";
import { t as authMiddleware } from "./middleware-Ciqh_WMw.mjs";
import { a as isApproved, i as OWNER_EMAIL } from "./access.server-uGIuNPF4.mjs";
import { i as signOut } from "./client-B40BzJxt.mjs";
import { o as useCurrentUserState, t as Button } from "./label-BRi1-1MI.mjs";
import { n as createSsrRpc } from "./router-D0ieqxp-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/account-chip-WuqQSmsk.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Auth state components — plain wrappers around `useCurrentUserState()`.
*
* With auth on, visitors are signed out until they authenticate — in the sandbox
* live preview too, which does real sign-in. The shared dev user appears only
* when auth is disabled (`VITE_AUTH_ENABLED=false`, the shipped default).
* While the session is still resolving, gates that care about signed-out state
* render nothing so there's no signed-out flash on hard reload.
*/
/** Where `RedirectToSignIn` sends signed-out visitors. Create this route. */
var SIGN_IN_PATH = "/login";
/**
* Client-side redirect to the sign-in route (TanStack `<Navigate>` — NOT a full
* `window.location` reload). A hard navigation re-bootstraps the SPA and re-runs
* session loading, which feels like a second "Loading…" on /login.
*
* Guard routes by waiting out `isPending` first (see `use-current-user`), then
* render this.
*/
function RedirectToSignIn({ to = SIGN_IN_PATH }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to });
}
var getMyAccess = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("f67051883ae23305a9bbdb1147bdecb7c3758a60b7fd65b055771224b3d7ccc8"));
var requestAccess = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(createSsrRpc("ef5360fe45e2500755dea6c2ac635a7a1eef4721f364dbd73438454c9c8a50f2"));
var listAccessMembers = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("c992ae44bf969bf4a4dffa9e5990731ca306c2c1771ec69aaf1bb594c0623a9e"));
var decideAccessMember = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("f734280cff002c73a40ec796e30d99a20d8cf281164d7f1923f62e19eba8916c"));
var inviteAccessMember = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => input).handler(createSsrRpc("8dcb9d3f37b35b435c4f69c3334a9e36cc273368f782b420ffcbadd6f96529b5"));
var AccessContext = (0, import_react.createContext)(null);
function useAccess() {
	return (0, import_react.useContext)(AccessContext);
}
function AuthGate({ children }) {
	const { user, isPending } = useCurrentUserState();
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthPending, {});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthPending, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {})] });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccessGate, { children });
}
function AccessGate({ children }) {
	const [access, setAccess] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		getMyAccess().then(async (state) => {
			if (cancelled) return;
			if (state.status === "none") {
				const created = await requestAccess();
				if (!cancelled) setAccess({
					...created,
					freshRequest: true
				});
				return;
			}
			setAccess(state);
		}).catch((err) => {
			if (cancelled) return;
			if ((err instanceof Error ? err.message : "") === "Unauthorized") {
				setError("session");
				return;
			}
			console.error("access check failed", err);
			setError("Kunde inte kontrollera behörighet.");
		});
		return () => {
			cancelled = true;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (access?.status !== "pending") return;
		const timer = window.setInterval(() => {
			getMyAccess().then((state) => {
				setAccess((prev) => ({
					...state,
					freshRequest: false,
					mailto: state.mailto ?? prev?.mailto ?? null
				}));
			}).catch(() => {});
		}, 12e3);
		return () => window.clearInterval(timer);
	}, [access?.status]);
	if (error === "session") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthPending, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {})] });
	if (!access && !error) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthPending, {});
	if (error) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PendingShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-3xl font-medium tracking-tight text-ink",
			children: "Något gick fel"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-muted",
			children: error
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignOutButton, {})
	] });
	if (!access || !isApproved(access.status)) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccessContext.Provider, {
		value: access,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PendingAccess, {
			access,
			onRefresh: async () => {
				const state = await getMyAccess();
				setAccess({
					...state,
					freshRequest: false
				});
			}
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccessContext.Provider, {
		value: access,
		children
	});
}
function PendingAccess({ access, onRefresh }) {
	const denied = access?.status === "denied";
	const mailto = access?.mailto ?? null;
	const [checking, setChecking] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PendingShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs font-medium tracking-widest text-muted uppercase",
			children: "Privat app"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "mt-2 font-display text-3xl font-medium tracking-tight text-ink",
			children: denied ? "Åtkomst nekad" : "Väntar på godkännande"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 text-sm leading-relaxed text-muted",
			children: denied ? `Du har inte tillgång till Saldo. Kontakta ${OWNER_EMAIL} om det är fel.` : `Saldo är inte öppet för alla. Ett mejl till ${OWNER_EMAIL} måste godkännas innan du kommer in.`
		}),
		access?.email ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 break-all rounded-lg bg-bg px-3 py-2 text-sm text-ink",
			children: access.email
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 text-sm text-muted",
			children: "Vi kunde inte läsa din e-post. Logga in med Google eller e-post och lösenord."
		}),
		!denied && mailto ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			className: "mt-6 w-full",
			size: "lg",
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: mailto,
				children: "Skicka godkännandemejl"
			})
		}) : null,
		!denied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			type: "button",
			variant: "outline",
			className: "mt-3 w-full",
			disabled: checking,
			onClick: () => {
				setChecking(true);
				onRefresh().finally(() => setChecking(false));
			},
			children: checking ? "Kollar…" : "Jag är godkänd — öppna Saldo"
		}) : null,
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-4 text-sm text-muted",
			children: denied ? "Nekade konton kommer inte in i budgeten." : "Öppna mejlet, skicka det, och vänta tills du fått godkännande. Sedan kan du logga in."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignOutButton, {})
	] });
}
function PendingShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "grid min-h-dvh place-items-center overflow-x-clip bg-bg px-4 py-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "w-full max-w-md rounded-2xl bg-surface p-6 shadow-[var(--shadow-raised)] sm:p-8",
			children
		})
	});
}
function SignOutButton() {
	const [signingOut, setSigningOut] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
		type: "button",
		variant: "outline",
		className: "mt-4 w-full",
		disabled: signingOut,
		onClick: () => {
			setSigningOut(true);
			signOut().catch(() => setSigningOut(false));
		},
		children: signingOut ? "Loggar ut…" : "Logga ut"
	});
}
function AuthPending() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid min-h-dvh place-items-center bg-bg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col items-center gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium tracking-widest text-muted uppercase",
				children: "Saldo"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-1.5 w-20 animate-pulse rounded-full bg-surface-2" })]
		})
	});
}
function AdminNav() {
	if (!useAccess()?.isAdmin) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
		variant: "outline",
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/godkannanden",
			children: "Godkännanden"
		})
	});
}
function AccountChip() {
	const { user, isPending } = useCurrentUserState();
	const [signingOut, setSigningOut] = (0, import_react.useState)(false);
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-11 w-36 animate-pulse rounded-md bg-surface-2" });
	if (!user) return null;
	const label = user.displayName ?? user.primaryEmail ?? "Konto";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-w-0 items-center gap-2",
		children: [
			user.profileImageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: user.profileImageUrl,
				alt: "",
				className: "size-8 shrink-0 rounded-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-medium text-ink",
				children: label.charAt(0).toUpperCase()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "hidden max-w-28 truncate text-sm font-medium text-ink sm:inline",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "outline",
				disabled: signingOut,
				onClick: () => {
					setSigningOut(true);
					signOut().catch(() => setSigningOut(false));
				},
				children: signingOut ? "Loggar ut…" : "Logga ut"
			})
		]
	});
}
//#endregion
export { inviteAccessMember as a, decideAccessMember as i, AdminNav as n, listAccessMembers as o, AuthGate as r, useAccess as s, AccountChip as t };
