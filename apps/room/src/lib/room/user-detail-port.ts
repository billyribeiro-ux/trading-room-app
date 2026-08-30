import { userDetail } from '../../routes/user-detail.remote';
import { RoomUserDetail } from './user-detail';

/**
 * The `userInfoDB` lookup, wired — one place that may import a route, and ONE INSTANCE PER ROOM.
 *
 * ## A FACTORY, not a module-level instance, and that is the load-bearing word
 *
 * `user-notes-port.ts` beside this exports a frozen literal, and that is safe because it holds no
 * state. This one holds ANSWERS — one member's address and last login, keyed by id — and
 * `create-room.svelte.ts` is imported by `+page.svelte`, which renders on the SERVER. A module-level
 * `new RoomUserDetail()` would therefore be one cache shared by every request that worker handles,
 * which is the "no shared server-side module state" rule in `CLAUDE.md`, and on this particular data
 * it is the multi-tenant failure this repository exists under: one room's presenter populating a map
 * that another room's render can read.
 *
 * Nothing populates it during SSR today — no modal is open at first render, so `hydrate` never runs
 * — so this is a hole that was not yet a leak. It is closed at the shape rather than argued away,
 * because the argument depends on a fact about rendering that the next feature can change without
 * anybody thinking about this file.
 *
 * `createRoom` is called once per page instance, so the instance's life is the page's.
 */
export const createRoomUserDetail = (): RoomUserDetail =>
  new RoomUserDetail({ fetch: (userId: number) => userDetail({ userId }) });
