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
 * `@sveltejs/kit@3.0.0-next.16`, in `node_modules`, four files:
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
      What Kit does when a schema REFUSES an argument, transcribed from
      `src/runtime/server/index.js:149-153`:

        handleValidationError:
          module.handleValidationError ||
          (({ issues }) => {
            console.error('Remote function schema validation failed:', issues);
            return { message: 'Bad Request', status: 400 };
          })

      `create_validator` calls it and then `error(body.status ?? 400, body)`, so without it a
      validation failure throws `state.handleValidationError is not a function` — a TypeError that
      looks nothing like the 400 the real endpoint returns, and a test asserting on rejection alone
      would have accepted it.

      `module` is `src/hooks.server.ts`, which does NOT export `handleValidationError`, so this app
      runs Kit's default and this reproduces it exactly. `remote-command-harness.test.ts` asserts
      that the hook is still absent, so the day somebody adds one this goes red rather than quietly
      testing against a body the server stopped returning.

      The one deliberate divergence: Kit's `console.error` is not reproduced. It is the server's
      logging, not its contract, and a harness that logs on every intentional refusal trains people
      to ignore test output. Stated here rather than silently dropped.
    */
    handleValidationError: () => ({ message: 'Bad Request', status: 400 })
  };

  return Promise.resolve(with_request_store({ event, state } as never, run) as T | Promise<T>);
}
