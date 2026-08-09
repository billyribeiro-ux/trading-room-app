import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  The manage page's user row, pinned against `ptr1.json` `caps[0]` (`baseline-room`) — the only
  capture that has real rows in it. A later live capture rendered zero rows, so nothing else in the
  evidence describes this markup.

  Every assertion below corresponds to something that was WRONG and is now right. The row was
  functionally correct throughout — right opcodes, right labels — and looked nothing like the
  original, because the differences were all in placement, icons and colour.
*/

const page = readFileSync(new URL('../routes/(app)/account/rooms/[id]/+page.svelte', import.meta.url), 'utf8');
const css = readFileSync(new URL('../manage.css', import.meta.url), 'utf8');

/** The template with comments stripped — so an assertion can never match its own documentation. */
const markup = page.replace(/<!--[\s\S]*?-->/g, '');

/**
 * The Nth `<td` of the MEMBER row, 1-based.
 *
 * `split` puts everything BEFORE the first `<td` in `parts[0]`, so the first cell is `parts[1]` and
 * the Nth is `parts[n]`. Indexing this `parts[n + 1]` shifted every assertion one cell to the right
 * and two of them still passed — which is exactly how a placement test lies.
 */
function cell(n: number) {
  const rowAt = markup.indexOf('{#each data.users as member, i (member.id)}');
  expect(rowAt).toBeGreaterThan(-1);
  const parts = markup.slice(rowAt).split(/<td[ >]/);
  return parts[n] ?? '';
}

describe('the row number cell', () => {
  it('prints $index, zero-based, and holds nothing else', () => {
    /*
      The three captured rows read "0", "1", "2", and that td has no child elements at all.

      Scoped to THIS row: `i + 1` is still correct in the CSV export and in the User Stats table,
      whose own numbering the capture does not settle. A global assertion would have failed on both
      and invited "fixing" a table nobody has evidence about.
    */
    expect(cell(1)).toContain('{i}');
    expect(cell(1)).not.toContain('{i + 1}');
  });
});

describe('cell placement', () => {
  it('puts the select checkbox in Name/Email, not in the number cell', () => {
    // Its rect is x=104.3 — the Name/Email td's own x plus that td's 8px padding.
    expect(cell(2)).toContain('type="checkbox"');
    expect(cell(1)).not.toContain('type="checkbox"');
  });

  it('puts the five permission icons in Name/Email, not in Role/Status', () => {
    expect(cell(2)).toContain('fa-microphone');
    expect(cell(2)).toContain('fa-video-camera');
    expect(cell(4)).not.toContain('fa-microphone');
  });

  it('puts INACTIVE and PMs-disabled in Last Login/Notes, not in Name/Email', () => {
    expect(cell(3)).toContain('*** INACTIVE USER ***');
    expect(cell(3)).toContain('User PMs disabled');
    expect(cell(2)).not.toContain('*** INACTIVE USER ***');
  });

  it('keeps PW set and the phone BELOW the <br>, where the email is', () => {
    const nameCell = cell(2);
    const br = nameCell.indexOf('<br />');
    expect(br).toBeGreaterThan(-1);
    expect(nameCell.indexOf('PW set')).toBeGreaterThan(br);
    expect(nameCell.indexOf('member.phone')).toBeGreaterThan(br);
  });

  it('puts the name IMMEDIATELY after the avatar, before Discord and TRIAL', () => {
    /*
      The rendered row is `<img …>Billy Ribeiro` with no element between them, and the Discord line
      and TRIAL badge follow the NAME. Ours emitted both of those first, so the name appeared after
      them. Established from the owner's own copy of the cell, which outranks any reconstruction.
    */
    const nameCell = cell(2);
    expect(nameCell).toContain('/>{member.displayName}');
    expect(nameCell.indexOf('{member.displayName}')).toBeLessThan(nameCell.indexOf('mg-discord'));
    expect(nameCell.indexOf('{member.displayName}')).toBeLessThan(nameCell.indexOf('badge-danger-chat'));
  });
});

describe('the icons in the Name/Email cell', () => {
  it('carries no invented title attributes on the five permission icons', () => {
    /*
      "Microphone" / "WebCam" / "Screenshare" / "AdminChat" / "CanEditNotes" were titles I made up.
      The rendered markup carries NO title on those five; only the archives icon has one, and it is
      exactly "Denied Archives Access".
    */
    const nameCell = cell(2);
    for (const invented of ['Microphone', 'WebCam', 'Screenshare', 'AdminChat', 'CanEditNotes']) {
      expect(nameCell).not.toContain(`title="${invented}"`);
    }
    expect(nameCell).toContain('title="Denied Archives Access"');
  });

  it('marks every icon aria-hidden, as the rendered row does', () => {
    const nameCell = cell(2);
    for (const glyph of [
      'fa-microphone',
      'fa-video-camera',
      'fa-desktop',
      'fa-comment-o',
      'fa-pencil-square-o',
      'fa-hdd-o'
    ]) {
      const at = nameCell.indexOf(glyph);
      expect(at).toBeGreaterThan(-1);
      expect(nameCell.slice(at, nameCell.indexOf('>', at))).toContain('aria-hidden="true"');
    }
  });

  it('leads PW set and the phone with the ICON, not the label', () => {
    // `&nbsp;&nbsp;&nbsp;&nbsp;<i class="fa fa-lock" …></i> PW set` — four non-breaking spaces, the
    // padlock, THEN the words. Ours read "PW set" first with no leading space.
    const nameCell = cell(2);
    const pw = nameCell.slice(nameCell.indexOf('member.hasPassword'));
    expect(pw.indexOf('fa-lock')).toBeLessThan(pw.indexOf('PW set'));
    expect(pw).toContain('&nbsp;&nbsp;&nbsp;&nbsp;');
  });
});

describe('row status colours', () => {
  it('renders CHAT MUTED and BANNED ALONGSIDE the role, in red', () => {
    /*
      `roleLabel` used to RETURN these strings, which replaced the role — a banned participant
      showed only "BANNED" and lost their actual role. The reference's spans are `ng-show`n beside
      the role span, not instead of it.
    */
    expect(markup).toContain('<span class="mg-red">CHAT MUTED</span>');
    expect(markup).toContain('<span class="mg-red">BANNED</span>');
    expect(markup).not.toContain("if (u.role === 3) return 'CHAT MUTED'");
  });

  it('puts the TRIAL badge on badge-danger-chat, which is the one that is red', () => {
    // `.badge-danger` is a Bootstrap 4 name on a Bootstrap 3 sheet and has NO rule, so the badge
    // rendered in the plain grey `.badge` fill.
    expect(markup).toContain('badge badge-danger-chat mg-trial');
  });
});

describe('no dead scaffolding', () => {
  /*
    Every class this row introduces must have a rule that applies. A class in the markup with no
    CSS reads as "handled" to the next person to look at it, and `acc-th-sort` shipped exactly that
    way on the account page.
  */
  for (const name of [
    'mg-red',
    'mg-trial',
    'mb-sm',
    'dropdown-submenu',
    'dropdown-menu-right',
    'badge-danger-chat',
    'thumb24'
  ]) {
    it(`.${name} has a rule in manage.css`, () => {
      expect(css).toMatch(new RegExp(`\\.mg-root\\s+[^{}]*\\.${name}(?![\\w-])[^{}]*\\{`));
    });
  }
});

describe('the row menu', () => {
  it('anchors to the right and is a menu', () => {
    // Measured: the menu's right edge sits exactly on the button's, both at 1615.9.
    expect(markup).toContain('class="dropdown-menu dropdown-menu-right" role="menu"');
  });

  it('carries the four submenu glyphs and their carets', () => {
    for (const glyph of ['fa-shield', 'fa-sliders', 'fa-mobile', 'fa-certificate']) {
      // The ROW menu carries no `icon` class — only the BULK menu does (file2:265-408 vs :136).
      expect(markup).toContain(`<i class="fa ${glyph}"></i>`);
    }
    expect(markup.split('fa fa-caret-right pull-right').length - 1).toBe(4);
  });

  it('opens the permissions modal from inside Granular Perms, gated on role !== 1', () => {
    /*
      The reference nests `Adjust Mic/Cam/Screen/Chat/Notes` as the FIRST item of Granular Perms,
      under `ng-show="user.role !== 1"`. Ours had it at the menu's top level with no gate — one
      level up from where it belongs and offered for a role the reference excludes.
    */
    const granularAt = markup.indexOf("openSubmenu === 'granular' ? null : 'granular'");
    const adjustAt = markup.indexOf('Adjust Mic/Cam/Screen/Chat/Notes');
    expect(granularAt).toBeGreaterThan(-1);
    expect(adjustAt).toBeGreaterThan(granularAt);
    expect(markup.split('Adjust Mic/Cam/Screen/Chat/Notes').length - 1).toBe(1);
  });

  it('restores the dividers — the reference has 8 per row menu, we had 2', () => {
    const rowAt = markup.indexOf('{#each data.users as member, i (member.id)}');
    const menu = markup.slice(rowAt);
    expect(menu.split('class="divider" role="separator"').length - 1).toBeGreaterThanOrEqual(6);
  });
});
