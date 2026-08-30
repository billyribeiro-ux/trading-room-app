import type { AlertTab } from '#lib/types.js';

export const POST_ALERT_LEGAL_DISCLOSURE = 'FOR EDUCATIONAL PURPOSES ONLY, NOT FINANCIAL ADVICE';
export const POST_ALERT_URL_SCHEME_ERROR = 'The link seems to be missing "https://" or "http://"';

export interface PostAlertDraft {
  tab: AlertTab;
  alertText: string;
  alertUrl: string;
  linkAlertText: string;
  imageAlertText: string;
  legalDisclosure: boolean;
  legalDisclosureText: string;
  fileCount: number;
  /**
   * The composer's checked alert labels, already reduced to their prefix by `alertLabelPrefix`.
   *
   * A STRING and not the labels, because the ordering rule this file has to honour is about a
   * string: the reference appends the legal disclosure and then PREPENDS the labels, at all four of
   * its send sites. Passing the table instead would put the transcription of `processAlertLabels` in
   * two places, and this file is where the disclosure/labels ORDER lives, not where the prefix is
   * built.
   *
   * Optional and defaulting to none, because three of the four composers here predate it and every
   * one of their tests constructs a draft by hand.
   */
  labelPrefix?: string;
}

export type PostAlertComposition =
  | {
      status: 'noop';
      reason: 'empty-text' | 'empty-url' | 'empty-media';
    }
  | {
      status: 'error';
      message: typeof POST_ALERT_URL_SCHEME_ERROR;
    }
  | {
      status: 'upload';
      kind: 'media';
      bodyBeforeUploads: string;
    }
  | {
      status: 'post';
      kind: AlertTab;
      body: string;
    };

export interface PostAlertSubmission {
  composition: Extract<PostAlertComposition, { status: 'post' | 'upload' }>;
  files: File[];
  keepOpen: boolean;
  postOnX: boolean;
  dontPush: boolean;
  nonTradeAlert: boolean;
  legalDisclosure: boolean;
  legalDisclosureText: string;
  /**
   * The composer's checked Alert Labels, already reduced to their prefix.
   *
   * On the SUBMISSION and not only on the draft, because the upload paths compose their body AFTER
   * the modal has closed: `composeUploadedAlert` and `composePastedImageAlert` run in
   * `RoomComposer`, once the files are on the CDN, and the picker's state has to survive that trip.
   * Optional for the same reason it is optional on the draft — every existing test builds one of
   * these by hand.
   */
  labelPrefix?: string;
}

export interface PastedImageSubmission {
  file: File;
  alertText: string;
  keepOpen: boolean;
  postOnX: boolean;
  dontPush: boolean;
  nonTradeAlert: boolean;
  legalDisclosure: boolean;
  legalDisclosureText: string;
  /**
   * The composer's checked Alert Labels, already reduced to their prefix.
   *
   * On the SUBMISSION and not only on the draft, because the upload paths compose their body AFTER
   * the modal has closed: `composeUploadedAlert` and `composePastedImageAlert` run in
   * `RoomComposer`, once the files are on the CDN, and the picker's state has to survive that trip.
   * Optional for the same reason it is optional on the draft — every existing test builds one of
   * these by hand.
   */
  labelPrefix?: string;
}

function appendLegalDisclosure(
  body: string,
  legalDisclosure: boolean,
  legalDisclosureText: string
) {
  return legalDisclosure ? `${body} \n ${legalDisclosureText}` : body;
}

/**
 * The label prefix, in front of a body the disclosure has already been appended to.
 *
 * ## The ORDER is the reference's and it is not obvious
 *
 * All four of its send sites do the same two things in the same sequence:
 *
 * ```js
 * this.legalDisclosure && (e.txt += " \n " + this.legalDisclosureTxt),
 * globals.alertLabels.length > 0 && (e = this.processAlertLabels(e)),   // prepends
 * this.postOnX && this.postOnXAlert(e.txt),
 * sendServerCommand("alertMsg", e)
 * ```
 *
 * So a body with both ends up `labels + text + disclosure`, and the tweet `postOnX` composes carries
 * the labels too. Applying them the other way round would put the hashes after the disclosure, where
 * the badge renderer would still find them and a reader would not expect them.
 *
 * `alertLabelPrefix` is what builds the string; this is only where it lands.
 */
function prependAlertLabels(body: string, labelPrefix: string | undefined) {
  return labelPrefix ? `${labelPrefix}${body}` : body;
}

/**
 * Exact branch port of app-post-alert-modal.postAlert().
 *
 * Deliberately does not trim inputs: the deployed component tests JavaScript
 * truthiness and preserves the authored whitespace in the outgoing `txt`.
 */
export function composePostAlert(draft: PostAlertDraft): PostAlertComposition {
  let body = draft.alertText;

  if (draft.tab === 'url') {
    if (!draft.alertUrl) return { status: 'noop', reason: 'empty-url' };

    const lowerUrl = draft.alertUrl.toLowerCase();
    if (!lowerUrl.includes('http://') && !lowerUrl.includes('https://')) {
      return { status: 'error', message: POST_ALERT_URL_SCHEME_ERROR };
    }

    if (draft.linkAlertText) body = `${draft.linkAlertText}\n`;
    body += `${draft.alertUrl} `;
  }

  if (draft.tab === 'media') {
    if (draft.imageAlertText) body = `${draft.imageAlertText}\n`;

    if (!draft.alertUrl) {
      return draft.fileCount > 0
        ? { status: 'upload', kind: 'media', bodyBeforeUploads: body }
        : { status: 'noop', reason: 'empty-media' };
    }

    body += `${draft.alertUrl} `;
  }

  if (draft.tab === 'text' && !body) return { status: 'noop', reason: 'empty-text' };

  return {
    status: 'post',
    kind: draft.tab,
    body: prependAlertLabels(
      appendLegalDisclosure(body, draft.legalDisclosure, draft.legalDisclosureText),
      draft.labelPrefix
    )
  };
}

export function composeUploadedAlert(
  bodyBeforeUploads: string,
  uploadedUrls: readonly string[],
  legalDisclosure: boolean,
  legalDisclosureText: string,
  labelPrefix?: string
) {
  let body = bodyBeforeUploads;
  for (const url of uploadedUrls) body += ` ${url}`;
  return prependAlertLabels(
    appendLegalDisclosure(body, legalDisclosure, legalDisclosureText),
    labelPrefix
  );
}

export function composePastedImageAlert(
  alertText: string,
  uploadedUrl: string,
  legalDisclosure: boolean,
  legalDisclosureText: string,
  labelPrefix?: string
) {
  const body = alertText ? `${alertText}\n${uploadedUrl}` : uploadedUrl;
  return prependAlertLabels(
    appendLegalDisclosure(body, legalDisclosure, legalDisclosureText),
    labelPrefix
  );
}

export function postOnXIntent(body: string) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(body)}`;
}
