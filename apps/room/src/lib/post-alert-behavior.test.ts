import { describe, expect, it } from 'vitest';
import {
  composePastedImageAlert,
  composePostAlert,
  composeUploadedAlert,
  POST_ALERT_LEGAL_DISCLOSURE,
  POST_ALERT_URL_SCHEME_ERROR,
  postOnXIntent,
  type PostAlertDraft
} from './post-alert-behavior';

const baseDraft: PostAlertDraft = {
  tab: 'text',
  alertText: '',
  alertUrl: '',
  linkAlertText: '',
  imageAlertText: '',
  legalDisclosure: false,
  legalDisclosureText: POST_ALERT_LEGAL_DISCLOSURE,
  fileCount: 0
};

describe('decoded Post Alert behavior', () => {
  it('silently aborts each source-proven empty branch', () => {
    expect(composePostAlert(baseDraft)).toEqual({ status: 'noop', reason: 'empty-text' });
    expect(composePostAlert({ ...baseDraft, tab: 'url' })).toEqual({
      status: 'noop',
      reason: 'empty-url'
    });
    expect(composePostAlert({ ...baseDraft, tab: 'media' })).toEqual({
      status: 'noop',
      reason: 'empty-media'
    });
  });

  it('preserves text and appends the exact legal disclosure spacing', () => {
    expect(
      composePostAlert({
        ...baseDraft,
        alertText: 'Buy 100 shares',
        legalDisclosure: true
      })
    ).toEqual({
      status: 'post',
      kind: 'text',
      body: `Buy 100 shares \n ${POST_ALERT_LEGAL_DISCLOSURE}`
    });
  });

  it('uses the exact URL validation rule and exact Bootbox copy', () => {
    expect(
      composePostAlert({
        ...baseDraft,
        tab: 'url',
        alertUrl: 'example.com'
      })
    ).toEqual({ status: 'error', message: POST_ALERT_URL_SCHEME_ERROR });

    expect(
      composePostAlert({
        ...baseDraft,
        tab: 'url',
        alertUrl: 'prefix HTTPS://example.com',
        linkAlertText: 'Caption'
      })
    ).toEqual({
      status: 'post',
      kind: 'url',
      body: 'Caption\nprefix HTTPS://example.com '
    });
  });

  it('shares the URL branch semantics with media and defers selected files to upload', () => {
    expect(
      composePostAlert({
        ...baseDraft,
        tab: 'media',
        imageAlertText: 'Chart',
        fileCount: 2
      })
    ).toEqual({
      status: 'upload',
      kind: 'media',
      bodyBeforeUploads: 'Chart\n'
    });

    expect(
      composeUploadedAlert('Chart\n', ['https://cdn/one.png', 'https://cdn/two.png'], true, 'LEGAL')
    ).toBe('Chart\n https://cdn/one.png https://cdn/two.png \n LEGAL');
  });

  it('matches the separate pasted-image body branch and X intent URL', () => {
    expect(composePastedImageAlert('Caption', 'https://cdn/image.png', false, '')).toBe(
      'Caption\nhttps://cdn/image.png'
    );
    expect(postOnXIntent('Buy $AAPL')).toBe('https://twitter.com/intent/tweet?text=Buy%20%24AAPL');
  });
});
