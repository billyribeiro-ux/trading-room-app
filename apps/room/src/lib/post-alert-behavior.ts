import type { AlertTab } from '$lib/types';

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
}

function appendLegalDisclosure(
  body: string,
  legalDisclosure: boolean,
  legalDisclosureText: string
) {
  return legalDisclosure ? `${body} \n ${legalDisclosureText}` : body;
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
    body: appendLegalDisclosure(body, draft.legalDisclosure, draft.legalDisclosureText)
  };
}

export function composeUploadedAlert(
  bodyBeforeUploads: string,
  uploadedUrls: readonly string[],
  legalDisclosure: boolean,
  legalDisclosureText: string
) {
  let body = bodyBeforeUploads;
  for (const url of uploadedUrls) body += ` ${url}`;
  return appendLegalDisclosure(body, legalDisclosure, legalDisclosureText);
}

export function composePastedImageAlert(
  alertText: string,
  uploadedUrl: string,
  legalDisclosure: boolean,
  legalDisclosureText: string
) {
  const body = alertText ? `${alertText}\n${uploadedUrl}` : uploadedUrl;
  return appendLegalDisclosure(body, legalDisclosure, legalDisclosureText);
}

export function postOnXIntent(body: string) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(body)}`;
}
