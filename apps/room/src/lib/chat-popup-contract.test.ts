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
// `SERVER` is gone with `serverCode`: `+page.server.ts` no longer holds any of this.

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const pageCode = stripComments(PAGE);
// `serverCode` is gone: everything this file asserted about the server moved to the remote
// modules, and a reader that nothing reads is the next person's dead end.

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
    /*
      The publish moved to `chat-messages.remote.ts` with `sendMessage` and `replyMessage`, and it
      is now ONE function both call rather than two verbatim copies — so this reads the single
      `announceChatMessage` instead of slicing whichever copy came first.
    */
    const chatCommands = readFileSync(
      new URL('../routes/chat-messages.remote.ts', import.meta.url),
      'utf8'
    );
    const from = chatCommands.indexOf('function announceChatMessage(');
    expect(from, 'the publish helper must exist for this to guard anything').toBeGreaterThan(-1);
    const publish = chatCommands.slice(from, chatCommands.indexOf('\n}', from));
    expect(publish).toContain('senderEmailHash');
    expect(publish).not.toContain('body');
    expect(publish).not.toMatch(/\btext\b/);
  });

  it('reads the text from the server-filtered data instead', () => {
    // RE-POINTED 2026-08-15: the log is now handed to `RoomOrderedArrivals` rather than bound to a
    // local first. The point of the assertion is unchanged — the text comes from `data.messages`,
    // which the server has already filtered for THIS viewer, and never from the SSE payload.
    expect(pageCode).toContain('mentionArrivals.fresh(data.messages)');
    expect(pageCode).toContain('toasts.show({');
    // `requestAlertBrowserNotification` became `RoomToasts.notify` in Phase 5 slice 1. The call site
    // stays here, because deciding to notify is the mention effect's job and not the queue's.
    expect(pageCode).toContain('toasts.notify(title, item.body');
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

  it('asks RoomOrderedArrivals which messages are new, and nothing else', () => {
    /*
      RE-POINTED 2026-08-15. Three assertions used to read the marker logic out of this page as text:
      the priming branch, the `findIndex` equality compare, and the lost-marker re-seed. All three
      moved into `RoomOrderedArrivals`, where `arrivals.test.ts` now EXECUTES them — which is a
      strictly better instrument for rules whose failure is "a member is given fifty operating-system
      notifications at once" and which no amount of reading the source can demonstrate.

      What stays this file's business is that the page asks the right class. Not `RoomArrivals`: an
      identity set has no way to express the re-seed, so wiring the wrong one here would compile,
      type-check, and replay the whole log as toasts the first time a marker was ever trimmed.
    */
    expect(pageCode).toContain('new RoomOrderedArrivals<');
    expect(pageCode).toContain('const fresh = mentionArrivals.fresh(data.messages);');
    expect(pageCode).toContain('if (fresh.length === 0) return;');
  });

  it('does no arithmetic on a message id, anywhere in the page', () => {
    /*
      `id-opacity-contract.test.ts` caught the first draft doing `Math.max(highest, item.id)`. The
      room-to-API cutover replaces numeric ids with uuids, and `Math.max` over a uuid is not a type
      error — it is NaN at runtime.

      The class now makes this UNWRITABLE rather than merely absent: `RoomOrderedArrivals` constrains
      its row to `{ id: unknown }`, so equality and position are the only operations available. This
      keeps watching the page anyway, because the page is where the mistake was made.
    */
    expect(pageCode).not.toMatch(/Math\.max\([^)]*item\.id/);
    expect(pageCode).not.toMatch(/item\.id\s*>\s*lastPopupChatId/);
  });
});
