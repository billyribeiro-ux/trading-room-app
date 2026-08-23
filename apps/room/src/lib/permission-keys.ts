/**
 * The five permission checkboxes on `#permissionsModal`, as one list.
 *
 * ## Why this exists rather than five string literals
 *
 * These names cross a seam. They are the keys of `roomUsers.permissionsJson` in the CONTROLLER's
 * database, written by its Manage page through `PERMISSION_KEYS` (`server/rooms.ts:90`), returned to
 * this room by `internal/room-config`, and now sent back by `permissions.remote.ts`. Four places,
 * two applications, one spelling — and a typo in any of them is not a type error anywhere, because
 * the payload is JSON on both sides.
 *
 * The failure mode is specific and silent: `savePermissions` writes `false` for every key it does
 * not receive, so a misspelled key would not fail — it would REVOKE. An owner ticking "Admin Chat"
 * would turn it off.
 *
 * `permission-keys-contract.test.ts` asserts this list against the controller's own declaration by
 * reading that file, so the two cannot drift without a test going red.
 *
 * ## The order is the modal's, not the alphabet's
 *
 * Mic, Screen, Cam, Admin Chat, Can Edit Notes — the order the checkboxes appear in
 * `ModalHost.svelte`, and the order the reference's own log line names them in at bundle byte
 * 2077194. Kept so a reader comparing the two reads down rather than around.
 *
 * ## `temporaryAccessOnly` is NOT one of them
 *
 * It is a sixth checkbox in our modal, bound to local state and saved nowhere. It appears in neither
 * the reference's log line nor `PERMISSION_KEYS`, so there is no column to write it to and no
 * captured behaviour to reproduce. Its absence here is deliberate and recorded in `TODO.md`; adding
 * it would invent a permission the controller has never heard of.
 */
export const ROOM_PERMISSION_KEYS = [
  'hasMic',
  'hasScreen',
  'hasCam',
  'hasAdminChat',
  'canEditNotes'
] as const;

export type RoomPermissionKey = (typeof ROOM_PERMISSION_KEYS)[number];
