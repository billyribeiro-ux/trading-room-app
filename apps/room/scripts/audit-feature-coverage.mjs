/**
 * What the reference has, and what we built. The gap is the report.
 *
 * ## Why this exists
 *
 * On 2026-08-15 it was found that **Swing Alerts and Day Trade Alerts — two entire presentation-area
 * tabs — were present in the captured bundle from day one and had never been built.** Not a version
 * problem: `presAreaTabs-swingAlerts` occurs 3 times in v3, 3 times in our 2026-07-30 capture, and 3
 * times in the current v4. They were simply never noticed.
 *
 * The reason nothing caught it is that no process ever ENUMERATED the reference's features. Work was
 * driven by what somebody happened to ask about, what a screenshot showed, or what a lint pass threw
 * up — all reactive. `TODO.md` records a gap well once found, but nothing was looking for gaps not
 * yet found.
 *
 * This asks the bundle the question nobody asked for two weeks: **how many tabs do you have?**
 *
 * ## What it does NOT do
 *
 * It does not judge whether a feature is correctly built — `docs/decoded/*.md` and the contract tests
 * do that. It answers one cheaper question: is there anything in the reference that has no trace in
 * our source at all? That is the failure mode this repository actually had.
 *
 * A MISSING row is a fact. A PRESENT row means only that the identifier appears somewhere in
 * `src/` — it is a floor, not a pass.
 *
 * ## Counting
 *
 * Occurrences are counted with `String.prototype.split().length - 1`, never with a line-based tool.
 * The bundle is a single 2.9 MB line, so `grep -c` returns 1 for "present" and 0 for "absent" and
 * silently destroys every real count — that exact mistake was made here on 2026-08-15 and nearly
 * caused a correct agent report to be dismissed as wrong.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BUNDLE = new URL('../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url);
const SRC = new URL('../src/', import.meta.url);

/** Every occurrence of `needle`, counted without any line-based tool. See the header. */
function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

/** Every distinct match of a global regex, in first-seen order. */
function distinct(text, pattern) {
  return [...new Set(text.match(pattern) ?? [])].sort();
}

/** Every file under `src/`, read once and concatenated — this is what "do we mention it" asks. */
function readOurSource(dir) {
  let combined = '';
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      combined += readOurSource(path);
    } else if (/\.(ts|js|svelte|css)$/.test(entry)) {
      combined += readFileSync(path, 'utf8');
    }
  }
  return combined;
}

const bundle = readFileSync(BUNDLE, 'utf8');
const ours = readOurSource(new URL(SRC).pathname);

/**
 * The expansions of the one send site whose command name is built at runtime. See the long comment
 * on the "Wire commands" inventory for why these cannot be derived by pattern.
 */
const TEMPLATE_BUILT_COMMANDS = ['getSwingAlertsLog', 'getDayTradeAlertsLog'];

/*
  A guard, not a formality. The list above is the one hand-maintained thing in this file, so it is
  the one thing that can silently rot. If upstream ever adds a second runtime-built send site — a
  third alert family, or any other `sendServerCommand(`…${…}…`)` — this throws instead of quietly
  under-reporting, which is the exact failure the list was added to fix.
*/
const templateSendSites = bundle.match(/sendServer(?:Admin)?Command\(`[^`]+`/g) ?? [];
if (templateSendSites.length !== 1) {
  throw new Error(
    `Expected exactly 1 template-literal send site (the one expanded by TEMPLATE_BUILT_COMMANDS), ` +
      `found ${templateSendSites.length}: ${templateSendSites.join(', ')}. ` +
      `Read each one and update TEMPLATE_BUILT_COMMANDS before trusting this report.`
  );
}

/*
  The three inventories. Each is read out of the bundle rather than listed here, so a feature added
  upstream appears in this report without anybody editing this file — which is the entire point.
*/
const inventories = [
  {
    title: 'Presentation-area tabs',
    /* The tab ids the room switches between. This is the inventory that would have caught Swing. */
    items: distinct(bundle, /presAreaTabs-[A-Za-z]+/g)
  },
  {
    title: 'Wire commands (client -> server)',
    /*
      Read from the send sites, NOT from `case` labels. The two differ and the difference matters:
      `swingAlertMsg` is sent while `newSwingAlertMsg` is the response, and building from the case
      label would produce a command the server rejects. Found 2026-08-15 by two agents independently.

      ## Why the template-literal branch below exists

      The quoted-literal pattern alone is INCOMPLETE, and the gap was invisible until 2026-08-15.
      Measured in the current v4 bundle: 86 send sites use a double-quoted name and exactly ONE
      builds its name at runtime —

          this.appService.sendServerCommand(`get${e}AlertsLog`, {...})   // byte 1,993,765

      where `e` is `"Swing"` or `"DayTrade"`. A regex over quoted strings can never see those two
      commands, so an inventory built from it under-reports the reference and reports full coverage
      while two real commands are missing.

      They are listed explicitly rather than resolved by pattern because `e` is a parameter, not a
      constant: nothing in the file can expand it. The two values were obtained by READING the
      enclosing method — the same line computes `"Swing" === e ? 30 * swingAlertMonths : 4 *
      dayTradeAlertMonths * 7`, which is what fixes the alternatives at exactly two. If a third
      alert family is ever added upstream, this list must be re-read; the count check below is what
      makes that failure loud instead of silent.
    */
    items: [
      ...distinct(bundle, /sendServer(?:Admin)?Command\("[a-zA-Z]+"/g).map((m) =>
        m.replace(/.*"([a-zA-Z]+)"/, '$1')
      ),
      ...TEMPLATE_BUILT_COMMANDS
    ].sort()
  },
  {
    title: 'Server commands handled (server -> client)',
    items: distinct(bundle, /case"[a-zA-Z]{4,}":/g).map((m) => m.slice(5, -2))
  }
];

let missingTotal = 0;
const report = [];

for (const { title, items } of inventories) {
  const rows = items.map((item) => ({
    item,
    inBundle: count(bundle, item),
    inOurs: count(ours, item)
  }));
  const missing = rows.filter((r) => r.inOurs === 0);
  missingTotal += missing.length;

  report.push(`\n=== ${title} — ${rows.length - missing.length}/${rows.length} present ===`);
  for (const r of rows) {
    const mark = r.inOurs === 0 ? 'MISSING ' : 'present ';
    report.push(`  ${mark} ${r.item.padEnd(34)} bundle:${String(r.inBundle).padStart(3)}  ours:${String(r.inOurs).padStart(4)}`);
  }
}

console.log(report.join('\n'));
console.log(`\n${missingTotal} identifier(s) appear in the reference and nowhere in src/.`);
console.log(
  'PRESENT is a floor, not a pass — it means the identifier is mentioned, not that the feature matches.'
);

/*
  Exit non-zero when something is missing, so this can become a gate later. It is NOT wired into
  `pnpm test` yet: the count is currently non-zero by design, because the missing features are known
  and tracked in NEW-TODO.md. Wiring it in before those are built would make the suite permanently
  red and train everyone to ignore it.
*/
process.exitCode = missingTotal > 0 ? 1 : 0;
