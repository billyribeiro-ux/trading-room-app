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

/*
  THE BUNDLE READ THAT SAT HERE, AND THE `the reference` BLOCK THAT USED IT, ARE IN
  `chat-popup-capture.test.ts`.

  It was a MODULE-SCOPE read of the gitignored `docs/source`, and `gate/evidence-bound-tests.mjs`
  excludes by FILE, so three cases took all ELEVEN here out of every checkout without the dumps —
  this container, and CI. The eight that stayed are `ours`, and the first of them is
  `the SSE payload still carries no message text`: a privacy assertion about what leaves the server.
*/
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
/*
  THE MENTION POPUP LIVES IN `RoomOverlays.svelte` as of 2026-08-17 (Phase 5, S3).

  It is an `$effect`, and Svelte's docs put an effect in the component that owns the side effect
  rather than in a class — *"if `$state` and `$derived` are used directly inside the `$effect` (for
  example, during creation of a reactive class), those values will not be treated as dependencies"*,
  which for this effect would mean the popup silently ignoring a Do Not Disturb toggle. The side
  effect is a toast and an OS notification, and `RoomOverlays` renders the `ToastHost`.

  `PAGE` is still read, and NOT as a leftover. Every assertion below now has two halves: the
  behaviour is asserted against `OVERLAYS`, and the page is asserted to no longer carry it. Only the
  second half proves the popup moved rather than being duplicated — a room with two mention effects
  pops twice per mention, and every assertion here would pass.
*/
const OVERLAYS = readFileSync(new URL('./components/RoomOverlays.svelte', import.meta.url), 'utf8');
// `SERVER` is gone with `serverCode`: `+page.server.ts` no longer holds any of this.

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const pageCode = stripComments(PAGE);
const overlaysCode = stripComments(OVERLAYS);
// `serverCode` is gone: everything this file asserted about the server moved to the remote
// modules, and a reader that nothing reads is the next person's dead end.

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
    /*
      Scoped to the PAYLOAD, not to the whole helper, since 2026-08-16.

      The helper now TAKES a body — `publishChatToRoom` reads it to answer "does this mention you"
      per recipient, and discards it — so grepping the function for the word `body` stopped being
      able to tell reading from publishing. The property is unchanged and is asserted on the object
      that actually travels: the argument between the room and the message.

      The runtime half lives in `src/lib/server/chat-mention-fanout.test.ts`, which inspects what a
      subscriber RECEIVED. Source text cannot prove the hub does not add a field of its own; that
      file can, and does.
    */
    const from = chatCommands.indexOf('publishChatToRoom(');
    expect(from, 'the publish call must exist for this to guard anything').toBeGreaterThan(-1);
    const payload = chatCommands.slice(
      chatCommands.indexOf('{', from),
      chatCommands.indexOf('}', from) + 1
    );
    expect(payload).toContain('senderEmailHash');
    expect(payload).not.toContain('body');
    expect(payload).not.toMatch(/\btext\b/);
    expect(payload).not.toMatch(/\bbodyHtml\b/);
  });

  it('reads the text from the server-filtered data instead', () => {
    // RE-POINTED 2026-08-15: the log is now handed to `RoomOrderedArrivals` rather than bound to a
    // local first. The point of the assertion is unchanged — the text comes from `data.messages`,
    // which the server has already filtered for THIS viewer, and never from the SSE payload.
    expect(overlaysCode).toContain('mentionArrivals.fresh(data.messages)');
    expect(overlaysCode).toContain('toasts.show({');
    // `requestAlertBrowserNotification` became `RoomToasts.notify` in Phase 5 slice 1. The call site
    // stays with the EFFECT, because deciding to notify is the mention effect's job and not the
    // queue's — which is why it travelled to `RoomOverlays` in S3 rather than into `RoomToasts`.
    expect(overlaysCode).toContain('toasts.notify(title, item.body');

    /*
      THE MOVE, ASSERTED. Two mention effects would pop and notify twice for one mention, and every
      assertion above would still pass. This is the half that makes them mean something.
    */
    expect(pageCode, 'the mention popup left the page in S3').not.toContain('mentionArrivals');
    expect(pageCode, 'the mention popup left the page in S3').not.toContain('isMentionOf(');
  });

  it('honours BOTH gates, and the popup gate does NOT take the sound with it', () => {
    /*
      RE-POINTED 2026-09-03, and the drift is the interesting part: the CODE was fixed and this
      assertion was not, because a module-scope capture read had taken the whole file out of every
      run. It asserted `if (prefs.doNotDisturbOn || !prefs.chatPopup) return;` — the single combined
      gate, which is the DEFECT. `RoomOverlays.svelte` records the correction at the line: upstream
      has two SIBLING gates under one Do Not Disturb (byte 1,431,196), `chatSoundOn` deciding the
      sound and `chatPopup` deciding the toast, so returning on `chatPopup` *"took the sound with
      it, so a member who had turned the popup off was never told they had been named at all."*

      Asserted by ORDER rather than as one string, because that is the property the fix established
      and a re-merge of the two gates cannot satisfy it: Do Not Disturb returns first, the ring
      happens next, and only then does the popup gate return.
    */
    const dnd = overlaysCode.indexOf('if (prefs.doNotDisturbOn) return;');
    expect(dnd, 'the Do Not Disturb gate must be findable').toBeGreaterThan(-1);
    const sound = overlaysCode.indexOf("if (prefs.chatSoundOn) playSoundEffect('pling');", dnd);
    const popup = overlaysCode.indexOf('if (!prefs.chatPopup) return;', dnd);
    expect(sound, 'the mention ring must follow the Do Not Disturb gate').toBeGreaterThan(dnd);
    expect(popup, 'the popup gate must exist').toBeGreaterThan(dnd);
    expect(popup, 'the ring must happen BEFORE the popup gate returns').toBeGreaterThan(sound);

    // ...and the two are never re-merged into the one gate that was the bug.
    expect(overlaysCode).not.toContain('prefs.doNotDisturbOn || !prefs.chatPopup');
  });

  it('never announces your own message', () => {
    /*
      RE-POINTED with the case above. This read `if (item.senderId === data.user.id) continue;` from
      a `for` loop that became a `.filter` in the same correction — the two conditions are one
      predicate now, evaluated before the batch is counted, which is what lets `mentions.length === 0`
      return early rather than looping over messages that were never mentions.
    */
    expect(overlaysCode).toContain('item.senderId !== data.user.id');
  });

  it('uses the shared mention rule, with the admin flag for @all', () => {
    expect(overlaysCode).toContain(
      'isMentionOf(item.body, data.user.displayName, item.isAdmin === true)'
    );
  });

  it('titles it exactly as the reference does', () => {
    expect(overlaysCode).toContain("`Mention from @${item.senderName ?? 'Unknown'}`");
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
    expect(overlaysCode).toContain('new RoomOrderedArrivals<');
    expect(overlaysCode).toContain('const fresh = mentionArrivals.fresh(data.messages);');
    expect(overlaysCode).toContain('if (fresh.length === 0) return;');
    // Not `RoomArrivals` by accident: the two are imported together, and picking the wrong one
    // compiles, type-checks, and replays the whole log as toasts the first time a marker is trimmed.
    expect(overlaysCode).toContain('const mentionArrivals = new RoomOrderedArrivals<');
  });

  it('does no arithmetic on a message id, in the page or in the overlay layer', () => {
    /*
      `id-opacity-contract.test.ts` caught the first draft doing `Math.max(highest, item.id)`. The
      room-to-API cutover replaces numeric ids with uuids, and `Math.max` over a uuid is not a type
      error — it is NaN at runtime.

      The class now makes this UNWRITABLE rather than merely absent: `RoomOrderedArrivals` constrains
      its row to `{ id: unknown }`, so equality and position are the only operations available. This
      keeps watching the page anyway, because the page is where the mistake was made — and watches
      `RoomOverlays` too as of S3, because that is where the code now is and a guard that follows the
      code only half way is a guard that stopped guarding.
    */
    for (const source of [pageCode, overlaysCode]) {
      expect(source).not.toMatch(/Math\.max\([^)]*item\.id/);
      expect(source).not.toMatch(/item\.id\s*>\s*lastPopupChatId/);
    }
  });
});
