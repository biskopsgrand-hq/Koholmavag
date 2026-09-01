import { createFileRoute } from "@tanstack/react-router";
import { applyAccessToken, peekAccessToken } from "@/lib/access.server";

export const Route = createFileRoute("/api/godkann")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get("token") ?? "";
        const member = await peekAccessToken(token);
        if (!member) return htmlPage("Ogiltig länk", "Den här godkännandelänken är ogiltig eller har redan använts.", null);
        if (member.status === "approved") {
          return htmlPage("Redan godkänd", `${escapeHtml(member.name || member.email)} har redan tillgång till Saldo.`, null);
        }
        if (member.status === "denied") {
          return htmlPage("Redan nekad", `${escapeHtml(member.name || member.email)} är nekad. Du kan godkänna igen här.`, token);
        }
        return htmlPage(
          "Godkänn åtkomst",
          `${escapeHtml(member.name || "En person")} (${escapeHtml(member.email)}) vill ha tillgång till Saldo. Bara du kan släppa in personen.`,
          token,
        );
      },
      POST: async ({ request }) => {
        const form = await request.formData();
        const token = String(form.get("token") ?? "");
        const beslut = form.get("beslut") === "nej" ? "denied" : "approved";
        const member = await applyAccessToken(token, beslut);
        if (!member) return htmlPage("Ogiltig länk", "Den här godkännandelänken är ogiltig.", null);
        if (beslut === "approved") {
          return htmlPage("Godkänd", `${escapeHtml(member.name || member.email)} har nu tillgång till Saldo.`, null);
        }
        return htmlPage("Nekad", `${escapeHtml(member.name || member.email)} har inte tillgång till Saldo.`, null);
      },
    },
  },
});

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    if (ch === "&") return "\u0026amp;";
    if (ch === "<") return "\u0026lt;";
    if (ch === ">") return "\u0026gt;";
    if (ch === '"') return "\u0026quot;";
    return "\u0026#39;";
  });
}

function htmlPage(title: string, body: string, token: string | null): Response {
  const actions = token
    ? `<form method="post">
        <input type="hidden" name="token" value="${escapeHtml(token)}" />
        <button class="ok" type="submit" name="beslut" value="ja">Godkänn</button>
        <button class="no" type="submit" name="beslut" value="nej">Neka</button>
      </form>`
    : "";
  const html = `<!doctype html>
<html lang="sv">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} — Saldo</title>
    <style>
      :root { color-scheme: light; }
      body { margin:0; min-height:100dvh; display:grid; place-items:center; background:#efe9dc; color:#1a1714; font-family:"Schibsted Grotesk",system-ui,sans-serif; padding:24px; }
      main { width:min(100%, 28rem); background:#f7f3ea; border-radius:1.5rem; padding:1.75rem; box-shadow:0 0 0 1px rgba(26,23,20,.06), 0 8px 24px -12px rgba(26,23,20,.18); }
      p.kicker { margin:0; font-size:.75rem; letter-spacing:.16em; text-transform:uppercase; color:#6b6458; font-weight:500; }
      h1 { margin:.4rem 0 0; font-family:Fraunces,Georgia,serif; font-size:1.75rem; font-weight:500; }
      .lead { margin: .75rem 0 0; color:#6b6458; line-height:1.5; }
      form { display:flex; flex-wrap:wrap; gap:.5rem; margin-top:1.25rem; }
      button { cursor:pointer; min-height:44px; padding:0 1rem; border-radius:.75rem; font:inherit; font-weight:500; }
      .ok { background:#1e4638; color:#f4efe4; border:0; }
      .no { background:transparent; color:#1a1714; border:0; box-shadow:0 0 0 1px rgba(26,23,20,.08); }
    </style>
  </head>
  <body>
    <main>
      <p class="kicker">Saldo · via e-post</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="lead">${body}</p>
      ${actions}
    </main>
  </body>
</html>`;
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
