import { with_request_store } from '@sveltejs/kit/internal/server';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Calls a remote function the way SvelteKit's own server does, so a test can EXECUTE one.
 *
 * ## Why this exists
 *
 * Every form action in this app is an ordinary function, so its tests call it directly against a
 * live SQLite database and assert on what it returned and what it wrote —
 * `files-pane-contract.test.ts` proves a member cannot set the room's alert sound AND that nothing
 * reached the controller when it refused. That second half is the one that matters, and no amount
 * of reading source text can produce it.
 *
 * A remote `command` is not callable that way. Its wrapper opens with
 * `const { event, state } = get_request_store()` and throws outside a request. So converting an
 * action to a command threatened to trade real behavioural coverage for string matching — which
 * would have been a downgrade dressed as a refactor, and it is why several conversions were
 * deferred rather than done badly.
 *
 * ## What was READ to build it, rather than assumed
 *
 * `@sveltejs/kit`, in `node_modules`, four files. Read against `3.0.0-next.16` when this was
 * written and RE-READ against `3.0.0-next.23` on 2026-08-17 — the version matters, because the
 * fifth thing it used to reproduce (`handleValidationError`) was removed between the two and the
 * note on `state` below records what replaced it. All four of these are unchanged:
 *
 * - `src/exports/internal/server/event.js` — `with_request_store(store, fn)` sets a module-level
 *   `sync_store` and runs `fn` inside an `AsyncLocalStorage`. It is exported from
 *   `src/exports/internal/server/index.js`, and `./internal/server` is a real subpath in the
 *   package's own `exports` map. This is not reaching past a boundary into a private file.
 * - `src/runtime/app/server/remote/command.js` — the wrapper reads exactly four things before it
 *   runs anything: `event.request.method`, `state.is_in_remote_query`, `state.is_in_remote_prerender`
 *   and `state.is_in_render`. Everything else it takes from the store on the way through.
 * - `src/constants.js` — `MUTATIVE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']`. A command called
 *   with anything else throws "Cannot call a command from a GET handler", which is why the request
 *   below is a POST and not a bare `new Request(url)`.
 * - `src/runtime/app/server/remote/shared.js` — `run_remote_function` derives its own store from
 *   this one and re-enters `with_request_store` for both the validation and the handler, so the
 *   async half of the command keeps the event even though the `finally` here has already cleared
 *   `sync_store`.
 *
 * ## What it deliberately does NOT do
 *
 * It does not serialize the argument. The real client path runs `stringify_command_arg` (devalue,
 * plus a `File` reducer that ships an `ArrayBuffer`) and the server revives it — so a test using
 * this harness proves the HANDLER, not the wire. That is the same boundary an action test has
 * always had, and it is worth naming so nobody reads a green harness test as proof that a value
 * survives the round trip. The schema still runs: `command()` validates before the handler, so a
 * bad argument is refused here exactly as it would be over HTTP.
 *
 * @param locals what `hooks.server.ts` would have put on the event — the user, session and room.
 * @param run the call, e.g. `() => deleteFile({ fileId: 7 })`.
 */
export function callRemote<T>(locals: App.Locals, run: () => T | Promise<T>): Promise<T> {
  /*
    POST because `MUTATIVE_METHODS` gates the wrapper; the url is never read by a command (Kit makes
    `url`, `params` and `route` throw inside a `query`, and they are meaningless here either way).
    `cookies` is present because the wrapper SPREADS it to build the derived event — an absent one
    is a TypeError before the handler is reached.
  */
  const event = {
    request: new Request('http://room.test/', { method: 'POST' }),
    locals,
    cookies: { get: () => undefined, set: () => {}, delete: () => {} }
  } as unknown as RequestEvent;

  /*
    All three flags false. They are the guards against calling a command from inside a query, a
    prerender or SSR — none of which is what a test is doing, and setting one would make the
    harness assert something about a situation it is not in.
  */
  const state = {
    is_in_remote_query: false,
    is_in_remote_prerender: false,
    is_in_render: false,
    /*
      THE PER-REQUEST REMOTE CACHE, added 2026-08-28 so a `query` can be executed here too.

      `command()` never touches it, which is why this harness ran without one for as long as it only
      ran commands. `query()` does: `run_remote_function` in
      `src/runtime/app/server/remote/shared.js:231-235` reads `state.remote.data?.get(internals)` and
      creates the map on a miss, so an absent `state.remote` is a TypeError before the handler is
      reached — which is exactly what `chat-tabs-contract.test.ts` hit when it began calling
      `loadOlderChatMessages`.

      An EMPTY object rather than a pre-seeded one, deliberately: Kit creates every sub-map lazily
      (`??=`), so the empty object is the honest "nothing cached yet" state, and a fresh one per call
      means one test's query result can never be served to another's.
    */
    remote: {} as Record<string, unknown>
    /*
      NO `handleValidationError`, and its removal on 2026-08-17 is a FRAMEWORK change rather than a
      simplification.

      Through `3.0.0-next.16` this shim reproduced Kit's default: `create_validator` called
      `state.handleValidationError({ issues })` and then `error(body.status ?? 400, body)`, so a
      schema refusal surfaced as a 400 `HttpError`. The Kit 3 migration guide removes that hook —
      *"`handleValidationError` hook removed"* — and `next.23` implements it: read from the installed
      package at `src/runtime/app/server/remote/shared.js:33-36`,

        if (result.issues) {
          throw new ValidationError(result.issues);
        }

      so the validator now throws directly and the status is applied further out, where `handleError`
      receives it with `kind: 'validation'`. Nothing calls this property any more, which makes
      keeping it the "config nothing reads" defect in harness form.

      What that changes for a test: a schema refusal is a `ValidationError` carrying `issues`, not an
      `HttpError` carrying `status`. `expectSchemaRefusal` below is the one place that knows it.
    */
  };

  return Promise.resolve(with_request_store({ event, state } as never, run) as T | Promise<T>);
}

/**
 * A remote function REFUSED its argument at the schema, asserted in one place.
 *
 * ## Why this is a helper and not `.rejects.toMatchObject({ status: 400 })`
 *
 * It was that, thirty-seven times across six files, and on 2026-08-17 nineteen of them went red at
 * once: SvelteKit 3 `next.23` removed the `handleValidationError` hook, so the validator throws a
 * `ValidationError` carrying `issues` instead of an `HttpError` carrying `status`. The behaviour a
 * reader cares about — *"this call was refused before it could do anything"* — did not change at
 * all; only the shape the framework expresses it in did.
 *
 * Thirty-seven literals meant thirty-seven edits and a real chance of "fixing" the eighteen that
 * were never about schema validation. Those assert `error(400, …)` raised by our OWN code and are
 * still `HttpError` with a `status`; a blanket replace would have quietly loosened every one of
 * them. One named helper means the next framework change is one edit, and the eighteen keep saying
 * what they always said.
 *
 * ## What it asserts
 *
 * The refusal came from the SCHEMA, not from a handler that happened to throw: `issues` must be a
 * non-empty array, which is the thing only a validator produces. A handler that threw a bare
 * `Error` fails here, which is the point — "it rejected" is not the contract.
 */
export async function expectSchemaRefusal(call: Promise<unknown>, label?: string): Promise<void> {
  /*
    `label` is `expect(…, message)`'s second argument, kept because one caller loops over a list of
    bad values and needs to say WHICH one got through. Dropping it would have turned a precise
    failure into "one of these three values was accepted".
  */
  const where = label === undefined ? '' : ` [${label}]`;

  let thrown: unknown;
  try {
    await call;
  } catch (caught) {
    thrown = caught;
  }

  if (thrown === undefined) {
    throw new Error(`expected the remote function to refuse its argument, but it resolved${where}`);
  }

  const issues = (thrown as { issues?: unknown }).issues;
  if (!Array.isArray(issues) || issues.length === 0) {
    throw new Error(
      `expected a schema ValidationError carrying issues, got ${String(thrown)}${where}. If this call is refused by \`error(400, …)\` in our own code rather than by its schema, assert the HttpError directly — that is a different contract and this helper is not it.`
    );
  }
}
