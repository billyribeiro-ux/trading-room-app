import { command, getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';
import { z } from 'zod';

import { archivesAvailableTo } from '#lib/roster-gates.js';
import { presenterRoom, requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { ensureDatabase } from '#lib/server/db/index.js';
import { readRoomConfig } from '#lib/server/room-config-client.js';
import {
  MAX_TRANSCRIPT_LINE,
  recordTranscriptLine,
  transcriptPageFor
} from '#lib/server/session-transcript.js';

/*
  The transcript's two commands — the WRITE that makes one exist and the READ the separate window
  performs. One module, because both are the same subject under two different gates, which is the
  split `scheduled-alerts.remote.ts` records: on the GATE, not on the noun.

  ## What the reference proves, and what it cannot

  Its client is in the pinned bundle and its server is not. So the CLIENT half is transcribed and the
  SERVER half is decided here and stated:

    byte 1,151,135   getSessionTranscripts(token, {startDate, page, limit})
                       -> POST `${apiROOT}/sessions/v2/getSessionTranscript`
    byte 2,608,586   startDate = new Date(Date.UTC(y, m, d, 13, 0, 0)).toISOString(), limit = 300
    byte 2,607,394   SessionTranscriptComponent, whose pagination block reads
                       {page, hasMore, hasPrevious, totalCount, totalPages}

  That response shape is the contract this file answers, because it is the half we can read.

  ## The token in the reference's URL is REFUSED, and that is the one deliberate divergence

  `openTranscriptPage()` at byte 1,958,542 opens
  `#/session-transcript?token=${encodeURIComponent(globals.sesionToken)}&name=…`, and the component
  falls back to `globals.sesionToken` when the query parameter is absent. A session credential in an
  address bar is also in the browser's history, in every outbound `Referer`, and in any screenshot of
  the window — the refusal `TODO.md` already records for the Benzinga default URL, for the same
  reason. Ours carries no token: the new window is same-origin, so it arrives with the session cookie
  the room already issued, and BOTH functions below re-derive the room and the caller from it.

  Nothing about the transcript is asserted by the caller. Not the room, not the speaker, not the
  session — that is the 2026-08-07 privilege escalation's rule, and a transcript is exactly the kind
  of record forging would matter for.
*/

/**
 * `sendSpeechReco`'s durable half — record one FINAL caption line.
 *
 * ## PRESENTER-ONLY, decided here and also by the media server
 *
 * `services/media/src/server.rs` already refuses `sendSpeechReco` from a member, which is why
 * `speech-reco-entitlement.test.ts` can assert a member never captions. This asks the same question
 * again rather than trusting that: the two servers are different processes with different failure
 * modes, and a write that reaches the room's database must be authorised by the room's own server.
 *
 * ## Only finals, and the caller cannot say otherwise
 *
 * There is no `isFinal` in this payload. The room's page calls this from the branch that has already
 * decided a result is final (`+page.svelte`'s `pushCaptionHistory`), so "interim lines are not
 * stored" is a property of where the call sits rather than a flag that could be sent wrong.
 *
 * ## The speaker is the SERVER's name for the caller
 *
 * `user.displayName`, exactly as `scheduleAlertLater` takes its `senderName`. The reference's own
 * relay carries a `sender` field from the speaking browser; accepting one here would let a presenter
 * write a transcript line attributed to somebody else, in a record whose whole value is who said
 * what.
 */
export const recordTranscript = command(
  z.strictObject({
    text: z.string().min(1).max(MAX_TRANSCRIPT_LINE),
    /** An epoch millisecond, for the reason `scheduleAlertLater` sends one: a serialised Date is a string nobody validates. */
    spokenAt: z.number().int().finite()
  }),
  async ({ text, spokenAt }) => {
    ensureDatabase();
    const { locals } = getRequestEvent();
    const user = requireUser(locals);
    const room = presenterRoom();

    const id = recordTranscriptLine({
      roomShortCode: room,
      speaker: user.displayName,
      text,
      spokenAt: new Date(spokenAt)
    });

    return { id };
  }
);

/**
 * `getSessionTranscript` — one day of one room's transcript, paged.
 *
 * ## Gated by ARCHIVES, because that is the control that opens it
 *
 * The button lives on the caption overlay behind `O(5, …)` — `archivesAvailableTo()` — and in the
 * Archives menu behind the same predicate. A gate that only removes a control is not a gate, so the
 * same function decides here, on the server, from the controller's membership and the room's
 * settings rather than from anything the window sends.
 *
 * `isLimitedPresenter` is `false` on this side and that is not a shortcut: it is runtime state the
 * reference assigns through `giveMicScreen`, and `TODO.md`'s gap 24 measurement found **no element
 * in the whole bundle that sends it** — so it is false upstream too, for everyone, always.
 *
 * ## The day is computed by the CALLER and re-derived here
 *
 * The window sends the selected day as a UTC epoch millisecond for its start; the end is
 * `dayStart + 24h`, computed here so the two ends cannot disagree and so a caller cannot ask for a
 * range wider than a day. That is what keeps the read bounded, which is the property
 * `session-transcript.ts` argues at its own index.
 */
export const sessionTranscript = query(
  z.strictObject({
    /** Epoch milliseconds at the START of the selected day. */
    dayStart: z.number().int().finite(),
    page: z.number().int().min(0).max(10_000)
  }),
  async ({ dayStart, page }) => {
    ensureDatabase();
    const { locals } = getRequestEvent();
    const user = requireUser(locals);
    const room = requireRoomShortCode(locals);

    const config = await readRoomConfig(locals, room, user.email);
    const membership = config.member;

    /*
      Fail CLOSED on a config the controller could not answer. `readRoomConfig` is the authority for
      both halves of this predicate, and a transcript is a record of everything said in a paid room —
      the wrong default here hands it to a member the owner never opened archives to.
    */
    if (!membership) error(403, 'Archives are not available in this room.');

    const allowed = archivesAvailableTo(
      {
        isPresenter: membership.isP,
        isLimitedPresenter: false,
        email: membership.email,
        denyArchivesAccess: membership.denyArchivesAccess,
        /*
          Neither reaches this predicate — `archivesAvailableTo` branches on `isPresenter` and
          `isLimitedPresenter` and then reads only `email` and `denyArchivesAccess`. They are on
          `RosterViewer` because the roster's OTHER gates need them, and they are filled from the
          same membership rather than stubbed, so a future reader of this call site is looking at
          the controller's answer and not at a placeholder.
        */
        userXrefID: String(membership.role),
        hasAdminChat: membership.permissions.hasAdminChat
      },
      {
        showArchivesToUsers: config.settings?.showArchivesToUsers,
        showArchivesToSpecificPresenters: config.settings?.showArchivesToSpecificPresenters
      }
    );
    if (!allowed) error(403, 'Archives are not available in this room.');

    const DAY_MS = 24 * 60 * 60 * 1000;
    const result = transcriptPageFor({
      roomShortCode: room,
      dayStart: new Date(dayStart),
      dayEnd: new Date(dayStart + DAY_MS),
      page
    });

    return {
      /*
        `sessionName` — the reference's heading, *"Session Transcript for: {sessionName}"*.

        Upstream carries it in the URL beside the token (`&name=${encodeURIComponent(sessionName)}`)
        and falls back to the literal `"Unknown Session"` when it is absent. It travels here in the
        RESPONSE instead, from the config this function already read: a heading taken from the query
        string is a heading whoever opens the window chooses, and the transcript's own page is the
        last place a room should be able to be mislabelled. It also removes the fallback — the
        server always knows the room's name, so `"Unknown Session"` has no case left to cover.
      */
      sessionName: config.room.name,
      transcripts: result.rows.map((row) => ({
        _id: row.id,
        speaker: row.speaker,
        text: row.text,
        ts: row.spokenAt.getTime()
      })),
      pagination: {
        page: result.page,
        hasMore: result.hasMore,
        hasPrevious: result.hasPrevious,
        totalCount: result.totalCount,
        totalPages: result.totalPages
      }
    };
  }
);
