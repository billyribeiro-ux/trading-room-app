import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The connectivity troubleshooter must test THIS deployment, or say that it did not.
 *
 * `TODO.md` item N. The test used to run against Google's public STUN servers only, which made
 * every result misleading in a way a user could not detect: a green tick said nothing about whether
 * `media.tradingroom.app` was reachable, and a red one blamed the user's firewall for
 * infrastructure we do not run.
 *
 * Read as source text because the component needs a browser, an `RTCPeerConnection` and a live
 * grant to execute. What is pinned here is not the wiring — `svelte-check` covers that — but the
 * three DECISIONS inside it, each of which is invisible once made and easy to undo by accident.
 */

const MODAL_HOST = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');
const ROOM_PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');

describe('the ICE servers the troubleshooter uses', () => {
  it('takes them from this deployment, passed down as a prop', () => {
    expect(MODAL_HOST).toContain('mediaIceServers?: RTCIceServer[]');
    expect(MODAL_HOST).toContain('mediaIceServers = []');
    expect(ROOM_PAGE).toContain('{mediaIceServers}');
  });

  /*
    THE test in this file.

    When the deployment's servers are available they are used ALONE. Appending the public STUN
    entries "just in case" would mean a passing `stun` tick could have come from Google while ours
    was unreachable — the same lie as before, pointing the other way, and undetectable from the UI.

    Pinned as a structural property: the public servers may appear only on the fallback side of the
    conditional.
  */
  it('uses them ALONE, never merged with the public fallback', () => {
    const config = MODAL_HOST.slice(
      MODAL_HOST.indexOf('const usingDeploymentServers'),
      MODAL_HOST.indexOf('const relayConfigured')
    );
    expect(config, 'the configuration block should be findable').not.toHaveLength(0);

    // The deployment branch is the bare value...
    expect(config).toContain('? mediaIceServers');
    // ...and Google's servers appear only after the colon, i.e. only when we have nothing of ours.
    const googleAt = config.indexOf('stun.l.google.com');
    const elseAt = config.indexOf(': [');
    expect(googleAt).toBeGreaterThan(-1);
    expect(googleAt, 'public STUN must be on the fallback branch only').toBeGreaterThan(elseAt);
    // And never concatenated onto the deployment list.
    expect(config).not.toMatch(/mediaIceServers\s*[,.]\s*\.\.\./);
    expect(config).not.toContain('...mediaIceServers');
  });

  it('records which of the two ran, and only after a run', () => {
    // "STUN passed" is a different claim in each case; the UI has to say which it is making.
    expect(MODAL_HOST).toContain(
      "testIceSource = usingDeploymentServers ? 'deployment' : 'public-fallback'"
    );
    expect(MODAL_HOST).toContain('hasRunTest = true');
    expect(MODAL_HOST).toContain('{#if hasRunTest}');
    expect(MODAL_HOST).toContain("says nothing about this room's servers");
  });

  /*
    The reference's TURN server must never come back. It shipped once: two authenticated relay
    allocations against a THIRD PARTY's host, with that third party's credentials, leaking our
    users' IP addresses to it on every run of the test.
  */
  it("never carries the reference's TURN server or its credentials as live code", () => {
    /*
      Comments stripped first, deliberately.

      The first version of this test asserted against the whole file and failed — because the block
      comment above `runWebRTCTest` QUOTES the removed configuration verbatim, which is exactly what
      makes that comment useful. Testing the raw text would have forced someone to delete the
      explanation in order to get the suite green, which is the opposite of what this pins.

      What must never come back is the live entry.
    */
    const code = MODAL_HOST.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toContain('turn:flash.protradingroom.com');
    expect(code).not.toContain('ptrUser');
    expect(code).not.toContain('ptr123');
    // And the comment SHOULD still explain it, so the next reader knows why it is absent.
    expect(MODAL_HOST).toContain("THE REFERENCE'S TURN SERVER IS GONE FROM HERE");
  });

  it('still reports an unconfigured relay as unconfigured rather than failed', () => {
    // `MEDIA_TURN_URLS`/`MEDIA_TURN_SECRET` are unset today, so `mediaIceServers` carries STUN only.
    // Saying "check your network or firewall" for a relay nobody configured blames the user for our
    // own missing setting.
    expect(MODAL_HOST).toContain("if (!relayConfigured) testStates.turn = 'unconfigured'");
  });
});

describe('the room page no longer traps the ICE servers in a closure', () => {
  it('holds them as component-level raw state', () => {
    // `$state.raw`, not `$state`: the array is replaced on every grant, never mutated.
    expect(ROOM_PAGE).toContain('let mediaIceServers = $state.raw<RTCIceServer[]>([])');
  });

  it('assigns them where the grant is minted, and feeds the media session from the same value', () => {
    // One source. Two copies is how the modal and the media session end up testing different things.
    expect(ROOM_PAGE).toContain('mediaIceServers = minted.iceServers ?? []');
    expect(ROOM_PAGE).toContain('iceServers: () => mediaIceServers');
    // The old function-local must be gone, or the getter could close over a stale empty array.
    expect(ROOM_PAGE).not.toContain('let iceServers: RTCIceServer[] = []');
  });
});
