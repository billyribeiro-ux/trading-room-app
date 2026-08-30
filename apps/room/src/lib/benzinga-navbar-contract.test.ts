import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * BENZINGA RENDERS TWICE UPSTREAM, AND THIS ROOM BUILT ONE OF THEM.
 *
 * ## What the tracker asked for, and what measuring it produced
 *
 * `NEW-TODO.md` §2.2 listed Benzinga as *"small, decoded"* with one thing outstanding: *"the const
 * table entries for exact classes on the `<li>`, `<a>` and `<img>`, and where `benzingaUrl` is
 * set."* Reading those settled the row and produced a finding the row did not contain: **there are
 * THREE render functions in the bundle, not one.** Two are the same sidebar component compiled twice
 * (`mPe` at 2,467,533 and `_Re` at 2,563,731 — the bundle ships components in duplicate, which this
 * repository already knows from its stylesheets). The third, `PPe` at **2,473,150**, is a different
 * element in a different container with different classes, and nothing here had it.
 *
 * ## The const indices were parsed, not counted
 *
 * A const index is per component, and the same numbers mean different things three tables away —
 * `benzinga-li` sits at index 90 of the table beginning at 2,470,000, while the sidebar's `li` uses
 * index 32 of its own table, which is a generic `nav-item` shared with "Manage Muted Users". Counting
 * brackets by eye across a minified bundle is how that gets mixed up, so the table was parsed with a
 * string-aware walker:
 *
 * ```
 * 90  [1,"nav-item","animated","fadeIn","benzinga-li"]
 * 141 ["target","_blank","title","Benzinga News",1,"nav-link"]
 * 142 [1,"benzinga-logo","animated","fadeIn",3,"src"]
 * ```
 *
 * ## The condition that is OURS, and why it is not a faithfulness failure
 *
 * Upstream's navbar item is IMAGE-ONLY with a hard fallback:
 * `z("src", sessData.altBenzingaLogoURL || "/assets/images/benzinga-logo.png", Mt)`. That asset is
 * not in this repository — measured, not assumed: `find -iname "*benzinga*"` returns nothing.
 * Transcribing it faithfully puts a broken image in the navbar of every room with Benzinga on and no
 * custom logo, which is the `playing.gif` defect this same file already carries a fix for.
 *
 * The SIDEBAR's answer was an icon-and-text fallback because its capture HAS one to copy (const 52,
 * `fas fa-newspaper`, plus the words). This one has no such branch, and inventing one would be
 * inventing evidence. So it renders when the room supplies a logo. A room without one still gets the
 * sidebar item, so the feature is never unreachable.
 *
 * **That condition is the thing most likely to be "fixed" back by someone restoring faithfulness**,
 * which is why it is asserted rather than only explained.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const NAVBAR = readFileSync(`${ROOT}lib/components/RoomNavbar.svelte`, 'utf8');
const SIDEBAR = readFileSync(`${ROOT}lib/components/RoomSidebar.svelte`, 'utf8');

/** Markup only. A class named in a transcription note is not a class an element wears. */
function markupOf(source: string): string {
  return source.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

const NAVBAR_MARKUP = markupOf(NAVBAR);

describe('the navbar item wears the const table it was read from', () => {
  it('carries every class of const 90 on the li', () => {
    /*
      `animated fadeIn` are animate.css, which IS a dependency here (`package.json`, 3.7.2) — so
      dropping them would be dropping an animation the capture has, not avoiding a class with no CSS.
      `benzinga-li` carries no rule in either captured sheet and is worn anyway: it is the capture's
      own hook and costs nothing to keep.
    */
    expect(NAVBAR_MARKUP).toContain('class="nav-item animated fadeIn benzinga-li"');
  });

  it('carries const 141 on the anchor, with the capture own title', () => {
    expect(NAVBAR_MARKUP).toContain('title="Benzinga News"');
    expect(NAVBAR_MARKUP).toContain('target="_blank"');
    /* `nav-link` ALONE — the sidebar's is `nav-link sidebar-item ps-1`, which is a different const. */
    expect(NAVBAR_MARKUP).toContain('class="nav-link"');
  });

  it('carries const 142 on the image', () => {
    expect(NAVBAR_MARKUP).toContain('class="benzinga-logo animated fadeIn"');
  });

  it('opens the link safely, which upstream does not', () => {
    /*
      `rel="noopener noreferrer"` is not in const 141. A `target="_blank"` without it hands the
      opened page a `window.opener` handle back into the room — the same addition the sidebar item
      and the tip button already carry here, for the same reason.
    */
    /*
      Bound to LOCALS and asserted, not inlined: `slice-anchor-contract.test.ts` refuses an `indexOf`
      written inside a `slice`, because an anchor that silently returns -1 makes the slice start at
      the end of the string and the assertion below pass over nothing.
    */
    const from = NAVBAR_MARKUP.indexOf('benzinga-li');
    expect(from, 'the item is gone').toBeGreaterThan(-1);
    const to = NAVBAR_MARKUP.indexOf('</li>', from);
    expect(to, 'the item never closes').toBeGreaterThan(from);

    expect(NAVBAR_MARKUP.slice(from, to)).toContain('rel="noopener noreferrer"');
  });

  it('reserves space for the logo', () => {
    /*
      `.benzinga-logo` is `max-height: 25px !important` in the captured sheet, so the height is CSS's
      — but a logo of unknown intrinsic size with no reservation is a layout shift on every load, and
      `img-dimensions-contract.test.ts` requires the attributes.
    */
    const from = NAVBAR_MARKUP.indexOf('benzinga-logo animated fadeIn');
    expect(from, 'the image is gone').toBeGreaterThan(-1);
    const to = NAVBAR_MARKUP.indexOf('/>', from);
    expect(to, 'the image tag never closes').toBeGreaterThan(from);

    const image = NAVBAR_MARKUP.slice(from, to);
    expect(image).toContain('width=');
    expect(image).toContain('height=');
  });
});

describe('it never renders a broken image', () => {
  it('requires a logo as well as the room setting', () => {
    /*
      THE ASSERTION THIS FILE EXISTS FOR. Upstream renders the item on `hasBenzingaNews` alone and
      falls back to a bundled asset. That asset is absent here, so the fallback would be a broken
      `<img>` in the navbar of every unconfigured room.

      **The first term was `benzingaUrl` until 2026-08-30, and that was the defect**: a URL is not
      the feature's switch. `benzingaVisible` is — it folds `hasBenzingaNews` together with the URL
      being present — so it replaces that half rather than joining it. The logo term stays for the
      reason above, which is ours and not upstream's.
    */
    expect(NAVBAR_MARKUP).toContain('{#if benzinga.visible && benzinga.logoUrl}');
  });

  it('names no asset this repository does not have', () => {
    /*
      The literal path is what a restoration of faithfulness would reach for. Asserted as an absence
      so that adding it has to be a deliberate act accompanied by adding the file.
    */
    expect(NAVBAR_MARKUP).not.toContain('/assets/images/benzinga-logo.png');
  });
});

describe('the two copies stay distinct', () => {
  it('keeps the sidebar item on its own classes and its own fallback', () => {
    /*
      The failure this guards is collapsing the two into one shared component "because it is the same
      feature". They are two elements with two const tables: the sidebar's anchor is
      `nav-link sidebar-item ps-1` and its image is `benzinga-logo-alt`, and it HAS an icon-and-text
      branch that the navbar's does not.
    */
    const sidebar = markupOf(SIDEBAR);
    expect(sidebar).toContain('class="nav-link sidebar-item ps-1"');
    expect(sidebar).toContain('class="benzinga-logo-alt"');
    expect(sidebar).toContain('fa-newspaper');
    expect(NAVBAR_MARKUP, 'the navbar copy has no icon branch to copy').not.toContain(
      'fa-newspaper'
    );
  });

  it('gates both on the same room setting, resolved on the server side of the page', () => {
    /*
      `hasBenzingaNews` is read once into `gates.ts` and reaches both surfaces from there. Two
      components each re-deriving the same room setting is how one of them keeps showing the item
      after an owner turns it off.
    */
    const gates = readFileSync(`${ROOT}lib/room/gates.ts`, 'utf8');
    expect(gates).toContain('hasBenzingaNews');
    expect((markupOf(gates).match(/hasBenzingaNews/g) ?? []).length).toBe(1);
  });

  it('DELIVERS that gate to both surfaces, which is the half this file was not checking', () => {
    /*
      ## THE ASSERTION ABOVE IS TRUE AND THE NAVBAR WAS UNGATED ANYWAY

      Its comment names the failure exactly — *"how one of them keeps showing the item after an owner
      turns it off"* — and it could not catch it, because it measures `gates.ts` and the defect was
      one file over. `hasBenzingaNews` WAS read once, into `benzingaVisible`; that value was passed
      to the sidebar and **not to the navbar**, which rendered on `benzingaUrl && benzingaLogoUrl`.

      The three settings are independent on the controller — `room-config.ts` allow-lists
      `hasBenzingaNews`, `altBenzingaLinkURL` and `altBenzingaLogoURL` as three entries, and the
      schema exposes three controls — so an owner who unticked "BZ News" and left the URLs populated
      lost the sidebar item and kept the navbar logo. Upstream gates both:
      `O(15, sessData.hasBenzingaNews ? 15 : -1)` at bundle byte 2,487,962.

      A gate that is DERIVED correctly and then not DELIVERED is invisible to any check that stops at
      the derivation. This asserts the delivery: both call sites, by name, in the page that owns them.
    */
    const page = readFileSync(`${ROOT}routes/+page.svelte`, 'utf8');
    const navbar = readFileSync(`${ROOT}lib/components/RoomNavbar.svelte`, 'utf8');

    /*
      THE FIX IS STRUCTURAL, so this asserts the structure. The three settings travel as ONE value —
      `gates.benzinga` — because three props were three chances to forget one, and forgetting the
      flag is exactly what happened. A surface either has the feature's state or it does not.
    */
    expect(page, 'the navbar must be handed the whole feature').toContain(
      'benzinga={gates.benzinga}'
    );
    expect(
      page,
      'no surface may take the pieces apart again — that is how the flag was dropped'
    ).not.toMatch(/benzingaUrl=\{|benzingaLogoUrl=\{/);

    /* And the navbar must GATE on the flag, not merely receive it. */
    expect(navbar).toContain('{#if benzinga.visible && benzinga.logoUrl}');
  });
});
