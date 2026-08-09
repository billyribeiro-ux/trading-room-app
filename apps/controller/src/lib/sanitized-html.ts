declare const sanitizedHtmlBrand: unique symbol;

/**
 * An HTML fragment rebuilt by the repository allowlist. The server reapplies
 * that allowlist before persistence; the brand prevents arbitrary strings from
 * reaching the single reviewed HTML-rendering boundary in either runtime.
 */
export type SanitizedHtml = string & { readonly [sanitizedHtmlBrand]: true };
