import { describe, expect, it } from 'vitest';

import {
  captureErrorMessage,
  captureErrorName,
  getBrowserPermissionGuidance,
  mediaCaptureErrorMessage,
  permissionForCapture
} from './media-capture-error';

/*
  These assertions could not be written while this logic lived in `+page.svelte`.

  That is the argument for the extraction in one line: 131 lines decided which sentence a user reads
  when their microphone fails, and the only way to exercise any of it was to mount the whole room
  page and provoke a real `getUserMedia` rejection. Now it is a function call.

  The copy is asserted VERBATIM. It is shipped product text, and a refactor that quietly reworded it
  would be a product change smuggled in under a cleanup.
*/

const base = { errorMessage: 'boom', isSecureContext: true } as const;

describe('the two cases the caller must handle itself', () => {
  /*
    Both return null, and for different reasons. NotAllowedError needs the async Permissions API
    answer before anything is said; AbortError is the user closing the picker, where saying anything
    is noise. A future edit that gave either one a sentence here would make the room talk over the
    user.
  */
  it.each(['microphone', 'camera', 'screen'] as const)('NotAllowedError yields null for %s', (kind) => {
    expect(mediaCaptureErrorMessage({ ...base, kind, errorName: 'NotAllowedError' })).toBeNull();
  });

  it.each(['microphone', 'camera', 'screen'] as const)('AbortError yields null for %s', (kind) => {
    expect(mediaCaptureErrorMessage({ ...base, kind, errorName: 'AbortError' })).toBeNull();
  });
});

describe('microphone copy', () => {
  const say = (errorName: string, isSecureContext = true) =>
    mediaCaptureErrorMessage({ ...base, isSecureContext, kind: 'microphone', errorName });

  it('names the three supported browsers when unsupported', () => {
    expect(say('NotSupportedError')).toBe(
      'Your browser does not support microphone access. Please use Chrome, Firefox, or Safari.'
    );
  });

  it('asks the user to check the hardware when none is found', () => {
    expect(say('NotFoundError')).toBe(
      'No microphone detected. Please ensure you have a microphone connected and try again.'
    );
  });

  it('blames HTTPS only when the context is insecure', () => {
    expect(say('SecurityError', true)).toBe(
      'Security error accessing microphone. Please check your browser settings.'
    );
    expect(say('SecurityError', false)).toBe(
      'Microphone access requires a secure connection (HTTPS). Please check your browser settings or contact your administrator.'
    );
  });

  it('has an OverconstrainedError branch', () => {
    expect(say('OverconstrainedError')).toBe(
      'The selected microphone does not meet the required specifications. Please try a different microphone.'
    );
  });

  it('falls back to the raw message', () => {
    expect(say('SomethingElse')).toBe('Error enabling microphone: boom');
  });
});

describe('camera copy', () => {
  const say = (errorName: string, isSecureContext = true) =>
    mediaCaptureErrorMessage({ ...base, isSecureContext, kind: 'camera', errorName });

  it('covers the same five branches with camera wording', () => {
    expect(say('NotSupportedError')).toBe(
      'Your browser does not support camera access. Please use Chrome, Firefox, or Safari.'
    );
    expect(say('NotFoundError')).toBe(
      'No camera detected. Please ensure you have a camera connected and try again.'
    );
    expect(say('SecurityError', true)).toBe(
      'Security error accessing camera. Please check your browser settings.'
    );
    expect(say('SecurityError', false)).toBe(
      'Camera access requires a secure connection (HTTPS). Please check your browser settings or contact your administrator.'
    );
    expect(say('OverconstrainedError')).toBe(
      'The selected camera does not meet the required specifications. Please try a different camera.'
    );
    expect(say('whatever')).toBe('Error enabling camera: boom');
  });
});

describe('screen copy', () => {
  const say = (errorName: string, isSecureContext = true) =>
    mediaCaptureErrorMessage({ ...base, isSecureContext, kind: 'screen', errorName });

  it('talks about screens and windows, not devices', () => {
    expect(say('NotSupportedError')).toBe(
      'Your browser does not support screen sharing. Please use Chrome, Firefox, or Safari.'
    );
    expect(say('NotFoundError')).toBe(
      'No screens or windows available for sharing. Please ensure you have a screen connected.'
    );
    expect(say('SecurityError', false)).toBe(
      'Screen sharing requires a secure connection (HTTPS). Please check your browser settings or contact your administrator.'
    );
  });

  it('has NO OverconstrainedError branch, and falls through to the generic sentence', () => {
    /*
      The asymmetry is deliberate and is the single easiest thing to "tidy up" wrongly. Microphone
      and camera each answer OverconstrainedError with their own sentence; screen sharing never did.
      Giving it one would be inventing product copy nobody wrote.
    */
    expect(say('OverconstrainedError')).toBe('Screen sharing error: boom');
  });
});

describe('the vocabulary gap between us and the Permissions API', () => {
  it('maps screen to display-capture and leaves the others alone', () => {
    expect(permissionForCapture('screen')).toBe('display-capture');
    expect(permissionForCapture('microphone')).toBe('microphone');
    expect(permissionForCapture('camera')).toBe('camera');
  });
});

describe('reading a thrown value that may not be a DOMException', () => {
  it('takes name and message when they are there', () => {
    const error = { name: 'NotFoundError', message: 'no device' };
    expect(captureErrorName(error)).toBe('NotFoundError');
    expect(captureErrorMessage(error)).toBe('no device');
  });

  it('never puts undefined into a sentence', () => {
    // A thrown string, a thrown null - both reach the fallback sentence rather than "undefined".
    for (const thrown of ['a string', null, undefined, 42]) {
      expect(captureErrorName(thrown)).toBe('');
      expect(captureErrorMessage(thrown)).toBe('Unknown error occurred');
    }
  });
});

describe('browser-specific settings guidance', () => {
  const CHROME =
    'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
  const EDGE = `${CHROME} Edg/126.0`;
  const SAFARI = 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
  const FIREFOX = 'Mozilla/5.0 (Macintosh; rv:127.0) Gecko/20100101 Firefox/127.0';

  it('tells Chrome users the Chrome path', () => {
    expect(getBrowserPermissionGuidance('microphone', CHROME)).toBe(
      'Permission denied. To enable microphone, go to Chrome Settings > Privacy and security > Site Settings > Microphone and allow access for this site.'
    );
  });

  it('does not mistake Edge for Chrome, though Edge claims to be Chrome', () => {
    /*
      Every Chromium browser puts `chrome` in its UA. The Chrome test excludes `edg` for exactly
      this reason, and without that exclusion Edge users get sent to a menu Edge does not have.
    */
    expect(getBrowserPermissionGuidance('camera', EDGE)).toContain('Edge');
    expect(getBrowserPermissionGuidance('camera', EDGE)).toContain(
      'Settings > Cookies and site permissions > Camera'
    );
  });

  it('does not mistake Chrome for Safari, though Chrome claims to be Safari', () => {
    expect(getBrowserPermissionGuidance('camera', SAFARI)).toContain('Safari > Preferences');
    expect(getBrowserPermissionGuidance('camera', CHROME)).not.toContain('Safari > Preferences');
  });

  it('handles Firefox', () => {
    expect(getBrowserPermissionGuidance('microphone', FIREFOX)).toContain(
      'Settings > Privacy & Security > Permissions > Microphone'
    );
  });

  it('degrades to a generic sentence on an unknown browser rather than guessing', () => {
    const guidance = getBrowserPermissionGuidance('display-capture', 'SomeBot/1.0');
    expect(guidance).toBe(
      'Permission denied. To enable screen sharing, go to your browser  and allow access for this site.'
    );
  });

  it('always starts with the prefix the caller tests for', () => {
    /*
      Load-bearing. `reportMediaCaptureError` shows this only when the string starts with
      "Permission denied"; every other Permissions API state returns a sentinel instead. Lose the
      prefix and denied users are told nothing.
    */
    for (const ua of [CHROME, EDGE, SAFARI, FIREFOX, 'SomeBot/1.0']) {
      expect(getBrowserPermissionGuidance('microphone', ua).startsWith('Permission denied')).toBe(
        true
      );
    }
  });
});
