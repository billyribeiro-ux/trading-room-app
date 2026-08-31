const encodedPayloadPattern = /eyJ[A-Za-z0-9_-]{5,}(?:\.[A-Za-z0-9_-]+){0,2}/g;
const decodedEmailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const rawEmailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const decodedIdentityClaimPattern =
  /"(?:email|name|displayName|display_name|fullName|full_name|firstName|first_name|lastName|last_name|given_name|family_name|preferred_username)"\s*:\s*"(?!\[[A-Z0-9_]+\])[^"\r\n]{1,320}"/i;

export function countEncodedIdentityPayloads(content) {
  let count = 0;
  for (const match of content.matchAll(encodedPayloadPattern)) {
    if (containsDecodedIdentity(match[0])) count += 1;
  }
  return count;
}

export function redactEncodedIdentityPayloads(content) {
  let replacements = 0;
  const redacted = content.replace(encodedPayloadPattern, (candidate) => {
    if (!containsDecodedIdentity(candidate)) return candidate;
    replacements += 1;
    return '[REDACTED_CAPTURE_JWT]';
  });
  return { redacted, replacements };
}

export function findUnsafeRawEmails(content) {
  const unsafe = [];
  for (const match of content.matchAll(rawEmailPattern)) {
    const candidate = match[0];
    if (
      isSafeTestEmail(candidate) ||
      isAssetFilename(candidate, content, match.index) ||
      isUiRouterViewName(candidate, content, match.index)
    )
      continue;
    unsafe.push(candidate);
  }
  return unsafe;
}

export function countUnsafeRawEmails(content) {
  return findUnsafeRawEmails(content).length;
}

export function replaceUnsafeRawEmails(content, replacementFor) {
  let replacements = 0;
  const redacted = content.replace(rawEmailPattern, (candidate, offset, input) => {
    if (
      isSafeTestEmail(candidate) ||
      isAssetFilename(candidate, input, offset) ||
      isUiRouterViewName(candidate, input, offset)
    )
      return candidate;
    replacements += 1;
    return replacementFor(candidate);
  });
  return { redacted, replacements };
}

function containsDecodedIdentity(candidate) {
  // A complete JWT carries identity claims in its second segment. Captured
  // evidence also contains truncated one-segment payloads, so inspect up to the
  // first two segments and never print decoded content into diagnostics.
  for (const segment of candidate.split('.').slice(0, 2)) {
    const decoded = Buffer.from(segment, 'base64url').toString('utf8');
    if (decodedEmailPattern.test(decoded) || decodedIdentityClaimPattern.test(decoded)) {
      return true;
    }
  }
  return false;
}

/*
  The product's OWN published role addresses.

  These are not personal data and never were: `support@tradingroom.app` is the address a user is
  told to write to, and it has to appear on the contact, privacy and terms pages — a privacy policy
  with no contact route is worse than the "violation" this check was reporting. It tripped only
  because `isSafeTestEmail` knew about RFC 2606 reserved domains and nothing else.

  DELIBERATELY A ROLE-ADDRESS ALLOWLIST, NOT A DOMAIN ONE. Allowing all of `tradingroom.app` would
  let a personal address on our own domain through — exactly the leak this verifier exists to stop.
  Every occurrence in `src` today is this one address (4 of 4, measured), so the list stays at one
  entry until a second published role address genuinely exists.

  `tradingroom.app` is the product domain on hard evidence: `BRAND = 'tradingroom.app'` in
  `src/lib/content/home.ts:15`, with `chat.` / `media.` / `mail.` subdomains through the deployment
  docs. It is NOT the captured reference domain, which is protradingroom.com.
*/
const PUBLISHED_ROLE_ADDRESSES = new Set(['support@tradingroom.app']);

function isSafeTestEmail(candidate) {
  if (PUBLISHED_ROLE_ADDRESSES.has(candidate.toLowerCase())) return true;
  const domain = candidate.slice(candidate.lastIndexOf('@') + 1).toLowerCase();
  return (
    domain === 'example.com' ||
    domain === 'example.net' ||
    domain === 'example.org' ||
    domain.endsWith('.example') ||
    domain === 'test' ||
    domain.endsWith('.test') ||
    domain === 'invalid' ||
    domain.endsWith('.invalid')
  );
}

/*
  A ui-router VIEW NAME, which is `viewName@stateName` and is not an address.

  AngularJS ui-router addresses a named view inside a named state by joining the two with an `@`, and
  the manage bundle pinned at `evidence-dumps/manage-app-2026-08-31/` carries three of them from the
  theme's demo mailbox screen. The email regex accepts them because the state segments after the last
  dot are letters-only and long enough to pass for a TLD — nothing about the string ITSELF separates
  one from a genuine address.

  So the SYNTAX distinguishes it, not the string. All three occurrences sit immediately after
  `views:{"`, which is the only place ui-router accepts this form, and there are exactly four
  `views:{` in the file. A real address would have to be written as the first key of a `views` map to
  slip through, and that is not a shape any leak takes.

  DELIBERATELY NOT a domain allow-list. Adding `.mailbox` or `.list` to `isSafeTestEmail` would
  exempt every address ending in those, everywhere in the repository, forever, to silence three
  matches in one third-party minified file. This exempts a construct, in place, and nothing else.

  NOTE FOR THE NEXT EDITOR: this file is scanned by the verifier that imports it, so a comment here
  must not contain an address-shaped literal. That is why the paragraph above describes the shape
  instead of showing one — the first draft did show one, and the verifier reported it.
*/
function isUiRouterViewName(candidate, content, offset) {
  return content.slice(Math.max(0, offset - 8), offset) === 'views:{"';
}

function isAssetFilename(candidate, content, offset) {
  return content[offset - 1] === '/' && /@\d+x\.[a-z0-9_-]+\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(candidate);
}
