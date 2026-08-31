import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * ── THREE "NEEDS A CAPTURE RUN" ROWS, ANSWERED FROM A PUBLIC FILE ──────────────────────────────
 *
 * `TODO.md` §C listed `T5-16`, `T5-17` and `T5-20` under *"Three are NOT CAPTURED YET. Each needs one
 * targeted collection script"* — a console script pasted into the live app while logged in. On
 * 2026-08-31 every answer they were waiting for turned out to be in `/public/dist/app.min.js`, a
 * **public static asset**, fetched with `curl` and no session.
 *
 * The reasoning that blocked them is worth naming, because it is a shape that will recur: the DATA
 * those pages render does need a session, and that requirement was inherited by the CODE that names
 * where the data comes from. The controller is not behind the login. Neither is the route table.
 *
 * ## What this file asserts, and why by BYTE
 *
 * Each finding is asserted against the pinned capture at the offset the README quotes, so a re-fetch
 * that moves them fails HERE — with a diff to read — rather than leaving three register rows resting
 * on prose nobody re-ran. The bundle's own SHA-256 is asserted first, so a drifted capture reports
 * itself as drifted instead of failing eight assertions in a way that reads like eight findings.
 *
 * `apps/room/src/lib/priv-cmds-census-contract.test.ts` does the same job for the ROOM's bundle and
 * is the pattern this follows.
 *
 * ## Every offset here was measured TWICE, because the first set was wrong by one
 *
 * The README's first draft carried offsets computed in Python with `io.open(..., encoding='utf-8')`.
 * That opens in text mode, which applies **universal newline translation** — and this bundle contains
 * exactly one `\r\n`, at byte 47. Python collapsed it to a single character, so every offset after
 * byte 47 came out **one too low**, and the first run of this file caught it as
 * `expected ' AvatarsCtr' to be 'AvatarsCtrl'`.
 *
 * One byte, in a 455 KB file, from a reading tool rather than from the evidence. It is recorded here
 * rather than quietly fixed because the same trap applies to every capture in this repository, and
 * the fix is not "add one": it is to read the bytes the way the consumer reads them. These offsets
 * come from Node's `readFileSync(path, 'utf8')`, which is what this test uses.
 */

const CAPTURE = fileURLToPath(new URL('../../evidence-dumps/manage-app-2026-08-31/', import.meta.url));

const BUNDLE = readFileSync(`${CAPTURE}app.min.js`, 'utf8');

/** The digest three independent fetches agreed on — with the deployed cache-buster, another, and none. */
const BUNDLE_SHA256 = 'dcad77f4578fa9a75c46491dd3e31c534624b627afb6f4a2b74a6dcfdde6f439';

describe('the capture is the one the README describes', () => {
  it('matches its recorded digest and size', () => {
    /*
      FIRST, and on its own. Every offset below is meaningless against a different file, and a
      re-fetch that changed the bundle would otherwise surface as a scatter of unrelated failures.
    */
    expect(createHash('sha256').update(BUNDLE).digest('hex')).toBe(BUNDLE_SHA256);
    expect(Buffer.byteLength(BUNDLE, 'utf8')).toBe(455_329);
  });

  it('is the MANAGE app and not the room', () => {
    /*
      The two bundles are different applications on different hosts and share no code. Asserting the
      separation stops a future edit from pointing this file at the room's bundle, where several of
      these needles would coincidentally match and mean something else.
    */
    expect(BUNDLE).toContain('AvatarsCtrl');
    expect(BUNDLE).toContain('angular.module("app")');
    expect(BUNDLE, 'the recordings controller is NOT in this bundle').not.toContain('RecordingsCtrl');
    expect(BUNDLE, 'nor is the response field it renders').not.toContain('vidPath');
  });
});

describe('T5-17 — the avatars page makes no request at all', () => {
  const CONTROLLER_AT = 36_509;
  const controller = BUNDLE.slice(CONTROLLER_AT, CONTROLLER_AT + 600);

  it('finds AvatarsCtrl at its recorded byte', () => {
    expect(BUNDLE.slice(CONTROLLER_AT, CONTROLLER_AT + 11)).toBe('AvatarsCtrl');
  });

  it('lists nine HARDCODED avatar paths, so `avatars` is not a server response', () => {
    /*
      The row asked for "the avatar set behind `avatars`". There is no server behind it: the array is
      a literal in the controller. Asserted by VALUE, all nine, because "it looks hardcoded" and "it
      is these nine files" are different claims and only the second one can be built from.
    */
    for (const path of [
      'app/img/user/01.jpg',
      'app/img/user/02.jpg',
      'app/img/user/03.jpg',
      'app/img/user/04.jpg',
      'app/img/user/05.jpg',
      'app/img/user/06.jpg',
      'app/img/user/07.jpg',
      'app/img/user/08.jpg',
      'app/img/user/user.png'
    ]) {
      expect(controller, `${path} is no longer in the avatar set`).toContain(path);
    }
  });

  it('writes a cookie and navigates — there is no endpoint to capture', () => {
    /*
      THE FINDING. The row was blocked on "the request `selectAvatar(avatar)` posts — URL, method and
      body", and a capture run would have returned nothing, because the handler posts nothing.

      `$http` is injected into this controller and never used, which is the strongest form of the
      claim available from source: the tool for making a request is in scope and untouched.
    */
    expect(controller).toContain('$scope.selectAvatar=function(avt)');
    expect(controller).toContain('$cookies.avatar=avt');
    expect(controller).toContain('chatModel.avatar=avt');
    expect(controller).toContain('$state.go("page.login")');

    /*
      `$http` appears exactly ONCE and it is the injection, with zero call sites. That is a stronger
      statement than its absence and it is the one the evidence supports — the first draft asserted
      `not.toContain('$http')` and went red on the parameter list, which is the assertion catching
      the claim being sloppier than the finding.
    */
    expect(controller.match(/\$http/g), '$http is injected, once').toHaveLength(1);
    expect(controller.match(/\$http\./g), '$http is never CALLED here').toBeNull();
  });
});

describe('T5-16 — the recordings request, and a second route beside it', () => {
  const LIST_AT = 180_143;
  const ARCHIVE_AT = 268_489;

  it('posts to /users/v1/recordings with a token and a source', () => {
    const region = BUNDLE.slice(LIST_AT, LIST_AT + 500);
    expect(region).toContain('$scope.getRecordings=function()');
    expect(region).toContain('args.source="webApp"');
    expect(region).toContain('appVars.globals.APIURL+"/users/v1/recordings"');
    // The response is assigned WHOLE — so `recs` is the array `page.recordings.html` iterates.
    expect(region).toContain('$scope.recs=data');
  });

  it('names the endpoint at its own recorded byte', () => {
    expect(BUNDLE.slice(180_412, 180_412 + 44)).toBe('appVars.globals.APIURL+"/users/v1/recordings"'.slice(0, 44));
  });

  it('logs the user out when that request fails, rather than showing an empty list', () => {
    /*
      Recorded because it is a behaviour a rebuild would otherwise invent differently: an error on
      this endpoint is treated as a bad token, not as "no recordings". The page has its own empty
      state (`ng-hide="recs.length>0"` → "No Recordings...") and this path does not use it.
    */
    expect(BUNDLE.slice(LIST_AT, LIST_AT + 700)).toContain('$scope.doLogout()');
  });

  it('has a SECOND, different recordings route — a per-session archive in a new window', () => {
    const region = BUNDLE.slice(ARCHIVE_AT, ARCHIVE_AT + 260);
    expect(region).toContain('$scope.openRecs=function()');
    expect(region).toContain('window.open("/users/v1/archives/recordings/"');
    expect(region).toContain('appVars.sessData._id');
  });

  it('declares the page with NO controller, which is why its view names LoginCtrl', () => {
    /*
      `page.recordings.html` opens `<div ng-controller="LoginCtrl">`, which reads like a mistake until
      the route table is read: the state declares only a template, so the view runs in whatever scope
      it is nested in and names the controller itself.
    */
    const routes = BUNDLE.slice(449_342, 449_342 + 400);
    expect(routes).toContain('.state("page.recordings",{url:"/recs"');
    expect(routes).toContain('templateUrl:Route.base("page.recordings.html")');
    expect(routes).toContain('.state("page.avatarSelect",{url:"/avatars"');
  });
});

describe('T5-20 — the original never pushes occupancy', () => {
  it('contains none of the names the row expected to find', () => {
    /*
      The row asked to "capture whether the original pushes occupancy on its command channel and under
      what name". Measured over all 455,329 bytes: it does not, under any of these.

      Stated as a set rather than as one search, because a single absent needle is weak evidence and a
      family of them is not — and because the next person's first instinct will be to try one of these.
    */
    for (const name of ['occupancy', 'maxCapacity', 'maxCap', 'recorded_max', 'peakUsers']) {
      expect(BUNDLE, `${name} appears in the manage bundle after all`).not.toContain(name);
    }
  });

  it('derives the count client-side from the two rosters, and never sends it', () => {
    /*
      The positive half, and the reason the negative above is a finding rather than a failed search:
      the count DOES exist, it is computed in the browser from roster sizes, and it is read only by
      two display helpers. So there is no signal to capture — which changes the row's next step from
      "capture it" to "produce it from a connection count our own server owns".
    */
    /*
      FOUR assignment sites, and all four are local arithmetic. The first draft quoted a single
      composed expression that does not appear anywhere — the two-roster sum is computed into `size`
      and `sizeP` a few statements earlier and assigned as `size+sizeP`. Asserting the four real
      sites is both true and more useful: it shows there is no fifth path where a value could arrive
      from the wire.
    */
    expect(BUNDLE.slice(322_889, 322_889 + 40)).toBe('service.userCount=Object.keys(inRos).len');
    const SUM = 'service.userCount=size+sizeP,';
    for (const at of [336_188, 337_510, 337_817]) {
      expect(BUNDLE.slice(at, at + SUM.length), `the assignment at ${at}`).toBe(SUM);
    }
    expect(BUNDLE).toContain('function recalcUserCount()');
    expect(BUNDLE).toContain('rosterLen.innerHTML=""+(chatModel.userCount+$scope.simUserCount)');
  });

  it('proves the search would have found the names if they were there', () => {
    /*
      THE VACUITY FLOOR for the absence above. A needle set that matches nothing proves nothing unless
      a comparable needle from the same family matches — otherwise "the bundle does not contain it"
      and "the bundle was not read" are the same result.
    */
    expect(BUNDLE).toContain('userCount');
    expect(BUNDLE).toContain('simUserCount');
  });
});
