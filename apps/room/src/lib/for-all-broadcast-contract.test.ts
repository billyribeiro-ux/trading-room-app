import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  publishToRoom,
  roomSubscriberCount,
  subscribeToRoom,
  type RoomEvent
} from './server/room-events';

/*
  The four "For All" broadcast commands.

  WHAT THIS REPLACED. Controls that said "For All" and moved one browser.

  `VideoPlayer.svelte` made ZERO network calls - no `fetch`, no `use:enhance`, no `action=`. Its
  `requestStopVideo` carried the reference's confirm string and both of the reference's callers,
  and its `onconfirm` cleared local `$state` and a timer. "Play For All" was the same shape.

  `YoutubePlayerOverlay` had two buttons and one handler behind both of them. The reference draws
  the distinction deliberately and draws it by WHICH BUS IT EMITS ON:

    stopYTForAll() { this.appService.sendServerAdminCommand("stopYTForAll") }   // the server
    closeYTFrame() { this.appService.guiEventBus.emit("stopYTForAll") }         // this browser

  which is why "Stop For All" is presenter-gated in the markup and "×" is not: a member must be
  able to dismiss an overlay sitting over their own room without taking it away from the room.
  Wiring `onstop` and `onclose` to one function made the "×" a command a member had no authority
  to send, and made "Stop For All" indistinguishable from dismissing your own iframe.

  WHY THE SERVER HAS TO DECIDE. Same rule as `focusOnScreen`: a client that asked every other
  client to play a video, and was believed, is the shape of the 2026-08-07 privilege escalation.
  The role is read from the session on the server and `requireRoomShortCode` scopes the fan-out.

  THE TRAP THIS FILE PINS. The YouTube seek offset is DERIVED, never transmitted. The subscriber
  computes it from a timestamp the LATE-JOIN REPLAY carries out of room state; the live command has
  no `startTime` at all. A `startTime` invented onto this room's wire would look like the feature
  and be a fabricated number, because nothing here knows when the room started playing.
*/

const BUNDLE = readFileSync(
  new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url),
  'utf8'
);
const SERVER = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
/*
  THE RECEIVERS MOVED, 2026-08-27, and this constant moved with them rather than being deleted.

  All eight "For All" branches left `events.svelte.ts` for `for-all-broadcasts.ts` when the two
  page-ending frames pushed that file over its ceiling. They lift out cleanly because they are the
  one group on the `cmds` channel that shares a collaborator — every branch reaches `RoomBroadcasts`.

  Re-pointed rather than loosened, which is this repository's own rule paid for four times: a
  positive assertion fails loudly when a region moves, and a `not.toContain` starts passing for the
  wrong reason. Both forms below are read from the file that now owns the code.
*/
const EVENTS = readFileSync(new URL('./room/for-all-broadcasts.ts', import.meta.url), 'utf8');
/*
  The three "for all" broadcasts moved to `RoomBroadcasts` in Phase 5 slice 12. The senders and the
  receivers went with them; what stays in `+page.svelte` is the DISPATCH — which command maps to
  which receiver, and the tab move that is not broadcast state at all. So each assertion below reads
  the file that owns its subject, and the hand-off is asserted rather than assumed.
*/
const BROADCASTS = readFileSync(new URL('./room/broadcasts.svelte.ts', import.meta.url), 'utf8');

const PLAYER = readFileSync(new URL('./components/VideoPlayer.svelte', import.meta.url), 'utf8');
const OVERLAY = readFileSync(
  new URL('./components/YoutubePlayerOverlay.svelte', import.meta.url),
  'utf8'
);

/*
  Comments are stripped before every assertion about OUR code, because this repository's comments
  quote the reference verbatim - including the very literals under test. An assertion that passed
  on a line of documentation would be a test that cannot fail.
*/
const stripComments = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const serverCode = stripComments(SERVER);
const pageCode = stripComments(PAGE);
const eventsCode = stripComments(EVENTS);
const playerCode = stripComments(PLAYER);
const overlayCode = stripComments(OVERLAY);

/*
  Re-pointed 2026-08-15: both actions became remote commands in `for-all-broadcast.remote.ts`, and
  `broadcastableMediaUrl` / `MAX_BROADCAST_URL` went with them.

  `videoForAll` is declared first in that module and `youtubeForAll` second, so the first runs to the
  second and the second runs to the end of the file. Both markers are asserted found — a slice that
  silently returns '' is how a `not.toContain` goes green while guarding nothing, and there are three
  of those below.
*/
const MEDIA_REPLAY = stripComments(
  readFileSync(new URL('./room/media-replay.ts', import.meta.url), 'utf8')
);
const MEDIA_STATE = stripComments(
  readFileSync(new URL('./server/room-media-state.ts', import.meta.url), 'utf8')
);
const SCHEMA = stripComments(
  readFileSync(new URL('./server/db/schema.ts', import.meta.url), 'utf8')
);
const DB_INDEX = stripComments(
  readFileSync(new URL('./server/db/index.ts', import.meta.url), 'utf8')
);
const REMOTE = readFileSync(
  new URL('../routes/for-all-broadcast.remote.ts', import.meta.url),
  'utf8'
);
const AUTH = stripComments(readFileSync(new URL('./server/auth.ts', import.meta.url), 'utf8'));
const remoteCode = stripComments(REMOTE);

/*
  `actionBody` used to live here, and the note beside it said `fileMediaCommand` had not been
  converted so a `not.toContain` had to keep reading `+page.server.ts` — re-pointing it at a remote
  module that never contained the action would have been green and guarding nothing.

  `fileMediaCommand` IS converted now, to `files-pane.remote.ts`, so the assertion moved WITH it and
  the helper had no remaining caller. Deleted rather than left: a reader that nothing reads is the
  next person's dead end.
*/

const COMMAND_ORDER = ['videoForAll', 'youtubeForAll'] as const;

const commandBody = (name: (typeof COMMAND_ORDER)[number]) => {
  const from = remoteCode.indexOf(`export const ${name} = command(`);
  expect(from, `the ${name} command must exist`).toBeGreaterThan(-1);
  const next = COMMAND_ORDER[COMMAND_ORDER.indexOf(name) + 1];
  if (!next) return remoteCode.slice(from);
  const to = remoteCode.indexOf(`export const ${next} = command(`, from);
  expect(to, `${next} must follow ${name}`).toBeGreaterThan(from);
  return remoteCode.slice(from, to);
};

/*
  A function declared INSIDE a component's script or an object literal, so its closing brace is the
  first one indented by two spaces. `\n  }` also matches `\n  } catch {`, which is why the module
  level gets its own reader below rather than sharing this one.
*/
const functionBody = (source: string, signature: string) => {
  const from = source.indexOf(signature);
  expect(from, `${signature} must exist`).toBeGreaterThan(-1);
  return source.slice(from, source.indexOf('\n  }', from));
};

/** A function declared at module level: the closing brace is in column 0. */
const topLevelFunctionBody = (source: string, signature: string) => {
  const from = source.indexOf(signature);
  expect(from, `${signature} must exist`).toBeGreaterThan(-1);
  return source.slice(from, source.indexOf('\n}', from));
};

describe('the reference, at the byte offsets this was decoded from', () => {
  /*
    `grep -c` on this file answers 1 or 0 for everything, because a minified bundle is ONE LINE.
    Every count below is `String.prototype.split`, and every location is an offset that was opened
    and read rather than searched.
  */
  const countOf = (needle: string) => BUNDLE.split(needle).length - 1;

  it('dispatches all four from the one server-command switch', () => {
    expect(BUNDLE).toContain(
      'case"playVideoForAll":this.guiEventBus.emit("playVideoForAll",{url:i.url});break;' +
        'case"stopVideoForAll":this.guiEventBus.emit("stopVideoForAll");break;'
    );
    expect(BUNDLE).toContain(
      'case"playYTForAll":this.guiEventBus.emit("playYTForAll",{url:i.url});break;' +
        'case"stopYTForAll":this.guiEventBus.emit("stopYTForAll");break;'
    );
  });

  it('the two stops forward NO payload, so neither carries a field of its own', () => {
    // Not `{url: i.url}` on either — read at 1,024,212 and 1,024,668.
    expect(BUNDLE).not.toContain('emit("stopYTForAll",{');
    expect(BUNDLE).not.toContain('emit("stopVideoForAll",{');
  });

  it('a NON-presenter is the one who gets moved between tabs', () => {
    expect(BUNDLE).toContain(
      'this.videoPlayerUrl=e.url,this.hideVideoPlayer=!0,' +
        'this.isP||this.onMainTabChange("presAreaTabs-videoplayer")'
    );
    expect(BUNDLE).toContain(
      'this.hideVideoPlayer=!1,this.isP||this.onMainTabChange("presAreaTabs-screens")'
    );
  });

  it('`hideVideoPlayer` is the term that lets a member reach the tab at all', () => {
    // Slot 25 is the tab, slot 47 the pane. Both, identically.
    expect(BUNDLE).toContain('O(25,o.hideVideoPlayer&&!o.isP||o.isP?25:-1)');
    expect(BUNDLE).toContain('O(47,o.hideVideoPlayer&&!o.isP||o.isP?47:-1)');
  });

  it('the overlay sends a SERVER command and the × emits on the LOCAL bus', () => {
    expect(BUNDLE).toContain(
      'stopYTForAll(){this.appService.sendServerAdminCommand("stopYTForAll")}' +
        'closeYTFrame(){this.appService.guiEventBus.emit("stopYTForAll")}'
    );
  });

  it('a play is a stop and then a play, in that order', () => {
    expect(BUNDLE).toContain(
      'playYtVideo(){this.appService.sendServerAdminCommand("stopYTForAll",{url:this.youtubeURL}),' +
        'this.appService.sendServerAdminCommand("playYTForAll",{url:this.youtubeURL})}'
    );
  });

  it('the seek offset is COMPUTED from a delta, and only the replay supplies the instant', () => {
    // The derivation, byte 1,964,799.
    expect(BUNDLE).toContain('i=Math.round((s-o)/1e3)');
    // Its only source: room state on late join, never the live command.
    expect(BUNDLE).toContain(
      'emit("playYTForAll",{url:this.appService.globals.roomState.ytURL,' +
        'startTime:this.appService.globals.roomState.ytStartTime})'
    );
    // `ytStartTime` exists once in the whole bundle, and that is the line above.
    expect(countOf('ytStartTime')).toBe(1);
  });

  it('the embed mute is a LOCAL preference, not a broadcast one', () => {
    expect(BUNDLE).toContain('this.appService.globals.preferences.doNotDisturbOn?"&mute=1":""');
  });
});

describe('the server owns the authority', () => {
  it('refuses a non-presenter on both commands', () => {
    /*
      The gate was `if (!isPresenterRole(user.role)) return fail(403, …)` inlined in both. It is now
      `presenterRoom()` in `#lib/server/auth.ts`, which returns the room ONLY after the role check —
      so a command cannot obtain the tenant it is about to broadcast into without having passed the
      gate. Each command is asserted to reach it, and the gate itself is asserted where it lives.
    */
    expect(AUTH).toContain('export function presenterRoom(): string {');
    expect(AUTH).toContain(
      "if (!isPresenterRole(requireUser(locals).role)) error(403, 'Presenters only.');"
    );
    for (const name of COMMAND_ORDER) {
      expect(commandBody(name)).toContain('const room = presenterRoom();');
    }
  });

  it('publishes the four names character for character, and nothing else', () => {
    /*
      The `cmd !== 'x' && cmd !== 'y'` pairs became `z.enum`, which refuses before the handler runs
      rather than inside it — same two values per command, checked earlier.
    */
    /*
      `videoForAll` took its OWN schema on 2026-09-01: it is the one command that carries a TIME, and
      the shared `forAllArgs` has no field for one. The two names are still enumerated, which is what
      this case is about, and `videoForAllArgs` is asserted below to keep the bound `forAllArgs` gave
      it — a hand-rolled schema silently dropping the length cap is exactly what a shared factory
      exists to prevent.
    */
    const video = commandBody('videoForAll');
    expect(video).toContain('videoForAllArgs');
    expect(remoteCode).toContain("cmd: z.enum(['playVideoForAll', 'stopVideoForAll'])");
    expect(
      remoteCode,
      'videoForAllArgs must keep the url length bound the shared factory applies'
    ).toContain('url: z.string().max(MAX_BROADCAST_URL).optional(),');
    const youtube = commandBody('youtubeForAll');
    expect(youtube).toContain("forAllArgs(['playYTForAll', 'stopYTForAll'])");
    /*
      `forAllArgs` is the shared shape — it is what makes the LENGTH bound one declaration instead of
      two, which is the only thing the two commands are allowed to share about their url. Asserted
      here so the names above cannot become a free-text string by the factory quietly dropping the
      enum.
    */
    expect(remoteCode).toContain('cmd: z.enum(commands),');

    /*
      The near-miss casings that would be silently dropped by every client. `playMP3ForAll` has
      MP3 upper-case and `stopMp3ForAll` has Mp3 mixed, in the same switch — this family is not
      internally consistent and cannot be guessed.
    */
    for (const wrong of [
      'playYtForAll',
      'stopYtForAll',
      'playYTVideoForAll',
      'playVideoForALL',
      'stopVideoForALL'
    ]) {
      expect(remoteCode).not.toContain(wrong);
    }
  });

  it('scopes every fan-out to the caller’s own room', () => {
    for (const name of COMMAND_ORDER) {
      expect(commandBody(name)).toContain('publishToRoom(room, { channel: ');
    }
    /*
      Never a room named by the request — and now it cannot be, because neither schema has a field
      it could come from. `strictObject` makes adding one a validation error rather than an ignored
      extra key.
    */
    expect(remoteCode).not.toContain('roomShortCode');
    expect(remoteCode).toContain('z.strictObject({');
  });

  it('reproduces the stop-then-play order, from ONE request', () => {
    const body = commandBody('youtubeForAll');
    const stop = body.indexOf("data: { cmd: 'stopYTForAll', url: trimmed }");
    const play = body.indexOf("data: { cmd: 'playYTForAll', url: trimmed }");
    expect(stop).toBeGreaterThan(-1);
    expect(play).toBeGreaterThan(-1);
    // Inverted, every browser is left holding a torn-down overlay.
    expect(stop).toBeLessThan(play);
  });

  it('the overlay’s own stop carries no url', () => {
    const body = commandBody('youtubeForAll');
    const bare = body.indexOf("if (cmd === 'stopYTForAll') {");
    expect(bare).toBeGreaterThan(-1);
    expect(body.slice(bare, bare + 200)).toContain(
      "publishToRoom(room, { channel: 'cmds', data: { cmd } });"
    );
  });

  it('refuses a video url that is not http(s), parsed rather than substring-matched', () => {
    /*
      The guard moved with the commands and is unchanged. A zod `.url()` would NOT be the same
      thing — it accepts every scheme `new URL` does, including `javascript:` and `data:` — so the
      allow-list stays hand-written and the schema only bounds the length.
    */
    const guard = topLevelFunctionBody(remoteCode, 'function broadcastableUrl(');
    expect(guard).toContain('parsed = new URL(value);');
    expect(guard).toContain(
      "if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;"
    );
    expect(guard).toContain('if (!value || value.length > MAX_BROADCAST_URL) return null;');
    expect(commandBody('videoForAll')).toContain(
      "if (!playable) error(400, 'That is not a playable video url.');"
    );
  });

  it('does NOT loosen fileMediaCommand, whose url must be a file this room holds', () => {
    /*
      The temptation was one action for every "For All". That one checks its url against
      `sharedFiles` because an mp3 IS a room file; a video url is free text a presenter typed, and
      folding them together would have meant deleting that predicate.
    */
    /*
      It left `+page.server.ts` for `files-pane.remote.ts` after this was written. Re-pointed at the
      file that owns it — a `not.toContain` left behind would have started passing because the whole
      region moved, not because the two families are still separate, which is the entire claim.
    */
    const filesPane = readFileSync(
      new URL('../routes/files-pane.remote.ts', import.meta.url),
      'utf8'
    );
    expect(filesPane).toContain("cmd: z.enum(['playMP3ForAll', 'stopMp3ForAll'])");
    // The room predicate survived the move, and is now shared rather than inlined per command.
    expect(filesPane).toContain('function roomFileByUrl(room: string, url: string)');
    expect(filesPane).toContain('eq(sharedFiles.roomShortCode, room)');
    expect(filesPane).toContain('if (!roomFileByUrl(room, playable)) error(400');
    expect(filesPane).not.toContain('playVideoForAll');
    expect(filesPane).not.toContain('playYTForAll');
  });
});

describe('the client sends, instead of moving its own screen', () => {
  it('VideoPlayer makes no decisions of its own about what is playing', () => {
    // The prop replaced the `$state`; the local assignment is what made both buttons a lie.
    expect(playerCode).not.toContain("let videoPlayerUrl = $state('')");
    expect(playerCode).toContain('videoPlayerUrl: string;');
    expect(functionBody(playerCode, 'function playVideoNow(')).toContain('onplaynow(value);');
  });

  it('one command behind both stop prompts, with the verb only in the question', () => {
    const body = functionBody(playerCode, "function requestStopVideo(action: 'stop' | 'remove')");
    expect(body).toContain('message: `Are you sure you want to ${action} this video for all?`');
    expect(body).toContain('onstopforall();');
    // Two callers, one command — the verb never reaches the wire.
    expect(playerCode).toContain("requestStopVideo('remove')");
    expect(playerCode).toContain("requestStopVideo('stop')");
  });

  it('both "For All" senders post to the server', () => {
    expect(functionBody(BROADCASTS, 'async #sendVideoForAllCommand(')).toContain(
      'await this.#commands.video({ cmd, url, videoPlayTime });'
    );
    expect(functionBody(BROADCASTS, 'async #sendYoutubeForAllCommand(')).toContain(
      'await this.#commands.youtube({ cmd, url });'
    );
    /*
      Both refusals reach the presenter with the SERVER's own wording — `That is not a playable
      video url.` is what a mistyped url earns, and collapsing it into the generic fallback would
      leave the presenter guessing which of the two things went wrong.

      THIS LINE READ `pageCode` UNTIL 2026-08-16 AND WAS WRONG FROM THE MOMENT SLICE 12 LANDED.

      The senders moved to `RoomBroadcasts` and this assertion did not move with them. It kept
      passing because `+page.svelte` still held a line spelled identically — the Files pane's
      `setAlertSound`, a different feature with the same generic fallback — so a positive
      `toContain` was satisfied by a file that no longer owned its subject. Slice 6 moved that line
      out too, and only then did the assertion go red.

      That is the mirror image of the vacuous negative this phase keeps guarding against, and it
      argues the same thing: an assertion has to name the file that owns its subject. Three
      senders, so the count is asserted rather than the presence — one sender losing its refusal
      path would otherwise still leave two matches and a green test.
    */
    const refusal =
      "this.#dialogs.alert = isHttpError(cause) ? cause.body.message : 'Command failed.';";
    expect(BROADCASTS.split(refusal).length - 1).toBe(3);
    // And the actions are gone from the server, so there is one way in and not two.
    expect(serverCode).not.toContain('videoForAll: async (');
    expect(serverCode).not.toContain('youtubeForAll: async (');
  });

  it('"Stop For All" and "×" invoke DIFFERENT things', () => {
    /*
      Same function behind both props is the defect, so DIFFERENCE is what gets asserted — not two
      spellings that happen to differ today.

      This used to span two files, four `toContain`s, because the handlers were drilled props the
      page filled. `broadcasts` is passed whole since 2026-08-18, so both attributes are on one
      element and the check can be what it always meant: slice the overlay's own call site, pull
      each handler out of it, and require them to be unequal. Four loose substring checks over two
      whole files could all pass while the two attributes sat on different elements.
    */
    const paneCode = readFileSync(
      new URL('./components/PresentationArea.svelte', import.meta.url),
      'utf8'
    );
    const from = paneCode.indexOf('<YoutubePlayerOverlay');
    expect(from, 'the overlay call site must exist').toBeGreaterThan(-1);
    const callSite = paneCode.slice(from, paneCode.indexOf('/>', from));
    expect(callSite.length, 'the call site must not be empty').toBeGreaterThan(0);

    const handlerFor = (prop: string) => {
      const match = new RegExp(`\\b${prop}=\\{([^}]*)\\}`).exec(callSite);
      return match?.[1] ?? null;
    };
    const onstop = handlerFor('onstop');
    const onclose = handlerFor('onclose');
    expect(onstop, 'onstop must be bound').not.toBeNull();
    expect(onclose, 'onclose must be bound').not.toBeNull();
    expect(onstop).toContain('broadcasts.stopYoutubeForAll()');
    expect(onclose).toContain('broadcasts.closeYoutubeFrame()');
    // THE assertion: one handler behind both buttons is the bug this whole test exists for.
    expect(onstop, '"Stop For All" and "×" must not run the same thing').not.toBe(onclose);

    // "Stop For All" reaches the server.
    expect(functionBody(BROADCASTS, 'async stopYoutubeForAll()')).toContain(
      "this.#sendYoutubeForAllCommand('stopYTForAll')"
    );
    // "×" does not. It clears this browser and nothing else.
    const close = functionBody(BROADCASTS, 'closeYoutubeFrame()');
    expect(close).toContain("youtubeForAllUrl = '';");
    expect(close).not.toContain('fetch');
    expect(close).not.toContain('sendYoutubeForAllCommand');
  });

  it('the overlay still gates only the SERVER button on presenter', () => {
    // `H(1, X0e, …)` under `o.appService.globals.isPresenter ? 1 : -1`; the × has no gate.
    const stopAt = overlayCode.indexOf('onclick={onstop}');
    const closeAt = overlayCode.indexOf('onclick={onclose}');
    expect(stopAt).toBeGreaterThan(-1);
    expect(closeAt).toBeGreaterThan(-1);
    expect(overlayCode.lastIndexOf('{#if isPresenter}', stopAt)).toBeGreaterThan(-1);
    expect(overlayCode.lastIndexOf('{/if}', closeAt)).toBeLessThan(stopAt + 400);
  });
});

describe('the client receives, so it reaches another browser', () => {
  it('sets the url for everyone and moves only a NON-presenter', () => {
    expect(eventsCode).toContain("if (command?.cmd === 'playVideoForAll') {");
    /*
      The two writes are one receiver now. The assertion moved with them rather than being
      dropped: what it guards is that a play sets BOTH the url and the flag that lets a member see
      the tab at all, and `videoStarted` is where that pair now lives.
    */
    expect(eventsCode).toContain('broadcasts.videoStarted(command.url);');
    const started = functionBody(BROADCASTS, 'videoStarted(url: string)');
    expect(started).toContain('this.#videoPlayerUrl = url;');
    expect(started, 'hideVideoPlayer is what lets a MEMBER see the tab').toContain(
      'this.#hideVideoPlayer = true;'
    );
    // `mainTab` is the PAGE's, so the stream reaches it through a receiver rather than owning it.
    expect(eventsCode).toContain("if (!isPresenter()) showTab('videoplayer');");

    expect(eventsCode).toContain("if (command?.cmd === 'stopVideoForAll') {");
    /*
      Three writes are one receiver, and that is the point rather than a tidy-up: stopping a video
      must ALSO blank the pending line, and a caller holding setters could do one of the two.

      It was FOUR until 2026-09-01, and the fourth cleared a `window.setTimeout`. There is no timer
      any more — the schedule is a row and `clearVideoForAll` nulls it, so cancelling now reaches
      browsers that are closed. Removed rather than kept as a no-op: a call that clears nothing is
      the dead scaffolding this repository forbids, and one named for a timer that does not exist is
      the comment-that-lies it hunts.
    */
    const stopped = functionBody(BROADCASTS, 'videoStopped()');
    expect(stopped).toContain("this.#videoPlayerUrl = '';");
    expect(stopped).toContain('this.#hideVideoPlayer = false;');
    expect(stopped, 'no timer survives to be cleared').not.toContain('Timer');
    expect(eventsCode).toContain("if (!isPresenter()) showTab('screens');");
  });

  it('the member’s tab and pane carry the captured gate, not `isPresenter` alone', () => {
    /*
      Without the `hideVideoPlayer` term a member is moved to a tab that renders nothing.

      `broadcasts.hideVideoPlayer` since 2026-08-18 — the flag is read off the object that owns it
      rather than off a prop the page copied out of it. Still BOTH halves, and since 2026-08-28 they
      live in two files: the TAB went to `MainTabStrip.svelte` with the rest of `ul#mainTabs`, and
      the PANE stayed with its siblings. This used to count two occurrences in one file and would
      have passed with both halves in either one; naming a file per half is what it meant all along.
    */
    const GATE = '{#if (broadcasts.hideVideoPlayer && !isPresenter) || isPresenter}';
    const occurrences = (source: string) => source.split(GATE).length - 1;
    const strip = readFileSync(
      new URL('./components/MainTabStrip.svelte', import.meta.url),
      'utf8'
    );
    const panes = readFileSync(
      new URL('./components/PresentationArea.svelte', import.meta.url),
      'utf8'
    );
    expect(occurrences(strip), 'the video-player TAB lost its gate').toBe(1);
    expect(occurrences(panes), 'the video-player PANE lost its gate').toBe(1);
  });

  it('the stop cancels an armed play sent by ANOTHER presenter', () => {
    const from = eventsCode.indexOf("if (command?.cmd === 'stopVideoForAll') {");
    const body = eventsCode.slice(from, eventsCode.indexOf('return;', from));
    // The stop's four writes are one receiver now, so the invariant cannot be half-applied by a
    // caller holding setters. The dispatch calls it; the receiver is asserted to do all of it.
    expect(body).toContain('broadcasts.videoStopped();');
    const stopped = functionBody(BROADCASTS, 'videoStopped()');
    expect(stopped, 'the schedule must be blanked with the picture').toContain(
      "this.#scheduledVideoForAll = { videoURL: '', videoPlayTime: null };"
    );
    /*
      IT CANCELS THE PLAY ITSELF NOW, not just this browser's copy of it, and that is stronger than
      what this case used to assert.

      It required `videoStopped` to clear a `window.setTimeout` — the armed play lived in the
      presenter's own browser, so a stop could only cancel it in browsers that were still open. Since
      2026-09-01 the schedule is a row, and `clearVideoForAll` nulls the time along with the url, so a
      stop cancels an armed play for everyone — including one armed by a presenter who has since
      closed their browser, which was not possible before.
    */
    expect(MEDIA_STATE).toContain('.set({ videoUrl: null, videoPlayTime: null, updatedAt: now })');
    expect(remoteCode).toContain('clearVideoForAll(room);');
  });

  it('tears the overlay down on stop, everywhere', () => {
    expect(eventsCode).toContain("if (command?.cmd === 'playYTForAll') {");
    expect(eventsCode).toContain(
      "if (typeof command.url === 'string') broadcasts.youtubeStarted(command.url);"
    );
    expect(eventsCode).toContain("if (command?.cmd === 'stopYTForAll') {");
  });
});

describe('the seek offset is computed, never transmitted', () => {
  it('no `startTime` is put on this room’s WIRE, by anything', () => {
    /*
      NARROWED 2026-09-01, when the late-join replay was built, and the narrowing is the whole point
      of re-reading this case rather than deleting it.

      It used to assert that `startTime` appears NOWHERE — in the page, the overlay or the channel
      union — on the reasoning that *"this room has no persisted video state to compute one from"*.
      It has one now, and the reference has always had one; what was never true upstream and must
      never become true here is a `startTime` on the LIVE COMMAND. The reference's dispatch forwards
      `url` alone (byte 1,024,137); the moment rides only on the replay, which is server state read
      at connect and not a broadcast.

      So the rule is about the wire, and it is asserted where the wire is: the remote functions that
      publish, the receivers that read a published frame, and the union that types the channel.
    */
    expect(remoteCode, 'nothing publishes a startTime').not.toContain('startTime');
    expect(eventsCode, 'no receiver reads one off a frame').not.toContain('startTime');
    const events = stripComments(
      readFileSync(new URL('./server/room-events.ts', import.meta.url), 'utf8')
    );
    expect(events, 'the channel union does not offer a field to put one in').not.toContain(
      'startTime'
    );
  });

  it('the overlay appends `start=` ONLY from the replay offset, never from a payload', () => {
    /*
      The `start=` exists now — `(i?`start=${i}`:"")` at byte 1,503,354 — and its only source is the
      `startSeconds` PROP, which the page computes from stored room state on mount. Asserted as the
      only source, because a `start=` built from anything a broadcast carried would be exactly the
      fabricated number the case above forbids.
    */
    expect(overlayCode).toContain("const start = startSeconds > 0 ? `start=${startSeconds}` : '';");
    /*
      ONE occurrence in the code, so nothing else in the overlay composes one. Counted on the
      comment-STRIPPED source, which is what `overlayCode` is — the raw file says `start=` several
      more times in the paragraph that argues it, and a count over prose is the defect this
      repository has now found five times.
    */
    expect(overlayCode.match(/start=/g) ?? []).toHaveLength(1);
    /* And the overlay reads no clock: the derivation is the page's, once, on mount. */
    expect(overlayCode).not.toContain('Date.now()');
  });

  it('the embed mute stays the LOCAL preference it is upstream', () => {
    // Per-viewer, passed in as a prop — never read off a broadcast payload.
    expect(overlayCode).toContain("const mute = muted ? '&mute=1' : '';");
    expect(
      readFileSync(new URL('./components/PresentationArea.svelte', import.meta.url), 'utf8')
    ).toContain('muted={doNotDisturbOn}');
  });
});

/*
  BUILD-AUDIT §4 — drive the RUNTIME path, not the types.

  Everything above reads source. Source can be perfectly consistent and still deliver nothing: the
  defect being fixed here passed `svelte-check`, lint and prettier for as long as it shipped, and
  `deleteSwingAlert` passed a full audit while being unable to delete a row, because nothing in that
  audit executed anything. So this block executes the actual hub the four commands travel through
  and asserts a second connection RECEIVES them.

  `publishToRoom` / `subscribeToRoom` are the real module, not a mock — a mock of the fan-out would
  be a test of the mock.
*/
describe('it actually reaches another browser', () => {
  const roomA = 'for-all-room-a';
  const roomB = 'for-all-room-b';

  /** One connected browser: everything the `cmds` channel delivered to it, in order. */
  function browser() {
    const received: Array<Record<string, unknown>> = [];
    const listener = (event: RoomEvent) => {
      if (event.channel !== 'cmds') return;
      received.push(event.data as unknown as Record<string, unknown>);
    };
    return { received, listener };
  }

  it('delivers all four commands to a connection that did not send them', () => {
    const presenter = browser();
    const member = browser();
    const stopPresenter = subscribeToRoom(roomA, presenter.listener);
    const stopMember = subscribeToRoom(roomA, member.listener);

    try {
      expect(roomSubscriberCount(roomA)).toBe(2);

      // Exactly what the two actions publish, in the order they publish it.
      publishToRoom(roomA, {
        channel: 'cmds',
        data: { cmd: 'playVideoForAll', url: 'https://cdn.example.test/a.mp4' }
      });
      publishToRoom(roomA, { channel: 'cmds', data: { cmd: 'stopVideoForAll' } });
      publishToRoom(roomA, {
        channel: 'cmds',
        data: { cmd: 'stopYTForAll', url: 'https://youtu.be/aaaaaaaaaaa' }
      });
      publishToRoom(roomA, {
        channel: 'cmds',
        data: { cmd: 'playYTForAll', url: 'https://youtu.be/aaaaaaaaaaa' }
      });

      // The MEMBER's browser — the one that sent nothing — is what has to have them.
      expect(member.received.map((event) => event.cmd)).toEqual([
        'playVideoForAll',
        'stopVideoForAll',
        'stopYTForAll',
        'playYTForAll'
      ]);
      // And the sender learns its own command from the same channel, as private chat already does.
      expect(presenter.received).toEqual(member.received);

      // The stop-then-play pair arrives in the reference's order, so the second video replaces the
      // first instead of tearing down the one that just started.
      const stopAt = member.received.findIndex((event) => event.cmd === 'stopYTForAll');
      const playAt = member.received.findIndex((event) => event.cmd === 'playYTForAll');
      expect(stopAt).toBeLessThan(playAt);

      // Payloads survive the hop intact, and the two stops carry what the actions gave them.
      expect(member.received[0]).toEqual({
        cmd: 'playVideoForAll',
        url: 'https://cdn.example.test/a.mp4'
      });
      expect(member.received[1]).toEqual({ cmd: 'stopVideoForAll' });
    } finally {
      stopPresenter();
      stopMember();
    }
  });

  it('never crosses rooms — the predicate is the fan-out, not a filter afterwards', () => {
    const inA = browser();
    const inB = browser();
    const stopA = subscribeToRoom(roomA, inA.listener);
    const stopB = subscribeToRoom(roomB, inB.listener);

    try {
      publishToRoom(roomA, {
        channel: 'cmds',
        data: { cmd: 'playYTForAll', url: 'https://youtu.be/bbbbbbbbbbb' }
      });
      expect(inA.received).toHaveLength(1);
      // A presenter of room A must not be able to start a video in room B.
      expect(inB.received).toHaveLength(0);
    } finally {
      stopA();
      stopB();
    }
  });

  it('one dead connection cannot silence the room', () => {
    /*
      The `try/catch` in `publishToRoom` is load-bearing for exactly this family of command: a
      browser that navigated away mid-broadcast must not stop the video reaching everybody else.
    */
    const healthy = browser();
    const stopBroken = subscribeToRoom(roomA, () => {
      throw new Error('this connection is gone');
    });
    const stopHealthy = subscribeToRoom(roomA, healthy.listener);

    try {
      publishToRoom(roomA, { channel: 'cmds', data: { cmd: 'stopVideoForAll' } });
      expect(healthy.received).toEqual([{ cmd: 'stopVideoForAll' }]);
    } finally {
      stopBroken();
      stopHealthy();
    }
  });

  it('every connection is released, so a broadcast reaches nobody who left', () => {
    /*
      The first draft of this asserted `roomSubscriberCount(roomA) === 0` after the tests above and
      called it "leaves no room behind". Its negative control did not go red: the count is
      `subscribers.get(room)?.size ?? 0`, which answers 0 for a room that was dropped AND for one
      that is merely empty, so deleting the drop changed nothing it could see. A test that cannot
      fail is worse than no test, so this asserts the property that IS observable — the disposer
      really removes the listener, which is what stops a departed browser being broadcast to.
    */
    const gone = browser();
    expect(roomSubscriberCount(roomA)).toBe(0);

    const stop = subscribeToRoom(roomA, gone.listener);
    expect(roomSubscriberCount(roomA)).toBe(1);

    stop();
    expect(roomSubscriberCount(roomA)).toBe(0);

    publishToRoom(roomA, { channel: 'cmds', data: { cmd: 'stopVideoForAll' } });
    expect(gone.received).toHaveLength(0);
  });
});

/*
  The YouTube url is the ONE broadcast input the server does not run through `broadcastableMediaUrl`.

  That is safe, and it is safe for a reason nobody wrote down: the overlay never puts the received
  string into `src`. It extracts a video id or a playlist id and REBUILDS the url from a literal
  `https://www.youtube.com/embed/` prefix, returning an empty string when neither matches. So the
  scheme cannot be attacker-chosen, and a `javascript:` url either yields nothing or is confined to
  youtube.com.

  Verified before this test was written:

    javascript:alert(1)                       -> (empty)
    javascript:alert(1)//watch?v=x            -> https://www.youtube.com/embed/x
    data:text/html,<script>...                -> (empty)
    https://evil.com/embed/xyz                -> https://www.youtube.com/embed/xyz
    https://youtube.com/watch?v=../../../evil -> https://www.youtube.com/evil

  This is a REASONING DEPENDENCY, which is why it is a test and not a comment. The server's only
  check on this path is a length cap. If anyone ever "simplifies" the overlay to bind the raw url
  into `src`, that length cap becomes the sole defence and it is not one. This test goes red first.
*/
describe('the youtube overlay confines every url to the youtube origin', () => {
  const overlay = readFileSync(
    new URL('./components/YoutubePlayerOverlay.svelte', import.meta.url),
    'utf8'
  );

  /** The overlay's own derivation, lifted verbatim so the test cannot drift from the component. */
  function srcFor(url: string): string {
    const videoPattern = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const videoId = url.match(videoPattern)?.[2] ?? null;
    const playlistId = url.match(/[?&]list=([^#&?]+)/)?.[1] ?? null;
    if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1&`;
    if (playlistId) {
      return `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&loop=1&rel=0`;
    }
    return '';
  }

  it('builds the src from a literal youtube prefix, never from the received string', () => {
    // If this stops being true the rest of this describe block proves nothing.
    expect(overlay).toContain('https://www.youtube.com/embed/');
    expect(overlay).not.toMatch(/src=\{url\}/);
  });

  it.each([
    ['javascript:alert(1)'],
    ['javascript:alert(1)//watch?v=x'],
    ['data:text/html,<script>alert(1)</script>'],
    ['https://evil.com/embed/xyz'],
    ['https://youtube.com/watch?v=../../../evil'],
    ['vbscript:msgbox(1)//embed/x']
  ])('refuses to leave the youtube origin for %s', (hostile) => {
    const src = srcFor(hostile);
    if (src === '') return; // nothing rendered at all is the safest outcome
    expect(new URL(src).origin).toBe('https://www.youtube.com');
  });

  it('still builds the ordinary case', () => {
    expect(srcFor('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&'
    );
  });
});

/*
  THE TWO RECEIVERS, AND THE GUARD THAT KEEPS A PRESENTER OUT OF THEM.

  Added 2026-08-26 because a negative control came back GREEN: deleting `!isPresenter()` from
  the `sendSalesImageToChat` branch — which is what pins the image over the SENDER'S own chat column
  and, on the sibling branch, navigates the sender out of the room they are running — failed nothing
  in 2,881 tests.

  The guard is the capture's, not a preference: `this.globals.isPresenter || emit(...)` at bytes
  1015228 and 1015399. It is easy to read as a truthiness shorthand and delete, and it is the exact
  species of line this file exists to hold in place — the same reason the youtube-origin assertions
  above were written.
*/
const RECEIVERS = readFileSync(new URL('./room/for-all-broadcasts.ts', import.meta.url), 'utf8');

const receiverBranch = (cmd: string): string => {
  const at = RECEIVERS.indexOf(`command?.cmd === '${cmd}'`);
  expect(at, `${cmd} has no receiver branch in for-all-broadcasts.ts`).toBeGreaterThan(-1);
  /*
    FOUR-space indent since the extraction, not eight: the branches are one nesting level shallower
    in a module function than they were inside the router's channel test. Stated because getting it
    wrong does not fail — it returns a longer slice that happens to contain the right text, and every
    assertion below would keep passing while checking the wrong region.
  */
  const end = RECEIVERS.indexOf('\n  }', at);
  expect(end, 'the branch must close at two-space indent').toBeGreaterThan(at);
  return RECEIVERS.slice(at, end);
};

describe('the room-wide "send" receivers exclude the presenter who sent them', () => {
  it.each(['sendSalesImageToChat', 'sendUsersToURL'])('%s is guarded on isPresenter', (cmd) => {
    /*
      Asserted on the BRANCH, not the file: `#isPresenter()` appears elsewhere in this router, so a
      whole-file `toContain` would pass with the guard deleted from exactly the two places it
      matters.
    */
    expect(receiverBranch(cmd)).toContain('!isPresenter()');
  });

  it.each(['sendSalesImageToChat', 'sendUsersToURL'])('%s refuses an empty url', (cmd) => {
    // `!i || !i.url` upstream, checked before the guard. An empty url pins a broken image, or
    // navigates the room to nowhere.
    expect(receiverBranch(cmd)).toContain("typeof command.url === 'string' && command.url");
  });

  it('navigates for sendUsersToURL and pins the overlay for sendSalesImageToChat', () => {
    // The two do DIFFERENT things, and a copy-paste that gave both the same body would still pass
    // every assertion above.
    expect(receiverBranch('sendUsersToURL')).toContain('location.href = command.url');
    expect(receiverBranch('sendSalesImageToChat')).toContain('salesImageShown(command.url)');
  });
});

describe('the LATE-JOIN REPLAY — what the room is already playing', () => {
  /*
    ── THE GAP THIS CLOSES, AND WHY IT WAS A GAP RATHER THAN A DIVERGENCE ──────────────────────────

    `TODO.md` carried this for weeks: *"No persisted room video/YouTube state, so the four 'For All'
    commands have no LATE-JOIN REPLAY."* The commands broadcast and were received; the reference's
    SERVER side was missing, because `room_state` had nowhere to put it. Its closing line was *"a
    decision, not evidence"*, and the decision is to match the reference.

    Three consequences were named there and all three are closed:

      1. a member who joins while a video is playing sees nothing
      3. the YouTube seek offset is always 0, so no `start=` is ever appended

    — both by this row. Consequence 2, the presenter's own `setTimeout` scheduler, is NOT: persisting
    the url does not by itself move the timer to the server, and this file says so rather than
    letting three-of-three read as done.

    ## The rule that survives, and it is the trap this whole file exists to pin

    **The LIVE wire still carries no `startTime`.** The offset is derived by the subscriber from a
    moment the REPLAY carries out of room state, and the reference's own dispatch forwards `url`
    alone (byte 1,024,137). A `startTime` on the live command would look like the feature and be a
    fabricated number. Building the replay is precisely the change that could have broken this, so
    it is asserted again below on the far side of it.
  */

  it('stores the four columns, on a fresh database AND on an existing one', () => {
    /*
      Both halves, because `CREATE TABLE IF NOT EXISTS` will not add a column to a table that already
      exists — the trap `db/index.ts` names in its own words. A schema change with only the DDL half
      works on the author's machine and on nobody else's.
    */
    for (const column of ['video_url', 'video_play_time', 'yt_url', 'yt_start_time']) {
      expect(DB_INDEX, `${column} must be in the CREATE TABLE`).toContain(`${column} `);
      expect(DB_INDEX, `${column} must also be added to databases that predate it`).toContain(
        `ALTER TABLE room_state ADD COLUMN ${column}`
      );
      expect(DB_INDEX, `${column}'s ALTER must be guarded`).toContain(
        `roomStateColumns.has('${column}')`
      );
    }
    expect(SCHEMA).toContain("videoUrl: text('video_url')");
    expect(SCHEMA).toContain("ytStartTime: integer('yt_start_time', { mode: 'timestamp' })");
  });

  it('writes the row on every play and clears it on every stop', () => {
    expect(remoteCode).toContain('recordVideoForAll(room, playable, null);');
    expect(remoteCode).toContain('clearVideoForAll(room);');
    expect(remoteCode).toContain('recordYoutubeForAll(room, trimmed);');
    expect(remoteCode).toContain('clearYoutubeForAll(room);');
  });

  it('writes the ROW before the broadcast, which is the order that fails safely', () => {
    /*
      Between the two, a member joining reads the row. Row-first means a crash in between leaves a
      member not shown a video the room has stopped watching; broadcast-first leaves the row claiming
      a stopped video is playing, and every arrival after it lands on a dead VideoPlayer tab.

      Asserted by POSITION, because both orders contain both calls and only one of them is right.
    */
    const stopClear = remoteCode.indexOf('clearVideoForAll(room);');
    const stopPublish = remoteCode.indexOf('data: { cmd } }', stopClear);
    expect(stopClear, 'the clear must exist').toBeGreaterThan(-1);
    expect(stopPublish, 'the publish must follow it').toBeGreaterThan(stopClear);

    const playRecord = remoteCode.indexOf('recordVideoForAll(room, playable, null);');
    const playPublish = remoteCode.indexOf('url: playable } });', playRecord);
    expect(playRecord).toBeGreaterThan(-1);
    expect(playPublish).toBeGreaterThan(playRecord);

    const ytRecord = remoteCode.indexOf('recordYoutubeForAll(room, trimmed);');
    const ytStop = remoteCode.indexOf("cmd: 'stopYTForAll'", ytRecord);
    expect(ytRecord).toBeGreaterThan(-1);
    expect(ytStop).toBeGreaterThan(ytRecord);
  });

  it('leaves the OTHER medium alone on every write', () => {
    /*
      A video starting must not clear the room's YouTube overlay: upstream's two are independent and
      both replay. Every `set` names one medium's columns plus `updatedAt`, and an over-wide one is
      silent — the room keeps working and the replay quietly stops.
    */
    expect(MEDIA_STATE).toContain(
      'set: { videoUrl: url, videoPlayTime: playTime, updatedAt: now }'
    );
    expect(MEDIA_STATE).toContain('set: { ytUrl: url, ytStartTime: now, updatedAt: now }');
    /* And neither write mentions the other's columns, nor `chatMode`, nor the close message. */
    /*
      Both bounds bound and asserted, per `slice-anchor-contract`. The end bound especially: -1 would
      make this `slice(start, -1)` — everything to the last character — and a `not.toContain` over
      the whole module would then fail for the wrong reason, on a file that legitimately mentions
      `ytUrl` forty lines further down.
    */
    const videoFrom = MEDIA_STATE.indexOf('export function recordVideoForAll');
    const videoTo = MEDIA_STATE.indexOf('export function clearVideoForAll');
    expect(videoFrom, 'recordVideoForAll must exist').toBeGreaterThan(-1);
    expect(videoTo, 'clearVideoForAll must follow it').toBeGreaterThan(videoFrom);
    const videoWrite = MEDIA_STATE.slice(videoFrom, videoTo);
    expect(videoWrite).not.toContain('ytUrl');
    expect(videoWrite).not.toContain('chatMode');
    expect(videoWrite).not.toContain('closedMessage');
  });

  it('replays the video only when it is PLAYING, not when it is merely scheduled', () => {
    /*
      `roomState.videoURL && !roomState.videoPlayTime` — byte 1,967,330, and the second term is the
      one a reasonable design drops. A play armed for later has a url in the row and nothing on
      screen; replaying it drops an arriving member onto an empty tab minutes before the video
      exists.
    */
    expect(BUNDLE).toContain(
      'this.appService.globals.roomState.videoURL&&!this.appService.globals.roomState.videoPlayTime'
    );
    /*
      The DECISION left `+page.svelte` for `#lib/room/media-replay.ts` on 2026-09-01, when the page
      went past its ceiling. Asserted at the module rather than widened to "either file": which file
      decides is the fact, and the extraction is what gave the three rules a test that does not
      involve mounting a page and stubbing the clock (`room/media-replay.test.ts`, ten cases, four
      negative controls).
    */
    expect(MEDIA_REPLAY).toContain(
      'const playingNow = state.videoUrl !== null && state.videoPlayTime === null;'
    );
    expect(pageCode).toContain(
      'const replay = mediaReplay(data.roomMedia, { isPresenter, now: Date.now() });'
    );
    expect(serverCode).toContain('roomMedia: roomMediaState(requireRoomShortCode(locals)),');
  });

  it('moves a MEMBER to the video tab and leaves a presenter where they are', () => {
    /* `this.isP || this.onMainTabChange(...)` on the live path, byte 1,966,711. Same rule here. */
    expect(MEDIA_REPLAY).toContain('showVideoTab: playingNow && !options.isPresenter,');
    expect(pageCode).toContain("if (replay.showVideoTab) mainTab = 'videoplayer';");
    /* And a presenter still gets the VIDEO — the gate is about the navigation, not the picture. */
    expect(MEDIA_REPLAY).toContain('videoUrl: playingNow ? state.videoUrl : null,');
  });

  it('derives the YouTube offset from the stored MOMENT, and clamps it', () => {
    /*
      `i = Math.round((s - o) / 1e3)`. Clamped at zero because a row written by a clock ahead of this
      one would seek backwards, and `start=` with a negative is answered unpredictably rather than
      refused. The clamp is OURS and is not in the capture; it costs nothing and the alternative is a
      request whose behaviour nobody here can state.
    */
    expect(BUNDLE).toContain('i=Math.round((s-o)/1e3)');
    expect(MEDIA_REPLAY).toContain(
      'Math.max(0, Math.round((options.now - state.ytStartTime) / 1000))'
    );
    expect(pageCode).toContain(
      'if (replay.ytUrl) broadcasts.youtubeStarted(replay.ytUrl, replay.ytStartSeconds);'
    );
    /*
      `now` is a PARAMETER and not a `Date.now()` inside the module, which is what makes rule 3
      testable: a function that reads the clock has a different answer every run, so the only way to
      test the derivation would be to stub a global — which tests the stub as much as the code.
    */
    expect(MEDIA_REPLAY).toContain('readonly now: number');
    expect(MEDIA_REPLAY).not.toContain('Date.now()');
  });

  it('appends `start=` to the video-id embed only, and only when the offset is non-zero', () => {
    /*
      `(i?`start=${i}`:"")` — byte 1,503,354 — on the video-id branch. The playlist branch has none
      upstream and gets none here: a playlist seek would be a seek into whichever item is first.

      And `i ? … : ""` rather than `start=0`, so a live play's request is unchanged. Every member
      present when a video starts takes that path, and appending `start=0` to all of them would
      change the request they all make for a branch only a late joiner reaches.
    */
    expect(BUNDLE).toContain(
      '`https://www.youtube.com/embed/${s}?autoplay=1${l}&`+(i?`start=${i}`:"")'
    );
    expect(overlayCode).toContain("const start = startSeconds > 0 ? `start=${startSeconds}` : '';");
    expect(overlayCode).toContain(
      '`https://www.youtube.com/embed/${videoId}?autoplay=1${mute}&${start}`'
    );
    /*
      The playlist branch, unchanged and asserted so, or the exemption is a claim about nothing.
      The bound is BOUND before the slice, per `slice-anchor-contract`: `indexOf` answers -1 on a
      miss and `slice(-1)` is the last character, so a renamed branch would silently reduce this to
      asserting that one character contains no `start=`.
    */
    const playlistAt = overlayCode.indexOf('if (playlistId) {');
    expect(playlistAt, 'the playlist branch must exist').toBeGreaterThan(-1);
    expect(overlayCode.slice(playlistAt)).not.toContain('start=');
  });

  it('and the LIVE wire still carries no startTime, which building this could have broken', () => {
    /*
      THE TRAP THIS FILE EXISTS TO PIN, re-asserted on the far side of the change that could have
      broken it. The offset is the SUBSCRIBER's derivation from a moment the replay carries; putting
      one on the live command would look like the feature and be a fabricated number, because nothing
      at broadcast time knows how far in anybody is.
    */
    expect(remoteCode).not.toContain('startTime');
    expect(eventsCode).not.toContain('startTime');
    /* The room's model takes SECONDS from its caller and reads no clock of its own. */
    const broadcastsCode = stripComments(BROADCASTS);
    expect(broadcastsCode).toContain('youtubeStarted(url: string, startSeconds = 0) {');
    /*
      Scoped to the METHOD, not the file: `scheduleVideoForAll` legitimately reads the clock to size
      its own `setTimeout` delay, and a file-wide ban would have failed on that for no reason. What
      must not read a clock is the store of the offset — a value that depends on when you look at it
      is not a value.
    */
    expect(
      functionBody(broadcastsCode, 'youtubeStarted(url: string, startSeconds = 0) {')
    ).not.toContain('Date.now()');
  });

  it('clears the offset with the url, in BOTH ways a frame can go', () => {
    /*
      A stale offset seeks the NEXT video to wherever the last one had reached — the overlay's setter
      rebuilds the embed from url and startTime together (byte 1,503,095), so this is a real wrong
      position rather than dead state. Both exits are asserted: `stopYTForAll` takes it off the room,
      and the member's own `×` takes it off their screen.
    */
    const broadcastsCode = stripComments(BROADCASTS);
    for (const method of ['youtubeStopped()', 'closeYoutubeFrame()']) {
      expect(
        functionBody(broadcastsCode, method),
        `${method} must clear the offset with the url`
      ).toContain('this.#youtubeStartSeconds = 0;');
    }
  });

  it('and the SCHEDULE is the server s, so an armed play survives the presenter closing the tab', () => {
    /*
      ── `TODO.md`'s CONSEQUENCE 2, CLOSED THE SAME DAY THE OTHER TWO WERE ────────────────────────

      This case was written hours earlier asserting the OPPOSITE — *"does NOT claim the scheduled
      play moved to the server, because it did not"* — so that persisting the url could not be read
      as having moved the schedule. It has moved now, and inverting the case is the record of that
      rather than deleting it: the sentence it used to protect is exactly what changed.

      ```js
      sendServerAdminCommand("playVideoForAll", {url: e, videoPlayTime: i})    // byte 1,981,560
      case "playVideoForAll": guiEventBus.emit("playVideoForAll", {url: i.url}) // byte 1,024,587
      ```

      The dispatch is what settles it: it forwards `url` alone, so if the browser were the scheduler
      there would be nothing for the server to hold and the payload would not carry a time at all.

      ## The schedule and the claim are the same column

      `video_play_time` is NULL for "playing now" and a moment for "armed", so firing is one atomic
      `UPDATE … SET video_play_time = NULL WHERE video_play_time <= now RETURNING`. The row becomes
      live in the same statement that claims it, and the replay gate (`videoUrl && !videoPlayTime`)
      starts answering with it for the same reason. A SELECT-then-UPDATE would be the TOCTOU
      `CLAUDE.md` names, and two sweeps would both broadcast.
    */
    expect(BUNDLE).toContain('sendServerAdminCommand("playVideoForAll",{url:e,videoPlayTime:i})');
    expect(BUNDLE).toContain(
      'case"playVideoForAll":this.guiEventBus.emit("playVideoForAll",{url:i.url})'
    );

    /* The moment is POSTED, not armed locally. */
    const scheduleBody = functionBody(
      stripComments(BROADCASTS),
      'scheduleVideoForAll(url: string, whenLocal: string) {'
    );
    expect(scheduleBody).toContain(
      "void this.#sendVideoForAllCommand('playVideoForAll', url, at);"
    );
    expect(scheduleBody, 'no local timer arms the play any more').not.toContain('setTimeout');

    /* The server holds it, and fires it. */
    expect(remoteCode).toContain('recordVideoForAll(room, playable, armAt);');
    expect(MEDIA_STATE).toContain('export function claimDueVideos(now: Date): DueVideo[] {');
    expect(MEDIA_STATE).toContain('.set({ videoPlayTime: null, updatedAt: now })');
    expect(MEDIA_STATE).toContain('isNotNull(roomState.videoPlayTime),');
    expect(MEDIA_STATE).toContain('lte(roomState.videoPlayTime, now)');
    /* And the broadcast carries the url alone, exactly as the reference's dispatch does. */
    expect(MEDIA_STATE).toContain("data: { cmd: 'playVideoForAll', url }");

    /* Started where the alert scheduler is, for the reason that one records about itself. */
    const hooks = stripComments(
      readFileSync(new URL('../hooks.server.ts', import.meta.url), 'utf8')
    );
    expect(hooks).toContain('startVideoScheduler();');
    expect(hooks).toContain('startAlertScheduler();');
  });
});
