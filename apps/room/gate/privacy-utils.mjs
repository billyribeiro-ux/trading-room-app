const encodedPayloadPattern = /eyJ[A-Za-z0-9_-]{5,}(?:\.[A-Za-z0-9_-]+){0,2}/g;
const decodedEmailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const rawEmailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const decodedIdentityClaimPattern =
  /"(?:email|name|displayName|display_name|fullName|full_name|firstName|first_name|lastName|last_name|given_name|family_name|preferred_username)"\s*:\s*"(?!\[[A-Z0-9_]+\])[^"\r\n]{1,320}"/i;

/**
 * @param {string} content
 * @returns {number}
 */
export function countEncodedIdentityPayloads(content) {
  let count = 0;
  for (const match of content.matchAll(encodedPayloadPattern)) {
    if (containsDecodedIdentity(match[0])) count += 1;
  }
  return count;
}

/**
 * @param {string} content
 * @returns {{ redacted: string, replacements: number }}
 */
export function redactEncodedIdentityPayloads(content) {
  let replacements = 0;
  const redacted = content.replace(encodedPayloadPattern, (candidate) => {
    if (!containsDecodedIdentity(candidate)) return candidate;
    replacements += 1;
    return '[REDACTED_CAPTURE_JWT]';
  });
  return { redacted, replacements };
}

/**
 * @param {string} content
 * @returns {string[]}
 */
export function findUnsafeRawEmails(content) {
  const unsafe = [];
  for (const match of content.matchAll(rawEmailPattern)) {
    const candidate = match[0];
    if (isSafeTestEmail(candidate) || isAssetFilename(candidate, content, match.index)) continue;
    unsafe.push(candidate);
  }
  return unsafe;
}

/**
 * @param {string} content
 * @returns {number}
 */
export function countUnsafeRawEmails(content) {
  return findUnsafeRawEmails(content).length;
}

/**
 * @param {string} content
 * @param {(candidate: string) => string} replacementFor
 * @returns {{ redacted: string, replacements: number }}
 */
export function replaceUnsafeRawEmails(content, replacementFor) {
  let replacements = 0;
  const redacted = content.replace(rawEmailPattern, (candidate, offset, input) => {
    if (isSafeTestEmail(candidate) || isAssetFilename(candidate, input, offset)) return candidate;
    replacements += 1;
    return replacementFor(candidate);
  });
  return { redacted, replacements };
}

/**
 * @param {string} candidate
 * @returns {boolean}
 */
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

/**
 * @param {string} candidate
 * @returns {boolean}
 */
function isSafeTestEmail(candidate) {
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

/**
 * @param {string} candidate
 * @param {string} content
 * @param {number} offset
 * @returns {boolean}
 */
function isAssetFilename(candidate, content, offset) {
  return (
    content[offset - 1] === '/' &&
    /@\d+x\.[a-z0-9_-]+\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(candidate)
  );
}
