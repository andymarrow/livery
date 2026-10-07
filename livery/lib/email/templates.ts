// Livery's emails: one calm layout, a single action, and the link in plain
// text too. Inline styles and tables, because email clients ignore the rest.

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout({ title, lead, button, link, foot }: { title: string; lead: string; button: string; link: string; foot: string }) {
  const href = escape(link);
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f3ed;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111111;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3ed;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr><td style="padding:0 4px 20px;font-size:18px;font-weight:700;letter-spacing:-0.02em;">
            <span style="display:inline-block;width:22px;height:22px;border-radius:6px;background:#111111;vertical-align:-5px;margin-right:8px;"></span>livery
          </td></tr>
          <tr><td style="background:#ffffff;border:1px solid #e8e7e1;border-radius:18px;padding:32px;">
            <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;">${escape(title)}</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#636363;">${escape(lead)}</p>
            <a href="${href}" style="display:inline-block;background:#0d7268;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:999px;">${escape(button)}</a>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#8f8f8f;">Or paste this link into your browser:<br><span style="color:#636363;word-break:break-all;">${href}</span></p>
          </td></tr>
          <tr><td style="padding:20px 4px 0;font-size:12px;line-height:1.6;color:#8f8f8f;">${escape(foot)}</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  const text = `${title}\n\n${lead}\n\n${button}: ${link}\n\n${foot}\n`;
  return { html, text };
}

export function confirmEmail(link: string) {
  return {
    subject: "Confirm your Livery email",
    ...layout({
      title: "Confirm Your Email",
      lead: "Welcome to Livery. Confirm this address to finish creating your account, then you can keep private kits, save the ones you like and use the browser extension.",
      button: "Confirm Email",
      link,
      foot: "You're getting this because someone signed up to Livery with this address. If it wasn't you, ignore this email and nothing will happen.",
    }),
  };
}

export function resetPasswordEmail(link: string) {
  return {
    subject: "Reset your Livery password",
    ...layout({
      title: "Reset Your Password",
      lead: "Someone asked to reset the password for your Livery account. Use the button below to choose a new one. The link works once and expires soon.",
      button: "Choose a New Password",
      link,
      foot: "If you didn't ask for this, ignore this email: your password stays the same.",
    }),
  };
}
