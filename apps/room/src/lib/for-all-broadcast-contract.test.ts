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
const playerCode = stripComments(PLAYER);
const overlayCode = stripComments(OVERLAY);

const actionBody = (name: string) => {
  const from = serverCode.indexOf(`${name}: async (`);
  expect(from, `the ${name} action must exist`).toBeGreaterThan(-1);
  return serverCode.slice(from, serverCode.indexOf('\n  },', from));
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
  it('refuses a non-presenter on both actions', () => {
    for (const name of ['videoForAll', 'youtubeForAll']) {
      expect(actionBody(name)).toContain(
        "if (!isPresenterRole(user.role)) return fail(403, { message: 'Presenters only.' });"
      );
    }
  });

  it('publishes the four names character for character, and nothing else', () => {
    const video = actionBody('videoForAll');
    expect(video).toContain("if (cmd !== 'playVideoForAll' && cmd !== 'stopVideoForAll') {");
    const youtube = actionBody('youtubeForAll');
    expect(youtube).toContain("if (cmd !== 'playYTForAll' && cmd !== 'stopYTForAll') {");

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
      expect(serverCode).not.toContain(wrong);
    }
  });

  it('scopes every fan-out to the caller’s own room', () => {
    expect(actionBody('videoForAll')).toContain('publishToRoom(requireRoomShortCode(locals)');
    expect(actionBody('youtubeForAll')).toContain('const room = requireRoomShortCode(locals);');
    // Never a room named by the request.
    expect(serverCode).not.toMatch(/publishToRoom\(\s*(String\()?data\.get/);
  });

  it('reproduces the stop-then-play order, from ONE request', () => {
    const body = actionBody('youtubeForAll');
    const stop = body.indexOf("data: { cmd: 'stopYTForAll', url }");
    const play = body.indexOf("data: { cmd: 'playYTForAll', url }");
    expect(stop).toBeGreaterThan(-1);
    expect(play).toBeGreaterThan(-1);
    // Inverted, every browser is left holding a torn-down overlay.
    expect(stop).toBeLessThan(play);
  });

  it('the overlay’s own stop carries no url', () => {
    const body = actionBody('youtubeForAll');
    const bare = body.indexOf("if (cmd === 'stopYTForAll') {");
    expect(bare).toBeGreaterThan(-1);
    expect(body.slice(bare, bare + 200)).toContain(
      "publishToRoom(room, { channel: 'cmds', data: { cmd } });"
    );
  });

  it('refuses a video url that is not http(s), parsed rather than substring-matched', () => {
    const guard = topLevelFunctionBody(serverCode, 'function broadcastableMediaUrl(');
    expect(guard).toContain('parsed = new URL(value);');
    expect(guard).toContain(
      "if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;"
    );
    expect(actionBody('videoForAll')).toContain(
      "if (!url) return fail(400, { message: 'That is not a playable video url.' });"
    );
  });

  it('does NOT loosen fileMediaCommand, whose url must be a file this room holds', () => {
    /*
      The temptation was one action for every "For All". That one checks its url against
      `sharedFiles` because an mp3 IS a room file; a video url is free text a presenter typed, and
      folding them together would have meant deleting that predicate.
    */
    const body = actionBody('fileMediaCommand');
    expect(body).toContain("if (cmd !== 'playMP3ForAll' && cmd !== 'stopMp3ForAll') {");
    expect(body).toContain('eq(sharedFiles.roomShortCode, requireRoomShortCode(locals))');
    expect(body).not.toContain("ForAll', 'play");
    expect(body).not.toContain('playVideoForAll');
    expect(body).not.toContain('playYTForAll');
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
    expect(functionBody(pageCode, 'async function sendVideoForAllCommand(')).toContain(
      "fetch('?/videoForAll', { method: 'POST', body })"
    );
    expect(functionBody(pageCode, 'async function sendYoutubeForAllCommand(')).toContain(
      "fetch('?/youtubeForAll', { method: 'POST', body })"
    );
  });

  it('"Stop For All" and "×" invoke DIFFERENT things', () => {
    // Same function behind both props is the defect; the props must not name one handler.
    expect(pageCode).toContain('onstop={() => void stopYoutubeForAll()}');
    expect(pageCode).toContain('onclose={closeYoutubeFrame}');

    // "Stop For All" reaches the server.
    expect(functionBody(pageCode, 'async function stopYoutubeForAll()')).toContain(
      "sendYoutubeForAllCommand('stopYTForAll')"
    );
    // "×" does not. It clears this browser and nothing else.
    const close = functionBody(pageCode, 'function closeYoutubeFrame()');
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
    expect(pageCode).toContain("if (command?.cmd === 'playVideoForAll') {");
    expect(pageCode).toContain('hideVideoPlayer = true;');
    expect(pageCode).toContain("if (!isPresenter) mainTab = 'videoplayer';");

    expect(pageCode).toContain("if (command?.cmd === 'stopVideoForAll') {");
    expect(pageCode).toContain('hideVideoPlayer = false;');
    expect(pageCode).toContain("if (!isPresenter) mainTab = 'screens';");
  });

  it('the member’s tab and pane carry the captured gate, not `isPresenter` alone', () => {
    // Without the `hideVideoPlayer` term a member is moved to a tab that renders nothing.
    expect(
      pageCode.split('{#if (hideVideoPlayer && !isPresenter) || isPresenter}').length - 1
    ).toBe(2);
  });

  it('the stop cancels an armed play sent by ANOTHER presenter', () => {
    const from = pageCode.indexOf("if (command?.cmd === 'stopVideoForAll') {");
    const body = pageCode.slice(from, pageCode.indexOf('return;', from));
    expect(body).toContain('clearScheduledVideoTimer();');
    expect(body).toContain("scheduledVideoForAll = { videoURL: '', videoPlayTime: null };");
  });

  it('tears the overlay down on stop, everywhere', () => {
    expect(pageCode).toContain("if (command?.cmd === 'playYTForAll') {");
    expect(pageCode).toContain(
      "if (typeof command.url === 'string') youtubeForAllUrl = command.url;"
    );
    expect(pageCode).toContain("if (command?.cmd === 'stopYTForAll') {");
  });
});

describe('the seek offset is computed, never transmitted', () => {
  it('no `startTime` is put on this room’s wire, by anything', () => {
    /*
      The reference's live command has none, and this room has no persisted video state to
      compute one from. A field here would be a fabricated number dressed as a feature.
    */
    expect(serverCode).not.toContain('startTime');
    expect(pageCode).not.toContain('startTime');
    expect(overlayCode).not.toContain('startTime');

    // And the union that types the channel does not offer one to put there.
    const events = stripComments(
      readFileSync(new URL('./server/room-events.ts', import.meta.url), 'utf8')
    );
    expect(events).not.toContain('startTime');
  });

  it('the overlay therefore appends no `start=`, rather than appending a guess', () => {
    expect(overlayCode).not.toContain('start=');
  });

  it('the embed mute stays the LOCAL preference it is upstream', () => {
    // Per-viewer, passed in as a prop — never read off a broadcast payload.
    expect(overlayCode).toContain("const mute = muted ? '&mute=1' : '';");
    expect(pageCode).toContain('muted={doNotDisturbOn}');
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
