import { Resend } from "resend";

function resendClient() {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

export async function sendAuthEmail(input: {
  to: string;
  subject: string;
  title: string;
  actionUrl: string;
  actionLabel: string;
}) {
  const resend = resendClient();
  if (!resend) {
    if (process.env.NODE_ENV === "production")
      throw new Error("Transactional email is not configured in production");
    console.info("[EMAIL DEV]", {
      to: input.to,
      subject: input.subject,
      action: input.actionLabel,
      note: "action URL intentionally not logged",
    });
    return;
  }
  const from = process.env.EMAIL_FROM;
  if (!from || /@example\.(com|org|net)$/i.test(from)) {
    if (process.env.NODE_ENV === "production")
      throw new Error("EMAIL_FROM is not configured with a verified sender");
  }
  const result = await resend.emails.send({
    from: from ?? "noreply@example.com",
    to: input.to,
    subject: input.subject,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h1>${escapeHtml(input.title)}</h1><p>Cette demande concerne votre compte ${escapeHtml(process.env.APP_NAME ?? "Africa SaaS Kit")}.</p><p><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:8px">${escapeHtml(input.actionLabel)}</a></p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p></div>`,
  });
  if (result.error || !result.data?.id) {
    // Do not disclose provider payloads, recipients, or authentication links.
    throw new Error("Transactional email delivery failed");
  }
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ]!,
  );
}
