---
name: cook-torrance-pbr-viewport
description: >-
  A complete, dependency-free Cook-Torrance / GGX physically-based-rendering teaching
  viewport implemented in raw WebGL, plus the matching CPU-side math and a library of 2D
  explainer widgets. Use this whenever building an interactive PBR/BRDF lesson, shader
  playground, or material previewer where the shading must be transparent and inspectable
  rather than hidden inside Three.js — e.g. "explain roughness/metallic/Fresnel visually",
  "show D/F/G terms separately", "let me click the sphere and see n·l, D, F, G and the final
  color", "GGX vs Beckmann", "energy conservation / kd", or an IBL/HDRI reflection preview.
  Bundles a self-implemented GLSL Cook-Torrance BRDF (D_GGX, Beckmann, Smith-GGX G, Schlick F,
  Lambert diffuse, IBL split-sum), a term-isolation display mode, a pixel-inspector, and 18
  Canvas2D widgets (vector tools, cos/dot/D/F/G graphs, microfacet & shadow-masking cross
  sections, BRDF lobe, step-by-step calculator). Reach for this before writing a PBR shader
  from scratch or pulling in a 3D engine for a lesson.
---

# Cook-Torrance PBR Teaching Viewport

A drop-in package for building interactive lessons about the Cook-Torrance (GGX) microfacet
BRDF. The shading is implemented by hand in GLSL and mirrored in JS so that **every number on
screen can be traced** — that transparency is the whole point; do not replace it with a
material from a 3D engine.

All modules are classic `<script>` IIFEs (attach to `window`), work under `file://` and on
GitHub Pages, and require no build step. See `offline-webgl-toolkit` for the shared `file://`
constraints — the same rules apply here.

## What's in the box

| File | Global | Role |
|---|---|---|
| `assets/glmini.js` | `GLMini`, `M4` | WebGL helper: matrices, sphere mesh, orbit camera, ray-sphere pick |
| `assets/shaders.js` | `SHADERS` | GLSL strings: the full Cook-Torrance BRDF + IBL + background pass |
| `assets/math.js` | `CT` | CPU port of the exact same BRDF (for pixel inspection & the step calculator) |
| `assets/viewport.js` | `Viewport` | The mountable sphere viewport (controls, term modes, pixel inspector) |
| `assets/ibl.js` | `IBL` | Binds RGBM environment textures + draws the equirect background (optional) |
| `assets/widgets.js` | `Widgets` | 18 Canvas2D explainer widgets |

`ibl.js` needs an `envmap.js` (`window.ENVMAPS`) to do anything — that data is produced by the
separate **hdri-rgbm-bake** skill. Without it, everything still works with analytic lights;
IBL simply stays off.

## The shading model (so you can teach it, not just call it)

Implemented in `shaders.js` and identically in `math.js`:

```
f = kd·(albedo/π) + D·F·G / (4·(n·l)·(n·v))
kd = (1 − F)·(1 − metallic)
Lo = f · Lc · (n·l)
D = GGX (α = roughness²)   G = Smith + Schlick-GGX (k=(rough+1)²/8)   F = Schlick
F0 = mix(0.04, albedo, metallic)
```

Display modes (isolate one term to the sphere): `0 Final, 1 Diffuse, 2 Specular, 3 D, 4 F, 5 G, 6 n·l`.
A `uBeckmann` uniform swaps D_GGX for Beckmann (the 1982-original distribution) for the GGX-vs-
Beckmann comparison. IBL uses the split-sum approximation (irradiance map for diffuse;
prefiltered mips + Karis `envBRDFApproxAB` for specular).

## Mounting the viewport

Load the scripts in dependency order, then call `Viewport.mount`:

```html
<div id="vp"></div>
<script src="glmini.js"></script>
<script src="shaders.js"></script>
<script src="envmap.js"></script>   <!-- optional: from hdri-rgbm-bake; omit for analytic-light only -->
<script src="ibl.js"></script>       <!-- optional: pairs with envmap.js -->
<script src="math.js"></script>
<script src="viewport.js"></script>
<script src="widgets.js"></script>   <!-- only if you use the 2D widgets -->
<script>
  // Full instrument: parameter controls + term-mode buttons + click-to-inspect readout
  Viewport.mount("#vp", { controls:true, modes:true, readout:true });

  // Locked mini-viewer for a chapter (e.g. show only the D term, no UI, no IBL):
  Viewport.mount(document.getElementById("wD"), {
    controls:false, modes:false, readout:false, lockMode:3, env:false,
    initial:{ rough:0.35 }
  });
</script>
```

`mount(container, opts)` accepts a selector or an element. If you hand it a raw `<canvas>` it
gets replaced with a `<div>` (a bare canvas mounts at height 0 and renders empty). Key options:
`controls`, `modes`, `readout` (booleans), `lockMode` (0–6, forces one term and hides mode UI),
`env` (`"751"`/`"758"`/`"none"`/`false`), and `initial:{rough,metal,...}`. The returned object
exposes `.state` and `.draw()` so a page slider can drive it:
`v.state.rough = 0.4; v.draw();`. Full option and state tables are in `references/api.md`.

## The 2D widgets

`widgets.js` exposes `Widgets.<name>(canvasId[, opts])`. Each renders a self-contained Canvas2D
explainer and wires its own sliders (by id convention). The full catalog — every widget, the
DOM ids it expects, and its options — is in **`references/api.md`**. Read that file when you
need to place a specific widget; don't guess ids. Quick index:

`vectorTool2D, vectorTool3D, vectorBall, cosGraph, dotProduct, lambertBall, hemisphereIntegral,
lightContribution, reflectionEquation, brdfLobe, piToggle, microfacet2D, dGraph (GGX, or
both:true for GGX+Beckmann), fresnelGraph, shadowMask2D, gGraph, stepCalc`.

`CT.evaluate({N,L,V, baseColorLin, lightColorLin, lightInt, rough, metal, f0d})` returns every
intermediate (H, all dot products, D, F, G, kd, diffuse, specular, linear out, and `outHex`).
This is the single source of truth shared by the pixel inspector and `stepCalc` — use it whenever
you need CPU-side BRDF numbers so they match the shader exactly.

## Adapting it

- **Different mesh** (plane/torus): add a mesh builder alongside `GLMini.makeSphere` and swap
  buffers in `viewport.js`; `pickNormal` is sphere-specific, so gate the inspector accordingly.
- **Different BRDF term**: edit `shaders.js` AND `math.js` together — they must stay in lockstep
  or the pixel inspector will disagree with the render. There's a `node --check`-able structure;
  keep GLSL as joined string arrays.
- **Localization**: UI labels live as plain strings in `viewport.js`/`widgets.js`.

## Files

Copy `assets/*.js` into your project's `js/`. Take only what you need — the viewport needs
glmini+shaders+math (+ibl+envmap for reflections); the widgets are independent of the viewport
except that graph widgets reuse `CT` from `math.js`.
