import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildStatsCsv, csvName, statsFilename, statsWhen } from './stats-csv';

/**
 * The participant-stats export, after it moved off the page — `TODO.md` item W.
 *
 * Two reviews on 2026-08-11 flagged the same line for different reasons: the manage loader selected
 * up to 5,000 `room_sessions` rows and returned them as `visits`, so ~755 KB was serialised into
 * **every** page load, and every one of those rows carries a visitor's **IP address and email**.
 * Because the tab links are same-route anchors, clicking through six tabs refetched it six times.
 *
 * It is now `GET /account/rooms/<shortCode>/stats.csv`. This file pins the two properties that
 * matter: the format still matches the reference to the byte, and the personal data cannot reappear
 * in a page payload.
 */

const cwd = process.cwd();
const ENDPOINT = readFileSync(`${cwd}/src/routes/(app)/account/rooms/[id]/stats.csv/+server.ts`, 'utf8');
const LOADER = readFileSync(`${cwd}/src/routes/(app)/account/rooms/[id]/[[tab]]/+page.server.ts`, 'utf8');
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('visit rows reach the page ONLY on the Stats tab, and bounded', () => {
  /*
    ## This block used to assert the opposite, and the reversal is deliberate

    `visits` was removed from this payload on 2026-08-11 after two reviews: ~755 KB of rows on every
    load, each carrying a visitor's IP and email, on tabs that had nothing to do with either. These
    assertions pinned that removal.

    The owner ruled on 2026-08-13 that the rebuild matches the original, and the original's User
    Stats table renders an IP, an `ip-api.com` lookup link, a browser and a duration per ARRIVAL
    (`page.manageSession.html:739-754`). A table without them is not that table.

    So what is pinned now is the SHAPE the review earned, which survives the reversal intact:
    the rows load on ONE tab, they are BOUNDED, and the export still reads independently at request
    time. Five sixths of the original cost came from refetching on the other five tabs, and that is
    still gone.

    ## A hole this rewrite closes

    The old "the loader no longer returns visits" assertion matched `/^\s*visits\s*:/m`. It passed
    against a payload that returns `visits` — because the key is written in SHORTHAND, `visits,`, and
    the regex required a colon. It was the tab guard below that actually caught the change. A test
    keyed on one of two equivalent spellings is a test that fails open.
  */
  const code = strip(LOADER);

  it('selects room_sessions behind a tab guard, not on every load', () => {
    const at = code.indexOf('.from(roomSessions)');
    expect(at, 'the Stats tab needs the arrival rows').toBeGreaterThan(-1);
    /* The guard sits immediately above the query, in the same expression. */
    const before = code.slice(Math.max(0, at - 600), at);
    expect(before).toContain("tab === 'stats'");
  });

  it('bounds that query, because it sits behind a PAGE LOAD', () => {
    /* An unbounded SELECT that grows with usage is a slow-motion outage. Newest first, so the cap
       drops the oldest history rather than today's. */
    const at = code.indexOf('.from(roomSessions)');
    const after = code.slice(at, at + 400);
    expect(after).toContain('.limit(5000)');
    expect(after).toContain('desc(roomSessions.joinedAt)');
  });

  it('returns the rows under BOTH possible spellings of the key, so neither can hide it', () => {
    /* Whichever way it is written, it is in the payload and that is the fact worth stating. */
    const at = code.indexOf('return {');
    expect(at, 'the loader must still return a payload').toBeGreaterThan(-1);
    expect(code.slice(at)).toMatch(/^\s*visits\s*[,:]/m);
  });

  it('does NOT build the CSV from that capped array', () => {
    /* The export must never be a truncated copy of whatever the page happened to load. `stats.csv`
       reads at request time, uncapped, behind the same ownership gate. */
    expect(strip(ENDPOINT)).toContain('.from(roomSessions)');
    expect(strip(ENDPOINT)).not.toContain('.limit(5000)');
  });
});

describe('the endpoint is gated exactly as the page is', () => {
  const code = strip(ENDPOINT);

  it('requires a user and room ownership, before reading anything', () => {
    expect(code).toContain('requireUser(locals)');
    expect(code).toContain('requireOwnedRoom(locals, room)');
    // Ownership is checked before the visits query runs — a 403 must not be reachable only after
    // the rows have been read.
    expect(code.indexOf('requireOwnedRoom')).toBeLessThan(code.indexOf('.from(roomSessions)'));
  });

  it('refuses to be cached anywhere', () => {
    // The file is a list of who was in somebody's room and from what address.
    expect(code).toContain("'cache-control': 'private, no-store'");
  });

  it('sends it as a download, with the charset the reference declares', () => {
    expect(code).toContain("'content-type': 'text/csv;charset=utf-8'");
    expect(code).toContain('content-disposition');
    expect(code).toContain('attachment; filename=');
  });

  it('clamps a caller-supplied limit rather than trusting it', () => {
    // Without the clamp a caller chooses this process's memory ceiling.
    expect(code).toMatch(/Math\.min\(requested,\s*100_000\)/);
  });
});

describe('the format still matches the reference, byte for byte', () => {
  const visit = {
    displayName: 'Dana Reyes',
    email: '  Dana@Example.com ',
    ip: '203.0.113.7',
    isMobile: false,
    browser: 'Chrome',
    joinedAt: '2026-08-11T09:05:00',
    leftAt: '2026-08-11T10:35:00'
  };

  it('writes the nine columns, CRLF, every cell quoted', () => {
    const csv = buildStatsCsv([visit], { withPhone: false });
    const [header, row] = csv.split('\r\n');
    expect(header).toBe('Name, Email, IP, In, Out, Duration, isMobile, Browser');
    // Quoted — the reference quotes stats rows and leaves the participant LIST unquoted.
    expect(row.startsWith('"')).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv).not.toMatch(/[^\r]\n/);
  });

  it('trims the email and formats the times the way moment did', () => {
    const row = buildStatsCsv([visit], { withPhone: false }).split('\r\n')[1];
    expect(row).toContain('"Dana@Example.com"');
    expect(row).toContain('"08/11/2026 09:05 am"');
    expect(row).toContain('"08/11/2026 10:35 am"');
  });

  it('renders N/A for an open visit rather than inventing an end', () => {
    const row = buildStatsCsv([{ ...visit, leftAt: null }], { withPhone: false }).split('\r\n')[1];
    // Both Out AND Duration — the reference computes `dur` only when both times exist.
    expect(row.match(/"N\/A"/g) ?? []).toHaveLength(2);
    expect(statsWhen(null)).toBe('N/A');
  });

  it('replaces commas in a name rather than letting it split the row', () => {
    // A name with a comma would otherwise become two columns in the owner's spreadsheet.
    expect(csvName('Reyes, Dana')).toBe('Reyes  Dana');
    expect(csvName('   ')).toBe('n/a');
    expect(csvName(null)).toBe('n/a');
  });

  it('takes the phone from the membership, keyed case-insensitively', () => {
    /*
      A visit has no phone of its own — a guest satisfies the room's login without ever having a
      membership row — and the two are written by different paths, so a capitalised address must
      still match.
    */
    const csv = buildStatsCsv([visit], {
      withPhone: true,
      phoneByEmail: new Map([['dana@example.com', '+1 555 0100']])
    });
    expect(csv.split('\r\n')[0]).toBe('Name, Email, Phone, IP, In, Out, Duration, isMobile, Browser');
    expect(csv.split('\r\n')[1]).toContain('"+1 555 0100"');
  });

  it('leaves the phone cell empty for a visitor with no membership', () => {
    const csv = buildStatsCsv([visit], { withPhone: true, phoneByEmail: new Map() });
    expect(csv.split('\r\n')[1]).toContain('"",');
  });

  it('names the file the way the bundle does', () => {
    expect(statsFilename('abc123', new Date('2026-08-11T12:00:00'))).toBe(
      'Participant_Stats_abc123_Tue Aug 11 2026.csv'
    );
  });
});
