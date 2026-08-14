import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  `preferences.chatPopup` — a toast and a browser notification when somebody mentions you.

  The reference keeps it in one block with the sound, both under the same outer gate
  (`main.d6d3c112b59b7d0d.js` byte 1431308):

      preferences.doNotDisturbOn || (
        preferences.chatSoundOn && soundEffectsService.pling.play(),
        preferences.chatPopup && (
          alertService.info(e.txt, 'Mention from @' + e.n, { enableHtml: !0 }),
          window.Notification && Notification.requestPermission().then(i => {
            if ('granted' == i || 'default' == i) new Notification('Mention from @' + e.n, {…})
          })
        )
      )

  The sound half has been in the SSE handler since it was written. This is the other half, and both
  the toast helper and the notification helper already existed — built for alerts, and matching the
  reference's `granted || default` and gravatar fallback exactly.

  WHY IT IS DRIVEN OFF `data.messages` AND NOT THE SSE PAYLOAD. This is the assertion that matters
  most in this file. The chat event carries `senderId`, `senderEmailHash` and the CHANNEL — never
  the text — and `room` is a chat channel that can be an admin one. Putting message bodies on that
  wire so a popup could read them would broadcast admin chat to every subscriber. The refetched
  `data.messages` has already been filtered by the server for this viewer, so reading the text
  there shows nobody anything they were not entitled to see.
*/

const BUNDLE = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const SERVER = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const pageCode = stripComments(PAGE);
const serverCode = stripComments(SERVER);

describe('the reference', () => {
  it('gates the popup on doNotDisturbOn AND chatPopup, beside the sound', () => {
    const flat = BUNDLE.replace(/\s+/g, '');
    expect(flat).toContain(
      'preferences.doNotDisturbOn||(this.appService.globals.preferences.chatSoundOn'
    );
    expect(flat).toContain('preferences.chatPopup&&(this.alertService.info');
  });

  it('titles it "Mention from @"', () => {
    expect(BUNDLE).toContain('Mention from @');
  });

  it('asks permission when the preference is ENABLED, not only when one fires', () => {
    // `chatPopupChange()` ends with `chatPopup && window.Notification && requestPermission()`.
    expect(BUNDLE.replace(/\s+/g, '')).toContain(
      'preferences.chatPopup&&window.Notification&&Notification.requestPermission()'
    );
  });
});

describe('ours', () => {
  it('the SSE payload still carries no message text', () => {
    /*
      The security property this feature must not cost. If a `body` or `text` field ever joins that
      publish, admin chat goes to every subscriber — so it is asserted rather than trusted.
    */
    const publish = serverCode.slice(
      serverCode.indexOf("channel: 'chat'"),
      serverCode.indexOf("channel: 'chat'") + 260
    );
    expect(publish).toContain('senderEmailHash');
    expect(publish).not.toContain('body');
    expect(publish).not.toMatch(/\btext\b/);
  });

  it('reads the text from the server-filtered data instead', () => {
    expect(pageCode).toContain('const messages = data.messages;');
    expect(pageCode).toContain('showToast({');
    expect(pageCode).toContain('requestAlertBrowserNotification(title, item.body');
  });

  it('honours BOTH gates, do-not-disturb first', () => {
    expect(pageCode).toContain('if (doNotDisturbOn || !chatPopup) return;');
  });

  it('never announces your own message', () => {
    expect(pageCode).toContain('if (item.senderId === data.user.id) continue;');
  });

  it('uses the shared mention rule, with the admin flag for @all', () => {
    expect(pageCode).toContain(
      'if (!isMentionOf(item.body, data.user.displayName, item.isAdmin === true)) continue;'
    );
  });

  it('titles it exactly as the reference does', () => {
    expect(pageCode).toContain("`Mention from @${item.senderName ?? 'Unknown'}`");
  });

  it('stays silent on the backlog when you arrive', () => {
    /*
      The behaviour that would make this worse than not having it: walking into a room and being
      given fifty OS notifications for messages sent while you were away.
    */
    expect(pageCode).toContain('if (!popupSeeded) {');
    expect(pageCode).toContain('lastPopupChatId = messages.at(-1)?.id;');
  });

  it('treats the marker as an OPAQUE id — no arithmetic, no ordering', () => {
    /*
      `id-opacity-contract.test.ts` caught the first draft doing `Math.max(highest, item.id)`. The
      room-to-API cutover replaces numeric ids with uuids, and `Math.max` over a uuid is not a type
      error — it is NaN at runtime. Equality and position only.
    */
    expect(pageCode).toContain('messages.findIndex((item) => item.id === lastPopupChatId)');
    expect(pageCode).not.toMatch(/Math\.max\([^)]*item\.id/);
    expect(pageCode).not.toMatch(/item\.id\s*>\s*lastPopupChatId/);
  });

  it('re-seeds rather than re-announcing when the marker is gone', () => {
    // A trimmed log or a tab change gives `indexOf` -1, and `slice(0)` would replay everything.
    expect(pageCode).toContain('if (lastPopupChatId !== undefined && seenAt === -1) {');
  });
});
