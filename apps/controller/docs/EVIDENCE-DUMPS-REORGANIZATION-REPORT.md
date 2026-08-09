# Evidence-dumps reorganization report

Date: 2026-08-02  
Repository: `/Users/billyribeiro/Desktop/new-room-control`  
Status: complete and verified

Package-manager note: this is a historical relocation report. References to npm
in past-tense verification statements record commands that were actually run
before the repository standardized on pnpm; they are not current instructions.
All commands intended for a present-day rerun use pnpm, the sole package manager
defined by `docs/ENGINEERING-SSOT.md`.

## 1. Objective and scope

The raw and minimally processed reference artifacts that were previously spread
across the repository root were consolidated into one canonical archive:
`evidence-dumps/`.

Application and toolchain roots were intentionally not moved. `src/`, `static/`,
`scripts/`, `docs/`, package manifests, Svelte/Vite configuration, `.git`, and
generated dependency/build directories must remain at their conventional project
locations for SvelteKit, the package manager, Git, and the existing quality
tooling to work.

No evidence directory or captured file was renamed. The directory move preserved
the original evidence-set names and the file inventory below records the resulting
byte counts and SHA-256 fingerprints.

## 2. Directory relocation map

| Previous root location    | Canonical location                       | Contents                                                       |
| ------------------------- | ---------------------------------------- | -------------------------------------------------------------- |
| `COPY/`                   | `evidence-dumps/COPY/`                   | Saved controller and room-login page sources                   |
| `NEXT-STEP/`              | `evidence-dumps/NEXT-STEP/`              | Gap captures, DOM state, geometry, styles, and captured assets |
| `account-page/`           | `evidence-dumps/account-page/`           | Authenticated account and badge-prompt evidence                |
| `home-page/`              | `evidence-dumps/home-page/`              | Original public home-page source                               |
| `login-page/`             | `evidence-dumps/login-page/`             | Login, authenticated account, launch, API, and manage sources  |
| `main-nav-login-clicked/` | `evidence-dumps/main-nav-login-clicked/` | Authenticated navigation-state source                          |
| `register-page/`          | `evidence-dumps/register-page/`          | Registration-page source                                       |
| `room-login/`             | `evidence-dumps/room-login/`             | Room-login source                                              |

The archive contract and directory descriptions are maintained in
[`evidence-dumps/README.md`](../evidence-dumps/README.md).

## 3. Complete evidence inventory

All sizes are bytes. Hashes were calculated after relocation with SHA-256. Finder
metadata (`.DS_Store`) is excluded because it is generated host metadata and is
globally gitignored, not repository evidence.

### `COPY/`

| File                                    |  Bytes | SHA-256                                                            |
| --------------------------------------- | -----: | ------------------------------------------------------------------ |
| `evidence-dumps/COPY/page-source`       | 17,906 | `f87613bd32639c060478cd924e760665878e7cb033625ad01792f07f0f907648` |
| `evidence-dumps/COPY/login-page-source` | 16,095 | `c96d1acc824efe52c3b7c4c68fd86f6595f67c65d2bd4f3e3e1c90c5055414c0` |

### `account-page/`, `home-page/`, `login-page/`, navigation, registration, and room login

| File                                                         |   Bytes | SHA-256                                                            |
| ------------------------------------------------------------ | ------: | ------------------------------------------------------------------ |
| `evidence-dumps/account-page/file1`                          |   6,156 | `64145eddde2cad155ccc174b2f6460c6a968a8a80291357f5688aef85b84c3ab` |
| `evidence-dumps/account-page/upload-image-badge-prompt.html` |     625 | `fb4e934f761f15fb2eac26882ce6ebac9b6628f6f3b8ab48b20ad521a6c7c43f` |
| `evidence-dumps/home-page/file`                              |  28,496 | `935562f231a499feff797afe59672f8bdc4b223d61d652c6f102b6deafd594ab` |
| `evidence-dumps/login-page/api-docs`                         |  20,622 | `b7dd2b013da5305df0fdb8a8c22111324f60c2cf767486e6c07386d4ae429d49` |
| `evidence-dumps/login-page/complimentary`                    | 208,373 | `180f645c9d9d6d498a1d33b5def063f1cc4f6685c9a06289f684e30192dcfc3e` |
| `evidence-dumps/login-page/launch`                           |  27,777 | `0975cfac7b324a89b168c4ed258381b8c9052830e24e1e7a24eb82dfc919b8ab` |
| `evidence-dumps/login-page/logged-in-page`                   |  84,971 | `4e1cfd1e9f84fc420066cc0d9eb23bb3a6ebdef52d4b551f707113dc1a444e34` |
| `evidence-dumps/login-page/login`                            |  83,062 | `42d3881ccb7989546bc4318f8422b61a9c30fcf95a99781daefe3be27323d62f` |
| `evidence-dumps/login-page/manage`                           | 219,389 | `8f3fbf7515ae8ff021f66f63a4c80b04d6128786173d97767aead0e3ce791eb2` |
| `evidence-dumps/main-nav-login-clicked/file`                 |  85,587 | `b006d7bfb2ef6c1d3234c2b4872c72542f708324828a59ef475d7d416fde1e4a` |
| `evidence-dumps/register-page/register-page-file`            |  17,047 | `08464fdf9194d08a1b203aa0466061f4ea774725444a11ea70e80301d1bca7dc` |
| `evidence-dumps/room-login/room-login-file`                  |  27,777 | `b81503adbe84ca91286643c7d18f40853d0f83806dd6e679dec983c5ec59fa59` |

### `NEXT-STEP/gaps/`

| File                                                                        |     Bytes | SHA-256                                                            |
| --------------------------------------------------------------------------- | --------: | ------------------------------------------------------------------ |
| `evidence-dumps/NEXT-STEP/gaps/asset-ajax_loader.gif`                       |     4,178 | `93c99b1a62bdef426c6029d8eeaa796af079bd0b67c7bd67fda444e8afb6f562` |
| `evidence-dumps/NEXT-STEP/gaps/asset-ptr_logo.png`                          |     7,197 | `3bb962577a82302b8e26354cc34b9e8473eadfac91749bf7387a7257f59e4408` |
| `evidence-dumps/NEXT-STEP/gaps/meta.json`                                   |    11,040 | `10ebceb169b52293bdb6f05f7d4e1baf20fb4c7e9ae8710f8180b4828fa75dee` |
| `evidence-dumps/NEXT-STEP/gaps/rawHtml.html`                                |   223,628 | `2ce15d08d1fc5534c2ed249faef4e2847e7f542a33eafef140096c214b5faed9` |
| `evidence-dumps/NEXT-STEP/gaps/rects-baseline.json`                         |   224,196 | `14554a669b42e1f7830ed3d645c743e5334a31f049cff12e62cf5e7b18cf92d6` |
| `evidence-dumps/NEXT-STEP/gaps/rects-dropdown_0_User_List_Actions.json`     |   274,738 | `ecd1c9b6d997cc6a5c616aa74d7201416095aaaeab90f55fe0c417108091ac04` |
| `evidence-dumps/NEXT-STEP/gaps/rects-dropdown_1_Actions_With_Selected.json` |   283,494 | `013d702183523a2697c125c2b5de03b235dfa3543841504b0a61fccfe22e5d3e` |
| `evidence-dumps/NEXT-STEP/gaps/rects-modal_permissions.json`                |   265,719 | `ebc42c9dc3579c4d3239393b59f87bd5d7a53596c1cc92f6e1f55fdd10d1a33e` |
| `evidence-dumps/NEXT-STEP/gaps/rects-settings_dont-touch-revealed.json`     | 2,295,616 | `f97ee34ac7082c1226d3c4b56a0ebaaf38126a3c5dc00f14978027a87bc2d740` |
| `evidence-dumps/NEXT-STEP/gaps/rects-tab_Branding_Logo_Landing_Page_.json`  |   307,078 | `376231595e22f3d882e9c9cb3c369d55dc4259439f5b9036aa8badbb0ba7926c` |
| `evidence-dumps/NEXT-STEP/gaps/rects-tab_Settings.json`                     | 1,844,839 | `f134f75e0c24d65f329526126568a0037689683a51281de9ed2f5767ecefcc21` |
| `evidence-dumps/NEXT-STEP/gaps/rects-tab_SSO_Setup.json`                    |   182,371 | `4e1f58d51a5be3684fd7683b344e8dd539022879f721ff1d55ba664379aae1c2` |
| `evidence-dumps/NEXT-STEP/gaps/rects-tab_Text_List.json`                    |   178,798 | `2351f415d60005d630641b44bebaf001c4a7bb001ec7e85e69eb1a3cacad2a54` |
| `evidence-dumps/NEXT-STEP/gaps/rects-tab_User_Stats.json`                   |   231,312 | `845282e504c60b9151c8771e561d108ce4a214cbe3d7e92b764b26a77bb208a6` |
| `evidence-dumps/NEXT-STEP/gaps/rects-tab_Users.json`                        |   224,196 | `14554a669b42e1f7830ed3d645c743e5334a31f049cff12e62cf5e7b18cf92d6` |
| `evidence-dumps/NEXT-STEP/gaps/sheet-0.css`                                 |        78 | `74f88915d2ef2e36bf9ed24ef72ba793bc84e7d044ba50e443dd368491f24451` |
| `evidence-dumps/NEXT-STEP/gaps/sheet-1.css`                                 |       169 | `055a214652a934fd7999a87cca2dbcfa2074bbe5d931c529de79524f17c308d6` |
| `evidence-dumps/NEXT-STEP/gaps/sheet-2.css`                                 |   134,647 | `41eb0f363eabed9d2144e779c3f236ec618257f0d3c507ce58ea468d1461c2f9` |
| `evidence-dumps/NEXT-STEP/gaps/sheet-3.css`                                 |    35,998 | `9ae8eacf58c6f1d8dc071a099ef7ef4c88d1c73ef2e71369cd8d7cc7c6aee5c9` |
| `evidence-dumps/NEXT-STEP/gaps/sheet-4.css`                                 |    30,377 | `fa2cdb94b328cc080c1a48466b6b1ed58ad7f7e9b611f213711a5b9918131ecc` |
| `evidence-dumps/NEXT-STEP/gaps/sheet-5.css`                                 |       254 | `57e34a0e6e4d625ce0920e4828c90d8cf147ee44f320e3ecb9fa63fb3318597b` |
| `evidence-dumps/NEXT-STEP/gaps/sheet-6.css`                                 |     2,631 | `d56689c113f2dd254e772e5aadcb48e7991132cbd200aa6843ef4728596f0ec1` |
| `evidence-dumps/NEXT-STEP/gaps/sheet-7.css`                                 |    10,964 | `79ed626c05182a8421023390155865c7ccfb384a2a7bf9b277542e07163bbeec` |
| `evidence-dumps/NEXT-STEP/gaps/sheet-8.css`                                 |     3,412 | `c63f15dfe3fce2cdac8fe7bd7a62cc5686dd1f75cbdcca7def3ec61d323e632b` |
| `evidence-dumps/NEXT-STEP/gaps/sheet-9.css`                                 |   194,778 | `f9f439cc1b0ef7a863c7ffcafbfebac6a19bf56ec4c2d62ab36f4e2d1cc51b00` |
| `evidence-dumps/NEXT-STEP/gaps/sheet-10.css`                                |    25,795 | `fe2c819c0be01113d271167c91a14db8ccbe2183b1f16baf27a47cba93dc2a3f` |
| `evidence-dumps/NEXT-STEP/gaps/sheet-11.css`                                |     6,210 | `5492ca99a0f1003a09393c0f9529b56a48e1d277512ba10f13a3742e7fe3999a` |
| `evidence-dumps/NEXT-STEP/gaps/sheet-12.css`                                |    35,556 | `ae424d5cc0db27c78e5012e542542bbe64f92b38d6f59e97edfbbd336810c435` |
| `evidence-dumps/NEXT-STEP/gaps/sheet-13.css`                                |       235 | `354c0c71805bf854df654e4e39a53417a5ef569dfa5b28fff29e0d68e10608c6` |
| `evidence-dumps/NEXT-STEP/gaps/sheet-14.css`                                |        24 | `c7e4a58852c92873eb10490753805e32eb3b4854d4aaf5d1860dc39d0dc1fd94` |
| `evidence-dumps/NEXT-STEP/gaps/state-baseline.json`                         | 3,486,386 | `c0a02d64b8bd40f78d7889d183c649c10989aac4a195816cb16546fdc4bb8327` |
| `evidence-dumps/NEXT-STEP/gaps/state-dropdown_0_User_List_Actions.json`     | 3,487,230 | `8248c9f6a168df58260b3605e450966e30fa6f99db1650830f71be2dac403db0` |
| `evidence-dumps/NEXT-STEP/gaps/state-dropdown_1_Actions_With_Selected.json` | 3,487,201 | `2ee65fb36bf25b1888d3971453b7755aa9afbc854d9a178095afdc31a73e2894` |
| `evidence-dumps/NEXT-STEP/gaps/state-modal_permissions.json`                | 3,489,264 | `2d2955d45e45184505ce5aad88bf99c9f7761ff19eed08f3b47ae76e696753f8` |
| `evidence-dumps/NEXT-STEP/gaps/state-settings_dont-touch-revealed.json`     | 3,498,117 | `f6c74d9be8b3e3d49d1dbbecbdd186e9feab5c2b203ad74cacd0eca793f932b4` |
| `evidence-dumps/NEXT-STEP/gaps/state-tab_Branding_Logo_Landing_Page_.json`  | 3,487,398 | `0a16e3d8acc2c681d96a67a74407feb680671bb3109b8091ff58fa58b1db9498` |
| `evidence-dumps/NEXT-STEP/gaps/state-tab_Settings.json`                     | 3,496,112 | `4bcd76ac8da383fbc1dfd3754a1d68cac0dc386c6d41c8ce3b15a68d734955b9` |
| `evidence-dumps/NEXT-STEP/gaps/state-tab_SSO_Setup.json`                    | 3,485,701 | `d72bbfcafd9c5a599aca923e1682885df5e4a3ccb30c4187490e929d251019bf` |
| `evidence-dumps/NEXT-STEP/gaps/state-tab_Text_List.json`                    | 3,485,721 | `247632ba8b940b62520a8109b0a08fa5d78c4a860d71264499d34b049168504f` |
| `evidence-dumps/NEXT-STEP/gaps/state-tab_User_Stats.json`                   | 3,486,314 | `d1ae2fb00fe3a68af6ae1db9230f6293886e434aadc12a85cf12575029eb44f8` |
| `evidence-dumps/NEXT-STEP/gaps/state-tab_Users.json`                        | 3,486,437 | `cd5e9f82e2a16f2e6f0a0f93b0afff427fcbacb19498d2b747a87dce457be872` |
| `evidence-dumps/NEXT-STEP/gaps/stylesheets.json`                            |   490,752 | `e3e66b64cc58d4206a7773c26c9324b9b25019d594909bf2cf8c8e48ccd40903` |

### Archive index

| File                       | Bytes | SHA-256 at inventory time                                          |
| -------------------------- | ----: | ------------------------------------------------------------------ |
| `evidence-dumps/README.md` | 1,483 | `650c51480172e840485aee2c5807d50dd86da9367e684fb0c69bb31ca6da5597` |

The archive README hash above describes the file before this report was linked
from it. It is recorded as audit history, not used as an immutable evidence hash.

## 4. Repository references updated

### Runtime and evidence citations

- `src/manage.css`
- `src/account.css`
- `src/public.css`
- `docs/reference/css/room-tokens.css` (relocated from `src/` by the later Svelte conformance audit)
- `src/lib/content/home.ts`
- `src/lib/content/api-docs.ts`
- `src/lib/server/rooms.ts`
- `src/lib/components/SiteHeader.svelte`
- `src/lib/components/SiteFooter.svelte`
- `src/lib/components/home/HeroSection.svelte`
- `src/lib/components/RichTextEditor.svelte`
- `src/routes/(app-auth)/register/+page.svelte`
- `src/routes/(public)/login/+page.svelte`
- `src/routes/(app)/account/api-docs/+page.svelte`
- `src/routes/(app)/account/rooms/[id]/+page.svelte`

`src/lib/room-settings-schema.ts` was not hand-edited. It was regenerated from
the updated `scripts/extract-manage-schema.mjs` source path; the generated output
changed only its evidence-source comment.

The rich-text editor already used a Svelte attachment to seed its editable DOM.
During mandatory Svelte autofixer verification, its redundant `bind:this` was
replaced by attachment-owned element assignment and cleanup. This preserves the
same DOM and interaction behavior while giving the reference one lifecycle owner.

### Capture, extraction, and verification tooling

- `scripts/capture-ptr-reference.js`
- `scripts/capture-gaps.js`
- `scripts/decode-gaps.mjs`
- `scripts/extract-manage-schema.mjs`
- `scripts/verify-account-contract.mjs`
- `scripts/verify-home-fidelity.mjs`
- `scripts/verify-room-login-contract.mjs`
- `scripts/verify/ref-manage-rects.mjs`
- `scripts/verify/verify-account-full.mjs`
- `scripts/verify/verify-manage-tabs.mjs`
- `scripts/verify/verify-manage.mjs`

`scripts/verify-evidence-layout.mjs` was added. It enforces the exact documented
archive directories, proves that the old root directories are absent, verifies
critical artifacts, and verifies the sensitive JSON ignore rule. The
`evidence:verify` command was added to `package.json` and placed in the normal
`npm test` chain.

### Policy and documentation

- `.gitignore`
- `README.md`
- `docs/ENGINEERING-SSOT.md`
- `docs/PROCESS.md`
- `docs/reference/REDACTIONS.md`
- `docs/reference/account-pixel-match.md`
- `docs/reference/breakpoints.md`
- `docs/reference/home-pixel-contract.md`
- `docs/reference/manage-pixel-match.md`
- `docs/reference/prt2-DECODE.md`
- `docs/reference/ptr1-DECODE.md`
- `docs/reference/ptr1-MASTER.md`
- `docs/reference/room-theme-tokens.md`
- `docs/reference/parts/01-baseline-000-719.md`
- `docs/reference/parts/02-baseline-720-1439.md`
- `docs/reference/parts/04-interactions.md`
- `docs/reference/parts/05-css-meta-themes.md`
- `docs/reference/pieces/ptr1-P27-theme-verdict.md`
- `docs/reference/pieces/ptr1-P32-capture-metadata-quiescence.md`

The historical absolute source path in `docs/reference/prt2-DECODE.md` was
retained as provenance, and the new canonical repository path was added beside
it. The external decoded-slice citation in `docs/reference/css/controller.css` was also retained
because those decoded pieces are not present in this repository archive.

## 5. Security and generated-file handling

- `.gitignore` now explicitly excludes `evidence-dumps/NEXT-STEP/*.json` so the
  sensitive original `ptr1.json` and `prt2.json` captures cannot be accidentally
  added at their new canonical location.
- Those two sensitive originals are not currently present in the archive. The
  checked-in `NEXT-STEP` evidence consists of the `gaps/` derived artifacts listed
  above.
- Raw artifacts are separated from public runtime assets and application code.
- Curated, redacted interpretation remains in `docs/reference/`.
- Generated `.DS_Store` files encountered outside Git metadata were removed.
  macOS may recreate them; `.gitignore` already excludes them and the layout gate
  intentionally ignores only that host-generated filename.

## 6. Verification evidence

The final `npm run quality` execution passed end to end:

| Gate                                  | Result                                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| `npm run evidence:verify`             | Passed; exact archive layout and root absence verified                                        |
| `svelte-check --fail-on-warnings`     | 0 errors, 0 warnings                                                                          |
| Breakpoint contract                   | Passed                                                                                        |
| Authenticated account source contract | Passed                                                                                        |
| Home fidelity contract                | Passed: 8 hashes, exact 1440×956 PNG metadata, 10 responsive calculations, cascade assertions |
| Authenticated room-login contract     | Passed                                                                                        |
| Vitest                                | 6 files passed; 41 tests passed                                                               |
| Production build                      | Passed with adapter-node output                                                               |

All modified Svelte files were processed with the official Svelte autofixer. The
API-documentation page retains its deliberate `{@html}` boundary because its
static reference document is allowlist-sanitized in `+page.server.ts` before
serialization and the sanitizer has dedicated negative XSS tests. Replacing it
with client-only `innerHTML` assignment would regress server rendering.

After the migration and quality run, `http://127.0.0.1:5300/` returned HTTP 200.

## 7. How to locate and verify the result

```bash
# Show the archive index
sed -n '1,240p' evidence-dumps/README.md

# List every versionable evidence file
find evidence-dumps -type f -not -name .DS_Store -print

# Verify the archive structure and required artifacts
pnpm evidence:verify

# Run the entire required engineering gate
pnpm quality

# Confirm the development server
curl -I http://127.0.0.1:5300/
```

This report is the audit trail for the relocation. The engineering authority for
future work remains `docs/ENGINEERING-SSOT.md`; the raw archive contract remains
`evidence-dumps/README.md`; and evidence interpretation and breakpoint precedence
remain under `docs/reference/`.
