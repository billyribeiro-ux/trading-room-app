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

describe('the addresses are gone from the page payload', () => {
  it('the loader no longer returns visits', () => {
    /*
      THE test for this whole change. `visits` was the only path by which an IP address reached the
      browser, and a `visits:` key reappearing in the returned object is the regression.
    */
    const code = strip(LOADER);
    const at = code.indexOf('return {');
    expect(at, 'the loader must still return a payload').toBeGreaterThan(-1);
    expect(code.slice(at)).not.toMatch(/^\s*visits\s*:/m);
  });

  it('the loader does not select roomSessions at all any more', () => {
    const code = strip(LOADER);
    // `stats` is computed from members, not visits; nothing on this page needs the session table.
    expect(code).not.toContain('.from(roomSessions)');
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
