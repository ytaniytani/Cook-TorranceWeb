---
name: offline-webgl-toolkit
description: >-
  Drop-in, dependency-free building blocks for interactive web pages that must run
  from a bare file:// double-click or plain GitHub Pages — no build step, no npm, no
  bundler, no ES modules, no fetch, no CDN. Provides (1) glmini.js: a ~200-line WebGL
  helper with 4x4 matrix math, unit-sphere mesh generation, a mouse+touch orbit camera,
  and ray-sphere picking; and (2) quiz.js: a data-driven interactive multiple-choice
  quiz engine with grading, per-question explanations, and scoring. Use this whenever
  building a small WebGL demo/viewer or an interactive quiz that has to work offline
  or as static files, when the user says "no build step / no dependencies / must open
  with file:// / vanilla JS / classic script", when adding an orbit-camera 3D canvas
  to a page, or when adding self-checking quizzes to a teaching/docs page. Prefer this
  over pulling in Three.js or a quiz library for these lightweight cases.
---

# Offline WebGL Toolkit

Two independent, zero-dependency, IIFE-style browser modules that load with a plain
`<script src>` and work under `file://` (double-click `index.html`) and on GitHub Pages
with no build step. Use either or both.

## Why these exist (the constraints they satisfy)

These were extracted from a teaching site whose hard requirement was: *unzip → double-click
`index.html` → everything works, offline.* That rules out ES modules (`file://` blocks them
via CORS), `fetch()`/`XHR` on local files (blocked under `file://`), and CDN loads (break
offline). Everything here is a classic `<script>` that attaches to `window`. Keep that
contract when you extend them, or you lose the "just open it" property.

## glmini.js — minimal WebGL helper

Attaches `window.GLMini` and `window.M4`. No matrix/3D library needed.

- `M4` — column-major 4x4 matrices (gl-matrix-compatible layout): `create`, `mul(out,a,b)`,
  `perspective(out,fovy,aspect,near,far)`, `lookAt(out,eye,center,up)`, `invert(out,a)`.
- `GLMini.makeSphere(seg)` → `{pos, nrm, idx}` typed arrays for a unit sphere at the origin.
- `GLMini.program(gl, vertSrc, fragSrc)` → compiled+linked program; throws with the shader
  info log (and the source) on failure, which makes GLSL debugging fast.
- `GLMini.OrbitCam(canvas, {yaw,pitch,dist,onChange})` — drag to rotate, wheel to zoom,
  1-finger drag / 2-finger pinch on touch. `.eye()` returns the camera position;
  `.reset()` restores defaults. Call your redraw from `onChange`.
- `GLMini.pickNormal(cam, aspect, fovy, ndcX, ndcY)` → the unit-sphere surface point (= normal)
  under a screen coordinate, or `null`. This is what powers "click the sphere to inspect a pixel".

Minimal wiring:

```html
<canvas id="c" style="width:100%;height:400px;touch-action:none"></canvas>
<script src="glmini.js"></script>
<script>
  var cv = document.getElementById("c");
  var gl = cv.getContext("webgl") || cv.getContext("experimental-webgl");
  var prog = GLMini.program(gl, VERT_SRC, FRAG_SRC);
  var mesh = GLMini.makeSphere(96);
  var cam = new GLMini.OrbitCam(cv, { dist:3.2, onChange:draw });
  var proj = M4.create(), view = M4.create(), mvp = M4.create();
  function draw(){
    var dpr = Math.min(window.devicePixelRatio||1, 2);
    cv.width = cv.clientWidth*dpr; cv.height = cv.clientHeight*dpr;
    gl.viewport(0,0,cv.width,cv.height); gl.enable(gl.DEPTH_TEST);
    M4.perspective(proj, 45*Math.PI/180, cv.width/cv.height, 0.1, 100);
    M4.lookAt(view, cam.eye(), [0,0,0], [0,1,0]);
    M4.mul(mvp, proj, view);
    /* ...upload buffers + uniforms, gl.drawElements... */
  }
  draw();
</script>
```

Notes that save time:
- Always set `touch-action:none` on the canvas so page scroll doesn't fight the orbit gesture.
- Size the canvas from `clientWidth*dpr` inside `draw()`; if you mount into a container that
  starts at height 0, the canvas renders empty — give it an explicit CSS height.
- For picking: convert a click to NDC with `ndcX = (x/rect.width)*2-1`, `ndcY = 1-(y/rect.height)*2`,
  then `GLMini.pickNormal(cam, aspect, fovy, ndcX, ndcY)`.

## quiz.js — data-driven interactive quiz

Attaches `window.Quiz`. One call renders a self-contained, self-grading quiz. Its CSS is
injected once on first use and keys off CSS custom properties (`--panel`, `--line`, `--ink`,
`--photon`, `--good`, `--bad`, …). If your page defines those variables it blends in; if not,
add a small `:root { --panel:#141922; ... }` block or the widget still works but looks plain.

```html
<div id="quiz"></div>
<script src="quiz.js"></script>
<script>
Quiz.mount("#quiz", {
  title: "Check your understanding",
  questions: [
    { q: "Question text (HTML allowed)",
      opts: ["Option A", "Option B", "Option C"],
      answer: 1,                       // 0-based index of the correct option
      explain: "Why B is right (HTML allowed). Shown after grading." }
  ]
});
```

Behavior: the learner picks one option per question, presses **答え合わせ / Check**, and the
widget marks each question correct/incorrect, reveals every explanation, and shows a score
(green when all correct). **もう一度 / Retry** clears it. `mount` returns `{ grade, reset }`
so you can drive it programmatically. Multiple quizzes per page are fine — radio groups get a
unique name per mount.

To relabel the buttons/header for a non-Japanese page, edit the string literals in `quiz.js`
(`"答え合わせ"`, `"もう一度"`, `"Check your understanding"`) — they're plain text, not keys.

## Files

- `assets/glmini.js` — copy into your project and `<script src>` it.
- `assets/quiz.js` — same. Independent of glmini; take one or both.

Both are MIT-spirit snippets meant to be copied and adapted, not versioned as a package.
