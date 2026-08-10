/**
 * The HTML shell every outbound message shares.
 *
 * ## Why this is table-based, inline-styled, and 1998-looking
 *
 * Email clients are not browsers. Outlook on Windows renders with Word's HTML engine, Gmail strips
 * `<style>` blocks and most of what survives is inline, and flexbox and grid are unreliable across
 * enough of the installed base to be unusable. Tables with inline styles are what actually renders
 * the same in Gmail, Outlook, Apple Mail and the phone clients. This is not a stylistic choice.
 *
 * ## Why the logo sits on a black band
 *
 * The wordmark is WHITE on transparent, because the Branding panel that frames it in the app is
 * `background-color: #000` — that black box exists so a white logo reads. An email body is white,
 * so the same asset would be invisible. The dark header band gives it the background it needs and
 * matches the product's own black navbar, so one asset serves both surfaces.
 *
 * ## Why PNG and not the SVG
 *
 * Gmail and Outlook do not render SVG in email; it is stripped or shown as a broken image. The
 * raster at `room-logo-email.png` is 2x so it stays sharp on a phone.
 *
 * ## Why the message must survive with images off
 *
 * Many clients block remote images by default, and a recipient who has never seen your mail before
 * is exactly the one most likely to have them blocked. So the logo carries `alt` text, and the
 * action link ALWAYS appears as a visible URL underneath the button — never only as a button.
 */

/** Product name, in one place, so a rebrand is one edit. */
const PRODUCT = 'TradingRoomApp';

export interface BrandedMail {
  /** The site origin, so the logo and links are absolute — relative URLs cannot work in email. */
  origin: string;
  /** First line, addressed to the person. */
  greeting: string;
  /** One or more paragraphs of body copy. */
  paragraphs: string[];
  /** The primary action. */
  action: { label: string; url: string };
  /** Small print under the action — expiry, "ignore this if it wasn't you". */
  footnotes: string[];
}

/** Minimal escaping. Every value here is ours or a display name, and a display name is user input. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * The HTML body.
 *
 * `origin` must be absolute and public: a link to `localhost` in somebody's inbox is a dead link,
 * and `ROOM_BASE_URL` reaching production as `http://localhost:5174` is exactly how that happens.
 */
export function brandedHtml(mail: BrandedMail): string {
  const body = mail.paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:#333333">${escapeHtml(p)}</p>`)
    .join('');

  const notes = mail.footnotes
    .map((n) => `<p style="margin:0 0 6px;font-size:13px;line-height:19px;color:#777777">${escapeHtml(n)}</p>`)
    .join('');

  return `<!doctype html>
<html><body style="margin:0;padding:0;background-color:#f4f4f4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4">
  <tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:6px;overflow:hidden">

      <tr><td align="center" style="background-color:#000000;padding:22px 20px">
        <img src="${mail.origin}/public/images/room-logo-email.png" width="180" height="28"
             alt="${PRODUCT}" style="display:block;border:0;width:180px;height:28px">
      </td></tr>

      <tr><td style="padding:28px 28px 8px">
        <p style="margin:0 0 16px;font-size:15px;line-height:22px;color:#333333">${escapeHtml(mail.greeting)}</p>
        ${body}
      </td></tr>

      <tr><td align="center" style="padding:8px 28px 24px">
        <a href="${mail.action.url}"
           style="display:inline-block;padding:12px 26px;background-color:#337ab7;color:#ffffff;
                  font-size:15px;font-weight:700;text-decoration:none;border-radius:4px">
          ${escapeHtml(mail.action.label)}
        </a>
      </td></tr>

      <tr><td style="padding:0 28px 24px">
        <p style="margin:0 0 8px;font-size:13px;line-height:19px;color:#777777">
          If the button does not work, copy this link into your browser:
        </p>
        <p style="margin:0 0 18px;font-size:13px;line-height:19px;word-break:break-all">
          <a href="${mail.action.url}" style="color:#337ab7">${escapeHtml(mail.action.url)}</a>
        </p>
        ${notes}
      </td></tr>

      <tr><td align="center" style="background-color:#fafafa;padding:16px 20px;border-top:1px solid #eeeeee">
        <p style="margin:0;font-size:12px;color:#999999">${PRODUCT}</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

/**
 * The plain-text twin.
 *
 * Generated from the same input so the two parts cannot drift apart — a text body that says
 * something different from the HTML is both a spam signal and a support problem.
 */
export function brandedText(mail: BrandedMail): string {
  return [mail.greeting, '', ...mail.paragraphs.flatMap((p) => [p, '']), mail.action.url, '', ...mail.footnotes].join(
    '\n'
  );
}
