# Offline / file:// site — the rules that keep "double-click and it works" true

The whole design flows from one requirement: **unzip → double-click `index.html` → everything
works, offline**, and the *same files* must also work unchanged on GitHub Pages. That single
constraint bans a surprising amount of the modern web stack. Keep this list next to you while
building or reviewing such a site.

## Banned (and why)

| Don't use | Why it breaks `file://` |
|---|---|
| ES modules — `<script type="module">`, `import`/`export` | Module loading is subject to CORS; `file://` origins fail to fetch sibling modules |
| `fetch()` / `XMLHttpRequest` on local files | Blocked under `file://` (opaque origin). No loading `.glsl`, `.json`, HTML fragments, images-as-data at runtime |
| CDN / external `<script src="https://...">` or `<link>` | Dies with no network; also a privacy/offline regression |
| Build steps (bundlers, TS compile, npm) | There's no build; **source === deployed**. Anything that needs compiling won't run from a double-click |
| Web fonts fetched at runtime (often) | If the fetch fails offline you get invisible/fallback text. Prefer system font stacks |

## Use instead

- **Classic scripts**: `<script src="js/foo.js"></script>` that attach to `window` via an IIFE
  (`(function(global){ ... global.Foo = ...; })(window);`). These load fine under `file://`.
- **GLSL as JS strings**: keep shader source in a `.js` file as joined string arrays, not `.glsl`
  files (which you'd have to `fetch`). Bonus: `node --check` catches JS syntax errors in them.
- **Binary/asset data embedded as base64 in JS**: HDRIs, small textures, lookup tables. See the
  `hdri-rgbm-bake` skill for the HDR case.
- **CSS custom properties + a system font stack**: theme with `:root { --panel: ...; }` and
  `font-family: system-ui, -apple-system, "Noto Sans JP", sans-serif;` — no font downloads.
- **Relative links only**, and keep every page at the repo root (`ch01.html`, not `pages/ch01.html`)
  so `href="ch02.html"` and `src="js/x.js"` behave identically under `file://` and Pages.

## Deploy

GitHub Pages, **Deploy from a branch**, `main` / `/ (root)`. No Actions/workflow needed because
there's no build — the committed files are the site. Pushing to `main` updates the live URL.
(Viewing an `.html` on github.com shows source, not the running page — always use the Pages URL
or a local double-click.)

## Mobile / touch checklist

- Canvas: `touch-action: none` so page-scroll doesn't fight drag/pinch gestures.
- Layout collapses to one column at narrow widths (test ~360px).
- Sliders large enough to grab with a thumb.
- 1-finger drag = rotate, 2-finger pinch = zoom (the `offline-webgl-toolkit` OrbitCam does this).

## Verify before shipping — there is no compiler, so runtime-check every page

Because nothing type-checks or bundles, a page can look fine in source and be broken at runtime
(a misspelled uniform, a `getElementById` that returns null, a GLSL compile error thrown only in
the browser). Two cheap gates catch almost all of it:

1. **`node --check` every JS file** — catches syntax errors, including inside GLSL string arrays.
   ```bash
   for f in js/*.js; do node --check "$f" || echo "SYNTAX: $f"; done
   ```
2. **Open every page under `file://` and fail on any console error** — use `scripts/smoke_test.js`
   (Playwright). It loads each `.html`, records `console.error` + uncaught exceptions, counts
   canvases, and (with `--quiz`) exercises quiz widgets.
   ```bash
   node scripts/smoke_test.js /path/to/site \
     --playwright /opt/node22/lib/node_modules/playwright --quiz
   ```
   Exit code 1 means at least one page errored — treat that as a failing build. In this
   environment Chromium is preinstalled and Playwright is preconfigured
   (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`); do **not** run `playwright install`.

Run both after any change to shared JS/GLSL — a single edit to `shaders.js` or a shared widget
can break several pages at once, and the smoke test is how you find out before the user does.
