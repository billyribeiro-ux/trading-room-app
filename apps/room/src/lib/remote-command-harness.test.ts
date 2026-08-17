import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { callRemote, expectSchemaRefusal } from './server/remote-command-harness';
import { db, ensureDatabase } from './server/db';
import { users } from './server/db/schema';

/*
  The harness has to be proven before anything is converted on the strength of it.

  It is the thing that lets a remote `command` keep the behavioural coverage its form action had —
  executed against a live database, not matched as source text. If it silently did nothing, or ran
  the handler without a request store, every test built on it would pass while proving nothing. So
  it is tested against a REAL command from this app rather than a mock: `unmuteChat`, the first
  conversion, which refuses a non-presenter.
*/

const { unmuteChat } = await import('../routes/chat-mute.remote');

let presenter: App.Locals;
let member: App.Locals;

beforeAll(() => {
  ensureDatabase();

  const account = (role: 'staff' | 'participant', email: string) =>
    db
      .insert(users)
      .values({
        displayName: email,
        email,
        role,
        passwordHash: 'scrypt$00$00',
        createdAt: new Date()
      })
      .returning()
      .get();

  presenter = {
    user: account('staff', 'harness-presenter@example.test'),
    sessionId: 'harness-presenter',
    roomShortCode: '3625'
  } as App.Locals;
  member = {
    user: account('participant', 'harness-member@example.test'),
    sessionId: 'harness-member',
    roomShortCode: '3625'
  } as App.Locals;
});

describe('the remote-command harness', () => {
  it('runs a command far enough to reach its authorization check', async () => {
    /*
      The assertion that proves the store was established. Without it the wrapper throws
      "Could not get the request store" — a DIFFERENT error from the 403 below, which is why this
      asserts on the status rather than merely on rejection.
    */
    await expect(callRemote(member, () => unmuteChat({ targetUserId: 1 }))).rejects.toMatchObject({
      status: 403
    });
  });

  it('and the SCHEMA runs before the handler, exactly as it would over HTTP', async () => {
    /*
      `targetUserId` is `z.number().int().positive()`. A command validates before the handler, so a
      bad argument must be refused here too — otherwise a harness test could pass an argument the
      real endpoint would never deliver, and prove the handler against an impossible input.

      A validation failure is a 400 and it happens for the PRESENTER, who would otherwise get past
      the gate. Both halves matter: the wrong status would mean the gate refused it first.
    */
    await expectSchemaRefusal(callRemote(presenter, () => unmuteChat({ targetUserId: -1 })));
  });

  it('reproduces the validation body this app ACTUALLY serves, and says so if that changes', () => {
    /*
      The harness supplies `state.handleValidationError` because Kit's validator calls it and then
      `error(body.status ?? 400, body)`. Which body is correct depends on whether this app overrides
      the hook — and it does not, so the harness reproduces Kit's default.

      This assertion is the tripwire. The day somebody exports `handleValidationError` from
      `hooks.server.ts`, the harness stops matching production and every 400 asserted through it
      becomes a claim about a body the server no longer returns. That should be a red test, not a
      thing discovered later.
    */
    const hooks = readFileSync(new URL('../hooks.server.ts', import.meta.url), 'utf8');
    expect(hooks, 'the hooks file must still be here for this check to mean anything').toContain(
      'export const handle'
    );
    expect(
      hooks,
      'hooks.server.ts now exports handleValidationError — update `remote-command-harness.ts` to use it, or this harness is asserting the wrong body.'
    ).not.toContain('handleValidationError');
  });

  it('gives each call its own store rather than leaking the previous one', async () => {
    /*
      `with_request_store` clears its module-level `sync_store` in a `finally`. Two calls in a row
      with different locals must not see each other's — a leak here would make every test after the
      first one assert against whichever user ran last, and they would all still pass.
    */
    await expect(callRemote(member, () => unmuteChat({ targetUserId: 1 }))).rejects.toMatchObject({
      status: 403
    });
    await expectSchemaRefusal(callRemote(presenter, () => unmuteChat({ targetUserId: -1 })));
    await expect(callRemote(member, () => unmuteChat({ targetUserId: 1 }))).rejects.toMatchObject({
      status: 403
    });
  });
});
