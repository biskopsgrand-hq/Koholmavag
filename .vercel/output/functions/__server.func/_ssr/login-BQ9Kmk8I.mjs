import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Navigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { N as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as OWNER_EMAIL } from "./access.server-uGIuNPF4.mjs";
import { r as signIn, t as authClient } from "./client-B40BzJxt.mjs";
import { n as Input, o as useCurrentUserState, r as Label, t as Button } from "./label-BRi1-1MI.mjs";
import { t as GROK_PROVIDERS } from "./server-CamEzyG5.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-BQ9Kmk8I.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Login() {
	const { user } = useCurrentUserState();
	if (user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoginScreen, {});
}
function LoginScreen() {
	const [mode, setMode] = (0, import_react.useState)("signin");
	const [name, setName] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	const [pending, setPending] = (0, import_react.useState)(null);
	async function handleProvider(providerId) {
		setError(null);
		setPending(providerId);
		try {
			await signIn(providerId, {
				callbackURL: "/",
				errorCallbackURL: "/login"
			});
		} catch (err) {
			setPending(null);
			setError(err instanceof Error ? swedishAuthError(err.message) : "Inloggningen misslyckades.");
		}
	}
	async function handleEmail(event) {
		event.preventDefault();
		setError(null);
		setPending("email");
		try {
			if (mode === "signup") {
				const { error: signUpError } = await authClient.signUp.email({
					email: email.trim(),
					password,
					name: name.trim() || email.trim()
				});
				if (signUpError) throw new Error(signUpError.message);
			} else {
				const { error: signInError } = await authClient.signIn.email({
					email: email.trim(),
					password
				});
				if (signInError) throw new Error(signInError.message);
			}
			window.location.assign("/");
		} catch (err) {
			setPending(null);
			setError(err instanceof Error ? swedishAuthError(err.message) : "Något gick fel.");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "grid min-h-dvh place-items-center overflow-x-clip bg-bg px-4 py-8 sm:px-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid w-full max-w-4xl overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-raised)] lg:grid-cols-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "bg-pine px-6 py-6 text-pine-fg lg:col-span-2 lg:flex lg:flex-col lg:justify-between lg:px-8 lg:py-10",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LedgerMark, { className: "size-9 text-pine-fg" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-5 text-xs font-medium tracking-widest uppercase opacity-80",
						children: "Saldo"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 font-display text-3xl font-medium tracking-tight",
						children: "Privat budget"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 max-w-xs text-sm text-pine-fg/80",
						children: "Inte öppet för alla. Nya personer måste godkännas via e-post."
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "mt-6 hidden space-y-2 text-sm text-pine-fg/80 lg:block",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Inloggning bara för godkända" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Godkännande via e-post" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Live saldo och årsrapport" })
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "px-5 py-7 sm:px-8 sm:py-10 lg:col-span-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-3xl font-medium tracking-tight text-ink",
						children: mode === "signin" ? "Logga in" : "Begär tillgång"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: mode === "signin" ? "Har du redan blivit godkänd? Logga in här." : `Skapa ett konto. Du släpps in först när ${OWNER_EMAIL} godkänt dig via e-post.`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-7 grid gap-2",
							children: GROK_PROVIDERS.map((provider) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								type: "button",
								variant: "outline",
								size: "lg",
								className: "w-full justify-center",
								disabled: pending !== null,
								onClick: () => void handleProvider(provider.providerId),
								children: [provider.idp === "google" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoogleMark, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(XMark, {}), pending === provider.providerId ? "Öppnar…" : `Fortsätt med ${provider.label}`]
							}, provider.providerId))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "my-6 flex items-center gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-line" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-medium tracking-wide text-muted uppercase",
									children: "eller e-post"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-line" })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							onSubmit: (event) => void handleEmail(event),
							className: "grid gap-4",
							children: [
								mode === "signup" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "name",
										children: "Namn"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "name",
										value: name,
										onChange: (e) => setName(e.target.value),
										autoComplete: "name",
										maxLength: 80
									})]
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "email",
										children: "E-post"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "email",
										type: "email",
										required: true,
										value: email,
										onChange: (e) => setEmail(e.target.value),
										autoComplete: "email"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "password",
										children: "Lösenord"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "password",
										type: "password",
										required: true,
										minLength: 8,
										value: password,
										onChange: (e) => setPassword(e.target.value),
										autoComplete: mode === "signup" ? "new-password" : "current-password"
									})]
								}),
								error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-clay",
									children: error
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "submit",
									size: "lg",
									className: "w-full",
									disabled: pending !== null,
									children: pending === "email" ? "Väntar…" : mode === "signin" ? "Logga in" : "Begär tillgång"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-5 text-center text-sm text-muted",
							children: [
								mode === "signin" ? "Inte godkänd ännu?" : "Har du redan ett konto?",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "font-medium text-pine",
									onClick: () => {
										setMode(mode === "signin" ? "signup" : "signin");
										setError(null);
									},
									children: mode === "signin" ? "Begär tillgång" : "Logga in"
								})
							]
						})
					] })
				]
			})]
		})
	});
}
function LedgerMark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 36 36",
		className,
		"aria-hidden": true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "3",
				y: "5",
				width: "30",
				height: "5",
				rx: "1.5",
				fill: "currentColor",
				opacity: "0.35"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "3",
				y: "15.5",
				width: "22",
				height: "5",
				rx: "1.5",
				fill: "currentColor"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "3",
				y: "26",
				width: "14",
				height: "5",
				rx: "1.5",
				fill: "currentColor",
				opacity: "0.65"
			})
		]
	});
}
function GoogleMark() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 24 24",
		className: "size-4",
		"aria-hidden": true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				fill: "currentColor",
				d: "M21.6 12.23c0-.74-.06-1.45-.18-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				fill: "currentColor",
				d: "M12 22c2.7 0 4.97-.9 6.63-2.35l-3.24-2.5c-.9.6-2.05.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.58A10 10 0 0 0 12 22Z",
				opacity: "0.85"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				fill: "currentColor",
				d: "M6.4 13.99A6 6 0 0 1 6.08 12c0-.69.12-1.36.32-1.99V7.43H3.06A10 10 0 0 0 2 12c0 1.61.38 3.14 1.06 4.57l3.34-2.58Z",
				opacity: "0.7"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				fill: "currentColor",
				d: "M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.96 2.97 14.7 2 12 2A10 10 0 0 0 3.06 7.43l3.34 2.58C7.19 7.72 9.4 5.96 12 5.96Z",
				opacity: "0.55"
			})
		]
	});
}
function XMark() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		viewBox: "0 0 24 24",
		className: "size-4",
		"aria-hidden": true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			fill: "currentColor",
			d: "M18.24 2H21.5l-7.19 8.21L22.5 22h-6.59l-5.16-6.74L5.2 22H1.92l7.7-8.8L1.5 2h6.76l4.66 6.18L18.24 2Zm-1.16 18.02h1.83L7.01 3.88H5.05l12.03 16.14Z"
		})
	});
}
function swedishAuthError(message) {
	const lower = message.toLowerCase();
	if (lower.includes("popup")) return "Tillåt popup-fönster för att logga in.";
	if (lower.includes("invalid") || lower.includes("credential") || lower.includes("password")) return "Fel e-post eller lösenord.";
	if (lower.includes("exist") || lower.includes("already")) return "Det finns redan ett konto med den e-postadressen.";
	if (lower.includes("cancel")) return "Inloggningen avbröts.";
	return message;
}
//#endregion
export { Login as component };
