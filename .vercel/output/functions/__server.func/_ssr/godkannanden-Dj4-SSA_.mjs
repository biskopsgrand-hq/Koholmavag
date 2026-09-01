import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { N as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as OWNER_EMAIL } from "./access.server-uGIuNPF4.mjs";
import { n as Input, r as Label, t as Button } from "./label-BRi1-1MI.mjs";
import { f as ArrowLeft } from "../_libs/lucide-react.mjs";
import { a as inviteAccessMember, i as decideAccessMember, o as listAccessMembers, r as AuthGate, s as useAccess, t as AccountChip } from "./account-chip-WuqQSmsk.mjs";
import { n as toast, t as Toaster } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/godkannanden-Dj4-SSA_.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AccessAdminPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthGate, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "min-h-dvh overflow-x-clip bg-bg text-ink",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccessAdmin, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
			position: "top-center",
			offset: 16,
			toastOptions: { className: "!bg-surface !text-ink !border-0 !shadow-[var(--shadow-raised)] !font-sans" }
		})]
	}) });
}
function AccessAdmin() {
	const access = useAccess();
	const [members, setMembers] = (0, import_react.useState)(null);
	const [email, setEmail] = (0, import_react.useState)("");
	const [name, setName] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(null);
	async function reload() {
		const rows = await listAccessMembers();
		setMembers(rows);
	}
	(0, import_react.useEffect)(() => {
		if (!access?.isAdmin) return;
		reload().catch(() => toast.error("Kunde inte hämta listan."));
	}, [access?.isAdmin]);
	if (access && !access.isAdmin) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid min-h-dvh place-items-center px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-sm text-muted",
			children: [
				"Bara ",
				OWNER_EMAIL,
				" kan godkänna personer."
			]
		})
	});
	async function decide(memberEmail, status) {
		setBusy(memberEmail + status);
		try {
			await decideAccessMember({ data: {
				email: memberEmail,
				status
			} });
			await reload();
			toast(status === "approved" ? "Personen är godkänd." : "Personen är nekad.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Kunde inte spara.");
		} finally {
			setBusy(null);
		}
	}
	async function invite(event) {
		event.preventDefault();
		setBusy("invite");
		try {
			await inviteAccessMember({ data: {
				email,
				name
			} });
			setEmail("");
			setName("");
			await reload();
			toast("Personen är förhandsgodkänd.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Kunde inte bjuda in.");
		} finally {
			setBusy(null);
		}
	}
	const pending = members?.filter((m) => m.status === "pending") ?? [];
	const others = members?.filter((m) => m.status !== "pending") ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex min-h-dvh w-full max-w-3xl min-w-0 flex-col overflow-x-clip px-4 pt-6 pb-16 sm:px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium tracking-widest text-muted uppercase",
							children: "Saldo"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-display text-2xl font-medium tracking-tight sm:text-3xl",
							children: "Godkännanden"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-sm text-muted",
							children: [
								"Bara ",
								OWNER_EMAIL,
								" kan släppa in nya personer."
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountChip, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, {}), "Budget"]
						})
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-xl font-medium",
						children: "Förhandsgodkänn"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Lägg till en e-post så personen kommer in direkt vid inloggning."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: (event) => void invite(event),
						className: "mt-4 grid gap-3 sm:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "invite-email",
									children: "E-post"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "invite-email",
									type: "email",
									required: true,
									value: email,
									onChange: (e) => setEmail(e.target.value),
									autoComplete: "off"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "invite-name",
									children: "Namn"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "invite-name",
									value: name,
									onChange: (e) => setName(e.target.value),
									maxLength: 80
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "sm:col-span-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "submit",
									disabled: busy !== null,
									children: busy === "invite" ? "Sparar…" : "Godkänn e-post"
								})
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-6 rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-xl font-medium",
					children: "Väntar"
				}), members === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: "Hämtar…"
				}) : pending.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: "Inga öppna förfrågningar."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-4 grid gap-3",
					children: pending.map((member) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex flex-col gap-3 rounded-xl bg-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-medium",
								children: member.name || "Utan namn"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-sm text-muted",
								children: member.email
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								disabled: busy !== null,
								onClick: () => void decide(member.email, "approved"),
								children: "Godkänn"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								disabled: busy !== null,
								onClick: () => void decide(member.email, "denied"),
								children: "Neka"
							})]
						})]
					}, member.email))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-6 rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-xl font-medium",
					children: "Lista"
				}), others.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: "Inga godkända eller nekade ännu utöver ägaren."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-4 grid gap-2",
					children: others.map((member) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex flex-col gap-2 rounded-xl bg-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-medium",
								children: member.name || "Utan namn"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "truncate text-sm text-muted",
								children: [
									member.email,
									" · ",
									member.status === "approved" ? "godkänd" : "nekad"
								]
							})]
						}), member.email !== "biskopsgrand@gmail.com" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							disabled: busy !== null,
							onClick: () => void decide(member.email, member.status === "approved" ? "denied" : "approved"),
							children: member.status === "approved" ? "Neka" : "Godkänn"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Ägare"
						})]
					}, member.email))
				})]
			})
		]
	});
}
//#endregion
export { AccessAdminPage as component };
