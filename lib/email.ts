import { Resend } from 'resend';

const FROM = process.env.RESEND_FROM ?? 'Co-op <onboarding@resend.dev>';

// Best-effort: if RESEND_API_KEY is unset (local dev), log and skip.
export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email skipped — no RESEND_API_KEY] to=${to} subject=${subject}`);
    return;
  }
  try {
    const resend = new Resend(key);
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (e) {
    console.error('Resend send failed', e);
  }
}

export function emailShell(title: string, body: string, ctaHref?: string, ctaLabel?: string) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const url = ctaHref ? (ctaHref.startsWith('http') ? ctaHref : site + ctaHref) : null;
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#2d2a26">
    <p style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#b0876a">Co-op</p>
    <h1 style="font-size:22px;margin:8px 0 16px">${title}</h1>
    <p style="font-size:15px;line-height:1.6;color:#5b564f">${body}</p>
    ${url ? `<p style="margin-top:24px"><a href="${url}" style="background:#2d2a26;color:#faf7f2;padding:12px 22px;border-radius:999px;text-decoration:none;font-size:14px">${ctaLabel ?? 'Open Co-op'}</a></p>` : ''}
    <p style="margin-top:32px;font-size:12px;color:#a39d94">Co-op · local creatives × small businesses · Newport Beach & Corona del Mar</p>
  </div>`;
}
