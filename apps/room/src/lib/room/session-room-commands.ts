import {
  hardReset,
  openSession,
  refreshRoster,
  reloadSessionConfig,
  softReset
} from '../../routes/session-commands.remote';
import type { RoomDialogs } from './dialogs.svelte.js';

/**
 * THE SESSION ACTS THAT REACH THE SERVER — the five that send, as against the four that write a
 * preference and stop.
 *
 * ## Why the split is here and not somewhere convenient
 *
 * `RoomSessionControl` handles nine session actions and they divide cleanly on one question: does
 * anybody outside this browser learn about it. Five do — a config reload, a roster rebuild, a soft
 * reset, a hard reset and an opened room — and every one of them raises a captured sentence, sends,
 * and turns a rejection into `Command failed.` The other four write a preference and are a table
 * (`session-lock-writes.ts`).
 *
 * That is a real seam rather than a line-count exercise, and the evidence is that **four of these
 * five spent months on the wrong side of it**: `refresh-roster` and `soft-reset` ran a local
 * `invalidateAll()` while telling the presenter a command had gone out, and `hard-reset` and
 * `open-session` wrote a preference and told nobody at all. Every one of those defects is the same
 * mistake — a server act implemented as a local one — and they were only visible once the two kinds
 * were named apart.
 *
 * ## The contract
 *
 * `true` means handled, `false` means "not mine" and never "nothing happened", which is the contract
 * every `handle` in this room carries.
 */
export interface SessionRoomCommandDeps {
  dialogs: RoomDialogs;
  closeModal: () => void;
  reload: () => Promise<void>;
  savePreference: (key: string, value: boolean) => void;
}

export function handleSessionRoomCommand(action: string, deps: SessionRoomCommandDeps): boolean {
  /*
      IT NOW SENDS, 2026-09-01, and it is the LAST of the five. It ran `deps.reload()` — a refetch of
      this presenter's own page — behind a sentence that describes the room. It outlived the four
      below because the gate that catches that defect was blind to this file: the branch splitter in
      `user-action-disposition-contract.test.ts` matched a FOUR-space indent and every branch here
      sits at two. Evidence, and what the server does with the frame, on `reloadSessionConfig`.
    */
  if (action === 'session-reload-config') {
    deps.dialogs.confirm('Are you sure you want to reload tge session config?', () => {
      deps.closeModal();
      void reloadSessionConfig().catch(() => (deps.dialogs.alert = 'Command failed.'));
      deps.dialogs.alert = 'Session config reloaded...';
    });
    return true;
  }

  /*
      IT NOW SENDS, 2026-08-26. This ran `invalidateAll()` — a LOCAL refetch of this presenter's own
      page — while telling them a command had gone out that "clears the user list" for the room. The
      wire and the delay it promises are on `refreshRoster` in `session-commands.remote.ts`.

      Alert BEFORE the await, because the reference raises it immediately with nothing waited on. A
      failure is still surfaced rather than swallowed.
    */
  if (action === 'session-refresh-roster') {
    deps.dialogs.alert =
      'Command send OK. Please allow 1/2 minute for old entries to get deleted from the list';
    void refreshRoster().catch(() => (deps.dialogs.alert = 'Command failed.'));
    return true;
  }

  /*
      IT NOW SENDS. `softReset` broadcasts `softResetDone`; every client drops its remote media and
      rebuilds after up to three seconds of per-client jitter — the "gently" on the button's label.
      Receiver and measurement in `events.svelte.ts`.

      `#reload()` is GONE rather than kept beside the command: it re-read this presenter's own page,
      which is not what a media reset does to anybody, including them — the broadcast comes back to
      the sender like every other room frame.
    */
  if (action === 'session-soft-reset') {
    deps.dialogs.confirm('Are you sure you want to soft reset the room?', () => {
      deps.closeModal();
      deps.dialogs.alert = 'Soft reset request sent...';
      void softReset().catch(() => (deps.dialogs.alert = 'Command failed.'));
    });
    return true;
  }

  // IT NOW BROADCASTS. The preference write stays; why, and what was actually missing, is on
  // `hardReset` in `session-commands.remote.ts`.
  if (action === 'session-hard-reset' || action === 'session-hard-reset-revoke') {
    deps.dialogs.confirm('Are you sure you want to reset the room?', () => {
      deps.closeModal();
      deps.savePreference('sessionTokensRevoked', action === 'session-hard-reset-revoke');
      void hardReset().catch(() => (deps.dialogs.alert = 'Command failed.'));
      void deps.reload();
    });
    return true;
  }

  // The frame reaches people who are NOT in the room yet — a member sitting on the "This room is
  // closed." refusal, whose reload re-runs the door check that now says yes. See `openSession`.
  if (action === 'session-open') {
    deps.savePreference('sessionOpen', true);
    deps.closeModal();
    void openSession().catch(() => (deps.dialogs.alert = 'Command failed.'));
    return true;
  }

  return false;
}
