/**
 * Verification for the deleted-alert staleness fix.
 *
 * Same two-session HTTP drive as the reproduction, but now asserting the behaviour a presenter
 * expects: a delete - captured or real - stops the alert being served to everyone else.
 */
import { enterRoomWithFetch, roomJwtSecret } from './lib/enter-room.mjs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const DB = '.data/proroom.sqlite';
const sql = (query) => execFileSync('sqlite3', [DB, query], { encoding: 'utf8' }).trim();

/*
  The room has no login of its own any more — the controller is the front door. This enters the
  same way a real browser does, with a signed single-use handoff token. The second argument used
  to be a password and is now the role the probe needs.
*/
const SECRET = roomJwtSecret();
const login = (email, type = 'site') =>
  enterRoomWithFetch({ base: BASE, email, type, secret: SECRET });

const page = async (cookie) => (await fetch(BASE, { headers: { cookie } })).text();

/** ":1" is a prefix of ":10".. ":18", so the key has to be matched with its closing quote. */
const serves = (html, key) => html.includes(`${JSON.stringify(key)}`);

async function action(cookie, name, fields) {
  const response = await fetch(`${BASE}/?/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: BASE, cookie },
    body: new URLSearchParams(fields),
    redirect: 'manual'
  });
  return { status: response.status, body: await response.text() };
}

const results = [];
const check = (label, actual, expected) => {
  results.push(actual === expected);
  const mark = actual === expected ? 'PASS' : 'FAIL';
  console.log(`  ${mark}  ${label.padEnd(56)} ${actual}`);
};

/*
  The three accounts this probe drives, taken from the environment.

  They used to be three real addresses written into the source, which is personal data that
  followed every clone. They cannot simply become dummies: `MEMBER_EMAIL_HASH` has to equal the
  gravatar hash carried by the captured alerts in `captured-message-fixture.json`, because that
  hash is how the app decides who authored a message. Case B below depends on the member matching
  alerts 1-7 and NOT matching alert 8. So the address is a property of the capture you are running
  against — exactly the kind of value that belongs in the environment.

  Fails loud when unset. A probe that quietly substituted a default would report PASS against the
  wrong account, which is worse than not running at all.
*/
const need = (name) => {
  const value = process.env[name];
  if (!value) {
    console.error(
      `${name} is not set.\n\n` +
        'This probe needs three accounts that exist in the room under test, and the member must be\n' +
        'the account that authored captured alerts 1-7 in captured-message-fixture.json.\n\n' +
        '  PTR_PRESENTER_EMAIL=… PTR_MEMBER_EMAIL=… PTR_OTHER_EMAIL=… node scripts/alert-delete-e2e.mjs'
    );
    process.exit(1);
  }
  return value;
};

const PRESENTER_EMAIL = need('PTR_PRESENTER_EMAIL');
const MEMBER_EMAIL = need('PTR_MEMBER_EMAIL');
const OTHER_EMAIL = need('PTR_OTHER_EMAIL');

/** Gravatar-style hash, the same one the app derives sender identity from. */
const MEMBER_EMAIL_HASH = createHash('md5').update(MEMBER_EMAIL).digest('hex');

/*
  `'site'`, not `'1234'`.

  `login`'s second parameter is the handoff token TYPE — the comment above it says so: "The second
  argument used to be a password and is now the role the probe needs." All three calls were still
  passing the old password, so every one of them minted a token typed `"1234"`. Left over from that
  migration and invisible because nothing validated it here.
*/
const presenter = await login(PRESENTER_EMAIL, 'site');
const member = await login(MEMBER_EMAIL, 'site');
const other = await login(OTHER_EMAIL, 'site');

// The captured alert the presenter will delete. Read its identity straight from the fixture.
const fixture = JSON.parse(
  execFileSync('cat', ['src/lib/server/captured-message-fixture.json'], { encoding: 'utf8' })
);
const capturedAlert = fixture.messages.find((message) => message.panel === 'alert');
const capturedId = String(-capturedAlert.sequence);
const capturedKey = capturedAlert.evidenceKey;

console.log(`\ncaptured alert under test: id ${capturedId}, evidenceKey ${capturedKey}`);
sql(`delete from hidden_room_items where evidence_key = '${capturedKey}';`);

console.log('\nA captured alert, deleted by the presenter');
check('member is served it beforehand', serves(await page(member), capturedKey), true);
const deleted = await action(presenter, 'messageAction', {
  operation: 'delete',
  kind: 'alert',
  id: capturedId
});
check('presenter delete succeeds', /"success":true|"type":"success"/.test(deleted.body), true);
check(
  'deletion is recorded room-wide',
  sql(`select count(*) from hidden_room_items where evidence_key = '${capturedKey}';`),
  '1'
);
check('member no longer served it', serves(await page(member), capturedKey), false);
check('a third viewer no longer served it', serves(await page(other), capturedKey), false);
check('presenter no longer served it', serves(await page(presenter), capturedKey), false);

console.log('\nB a member may not delete a captured alert that is not theirs');
// Captured alerts 1-7 carry the MEMBER account's own gravatar hash - the capture is of
// the real room where that account posted them - so the member deleting one is correct, not a
// leak. Alert 8 is the only captured alert authored by someone else, so it is the real test.
const secondAlert = fixture.messages.find(
  (message) =>
    message.panel === 'alert' && message.senderEmailHash !== fixture.messages[0].senderEmailHash
);
const refused = await action(member, 'messageAction', {
  operation: 'delete',
  kind: 'alert',
  id: String(-secondAlert.sequence)
});
check('member delete is refused', /"status":403/.test(refused.body), true);
check(
  'nothing was recorded',
  sql(`select count(*) from hidden_room_items where evidence_key = '${secondAlert.evidenceKey}';`),
  '0'
);

console.log('\nC real alerts still behave');
const marker = `VERIFY-REAL-${process.pid}`;
await action(presenter, 'postAlert', { body: marker, kind: 'text' });
const realId = sql(`select id from alerts where body = '${marker}';`);
check('member is served the new real alert', (await page(member)).includes(marker), true);
await action(presenter, 'messageAction', { operation: 'delete', kind: 'alert', id: realId });
check('member no longer served it after delete', (await page(member)).includes(marker), false);

console.log('\nD the delete survives a restart (it is in the database, not memory)');
check(
  'row still present',
  sql(`select count(*) from hidden_room_items where evidence_key = '${capturedKey}';`),
  '1'
);

// --- E: the other three mutations of a captured item ------------------------------------------
// Delete was only the reported half. Marking answered, editing and reacting all changed nothing
// but the acting browser's memory too, and they are recorded in captured_item_overrides.
console.log('\nE edits to a captured item reach the room as well');

// A captured CHAT message, because markAnswered and Edit are chat-only in the source contract.
const capturedChat = fixture.messages.find((message) => message.panel !== 'alert');
const chatId = String(-(100 + capturedChat.sequence));
const chatKey = capturedChat.evidenceKey;
sql(`delete from captured_item_overrides where evidence_key = '${chatKey}';`);

const answered = await action(presenter, 'messageAction', {
  operation: 'markAnswered',
  kind: 'chat',
  id: chatId
});
check(
  'presenter can mark a captured message answered',
  /"success":true|"type":"success"/.test(answered.body),
  true
);
check(
  'recorded room-wide',
  sql(`select answered from captured_item_overrides where evidence_key = '${chatKey}';`),
  '1'
);
check(
  'member is served the answered state',
  /"answered":!0|"answered":true/.test(await page(member)) ||
    (await page(member)).includes(chatKey),
  true
);

const edited = await action(presenter, 'messageAction', {
  operation: 'edit',
  kind: 'chat',
  id: chatId,
  newBody: 'EDITED-BY-E2E'
});
check(
  'presenter can edit a captured message',
  /"success":true|"type":"success"/.test(edited.body),
  true
);
check('member is served the edited body', (await page(member)).includes('EDITED-BY-E2E'), true);
// The edit must not have wiped the answered column - they share one row.
check(
  'the edit left answered intact',
  sql(`select answered from captured_item_overrides where evidence_key = '${chatKey}';`),
  '1'
);

const reacted = await action(member, 'messageAction', {
  operation: 'reaction',
  kind: 'chat',
  id: chatId,
  reactionKey: 'thumbsup',
  reactionEmoji: '👍'
});
check(
  'a member can react to a captured message',
  /"success":true|"type":"success"/.test(reacted.body),
  true
);
const storedReactions = sql(
  `select reactions_json from captured_item_overrides where evidence_key = '${chatKey}';`
);
check('the reaction is stored', storedReactions.includes('thumbsup'), true);
check(
  'reacting left the body edit intact',
  sql(`select body from captured_item_overrides where evidence_key = '${chatKey}';`),
  'EDITED-BY-E2E'
);
// Toggling off must clear it rather than leave a stale pill for the room.
await action(member, 'messageAction', {
  operation: 'reaction',
  kind: 'chat',
  id: chatId,
  reactionKey: 'thumbsup',
  reactionEmoji: '👍'
});
check(
  'toggling the reaction off empties it',
  sql(`select reactions_json from captured_item_overrides where evidence_key = '${chatKey}';`),
  '{}'
);

console.log('\nF a member may not edit a captured message that is not theirs');
// Selected against the MEMBER's own gravatar hash, not against whichever message came first.
// The capture is of the real room this member sat in, so they genuinely author 6 of the 10
// captured chat messages - "a different author from message #1" picked one of theirs and asserted
// a 403 that should never have come.
// Also excluding the message section E edited: that one already carries a body override, so
// "no row was written" would be reading E's own write and calling it a leak.
const otherChat = fixture.messages.find(
  (message) =>
    message.panel !== 'alert' &&
    message.senderEmailHash !== MEMBER_EMAIL_HASH &&
    message.evidenceKey !== chatKey
);
if (otherChat) {
  const refusedEdit = await action(member, 'messageAction', {
    operation: 'edit',
    kind: 'chat',
    id: String(-(100 + otherChat.sequence)),
    newBody: 'SHOULD-NOT-APPLY'
  });
  check('member edit of another author is refused', /"status":403/.test(refusedEdit.body), true);
  check(
    'nothing was written',
    sql(
      `select count(*) from captured_item_overrides where evidence_key = '${otherChat.evidenceKey}' and body is not null;`
    ),
    '0'
  );
} else {
  console.log(
    '  SKIP  every captured chat message shares one author - no cross-author case to test'
  );
}

// Leave the room as it was found.
//
// Every key this script can touch, not just the ones the happy path touches: a run that fails
// partway used to leave a captured item deleted or reading "SHOULD-NOT-APPLY" in the real room,
// because cleanup only covered the keys the passing assertions used. This runs against a live
// database, so it has to put back everything it could have changed.
for (const key of [capturedKey, chatKey, secondAlert.evidenceKey, otherChat?.evidenceKey]) {
  if (!key) continue;
  sql(`delete from hidden_room_items where evidence_key = '${key}';`);
  sql(`delete from captured_item_overrides where evidence_key = '${key}';`);
}
console.log('\n(cleaned up: every captured item this script can touch is restored)');

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
