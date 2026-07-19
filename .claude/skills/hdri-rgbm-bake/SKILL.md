---
name: hdri-rgbm-bake
description: >-
  Bake Radiance .hdr environment maps into a tiny, self-contained JavaScript file so
  image-based lighting (IBL) works with NO fetch(), NO server, NO CDN — it runs from a
  bare file:// double-click and on plain GitHub Pages. Converts multi-megabyte HDRIs into
  RGBM-encoded (RGBA8) equirectangular mips plus a cosine-convolved irradiance map, all
  base64-embedded in one .js that assigns window.ENVMAPS. Pure Python standard library —
  no numpy, no PIL — so it runs in any minimal environment. Use this whenever an offline
  or static WebGL page needs environment reflections / HDRI lighting but can't load binary
  assets at runtime, when the user wants to "embed an HDR", "add IBL without a build/server",
  "compress an HDRI into JS", switch between multiple sky maps, or feed environment textures
  to the cook-torrance-pbr-viewport skill's ibl.js. Reach for this instead of loading .hdr
  or .exr files over the network.
---

# HDRI → RGBM Bake

Turns `.hdr` (Radiance RGBE) environment maps into a single JavaScript file that embeds
everything IBL needs, so the runtime never fetches a binary. This is the offline-friendly
alternative to loading HDR/EXR textures at runtime.

## Why RGBM + prefiltered mips, embedded in JS

- **No `fetch`, no server.** Under `file://`, `fetch()`/`XHR` on local files is blocked and
  CDN loads break offline. Embedding the data as base64 inside a classic `<script>` sidesteps
  all of it — the page just works when double-clicked.
- **RGBM, not float textures.** WebGL1 without float extensions can't sample HDR directly.
  RGBM packs HDR into RGBA8: `linear = rgb * a * RANGE` (RANGE=16). Every device can sample it.
- **Prefiltered offline.** The bake produces a mip chain (256×128 → 16×8) so roughness-based
  blur is a cheap mip lookup at runtime, plus a 32×16 cosine-convolved **irradiance** map for
  diffuse IBL (the split-sum approach). The expensive convolution happens once, at bake time.
- **Small.** An ~11 MB HDR becomes a few hundred KB of base64 JS with the quality that a
  learning/preview viewport needs.

## What it outputs

`scripts/bake.py` writes `envmap.js` assigning `window.ENVMAPS`:

```js
window.ENVMAPS = {
  range: 16.0,
  order: ["751","758"],
  labels: { "751":"Sky 751", "758":"Sky 758" },
  maps: {
    "751": {
      mips: [ {w:256,h:128,d:"<base64 RGBA8>"}, ... {w:16,h:8,d:"..."} ],
      irr:  {w:32,h:16,d:"<base64 RGBA8>"}
    },
    ...
  }
};
```

`mips[0]` is the sharpest (background + mirror reflections); higher indices are pre-blurred for
higher roughness. `irr` is the diffuse irradiance map. This is exactly the shape the
**cook-torrance-pbr-viewport** skill's `ibl.js` expects — drop the generated `envmap.js` in
before `ibl.js` and IBL lights up.

## How to run it

1. Put your `.hdr` files somewhere and edit the `MAPS` list at the top of `scripts/bake.py`:
   ```python
   MAPS = [
       ("751", "/path/to/751.hdr", "Sky 751"),
       ("mysky", "/path/to/whatever.hdr", "My Sky"),
   ]
   ```
   The first tuple element is the key used in `ENVMAPS.maps` and in `Viewport`'s `env` option.
2. Run it (no dependencies): `python3 scripts/bake.py`. It prints progress to stderr and writes
   `envmap.js` next to the script (`OUT` variable — change if you want it in your project's `js/`).
3. Include it before `ibl.js`:
   ```html
   <script src="envmap.js"></script>
   <script src="ibl.js"></script>
   ```

The convolution is O(pixels²)-ish on a small downsampled source, so a bake of a couple of maps
takes seconds to a minute in pure Python — fine as a one-time offline build step. The generated
`envmap.js` is committed; the raw `.hdr` files are **not** (they're large and no longer needed
at runtime).

## Knobs (top of bake.py)

| constant | default | effect |
|---|---|---|
| `RANGE` | `16.0` | RGBM range multiplier. Must match the shader's `ENV_RANGE`. Raise if your HDR has very bright highlights that clip |
| `MIP_SIZES` | `[(256,128)...(16,8)]` | mip chain resolutions. More/larger = sharper + bigger file |
| `IRR_SIZE` | `(32,16)` | irradiance map size. 32×16 is plenty for smooth diffuse |

The irradiance convolution samples a 64×32 downsample of the source for speed; bump that in
`build_map` if you want a smoother diffuse term at the cost of bake time.

## Decoding side (the shader contract)

The matching GLSL (see the pbr-viewport skill's `shaders.js`) decodes with:
```glsl
const float ENV_RANGE = 16.0;                 // == RANGE in bake.py
vec3 rgbmDecode(vec4 c){ return c.rgb * c.a * ENV_RANGE; }
```
and maps directions to equirect UV with `atan(d.z,d.x)` for longitude and `acos(d.y)` for
latitude. If you change `RANGE`, change `ENV_RANGE` too or every reflection will be mis-exposed.

## Adapting

- **More maps / a black option**: add tuples to `MAPS`. A "black background" is best handled on
  the viewer side (skip IBL, clear to black) rather than baking an all-black map.
- **EXR or other HDR formats**: `bake.py` only parses Radiance RGBE `.hdr` (new-RLE + flat
  scanlines). Convert EXR→HDR first, or extend `read_hdr`.
- **Non-equirect**: the direction↔UV math assumes an equirectangular projection; change
  `dir_from_uv` and the shader's mapping together if you use a different layout.

## Files

- `scripts/bake.py` — the baker. Pure stdlib (`base64, math, struct, sys, os`). Edit `MAPS`/`OUT`
  and run.
