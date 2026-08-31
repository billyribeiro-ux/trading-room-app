// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { REPEAT_BADGE_CLASS, removeScheduledAlertQuestion } from '#lib/scheduled-alert-table.js';
import { codeOf } from '#lib/source-comments.js';
import ScheduledAlertsTable from './components/ScheduledAlertsTable.svelte';
import VideoPlayer from './components/VideoPlayer.svelte';

/**
 * The three surfaces read against the v4 bundle on 2026-08-31 — `VID-*`, `SCH-*`, `AVD-*`.
 *
 * The module-level rules those rows moved out are executed by `device-enumeration-contract.test.ts`
 * and `video-list-contract.test.ts`. What is left is what only a component can answer: what is on
 * screen, and what a click does to it.
 *
 * **Read once, at module scope.** Three of these assertions read the same file, and `readFileSync`
 * inside a timed body is what put two files in this repository near the 5,000 ms limit.
 */
const source = (file: string) => readFileSync(`src/lib/components/${file}`, 'utf8');
const VIDEO_PLAYER = codeOf('VideoPlayer.svelte', source('VideoPlayer.svelte'));
const AV_DEVICE_PANE = codeOf('AvDevicePane.svelte', source('AvDevicePane.svelte'));
const SCHEDULED_ALERTS = codeOf('ScheduledAlerts.svelte', source('ScheduledAlerts.svelte'));

const mounted: (() => void)[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()?.();
});

/**
 * A `<div>` in the document, ready to mount into, that tears itself down after the test.
 *
 * `mount` is called at each SITE rather than through one generic wrapper, and that is a correction:
 * the wrapper took `Parameters<typeof mount>[0]`, which widens every component to
 * `Component<Record<string, any>>` and made three real prop objects unassignable — `svelte-check`
 * caught it in the gate. A helper that has to widen its argument to accept three callers has stopped
 * checking anything for any of them.
 */
const target = () => {
  const node = document.createElement('div');
  document.body.append(node);
  return node;
};

const track = (node: HTMLDivElement, instance: Record<string, unknown>) => {
  flushSync();
  mounted.push(() => {
    void unmount(instance);
    node.remove();
  });
  return node;
};

const videoPlayer = (
  scheduledVideo: { videoURL: string; videoPlayTime: string | null } = {
    videoURL: '',
    videoPlayTime: null
  }
) => {
  const node = target();
  return track(
    node,
    mount(VideoPlayer, {
      target: node,
      props: {
        sessionId: 'sess-1',
        isPresenter: true,
        videoPlayerUrl: '',
        scheduledVideo,
        onplaynow: () => {},
        onschedule: () => {},
        onstopforall: () => {}
      }
    })
  );
};

describe('VID-01 — the two dialogs are the room s primitive, not a hand-rolled copy of it', () => {
  /*
    `bootbox.dialog({title:"Video", …})` at byte 1,980,807. This file answered it with about ninety
    lines of copied `<div class="bootbox modal fade show">`, and the copy was missing the three
    things that are not markup: the backdrop, the focus move, and the focus restore. Asserted on the
    RENDERED dom rather than the source, because "did the primitive actually run" is the claim.
  */
  const openPlayDialog = () => {
    const dom = videoPlayer();
    dom.querySelector<HTMLElement>('#addon-video-url')?.click();
    const input = dom.querySelector<HTMLInputElement>('#video-url');
    input!.value = 'https://cdn.example.com/a.mp4';
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
    dom.querySelector<HTMLElement>('#addon-video-url')?.click();
    flushSync();
    /* Dismiss the "Video added." alert, then press Play For All on the row it created. */
    dom.querySelector<HTMLElement>('.bootbox-accept')?.click();
    flushSync();
    dom.querySelector<HTMLElement>('button[title="Play For All"]')?.click();
    flushSync();
    return dom;
  };

  it('renders a backdrop behind the Play dialog', () => {
    expect(openPlayDialog().querySelector('.modal-backdrop')).not.toBeNull();
  });

  it('renders the reference s three buttons and its title, and no default OK beside them', () => {
    /*
      `buttons:{cancel:{label:"Cancel",className:"btn-danger"}, noclose:{label:"Choose time?",
      className:"btn-success"}, ok:{label:"Play now",className:"btn-primary"}}`. Passing `footer`
      REPLACES the default OK, which is what makes the reference's set the dialog's only control —
      the same property `dta-02` records for the alert-pane lightbox.
    */
    const dom = openPlayDialog();
    expect(dom.querySelector('.modal-title')?.textContent).toBe('Video');
    const labels = [...dom.querySelectorAll('.modal-footer button')].map((button) =>
      button.textContent?.trim()
    );
    expect(labels).toEqual(['Cancel', 'Choose time?', 'Play now']);
    expect(dom.querySelector('.modal-footer .bootbox-accept')).toBeNull();
  });

  it('and Choose time? swaps it for the datetime dialog, which also has a backdrop', () => {
    const dom = openPlayDialog();
    [...dom.querySelectorAll<HTMLElement>('.modal-footer button')]
      .find((button) => button.textContent?.trim() === 'Choose time?')
      ?.click();
    flushSync();
    expect(dom.querySelector('.modal-title')?.textContent).toBe('Choose time:');
    expect(dom.querySelector('#video-start-datetime')).not.toBeNull();
    expect(dom.querySelector('.modal-backdrop')).not.toBeNull();
    expect(
      [...dom.querySelectorAll('.modal-footer button')].map((b) => b.textContent?.trim())
    ).toEqual(['Cancel', 'Send']);
  });

  it('leaves no hand-rolled bootbox markup behind', () => {
    /*
      The negative half, and it is read off CODE with the comments stripped — the comment above the
      dialogs quotes `bootbox.dialog` and would otherwise vote on its own absence. That is the
      failure `#lib/source-comments.ts` exists for.
    */
    expect(VIDEO_PLAYER).not.toContain('class="bootbox modal fade show"');
  });
});

describe('VID-02, VID-03 and VID-04 — the pending-video header, by const value', () => {
  const pending = () =>
    videoPlayer({ videoURL: 'https://a/b.mp4', videoPlayTime: '2026-09-01T09:30' });

  it('indents both blocks at `m-4`, which is const 141 and not the list s `m-2`', () => {
    /* 141 `[1,"m-4"]` at byte 2,003,492; 146 `[1,"m-2"]` at 2,003,720 belongs to "No videos." */
    const blocks = [...pending().querySelectorAll('div.m-4')].map((div) =>
      div.textContent?.replace(/\s+/g, ' ').trim()
    );
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain('Video URL:');
    expect(blocks[1]).toContain('Video scheduled for:');
  });

  it('gives the url `mx-2`, which is const 142 and the same const the date span already had', () => {
    const strong = pending().querySelector('strong');
    expect(strong?.textContent).toBe('https://a/b.mp4');
    expect(strong?.className).toBe('mx-2');
  });

  it('puts the IMPORTANT paragraph OUTSIDE the block, where `u()()` puts it', () => {
    /*
      `d(0,"div",141) … u()(), d(4,"p")` at byte 1,930,621 — two closes before the paragraph opens.
      Nesting is what differs, so nesting is what is measured: `closest` rather than a text search.
    */
    const paragraph = [...pending().querySelectorAll('p')].find((p) =>
      p.textContent?.includes('IMPORTANT')
    );
    expect(paragraph, 'the IMPORTANT paragraph is missing').not.toBeUndefined();
    expect(paragraph?.closest('div.m-4')).toBeNull();
  });
});

describe('VID-05 — the scheduled time is `date:medium`, from the room s shared formatter', () => {
  it('renders the reference s en-US medium format', () => {
    /*
      `Ct(5,2,e.scheduledVideo.videoPlayTime,"medium")` at byte 1,930,918. The bundle never calls
      `registerLocaleData` — its only occurrence, byte 147,099, is inside Angular's own error string
      — so the pipe resolves against the default `en-US` for every viewer. `mediumDate` pins that;
      the inline formatter this replaced passed `undefined` and moved with the viewer's locale.

      **THIS ASSERTION DOES NOT PIN THE LOCALE, and its control proved that.** Restoring the
      `undefined`-locale formatter left it GREEN — on a box whose default locale IS `en-US`, both
      spellings render the same string, so what looks like a format assertion is a format assertion
      and nothing more. The locale is pinned by the next test, which went red on the same mutation.
      Recorded rather than repaired by setting a locale in the test environment: this file runs where
      CI runs it, and a green here plus a red there is the honest division of what each measures.
    */
    const dom = videoPlayer({ videoURL: '', videoPlayTime: '2026-09-01T09:30' });
    expect(dom.textContent).toContain('Sep 1, 2026');
    expect(dom.textContent).toContain('9:30:00');
  });

  it('builds no formatter of its own', () => {
    /* One locale-data lookup per render is what `#lib/message-formatters.ts` exists to stop. */
    expect(VIDEO_PLAYER).not.toContain('Intl.DateTimeFormat');
  });
});

describe('AVD-01 — Refresh empties the lists before it enumerates', () => {
  it('assigns both lists unconditionally rather than only when non-empty', () => {
    /*
      `this.audioDevicesList=[],this.videoDevicesList=[]` is the FIRST statement of the reference's
      `loadDevices`, byte 2,162,037. This is the source assertion the row needs and it is the honest
      one available: every path into `loadDevices` goes through `navigator.mediaDevices`, which jsdom
      does not implement — the reason `av-device-pane-contract.test.ts` already gives for reading
      this pane's markup instead of driving it.
    */
    const code = AV_DEVICE_PANE;
    expect(code).toContain('audioDevices = [];');
    expect(code).toContain('videoDevices = [];');
    /* The shape that hid the defect: a guarded assignment that keeps the previous list. */
    expect(code).not.toMatch(/if\s*\(nextAudio\.length\)\s*\{?\s*audioDevices\s*=/);
    expect(code).not.toMatch(/if\s*\(nextVideo\.length\)\s*\{?\s*videoDevices\s*=/);
  });
});

describe('AVD-02 — a fallback choice reaches the saved preference', () => {
  /*
    `s || (globals.audioDeviceID = …, localstorage.set("audioDeviceID", …))` at byte 2,163,287. The
    select's `onchange` was the only writer here, and a fallback is not a change event — so the
    "Selected:" line named one microphone while `capture.audioDeviceId`, which
    `audioCaptureConstraints` builds `deviceId:{exact}` from, still named the one that had gone.

    DRIVEN rather than read: `chooseDevice` is reached by stubbing `navigator.mediaDevices` for the
    one call that matters. That is a stub, and the thing being asserted is OUR wiring — which call
    the component makes with which arguments — not the browser's behaviour.
  */
  const withStubbedDevices = async (devices: MediaDeviceInfo[]) => {
    const onPreferenceChange = vi.fn();
    const stream = { getTracks: () => [] } as unknown as MediaStream;
    vi.stubGlobal('navigator', {
      mediaDevices: {
        enumerateDevices: () => Promise.resolve(devices),
        getUserMedia: () => Promise.resolve(stream)
      }
    });
    const { default: AvDevicePane } = await import('./components/AvDevicePane.svelte');
    const node = target();
    const dom = track(
      node,
      mount(AvDevicePane, {
        target: node,
        props: {
          capture: {
            audioDeviceId: 'gone-mic',
            videoDeviceId: 'cam-1',
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          },
          onPreferenceChange
        }
      })
    );
    dom.querySelector<HTMLElement>('button[title="Refresh device list"]')?.click();
    await vi.waitFor(() => expect(dom.querySelector('#audio-deviceList')).not.toBeNull());
    return { dom, onPreferenceChange };
  };

  afterEach(() => vi.unstubAllGlobals());

  it('saves the device it fell back to, and does NOT re-save the one that was already saved', () => {
    const devices = [
      { kind: 'audioinput', deviceId: 'mic-1', label: 'Headset' },
      { kind: 'videoinput', deviceId: 'cam-1', label: 'FaceTime HD' }
    ] as MediaDeviceInfo[];
    return withStubbedDevices(devices).then(({ onPreferenceChange }) => {
      expect(onPreferenceChange).toHaveBeenCalledWith('audioDeviceID', 'mic-1');
      /* `cam-1` WAS in the list, so the reference's `s ||` suppresses that write entirely. */
      expect(onPreferenceChange).not.toHaveBeenCalledWith('videoDeviceID', 'cam-1');
      expect(onPreferenceChange).toHaveBeenCalledTimes(1);
    });
  });
});

describe('SCH-03, SCH-04 and SCH-05 — the manage table row', () => {
  const rows = [
    {
      id: 1,
      senderName: 'Ada',
      body: 'AAPL long',
      repeat: '' as const,
      ignoreWeekends: false,
      sendOn: 1_788_000_000_000
    },
    {
      id: 2,
      senderName: 'Grace',
      body: 'MSFT',
      repeat: 'daily' as const,
      ignoreWeekends: true,
      sendOn: 1_788_100_000_000
    },
    {
      id: 3,
      senderName: 'Alan',
      body: 'TSLA',
      repeat: 'weekly' as const,
      ignoreWeekends: true,
      sendOn: 1_788_200_000_000
    }
  ];
  const table = (
    onremove: (row: { id: number; senderName: string; body: string }) => void = () => {}
  ) => {
    const node = target();
    return track(node, mount(ScheduledAlertsTable, { target: node, props: { rows, onremove } }));
  };

  it('SCH-03 — names all five columns, with the reference s own words', () => {
    /* Byte 2,408,380: `Date / Time`, `Sender`, `Alert`, `Repeat`, `Actions`. */
    const headers = [...table().querySelectorAll('thead th')].map((th) => th.textContent);
    expect(headers).toEqual(['Date / Time', 'Sender', 'Alert', 'Repeat', 'Actions']);
  });

  it('SCH-03 — scopes both axes, and makes the time cell the row s header', () => {
    /* 8 `["scope","col"]`, 12 `["scope","row",1,"alert-date-time-th"]`. */
    const dom = table();
    /*
      The first of these was written as a comma expression with no matcher on it, which asserts
      NOTHING — caught by `@typescript-eslint/no-unused-expressions` in the gate rather than by
      review, and worth the note: an `expect(...)` with no `.toBe` reads exactly like an assertion.
    */
    expect([...dom.querySelectorAll('thead th')].map((th) => th.getAttribute('scope'))).toEqual([
      'col',
      'col',
      'col',
      'col',
      'col'
    ]);
    expect(dom.querySelectorAll('tbody th[scope="row"].alert-date-time-th')).toHaveLength(3);
    expect(dom.querySelectorAll('tbody tr:first-child td')).toHaveLength(4);
  });

  it('SCH-04 — colours the repeat pill by mode, and red is the one that does NOT repeat', () => {
    /*
      `mMe = (t,n,e) => ({"text-bg-danger":t,"text-bg-info":n,"text-bg-warning":e})` at byte
      2,406,323, called positionally with `""===repeat||!repeat`, `"daily"===repeat`,
      `"weekly"===repeat`. `alert-scheduler-filter-labels.md` recorded these as NOT READ — "do not
      guess them" — and red on "off" is the one nobody would have guessed.

      Class MEMBERSHIP, not the whole attribute string: a `class` pinned whole fails the next time a
      utility is added and the repair is to paste the new string in, which turns a contract into a
      transcript.
    */
    const pills = [...table().querySelectorAll('tbody tr')].map((tr) =>
      tr.querySelectorAll('td')[2].querySelector('span.badge')!
    );
    expect(pills.map((pill) => pill.textContent?.trim())).toEqual(['off', 'daily', 'weekly']);
    expect([...pills[0].classList]).toContain('text-bg-danger');
    expect([...pills[1].classList]).toContain('text-bg-info');
    expect([...pills[2].classList]).toContain('text-bg-warning');
    for (const pill of pills) expect([...pill.classList]).toContain('rounded-pill');
  });

  it('SCH-04 — the "no weekends" badge is secondary, and daily-only', () => {
    /*
      14 `[1,"badge","rounded-pill","text-bg-secondary","ms-1"]`, gated on
      `"daily"===e.repeat&&e.ignoreWeekends`. Row 3 is weekly WITH the flag set, which is the case
      that separates "reads the flag" from "reads the rule".
    */
    const dom = table();
    const badges = [...dom.querySelectorAll('span.text-bg-secondary')];
    expect(badges).toHaveLength(1);
    expect(badges[0].textContent).toBe('no weekends');
    expect(badges[0].closest('tr')?.textContent).toContain('MSFT');
  });

  it('SCH-05 — Remove carries the trash icon, the danger outline and the capture s spaces', () => {
    const button = table().querySelector('tbody button')!;
    expect([...button.classList]).toEqual(
      expect.arrayContaining(['btn', 'btn-outline-danger', 'btn-sm', 'remove-scheduled-alert-btn'])
    );
    expect(button.querySelector('i.fas.fa-trash')).not.toBeNull();
    /* `v(15," Remove ")` — the surrounding spaces are evidence, per `AGENTS.md`. */
    expect(button.textContent).toContain(' Remove ');
  });

  it('hands the WHOLE row back, because the question quotes the sender and the text', () => {
    const onremove = vi.fn();
    const dom = table(onremove);
    dom.querySelectorAll<HTMLElement>('tbody button')[1].click();
    expect(onremove).toHaveBeenCalledWith(expect.objectContaining({ id: 2, senderName: 'Grace' }));
  });
});

describe('SCH-01 — Remove asks, and it quotes the alert it is about to destroy', () => {
  it('builds the capture s sentence, punctuation and all', () => {
    /*
      `"Are you sure you want to delete this alert by " + e.alert.n + ". text: " + e.alert.txt` at
      byte 2,407,145. `alert-scheduler-filter-labels.md` records the punctuation as the thing to
      reproduce: a full stop and a space before `text:`, and NO closing question mark — which is what
      a well-meaning edit adds.
    */
    expect(removeScheduledAlertQuestion('Grace', 'MSFT long 410')).toBe(
      'Are you sure you want to delete this alert by Grace. text: MSFT long 410'
    );
    expect(removeScheduledAlertQuestion('Grace', 'MSFT')).not.toContain('?');
  });

  it('is what the pane asks BEFORE it removes anything', () => {
    /*
      Read off `ScheduledAlerts.svelte`'s code with comments stripped, because the pane imports remote
      functions that a unit test cannot resolve. Both halves are asserted separately: the question
      reaches the room's own `onconfirm`, and the delete is inside that callback rather than beside
      it. `remove(` on the click was the whole defect — a misclick destroyed an unsent alert with no
      undo and no record of what it said.
    */
    expect(SCHEDULED_ALERTS).toContain(
      'onconfirm(removeScheduledAlertQuestion(row.senderName, row.body)'
    );
    expect(SCHEDULED_ALERTS).toContain('onremove={requestRemove}');
    expect(SCHEDULED_ALERTS, 'the table must not be handed the raw remover').not.toContain(
      'onremove={remove}'
    );
  });
});

describe('SCH-02 — the repeat pill colours, which were recorded as NOT READ', () => {
  it('maps each mode to the class the bundle names, and covers every mode', () => {
    /*
      `mMe = (t,n,e) => ({"text-bg-danger":t,"text-bg-info":n,"text-bg-warning":e})`, byte 2,406,323,
      called with `""===repeat||!repeat`, `"daily"===repeat`, `"weekly"===repeat` in that order.
      `Record<RepeatMode, string>` is what makes the third assertion below true by TYPE as well.
    */
    expect(REPEAT_BADGE_CLASS).toEqual({
      '': 'text-bg-danger',
      daily: 'text-bg-info',
      weekly: 'text-bg-warning'
    });
  });
});
