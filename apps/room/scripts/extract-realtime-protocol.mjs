#!/usr/bin/env node
/*
  Extract the captured app's REALTIME protocol from the shipped bundle.

  The room's realtime surface is not the media SFU. It is a second, pub/sub socket carrying every
  alert, chat message, roster change and admin command - and none of it was reproduced here, which
  is why an alert a presenter posts never reaches a member without a reload.

  Run:  node scripts/extract-realtime-protocol.mjs [--json]
  Writes: docs/generated/realtime-protocol.json  (and prints a summary)

  Everything below is read out of `docs/source/main.d6d3c112b59b7d0d.js`. Nothing is inferred from
  the DOM: a channel a given session never subscribed to is still in the bundle.
*/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const BUNDLE = resolve(root, 'docs/source/main.d6d3c112b59b7d0d.js');
const OUT = resolve(root, 'docs/generated/realtime-protocol.json');

const bundle = readFileSync(BUNDLE, 'utf8');

/** Unique matches of a global regex, in first-seen order. */
function distinct(re, group = 1) {
  const seen = new Set();
  const out = [];
  let m;
  const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = rx.exec(bundle))) {
    const value = m[group];
    if (value && !seen.has(value)) {
      seen.add(value);
      out.push({ value, at: m.index });
    }
  }
  return out;
}

/*
  The subscribe call is the whole tell:

    let f = `/sess/${e.sessionID}/alerts/`,
        _ = e.socket.subscribe(f, { waitForAuth: !0, priority: 400 });

  `socket.subscribe(channel, {waitForAuth, priority})` returning an async-iterable channel is
  SocketCluster's client API - `waitForAuth` and `priority` are its option names, and the
  `for await … finally { channel.return() }` shape around every consumer is how SC channels are
  drained.
*/
const channels = distinct(/`(\/sess\/\$\{[^`]*)`/).map((c) => ({
  template: '`' + c.value + '`',
  at: c.at
}));

const subscribeOptions = distinct(/subscribe\([a-zA-Z_$]+,\{([^}]*)\}\)/).map((o) => o.value);

/** Everything the client SENDS: `sendServerCommand("x", …)` and `socketService.send("x", …)`. */
const sent = [
  ...distinct(/sendServerCommand\("([a-zA-Z0-9_]+)"/),
  ...distinct(/socketService\.send\("([a-zA-Z0-9_]+)"/),
  ...distinct(/\.send\("([a-zA-Z0-9_]+)",\{/)
];

/** Everything the client RECEIVES on the command channel: the big `case"x":` dispatcher. */
function dispatcherCases() {
  const anchor = bundle.indexOf('case"startTalking"');
  if (anchor < 0) return [];
  const window = bundle.slice(Math.max(0, anchor - 20000), anchor + 20000);
  const seen = new Set();
  const out = [];
  for (const m of window.matchAll(/case"([a-zA-Z][a-zA-Z0-9_]*)":/g)) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      out.push(m[1]);
    }
  }
  return out;
}

/** The event-bus names the room re-emits after a channel message lands. */
const busEvents = distinct(/appEventBus\.emit\("([a-zA-Z0-9_]+)"/);

const report = {
  source: 'docs/source/main.d6d3c112b59b7d0d.js',
  bundleBytes: bundle.length,
  transport: {
    library: 'SocketCluster (socket.subscribe(channel, {waitForAuth, priority}))',
    evidence: subscribeOptions.slice(0, 4),
    note: 'Async-iterable channels; every consumer is a `for await` with a `finally { channel.return() }`.'
  },
  channels: channels.map((c) => c.template),
  clientSends: [...new Set(sent.map((s) => s.value))].sort(),
  commandChannelCases: dispatcherCases().sort(),
  busEvents: busEvents.map((b) => b.value).sort()
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`# realtime protocol, from ${report.source}\n`);
  console.log(`transport : ${report.transport.library}`);
  console.log(`  options seen: ${report.transport.evidence.join(' | ')}\n`);
  console.log(`channels (${report.channels.length}):`);
  for (const c of report.channels) console.log('  ' + c);
  console.log(`\nclient sends (${report.clientSends.length}):`);
  console.log('  ' + report.clientSends.join(', '));
  console.log(`\ncommand-channel cases (${report.commandChannelCases.length}):`);
  console.log('  ' + report.commandChannelCases.join(', '));
  console.log(`\nwritten -> ${OUT.replace(root + '/', '')}`);
}
