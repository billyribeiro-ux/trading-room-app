/**
 * The two pure halves of visit recording: what a user agent says, and how long a visit was.
 *
 * `recordVisit` and `closeVisit` need a database and belong to the `.db.test.ts` suites. Everything
 * here is the part that decides what a customer reads in their stats export.
 */
import { describe, expect, it } from 'vitest';
import { parseUserAgent } from './room-visits';
import { humanizeDuration } from '../humanize-duration';

describe('parseUserAgent', () => {
  /*
    THE test in this file.

    Edge and Opera both carry `Chrome` in their user agents, and Chrome carries `Safari`. Match them
    in the wrong order and every browser reports as Chrome — which looks right, because Chrome is
    the common case, and is wrong for everyone else. This is the ordering, pinned.
  */
  it('picks the most specific browser, not the first token it finds', () => {
    const cases: [string, string][] = [
      [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Edge'
      ],
      [
        'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
        'Opera'
      ],
      [
        'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
        'Samsung Internet'
      ],
      ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0', 'Firefox'],
      [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Chrome'
      ],
      [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        'Safari'
      ]
    ];
    for (const [ua, expected] of cases) {
      expect(parseUserAgent(ua).browser, ua.slice(0, 60)).toBe(expected);
    }
  });

  it('reports unknown rather than guessing', () => {
    for (const ua of ['', '   ', null, undefined, 'curl/8.4.0', 'PostmanRuntime/7.36.0']) {
      expect(parseUserAgent(ua).browser).toBe('unknown');
    }
  });

  it('detects phones', () => {
    const iphone =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';
    const android =
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
    expect(parseUserAgent(iphone).isMobile).toBe(true);
    expect(parseUserAgent(android).isMobile).toBe(true);
  });

  /*
    Tablets, and the one non-obvious case: an Android TABLET omits the `Mobile` token that an
    Android phone carries. A naive /Mobile/ test reports every Android tablet as a desktop, and this
    product is explicitly built for tablets as well as phones.
  */
  it('detects tablets, including Android tablets that omit the Mobile token', () => {
    const ipad =
      'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/604.1';
    const androidTablet =
      'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    expect(parseUserAgent(ipad).isMobile).toBe(true);
    expect(parseUserAgent(androidTablet).isMobile, 'Android tablets omit "Mobile"').toBe(true);
  });

  it('does not call a desktop mobile', () => {
    const desktop =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    expect(parseUserAgent(desktop).isMobile).toBe(false);
  });
});

describe('humanizeDuration', () => {
  const at = (seconds: number) => 1_800_000_000_000 + seconds * 1000;

  /*
    These thresholds are moment's own `relativeTime` defaults, because the reference calls
    `moment(out).from(in, true)`. Matching them is what makes our file read the same as theirs
    rather than merely similar — "a few seconds" and "an hour" are moment's exact wording.
  */
  it('matches the reference thresholds and wording', () => {
    expect(humanizeDuration(at(0), at(10))).toBe('a few seconds');
    expect(humanizeDuration(at(0), at(44))).toBe('a few seconds');
    expect(humanizeDuration(at(0), at(60))).toBe('a minute');
    expect(humanizeDuration(at(0), at(60 * 5))).toBe('5 minutes');
    expect(humanizeDuration(at(0), at(60 * 60))).toBe('an hour');
    expect(humanizeDuration(at(0), at(60 * 60 * 3))).toBe('3 hours');
    expect(humanizeDuration(at(0), at(60 * 60 * 24))).toBe('a day');
    expect(humanizeDuration(at(0), at(60 * 60 * 24 * 3))).toBe('3 days');
  });

  it('refuses to invent a duration for nonsense input', () => {
    // A close recorded before the join — clock skew, or a row edited by hand.
    expect(humanizeDuration(at(100), at(0))).toBe('N/A');
    expect(humanizeDuration(Number.NaN, at(0))).toBe('N/A');
  });
});
