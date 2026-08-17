import { requireUser } from '#lib/server/auth.js';
import { sanitizeHtml } from '#lib/server/sanitize-html.js';
import { API_DOCS_HTML } from '#lib/content/api-docs.js';
import type { PageServerLoad } from './$types';

/**
 * The Sessions API reference.
 *
 * Sanitised on the SERVER before it is sent, even though the source is a
 * checked-in constant. The branded result can only be rendered by the audited
 * `SanitizedHtml` component; a control that holds only while this file is not
 * edited would not be a control.
 */
export const load: PageServerLoad = ({ locals }) => {
  requireUser(locals);
  return { html: sanitizeHtml(API_DOCS_HTML) };
};
