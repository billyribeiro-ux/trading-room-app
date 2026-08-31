import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { parse } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';

/**
 * EVERY `<img>` HAS A BOX BEFORE ITS BYTES ARRIVE, OR SAYS WHY IT CANNOT.
 *
 * `CLAUDE.md` names this rule outright - *"`<img>` always carries `width` + `height` or an
 * `aspect-ratio`. No layout shift."* - and until this file existed nothing enforced it. It was
 * clean by discipline, which is the condition the standard says to close, and it was not even
 * clean: the sweep that produced this catalog found a broken image shipping in the navbar.
 *
 * ## Why a regex over the source would have been wrong, twice
 *
 * The first sweep matched `<img` in the file text and reported 47 tags. **Five of them were not
 * markup.** They were transcriptions of the reference inside explanatory comments - the bootbox
 * body in `SwingAlertsPane.svelte`, the hand-built `added-image-to-chat` node in
 * `AlertChatArea.svelte` - and "fixing" those would have corrupted evidence to satisfy a linter.
 * So this reads the Svelte PARSER'S AST, where a comment cannot be mistaken for an element.
 *
 * The second sweep then called 31 images undimensioned. **Six of those already have a box**, from
 * CSS the sweep could not see because it only looked at class selectors and the rules that size
 * them are keyed on a bare `img` (`.edit-user-avatar img`), on an id path
 * (`#mobileAppInfoModal ... a:last-child img`), or on a custom-element ancestor
 * (`app-privchat .avatarImg`). Reporting those as defects would have sent the owner to look at
 * working code.
 *
 * ## The trap the ancestor check exists for
 *
 * The captured stylesheet ships every component rule TWICE: once Angular-scoped
 * (`.avatarImg[_ngcontent-ng-c3142977328]`) and once re-homed onto the custom element
 * (`app-privchat .avatarImg:not(:root)`). This app carries no `_ngcontent` attributes, so the
 * first copy matches NOTHING here. The second matches only while the component still renders
 * `app-privchat` around the image.
 *
 * That is a real and silent failure mode: delete the `app-privchat` wrapper as "a div would do"
 * and two avatars lose 32x32 with nothing to say so. `requiresAncestor` below is checked against
 * the AST for exactly that reason, and it is the assertion that makes the rest of the entry mean
 * anything.
 *
 * ## Three states, and no fourth
 *
 * An image is dimensioned, or it is in `SIZED_BY_CSS` naming the rule that gives it a box, or it
 * is in `UNSIZEABLE` with a reason. Anything else fails. There is deliberately no "ignore" -
 * `UNSIZEABLE` costs a sentence, and the sentence is the point.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * The sheets that actually ship, in cascade order - `app.css` imports the first three.
 *
 * Paths are relative to `src/`, which is why the first one climbs out of it: the captured stylesheet
 * lives BESIDE `src/`, at `apps/room/css/`. That `../` was missing when this list was first written
 * and nothing noticed, because no `SIZED_BY_CSS` entry happens to point at that sheet - the rules
 * that size images live in `app.css` and in the captured component sheet. The test below reads every
 * entry in this list, which is what turned a latent wrong path into a failure.
 */
const SHEETS = [
  '../css/complete-app-styles.css',
  'lib/styles/tokens.css',
  'lib/styles/captured-runtime-components.css',
  'app.css'
] as const;

/**
 * Components whose OWN `<style>` block carries a sizing rule.
 *
 * A separate list rather than a fifth entry above, because these are not shipped sheets and are not
 * read the same way — the verifier extracts the `<style>` element before parsing. Kept narrow and
 * explicit for the reason `SHEETS` is: a union of everything would let a typo name a file that has
 * no stylesheet at all, and the failure would be a rule "not found" rather than a path that is
 * wrong.
 *
 * `CarouselDialog` is here because the reference's own rules for the carousel and its image browser
 * are component-scoped (`[_ngcontent-%COMP%]`), which is exactly what a Svelte `<style>` gives — so
 * they are transcribed beside the markup they scope to rather than moved into a shared sheet to
 * satisfy this verifier. It was `NoteEditor.svelte` until 2026-08-30, when the carousel modal was
 * extracted; the rules travelled with the markup they scope, which is the whole argument for
 * component-scoped rules being written beside it.
 */
const SCOPED_SHEETS = ['lib/components/notes/CarouselDialog.svelte'] as const;

interface SizedEntry {
  /** How many images in this file share this `src` and this disposition. The count IS the assertion. */
  count: number;
  /** Which shipped sheet carries the rule. */
  sheet: (typeof SHEETS)[number] | (typeof SCOPED_SHEETS)[number];
  /** The rule's selector, verbatim. Located by selector, never by line - lines do not survive edits. */
  selector: string;
  /** The declarations that make the box. Both, always: one alone leaves an axis free to shift. */
  width: string;
  height: string;
  /** A custom element that must still enclose the image for the selector above to match at all. */
  requiresAncestor?: string;
  why: string;
}

/**
 * Images whose box comes from the shipped cascade rather than from attributes.
 *
 * Every field is re-verified below: the rule must still exist in that sheet, with that selector,
 * carrying those two declarations, and the ancestor must still be in the markup. Weaken any one of
 * them and this goes red.
 */
const SIZED_BY_CSS: Record<string, Record<string, SizedEntry>> = {
  'lib/components/PrivateChatPanel.svelte': {
    '{avatarSrc(peer.pic, peer.emailHash, 25)}': {
      count: 1,
      sheet: 'lib/styles/captured-runtime-components.css',
      selector: 'app-privchat .avatarImg:not(:root)',
      width: '32px',
      height: '32px',
      requiresAncestor: 'app-privchat',
      why: 'the open private-chat header avatar. `avatarImg-active` narrows it to 25x25 in the same sheet; both are fixed squares, so the header never reflows. The `src` went through `avatarSrc` on 2026-08-30 for the gravatar fallback — the BOX is unchanged, which is the whole point of it being CSS.'
    },
    '{avatarSrc(tab.pic, tab.avt, 32)}': {
      count: 1,
      sheet: 'lib/styles/captured-runtime-components.css',
      selector: 'app-privchat .avatarImg:not(:root)',
      width: '32px',
      height: '32px',
      requiresAncestor: 'app-privchat',
      why: 'the per-tab avatar in the private-chat tab strip. Through `avatarSrc` since 2026-08-30; the rule that sizes it is unchanged.'
    }
  },
  'lib/components/notes/CarouselDialog.svelte': {
    '{file.url}': {
      count: 1,
      /* This component's OWN `<style>` block — see the extraction note in the verifier below. */
      sheet: 'lib/components/notes/CarouselDialog.svelte',
      selector: '.file-browser-thumb',
      width: '100%',
      height: '100px',
      why: "the carousel image browser's thumbnail. A fixed 100px row height with `object-fit: cover` is what keeps a grid of differently-shaped uploads from reflowing as each one lands — transcribed from the reference at byte 1,486,651. It moved here with the markup on 2026-08-30 when the carousel came out of `NoteEditor.svelte`."
    }
  },
  'lib/components/RoomSidebar.svelte': {
    '{user.avatarUrl}': {
      count: 1,
      sheet: 'lib/styles/captured-runtime-components.css',
      selector: 'app-room-roster .rosterImg:not(:root)',
      width: '45px',
      height: '45px',
      requiresAncestor: 'app-room-roster',
      why: 'the roster row avatar. A fixed 45px square is what keeps a roster of hundreds from reflowing as each avatar lands.'
    }
  },
  'lib/components/ModalHost.svelte': {
    '"/assets/images/google-play-badge.png"': {
      count: 1,
      sheet: 'app.css',
      selector: '.google-badge',
      width: '155px',
      height: '60px',
      why: "the Play Store badge. 155x60 is the listed badge size and matches the asset's own 646x250 to within a thousandth."
    },
    '"/assets/images/iosAppStore.svg"': {
      count: 1,
      sheet: 'app.css',
      selector: '#mobileAppInfoModal .modal-body > .d-flex a:last-child img',
      width: '119.6px',
      height: '40px',
      why: "the App Store badge, sized through its anchor. 119.6x40 is the SVG's own intrinsic size rounded to a tenth."
    },
    '{targetUserModalAvatar}': {
      count: 1,
      sheet: 'app.css',
      selector: '.edit-user-avatar img',
      width: '80px',
      height: '80px',
      why: 'the user-info modal avatar, whose container is itself fixed at 90x80.'
    }
  }
};

/**
 * Images whose intrinsic size genuinely is not knowable when the element is written.
 *
 * Every one is a remote or user-supplied picture - an upload, a paste, a Giphy result, an avatar
 * a member chose - reaching the markup as a bare URL. Inventing `width`/`height` for these would
 * not remove a shift, it would introduce a WRONG box and letterbox real content. Each is instead
 * bounded by the captured `max-width`/`max-height` that the reference itself uses.
 *
 * This is the honest half of the rule, and it is a list rather than a wildcard so that a NEW
 * undimensioned image cannot hide among them.
 */
const UNSIZEABLE: Record<string, Record<string, { count: number; why: string }>> = {
  'lib/components/AlertChatArea.svelte': {
    '{broadcasts.salesImageUrl}': {
      count: 1,
      why: 'the sales image a presenter pins over the chat box, by URL. Its container is `position: absolute` with `top/left: 0` and `width/height: 100%` in the captured sheet, so the overlay is OUT OF FLOW and no size it settles at can shift anything on the page - the same reason `TODO.md` row 7 already records for this element. The image itself is `width: 100%; height: auto` inside that fixed box.'
    }
  },
  'lib/components/FilesPane.svelte': {
    '{item.url}': {
      count: 1,
      why: 'a shared file thumbnail. `app-presentationarea .fileDriveImg` bounds it at `max-width: 200px`; the height follows the uploaded image and is not knowable here.'
    }
  },
  'lib/components/notes/CarouselDialog.svelte': {
    '{slide.url}': {
      count: 1,
      why: "the carousel slide's own preview, an image a presenter just uploaded or pasted by URL. The reference bounds it at `max-height: 140px; max-width: 100%` with `object-fit: contain` (byte 1,488,253) and gives it no box on purpose — the point of that state is to show the WHOLE image, and a fixed width or height would letterbox or crop the very thing the presenter is checking. It sits inside an already-open modal, so nothing below it can be pushed."
    }
  },
  'lib/components/GifConfirmDialog.svelte': {
    '{url}': { count: 1, why: 'the chosen Giphy image, confirmed at `width: 100%` before sending.' }
  },
  /*
    `lib/components/GiphyPicker.svelte` LEFT this catalog on 2026-08-31, which is the direction an
    entry here is supposed to move. Its `why` claimed the grid "is meant to reflow as they arrive";
    the reference has no such intent recorded anywhere — its result image is const 77,
    `[3,"dblclick","src"]`, with no box because the template gives it none, and the only sizing is
    `app-privchat img { max-width: 100% }`. Giphy states each rendition's `width` and `height`, so
    `imageBox` in `giphy-search.ts` validates them and the element now carries the pair whenever the
    payload supplies usable integers. See GIF-05 in `docs/decoded/room-surface-audit-2026-08-30.md`.
  */
  'lib/components/ImageUploadDialog.svelte': {
    '{preview}': {
      count: 1,
      why: 'a local object-URL preview of a file the member just picked. `.fileList img` bounds it at 250x250.'
    }
  },
  'lib/components/PostAlertModal.svelte': {
    '{preview}': {
      count: 1,
      why: 'the alert-attachment preview, bounded by `.fileList img` at 250x250.'
    },
    '{pastedImage.preview}': {
      count: 1,
      why: 'a screenshot pasted into the alert composer, bounded inline at `max-width: 100%; max-height: 50vh`.'
    }
  },
  'lib/components/MessageBody.svelte': {
    '{segment.url}': {
      count: 1,
      why: 'an image posted into chat. The paired `img-container` rule in `app.css` reserves the exact settled box for the uploads whose intrinsic width IS known, and deliberately leaves the rest to shrink-to-fit rather than over-reserving. Moved here with the segment renderer on 2026-08-30; the markup is unchanged.'
    }
  },
  'lib/components/RoomMessage.svelte': {
    '{item.senderAvatarUrl}': {
      count: 2,
      why: 'the message avatar, which may be a custom picture of any shape. The captured `.avatar img` gives it `width: 100%; max-width: 50px; height: auto`; forcing a square here would letterbox every non-square avatar.'
    },
    '{badge.imageUrl}': {
      count: 2,
      why: 'a user badge supplied by room configuration. `.user-badge-img` bounds it at `max-height: 20px` with `width: auto`, so badges of different aspects sit on one line.'
    }
  },
  'lib/components/RoomSidebar.svelte': {
    '{badge.imageUrl}': {
      count: 1,
      why: 'the SAME badge element on a roster row — RS-02, which rendered the wrapper and never filled it. Bounded by the same `.user-badge-img` rule as the message-log twin above, and unsizeable for the same reason: the image is room configuration of unknown aspect.'
    }
  },
  'lib/components/RoomOverlays.svelte': {
    '{chatPastePreviewUrl}': {
      count: 1,
      why: 'a pasted CHAT screenshot, bounded by `.img-fluid` plus an inline `max-height: 50vh` — the reference sets both on this one (`max-width:100%; max-height: 50vh`, byte 1,445,719) because the chat dialog is the only paste confirmation that also carries a message box beneath the picture.'
    },
    '{pastePreviewUrl}': {
      count: 1,
      why: 'a pasted swing-alert screenshot, bounded by `.img-fluid`.'
    },
    '{dayTradePastePreviewUrl}': {
      count: 1,
      why: 'a pasted day-trade screenshot, bounded by `.img-fluid`.'
    },
    '{modals.selectedImageUrl}': {
      count: 1,
      why: 'the full-size image lightbox. `.imgur-modal img` bounds it at `max-height: calc(-150px + 100vh)`, and the modal is what the viewer is looking at - there is nothing below it to push.'
    }
  },
  'lib/components/day-trade-alerts/DayTradeAlertForm.svelte': {
    '{draft.image}': {
      count: 1,
      why: 'the composer thumbnail, bounded by `.uploaded-img-preview` at `max-height: 30px`.'
    }
  },
  'lib/components/day-trade-alerts/DayTradeAlertsPane.svelte': {
    '{row.image}': {
      count: 1,
      why: 'the alert-row thumbnail, bounded by `.uploaded-alert-image` at `max-height: 30px`.'
    },
    '{previewUrl}': { count: 1, why: 'the alert image lightbox, bounded by `.img-fluid`.' }
  },
  'lib/components/swing-alerts/SwingAlertForm.svelte': {
    '{draft.image}': {
      count: 1,
      why: 'the composer thumbnail, bounded by `.uploaded-img-preview` at `max-height: 30px`.'
    }
  },
  'lib/components/swing-alerts/SwingAlertsPane.svelte': {
    '{row.image}': {
      count: 1,
      why: 'the alert-row thumbnail, bounded by `.uploaded-alert-image` at `max-height: 30px`.'
    },
    '{previewUrl}': { count: 1, why: 'the alert image lightbox, bounded by `.img-fluid`.' }
  }
};

interface FoundImage {
  file: string;
  line: number;
  src: string;
  dimensioned: boolean;
  ancestors: string[];
}

/** Every `img` the Svelte parser reports as an ELEMENT - comments and strings cannot appear here. */
function collect(file: string, source: string): FoundImage[] {
  const found: FoundImage[] = [];
  const ast = parse(source, { modern: true, filename: file });

  const visit = (node: unknown, ancestors: string[]): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child, ancestors);
      return;
    }
    const element = node as {
      type?: string;
      name?: string;
      start?: number;
      attributes?: { type: string; name: string; start: number; end: number }[];
    };
    let next = ancestors;

    if (element.type === 'RegularElement' && element.name) {
      if (element.name.startsWith('app-')) next = [...ancestors, element.name];

      if (element.name === 'img') {
        const attributes = element.attributes ?? [];
        const named = new Set(attributes.filter((a) => a.type === 'Attribute').map((a) => a.name));
        const read = (name: string) => {
          const match = attributes.find((a) => a.type === 'Attribute' && a.name === name);
          return match ? source.slice(match.start, match.end) : '';
        };
        const style = read('style');
        found.push({
          file,
          line: source.slice(0, element.start ?? 0).split('\n').length,
          src: read('src').replace(/^src=/, ''),
          dimensioned: (named.has('width') && named.has('height')) || /aspect-ratio/.test(style),
          ancestors
        });
      }
    }

    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      visit((node as Record<string, unknown>)[key], next);
    }
  };

  visit((ast as { fragment: unknown }).fragment, []);
  return found;
}

const COMPONENTS = globSync('**/*.svelte', { cwd: ROOT }).sort();

const ALL_IMAGES = COMPONENTS.flatMap((file) =>
  collect(file, readFileSync(`${ROOT}${file}`, 'utf8'))
);

describe('every <img> has a box before its bytes arrive', () => {
  it('reads the sheets that actually ship, and every one of them exists', () => {
    /*
      `SHEETS` is the cascade this file reasons about, and asserting it here is what stops it being
      a decorative list. `app.css` imports the other three - so if one is renamed or dropped, a
      `SIZED_BY_CSS` entry pointing at it would fail with a confusing "no rule for that selector"
      rather than with the truth, which is that the sheet is gone.

      `eslint` is what turned this from a comment into a test: `SHEETS` was used only as the source
      of a TypeScript union, and `no-unused-vars` was right that a value nothing reads at runtime is
      not carrying its weight.
    */
    for (const sheet of SHEETS) {
      const contents = readFileSync(`${ROOT}${sheet}`, 'utf8');
      expect(contents.length, `${sheet} is empty`).toBeGreaterThan(0);
    }

    /* And that `app.css` is still what pulls the other three in, which is why they are "shipped". */
    const appCss = readFileSync(`${ROOT}app.css`, 'utf8');
    for (const sheet of SHEETS.filter((name) => name !== 'app.css')) {
      expect(appCss, `app.css no longer imports ${sheet}`).toContain(
        sheet.startsWith('../') ? sheet : `./${sheet}`
      );
    }
  });

  it('finds images at all, and finds them as ELEMENTS rather than as text', () => {
    /*
      The floor that stops this whole file from passing vacuously. If the parser walk breaks - a
      renamed AST node type, a `fragment` that moved - every assertion below turns into a loop over
      an empty list and reports success. `unfed-props-contract.test.ts` learned this the hard way:
      a mutated matcher left five green tests measuring nothing.
    */
    expect(ALL_IMAGES.length).toBeGreaterThan(30);

    /*
      And the specific claim the AST buys us over a regex: `SwingAlertsPane.svelte` contains a
      FOURTH `img` tag inside a comment transcribing the reference's bootbox, and the parser must
      NOT report it. Three are in that file's markup; the transcription is prose.

      The transcription's `src` is the template placeholder the reference interpolates, so asserting
      no image carries it is the direct statement that a comment was not read as markup - which a
      text scan of this file cannot say.
    */
    const pane = ALL_IMAGES.filter((i) => i.file.endsWith('swing-alerts/SwingAlertsPane.svelte'));
    expect(pane.map((i) => i.src)).toEqual([
      '{row.image}',
      '{row.senderPic ||\n                      `https://secure.gravatar.com/avatar/${row.senderAvt}?d=mm&s=30`}',
      '{previewUrl}'
    ]);
    expect(pane.some((i) => i.src.includes('${e}'))).toBe(false);
  });

  it('accounts for every undimensioned image, with no fourth state', () => {
    const unaccounted = ALL_IMAGES.filter((image) => {
      if (image.dimensioned) return false;
      return !SIZED_BY_CSS[image.file]?.[image.src] && !UNSIZEABLE[image.file]?.[image.src];
    }).map((image) => `${image.file}:${image.line}  src=${image.src}`);

    expect(
      unaccounted,
      'a new <img> arrived with no width/height, no aspect-ratio, and no catalogued reason. ' +
        'Give it dimensions, or add it to SIZED_BY_CSS naming the rule that sizes it, or to ' +
        'UNSIZEABLE saying why its size cannot be known here.'
    ).toEqual([]);
  });

  it('keeps both catalogs honest - no entry outlives the image it describes', () => {
    const live = new Map<string, number>();
    for (const image of ALL_IMAGES) {
      if (image.dimensioned) continue;
      const key = `${image.file} ${image.src}`;
      live.set(key, (live.get(key) ?? 0) + 1);
    }

    const catalogued: [string, string, number][] = [];
    for (const [file, entries] of Object.entries(SIZED_BY_CSS))
      for (const [src, entry] of Object.entries(entries)) catalogued.push([file, src, entry.count]);
    for (const [file, entries] of Object.entries(UNSIZEABLE))
      for (const [src, entry] of Object.entries(entries)) catalogued.push([file, src, entry.count]);

    const stale = catalogued
      .filter(([file, src, count]) => live.get(`${file} ${src}`) !== count)
      .map(
        ([file, src, count]) =>
          `${file}  ${src}  catalogued ${count}, found ${live.get(`${file} ${src}`) ?? 0}`
      );

    expect(
      stale,
      'a catalog entry no longer matches the markup. If the image was dimensioned or deleted, ' +
        'delete its entry; if more were added, the count is the assertion and must be raised ' +
        'deliberately.'
    ).toEqual([]);
  });

  it('proves every SIZED_BY_CSS rule still exists, still sizes, and still reaches its image', () => {
    for (const [file, entries] of Object.entries(SIZED_BY_CSS)) {
      for (const [src, entry] of Object.entries(entries)) {
        /*
          A `.svelte` sheet is that component's OWN `<style>` block, extracted before parsing.
          Added 2026-08-30 for the note editor's image browser, whose four rules are transcribed from
          the reference's component-scoped block (`[_ngcontent-%COMP%]`) into the Svelte `<style>`
          that gives the same scoping — which is where this component already keeps its other
          transcribed rules. Registering those in a shared sheet instead would have moved them away
          from the markup they scope to, purely to satisfy a verifier that had never met one.
        */
        const raw = readFileSync(`${ROOT}${entry.sheet}`, 'utf8');
        /*
          Membership in `SCOPED_SHEETS`, not the file EXTENSION. The first version tested
          `.endsWith('.svelte')`, which works and leaves that constant used only as a type — so a
          path added to the list without being handled here, or handled here without being listed,
          would both compile. One test, one source of truth.
        */
        const sheet = (SCOPED_SHEETS as readonly string[]).includes(entry.sheet)
          ? /*
              Anchored at column zero, which is where Svelte's single `<style>` block lives — and it
              has to be: the first draft matched the first `<style>` ANYWHERE and found one inside a
              comment that quotes the tag, so postcss was handed the component's markup and threw on
              `file.name`. A component may have only one style element, so the anchored match is
              exact rather than merely luckier.
            */
            (/^<style>\n([\s\S]*)\n<\/style>/m.exec(raw)?.[1] ?? '')
          : raw;
        const declarations = new Map<string, string>();
        let seen = false;

        postcss.parse(sheet, { from: entry.sheet }).walkRules((rule) => {
          if (!rule.selectors.includes(entry.selector)) return;
          seen = true;
          for (const node of rule.nodes)
            if (node.type === 'decl') declarations.set(node.prop, node.value);
        });

        expect(seen, `${entry.sheet} no longer carries a rule for \`${entry.selector}\``).toBe(
          true
        );
        expect(declarations.get('width'), `${entry.selector} width`).toBe(entry.width);
        expect(declarations.get('height'), `${entry.selector} height`).toBe(entry.height);

        /*
          The load-bearing half. The captured sheet ships an Angular-scoped twin of most of these
          (`.avatarImg[_ngcontent-ng-c3142977328]`) which matches nothing in this app, so the rule
          that DOES apply is the one keyed on the custom element - and it applies only while that
          element is still in the markup around the image.
        */
        if (entry.requiresAncestor) {
          const images = ALL_IMAGES.filter((i) => i.file === file && i.src === src);
          expect(images.length, `${file} no longer renders an img with src=${src}`).toBe(
            entry.count
          );
          for (const image of images)
            expect(
              image.ancestors,
              `\`${entry.selector}\` only matches inside <${entry.requiresAncestor}>, and ` +
                `${file}:${image.line} is no longer inside one - the image silently loses its box`
            ).toContain(entry.requiresAncestor);
        }
      }
    }
  });

  it('renders no image whose asset is absent from the repository', () => {
    /*
      What this sweep actually found: `RoomNavbar.svelte` rendered `/assets/images/playing.gif` on
      every SoundCloud play, and that file is not here. The string IS in the captured bundle, so the
      markup was a faithful transcription - only the JavaScript and CSS were ever captured, never
      the image assets. The result was a broken image in the navbar for every member.

      `/assets/images/benzinga-logo.png` is absent for the same reason and is NOT a defect: no
      branch renders it, because `RoomSidebar.svelte` already resolved that one to an icon form and
      recorded why. That is the precedent this now enforces for both.
    */
    const missing: string[] = [];
    for (const image of ALL_IMAGES) {
      const literal = image.src.match(/^"(\/assets\/[^"]+)"$/);
      if (!literal) continue;
      try {
        readFileSync(`${ROOT}../static${literal[1]}`);
      } catch {
        missing.push(`${image.file}:${image.line}  ${literal[1]}`);
      }
    }
    expect(
      missing,
      'an <img> points at an asset this repository does not contain, so it renders broken. ' +
        'Add the asset, or take the icon form the way RoomSidebar did for benzinga-logo.png.'
    ).toEqual([]);
  });
});
