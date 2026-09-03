/**
 * The private half of one account's card — ONE declaration, for both ends of the round trip.
 *
 * ## Why this is its own module
 *
 * It was declared twice: once in `server/user-detail.ts` as what the query returns, and once in
 * `room/user-detail.ts` as what the cache holds. The two agreed by hand, which is the shape this
 * repository refuses everywhere else — *two places recording the same thing is how one of them goes
 * stale* — and it cost a real edit on 2026-08-31, when the server started answering `ip` and
 * `userAgent` and the client's copy did not know.
 *
 * A type has no runtime, so a single module is reachable from both sides without a boundary
 * violation: the server imports it beside its database code, the browser imports it beside a
 * `SvelteMap`, and neither pulls anything of the other's in with it. That is what makes this a seam
 * rather than a file that exists to hold six lines.
 *
 * ## What decides whether a field belongs here
 *
 * Everything on this interface crosses `routes/user-detail.remote.ts`, which is presenter-only and
 * room-scoped. A field added here is therefore a field a presenter of this room may see about
 * another account, and that is the only question to answer before adding one — the caller's
 * authority is already settled, on the server, by the route.
 */
export interface UserDetail {
  /** `userXref.email`, which the reference carries as `privData.email`. */
  readonly email: string;
  /**
   * `userXref.lastLogin`, as an ISO string, or null for an account that has never logged in.
   *
   * A string rather than a `Date` because this crosses a remote-function boundary and the modal
   * formats it; null rather than an omitted key so "never logged in" is a value the caller can
   * render, not a shape it has to guess at.
   */
  readonly loggedIn: string | null;
  /**
   * `privData.ip` — the address the SERVER saw open this member's live stream, or null.
   *
   * Null means "not connected right now", never "connected from nowhere", and it is null rather
   * than an omitted key so the client's spread OVERWRITES a stale value instead of leaving it in
   * place: the modal must not show the address of a connection that has closed.
   */
  readonly ip: string | null;
  /** `privData.uaStr` — the `User-Agent` on that same request, bounded at the boundary, or null. */
  readonly userAgent: string | null;
  readonly appVersion?: string | null;
  readonly streamServer?: string | null;
  readonly serverId?: string | null;
}
