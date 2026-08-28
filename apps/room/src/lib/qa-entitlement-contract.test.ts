import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import RoomMessage from './components/RoomMessage.svelte';

/**
 * THE ASK-A-QUESTION BUTTON, and the entitlement that was defaulting OPEN.
 *
 * ## What was wrong
 *
 * `RoomMessage.svelte` has drawn the ask-a-question button on every alert since the day it was
 * written, gated on `!isQaMessage && hasQaOnAlerts`. That is the reference's own gate, at bundle
 * byte 1,339,784:
 *
 * ```js
 * O(1, !e.isQAMsg && e.appService.globals.sessData.hasQAOnAlerts ? 1 : -1)
 * ```
 *
 * The value never arrived. `hasQaOnAlerts` was declared as a prop **defaulting to `true`**, and
 * nothing passed it — not the page, not `AlertChatArea`, not `ExtraChatPane`. So the button appeared
 * on every alert in every room whether the owner had bought Q&A or not, and pressing it opened the
 * Q&A modal. Found by `gate/audit-setting-coverage.mjs` on 2026-08-28.
 *
 * **An entitlement whose prop defaults open is not an entitlement.** The default is `false` now and
 * the value travels on `RoomMessageChrome`, which is the one place three components read a message's
 * room settings from.
 *
 * ## Why this file, and not `room-message-render.test.ts`
 *
 * That file is evidence-bound: it reads a captured fixture, so `gate/evidence-bound-tests.mjs`
 * excludes it wherever the capture roots are absent — which is every clone but the author's. The
 * first draft of these assertions went there and **silently did not run**, which is precisely the
 * class of failure this repository has already met. Nothing here reads a capture; every prop is
 * inline, so it runs everywhere.
 *
 * ## The sender name is the redaction placeholder, and that is the gate talking
 *
 * `gate/verify-privacy-boundary.mjs` refused the first draft of this file: it carried the owner's
 * real name, copied from the fixture-driven test next door. That file is evidence-bound and
 * excluded wherever the capture roots are absent, so it never trips the check; this one is not, and
 * it did — immediately, on the first run. `[OWNER_NAME]` is the repository's own placeholder and is
 * what the refusal names.
 *
 * ## Why both directions are asserted
 *
 * Each catches a different regression. The absent case catches the entitlement defaulting open
 * again. The present case catches somebody "fixing" that by deleting the button. **A gate that
 * refuses everybody is as wrong as one that refuses nobody**, and it is the likelier mistake when
 * the fix is a one-line default change.
 */
const alertProps = (hasQaOnAlerts?: boolean) => ({
  item: {
    id: -3,
    senderId: -1,
    senderName: '[OWNER_NAME]',
    senderEmailHash: 'hash',
    senderAvatarUrl: '',
    body: 'an alert',
    createdAt: new Date(0),
    isAdmin: true,
    questionCount: 2
  },
  kind: 'alert' as const,
  currentUserId: 1,
  currentUserEmailHash: 'someone-else',
  viewerIsPresenter: true,
  theme: 'dark' as const,
  menuOpen: false,
  showDateSeparator: false,
  ontoggle: () => {},
  onaction: () => {},
  ...(hasQaOnAlerts === undefined ? {} : { hasQaOnAlerts })
});

describe('the Q&A entitlement on an alert', () => {
  it('draws the button when the room has bought Q&A on alerts', () => {
    const { body } = render(RoomMessage, { props: alertProps(true) });
    expect(body).toContain('alert-qa');
    expect(body).toContain('Ask a question');
    /*
      The captured count badge rides on the same button — `> (1) <` in the capture, with the literal
      spaces that separate it from the icon. Asserting it here proves this is the button and not some
      other element that happens to carry the class.
    */
    expect(body).toContain('(2)');
  });

  it('draws nothing when the room has not', () => {
    const { body } = render(RoomMessage, { props: alertProps(false) });
    expect(body).not.toContain('alert-qa');
    expect(body).not.toContain('Ask a question');
  });

  /*
    THE DEFAULT ITSELF, asserted separately and deliberately.

    `RoomMessageChrome` carries the value now, so every call site that renders an alert passes it.
    But `ModalHost`'s Q&A thread renders `RoomMessage` WITHOUT the chrome — it passes props one by
    one — and a prop that defaults open puts the entitlement back the moment a fourth call site is
    added and forgets. Omitting the prop entirely is the case this asserts, and it is the exact
    shape of the bug being fixed.
  */
  it('defaults CLOSED when nobody passes it, because an entitlement must fail closed', () => {
    const { body } = render(RoomMessage, { props: alertProps(undefined) });
    expect(body).not.toContain('alert-qa');
  });

  /*
    The positive control on the whole file: a message renders at all.

    Without it, a change that made `render` return an empty body would leave the two `not.toContain`
    assertions passing over nothing — the vacuous-test failure this repository has met four times.
  */
  it('renders a message at all, so the refusals above are not vacuous', () => {
    const { body } = render(RoomMessage, { props: alertProps(true) });
    expect(body).toContain('an alert');
    expect(body).toContain('[OWNER_NAME]');
  });
});
