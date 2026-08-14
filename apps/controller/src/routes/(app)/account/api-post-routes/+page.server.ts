import { requireUser } from '$lib/server/auth';
import { sanitizeHtml } from '$lib/server/sanitize-html';
import { API_POST_ROUTES_HTML } from '$lib/content/api-post-routes';
import type { PageServerLoad } from './$types';

/**
 * The POST Route API documentation — the manage Settings tab's "API POST Routes Docs" button.
 *
 * A DIFFERENT document from `/account/api-docs`, which is the Sessions API reference. The reference
 * serves two:
 *
 *     account page   api-docs.html?src=/public/html/API_Documentation.md
 *     manage tab     api-docs.html?src=/public/html/POST_ROUTE_API_DOCUMENTATION.md
 *
 * Both of our buttons used to open the first one, so a button labelled "API POST Routes Docs" showed
 * a document that is not the POST routes.
 *
 * Sanitised on the SERVER, like its sibling, even though the source is a generated constant. The
 * branded result can only be rendered by the audited `SanitizedHtml` component; a control that holds
 * only while this file is not edited would not be a control.
 */
export const load: PageServerLoad = ({ locals }) => {
  requireUser(locals);
  return { html: sanitizeHtml(API_POST_ROUTES_HTML) };
};
