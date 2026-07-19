# API reference — cook-torrance-pbr-viewport

## Contents
- [Viewport.mount options](#viewportmount-options)
- [Viewport state fields](#viewport-state-fields)
- [CT (math.js) API](#ct-mathjs-api)
- [SHADERS (shaders.js)](#shaders-shadersjs)
- [Widgets catalog](#widgets-catalog)

---

## Viewport.mount options

`Viewport.mount(containerOrSelector, opts)` → viewport object (`{ state, draw() }`) or `null`
(no WebGL). If given a `<canvas>`, it is replaced by a `<div>` in place.

| option | type | default | meaning |
|---|---|---|---|
| `controls` | bool | `true` | show the material/light parameter panel |
| `modes` | bool | `true` | show the term-isolation buttons (Final/Diffuse/Specular/D/F/G/n·l) |
| `readout` | bool | `true` | show the click-to-inspect pixel readout table |
| `lockMode` | 0–6 or null | `null` | force one display mode and hide the mode UI (mini-viewer). Disables `modes`, `readout`, `env` UI |
| `env` | `"751"`/`"758"`/`"none"`/`false` | `"751"` (or `"none"` when locked) | initial environment map; `false`/`"none"` = analytic lights only |
| `envInt` | number | `1.4` | environment intensity |
| `bgBlur` | 0..1 | `0.25` | background blur amount |
| `initial` | object | — | overrides any state field at mount, e.g. `{rough:0.35, metal:1}` |

When both `controls:false` and `readout:false`, the shell renders single-column (`vp-solo`) —
the mini-viewer layout used inside chapters.

Display mode indices: `0 Final, 1 Diffuse, 2 Specular, 3 D, 4 F, 5 G, 6 n·l`
(`Viewport.MODE_LABELS`).

## Viewport state fields

Read/write via the returned object's `.state`, then call `.draw()`:

| field | default | notes |
|---|---|---|
| `baseHex` | `"#c8c8c8"` | base color (sRGB hex) |
| `lightHex` | `"#fff4e0"` | light color |
| `lightInt` | `3.0` | light intensity |
| `rough` | `0.35` | roughness 0–1 |
| `metal` | `0.0` | metallic 0–1 |
| `f0d` | `0.04` | dielectric F0 |
| `az`, `el` | `40`, `35` | light azimuth / elevation in degrees |
| `isPoint` | `0` | 1 = point light, 0 = directional |
| `mode` | `0` | display mode index |
| `beckmann` | `0` | 1 = compute D with Beckmann instead of GGX |
| `env` | `"751"` | environment name |
| `envInt` | `1.4` | environment intensity |
| `bgBlur` | `0.25` | background blur |

Example driving from a page slider:
```js
var v = Viewport.mount("#vp", { controls:false, modes:false, readout:false, lockMode:3 });
mySlider.addEventListener("input", function(){ v.state.rough = +this.value; v.draw(); });
```

## CT (math.js) API

CPU port of the shader — use it for any BRDF number you display so it matches the render.

- `CT.evaluate(p)` where `p = {N,L,V, baseColorLin, lightColorLin, lightInt, rough, metal, f0d}`
  (vectors are `[x,y,z]`, colors are **linear**). Returns
  `{N,L,V,H, NoL,NoV,NoH,VoH, alpha, F0, D, G, F, kd, diffuse, specular, radiance, outLinear, outHex}`.
- Color helpers: `hex2lin(hex)`, `lin2hex(c)`, `tone(c)` (Reinhard+gamma, matches shader),
  `tone2hex(c)`, `s2l`, `l2s`.
- Term functions: `D_GGX(NoH,a)`, `D_Beckmann(NoH,m)`, `G_Smith(NoL,NoV,rough)`, `F_Schlick(VoH,F0)`.
- Vector helpers: `dot, add, sub, scale, mulv, norm`. `PI`.

Note `a = rough*rough` (α). `F0 = mix(f0d, baseColor, metal)` per channel.

## SHADERS (shaders.js)

`SHADERS.vert`, `SHADERS.frag` — the sphere program (Cook-Torrance + IBL + tone map).
`SHADERS.bgVert`, `SHADERS.bgFrag` — the full-screen equirect background pass (used by `ibl.js`).

Frag uniforms of note: `uRough, uMetal, uF0dielectric, uBaseColor` (linear), `uLightDir/uLightPos/
uLightIsPoint/uLightColor/uLightInt`, `uMode` (0–6), `uBeckmann` (0/1), and the IBL set
`uUseEnv, uEnvInt, uEnv0..uEnv4, uEnvIrr`. GLSL is stored as joined string arrays so it stays
`node --check`-friendly; keep `shaders.js` and `math.js` in lockstep when editing the model.

## Widgets catalog

`Widgets.<name>(canvasId[, opts])`. Each widget draws into the given canvas **and** reads/writes
sibling DOM elements by a `w<chapter><letter>_<param>` id convention (sliders it listens to,
`<span>`s it writes results into). The reliable way to reuse one is to copy **both** the widget's
HTML block from the matching source chapter (`chXX.html`) **and** the JS call — the ids are the
contract. Key ids per widget below; `_val` spans mirror slider values.

| widget | canvas + expected companion ids | notes |
|---|---|---|
| `vectorTool2D(id)` | self-contained (draws in canvas) | drag arrows; components/length shown on canvas |
| `vectorTool3D(id)` | self-contained | 3D vector, orbit |
| `vectorBall(id)` | self-contained | click sphere → n,l,v,h arrows |
| `cosGraph(id)` | self-contained | cos curve |
| `dotProduct(id)` | writes `w2a_angle, w2a_cos, w2a_dot, w2a_mag` | two draggable arrows |
| `lambertBall(id)` | self-contained | n·l shaded sphere |
| `hemisphereIntegral(id)` | slider `w3a_divisions`; writes `w3a_div_count, w3a_slice_omega, w3a_total` | discrete→integral |
| `lightContribution(id)` | button `w3b_play`, `w3b_progress` | additive light animation |
| `reflectionEquation(id)` | `w4a_explanation` | clickable equation terms |
| `brdfLobe(id)` | slider `w5a_rough` (+`w5a_rough_val`) | polar BRDF lobe; diffuse/glossy/mirror presets |
| `piToggle(id)` | writes `w6b_f, w6b_total` | π-divide on/off, energy overflow |
| `microfacet2D(id)` | slider `w7a_rough` | rough-surface cross-section, photon bounce |
| `dGraph(id, opts)` | slider `opts.roughId` (default `w8a_rough`) | D curve. `opts.both=true` overlays GGX+Beckmann |
| `fresnelGraph(id)` | slider `w9a_f0` (+`w9a_f0_val`) | Fresnel curve, F0 presets |
| `shadowMask2D(id)` | sliders `w10a_angle`, `w10a_rough`; writes `w10a_ratio` | shadowing/masking, visible % |
| `gGraph(id)` | slider `w10b_rough` | G curve |
| `stepCalc(tableId)` | inputs `w11_thl, w11_thv, w11_base, w11_rough, w11_metal, w11_f0, w11_lcol, w11_lint` | fills a `<tbody>` with every intermediate value (uses `CT.evaluate`) |

For the exact companion HTML, open the corresponding chapter in the origin repo
(`ch01`→vector tools, `ch02`→dotProduct, `ch03`→hemisphere/light, `ch04`→reflectionEquation,
`ch05`→brdfLobe, `ch06`→piToggle, `ch07`→microfacet2D, `ch08`→dGraph, `ch09`→fresnelGraph,
`ch10`→shadowMask2D/gGraph, `ch11`→stepCalc).
