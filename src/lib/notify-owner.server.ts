import { APP_NAME } from "@/lib/brand";
import { OWNER_EMAIL } from "@/lib/access";

export async function notifyOwnerOfAccessRequest(input: {
  name: string | null;
  email: string;
  approveUrl: string;
}): Promise<void> {
  const who = input.name?.trim() || input.email;
  const subject = `${APP_NAME}: ${who} vill ha tillgång`;
  const message = [
    `${who} (${input.email}) vill ha tillgång till ${APP_NAME}.`,
    "",
    "Godkänn eller neka i mejlet via länken:",
    input.approveUrl,
    "",
    "Du kan också godkänna under Godkännanden i appen.",
  ].join("\n");

  const fields: Record<string, string> = {
    _subject: subject,
    _template: "box",
    _captcha: "false",
    _replyto: input.email,
    name: who,
    email: input.email,
    message,
    Godkänn: input.approveUrl,
  };

  const json = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(OWNER_EMAIL)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(fields),
  });
  if (json.ok) return;

  const form = new URLSearchParams(fields);
  const encoded = await fetch(`https://formsubmit.co/${encodeURIComponent(OWNER_EMAIL)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: form,
    redirect: "manual",
  });
  if (encoded.ok || encoded.status === 302 || encoded.status === 301) return;

  throw new Error(`Kunde inte skicka notifiering (${json.status}/${encoded.status}).`);
}