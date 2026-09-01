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
    "Godkänn eller neka här:",
    input.approveUrl,
    "",
    "Du kan också godkänna under Godkännanden i appen.",
  ].join("\n");

  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(OWNER_EMAIL)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      _subject: subject,
      _template: "box",
      _captcha: "false",
      name: who,
      email: input.email,
      message,
      Godkänn: input.approveUrl,
    }),
  });
  if (!response.ok) {
    throw new Error(`Kunde inte skicka notifiering (${response.status}).`);
  }
}
