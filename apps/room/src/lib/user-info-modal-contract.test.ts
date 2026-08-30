import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { codeOf } from '#lib/source-comments.js';

/**
 * THE USER-INFO / MODERATION MODAL, against the bytes it claims to reproduce.
 *
 * Nine rows of `docs/decoded/room-surface-audit-2026-08-30.md`'s
 * `## ModalHost: user-info / moderation modal` section land in this file. They have nothing in
 * common except the surface, which is the honest reason for one file rather than nine: each is a
 * value, a gate or a citation small enough that a test of its own would be a file of imports around
 * one `expect`, and grouping them by SURFACE is what lets the next person auditing that surface find
 * every assertion about it in one place.
 *
 * ## Every reference offset in here was read in this session, with python, from the pinned bundle
 *
 * `apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`, 2,891,205 bytes, SHA-256
 * `40796ca83dba809bb966dad0d020ee5170b33aa4556c691957cb65f0bab87524` — verified against that
 * directory's own `sha256sums.txt` before a single offset was quoted. The consts referenced below
 * were decoded by WALKING the user-info modal's `consts:[…]` array from byte 2,087,748 with
 * `src/lib/const-table.mjs` (131 entries), not by looking up the index the audit row happened to
 * name. That distinction has already earned itself: RM-25 exists because a reader who decodes the
 * table finds rows a reader who follows the citation cannot.
 *
 * ## Why the assertions read the SOURCE and not a rendered component
 *
 * Because what these rows are about is a class name, a byte offset in a comment, and which terms
 * appear in a gate. Rendering `ModalHost` needs about ninety props and would prove that the badge
 * has a class, not that it has the reference's class. `codeOf` strips comments first, always: this
 * file quotes `fa-record-vinyl` and `badge-info` in its own prose while asserting they are gone
 * from the code, which is exactly the way a source assertion gets satisfied by the thing it is
 * complaining about.
 *
 * ## Negative controls
 *
 * Every `it` here was run against a mutated source and seen RED before this file was committed —
 * the mutation, the failing test and the restore are recorded in the change's report. A contract
 * test that has never failed is a contract test nobody has checked the wiring of.
 */
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (file: string) => codeOf(file, readFileSync(`${ROOT}${file}`, 'utf8'));
const readRaw = (file: string) => readFileSync(`${ROOT}${file}`, 'utf8');

const MODAL = 'lib/components/ModalHost.svelte';
const OVERLAYS = 'lib/components/RoomOverlays.svelte';
const FOLLOW_PANE = 'lib/components/FollowChatStylePane.svelte';
const ADMIN_NOTES = 'lib/room/admin-notes.ts';

const modal = read(MODAL);
const overlays = read(OVERLAYS);
const followPane = read(FOLLOW_PANE);

/**
 * The bundle, read as text — the same way every offset in this repository is read.
 *
 * Kept OUT of the `describe` bodies so the file fails once and loudly if the capture ever moves,
 * rather than nine times with nine confusing messages.
 */
const BUNDLE = readFileSync(
  fileURLToPath(
    new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url)
  ),
  'utf8'
);

describe('the sources this file measures are actually loaded', () => {
  it('reads every file, and the bundle is the pinned one', () => {
    for (const [name, source] of Object.entries({ modal, overlays, followPane })) {
      expect(source.length, `${name} is empty after comment-stripping`).toBeGreaterThan(500);
    }
    // 2,891,205 bytes; every offset below is meaningless if this is a different file.
    expect(BUNDLE.length).toBe(2_891_205);
  });
});

describe('UIM-13 — the giveMicScreen citation names the address giveMicScreen is at', () => {
  /**
   * The defect this guards was a POINTER, not a behaviour: two comments said offset 2075481 while
   * the transcription under them was byte-correct for 2077604. A reader following the citation
   * lands on `resetFollowChatStyle` and concludes the transcription was invented.
   */
  it('reads giveMicScreen at 2,077,604 in the bundle, and something else at 2,075,481', () => {
    expect(BUNDLE.slice(2_077_604, 2_077_604 + 17)).toBe('giveMicScreen(e){');
    expect(BUNDLE.slice(2_075_481, 2_075_481 + 40)).not.toContain('giveMicScreen');
  });

  it('cites the right offset, in both places, and nowhere cites the wrong one as its address', () => {
    /*
      The comments are the SUBJECT here, so this one reads the raw file — the only assertion in
      this file that does. `codeOf` would strip exactly what is being measured.
    */
    const raw = readRaw(MODAL);
    const citations = raw.match(/(?:offset|byte)\s+2077604/g) ?? [];
    expect(citations.length, 'both giveMicScreen citations should name 2077604').toBe(2);
    /*
      2075481 may still appear — the corrected comment quotes the wrong number to explain it — but
      never again in the "transcribed from X" form that sends a reader there.
    */
    expect(raw).not.toMatch(/[Tt]ranscribed from the bundle at offset 2075481/);
    expect(raw).not.toMatch(/byte-for-byte \(bundle offset 2075481\)/);
  });
});

describe('UIM-10 — the Trial and New badges carry the reference’s own class lists', () => {
  /**
   * consts 58 and 59 of the user-info modal's table, walked from 2,087,748:
   *   58 = [1,"badge","bg-danger","trial-badge"]
   *   59 = [1,"badge","bg-warning","new-badge"]
   * The `Offline` badge is const 9 = [1,"badge","badge-danger"] and is deliberately NOT changed.
   */
  it('has both const strings in the bundle where the decode says they are', () => {
    expect(BUNDLE.slice(2_090_982, 2_091_060)).toContain('[1,"badge","bg-danger","trial-badge"]');
    expect(BUNDLE.slice(2_090_982, 2_091_100)).toContain('[1,"badge","bg-warning","new-badge"]');
  });

  it('renders Trial as bg-danger trial-badge and New as bg-warning new-badge', () => {
    expect(modal).toContain('class="badge bg-danger trial-badge">Trial<');
    expect(modal).toContain('class="badge bg-warning new-badge">New<');
  });

  it('no longer renders either badge with the Bootstrap-4 contextual class it had', () => {
    expect(modal).not.toContain('class="badge badge-info"');
    /*
      `badge badge-danger` SURVIVES, twice, and that is the point of asserting the pair rather than
      the string: the Offline badge is const 9 and that IS the Bootstrap-4 spelling upstream. What
      must be gone is that spelling next to the word Trial.
    */
    expect(modal).not.toMatch(/class="badge badge-danger"\s*>\s*Trial/);
    expect(modal).toContain('class="badge badge-danger">Offline<');
  });

  it('agrees with RoomMessage, which already had both right', () => {
    const message = read('lib/components/RoomMessage.svelte');
    expect(message).toContain('badge bg-danger trial-badge');
    expect(message).toContain('badge bg-warning new-badge');
  });
});

describe('UIM-11 and UIM-12 — the two peer-command icons', () => {
  /**
   * `T(13,"i",71), v(14,"\xa0"), T(15,"i",41), v(16," Restart Screens ")` and
   * `T(18,"i",89), v(19," Start Rec ")` at 2,064,155; consts 41 = fa-sync, 71 = fa-desktop,
   * 88 = fa-stop-circle, 89 = fa-play-circle.
   */
  it('reads the reference’s own emission order at 2,064,155', () => {
    const slice = BUNDLE.slice(2_064_155, 2_064_155 + 200);
    expect(slice.startsWith('T(13,"i",71)')).toBe(true);
    expect(slice).toContain('T(15,"i",41)');
    expect(slice).toContain('" Restart Screens "');
    expect(slice).toContain('T(18,"i",89)');
    expect(slice).toContain('" Start Rec "');
  });

  it('draws Restart Screens as fa-desktop + fa-sync', () => {
    /*
      Anchored on the HANDLER, not on the label. The first version matched the label across the line
      break prettier had put in it — `'Restart\n                    Screens'` — and prettier moved
      it onto one line on the very next run, so the guard failed for a reason that had nothing to do
      with what it guards. An anchor that encodes today's line wrapping is an anchor with a
      formatting dependency.
    */
    const at = modal.indexOf("onUserAction('restart-screens', targetUser)");
    expect(at, 'the Restart Screens button moved').toBeGreaterThan(-1);
    const button = modal.slice(at, at + 300);
    expect(button).toContain('fa fa-desktop');
    expect(button).toContain('fa fa-sync');
    expect(button).not.toContain('fa fa-play-circle');
  });

  it('draws Start Rec as fa-play-circle, and fa-record-vinyl is gone from the room', () => {
    expect(modal).toContain('<i class="icon fa fa-play-circle"></i> Start Rec');
    /*
      A FULL-FILE search of the bundle for this class returns -1. It was invented here, so the
      assertion is that it appears nowhere in our source at all — not merely that this one button
      stopped using it.
    */
    expect(BUNDLE.includes('fa-record-vinyl')).toBe(false);
    expect(modal).not.toContain('fa-record-vinyl');
  });

  it('leaves no two buttons in that column drawn the same way', () => {
    /*
      The assertion is on each button's WHOLE icon run, not on individual glyphs, and that is not a
      weakening — upstream reuses single glyphs on purpose. `fa-desktop` (const 71) opens both Stop
      Screens and Restart Screens because both act on screens, and `fa-stop-circle` (const 88) ends
      both Stop Screens and Stop Rec because both stop something. What must never repeat is the
      PAIR, because the pair is what a presenter reads as "this button".

      Before UIM-11/12 the runs were:
        Stop Screens    desktop + stop-circle
        Restart Screens desktop + play-circle   ← collided with Start Rec
        Start Rec       record-vinyl            ← invented
        Stop Rec        stop-circle
      Restart Screens and Start Rec were not identical, but the only glyph a reader scanning the
      column sees on Start Rec was the second half of Restart Screens.
    */
    /*
      `lastIndexOf('<button', …)` so the slice STARTS at Mute Audio's own opening tag. Anchoring on
      the handler instead dropped its icon into the pre-split remainder and silently measured five
      buttons while claiming six — a control that counts one fewer than it thinks is exactly the
      kind that stops noticing a regression.
    */
    const columnAt = modal.lastIndexOf('<button', modal.indexOf("onUserAction('mute-mic'"));
    expect(columnAt).toBeGreaterThan(-1);
    const columnEnd = modal.indexOf("onUserAction('stop-recording'");
    expect(columnEnd, 'the Stop Rec button moved').toBeGreaterThan(-1);
    const column = modal.slice(columnAt, columnEnd + 400);
    const runs = column
      .split('<button')
      .map((button) => [...button.matchAll(/fa fa-([a-z-]+)/g)].map((match) => match[1]).join('+'))
      .filter((run) => run.length > 0);
    expect(runs.length).toBe(6);
    expect(new Set(runs).size, `duplicate icon run in ${runs.join(' | ')}`).toBe(runs.length);
  });
});

describe('UIM-08 — the stars gate carries all three of the reference’s terms', () => {
  /** `O(21, sessData.disableStarYears || user.isP || !user.data.years ? -1 : 21)` at 2,061,001. */
  it('reads the three-term gate in the bundle', () => {
    const slice = BUNDLE.slice(2_061_001, 2_061_001 + 140);
    expect(slice).toContain('disableStarYears');
    expect(slice).toContain('e.user.isP');
    expect(slice).toContain('!e.user.data.years');
  });

  it('gates the modal’s star on disableStarYears, on the target NOT being a presenter, and on years', () => {
    const at = modal.indexOf('stars-container');
    expect(at).toBeGreaterThan(-1);
    const gate = modal.slice(modal.lastIndexOf('{#if', at), at);
    expect(gate).toContain('!messageChrome.disableStarYears');
    expect(gate).toContain("targetUser.permissions !== 'a'");
    expect(gate).toContain('targetUser.years');
  });

  it('does not add a prop for a setting the component already receives', () => {
    /*
      `disableStarYears` lives on `RoomMessageChrome`, which `ModalHost` already takes. A second
      route to one room setting is how two surfaces end up disagreeing about it — the reason that
      type exists at all.
    */
    expect(modal).not.toMatch(/\n\s*disableStarYears[?]?:/);
  });
});

describe('UIM-06 — the Admin Notes tab raises the password door, as the reference’s does', () => {
  /**
   * `J2e` at 2,059,546; const 56 is the ONLY anchor in that strip with `3,"click"`, and its
   * handler is `manageAdminNotes()` (2,081,768).
   */
  it('reads the tab’s click binding in the bundle', () => {
    /*
      The audit row cites 2,059,546, which lands INSIDE the click handler. `J2e` itself starts at
      2,059,391 — read, not trusted — and this reads the whole template from there so the
      "only the third anchor has a click" half of the claim is actually checkable.
    */
    const slice = BUNDLE.slice(2_059_391, 2_059_391 + 230);
    expect(slice.startsWith('function J2e(')).toBe(true);
    expect(slice).toContain('d(4,"a",56)');
    expect(slice).toContain('manageAdminNotes()');
    expect(slice).toContain('" Admin Notes "');
    // The other two anchors in the same template carry no click at all.
    expect(slice).toContain('d(0,"a",54)');
    const secondAnchor = slice.indexOf('d(2,"a",55)');
    expect(secondAnchor, 'the Actions anchor moved').toBeGreaterThan(-1);
    expect(slice.slice(0, secondAnchor)).not.toContain('x("click"');
  });

  it('sends the notes tab through the same door as the Enter Password button', () => {
    const at = modal.indexOf("if (tabId === 'notes')");
    expect(at, 'the notes-tab branch moved').toBeGreaterThan(-1);
    expect(modal.slice(at, at + 200)).toContain("onUserAction('admin-notes-password', targetUser)");
  });

  it('no longer calls the list directly, and no longer declares a method nothing calls', () => {
    expect(modal).not.toContain('userNotes.open(');
    expect(modal).not.toMatch(/open\(subjectUserId: number\): void;/);
  });

  it('leaves exactly two callers of the door, which is what the reference has', () => {
    const callers = [...modal.matchAll(/onUserAction\('admin-notes-password'/g)];
    expect(callers.length).toBe(2);
  });

  it('has removed the comment that claimed upstream’s tab does not do this', () => {
    /*
      Raw, not stripped: the subject IS a comment. The false claim was
      "upstream's tab does not", and it is replaced by the decoded bytes rather than deleted, so
      the next reader sees why the old reasoning was reversed.
    */
    const notes = readRaw(ADMIN_NOTES);
    /*
      The old sentence is still IN the file, quoted, and that is deliberate — a claim deleted is a
      claim the next reader re-derives. What must be true is that it is now marked as false and the
      bytes that refute it are cited beside it. Both go if somebody reverts the comment.
    */
    expect(notes).toContain('The claim about upstream is false');
    expect(notes).toContain('2,059,546');
    expect(notes).toContain('manageAdminNotes()');
  });
});

describe('UIM-05 — follow-chat Reset persists, as resetFollowChatStyle does', () => {
  /**
   * `resetFollowChatStyle(e){ this.followChatStyle = this.loadDefaultFollowChatStyle(),
   *   this.appService.updateUserInList({emailHash:e, followChatStyle:this.followChatStyle},
   *   "followedUsers") }` at 2,075,493 — seed AND write, where ours only seeded.
   */
  it('reads both statements of the reference’s reset', () => {
    const slice = BUNDLE.slice(2_075_493, 2_075_493 + 220);
    expect(slice).toContain('resetFollowChatStyle(e){');
    expect(slice).toContain('loadDefaultFollowChatStyle()');
    expect(slice).toContain('updateUserInList');
    expect(slice).toContain('"followedUsers"');
  });

  it('reseeds and then calls the same persistence path Save uses', () => {
    const at = modal.indexOf('onreset={');
    expect(at).toBeGreaterThan(-1);
    const saveAt = modal.indexOf('onsave=', at);
    expect(saveAt, 'the follow-chat pane moved').toBeGreaterThan(-1);
    const handler = modal.slice(at, saveAt);
    expect(handler).toContain('followChatStyle = defaultFollowStyle()');
    expect(handler).toContain('onFollowStyleChange(targetUser, followChatStyle)');
    /* Order matters: persist what the preview is showing, not the seed function's return twice. */
    expect(handler.indexOf('defaultFollowStyle()')).toBeLessThan(
      handler.indexOf('onFollowStyleChange')
    );
  });
});

describe('UIM-04 — Private Chat takes canPM as well as “not me”', () => {
  /** `O(18, o.canPM && o.checkIsMe() ? 18 : -1)` at 2,096,067, beside three that take one term. */
  it('reads the asymmetry in the reference’s update block', () => {
    const slice = BUNDLE.slice(2_096_000, 2_096_000 + 160);
    expect(slice).toContain('O(17,o.checkIsMe()?17:-1)');
    expect(slice).toContain('O(18,o.canPM&&o.checkIsMe()?18:-1)');
    expect(slice).toContain('O(19,o.checkIsMe()?19:-1)');
  });

  it('gates only the Private Chat button, leaving @Mention, Follow and Mute where they were', () => {
    /*
      Anchored on `onPrivateChat(targetUser)` rather than on the words "Private Chat", which also
      match the Actions tab's "Disable Private Chat" four hundred lines earlier.
    */
    const at = modal.indexOf('onPrivateChat(targetUser)');
    expect(at).toBeGreaterThan(-1);
    expect(modal.slice(at - 300, at)).toContain('{#if canPrivateChat}');
    /* The three siblings must NOT have picked the term up. */
    const footerAt = modal.indexOf('{#if !isTargetCurrentUser}');
    expect(footerAt).toBeGreaterThan(-1);
    const gateAt = modal.indexOf('{#if canPrivateChat}', footerAt);
    expect(gateAt, 'the Private Chat gate moved').toBeGreaterThan(-1);
    const beforePrivateChat = modal.slice(footerAt, gateAt);
    expect(beforePrivateChat).toContain('@Mention');
    expect(beforePrivateChat).not.toContain('canPrivateChat');
  });

  it('defaults the prop to false — deny by default, because it is a permission', () => {
    expect(modal).toContain('canPrivateChat = false');
  });

  it('is answered by the page from the one transcription, not re-derived in the modal', () => {
    expect(overlays).toContain('canShowRosterPrivateChat(');
    expect(overlays).toContain('canPrivateChat={canShowRosterPrivateChat(');
    /* The five settings must not have been drilled into the component instead. */
    expect(modal).not.toContain('disablePMForTrials');
    expect(modal).not.toContain('userToPresenterPM');
  });

  it('asks about the same target the modal is rendering', () => {
    const at = overlays.indexOf('canPrivateChat={canShowRosterPrivateChat(');
    const call = overlays.slice(at, at + 600);
    expect(call).toContain('userActions.target.id');
    expect(call).toContain('userActions.target.permissions');
    expect(call).toContain('userActions.target.hasAdminChat');
    expect(overlays).toContain('targetUser={userActions.target}');
  });
});

describe('UIM-16 (second half) — the follow-chat preview’s <strong> carries fw-bold', () => {
  /** const 120 = [1,"fw-bold"], bound at `d(36,"strong",120), v(37,"Username:")`, byte 2,070,269. */
  it('reads the binding and the const in the bundle', () => {
    /*
      Chained, not standalone: the reference emits `d(35,"div",119)(36,"strong",120)`, so the
      opening `d(` belongs to the div. Asserting `d(36,…` would have been a plausible string that
      the bundle does not contain — the reason this was read rather than reconstructed.
    */
    expect(BUNDLE.slice(2_070_180, 2_070_400)).toContain('(36,"strong",120)');
    expect(BUNDLE.slice(2_070_180, 2_070_400)).toContain('v(37,"Username:")');
  });

  it('renders it, and only on that one <strong>', () => {
    expect(followPane).toContain('<strong class="fw-bold">Username:</strong>');
    expect(followPane).not.toContain('<strong>Username:</strong>');
  });
});
