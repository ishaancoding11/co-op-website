import { Resend } from 'resend';

const FROM = process.env.RESEND_FROM ?? 'Co-op <onboarding@resend.dev>';

// Best-effort: if RESEND_API_KEY is unset (local dev), log and skip.
export async function sendEmail(to: string, subject: string, html: string): Promise<{ sent: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // If this line shows up in Vercel's function logs, RESEND_API_KEY is not
    // present in the running deployment — check Settings > Environment
    // Variables (Production must be checked) and redeploy after fixing it,
    // since a saved env var does not retroactively apply to a live deployment.
    console.log(`[email skipped — RESEND_API_KEY not set in this runtime] to=${to} subject=${subject}`);
    return { sent: false, error: 'RESEND_API_KEY not set' };
  }
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error('Resend rejected the send', error);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (e) {
    console.error('Resend send failed', e);
    return { sent: false, error: e instanceof Error ? e.message : 'unknown error' };
  }
}

export function emailShell(title: string, body: string, ctaHref?: string, ctaLabel?: string) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const url = ctaHref ? (ctaHref.startsWith('http') ? ctaHref : site + ctaHref) : null;
  // Hex values are hardcoded, not read from app/globals.css: most email
  // clients strip <style> tags and don't support CSS custom properties, so
  // this is the one legitimate exception to keeping colors in a single
  // token file — kept in sync with it by hand.
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#231f1d">
    <p style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#c9744f">Co-op</p>
    <h1 style="font-size:22px;margin:8px 0 16px">${title}</h1>
    <p style="font-size:15px;line-height:1.6;color:#7a7370">${body}</p>
    ${url ? `<p style="margin-top:24px"><a href="${url}" style="background:#db6239;color:#ffffff;padding:12px 22px;border-radius:999px;text-decoration:none;font-size:14px">${ctaLabel ?? 'Open Co-op'}</a></p>` : ''}
    <p style="margin-top:32px;font-size:12px;color:#7a7370">Co-op · local creatives × small businesses · Newport Beach & Corona del Mar</p>
  </div>`;
}
