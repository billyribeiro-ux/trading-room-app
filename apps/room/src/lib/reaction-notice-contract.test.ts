import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ReactionArrivals } from './reaction-arrivals';
import { codeOf } from './source-comments';

/**
 * USM-08, USM-09 and USM-10 — being told when somebody reacts to something of yours.
 *
 * ```js
 * subscribe("updateChatMsgReaction", i => preferences.reactionsPopup &&
 *   alertsService.info(`${i.n}: ${i.remove?"removed":""} ${i.emoji} on "${i.txt}"`,
 *                      "Message Reaction", {enableHtml:!0}))            // byte 2,509,044
 *
 * preferences.doNotDisturbOn || (c && preferences.qaReactionSoundOn && qaAlert.play()),
 *   preferences.reactionsPopupQA && l && c &&
 *     alertsService.info(`${c.n}: ${c.remove?"removed":""} ${c.emoji} on "${c.txt}"`,
 *                        "QA Reaction", {enableHtml:!0})                // byte 1,410,150
 * ```
 *
 * ## The reference's mechanism cannot be copied, and that is the whole design
 *
 * Both toasts render `txt` — the reacted-to message BODY — read off `reactionDetails` /
 * `qaReactionDetails`, fields on an inbound frame. `#lib/message-mutation-frames.ts` states why
 * this room's frames carry nothing: *"this hub's SSE stream is per ROOM while chat is per CHANNEL,
 * so a frame carrying a message body would put admin-channel text on every subscriber's wire."*
 * And upstream then filters that payload to the right recipient IN THE BROWSER.
 *
 * So the frame stays a trigger, and a reaction is noticed by DIFFING the rows the server chose to
 * send this viewer. Everything the toast renders was already in this browser's page data.
 */

const read = (path: string) => readFileSync(path, 'utf8');
const overlays = () =>
  codeOf('src/lib/components/RoomOverlays.svelte', read('src/lib/components/RoomOverlays.svelte'));
/*
  The two App-tab checkboxes left `ModalHost.svelte` for `ReactionPrefsPane.svelte`, and the two
  notice loops left `RoomOverlays.svelte` for `#lib/room/reaction-notices.ts`, in the same commit
  that wrote them: both host files went over their ceilings, ceilings only go down, and prose is
  never trimmed to hit a number. The assertions are unchanged; only where they read.
*/
const pane = () =>
  codeOf(
    'src/lib/components/ReactionPrefsPane.svelte',
    read('src/lib/components/ReactionPrefsPane.svelte')
  );
const notices = () =>
  codeOf('src/lib/room/reaction-notices.ts', read('src/lib/room/reaction-notices.ts'));
const modal = () =>
  codeOf('src/lib/components/ModalHost.svelte', read('src/lib/components/ModalHost.svelte'));
const prefs = () => codeOf('src/lib/room/prefs.svelte.ts', read('src/lib/room/prefs.svelte.ts'));

const row = (id: number, entries: Record<string, { emoji: string; clickedBy: string[] }> = {}) => ({
  id,
  reactions: entries
});

describe('ReactionArrivals — what changed between two loads', () => {
  it('announces NOTHING on the first pass', () => {
    /*
      The rule `RoomArrivals` was written for, one level down: opening a room whose messages already
      carry fifty reactions must be silent.
    */
    const arrivals = new ReactionArrivals();
    expect(arrivals.changes([row(1, { a: { emoji: '🔥', clickedBy: ['hash-one'] } })])).toEqual([]);
  });

  it('reports a reaction added since the last pass', () => {
    const arrivals = new ReactionArrivals();
    arrivals.changes([row(1)]);
    expect(arrivals.changes([row(1, { a: { emoji: '🔥', clickedBy: ['hash-one'] } })])).toEqual([
      { rowId: 1, emoji: '🔥', emailHash: 'hash-one', removed: false }
    ]);
  });

  it('reports a reaction REMOVED, which is what `c.remove` is', () => {
    const arrivals = new ReactionArrivals();
    arrivals.changes([row(1, { a: { emoji: '🔥', clickedBy: ['hash-one'] } })]);
    expect(arrivals.changes([row(1)])).toEqual([
      { rowId: 1, emoji: '🔥', emailHash: 'hash-one', removed: true }
    ]);
  });

  it('tells two reactors on one row apart', () => {
    const arrivals = new ReactionArrivals();
    arrivals.changes([row(1, { a: { emoji: '🔥', clickedBy: ['hash-one'] } })]);
    const changes = arrivals.changes([
      row(1, { a: { emoji: '🔥', clickedBy: ['hash-one', 'hash-two'] } })
    ]);
    expect(changes).toEqual([{ rowId: 1, emoji: '🔥', emailHash: 'hash-two', removed: false }]);
  });

  it('says nothing about a row that is NEW to the list', () => {
    /*
      A row arriving with reactions already on it is not a reaction event — whoever announces the
      row announces it. Only a row that was already here can change.
    */
    const arrivals = new ReactionArrivals();
    arrivals.changes([row(1)]);
    expect(
      arrivals.changes([row(1), row(2, { a: { emoji: '👍', clickedBy: ['hash-two'] } })])
    ).toEqual([]);
  });

  it('does not re-announce a change it has already reported', () => {
    const arrivals = new ReactionArrivals();
    arrivals.changes([row(1)]);
    const first = arrivals.changes([row(1, { a: { emoji: '🔥', clickedBy: ['hash-one'] } })]);
    expect(first).toHaveLength(1);
    expect(arrivals.changes([row(1, { a: { emoji: '🔥', clickedBy: ['hash-one'] } })])).toEqual([]);
  });

  it('drops a row that has left the list rather than remembering it', () => {
    /*
      `RoomArrivals` has to record that its marker set grows for the life of the page. This one
      replaces the whole map every pass, so it is bounded by the list it is fed — asserted by
      showing that a row which leaves and returns is treated as new rather than as changed.
    */
    const arrivals = new ReactionArrivals();
    arrivals.changes([row(1, { a: { emoji: '🔥', clickedBy: ['hash-one'] } })]);
    arrivals.changes([]);
    expect(arrivals.changes([row(1)])).toEqual([]);
  });

  it('keys on the EMOJI and the hash together, so one person s two emoji are two events', () => {
    const arrivals = new ReactionArrivals();
    arrivals.changes([row(1, { a: { emoji: '🔥', clickedBy: ['hash-one'] } })]);
    const changes = arrivals.changes([
      row(1, {
        a: { emoji: '🔥', clickedBy: ['hash-one'] },
        b: { emoji: '👍', clickedBy: ['hash-one'] }
      })
    ]);
    expect(changes).toEqual([{ rowId: 1, emoji: '👍', emailHash: 'hash-one', removed: false }]);
  });
});

describe('USM-08 — a reaction on MY chat message', () => {
  it('is announced to the message owner and to nobody else', () => {
    /*
      Upstream's socket layer emits `updateChatMsgReaction` only when
      `reactionDetails.msgUID === globals.user.userXrefID` (byte 1,011,021). Here that filter is on
      the server's own data rather than on a payload, which is the difference that matters.
    */
    expect(notices()).toContain('if (!message || message.senderId !== context.viewerId) continue;');
  });

  it('skips the reactor s own reaction — on BOTH branches', () => {
    /*
      `toContain` alone could not see this: the line appears in the chat loop and again in the Q&A
      one, so deleting either left the assertion satisfied by the other. Its control stayed green,
      which is the second time in this session an assertion has been caught by counting rather than
      by review.
    */
    expect(
      notices().match(/if \(change\.emailHash === context\.viewerEmailHash\) continue;/g)
    ).toHaveLength(2);
  });

  it('renders the reference s line, spaces and all', () => {
    expect(notices()).toContain(
      "`${nameOf(change.emailHash)}: ${change.removed ? 'removed' : ''} ${change.emoji} on \"${text}\"`"
    );
    expect(notices()).toContain("title: 'Message Reaction'");
  });

  it('resolves the NAME from the roster, because a reaction stores only a hash', () => {
    expect(overlays()).toContain(
      "roster.users.find((user) => user.emailHash === emailHash)?.displayName ?? 'Someone'"
    );
    expect(notices()).toContain('nameOf: (emailHash: string) => string;');
  });
});

describe('USM-09 and USM-10 — a reaction on a question', () => {
  it('goes to the askers on that alert and to presenters, never the actor', () => {
    const source = notices();
    expect(source).toContain('if (!context.isPresenter && !askedOnThisAlert) continue;');
    expect(source).toContain("title: 'QA Reaction'");
  });

  it('suppresses the SOUND with Do Not Disturb and does NOT suppress the popup', () => {
    /*
      Upstream's own asymmetry, at byte 1,408,850: `doNotDisturbOn || (c && qaReactionSoundOn &&
      qaAlert.play())` — the popup is on the line after, outside that guard. Reproducing only half
      of it would be silent on one setting and loud on the other.
    */
    /*
      Scoped to `questionReactionNotice`, not the file: `if (!context.popupEnabled) continue;` is in
      BOTH exported functions, and the chat one comes first — so a file-wide `indexOf` compared the
      sound gate against the WRONG popup gate and the ordering assertion inverted. Caught on a
      correct change, which is the good direction to fail in.
    */
    const whole = notices();
    const from = whole.indexOf('export function questionReactionNotice');
    expect(from, 'the Q&A notice is missing').toBeGreaterThan(-1);
    const source = whole.slice(from);
    expect(source).toContain(
      'if (!context.doNotDisturbOn && context.soundEnabled) deps.playSound();'
    );
    const sound = source.indexOf('context.soundEnabled');
    const popup = source.indexOf('if (!context.popupEnabled) continue;');
    expect(sound, 'the sound gate is missing').toBeGreaterThan(-1);
    expect(popup, 'the popup gate is missing').toBeGreaterThan(sound);
    const between = source.slice(sound, popup);
    expect(between).not.toContain('doNotDisturbOn');
  });
});

describe('the three controls', () => {
  it('carry the reference s ids and the on/off pair', () => {
    const source = pane() + modal();
    for (const id of ['app-reactions-popup', 'app-reactions-popup-qa', 'app-reactions-sound-qa']) {
      expect(source, id).toContain(`id="${id}"`);
      expect(source, id).toContain(`{settingChecks['${id}'] ? 'on' : 'off'}`);
    }
  });

  it('are mapped, which is this file s declaration that each has a consumer', () => {
    const source = modal();
    expect(source).toContain("'app-reactions-popup': 'reactionsPopup'");
    expect(source).toContain("'app-reactions-popup-qa': 'reactionsPopupQA'");
    expect(source).toContain("'app-reactions-sound-qa': 'qaReactionSoundOn'");
  });

  it('are each behind the ROOM setting that turns their feature on', () => {
    /*
      `O(116, sessData.enableReactions ? 116 : -1)` and `O(117, sessData.enableQAReactions ? 117 :
      -1)` at bytes 2,285,066 and 2,285,130. A room with reactions off has nothing for these to
      silence, so drawing them would be three more controls whose only effect is their own label.
    */
    expect(pane()).toContain('{#if enableReactions}');
    expect(pane()).toContain('{#if enableQaReactions}');
    /* The pane is FED them, and the Alert tab's sound box keeps its own copy of the second gate. */
    expect(modal()).toContain('enableReactions={messageChrome.enableReactions}');
    expect(modal()).toContain('{#if messageChrome.enableQaReactions}');
  });

  it('have preferences, all three defaulting on as the reference does', () => {
    const source = prefs();
    for (const key of ['reactionsPopup', 'reactionsPopupQA', 'qaReactionSoundOn']) {
      expect(source, key).toContain(`loadedSettings.${key} !== false`);
      expect(source, key).toContain(`if (key === '${key}')`);
    }
  });
});

describe('the two rows are bare, because the reference gives them no header', () => {
  /*
    THE INVERSE OF EVERY OTHER FINDING THIS WEEK — markup this room INVENTED, rather than markup the
    reference has and this room lacks. Found 2026-09-01 by a background sweep and confirmed against
    the pinned bundle.

    `REe` @ 2,226,939 and `NEe` @ 2,227,411 are, in full:

        d(0,"div",17)(1,"input",131),x("change",…reactionsPopupOnChange()),u(),
        d(2,"label",132),v(3," Reactions Response "),H(4,AEe,2,0,"span")(5,PEe,2,0),u()()

    const 17 is `[1,"ml-5"]`. That is the whole template: a row, a checkbox, a label, an on/off
    span. There is no header, no icon and no id.

    This pane carried one anyway, on both rows:

        <div id="appReactionsPopup" title="Reactions Response" class="pb-2">
          <i class="fas fa-face-smile"></i><span class="pl-2">Reactions Response:</span>
        </div>

    Occurrences in the 2,891,205-byte bundle: `appReactionsPopup` 0, `fa-face-smile` 0,
    `"Reactions Response:"` (with the colon) 0. `appDisableVideo` — the header of the group
    IMMEDIATELY BESIDE these two — is 1, which is why it looked right: this modal has twenty-odd
    section headers of exactly that icon-then-`span.pl-2` shape, and the pattern was carried across
    to two rows that do not have one.

    And the icon drew nothing: `fa-face-smile` is Font Awesome 6 and this project ships 5.8.1.
    `font-awesome-contract.test.ts` is the sweep that now catches that half.
  */
  it('renders no header block on either row', () => {
    const source = pane();
    expect(source).not.toContain('appReactionsPopup');
    expect(source).not.toContain('fa-face-smile');
    expect(source).not.toContain('Reactions Response:');
    expect(source).not.toContain('Reactions QA Response:');
  });

  it('still renders both rows, with the capture s own class and label', () => {
    /* The deletion took the header and nothing else — const 17, and the label `REe` renders. */
    const source = pane();
    expect(source).toContain('<div class="ml-5">');
    expect(source).toContain('id="app-reactions-popup"');
    expect(source).toContain('id="app-reactions-popup-qa"');
    expect(source).toContain('>Reactions Response');
    expect(source).toContain('>Reactions QA Response');
  });

  it('keeps the box around them, which IS ours and is recorded as ours', () => {
    /*
      `H(115,MEe,…)(116,REe,…)(117,NEe,…)(118,UEe,…)(119,HEe,…),u()` @ 2,278,483 — upstream has
      these two as siblings inside a box the other three share, and three of those five live in
      `ModalHost.svelte`. A component cannot be a sibling inside a box its parent opened without the
      parent threading it through, which is what the size ratchet refused when this pane was made.
    */
    expect(pane()).toContain('<div class="p-2 text-mode-box">');
    /*
      Read RAW and not through `codeOf`: what is asserted here is that the REASON is written down
      beside the markup, and `codeOf` exists to remove exactly that.
    */
    expect(read('src/lib/components/ReactionPrefsPane.svelte')).toContain(
      'a box their four\n  siblings share'
    );
  });
});
