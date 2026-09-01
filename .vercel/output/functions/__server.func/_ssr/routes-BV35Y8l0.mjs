import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { N as require_jsx_runtime, a as Overlay2, c as Title2, d as DialogContent$1, f as DialogDescription$1, h as DialogTitle$1, i as Description2, l as Dialog$1, m as DialogPortal$1, n as Cancel, o as Portal2, p as DialogOverlay$1, r as Content2, s as Root2, t as Action, u as DialogClose } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { C as shiftMonth, E as useBudgetStore, T as todayIso, _ as formatKr, a as buttonVariants, b as monthTransactions, c as cn, d as fallbackCategoryId, g as formatDayLabel, i as Label, o as categoriesFor, r as Input, s as categoryById, t as Button, u as defaultCategory, v as formatMonthLabel, w as spendingByCategory, x as parseAmountInput, y as monthTotals } from "./budget-store-BmoyfTre.mjs";
import { _ as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Plus, d as Check, l as ChevronRight, o as Pencil, r as Trash2, s as Ellipsis, t as X, u as ChevronLeft } from "../_libs/lucide-react.mjs";
import { n as toast, t as Toaster } from "../_libs/sonner.mjs";
import { a as Separator2, i as Root2$1, n as Item2, o as Trigger, r as Portal2$1, t as Content2$1 } from "../_libs/@radix-ui/react-dropdown-menu+[...].mjs";
import { n as Root, t as Indicator } from "../_libs/radix-ui__react-progress.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BV35Y8l0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var AlertDialog = Root2;
var AlertDialogPortal = Portal2;
var AlertDialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overlay2, {
	ref,
	className: cn("fixed inset-0 z-50 bg-ink/40", className),
	...props
}));
AlertDialogOverlay.displayName = Overlay2.displayName;
var AlertDialogContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	className: cn("fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl bg-surface p-6 text-ink shadow-[var(--shadow-raised)]", className),
	...props
})] }));
AlertDialogContent.displayName = Content2.displayName;
function AlertDialogHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex flex-col gap-2", className),
		...props
	});
}
function AlertDialogFooter({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className),
		...props
	});
}
var AlertDialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Title2, {
	ref,
	className: cn("font-display text-xl font-medium tracking-tight", className),
	...props
}));
AlertDialogTitle.displayName = Title2.displayName;
var AlertDialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Description2, {
	ref,
	className: cn("text-sm text-muted", className),
	...props
}));
AlertDialogDescription.displayName = Description2.displayName;
var AlertDialogAction = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
	ref,
	className: cn(buttonVariants(), className),
	...props
}));
AlertDialogAction.displayName = Action.displayName;
var AlertDialogCancel = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cancel, {
	ref,
	className: cn(buttonVariants({ variant: "outline" }), className),
	...props
}));
AlertDialogCancel.displayName = Cancel.displayName;
var DropdownMenu = Root2$1;
var DropdownMenuTrigger = Trigger;
var DropdownMenuContent = import_react.forwardRef(({ className, sideOffset = 6, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal2$1, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2$1, {
	ref,
	sideOffset,
	className: cn("z-50 min-w-40 overflow-hidden rounded-lg bg-surface p-1 text-ink shadow-[var(--shadow-raised)]", className),
	...props
}) }));
DropdownMenuContent.displayName = Content2$1.displayName;
var DropdownMenuItem = import_react.forwardRef(({ className, inset, variant = "default", ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item2, {
	ref,
	className: cn("relative flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none select-none focus:bg-surface-2 data-disabled:pointer-events-none data-disabled:opacity-50", variant === "destructive" && "text-clay focus:bg-clay/10", inset && "pl-8", className),
	...props
}));
DropdownMenuItem.displayName = Item2.displayName;
var DropdownMenuSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator2, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-line", className),
	...props
}));
DropdownMenuSeparator.displayName = Separator2.displayName;
var Progress = import_react.forwardRef(({ className, value, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root, {
	ref,
	className: cn("relative h-2 w-full overflow-hidden rounded-full bg-surface-2", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Indicator, {
		className: "h-full w-full flex-1 bg-pine transition-transform duration-200 ease-[var(--ease-out-smooth)]",
		style: { transform: `translateX(-${100 - (value || 0)}%)` }
	})
}));
Progress.displayName = Root.displayName;
var Dialog = Dialog$1;
var DialogPortal = DialogPortal$1;
var DialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay$1, {
	ref,
	className: cn("fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props
}));
DialogOverlay.displayName = DialogOverlay$1.displayName;
var DialogContent = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
	ref,
	className: cn("fixed z-50 grid w-full gap-4 bg-surface p-6 text-ink shadow-[var(--shadow-raised)] duration-200", "max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:max-h-[92dvh] max-sm:overflow-y-auto max-sm:rounded-t-2xl", "sm:top-1/2 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl", "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
		className: "absolute top-4 right-4 rounded-sm p-1 text-muted opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "Stäng"
		})]
	})]
})] }));
DialogContent.displayName = DialogContent$1.displayName;
function DialogHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex flex-col gap-1.5 pr-8", className),
		...props
	});
}
function DialogFooter({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className),
		...props
	});
}
var DialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle$1, {
	ref,
	className: cn("font-display text-xl font-medium tracking-tight text-ink", className),
	...props
}));
DialogTitle.displayName = DialogTitle$1.displayName;
var DialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription$1, {
	ref,
	className: cn("text-sm text-muted", className),
	...props
}));
DialogDescription.displayName = DialogDescription$1.displayName;
function BudgetDialog({ open, onOpenChange }) {
	const monthlyBudget = useBudgetStore((s) => s.monthlyBudget);
	const setMonthlyBudget = useBudgetStore((s) => s.setMonthlyBudget);
	const [amount, setAmount] = (0, import_react.useState)(String(monthlyBudget));
	const [error, setError] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		setAmount(String(monthlyBudget));
		setError(null);
	}, [open, monthlyBudget]);
	function handleSubmit(event) {
		event.preventDefault();
		const parsed = parseAmountInput(amount);
		if (parsed === null) {
			setError("Ange en budget större än 0.");
			return;
		}
		setMonthlyBudget(parsed);
		toast("Budgeten uppdaterades");
		onOpenChange(false);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Månadsbudget" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Sätt hur mycket du får lägga på utgifter den här månaden. Använt belopp räknas mot budgeten." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: handleSubmit,
			className: "grid gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "budget-amount",
						children: "Budget (kr)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "budget-amount",
						inputMode: "decimal",
						value: amount,
						onChange: (e) => {
							setAmount(e.target.value);
							setError(null);
						},
						className: "tabular-nums"
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-clay",
						children: error
					}) : null
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "outline",
				onClick: () => onOpenChange(false),
				children: "Avbryt"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				children: "Spara budget"
			})] })]
		})] })
	});
}
function CategoriesDialog({ open, onOpenChange, initialType = "expense" }) {
	const categories = useBudgetStore((s) => s.categories);
	const transactions = useBudgetStore((s) => s.transactions);
	const addCategory = useBudgetStore((s) => s.addCategory);
	const renameCategory = useBudgetStore((s) => s.renameCategory);
	const deleteCategory = useBudgetStore((s) => s.deleteCategory);
	const [type, setType] = (0, import_react.useState)(initialType);
	const [newName, setNewName] = (0, import_react.useState)("");
	const [editingId, setEditingId] = (0, import_react.useState)(null);
	const [draft, setDraft] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		if (!open) return;
		setType(initialType);
		setNewName("");
		setEditingId(null);
		setDraft("");
	}, [open, initialType]);
	const list = (0, import_react.useMemo)(() => categoriesFor(categories, type), [categories, type]);
	function handleAdd(event) {
		event.preventDefault();
		if (!addCategory(newName, type)) {
			toast(newName.trim() ? "Kategorin finns redan." : "Ange ett namn.");
			return;
		}
		setNewName("");
		toast("Kategorin lades till");
	}
	function startRename(id, name) {
		setEditingId(id);
		setDraft(name);
	}
	function commitRename() {
		if (!editingId) return;
		const current = categories.find((c) => c.id === editingId);
		if (current && draft.trim() === current.name) {
			setEditingId(null);
			return;
		}
		if (!renameCategory(editingId, draft)) {
			toast(draft.trim() ? "Kategorin finns redan." : "Ange ett namn.");
			return;
		}
		setEditingId(null);
		toast("Kategorin bytte namn");
	}
	function handleDelete(id) {
		const fallback = fallbackCategoryId(categories, type, id);
		if (!fallback) {
			toast("Minst en kategori måste finnas kvar.");
			return;
		}
		const count = transactions.filter((tx) => tx.categoryId === id).length;
		const fallbackName = categories.find((c) => c.id === fallback)?.name ?? "Övrigt";
		if (!deleteCategory(id)) {
			toast("Kategorin kunde inte tas bort.");
			return;
		}
		toast(count > 0 ? `Kategorin togs bort. ${count} transaktioner flyttades till ${fallbackName}.` : "Kategorin togs bort");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "sm:max-w-md",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Kategorier" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Byt namn, ta bort eller lägg till. Transaktioner i en borttagen kategori flyttas till Övrigt." })] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							setType("expense");
							setEditingId(null);
						},
						className: cn("h-10 rounded-md text-sm font-medium transition-[background-color,color] duration-150", type === "expense" ? "bg-surface text-ink shadow-[var(--shadow-border)]" : "text-muted"),
						children: "Utgifter"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							setType("income");
							setEditingId(null);
						},
						className: cn("h-10 rounded-md text-sm font-medium transition-[background-color,color] duration-150", type === "income" ? "bg-surface text-ink shadow-[var(--shadow-border)]" : "text-muted"),
						children: "Inkomster"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "max-h-64 space-y-1 overflow-y-auto",
					children: list.map((cat) => {
						const inEdit = editingId === cat.id;
						const used = transactions.filter((tx) => tx.categoryId === cat.id).length;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center gap-2 rounded-md px-1 py-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "size-2.5 shrink-0 rounded-full",
									style: { background: cat.swatch },
									"aria-hidden": true
								}),
								inEdit ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: draft,
									onChange: (e) => setDraft(e.target.value),
									onKeyDown: (e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											commitRename();
										}
										if (e.key === "Escape") setEditingId(null);
									},
									autoFocus: true,
									maxLength: 32,
									className: "h-10 flex-1",
									"aria-label": "Nytt kategorinamn"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "min-w-0 flex-1 truncate text-sm font-medium text-ink",
									children: [cat.name, used > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ml-2 font-normal text-muted tabular-nums",
										children: used
									}) : null]
								}),
								inEdit ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									variant: "ghost",
									size: "icon-sm",
									"aria-label": "Spara namn",
									onClick: commitRename,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									variant: "ghost",
									size: "icon-sm",
									"aria-label": "Avbryt",
									onClick: () => setEditingId(null),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {})
								})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									variant: "ghost",
									size: "icon-sm",
									"aria-label": `Byt namn på ${cat.name}`,
									className: "text-muted",
									onClick: () => startRename(cat.id, cat.name),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, {})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									variant: "ghost",
									size: "icon-sm",
									"aria-label": `Ta bort ${cat.name}`,
									className: "text-muted hover:text-clay",
									onClick: () => handleDelete(cat.id),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {})
								})] })
							]
						}, cat.id);
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleAdd,
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: newName,
						onChange: (e) => setNewName(e.target.value),
						placeholder: type === "income" ? "Ny inkomstkategori" : "Ny utgiftskategori",
						maxLength: 32,
						"aria-label": "Ny kategori"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "submit",
						className: "shrink-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {}), "Lägg till"]
					})]
				})
			]
		})
	});
}
var fieldClass = "flex h-11 w-full rounded-md bg-bg px-3 text-base text-ink shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm";
function TransactionDialog({ open, onOpenChange, editing, onManageCategories }) {
	const addTransaction = useBudgetStore((s) => s.addTransaction);
	const updateTransaction = useBudgetStore((s) => s.updateTransaction);
	const addCategory = useBudgetStore((s) => s.addCategory);
	const categories = useBudgetStore((s) => s.categories);
	const selectedMonth = useBudgetStore((s) => s.selectedMonth);
	const [type, setType] = (0, import_react.useState)("expense");
	const [amount, setAmount] = (0, import_react.useState)("");
	const [categoryId, setCategoryId] = (0, import_react.useState)(defaultCategory(categories, "expense"));
	const [note, setNote] = (0, import_react.useState)("");
	const [date, setDate] = (0, import_react.useState)(todayIso());
	const [error, setError] = (0, import_react.useState)(null);
	const [newCat, setNewCat] = (0, import_react.useState)("");
	const [showNewCat, setShowNewCat] = (0, import_react.useState)(false);
	const cats = (0, import_react.useMemo)(() => categoriesFor(categories, type), [categories, type]);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		if (editing) {
			setType(editing.type);
			setAmount(String(editing.amount));
			setCategoryId(editing.categoryId);
			setNote(editing.note);
			setDate(editing.date);
		} else {
			setType("expense");
			setAmount("");
			setCategoryId(defaultCategory(categories, "expense"));
			setNote("");
			const today = todayIso();
			setDate(today.startsWith(selectedMonth) ? today : `${selectedMonth}-01`);
		}
		setError(null);
		setNewCat("");
		setShowNewCat(false);
	}, [
		open,
		editing,
		selectedMonth
	]);
	function handleType(next) {
		setType(next);
		if (!categoriesFor(categories, next).some((c) => c.id === categoryId)) setCategoryId(defaultCategory(categories, next));
	}
	function handleCreateCategory() {
		const id = addCategory(newCat, type);
		if (!id) {
			toast(newCat.trim() ? "Kategorin finns redan." : "Ange ett namn.");
			return;
		}
		setCategoryId(id);
		setNewCat("");
		setShowNewCat(false);
		toast("Kategorin lades till");
	}
	function handleSubmit(event) {
		event.preventDefault();
		const parsed = parseAmountInput(amount);
		if (parsed === null) {
			setError("Ange ett belopp större än 0.");
			return;
		}
		const payload = {
			type,
			amount: parsed,
			categoryId,
			note,
			date
		};
		if (editing) {
			updateTransaction(editing.id, payload);
			toast("Transaktionen uppdaterades");
		} else {
			addTransaction(payload);
			toast("Transaktionen lades till");
		}
		onOpenChange(false);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: editing ? "Redigera transaktion" : "Ny transaktion" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: editing ? "Uppdatera belopp, kategori eller datum." : "Lägg till en inkomst eller utgift i budgeten." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: handleSubmit,
			className: "grid gap-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => handleType("expense"),
						className: cn("h-10 rounded-md text-sm font-medium transition-[background-color,color] duration-150", type === "expense" ? "bg-surface text-ink shadow-[var(--shadow-border)]" : "text-muted"),
						children: "Utgift"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => handleType("income"),
						className: cn("h-10 rounded-md text-sm font-medium transition-[background-color,color] duration-150", type === "income" ? "bg-surface text-ink shadow-[var(--shadow-border)]" : "text-muted"),
						children: "Inkomst"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "amount",
							children: "Belopp (kr)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "amount",
							inputMode: "decimal",
							autoComplete: "off",
							placeholder: "0",
							value: amount,
							onChange: (e) => {
								setAmount(e.target.value);
								setError(null);
							},
							className: "tabular-nums"
						}),
						error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-clay",
							children: error
						}) : null
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "category",
								children: "Kategori"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "text-sm font-medium text-pine",
									onClick: () => setShowNewCat((v) => !v),
									children: "Ny kategori"
								}), onManageCategories ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "text-sm font-medium text-muted",
									onClick: onManageCategories,
									children: "Hantera"
								}) : null]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							id: "category",
							className: fieldClass,
							value: categoryId,
							onChange: (e) => setCategoryId(e.target.value),
							children: cats.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: c.id,
								children: c.name
							}, c.id))
						}),
						showNewCat ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: newCat,
								onChange: (e) => setNewCat(e.target.value),
								placeholder: "Namn, t.ex. Barn",
								maxLength: 32,
								autoFocus: true,
								onKeyDown: (e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleCreateCategory();
									}
								}
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								type: "button",
								onClick: handleCreateCategory,
								className: "shrink-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {}), "Skapa"]
							})]
						}) : null
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "date",
						children: "Datum"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "date",
						type: "date",
						value: date,
						onChange: (e) => setDate(e.target.value)
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "note",
						children: "Anteckning"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "note",
						placeholder: "Valfritt",
						value: note,
						onChange: (e) => setNote(e.target.value),
						maxLength: 80
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "outline",
					onClick: () => onOpenChange(false),
					children: "Avbryt"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					children: editing ? "Spara" : "Lägg till"
				})] })
			]
		})] })
	});
}
function BudgetApp() {
	const transactions = useBudgetStore((s) => s.transactions);
	const categories = useBudgetStore((s) => s.categories);
	const selectedMonth = useBudgetStore((s) => s.selectedMonth);
	const setSelectedMonth = useBudgetStore((s) => s.setSelectedMonth);
	const monthlyBudget = useBudgetStore((s) => s.monthlyBudget);
	const deleteTransaction = useBudgetStore((s) => s.deleteTransaction);
	const [formOpen, setFormOpen] = (0, import_react.useState)(false);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [budgetOpen, setBudgetOpen] = (0, import_react.useState)(false);
	const [categoriesOpen, setCategoriesOpen] = (0, import_react.useState)(false);
	const [pendingDelete, setPendingDelete] = (0, import_react.useState)(null);
	const [filter, setFilter] = (0, import_react.useState)("all");
	const monthTx = (0, import_react.useMemo)(() => monthTransactions(transactions, selectedMonth), [transactions, selectedMonth]);
	const totals = (0, import_react.useMemo)(() => monthTotals(monthTx), [monthTx]);
	const breakdown = (0, import_react.useMemo)(() => spendingByCategory(monthTx), [monthTx]);
	const visibleTx = (0, import_react.useMemo)(() => {
		if (filter === "all") return monthTx;
		return monthTx.filter((tx) => tx.type === filter);
	}, [monthTx, filter]);
	const budgetProgress = monthlyBudget <= 0 ? 0 : Math.max(0, Math.min(100, Math.round(totals.expense / monthlyBudget * 100)));
	const overBudget = totals.expense > monthlyBudget;
	const budgetLeft = monthlyBudget - totals.expense;
	function openCreate() {
		setEditing(null);
		setFormOpen(true);
	}
	function openEdit(tx) {
		setEditing(tx);
		setFormOpen(true);
	}
	function confirmDelete() {
		if (!pendingDelete) return;
		deleteTransaction(pendingDelete.id);
		toast("Transaktionen togs bort");
		setPendingDelete(null);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex min-h-dvh w-full max-w-6xl min-w-0 flex-col overflow-x-clip px-4 pt-6 pb-10 sm:px-6 lg:px-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium tracking-widest text-muted uppercase",
						children: "Saldo"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl",
						children: "Budgetplan"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2 sm:justify-end",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => setCategoriesOpen(true),
							children: "Kategorier"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/rapporter",
								children: "Rapporter"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MonthNav, {
							month: selectedMonth,
							onPrev: () => setSelectedMonth(shiftMonth(selectedMonth, -1)),
							onNext: () => setSelectedMonth(shiftMonth(selectedMonth, 1))
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 lg:grid-cols-12 lg:items-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-4 lg:col-span-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-sm text-muted",
									children: ["Kvar i ", formatMonthLabel(selectedMonth).toLowerCase()]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: cn("mt-2 font-display text-5xl leading-none font-medium tracking-tight whitespace-nowrap tabular-nums sm:text-6xl", totals.remaining < 0 ? "text-clay" : "text-ink"),
									children: formatKr(totals.remaining)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-sm text-muted",
									children: monthTx.length === 0 ? "Inga transaktioner den här månaden ännu." : `${monthTx.length} transaktioner · uppdateras live`
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-5 grid grid-cols-2 gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
										label: "Inkomster",
										value: formatKr(totals.income),
										tone: "income"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
										label: "Utgifter",
										value: formatKr(totals.expense),
										tone: "expense"
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setBudgetOpen(true),
							className: "rounded-2xl bg-surface p-5 text-left shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)] sm:p-6",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-muted",
										children: "Budget"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-lg font-medium text-ink",
										children: ["Utgifter i ", formatMonthLabel(selectedMonth).toLowerCase()]
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "rounded-sm bg-surface-2 px-2 py-1 text-xs font-medium text-muted",
										children: "Redigera"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-4",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
										value: budgetProgress,
										className: cn(overBudget && "[&>*]:bg-clay")
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3 flex items-baseline justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-sm tabular-nums text-ink",
										children: [formatKr(totals.expense), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-muted",
											children: [" av ", formatKr(monthlyBudget)]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: cn("text-sm font-medium tabular-nums", overBudget ? "text-clay" : "text-muted"),
										children: overBudget ? `Över budget · ${formatKr(totals.expense - monthlyBudget)}` : `${formatKr(budgetLeft)} kvar`
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mb-4 flex items-center justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-lg font-medium text-ink",
									children: "Utgifter per kategori"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setCategoriesOpen(true),
									className: "rounded-sm bg-surface-2 px-2 py-1 text-xs font-medium text-muted",
									children: "Hantera"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CategoryChart, {
								items: breakdown,
								total: totals.expense,
								categories
							})]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "rounded-2xl bg-surface p-5 shadow-[var(--shadow-border)] lg:col-span-7 sm:p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-lg font-medium text-ink",
								children: "Transaktioner"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								onClick: openCreate,
								className: "w-full sm:w-auto",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {}), "Lägg till"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-4 grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-1",
							children: [
								["all", "Alla"],
								["expense", "Utgifter"],
								["income", "Inkomster"]
							].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setFilter(key),
								className: cn("h-10 rounded-md text-sm font-medium transition-[background-color,color] duration-150", filter === key ? "bg-surface text-ink shadow-[var(--shadow-border)]" : "text-muted"),
								children: label
							}, key))
						}),
						visibleTx.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyList, {
							filter,
							onAdd: openCreate
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "divide-y divide-line",
							children: visibleTx.map((tx) => {
								const cat = categoryById(categories, tx.categoryId);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-3 py-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => openEdit(tx),
										className: "flex min-w-0 flex-1 items-center gap-3 rounded-md text-left",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "size-2.5 shrink-0 rounded-full",
												style: { background: cat?.swatch ?? "var(--color-muted)" },
												"aria-hidden": true
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "min-w-0 flex-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "block truncate font-medium text-ink",
													children: tx.note || cat?.name || "Transaktion"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "mt-0.5 block text-sm text-muted",
													children: [cat?.name, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "text-subtle",
														children: [" · ", formatDayLabel(tx.date)]
													})]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: cn("shrink-0 text-right text-sm font-medium whitespace-nowrap tabular-nums sm:text-base", tx.type === "income" ? "text-moss" : "text-ink"),
												children: [tx.type === "income" ? "+" : "−", formatKr(tx.amount)]
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
										asChild: true,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "icon-sm",
											"aria-label": "Åtgärder",
											className: "shrink-0 text-muted",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, {})
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuContent, {
										align: "end",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
												onSelect: () => openEdit(tx),
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, {}), "Redigera"]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
												variant: "destructive",
												onSelect: () => setPendingDelete(tx),
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {}), "Ta bort"]
											})
										]
									})] })]
								}) }, tx.id);
							})
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TransactionDialog, {
				open: formOpen,
				onOpenChange: setFormOpen,
				editing,
				onManageCategories: () => setCategoriesOpen(true)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BudgetDialog, {
				open: budgetOpen,
				onOpenChange: setBudgetOpen
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CategoriesDialog, {
				open: categoriesOpen,
				onOpenChange: setCategoriesOpen
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: !!pendingDelete,
				onOpenChange: (open) => !open && setPendingDelete(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Ta bort transaktionen?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, { children: pendingDelete ? `${pendingDelete.note || categoryById(categories, pendingDelete.categoryId)?.name} · ${formatKr(pendingDelete.amount)} tas bort. Det går inte att ångra.` : null })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Avbryt" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					className: "bg-clay text-destructive-foreground hover:bg-clay/90",
					onClick: confirmDelete,
					children: "Ta bort"
				})] })] })
			})
		]
	});
}
function MonthNav({ month, onPrev, onNext }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex w-fit items-center gap-1 self-start rounded-lg bg-surface p-1 shadow-[var(--shadow-border)]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				size: "icon-sm",
				onClick: onPrev,
				"aria-label": "Föregående månad",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "min-w-36 px-1 text-center text-sm font-medium whitespace-nowrap text-ink",
				children: formatMonthLabel(month)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				size: "icon-sm",
				onClick: onNext,
				"aria-label": "Nästa månad",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {})
			})
		]
	});
}
function Metric({ label, value, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg bg-bg px-3 py-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs font-medium tracking-wide text-muted uppercase",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: cn("mt-1 text-lg font-medium whitespace-nowrap tabular-nums", tone === "income" ? "text-moss" : "text-ink"),
			children: value
		})]
	});
}
function CategoryChart({ items, total, categories }) {
	if (items.length === 0 || total <= 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "Inga utgifter att visa. Lägg till transaktioner för att se fördelningen."
	});
	const radius = 36;
	const stroke = 10;
	const circ = 2 * Math.PI * radius;
	let offset = 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-5 sm:flex-row sm:items-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: "0 0 96 96",
			className: "mx-auto size-28 shrink-0 sm:mx-0",
			role: "img",
			"aria-label": "Cirkeldiagram över utgifter per kategori",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "48",
				cy: "48",
				r: radius,
				fill: "none",
				stroke: "var(--color-surface-2)",
				strokeWidth: stroke
			}), items.map((item) => {
				const cat = categoryById(categories, item.categoryId);
				const dash = item.amount / total * circ;
				const el = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "48",
					cy: "48",
					r: radius,
					fill: "none",
					stroke: cat?.swatch ?? "var(--color-muted)",
					strokeWidth: stroke,
					strokeDasharray: `${dash} ${circ - dash}`,
					strokeDashoffset: -offset,
					strokeLinecap: "butt",
					transform: "rotate(-90 48 48)"
				}, item.categoryId);
				offset += dash;
				return el;
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "min-w-0 flex-1 space-y-3",
			children: items.map((item) => {
				const cat = categoryById(categories, item.categoryId);
				const pct = Math.round(item.amount / total * 100);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-1 flex items-baseline justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex min-w-0 items-center gap-2 text-sm text-ink",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "size-2 shrink-0 rounded-full",
							style: { background: cat?.swatch ?? "var(--color-muted)" }
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate",
							children: cat?.name ?? item.categoryId
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "shrink-0 text-sm whitespace-nowrap tabular-nums text-ink",
						children: [formatKr(item.amount), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "ml-2 text-muted",
							children: [pct, "%"]
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-1.5 overflow-hidden rounded-full bg-surface-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-full rounded-full",
						style: {
							width: `${pct}%`,
							background: cat?.swatch ?? "var(--color-muted)"
						}
					})
				})] }, item.categoryId);
			})
		})]
	});
}
function EmptyList({ filter, onAdd }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col items-start gap-3 rounded-lg bg-bg px-4 py-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: filter === "income" ? "Inga inkomster den här månaden." : filter === "expense" ? "Inga utgifter den här månaden." : "Inga transaktioner den här månaden."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
			variant: "outline",
			onClick: onAdd,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {}), "Lägg till den första"]
		})]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "min-h-dvh overflow-x-clip bg-bg text-ink",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BudgetApp, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
			position: "top-center",
			offset: 16,
			toastOptions: { className: "!bg-surface !text-ink !border-0 !shadow-[var(--shadow-raised)] !font-sans" }
		})]
	});
}
//#endregion
export { Home as component };
