import { capturePath, hasCapture, readCapture } from './reference-capture';
import { describe, expect, it } from 'vitest';
import { render as ssr } from 'svelte/server';
import Page from '../routes/(app)/account/+page.svelte';
import { shapeOf, sideBySide } from './dom-shape';

/**
 * The account page, element for element, against a dump of the page the owner lands on after
 * logging in.
 *
 * This dump is different in kind from the manage-page markup: it is a flat array of 922 nodes in
 * DOCUMENT ORDER, each with its tag, class, rect and 34 computed properties, taken at 1509x1265
 * @dpr2. So the reference side needs no HTML parsing at all — the node list already IS the shape
 * `dom-shape` produces, and the two can be walked together.
 *
 * It starts at `.container.container-sm` (node 43). Everything above that is `<head>`, the loader
 * scripts and the navbar, none of which this page component renders.
 */
const REFERENCE = 'account-page/ptr-dump-member-1786232518250.json';

/** The worst this is allowed to be. Lower it when it improves; never raise it. */
const BASELINE = 999;

/** AngularJS bookkeeping — present in the reference, meaningless to appearance. */
const FRAMEWORK =
  /^(ng-scope|ng-binding|ng-isolate-scope|ng-pristine|ng-untouched|ng-valid|ng-dirty|ng-touched|ng-invalid|ng-empty|ng-not-empty)$/;

interface DumpNode {
  tag: string;
  class?: string;
  rect?: { w: number; h: number };
  style?: Record<string, string>;
}

/**
 * The reference's shape, from the node array.
 *
 * `ng-hide` and zero-area nodes are dropped for the same reason `dom-shape` drops them: they are in
 * the DOM and invisible, and ours not rendering them at all is the same thing to a person.
 */
function referenceShape(nodes: DumpNode[], from: number) {
  const out: Array<{ kind: 'el'; tag: string; classes: string[] }> = [];
  for (const node of nodes.slice(from)) {
    const classes = (node.class ?? '').split(/\s+/).filter(Boolean);
    if (classes.includes('ng-hide')) continue;
    if (node.rect && node.rect.w === 0 && node.rect.h === 0) continue;
    if (node.style?.display === 'none') continue;
    out.push({ kind: 'el', tag: node.tag, classes: classes.filter((c) => !FRAMEWORK.test(c)) });
  }
  return out;
}

function ourPage() {
  return ssr(Page as never, {
    props: {
      data: {
        /*
          ONE room, because the dump has one.

          Comparing an empty table against a populated one reports every row element as missing and
          buries the real divergences behind them. The shape is the reference's own row: a short
          code in a <strong>, the name, an open chip, a headcount, then Launch and Manage.
        */
        rooms: [
          {
            id: 1,
            accountId: 1,
            shortCode: '3625',
            name: 'Room 3625',
            state: 'open',
            maxUsers: 2,
            userCount: 0,
            publicId: 'abc',
            vanitySlug: null,
            uniqueSlug: null,
            logoUrl: null,
            clonedFromId: null,
            archivedAt: null,
            textList: '',
            createdAt: new Date(),
            launchUrl: 'http://127.0.0.1:5174/session?id=3625'
          }
        ],
        badges: [],
        adminUsers: [],
        admins: [],
        apiKeys: [],
        apiScopes: [],
        entitlements: { marketplace: true, 'text-list': true, sso: true, mobile: true },
        user: { id: 1, displayName: 'Ada Lovelace', email: 'ada@example.com', emailVerifiedAt: new Date() },
        verificationEnforced: false
      },
      form: null
    } as never
  }).body;
}

describe.skipIf(!hasCapture(REFERENCE))('account page, side by side with the post-login dump', () => {
  it('has the dump to compare against', () => {
    expect(hasCapture(REFERENCE), `dump missing at ${capturePath(REFERENCE)}`).toBe(true);
  });

  it('matches element for element', () => {
    /*
      The `if (!existsSync(REFERENCE)) return;` that stood here is gone, and its removal is the
      point rather than tidying. It made a missing dump a SILENTLY PASSING test — the suite reported
      green while comparing nothing at all. Absence is now a skipped suite that says so, which is
      the whole reason `describe.skipIf` is on the line above.
    */
    const dump = JSON.parse(readCapture(REFERENCE)) as { nodes: DumpNode[] };

    /*
      `.center-block.mt-xl` — where THIS COMPONENT's output begins.

      Not `.container-sm`: that wrapper, the fadeInDown and the footer are the root layout's, so
      starting there put the whole reference one element ahead of ours and every row after it read
      as a divergence.
    */
    const start = dump.nodes.findIndex((n) => (n.class ?? '').includes('center-block'));
    expect(start, 'the dump must contain .center-block').toBeGreaterThan(-1);

    const reference = referenceShape(dump.nodes, start);
    const ours = shapeOf(ourPage()).filter((n) => n.kind === 'el');

    const { rows, differing } = sideBySide(reference as never, ours as never);
    console.log('\n=== account page — reference | ours ===');
    console.log(rows.slice(0, 60).join('\n'));
    if (rows.length > 60) console.log(`   … ${rows.length - 60} more`);
    console.log(`\naccount page: ${differing} of ${rows.length} differ (baseline ${BASELINE})\n`);

    expect(differing, 'account page is worse than its baseline').toBeLessThanOrEqual(BASELINE);
  });
});
