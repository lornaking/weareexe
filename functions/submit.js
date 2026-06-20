/**
 * Cloudflare Pages Function — POST /submit
 *
 * Setup:
 *  1. In Cloudflare Pages dashboard → Settings → Environment Variables, add:
 *       RESEND_API_KEY = re_xxxxxxxxxxxx   (from resend.com → API Keys)
 *  2. In Resend, verify the domain weareexe.com and create a sender address,
 *     e.g. pulse@weareexe.com — update FROM_ADDRESS below to match.
 *  3. When you have the final PDF URL, update REPORT_URL in report.html.
 */

const TO_ADDRESS = 'hello@weareexe.com';
const FROM_ADDRESS = 'GCC People Pulse <pulse@weareexe.com>';

export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { first_name, last_name, email, company, job_title } = data;

  if (!email || !first_name || !last_name) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Sanitise user-supplied strings before using in email headers/content
  const safe = (s) => String(s ?? '').replace(/[\r\n<>]/g, '').trim().slice(0, 200);
  const safeEmail = safe(email).replace(/[^a-zA-Z0-9._%+\-@]/g, '');

  const html = `
    <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;width:100%;max-width:480px">
      <tr><td colspan="2" style="padding:12px;background:#e8430b;color:#fff;font-size:16px;font-weight:bold">
        New GCC People Pulse report request
      </td></tr>
      <tr><td style="padding:8px 12px;font-weight:600;width:110px">Name</td>
          <td style="padding:8px 12px">${safe(first_name)} ${safe(last_name)}</td></tr>
      <tr style="background:#f6f8ef">
          <td style="padding:8px 12px;font-weight:600">Email</td>
          <td style="padding:8px 12px">${safeEmail}</td></tr>
      <tr><td style="padding:8px 12px;font-weight:600">Company</td>
          <td style="padding:8px 12px">${safe(company) || '—'}</td></tr>
      <tr style="background:#f6f8ef">
          <td style="padding:8px 12px;font-weight:600">Job title</td>
          <td style="padding:8px 12px">${safe(job_title) || '—'}</td></tr>
    </table>
  `;

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [TO_ADDRESS],
      reply_to: safeEmail,
      subject: `New report request from ${safeEmail}`,
      html,
    }),
  });

  if (!resendRes.ok) {
    const err = await resendRes.text();
    console.error('Resend error:', err);
    return Response.json({ error: 'Failed to send notification' }, { status: 500 });
  }

  return Response.json({ success: true });
}
