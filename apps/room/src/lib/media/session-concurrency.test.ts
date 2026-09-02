// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The two check-then-await races in `MediaSession`, executed.
 *
 * ## Why these could not be caught by anything already here
 *
 * `session.test.ts` covers the encoding selection, which is pure. Everything else in that class is
 * three network round trips deep, so the only assertions anybody had written about it were about
 * SOURCE. A race between two callers is invisible to source-reading, to `svelte-check` and to the
 * type system — both versions type-check, both work when called once, and both leak only when two
 * calls overlap. That is what this file is for, and it is why the mediasoup `Device` is mocked
 * rather than the tests being written against text.
 *
 * ## The two defects
 *
 * `createSendTransport` was `if (this.#sendTransport) return it; this.#sendTransport = await
 * this.#createTransport('send')`. The field stays null for the whole round trip, so two concurrent
 * callers both passed the guard and both asked the server for a transport. The second assignment
 * won; the first transport was never closed here, is not reachable by `close()` (which closes the
 * field), and stays allocated on the server. Both directions can race for real — the page produces
 * mic and camera from two separate handlers, and `newProducer` arrives once per remote producer.
 *
 * `consume` guarded on `#consumers.has(producerId)` and then awaited three round trips before
 * writing that map. Its own docblock says the dedupe exists because the server's `newProducer` is
 * AT-LEAST-ONCE (`server.rs:88-92`) — a duplicate notification is the EXPECTED case, and two of them
 * arrive back to back, well inside one round trip. So two consumers were built for one producer, the
 * second overwrote the first in the map, and the first was left open and receiving with no way for
 * `stopConsuming` to reach it.
 *
 * ## How the count is observed without a browser
 *
 * `#createTransport` awaits `createWebRtcTransport` BEFORE it touches the device, so the number of
 * requests is observable while the promise is still outstanding. Every request here is deferred and
 * released by the test, which is what makes the overlap deterministic rather than timing-dependent.
 */

const transports = vi.hoisted(() => ({ created: [] as { id: string; direction: string }[] }));

/*
  jsdom has no `MediaStream`, and `consume` builds one for every remote track. A two-line stand-in
  rather than a WebRTC polyfill: nothing here reads the stream back, and a polyfill would be a
  dependency carried for one constructor call. Defined before the import below, because that module
  is evaluated at import time and its `consume` runs against whatever the global is then.
*/
class FakeMediaStream {
  readonly tracks: unknown[];
  constructor(tracks: unknown[] = []) {
    this.tracks = tracks;
  }
  getTracks() {
    return this.tracks;
  }
}
globalThis.MediaStream ??= FakeMediaStream as unknown as typeof MediaStream;

vi.mock('mediasoup-client', () => {
  const makeTransport = (direction: string) => {
    const id = `${direction}-${transports.created.length + 1}`;
    const transport = {
      id,
      on: () => {},
      close: () => {},
      consume: async (options: { id: string; producerId: string; kind: string }) => ({
        id: options.id,
        producerId: options.producerId,
        kind: options.kind,
        track: { kind: options.kind, id: `${options.id}-track` },
        close: () => {},
        on: () => {}
      })
    };
    transports.created.push({ id, direction });
    return transport;
  };

  return {
    Device: class {
      loaded = true;
      recvRtpCapabilities = { codecs: [], headerExtensions: [] };
      async load() {}
      createSendTransport() {
        return makeTransport('send');
      }
      createRecvTransport() {
        return makeTransport('recv');
      }
    }
  };
});

const { MediaSession } = await import('./session');

/** One deferred promise per request, so the test decides when a round trip completes. */
function deferredSignalling() {
  const calls: string[] = [];
  const pending: (() => void)[] = [];

  const answers: Record<string, unknown> = {
    getRouterRtpCapabilities: { routerRtpCapabilities: { codecs: [], headerExtensions: [] } },
    createWebRtcTransport: {
      id: 'server-transport',
      iceParameters: {},
      iceCandidates: [],
      dtlsParameters: {}
    },
    consume: { id: 'consumer-1', producerId: 'producer-1', kind: 'video', rtpParameters: {} },
    resumeConsumer: undefined
  };

  return {
    calls,
    /** Lets every request issued SO FAR resolve, in the order it was made. */
    release() {
      const queued = pending.splice(0, pending.length);
      for (const resolve of queued) resolve();
      return Promise.resolve();
    },
    /**
     * Releases repeatedly until nothing new is queued.
     *
     * `consume` issues three round trips in sequence, and each one is only pushed after the previous
     * resolves — so a fixed number of `release()` calls is a guess about scheduling. This drains
     * instead, with a bound so a genuinely stuck promise fails as a timeout rather than a hang.
     */
    async drain() {
      let quiet = 0;
      for (let pass = 0; pass < 60 && quiet < 3; pass += 1) {
        const queued = pending.splice(0, pending.length);
        for (const resolve of queued) resolve();
        /*
          A macrotask turn, not a microtask one. Each round trip's continuation is a `.then`, but the
          NEXT request is only issued once that continuation runs, and a fixed number of
          `await Promise.resolve()` is a guess about how many microtasks deep the chain goes.
          Yielding to the timer queue lets the whole microtask queue empty first, and three
          consecutive quiet turns is the stop condition rather than the first one — a chain that
          pauses for a turn would otherwise look finished.
        */
        await new Promise((resolve) => setTimeout(resolve, 0));
        quiet = queued.length === 0 && pending.length === 0 ? quiet + 1 : 0;
      }
    },
    client: {
      request(command: string) {
        calls.push(command);
        return new Promise((resolve) => {
          pending.push(() => resolve(answers[command]));
        });
      }
    }
  };
}

const producer = (producerId: string) => ({
  producerId,
  peerId: 'peer-1',
  userId: 7,
  displayName: 'A Presenter',
  kind: 'video' as const,
  appData: {}
});

async function loadedSession(signalling: ReturnType<typeof deferredSignalling>) {
  const session = new MediaSession({
    signalling: signalling.client as never,
    canProduce: true
  });
  const loading = session.load();
  await signalling.drain();
  await loading;
  return session;
}

beforeEach(() => {
  transports.created.length = 0;
});

describe('createSendTransport, called twice before the first resolves', () => {
  it('asks the server ONCE and hands both callers the same transport', async () => {
    const signalling = deferredSignalling();
    const session = await loadedSession(signalling);

    const first = session.createSendTransport();
    const second = session.createSendTransport();
    /*
      Asserted BEFORE the release, which is the whole point: the count is taken while both calls are
      inside the window the old code left open. With the check-then-await this was 2.
    */
    expect(signalling.calls.filter((command) => command === 'createWebRtcTransport')).toHaveLength(
      1
    );

    await signalling.release();
    expect(await first).toBe(await second);
    expect(transports.created.filter((entry) => entry.direction === 'send')).toHaveLength(1);
  });

  it('still returns the cached transport once it exists, without a second request', async () => {
    const signalling = deferredSignalling();
    const session = await loadedSession(signalling);

    const created = session.createSendTransport();
    await signalling.release();
    const transport = await created;

    expect(await session.createSendTransport()).toBe(transport);
    expect(signalling.calls.filter((command) => command === 'createWebRtcTransport')).toHaveLength(
      1
    );
  });

  it('does not poison later calls when the first attempt fails', async () => {
    /*
      The reason the memo holds a PROMISE and clears it in `finally` rather than latching a boolean:
      a failed creation must leave the session able to try again. The caller that failed sees the
      error; the next caller starts a fresh round trip.
    */
    const failures: string[] = [];
    let attempt = 0;
    const client = {
      request(command: string) {
        if (command === 'getRouterRtpCapabilities') {
          return Promise.resolve({ routerRtpCapabilities: { codecs: [], headerExtensions: [] } });
        }
        attempt += 1;
        if (attempt === 1) {
          failures.push(command);
          return Promise.reject(new Error('transport refused'));
        }
        return Promise.resolve({
          id: 'server-transport',
          iceParameters: {},
          iceCandidates: [],
          dtlsParameters: {}
        });
      }
    };
    const session = new MediaSession({ signalling: client as never, canProduce: true });
    await session.load();

    await expect(session.createSendTransport()).rejects.toThrow('transport refused');
    expect(failures).toEqual(['createWebRtcTransport']);
    await expect(session.createSendTransport()).resolves.toBeTruthy();
  });
});

describe('createRecvTransport, called twice before the first resolves', () => {
  it('asks the server ONCE, which is the direction `newProducer` actually races', async () => {
    const signalling = deferredSignalling();
    const session = await loadedSession(signalling);

    const first = session.createRecvTransport();
    const second = session.createRecvTransport();
    expect(signalling.calls.filter((command) => command === 'createWebRtcTransport')).toHaveLength(
      1
    );

    await signalling.release();
    expect(await first).toBe(await second);
    expect(transports.created.filter((entry) => entry.direction === 'recv')).toHaveLength(1);
  });
});

describe('consume, called twice for one producer before the first resolves', () => {
  it('negotiates ONCE and answers the second caller null', async () => {
    /*
      `null` is the documented answer for "already being consumed", and it was only ever true for
      "already consumed". The server sends `newProducer` at least once, so this pair of calls is the
      expected case rather than an unlucky one.
    */
    const signalling = deferredSignalling();
    const session = await loadedSession(signalling);

    const first = session.consume(producer('producer-1'));
    const second = session.consume(producer('producer-1'));

    await signalling.drain();

    expect(await second).toBeNull();
    expect(await first).not.toBeNull();
    expect(signalling.calls.filter((command) => command === 'consume')).toHaveLength(1);
    expect(session.remoteStreams.size).toBe(1);
  });

  it('frees the producer id again when the negotiation fails', async () => {
    /*
      The `finally`. Without it a failed consume wedges that producer id for the life of the session,
      and every later `newProducer` for it — which the server will send, being at-least-once —
      returns `null` and the stream is never drawn.
    */
    let attempt = 0;
    const client = {
      request(command: string) {
        if (command === 'getRouterRtpCapabilities') {
          return Promise.resolve({ routerRtpCapabilities: { codecs: [], headerExtensions: [] } });
        }
        if (command === 'createWebRtcTransport') {
          return Promise.resolve({
            id: 'server-transport',
            iceParameters: {},
            iceCandidates: [],
            dtlsParameters: {}
          });
        }
        if (command === 'consume') {
          attempt += 1;
          if (attempt === 1) return Promise.reject(new Error('consume refused'));
          return Promise.resolve({
            id: 'consumer-1',
            producerId: 'producer-1',
            kind: 'video',
            rtpParameters: {}
          });
        }
        return Promise.resolve(undefined);
      }
    };
    const session = new MediaSession({ signalling: client as never, canProduce: true });
    await session.load();

    await expect(session.consume(producer('producer-1'))).rejects.toThrow('consume refused');
    /* NOT null — the id was released, so the retry negotiates rather than being deduped away. */
    expect(await session.consume(producer('producer-1'))).not.toBeNull();
    expect(session.remoteStreams.size).toBe(1);
  });
});
