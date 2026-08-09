/**
 * Tests the signalling client against the envelope `services/media/src/server.rs` documents.
 *
 * The fake socket below is not a mock of the client's own calls - it is a stand-in for the wire,
 * and every frame it produces is one the Rust server is documented to send. Where a frame is
 * asserted, the assertion is against `server.rs`, not against this client's own idea of itself.
 */

import { describe, expect, it, vi } from 'vitest';
import { MAX_MESSAGE_BYTES, SignallingClient, type SignallingSocket } from './signalling';

/** A controllable `SignallingSocket`. `readyState` follows the DOM constants: 0 CONNECTING, 1 OPEN, 3 CLOSED. */
class FakeSocket implements SignallingSocket {
  readyState = 0;
  readonly sent: string[] = [];
  onopen: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  constructor(readonly url: string) {}

  send(data: string) {
    if (this.readyState !== 1) throw new Error('socket is not open');
    this.sent.push(data);
  }

  close(code = 1000, reason = '') {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }

  /** The server accepting the upgrade. */
  open() {
    this.readyState = 1;
    this.onopen?.({});
  }

  /** One frame arriving from the server. */
  receive(frame: unknown) {
    this.onmessage?.({ data: typeof frame === 'string' ? frame : JSON.stringify(frame) });
  }

  /** The last request this client sent, parsed. */
  lastSent(): { id: number; cmd: string; data?: unknown } {
    return JSON.parse(this.sent[this.sent.length - 1]);
  }
}

/** Builds a connected client plus the socket behind it. */
async function connected(
  overrides: Partial<ConstructorParameters<typeof SignallingClient>[0]> = {}
) {
  const sockets: FakeSocket[] = [];
  const client = new SignallingClient({
    url: 'wss://media.example/ws',
    grant: async () => 'GRANT.SIG',
    socketFactory: (url) => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      // Opened on the next microtask so `connect()` genuinely awaits it.
      queueMicrotask(() => socket.open());
      return socket;
    },
    ...overrides
  });
  await client.connect();
  return { client, sockets, socket: sockets[0] };
}

describe('the request envelope', () => {
  it('sends {id, cmd, data} and correlates the reply by id', async () => {
    const { client, socket } = await connected();

    const pending = client.request('createWebRtcTransport', { producing: true, consuming: false });
    const frame = socket.lastSent();
    expect(frame).toEqual({
      id: 1,
      cmd: 'createWebRtcTransport',
      data: { producing: true, consuming: false }
    });

    // `server.rs:32` - the ok reply.
    socket.receive({ id: frame.id, ok: true, data: { id: 'transport-1' } });
    await expect(pending).resolves.toEqual({ id: 'transport-1' });
  });

  it('omits `data` entirely for a command that takes none', async () => {
    const { client, socket } = await connected();
    void client.request('getRouterRtpCapabilities');
    // The server's `Request.data` is `#[serde(default)]` over a Value (`server.rs:1050-1051`), so a
    // missing key is correct; sending `"data":null` would be a different frame.
    expect(socket.sent[0]).toBe('{"id":1,"cmd":"getRouterRtpCapabilities"}');
    expect(JSON.parse(socket.sent[0])).not.toHaveProperty('data');
  });

  it('issues a fresh id per request and resolves each to its own reply, out of order', async () => {
    const { client, socket } = await connected();

    const first = client.request('getProducers');
    const second = client.request('getRouterRtpCapabilities');
    const [a, b] = socket.sent.map((raw) => JSON.parse(raw));
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);

    // Answered in reverse: correlation is by id, never by arrival order.
    socket.receive({ id: b.id, ok: true, data: { routerRtpCapabilities: { codecs: [] } } });
    socket.receive({ id: a.id, ok: true, data: { producers: [] } });

    await expect(second).resolves.toEqual({ routerRtpCapabilities: { codecs: [] } });
    await expect(first).resolves.toEqual({ producers: [] });
    expect(client.pendingCount).toBe(0);
  });

  it('rejects with the server error code, which is what a caller branches on', async () => {
    const { client, socket } = await connected();
    const pending = client.request('produce', {
      transportId: 't1',
      kind: 'video',
      rtpParameters: { codecs: [] }
    });

    // `CommandError::NotAPresenter` -> "forbidden" (`server.rs:1316`).
    socket.receive({
      id: socket.lastSent().id,
      ok: false,
      error: { code: 'forbidden', message: "this peer's role may not produce" }
    });

    await expect(pending).rejects.toMatchObject({
      code: 'forbidden',
      command: 'produce',
      message: "this peer's role may not produce"
    });
    expect(client.pendingCount).toBe(0);
  });

  it('refuses to send a frame larger than the server would accept', async () => {
    const { client, socket } = await connected();
    await expect(
      client.request('consume', {
        transportId: 't1',
        producerId: 'p1',
        rtpCapabilities: {
          codecs: [{ kind: 'video', mimeType: 'x'.repeat(MAX_MESSAGE_BYTES) }]
        } as never
      })
    ).rejects.toMatchObject({ code: 'clientFrameTooLarge' });
    // Nothing went to the wire, so the server never closes the socket underneath us.
    expect(socket.sent).toHaveLength(0);
  });

  it('rejects a request issued with no open socket', async () => {
    const { client, socket } = await connected({ reconnect: false });
    socket.close(1006, 'gone');
    await expect(client.request('getProducers')).rejects.toMatchObject({
      code: 'clientDisconnected'
    });
  });
});

describe('notifications', () => {
  it('dispatches a server push by name and never mistakes it for a reply', async () => {
    const { client, socket } = await connected();
    const seen: unknown[] = [];
    client.on('newProducer', (info) => seen.push(info));

    const pending = client.request('getProducers');
    // A notification carries no `id` (`server.rs:35`), which is the whole discriminator.
    socket.receive({
      notify: 'newProducer',
      data: {
        producerId: 'p1',
        peerId: 'peer-1',
        userId: 463,
        displayName: 'Billy Ribeiro',
        kind: 'video',
        appData: { share: true, screenName: 'Screen 1' }
      }
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ producerId: 'p1', kind: 'video' });
    // The in-flight request is untouched by the push.
    expect(client.pendingCount).toBe(1);
    socket.receive({ id: socket.lastSent().id, ok: true, data: { producers: [] } });
    await expect(pending).resolves.toEqual({ producers: [] });
  });

  it('delivers the connected welcome, which the server sends before any command', async () => {
    const { client, socket } = await connected();
    const welcomes: unknown[] = [];
    client.on('connected', (payload) => welcomes.push(payload));

    // `server.rs:929-938`.
    socket.receive({
      notify: 'connected',
      data: {
        peerId: 'peer-1',
        room: 'ptr-room',
        userId: 463,
        displayName: 'Billy Ribeiro',
        role: 'presenter'
      }
    });
    expect(welcomes[0]).toMatchObject({ room: 'ptr-room', role: 'presenter' });
  });

  it('dispatches the producer pause and resume pushes', async () => {
    // `producerPaused` / `producerResumed` (`server.rs:1203-1210`, `:1217-1224`). A paused producer
    // keeps its roster entry - only its state changed - so a viewer that treated these as a close
    // would tear a tile down that is about to start sending again. They must arrive as their own
    // events, not as `protocolerror`, which is what an unrecognised name gets.
    const { client, socket } = await connected();
    const problems: unknown[] = [];
    const seen: string[] = [];
    client.on('protocolerror', (problem) => problems.push(problem));
    client.on('producerPaused', (data) => seen.push(`paused:${data.producerId}`));
    client.on('producerResumed', (data) => seen.push(`resumed:${data.producerId}`));

    socket.receive({ notify: 'producerPaused', data: { producerId: 'p1', peerId: 'peer-1' } });
    socket.receive({ notify: 'producerResumed', data: { producerId: 'p1', peerId: 'peer-1' } });

    expect(seen).toEqual(['paused:p1', 'resumed:p1']);
    expect(problems).toEqual([]);
  });

  it('reports an unknown notification instead of dropping it', async () => {
    const { client, socket } = await connected();
    const problems: unknown[] = [];
    client.on('protocolerror', (problem) => problems.push(problem));

    socket.receive({ notify: 'activeSpeaker', data: {} });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ message: expect.stringContaining('activeSpeaker') });
  });

  it('lets a listener unsubscribe itself mid-dispatch without losing its peers', async () => {
    const { client, socket } = await connected();
    const calls: string[] = [];
    const off = client.on('peerClosed', () => {
      calls.push('first');
      off();
    });
    client.on('peerClosed', () => calls.push('second'));

    socket.receive({ notify: 'peerClosed', data: { peerId: 'p', userId: 1, producerIds: [] } });
    expect(calls).toEqual(['first', 'second']);

    socket.receive({ notify: 'peerClosed', data: { peerId: 'p', userId: 1, producerIds: [] } });
    expect(calls).toEqual(['first', 'second', 'second']);
  });
});

describe('frames that cannot be correlated', () => {
  it('surfaces the server’s {"id": null} refusal rather than hanging forever', async () => {
    // The captured client's bug: a malformed ack leaves its promise permanently unsettled
    // (bundle byte 1094980). The server sends this frame specifically so a client need not hang
    // (`server.rs:36-42`), and dropping it here would reintroduce exactly that failure.
    const { client, socket } = await connected();
    const problems: { message: string }[] = [];
    client.on('protocolerror', (problem) => problems.push(problem));

    socket.receive({
      id: null,
      ok: false,
      error: { code: 'badEnvelope', message: 'a request must be {id, cmd, data?}' }
    });
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('a request must be');
  });

  it('reports a reply for an id it never issued', async () => {
    const { client, socket } = await connected();
    const problems: { message: string }[] = [];
    client.on('protocolerror', (problem) => problems.push(problem));

    socket.receive({ id: 999, ok: true, data: {} });
    expect(problems[0].message).toContain('999');
  });

  it('reports a frame that is not JSON, and a frame that is not text', async () => {
    const { client, socket } = await connected();
    const problems: { message: string }[] = [];
    client.on('protocolerror', (problem) => problems.push(problem));

    socket.receive('{not json');
    socket.onmessage?.({ data: new Uint8Array([1, 2, 3]) });

    expect(problems).toHaveLength(2);
    expect(problems[0].message).toContain('not JSON');
    expect(problems[1].message).toContain('non-text');
  });
});

describe('timeouts', () => {
  it('rejects a request the server never answers', async () => {
    const timers: (() => void)[] = [];
    const { client, socket } = await connected({
      requestTimeoutMs: 5000,
      setTimer: (fn) => {
        timers.push(fn);
        return timers.length;
      },
      clearTimer: () => {}
    });

    const pending = client.request('consume', {
      transportId: 't1',
      producerId: 'p1',
      rtpCapabilities: { codecs: [] }
    });
    expect(client.pendingCount).toBe(1);

    timers[0]();
    await expect(pending).rejects.toMatchObject({ code: 'clientTimeout', command: 'consume' });
    expect(client.pendingCount).toBe(0);
    void socket;
  });

  it('does not arm a timer when the timeout is disabled', async () => {
    const setTimer = vi.fn(() => 1);
    const { client } = await connected({ requestTimeoutMs: 0, setTimer, clearTimer: () => {} });
    void client.request('getProducers');
    expect(setTimer).not.toHaveBeenCalled();
  });
});

describe('disconnect and reconnect', () => {
  it('rejects every in-flight request when the socket closes, rather than replaying it', async () => {
    // Replaying would be wrong, not merely risky: the server closes the peer's whole Session when
    // its socket ends (`server.rs:1024`), so every transport id held here is already dead.
    const { client, socket } = await connected({ reconnect: false });
    const first = client.request('getProducers');
    const second = client.request('getRouterRtpCapabilities');

    socket.close(1006, 'abnormal');

    await expect(first).rejects.toMatchObject({
      code: 'clientDisconnected',
      command: 'getProducers'
    });
    await expect(second).rejects.toMatchObject({ code: 'clientDisconnected' });
    expect(client.pendingCount).toBe(0);
  });

  it('announces the disconnect, saying whether it will redial', async () => {
    const { client, socket } = await connected({ reconnect: false });
    const events: { code: number; willReconnect: boolean }[] = [];
    client.on('disconnected', (event) => events.push(event));

    socket.close(1001, 'the media server is shutting down');
    expect(events).toEqual([
      { code: 1001, reason: 'the media server is shutting down', willReconnect: false }
    ]);
  });

  it('redials with a fresh grant, because a grant is capped at five minutes', async () => {
    const timers: (() => void)[] = [];
    const grant = vi.fn(async () => `GRANT-${grant.mock.calls.length}`);
    const sockets: FakeSocket[] = [];
    const client = new SignallingClient({
      url: 'wss://media.example/ws',
      grant,
      socketFactory: (url) => {
        const socket = new FakeSocket(url);
        sockets.push(socket);
        queueMicrotask(() => socket.open());
        return socket;
      },
      setTimer: (fn) => {
        timers.push(fn);
        return timers.length;
      },
      clearTimer: () => {},
      random: () => 0.5
    });

    await client.connect();
    expect(sockets[0].url).toBe('wss://media.example/ws?grant=GRANT-1');

    sockets[0].close(1006, 'abnormal');
    expect(timers).toHaveLength(1);
    timers[0]();
    await vi.waitFor(() => expect(sockets).toHaveLength(2));

    // A cached grant would be expired after any real outage (`grant.rs:204`, 300s ceiling).
    expect(grant).toHaveBeenCalledTimes(2);
    expect(sockets[1].url).toBe('wss://media.example/ws?grant=GRANT-2');
  });

  it('backs off exponentially with full jitter, capped', async () => {
    const { client } = await connected({
      initialReconnectDelayMs: 500,
      maxReconnectDelayMs: 30_000
    });
    // delay = random() * min(cap, initial * 2^attempt).
    expect(client.reconnectCeilingMs(0)).toBe(500);
    expect(client.reconnectCeilingMs(1)).toBe(1000);
    expect(client.reconnectCeilingMs(2)).toBe(2000);
    expect(client.reconnectCeilingMs(6)).toBe(30_000);
    // Capped: every peer in a room loses its socket at the same instant on an SFU restart
    // (`server.rs:155-161`), so the ceiling has to stop growing.
    expect(client.reconnectCeilingMs(40)).toBe(30_000);
  });

  it('draws the delay from the growing ceiling on each successive failure', async () => {
    const delays: number[] = [];
    const timers: (() => void)[] = [];
    const client = new SignallingClient({
      url: 'wss://media.example/ws',
      // Every redial fails, so the attempt counter keeps climbing.
      grant: async () => {
        throw new Error('the app is down');
      },
      socketFactory: () => new FakeSocket('unused'),
      setTimer: (fn, ms) => {
        delays.push(ms);
        timers.push(fn);
        return timers.length;
      },
      clearTimer: () => {},
      random: () => 1,
      initialReconnectDelayMs: 100,
      maxReconnectDelayMs: 800
    });

    await expect(client.connect()).rejects.toThrow('the app is down');

    // Drive the ladder by hand through the armed timers.
    //
    // The grant has to succeed EXACTLY ONCE and fail forever after. `connected()` awaits a real
    // `connect()`, so a grant that throws on its first call cannot produce a connected client to
    // drop - there would be no socket to close and no ladder to climb. What this test needs is the
    // outage shape: a peer that got in, then lost the SFU while the app kept refusing to mint.
    let mints = 0;
    const { client: live, sockets } = await connected({
      setTimer: (fn, ms) => {
        delays.push(ms);
        timers.push(fn);
        return timers.length;
      },
      clearTimer: () => {},
      random: () => 1,
      initialReconnectDelayMs: 100,
      maxReconnectDelayMs: 800,
      grant: async () => {
        mints += 1;
        if (mints > 1) throw new Error('still down');
        return 'GRANT.SIG';
      }
    });
    delays.length = 0;
    timers.length = 0;

    sockets[0].close(1006, 'abnormal');
    for (let step = 0; step < 5; step += 1) {
      const armed = timers[timers.length - 1];
      armed();
      await vi.waitFor(() => expect(timers.length).toBe(step + 2));
    }

    expect(delays.slice(0, 5)).toEqual([100, 200, 400, 800, 800]);
    await live.close();
  });

  it('arms exactly one reconnect timer when a redial dies after its socket exists', async () => {
    // The double-arm case, which is the one that actually bites in production. A redial that fails
    // *before* a socket exists (a refused grant) has one arming path - `#dial`'s own catch. But a
    // redial that gets a socket and then has it closed under it - a refused upgrade, a 401, an SFU
    // that accepts TCP and then goes away - travels BOTH paths: `onclose` runs `#onClose`, which
    // arms, and `#dial` also rejects, whose catch arms again.
    //
    // Unguarded that is not "one extra timer": each of the two attempts spawned by this round is
    // itself a socket that closes, so the next round arms four, then eight. A media host down for
    // a minute would be met by an exponentially growing redial storm - the exact opposite of what
    // a backoff is for, and invisible in any test that only fails the grant.
    const timers: (() => void)[] = [];
    const sockets: FakeSocket[] = [];
    let mints = 0;

    const client = new SignallingClient({
      url: 'wss://media.example/ws',
      setTimer: (fn) => {
        timers.push(fn);
        return timers.length;
      },
      clearTimer: () => {},
      random: () => 1,
      grant: async () => {
        mints += 1;
        return `GRANT-${mints}`;
      },
      socketFactory: (url) => {
        const socket = new FakeSocket(url);
        sockets.push(socket);
        // The first socket opens; every later one is accepted and then dropped without ever
        // opening, which is what a refused upgrade looks like to the browser.
        queueMicrotask(() => (sockets.length === 1 ? socket.open() : socket.close(1006, '')));
        return socket;
      }
    });
    await client.connect();

    expect(timers).toHaveLength(0);

    sockets[0].close(1006, 'abnormal');
    expect(timers).toHaveLength(1);

    // Fire the armed redial. It builds a socket, that socket closes, and both failure paths run.
    timers[0]();
    await vi.waitFor(() => expect(sockets).toHaveLength(2));

    expect(timers).toHaveLength(2);
    await client.close();
  });

  it('stops for good on close(), cancelling any armed reconnect', async () => {
    const timers: (() => void)[] = [];
    const cleared: unknown[] = [];
    const { client, socket, sockets } = await connected({
      setTimer: (fn) => {
        timers.push(fn);
        return timers.length;
      },
      clearTimer: (handle) => cleared.push(handle)
    });

    socket.close(1006, 'abnormal');
    expect(timers).toHaveLength(1);

    await client.close();
    expect(cleared).toContain(1);

    // The armed timer firing late must not resurrect the connection.
    timers[0]();
    await Promise.resolve();
    expect(sockets).toHaveLength(1);
  });

  it('sends the close command before closing the socket', async () => {
    const { client, socket } = await connected();
    const closing = client.close();
    expect(socket.lastSent()).toEqual({ id: 1, cmd: 'close' });

    // `server.rs:1075-1078`: the server answers, then closes.
    socket.receive({ id: 1, ok: true, data: {} });
    await closing;
    expect(socket.readyState).toBe(3);
  });

  it('closes cleanly even when the server never answers the close command', async () => {
    const { client, socket } = await connected({ requestTimeoutMs: 0 });
    // The socket dies mid-teardown, rejecting the pending `close` request. Teardown must still
    // complete - the intent is achieved either way.
    const closing = client.close();
    socket.close(1006, 'abnormal');
    await expect(closing).resolves.toBeUndefined();
  });
});
