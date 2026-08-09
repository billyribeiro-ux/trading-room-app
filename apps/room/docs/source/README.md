# ProTradingRoom deployed source evidence

- Retrieved: 2026-07-30

| Artifact                           |     Bytes | SHA-256                                                            |
| ---------------------------------- | --------: | ------------------------------------------------------------------ |
| `deployed-index.html`              |    16,094 | `7afd09a14bd8fb904f662508c8e4c0777aa7fa69fbcc2a608978399a40171fc9` |
| `runtime.b70e5d3ff558bfdf.js`      |     1,239 | `f7a9f182dd4f63c790f8037c4db63a0472733aa1faa02f33a22ee4d9c1816e52` |
| `polyfills.95db17d6d6f4b89d.js`    |    35,480 | `2779452ed0d9088b4730ba342f85a5ac1bc548a77dcfd751059212aa2d16e7ba` |
| `scripts.38973a242454fb27.js`      |   774,566 | `e24c0534fee07207c60dedbc48e7cb17298726b922bb56e2cc9e6f55c537c7cd` |
| `main.d6d3c112b59b7d0d.js`         | 2,887,876 | `1d9e55b58075b78ec61a389c672aa40d7d2ccd691621562461bcda0ff5fdc850` |
| `styles.d622cb9ed2bbc221.css`      |   444,545 | `0f9482210ab4e57898b2a11979dcd37c299d9f4e05e4f8910c6115e46a6a8ffa` |
| `app-st-message.compiled.js`       |    31,689 | `b3fd77de94ea1d4ba291da8fbc8e046f2615f51feb0586c14306b5c89d6b16ad` |
| `app-st-message.render-helpers.js` |    26,202 | `4074796645917e368d9db1cc0307185cd37839abc6021ee1bc1dca8c7241dff7` |
| `app-st-message.full.js`           |    57,891 | `c0131a289b126877190c20129d537f45d360057c86f68f41df4ce2cde6137058` |
| `app-st-message.component.css`     |     4,901 | `538caba947070d791bfefb5f995788469f84bdf14f769f69dd94394a773781f1` |

The immutable source copy is preserved as `styles.d622cb9ed2bbc221.css`. The
runtime copy at `src/lib/styles/protradingroom-source.css` is loaded before the
dump-derived global overrides and SSOT tokens.

The bundle includes the deployed Bootstrap/Darkly base, app-wide variables,
and Angular component selectors. Angular scope attributes are intentionally
not fabricated in the Svelte markup; dump-derived selectors needed by the
Svelte implementation are globalized in `src/app.css`.

The deployed index supplies the global `openImageModal`, `downloadImage`,
`removeImageFromChat`, and `showChatGif` functions. The main bundle supplies
51 compiled `app-*` selectors. `scripts/audit-production-components.mjs`
maps every compiled selector to its byte range, inputs, template declaration
counts, style hash, supplied forced-open artifact, and Svelte host occurrence.

`pnpm capture:decode-components` mechanically extracts all 51 component
classes into readable files under `docs/source/components/`. For every
selector it also extracts the compiler render prelude immediately preceding
the class into `*.render-helpers.js` and combines the prelude plus class in
`*.full.js`. This preserves nested conditional/list templates that sit outside
the component-class IIFE. The generated `manifest.json` pins the class and
prelude byte ranges and hashes independently, as well as readable/full hashes,
template declaration/variable counts, inputs, and component style hash.
