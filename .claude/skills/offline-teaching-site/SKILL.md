---
name: offline-teaching-site
description: >-
  Design and verify interactive teaching/documentation sites that must run with ZERO build
  and ZERO dependencies — unzip and double-click index.html (file://), and the same files also
  serve unchanged on plain GitHub Pages. Covers the hard constraints (no ES modules, no fetch,
  no CDN, no bundler; classic window-attached IIFE scripts; GLSL/data embedded as JS strings;
  relative links only; system fonts; mobile touch rules) and the verification workflow that
  replaces a compiler: node --check every JS file, then a Playwright smoke test that opens every
  page under file:// and fails on any console error. Use this whenever building or reviewing an
  offline-capable static site, an interactive lesson/course, a self-contained HTML deliverable,
  or any "must work by double-clicking / no server / no npm / vanilla JS" page — and whenever you
  need to smoke-test a folder of HTML pages for runtime errors. Pairs with offline-webgl-toolkit,
  cook-torrance-pbr-viewport, and hdri-rgbm-bake.
---

# Offline Teaching Site

Build interactive multi-page teaching sites that satisfy one demanding requirement: **unzip →
double-click `index.html` → everything works, offline**, with the *identical* files also working
on GitHub Pages. That constraint dictates the architecture and, because there's no build step,
a specific way of verifying the site. This skill is the checklist and the test harness.

## Start here

Read **`references/constraints.md`** before writing or reviewing any page. It is the full list of
what's banned under `file://` (ES modules, `fetch`, CDN, build steps, runtime web fonts), what to
use instead (classic IIFE `<script>`s, GLSL/data as JS strings, base64-embedded assets, CSS custom
properties + system fonts, root-relative links), the GitHub Pages deploy settings, and the mobile
touch checklist. The rest of this file is the workflow that uses it.

## Page skeleton that follows the rules

- One HTML file per page, **all at the repo root** (`ch01.html`, `viewport.html`), so
  `href="ch02.html"` and `src="js/x.js"` resolve the same under `file://` and Pages.
- Shared `css/style.css` themed with `:root { --panel:…; --ink:…; }` custom properties and a
  system font stack — no downloaded fonts.
- Shared JS in `js/*.js`, each an IIFE attaching one global. Load them with plain
  `<script src>` in dependency order at the end of `<body>`.
- Any 3D, quizzes, HDRI, or explainer widgets come from the companion skills — all of which obey
  the same `file://` contract:
  - **offline-webgl-toolkit** — `glmini.js` (WebGL/orbit camera) and `quiz.js` (self-grading quiz).
  - **cook-torrance-pbr-viewport** — a full PBR/BRDF viewport + 2D widgets for the shading lessons.
  - **hdri-rgbm-bake** — turn HDRIs into an embedded `envmap.js` so reflections need no fetch.

## Verify like there's no compiler (because there isn't)

Nothing type-checks or bundles, so a page can be perfect in source and broken at runtime — a
misspelled uniform, a `getElementById` returning null, a GLSL error thrown only in-browser. Gate
every change with two cheap checks:

1. **Syntax-check all JS** (also catches errors inside GLSL string arrays):
   ```bash
   for f in js/*.js; do node --check "$f" || echo "SYNTAX: $f"; done
   ```

2. **Smoke-test every page under `file://`** with the bundled harness. It opens each `.html`,
   records `console.error` and uncaught exceptions, counts canvases, and optionally drives quiz
   widgets — exit code 1 if anything errored:
   ```bash
   node scripts/smoke_test.js <site-dir> \
     --playwright /opt/node22/lib/node_modules/playwright --quiz
   ```
   `--playwright <path>` points at the Playwright module (omit if it resolves normally),
   `--wait <ms>` tunes the post-load settle time, `--quiz` exercises `.quizbox` widgets. In this
   environment Chromium is preinstalled and Playwright is preconfigured — **never** run
   `playwright install`.

Run both after any edit to shared JS/GLSL: one change to a shared shader or widget can break
several pages at once, and the smoke test is how you catch it before shipping.

## Reviewing an existing site against the contract

Grep for the banned patterns — any hit is a `file://` regression to fix:

```bash
grep -rn 'type="module"\|import \|export \|fetch(\|https://\|http://cdn' *.html js/*.js
```

(Legitimate `https://` in comments/links is fine; what matters is runtime loads of scripts,
styles, fonts, or data.) Then run the two verification gates above.

## Files

- `references/constraints.md` — the full do/don't list, deploy settings, mobile checklist. Read first.
- `scripts/smoke_test.js` — Playwright runner: opens every `.html` in a dir under `file://`, fails
  on console errors, optionally tests quizzes. Generic — point it at any site directory.
