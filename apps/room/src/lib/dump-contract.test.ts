import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';
import { DIRECT_EVIDENCE_CONTRACT } from './direct-evidence-contract';
import { DUMP_CONTRACT } from './dump-contract';
import { EMOJI_DUMP_DATA } from './emoji-data';

function sha256(path: URL) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function text(path: URL) {
  return readFileSync(path, 'utf8');
}

describe('part 1 capture contract', () => {
  it('accounts for the measured desktop columns', () => {
    const { sidebarWidth, primaryColumnWidth, splitGutterWidth, presentationColumnWidth } =
      DUMP_CONTRACT.baseline;

    expect(sidebarWidth + primaryColumnWidth + splitGutterWidth + presentationColumnWidth).toBe(
      DUMP_CONTRACT.viewport.width
    );
  });

  it('accounts for the measured room height below the top bar', () => {
    const { alertsHeight, splitGutterWidth, chatHeight, topbarHeight } = DUMP_CONTRACT.baseline;

    expect(alertsHeight + splitGutterWidth + chatHeight + topbarHeight).toBe(
      DUMP_CONTRACT.viewport.height
    );
  });

  it('retains all 58 captured states from the supplied part', () => {
    expect(DUMP_CONTRACT.captureCount).toBe(58);
  });

  it('pins the supplied dump byte-for-byte', () => {
    expect(
      sha256(
        new URL('../../proroom-ULTIMATE-staff-2026-07-24T12-42-02-part1.json', import.meta.url)
      )
    ).toBe('dd1b773cf505ad291886bad1fb04180004ee8feb5bbfc5f0a9e1078c4fd97225');
  });

  it('pins the recovered deployed stylesheet byte-for-byte', () => {
    expect(sha256(new URL('../../docs/source/styles.d622cb9ed2bbc221.css', import.meta.url))).toBe(
      '0f9482210ab4e57898b2a11979dcd37c299d9f4e05e4f8910c6115e46a6a8ffa'
    );
  });

  it('pins the deployed bundle and the three clean populated-message references', () => {
    expect(sha256(new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url))).toBe(
      '1d9e55b58075b78ec61a389c672aa40d7d2ccd691621562461bcda0ff5fdc850'
    );
    expect(sha256(new URL('../../alert-section/1.html', import.meta.url))).toBe(
      '0b8bc8e714e6511ebbe2f973a53126cdc7ea775299aff943345f25e071f93fa4'
    );
    expect(sha256(new URL('../../alert-section/2.html', import.meta.url))).toBe(
      'd223acf4f7e5b9c0fa64dd49fe190476e84f81e75ffc92838c53fdc2531d89da'
    );
    expect(sha256(new URL('../../alert-section/3.html', import.meta.url))).toBe(
      '0a5f72b8c8ec4f99c4fe8db3cddbda2ec2e4a156797d76536bbd49b26cc5edfb'
    );
  });

  it('pins the deployed index, companion assets, and decoded app-st-message source', () => {
    const evidence = {
      '../../docs/source/deployed-index.html':
        '7afd09a14bd8fb904f662508c8e4c0777aa7fa69fbcc2a608978399a40171fc9',
      '../../docs/source/scripts.38973a242454fb27.js':
        'e24c0534fee07207c60dedbc48e7cb17298726b922bb56e2cc9e6f55c537c7cd',
      '../../docs/source/runtime.b70e5d3ff558bfdf.js':
        'f7a9f182dd4f63c790f8037c4db63a0472733aa1faa02f33a22ee4d9c1816e52',
      '../../docs/source/polyfills.95db17d6d6f4b89d.js':
        '2779452ed0d9088b4730ba342f85a5ac1bc548a77dcfd751059212aa2d16e7ba',
      '../../docs/source/app-st-message.component.css':
        '538caba947070d791bfefb5f995788469f84bdf14f769f69dd94394a773781f1',
      '../../docs/source/app-st-message.compiled.js':
        '61f28a5dad2297eabf3f3e4281dd948ef3951de9a18df75d33c6dd54f4a99382'
    };

    for (const [path, hash] of Object.entries(evidence)) {
      expect(sha256(new URL(path, import.meta.url))).toBe(hash);
    }
  });

  it('pins the user-supplied logo byte-for-byte', () => {
    expect(sha256(new URL('../../static/assets/images/ptr_logo.png', import.meta.url))).toBe(
      '3bb962577a82302b8e26354cc34b9e8473eadfac91749bf7387a7257f59e4408'
    );
  });

  it('keeps the decoded active composer underline without restoring a focus wrapper', () => {
    const sourceCss = text(new URL('../../css/complete-app-styles.css', import.meta.url));
    const css = text(new URL('../app.css', import.meta.url));

    expect(DIRECT_EVIDENCE_CONTRACT.composerFocus).toEqual({
      selector: '.txt-area:focus',
      borderColor: 'var(--darker-gray)',
      boxShadow: '1px 1px 1px var(--darker-gray)',
      bootstrapFocusRing: false
    });
    expect(sourceCss).toContain(
      '.txt-area[_ngcontent-ng-c3761163150]:focus { border-color: var(--darker-gray); box-shadow: 1px 1px 1px var(--darker-gray); }'
    );
    expect(css.match(/box-shadow: 1px 1px 1px var\(--darker-gray\);/g)).toHaveLength(2);
    expect(css).not.toContain('box-shadow: 0 0 0 0.25rem var(--bs-focus-ring-color)');
  });

  it('mounts the SvelteKit body inside the framework-recommended transparent wrapper', () => {
    const appHtml = text(new URL('../app.html', import.meta.url));

    expect(appHtml).toContain('<div style="display: contents">%sveltekit.body%</div>');
  });

  it('sizes the emoji picker with upstream’s formula instead of pinning one capture’s pixels', () => {
    const css = text(new URL('../app.css', import.meta.url));
    const picker = text(new URL('../lib/components/EmojiPicker.svelte', import.meta.url));
    const emojiSource = text(new URL('../../emojis', import.meta.url));
    const { emojiPicker } = DIRECT_EVIDENCE_CONTRACT;

    expect(emojiPicker).toEqual({
      dumpSha256: '7b91da2971d1b1dbf332750d195ede2e6a53201578ac276c343e08821e3cf275',
      perLine: 9,
      emojiSize: 24,
      baseWidth: 338,
      observedWidths: { overlayScrollbar: 338, classicScrollbar: 353 },
      height: 425.188,
      spriteSheet:
        'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@14.0.0/img/apple/sheets-256/64.png',
      categoryCount: 9,
      renderedEmojiElements: 1823
    });
    expect(sha256(new URL('../../emojis', import.meta.url))).toBe(emojiPicker.dumpSha256);
    expect(emojiSource).toContain(emojiPicker.spriteSheet);

    // The two captured widths are the same formula with a different scrollbar term.
    const base = emojiPicker.perLine * (emojiPicker.emojiSize + 12) + 12 + 2;
    expect(base).toBe(emojiPicker.baseWidth);
    expect(base).toBe(emojiPicker.observedWidths.overlayScrollbar);
    expect(base + 15).toBe(emojiPicker.observedWidths.classicScrollbar);
    expect(emojiSource).toContain(
      `<section class="emoji-mart emoji-mart-dark" style="width: ${emojiPicker.observedWidths.classicScrollbar}px;">`
    );

    // The component measures the scrollbar rather than hardcoding either total, and the
    // stylesheet no longer re-pins the widths that would fight it.
    expect(picker).toContain('probe.offsetWidth - probe.clientWidth');
    expect(picker).toContain('style="width: {pickerWidth}px;"');
    expect(picker).not.toContain('style="width: 338px;"');
    expect(css).not.toContain('.emoji-mart {\n  width: 338px;');
    expect(css).not.toContain('.emoji-mart-scroll {\n  width: 336px;');
    expect(css).not.toContain('.emoji-mart-category {\n  width: 324px;');
  });

  it('leaves the emoji picker’s captured geometry to the upstream stylesheet', () => {
    // Comments are stripped so these assert on real declarations, not on the prose
    // in app.css that explains why the declarations were removed.
    const css = text(new URL('../app.css', import.meta.url)).replace(/\/\*[\s\S]*?\*\//g, '');

    /*
      Each of these overrides contradicted
      first-dump/decoded/01-caps/53-emoji-popover:0/nodes.json. `top: 10px` and `top: 26px`
      were applied on top of an upstream `transform: translateY(-50%)` that they never
      reset, so the preview emoji and the skin swatches drew 25px and 9px high; the
      captured computed `top` for both is 35px.
    */
    expect(css).not.toContain('.emoji-mart-preview-emoji {\n  position: absolute;\n  top: 10px;');
    expect(css).not.toContain('.emoji-mart-preview-skins {\n  position: absolute;\n  top: 26px;');
    expect(css).not.toContain('.emoji-mart-anchor svg');
    expect(css).not.toContain('.emoji-mart-category-label > span');

    // Only the two rules the capture proves upstream does not supply survive.
    expect(css).toContain("font-family: -apple-system, 'system-ui', 'Helvetica Neue', sans-serif;");
    expect(css).toContain('.emoji-mart-search-icon:disabled');

    // Search hides whole categories the way handleSearch() does, so the per-cell
    // filtering class this build used to invent is gone.
    expect(css).not.toContain('emoji-filtered');
  });

  it('ports the deployed picker’s search, skin and frequently-used constants verbatim', () => {
    const picker = text(new URL('../lib/components/EmojiPicker.svelte', import.meta.url));
    const bundle = text(new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url));

    // Each constant is asserted against the bundle it was read from, so a re-extraction
    // that disagrees with the deployed picker fails here rather than silently drifting.
    expect(bundle).toContain('maxResults=75');
    expect(bundle).toContain('perLine=9');
    expect(bundle).toContain('emojiSize=24');
    expect(bundle).toContain('totalFrequentLines=4');
    expect(bundle).toContain('NAMESPACE="emoji-mart"');
    expect(picker).toContain('const MAX_RESULTS = 75');
    expect(picker).toContain('const PER_LINE = 9');
    expect(picker).toContain('const EMOJI_SIZE = 24');
    expect(picker).toContain('const TOTAL_FREQUENT_LINES = 4');
    expect(picker).toContain("const NAMESPACE = 'emoji-mart'");

    // getSpritePosition() divides by sheetColumns - 1 on BOTH axes.
    expect(bundle).toContain(
      'getSpritePosition(e,i){const[o,s]=e,r=100/(i-1);return`${r*o}% ${r*s}%`}'
    );
    expect(picker).toContain('100 / (EMOJI_DUMP_DATA.sprite.columns - 1)');

    // buildSearch() splits everything except emoticons, and search() keeps two terms.
    expect(bundle).toContain('l(e,!0),l(i,!0),l(o,!0),l(s,!0),l(r,!1)');
    expect(picker).toContain('add(entry.emoticons, false)');
    expect(picker).toContain('terms = [terms[0], terms[1]]');

    // The DEFAULTS row is what the dump captured as Frequently Used.
    const recent = EMOJI_DUMP_DATA.categories.find((category) => category.name === 'Recent');
    expect(recent?.entries.map((entry) => entry?.id)).toEqual([
      '+1',
      'grinning',
      'kissing_heart',
      'heart_eyes',
      'laughing',
      'stuck_out_tongue_winking_eye',
      'sweat_smile',
      'joy',
      'scream'
    ]);
  });

  it('recomposes every captured sprite cell byte for byte', () => {
    const sheet = EMOJI_DUMP_DATA.sprite.url;
    const emojiSource = text(new URL('../../emojis', import.meta.url));
    const compose = (size: number, position: string) =>
      `width: ${size}px; height: ${size}px; display: inline-block; ` +
      `background-image: url("${sheet}"); background-size: 6100% 6000%; ` +
      `background-position: ${position};`;

    /*
      emoji-data.ts stores only the size and background-position; the rest of each cell is
      the same ~200 characters every time. This proves the stored pair still rebuilds the
      exact string the dump contains, for all 1820 cells plus the preview and no-results.

      The dump is HTML, so the quotes inside url(...) are written as &quot; - the styles
      are decoded once here rather than re-encoding every expected string.
    */
    const captured = new Set(
      [...emojiSource.matchAll(/<span style="(width: \d+px;[^"]*)">/g)].map((match) =>
        match[1].replaceAll('&quot;', '"')
      )
    );
    const cells = [
      ...EMOJI_DUMP_DATA.categories.flatMap((category) => category.entries),
      EMOJI_DUMP_DATA.preview,
      EMOJI_DUMP_DATA.noResults
    ].filter((entry) => entry !== null);

    expect(cells).toHaveLength(1820);
    expect(captured.size).toBeGreaterThan(0);

    const missing = cells
      .map((entry) => compose(entry.size, entry.spritePosition))
      .filter((style) => !captured.has(style));
    expect(missing).toEqual([]);
  });

  it('pins the presenter composer actions and the exact source-proven expansion logic', () => {
    const compiledChat = text(
      new URL('../../docs/source/components/app-chat.compiled.js', import.meta.url)
    );
    const pageSource = text(new URL('../routes/+page.svelte', import.meta.url));

    expect(DIRECT_EVIDENCE_CONTRACT.composerActions).toEqual({
      initialExpanded: false,
      expandAtWidth: 400,
      collapsedIconClass: 'fas fa-plus',
      collapsedTooltip: 'Show message options',
      collapsedTooltipPlacement: 'left',
      clickBehavior: 'open-only',
      canPostImages: '(isPresenter || sessData.userUploads)',
      presenterOrder: ['Add Emojis', 'Upload an Image', 'Play YouTube For All', 'Search for GIFs'],
      youtubeModalTarget: '#play-youtube-modal',
      giphyRating: 'pg'
    });
    expect(compiledChat).toContain('(this.showMessageOptions = !1)');
    expect(compiledChat).toContain(
      'this.showMessageOptions = this.chatWidth?.nativeElement?.offsetWidth >= 400;'
    );
    expect(compiledChat).toContain('toggleMessageOptions() {\n      this.showMessageOptions = !0;');
    expect(compiledChat).toContain(
      '(this.isPresenter || this.appService.globals.sessData.userUploads) &&\n          (this.canPostImages = !0)'
    );
    expect(pageSource).toContain('let showMessageOptions = $state(false);');
    expect(pageSource).toContain('onclick={() => (showMessageOptions = true)}');

    // The captured `offsetWidth >= 400` threshold is still honoured, but it is now applied by a
    // container query so the server paints the correct button set instead of a ResizeObserver
    // swapping it in a frame after hydration (which is visible as a flicker). `#textAreaHolder`
    // is the query container and carries `padding: 5px` on each side, while the measured element
    // was its single child filling the content box - hence 400px on the child is 410px on the
    // container. The observer keeps only the captured collapse-when-narrow behaviour.
    const appCss = text(new URL('../app.css', import.meta.url));
    expect(appCss).toContain('#textAreaHolder {\n  container-type: inline-size;\n}');
    expect(appCss).toContain('@container (width < 410px)');
    expect(appCss).toContain('@container (width >= 410px)');
    expect(pageSource).toContain('if (node.offsetWidth >= 400) return;');
    expect(pageSource).toContain("ngbtooltip: 'Show message options'");
    expect(pageSource).toContain('data-bs-target="#play-youtube-modal"');
  });

  it('keeps every Svelte form field addressable with unique literal ids', () => {
    const audit = text(new URL('../../scripts/audit-svelte-form-fields.mjs', import.meta.url));

    expect(audit).toContain('Fields missing both id and name:');
    expect(audit).toContain('Duplicate literal field ids:');
  });

  it('keeps the direct populated-room geometry separate from the part-1 baseline', () => {
    expect(DIRECT_EVIDENCE_CONTRACT.populatedRoom).toEqual({
      primaryFlex: 'calc(25.5107% - 2.80618px)',
      presentationFlex: 'calc(74.4893% - 8.19382px)',
      primaryPercent: 25.5107,
      alertsFlex: 'calc(40.1365% - 4.41502px)',
      chatFlex: 'calc(59.8635% - 6.58498px)'
    });
    expect(DUMP_CONTRACT.baseline.primaryColumnWidth).toBe(556.5);
  });

  it('pins the direct root host inventory in screenshot order', () => {
    expect(DIRECT_EVIDENCE_CONTRACT.rootHostOrder).toHaveLength(26);
    expect(DIRECT_EVIDENCE_CONTRACT.rootHostOrder[14]).toBe('app-followed-users-modal');
    expect(DIRECT_EVIDENCE_CONTRACT.rootHostOrder[17]).toBe('app-followed-users-modal');
    expect(DIRECT_EVIDENCE_CONTRACT.rootHostOrder.at(-1)).toBe('app-privchat');
  });

  it('renders every root host in the evidence order without dropping closed components', () => {
    const modalHostSource = text(new URL('components/ModalHost.svelte', import.meta.url));
    const pageSource = text(new URL('../routes/+page.svelte', import.meta.url));
    const modalHosts = [...modalHostSource.matchAll(/^<(app-[a-z0-9-]+)/gm)].map(
      (match) => match[1]
    );

    expect([...modalHosts, pageSource.includes('<app-privchat') && 'app-privchat']).toEqual(
      DIRECT_EVIDENCE_CONTRACT.rootHostOrder
    );
  });

  it('pins every supplied app-st-message state count without seeding sample identities', () => {
    expect(DIRECT_EVIDENCE_CONTRACT.suppliedMessageStates).toEqual({
      alertMessages: 8,
      alertDateSeparators: 2,
      alertStockSpans: 3,
      alertUploadedImages: 1,
      alertQuestionCountBadges: 1,
      alertAnsweredChecks: 1,
      chatMessages: 10,
      chatDateSeparators: 2,
      chatAdminReverseRows: 6,
      chatQuestionRows: 4
    });

    const pageSource = text(new URL('../routes/+page.svelte', import.meta.url));
    expect(pageSource).not.toContain('Billy Ribeiro');
    expect(pageSource).not.toContain('Welber');
  });

  it('pins the decoded app-st-message source, menus, and exact action copy', () => {
    const contract = DIRECT_EVIDENCE_CONTRACT.appStMessage;
    const capturedFixture = JSON.parse(
      text(new URL('server/captured-message-fixture.json', import.meta.url))
    ) as { sourceSha256: string };

    expect(
      sha256(new URL('../../docs/source/components/app-st-message.full.js', import.meta.url))
    ).toBe(contract.decodedSourceSha256);
    expect(
      sha256(
        new URL('../../docs/source/components/app-st-message.render-helpers.js', import.meta.url)
      )
    ).toBe(contract.renderHelpersSha256);
    expect(
      sha256(new URL('../../docs/source/components/app-st-message.component.css', import.meta.url))
    ).toBe(contract.componentCssSha256);
    expect(sha256(new URL('../../app-room/complete.html', import.meta.url))).toBe(
      contract.rawPopulatedDomSha256
    );
    expect(sha256(new URL('server/captured-message-fixture.json', import.meta.url))).toBe(
      contract.capturedFixtureSha256
    );
    expect(capturedFixture.sourceSha256).toBe(contract.rawPopulatedDomSha256);

    expect(contract.kebabText).toBe('⠇ ');
    expect(contract.presenterAlertMenu).toEqual([
      'Delete Message',
      'Mute Chat for 24hrs',
      'User Info',
      'Mention',
      'Show message to all',
      'Alert Send Report',
      'Copy',
      'Private Chat'
    ]);
    expect(contract.presenterAdminChatMenu).not.toContain('Mute Chat for 24hrs');
    expect(contract.muteConfirm).toBe('Are you sure you want to mute this user for 24 hours?');
    expect(contract.missingUser).toBe('Could not retrieve user info.');
    expect(contract.copyToast).toBe('Copied to clipboard.');
  });

  it('pins the directly supplied DND badge nodes and source-proven global behavior', () => {
    expect(DIRECT_EVIDENCE_CONTRACT.doNotDisturb).toEqual({
      alertBadgeClass: 'badge badge-danger ms-2',
      chatBadgeClass: 'badge badge-danger ml-2',
      badgeIconClass: 'fas fa-bell-slash',
      badgeText: 'DND',
      preferenceKey: 'doNotDisturbOn',
      defaultValue: false,
      activationToast: false,
      standaloneModal: false
    });

    const pageSource = text(new URL('../routes/+page.svelte', import.meta.url));
    const modalHostSource = text(new URL('components/ModalHost.svelte', import.meta.url));
    expect(pageSource).toContain('<span class="badge badge-danger ms-2"');
    expect(pageSource.match(/<span class="badge badge-danger ml-2"/g)).toHaveLength(2);
    expect(pageSource).toContain('<i class="fas fa-bell-slash"></i> DND');
    expect(pageSource).toContain("typeof loadedSettings.doNotDisturbOn === 'boolean'");
    expect(pageSource).toContain('DEFAULT_ALERT_DELIVERY_PREFERENCES.doNotDisturbOn');
    expect(pageSource).toContain('{#if media.anyoneTalking && media.talking.length > 0}');
    expect(modalHostSource).toContain('onDoNotDisturbChange(input.checked);');
  });

  it('keeps the Phase 1 shell closed initially and toggles only the captured wrapper class', () => {
    const pageSource = text(new URL('../routes/+page.svelte', import.meta.url));
    const compiledRoom = text(
      new URL('../../docs/source/components/app-room.compiled.js', import.meta.url)
    );
    const cleanRoom = text(new URL('../../app-room/app-room-file.clean.html', import.meta.url));
    const isolatedNavbar = text(new URL('../../navbar-section/navbar.html', import.meta.url));

    expect(compiledRoom).toContain('(this.showSidebar = !1)');
    expect(compiledRoom).toContain('toggleSideBar()');
    expect(compiledRoom).toContain('this.showSidebar = !this.showSidebar');
    expect(pageSource).toContain('let sidebarOpen = $state(false);');
    /*
      The wrapper stopped being a ternary at `f9e1890`, which bound a SECOND class to the same
      element — `KAe = (t, n) => ({'push-wrapper': t, 'mt-0': n})` (`app-room.full.js:5`, applied at
      `:4029-4039`). Two independent classes do not fit one `a ? b : c`, so the element became
      `class="wrapper"` plus two `class:` directives.

      This assertion went red at that commit and stayed red until 2026-08-12, because `f9e1890`
      reported `svelte-check` and prettier only. What it GUARDS is unchanged and is still asserted:
      the wrapper always carries `wrapper`, and `push-wrapper` appears only with `sidebarOpen`.
    */
    expect(pageSource).toContain('class="wrapper"');
    expect(pageSource).toContain('class:push-wrapper={sidebarOpen}');
    expect(pageSource).toContain('onclick={() => (sidebarOpen = !sidebarOpen)}');
    expect(pageSource).toContain("class={sidebarOpen ? 'fas fa-arrow-left' : 'fas fa-bars'}");
    expect(pageSource).toContain("const noSpeakerText = ' ( No one is speaking )';");
    expect(pageSource).toContain("const shareScreenText = 'Share Screen ';");
    expect(pageSource).toContain("const virtualCamText = ' OBS / XSPLIT/ Share Virtual Cam';");
    expect(pageSource).toContain(
      '<nav class="navbar navbar-expand-md navbar-dark fixed-top mainAppNav" style="">'
    );
    expect(pageSource).toContain('<a>{noSpeakerText}</a>');
    expect(cleanRoom).toContain(
      '<li class="nav-item talkingIndicator animated fadeIn"><a> ( No one is speaking )</a></li>'
    );
    expect(isolatedNavbar).toContain('<li class="nav-item talkingIndicator animated fadeIn">');
    expect(isolatedNavbar).toContain('<a> ( No one is speaking )</a>');
  });

  it('uses the decoded stylesheet as the sole active Phase 1 shell authority', () => {
    const sourceCss = text(new URL('../../css/complete-app-styles.css', import.meta.url));
    const bridgedCss = text(new URL('styles/captured-runtime-components.css', import.meta.url));
    const appCss = text(new URL('../app.css', import.meta.url));

    expect(appCss.startsWith("@import '../css/complete-app-styles.css';")).toBe(true);
    expect(sourceCss).toContain(
      '.wrapper[_ngcontent-ng-c977335924] { position: relative; display: inline-block; margin-top: 49px;'
    );
    expect(sourceCss).toContain(
      '.push-wrapper[_ngcontent-ng-c977335924] { left: 250px; width: calc(100% - 250px); }'
    );
    expect(sourceCss).toContain(
      '.sidebar-wrapper[_ngcontent-ng-c977335924] { margin-left: -250px; top: 0px; height: calc(-49px + 100vh); width: 250px;'
    );
    expect(bridgedCss).toContain('app-room\n  .wrapper:not(');
    expect(bridgedCss).toContain('app-room\n  .push-wrapper:not(');
    expect(bridgedCss).toContain('app-room\n  .sidebar-wrapper:not(');
    expect(bridgedCss).toContain('.talkingIndicator:not(:root)\n  a:not(:root):not(');
    expect(bridgedCss).toContain('.sidebar-menu:not(:root):hover:not(');

    const activeLocalShellSelectors: string[] = [];
    const shellSelectorTokens = [
      '.mainAppNav',
      '.sidebar-menu',
      '.sidebar-wrapper',
      '.push-wrapper',
      '.wrapper',
      '.room-sidebar',
      '.room-container',
      '#navbarsRoom',
      '.talkingIndicator',
      '.brand-logo',
      '.active-room-users',
      '.room-roster'
    ];

    // The single sanctioned exception to "the decoded stylesheet is the sole shell authority".
    //
    // The captured DOM carries `animated fadeIn` on the idle talking indicator
    // (app-room/complete.html: `<li class="nav-item talkingIndicator animated fadeIn">`), and those
    // classes are reproduced verbatim. In the Angular original that <li> is rendered at boot by
    // docs/source/components/app-room.render-helpers.js:1327, so its animate.css entry animation
    // ran while the whole client-rendered UI was appearing at once. This app server-renders it, so
    // the same 1s fade replays over an already-painted page on every load - captured frame by frame
    // as the ONLY element on screen whose pixels change after first paint (rect 836,4 166x41,
    // animating from ~110ms to ~1100ms).
    //
    // The rule below neutralises only that initial entry animation, for the idle variant alone. The
    // element, its classes and its captured geometry are untouched, and the speaking variant - the
    // one carrying `> a.talking` - still fades in when someone actually starts speaking, which is
    // the state change the animation exists to convey. No other local shell override is permitted.
    const sanctionedShellOverrides = ['.talkingIndicator.animated.fadeIn:not(:has(> a.talking))'];

    postcss.parse(appCss).walkRules((rule) => {
      if (rule.selectors.every((selector) => sanctionedShellOverrides.includes(selector))) return;
      if (
        rule.selectors.some((selector) =>
          shellSelectorTokens.some((token) => selector.includes(token))
        )
      ) {
        activeLocalShellSelectors.push(rule.selector);
      }
    });

    expect(activeLocalShellSelectors).toEqual([]);

    // The exception is only meaningful while the rule it sanctions is actually present.
    expect(appCss).toContain('.talkingIndicator.animated.fadeIn:not(:has(> a.talking))');
  });
});
