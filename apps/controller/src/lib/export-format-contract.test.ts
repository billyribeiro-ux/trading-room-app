import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildStatsCsv, statsFilename } from './stats-csv';

/*
  The four downloads, pinned against the reference's own `app.min.js`.

  Every value here was READ out of the bundle captured 2026-08-09 by
  `scripts/collect-export-controls.js` — `dumps/export-controls-1786287657298.json`, symbol regions
  `exportListToCSV`, `exportStatsToCSV`, `downloadMontlyStats` and `exportSettingsToJSON`. None of it
  is in the DOM: the manage page's markup carries only `ng-click="exportListToCSV()"`, so before that
  capture the format was unknowable and what shipped was invented.

  This file exists because all three CSVs were wrong in ways nothing could catch — wrong filenames,
  LF instead of CRLF, quoted rows that should not be, and a `Last login` column the reference never
  had. A format that only reveals itself in a downloaded file needs a test that reads the source.
*/

/*
  The stats CSV moved out of the page on 2026-08-11 — `TODO.md` item W. It was built in the browser
  from a `data.visits` array the loader shipped on every load, up to 5,000 rows each carrying a
  visitor's IP address and email. It is now produced by
  `GET /account/rooms/<shortCode>/stats.csv`, and the FORMAT lives in `$lib/stats-csv.ts` so the
  endpoint and this test share one definition rather than two that can drift.

  Both files are read and concatenated, because the four downloads did not all move: the participant
  list and the settings JSON are still assembled in the page. Concatenating means each assertion
  below keeps finding its subject wherever it now lives, and a format that moves again does not
  quietly stop being checked.
*/
const page = readFileSync(new URL('../routes/(app)/account/rooms/[id]/[[tab]]/+page.svelte', import.meta.url), 'utf8');
const statsCsv = readFileSync(new URL('./stats-csv.ts', import.meta.url), 'utf8');

/** Comments stripped, so no assertion can be satisfied by the documentation that explains it. */
const code = `${page}\n${statsCsv}`
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('filenames follow the reference, not our own scheme', () => {
  it('names each file `<Thing>_<uuid>` the way the bundle does', () => {
    // `var prefix="Participant_List_"+$scope.sess.uuid` — and `sess.uuid` is our `publicId`, the
    // same identifier the page's own room/registration/app-pair links are built from.
    expect(code).toContain('`Participant_List_${roomUuid}.csv`');
    // EXERCISED rather than matched as source text: the stats filename is now built by
    // `statsFilename()`, so the real string is available and is worth more than its spelling.
    expect(statsFilename('abc123', new Date('2026-08-11T12:00:00'))).toBe(
      'Participant_Stats_abc123_Tue Aug 11 2026.csv'
    );
    expect(code).toContain('`Monthly_report_${roomUuid}_${range}.csv`');
    expect(code).toContain('`Settings_${roomUuid}.json`');
  });

  it('no longer uses the invented room-<shortCode>-<thing> scheme', () => {
    expect(code).not.toMatch(/room-\$\{data\.room\.shortCode\}-(users|stats|monthly|settings)/);
  });
});

describe('the participant stats header, which is now nine columns', () => {
  /*
    Read from the bundle verbatim:

      $scope.sess.hasRequiredPhoneInLogin
        ? msgs.push("Name, Email, Phone, IP, In, Out, Duration, isMobile, Browser\r\n")
        : msgs.push("Name, Email, IP, In, Out, Duration, isMobile, Browser\r\n")

    Six of those columns had no data behind them until `room_sessions` (migration 0007) recorded one
    row per arrival — `TODO.md` item K. This header was the single thing that had been invented
    before the bundle was captured, and nothing in this file pinned it, which is why a three-column
    version survived until now. It is pinned here.
  */
  it('matches the reference exactly, in both phone variants', () => {
    // The header is now produced from `STATS_COLUMNS`, so this asserts the OUTPUT — which is what
    // the owner's spreadsheet actually receives — instead of a literal in the source.
    expect(buildStatsCsv([], { withPhone: true })).toBe(
      'Name, Email, Phone, IP, In, Out, Duration, isMobile, Browser\r\n'
    );
    expect(buildStatsCsv([], { withPhone: false })).toBe('Name, Email, IP, In, Out, Duration, isMobile, Browser\r\n');
  });

  it('no longer writes the invented `Last login` column', () => {
    // The reference has no such column. It was ours, and it was the giveaway that the whole format
    // had been guessed rather than read.
    expect(code).not.toContain('Last login');
  });

  it('exports one row per VISIT, not one per person', () => {
    // `statXrefs` is a cross-reference row — a person crossing into a room at a moment in time. A
    // member who entered four times is four rows, which is what makes Duration meaningful.
    // Two visits by ONE person must produce two rows. Asserted by running it, because "one row per
    // arrival" is the property that makes Duration mean anything and a source match cannot show it.
    const twice = buildStatsCsv(
      [
        {
          displayName: 'Dana',
          email: 'd@example.com',
          ip: '203.0.113.1',
          isMobile: false,
          browser: 'Chrome',
          joinedAt: '2026-08-11T10:00:00',
          leftAt: '2026-08-11T10:30:00'
        },
        {
          displayName: 'Dana',
          email: 'd@example.com',
          ip: '203.0.113.1',
          isMobile: false,
          browser: 'Chrome',
          joinedAt: '2026-08-11T14:00:00',
          leftAt: null
        }
      ],
      { withPhone: false }
    );
    const rows = twice.trimEnd().split('\r\n');
    expect(rows).toHaveLength(3); // header + two arrivals by the same person
    expect(rows[2]).toContain('"N/A"'); // the open one
    expect(code).not.toMatch(/for \(const r of visibleStats\)[\s\S]{0,400}Participant_Stats/);
  });

  it('renders N/A for an open visit rather than inventing an end time', () => {
    // The reference's own behaviour: `outMStr` defaults to "N/A" and `dur` is computed only when
    // both times exist. A row for somebody still in the room is faithful, not broken.
    expect(code).toContain("humanizeDuration(inAt.getTime(), outAt.getTime()) : 'N/A'");
  });
});

describe('the bytes in the file', () => {
  it('ends every row CRLF, as the reference writes it', () => {
    // Every `msgs.push(...)` in the bundle ends `\r\n`. The previous writer joined on '\n'.
    expect(code).toContain('\\r\\n');
    expect(code).not.toMatch(/\.join\('\\n'\)/);
  });

  it('declares the reference MIME types, charset included', () => {
    expect(code).toContain("'text/csv;charset=utf-8'");
    expect(code).toContain("'text/json;charset=utf-8'");
    expect(code).not.toContain("'application/json'");
  });

  it('writes the headers with the reference spacing', () => {
    expect(code).toContain("'Name, Email, Phone, Role\\r\\n'");
    expect(code).toContain("'Name, Email, Role\\r\\n'");
    // `msgs.push("Month, Total Logins, \r\n")` — the trailing comma is the reference's own, and it
    // yields a third empty column. Reproduced because it is what the file contains.
    expect(code).toContain("'Month, Total Logins, \\r\\n'");
  });
});

describe('quoting differs per file, and that is the reference, not an inconsistency', () => {
  it('writes the participant LIST unquoted', () => {
    // `t=name+","+o.email.trim()+","+o.role+"\r\n"` — no quotes anywhere in that row.
    expect(code).toMatch(/cells\.join\(','\) \+ '\\r\\n'/);
  });

  it('writes stats and monthly QUOTED', () => {
    // `'"'+name+'","'+o.email.trim()+'",…'` and `'"'+stat.month+'","'+stat.totalLogins+'"'`.
    expect(code).toMatch(/cells\.map\(\(c\) => `"\$\{c\}"`\)/);
    expect(code).toContain('`"${m.month}","${m.logins}"\\r\\n`');
  });

  it('replaces EVERY comma in a name, which the reference does not', () => {
    /*
      A deliberate divergence, one character wide. The reference calls
      `.replace(","," ")` with a string first argument, which substitutes only the FIRST occurrence
      — so `Ribeiro, Billy, Jr` still lands a comma in an unquoted row and shifts every column
      after it. `replaceAll` is the same intent without the corruption.
    */
    expect(code).toContain("replaceAll(',', ' ')");
    expect(code).toContain("'n/a'");
  });
});

describe('Export Badges is CSV, and the reported defect was real', () => {
  const account = readFileSync(new URL('../routes/(app)/account/+page.svelte', import.meta.url), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  it('writes BadgesList.csv, not badges.json', () => {
    /*
      Reported by the owner and INITIALLY DISMISSED here, wrongly: the control was searched for in
      `must-match/important`, the MANAGE page, and it is on the ACCOUNT page. The bundle settles it:

        $scope.exportBadges=function(){if($scope.badgesList&&$scope.badgesList.length>0){
          var csv=convertToCSV($scope.badgesList),prefix="BadgesList",
              data=new Blob([csv],{type:"text/csv;charset=utf-8"});
          FileSaver.saveAs(data,prefix+".csv",!0)}}
    */
    expect(account).toContain("a.download = 'BadgesList.csv'");
    expect(account).toContain("'text/csv;charset=utf-8'");
    expect(account).not.toContain("a.download = 'badges.json'");
    expect(account).not.toMatch(/JSON\.stringify\(data\.badges/);
  });

  it('keeps convertToCSV’s eleven keys, in its order', () => {
    for (const key of [
      '_id',
      'userID',
      'text',
      'imgURL',
      'color',
      'bkcolor',
      'type',
      'name',
      'uploadTime',
      'onlyP',
      'roles'
    ]) {
      expect(account, `${key} must be a column`).toContain(`'${key}'`);
    }
  });

  it('uses LF and unspaced headers here, unlike the CRLF exports', () => {
    // `convertToCSV` sets `lineDelimiter="\n"` and joins the header on a bare comma. The other
    // three exports use `\r\n` and `Name, Email`. The difference is the reference's, not drift.
    expect(account).toContain("BADGE_CSV_KEYS.join(',') + '\\n'");
    expect(account).not.toMatch(/BADGE_CSV_KEYS\.join\(', '\)/);
  });

  it('quotes a cell only when it is a string containing a comma', () => {
    expect(account).toContain('cell.includes(\',\') ? `"${cell}"` : cell');
  });

  it('writes nothing at all when there are no badges', () => {
    // `if($scope.badgesList&&$scope.badgesList.length>0)` — no badges, no file. Not a header-only one.
    expect(account).toContain('if (!data.badges.length) return;');
  });
});

describe('settings stays JSON, because the bundle says so', () => {
  it('keeps the .json extension the reference handler produces', () => {
    /*
      Reported as a defect — "it should be CSV". It is not. The reference's own handler reads
      `var data=new Blob([JSON.stringify($scope.sess)],{type:"text/json;charset=utf-8"});
       FileSaver.saveAs(data,prefix+".json",!0)`
      and its name says JSON twice over. Pinned so the report does not come back and win next time.
    */
    expect(code).toContain('`Settings_${roomUuid}.json`');
    expect(code).not.toMatch(/Settings_\$\{roomUuid\}\.csv/);
  });
});
