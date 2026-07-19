/* widgets.js — インタラクティブウィジェット群
   第1〜4章のCanvas・SVGベースウィジェット実装
   依存: glmini.js, shaders.js, math.js, viewport.js
   グローバル: window.Widgets
*/
(function(global){
  "use strict";

  var Widgets = {};

  /* =========== Ch01: ベクトルツール =========== */

  /* W1-a: 2D ベクトル操作 */
  Widgets.vectorTool2D = function(canvasId){
    var canvas = document.getElementById(canvasId);
    if(!canvas) return;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    var w = canvas.clientWidth, h = canvas.clientHeight;
    var cx = w * 0.5, cy = h * 0.5;
    var scale = 40;
    var vx = 2, vy = 1.5;
    var dragging = false, dragIdx = -1;

    function draw(){
      ctx.fillStyle = "rgba(12,15,20,1)";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(42,51,64,0.5)";
      ctx.lineWidth = 1;
      for(var i = -5; i <= 5; i++){
        ctx.beginPath();
        ctx.moveTo(cx + i*scale, 0);
        ctx.lineTo(cx + i*scale, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, cy + i*scale);
        ctx.lineTo(w, cy + i*scale);
        ctx.stroke();
      }

      ctx.strokeStyle = "#ffc55a";
      ctx.fillStyle = "#ffc55a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      var px = cx + vx * scale, py = cy - vy * scale;
      ctx.lineTo(px, py);
      ctx.stroke();

      var r = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = "#ffc55a";
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = "#e7edf5";
      ctx.font = "12px " + (window.getComputedStyle(document.body).fontFamily);
      ctx.textAlign = "left";
      ctx.fillText("O", cx - 14, cy + 16);
      ctx.fillText("v", px + 8, py - 4);

      ctx.fillStyle = "rgba(140,153,171,0.7)";
      ctx.fillText("v = (" + vx.toFixed(2) + ", " + vy.toFixed(2) + ")", 12, 20);
      var mag = Math.sqrt(vx*vx + vy*vy);
      ctx.fillText("|v| = " + mag.toFixed(3), 12, 36);
    }

    function onMouseDown(e){
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) * dpr;
      var y = (e.clientY - rect.top) * dpr;
      var px = cx + vx * scale, py = cy - vy * scale;
      if(Math.hypot(x - px, y - py) < 12) dragIdx = 1;
      if(dragIdx >= 0) dragging = true;
    }

    function onMouseMove(e){
      if(!dragging) return;
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) * dpr;
      var y = (e.clientY - rect.top) * dpr;
      vx = (x - cx) / scale;
      vy = (cy - y) / scale;
      draw();
    }

    function onMouseUp(){
      dragging = false;
      dragIdx = -1;
    }

    canvas.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    window.addEventListener("resize", function(){
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.scale(dpr, dpr);
      draw();
    });

    draw();
  };

  /* W1-a: 3D ベクトル操作（簡易等軸投影） */
  Widgets.vectorTool3D = function(canvasId){
    var canvas = document.getElementById(canvasId);
    if(!canvas) return;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    var w = canvas.clientWidth, h = canvas.clientHeight;
    var cx = w * 0.5, cy = h * 0.5;
    var scale = 30;
    var vx = 1.5, vy = 1.2, vz = 1.8;
    var dragging = false;

    function iso(x, y, z){
      return [cx + (x - z) * scale * 0.866, cy + y * scale - (x + z) * scale * 0.5];
    }

    function draw(){
      ctx.fillStyle = "rgba(12,15,20,1)";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(42,51,64,0.3)";
      ctx.lineWidth = 1;
      for(var i = -3; i <= 3; i++){
        var p1 = iso(i, 0, -3), p2 = iso(i, 0, 3);
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
        p1 = iso(-3, 0, i); p2 = iso(3, 0, i);
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      }

      ctx.strokeStyle = "#ffc55a";
      ctx.lineWidth = 2;
      var p0 = iso(0, 0, 0), pv = iso(vx, vy, vz);
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(pv[0], pv[1]);
      ctx.stroke();

      ctx.fillStyle = "#ffc55a";
      ctx.beginPath(); ctx.arc(p0[0], p0[1], 5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(pv[0], pv[1], 5, 0, Math.PI*2); ctx.fill();

      ctx.fillStyle = "#e7edf5";
      ctx.font = "12px " + (window.getComputedStyle(document.body).fontFamily);
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(140,153,171,0.8)";
      ctx.fillText("v = (" + vx.toFixed(2) + ", " + vy.toFixed(2) + ", " + vz.toFixed(2) + ")", 12, 20);
      var mag = Math.sqrt(vx*vx + vy*vy + vz*vz);
      ctx.fillText("|v| = " + mag.toFixed(3), 12, 36);
    }

    function onMouseMove(e){
      if(!dragging) return;
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) * dpr;
      var y = (e.clientY - rect.top) * dpr;
      vx = (x - cx) / scale * 0.866 * 0.7;
      vy = (y - cy) / scale * -0.7;
      vz = -(x - cx) / scale * 0.866 * 0.3;
      draw();
    }

    canvas.addEventListener("mousedown", function(){ dragging = true; });
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", function(){ dragging = false; });
    window.addEventListener("resize", function(){
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.scale(dpr, dpr);
      draw();
    });

    draw();
  };

  /* W1-b: 球体上の四方向（ミニビューポート） */
  Widgets.vectorBall = function(canvasId){
    var canvas = document.getElementById(canvasId);
    if(!canvas) return;
    Viewport.mount(canvas, {
      controls: false,
      modes: false,
      readout: false,
      lockMode: null,
      env: false,   // ベクトル図は照明を固定（環境光なし）
      initial: { baseHex: "#888888", lightHex: "#fff0d8", lightInt: 2.0, rough: 0.5, metal: 0.0, f0d: 0.04 }
    });
  };

  /* =========== Ch02: 内積とcos =========== */

  /* cosグラフ */
  Widgets.cosGraph = function(canvasId){
    var canvas = document.getElementById(canvasId);
    if(!canvas) return;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    var w = canvas.clientWidth, h = canvas.clientHeight;
    var margin = 40, graphW = w - 2*margin, graphH = h - 2*margin;
    var graphX = margin, graphY = margin;

    function draw(){
      ctx.fillStyle = "rgba(12,15,20,1)";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(42,51,64,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(graphX, graphY);
      ctx.lineTo(graphX, graphY + graphH);
      ctx.lineTo(graphX + graphW, graphY + graphH);
      ctx.stroke();

      ctx.fillStyle = "rgba(140,153,171,0.6)";
      ctx.font = "11px " + (window.getComputedStyle(document.body).fontFamily);
      ctx.textAlign = "center";
      for(var i = 0; i <= 180; i += 45){
        var xx = graphX + (i / 180) * graphW;
        ctx.beginPath();
        ctx.moveTo(xx, graphY + graphH - 3);
        ctx.lineTo(xx, graphY + graphH + 3);
        ctx.stroke();
        ctx.fillText(i + "°", xx, graphY + graphH + 16);
      }
      ctx.textAlign = "right";
      for(var j = -1; j <= 1; j += 0.5){
        var yy = graphY + graphH - (j + 1) * graphH / 2;
        ctx.beginPath();
        ctx.moveTo(graphX - 3, yy);
        ctx.lineTo(graphX + 3, yy);
        ctx.stroke();
        ctx.fillText(j.toFixed(1), graphX - 8, yy + 3);
      }

      ctx.strokeStyle = "#ffc55a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for(var deg = 0; deg <= 180; deg += 1){
        var rad = deg * Math.PI / 180;
        var cosVal = Math.cos(rad);
        var xx = graphX + (deg / 180) * graphW;
        var yy = graphY + graphH - (cosVal + 1) * graphH / 2;
        if(deg === 0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      }
      ctx.stroke();

      ctx.fillStyle = "rgba(140,153,171,0.8)";
      ctx.font = "13px " + (window.getComputedStyle(document.body).fontFamily);
      ctx.textAlign = "left";
      ctx.fillText("cos(θ)", graphX + graphW - 50, graphY + 20);
    }

    window.addEventListener("resize", function(){
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.scale(dpr, dpr);
      draw();
    });

    draw();
  };

  /* W2-a: 内積の対話ツール */
  Widgets.dotProduct = function(canvasId){
    var canvas = document.getElementById(canvasId);
    if(!canvas) return;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    var w = canvas.clientWidth, h = canvas.clientHeight;
    var cx = w * 0.5, cy = h * 0.5;
    var scale = 60;
    var ax = 1.5, ay = 0.5, bx = 1, by = 1.2;
    var dragging = -1;

    function draw(){
      ctx.fillStyle = "rgba(12,15,20,1)";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(42,51,64,0.5)";
      ctx.lineWidth = 1;
      for(var i = -3; i <= 3; i++){
        ctx.beginPath(); ctx.moveTo(cx + i*scale, 0); ctx.lineTo(cx + i*scale, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, cy + i*scale); ctx.lineTo(w, cy + i*scale); ctx.stroke();
      }

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#79d2ff";
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + ax*scale, cy - ay*scale); ctx.stroke();
      ctx.fillStyle = "#79d2ff";
      ctx.beginPath(); ctx.arc(cx + ax*scale, cy - ay*scale, 6, 0, Math.PI*2); ctx.fill();

      ctx.strokeStyle = "#7fe3a1";
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + bx*scale, cy - by*scale); ctx.stroke();
      ctx.fillStyle = "#7fe3a1";
      ctx.beginPath(); ctx.arc(cx + bx*scale, cy - by*scale, 6, 0, Math.PI*2); ctx.fill();

      var dot = ax*bx + ay*by;
      var maga = Math.sqrt(ax*ax + ay*ay);
      var magb = Math.sqrt(bx*bx + by*by);
      var cosTheta = dot / (maga * magb);
      var theta = Math.acos(Math.max(-1, Math.min(1, cosTheta))) * 180 / Math.PI;

      document.getElementById("w2a_angle").textContent = theta.toFixed(1) + "°";
      document.getElementById("w2a_cos").textContent = cosTheta.toFixed(3);
      document.getElementById("w2a_dot").textContent = dot.toFixed(3);
      document.getElementById("w2a_mag").textContent = (maga * magb).toFixed(3);
    }

    function onMouseDown(e){
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) * dpr;
      var y = (e.clientY - rect.top) * dpr;
      if(Math.hypot(x - (cx + ax*scale), y - (cy - ay*scale)) < 12) dragging = 0;
      else if(Math.hypot(x - (cx + bx*scale), y - (cy - by*scale)) < 12) dragging = 1;
    }

    function onMouseMove(e){
      if(dragging < 0) return;
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) * dpr;
      var y = (e.clientY - rect.top) * dpr;
      if(dragging === 0){
        ax = (x - cx) / scale;
        ay = (cy - y) / scale;
      } else {
        bx = (x - cx) / scale;
        by = (cy - y) / scale;
      }
      draw();
    }

    canvas.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", function(){ dragging = -1; });

    window.addEventListener("resize", function(){
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.scale(dpr, dpr);
      draw();
    });

    draw();
  };

  /* W2-b: Lambert シェーディング */
  Widgets.lambertBall = function(canvasId){
    var canvas = document.getElementById(canvasId);
    if(!canvas) return;
    Viewport.mount(canvas, {
      controls: false,
      modes: false,
      readout: false,
      lockMode: 6,
      initial: { baseHex: "#cccccc", lightHex: "#fff0d8", lightInt: 3.0, rough: 0.5, metal: 0.0 }
    });
  };

  /* =========== Ch03: 積分と半球 =========== */

  /* W3-a: 半球分割 */
  Widgets.hemisphereIntegral = function(canvasId){
    var canvas = document.getElementById(canvasId);
    if(!canvas) return;
    var slider = document.getElementById("w3a_divisions");
    if(!slider) return;

    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    var w = canvas.clientWidth, h = canvas.clientHeight;
    var cx = w * 0.5, cy = h * 0.5;
    var radius = Math.min(w, h) * 0.35;

    function draw(){
      var divisions = parseInt(slider.value);
      ctx.fillStyle = "rgba(12,15,20,1)";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(42,51,64,0.8)";
      ctx.lineWidth = 1;
      for(var i = 0; i < divisions; i++){
        var a1 = (i / divisions) * Math.PI;
        var a2 = ((i + 1) / divisions) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, a1, a2);
        ctx.lineTo(cx, cy);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(255,197,90,0.15)";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI);
      ctx.fill();

      ctx.fillStyle = "rgba(140,153,171,0.7)";
      ctx.font = "12px " + (window.getComputedStyle(document.body).fontFamily);
      ctx.textAlign = "left";

      var sliceOmega = (2 * Math.PI) / divisions;
      var totalOmega = sliceOmega * divisions;

      document.getElementById("w3a_div_count").textContent = divisions;
      document.getElementById("w3a_slice_omega").textContent = sliceOmega.toFixed(3);
      document.getElementById("w3a_total").textContent = totalOmega.toFixed(3);
    }

    slider.addEventListener("input", draw);
    window.addEventListener("resize", function(){
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.scale(dpr, dpr);
      draw();
    });

    draw();
  };

  /* W3-b: 光の寄与アニメーション */
  Widgets.lightContribution = function(canvasId){
    var canvas = document.getElementById(canvasId);
    if(!canvas) return;
    var playBtn = document.getElementById("w3b_play");
    if(!playBtn) return;

    Viewport.mount(canvas, {
      controls: false,
      modes: false,
      readout: false,
      lockMode: null,
      env: false,   // 1方向ずつ光を足す説明のため環境光なし
      initial: { baseHex: "#333333", lightHex: "#ffffff", lightInt: 1.0, rough: 0.5, metal: 0.0 }
    });

    playBtn.addEventListener("click", function(){
      var progress = document.getElementById("w3b_progress");
      playBtn.disabled = true;
      var startTime = performance.now();
      function animate(t){
        var elapsed = t - startTime;
        var percent = Math.min(100, Math.floor((elapsed / 3000) * 100));
        progress.textContent = percent + "%";
        if(percent < 100){
          requestAnimationFrame(animate);
        } else {
          playBtn.disabled = false;
        }
      }
      requestAnimationFrame(animate);
    });
  };

  /* =========== Ch04: 反射方程式 =========== */

  /* W4-a: 反射方程式の分解ビューア */
  Widgets.reflectionEquation = function(canvasId){
    var canvas = document.getElementById(canvasId);
    if(!canvas) return;

    var explanations = {
      brdf: "f(l,v) — BRDF (双方向反射率分布関数)。この方向から来た光が、この方向へどれだけ反射するかを表す関数。材質のふるまいそのもの。",
      light: "Lc — ライトの色と強度。この方向からいくら光がやってくるか。",
      ndotl: "max(0, n·l) — 法線とライト方向の内積。垂直に当たると1、斜めだと0～1、裏側だと負の値（max で 0 に）。",
      brdf2: "f(l,v) — BRDF（同上）。環境全体の場合、各方向での反射を足し合わせるときに使う。",
      input: "Li(l) — その方向からやってくる光の量。環境全体から来る光は、方向ごとに異なる強度を持つ。",
      ndotl2: "(n·l) — 法線とライト方向の内積。積分では、各微小方向での補正項として使われる。"
    };

    var expDiv = document.getElementById("w4a_explanation");
    var highlights = document.querySelectorAll(".equation-highlight");

    highlights.forEach(function(el){
      el.addEventListener("click", function(){
        var term = this.getAttribute("data-term");
        if(explanations[term]){
          expDiv.textContent = explanations[term];
          highlights.forEach(function(e){ e.style.opacity = "0.5"; });
          this.style.opacity = "1";
        }
      });
    });

    Viewport.mount(canvas, {
      controls: false,
      modes: true,
      readout: false,
      lockMode: null,
      initial: { baseHex: "#d9a441", lightHex: "#fff0d8", lightInt: 3.2, rough: 0.28, metal: 1.0, f0d: 0.04 }
    });
  };

  /* =========== 共通ヘルパ（第5章以降のウィジェット用） =========== */

  function setup2D(canvas){
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var ctx = canvas.getContext("2d");
    function fit(){
      canvas.width  = Math.max(1, Math.round(canvas.clientWidth  * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    return { ctx:ctx, dpr:dpr, fit:fit,
             w:function(){ return canvas.clientWidth; },
             h:function(){ return canvas.clientHeight; } };
  }
  function hookResize(s, draw){
    window.addEventListener("resize", function(){ s.fit(); draw(); });
  }
  function arrow(ctx, x0, y0, x1, y1, color, width){
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width || 2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    var a = Math.atan2(y1 - y0, x1 - x0), r = 8;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - r*Math.cos(a - 0.42), y1 - r*Math.sin(a - 0.42));
    ctx.lineTo(x1 - r*Math.cos(a + 0.42), y1 - r*Math.sin(a + 0.42));
    ctx.closePath(); ctx.fill();
  }
  function wireRange(id, fmtDigits, onInput){
    var inp = document.getElementById(id);
    if(!inp) return null;
    var span = document.getElementById(id + "_val");
    function upd(){
      if(span) span.textContent = (+inp.value).toFixed(fmtDigits);
      onInput(parseFloat(inp.value));
    }
    inp.addEventListener("input", upd);
    if(span) span.textContent = (+inp.value).toFixed(fmtDigits);
    return inp;
  }
  function axisFont(){ return "11px " + (window.getComputedStyle(document.body).fontFamily); }

  /* グラフの共通軸描画: x=角度0..90°, y=0..yMax */
  function drawAxes(ctx, gx, gy, gw, gh, yMax, yDigits){
    ctx.strokeStyle = "rgba(42,51,64,0.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy); ctx.lineTo(gx, gy+gh); ctx.lineTo(gx+gw, gy+gh);
    ctx.stroke();
    ctx.fillStyle = "rgba(140,153,171,0.7)";
    ctx.font = axisFont();
    ctx.textAlign = "center";
    for(var d=0; d<=90; d+=30){
      var xx = gx + (d/90)*gw;
      ctx.beginPath(); ctx.moveTo(xx, gy+gh-3); ctx.lineTo(xx, gy+gh+3); ctx.stroke();
      ctx.fillText(d+"°", xx, gy+gh+16);
    }
    ctx.textAlign = "right";
    for(var i=0;i<=4;i++){
      var v = yMax*i/4, yy = gy+gh - (i/4)*gh;
      ctx.beginPath(); ctx.moveTo(gx-3, yy); ctx.lineTo(gx+3, yy); ctx.stroke();
      ctx.fillText(v.toFixed(yDigits==null?2:yDigits), gx-7, yy+3);
    }
  }

  /* 凸凹表面のハイトフィールド（W7-a / W10-a 共用）
     x: 0..1, rough: 0..1 → y(高さ, 画面px。上が正) */
  var SURF_PH = [1.7, 4.1, 0.4, 2.9, 5.5];  // 位相（固定シードでリロードごとに同じ形）
  function surfHeight(x, rough, amp){
    var y = 0;
    y += Math.sin(x*6.28*2  + SURF_PH[0]) * 1.00;
    y += Math.sin(x*6.28*5  + SURF_PH[1]) * 0.55;
    y += Math.sin(x*6.28*9  + SURF_PH[2]) * 0.32;
    y += Math.sin(x*6.28*17 + SURF_PH[3]) * 0.18;
    y += Math.sin(x*6.28*31 + SURF_PH[4]) * 0.10;
    return y * rough * amp;
  }

  /* =========== Ch05: BRDFローブ可視化 (W5-a) =========== */

  Widgets.brdfLobe = function(canvasId){
    var canvas = document.getElementById(canvasId);
    if(!canvas) return;
    var s = setup2D(canvas), ctx = s.ctx;
    var st = { theta: 40, rough: 0.30, metal: 0.0, diffOnly: false };

    document.querySelectorAll("[data-w5a]").forEach(function(b){
      b.addEventListener("click", function(){
        document.querySelectorAll("[data-w5a]").forEach(function(x){ x.classList.remove("on"); });
        b.classList.add("on");
        var p = b.getAttribute("data-w5a");
        if(p === "diffuse"){ st.rough = 1.0;  st.metal = 0.0; st.diffOnly = true; }
        else if(p === "glossy"){ st.rough = 0.30; st.metal = 0.0; st.diffOnly = false; }
        else { st.rough = 0.08; st.metal = 1.0; st.diffOnly = false; }
        var rs = document.getElementById("w5a_rough");
        if(rs){ rs.value = st.rough;
          var sp = document.getElementById("w5a_rough_val");
          if(sp) sp.textContent = st.rough.toFixed(2); }
        draw();
      });
    });
    wireRange("w5a_theta", 0, function(v){ st.theta = v; draw(); });
    wireRange("w5a_rough", 2, function(v){ st.rough = v; st.diffOnly = false; draw(); });

    // 2D断面（xy平面）でBRDFの輝度を評価。albedo=0.8固定。
    function brdfLum(L, V){
      var N = [0,1,0];
      var H = CT.norm(CT.add(L, V));
      var NoL = Math.max(CT.dot(N,L), 1e-4), NoV = Math.max(CT.dot(N,V), 1e-4);
      var NoH = Math.max(CT.dot(N,H), 0),    VoH = Math.max(CT.dot(V,H), 0);
      var albedo = 0.8;
      var F0 = 0.04 + (albedo - 0.04) * st.metal;
      var D = CT.D_GGX(NoH, st.rough*st.rough);
      var G = CT.G_Smith(NoL, NoV, st.rough);
      var F = F0 + (1 - F0) * Math.pow(1 - VoH, 5);
      var kd = (1 - F) * (1 - st.metal);
      var diff = kd * albedo / Math.PI;
      if(st.diffOnly) return diff;
      var spec = D * G * F / Math.max(4*NoL*NoV, 1e-4);
      return diff + spec;
    }

    function draw(){
      var w = s.w(), h = s.h();
      ctx.fillStyle = "rgba(12,15,20,1)";
      ctx.fillRect(0, 0, w, h);
      var cx = w*0.5, cy = h*0.80, R = Math.min(w*0.42, h*0.66);

      // 地面（表面）
      ctx.strokeStyle = "#384556"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - R*1.1, cy); ctx.lineTo(cx + R*1.1, cy); ctx.stroke();
      ctx.fillStyle = "rgba(56,69,86,0.25)";
      ctx.fillRect(cx - R*1.1, cy, R*2.2, Math.min(24, h - cy - 2));

      var th = st.theta * Math.PI/180;
      var L = [-Math.sin(th), Math.cos(th), 0];   // 光は左上から

      // BRDFローブ（出射方向ごとの値を極座標プロット）
      var samples = [], maxF = 0;
      for(var deg=-89; deg<=89; deg++){
        var p = deg*Math.PI/180;
        var V = [Math.sin(p), Math.cos(p), 0];
        var f = brdfLum(L, V);
        samples.push([p, f]);
        if(f > maxF) maxF = f;
      }
      var scale = R / (maxF || 1);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for(var i=0; i<samples.length; i++){
        var r = samples[i][1]*scale;
        ctx.lineTo(cx + Math.sin(samples[i][0])*r, cy - Math.cos(samples[i][0])*r);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(121,210,255,0.20)";
      ctx.strokeStyle = "#79d2ff"; ctx.lineWidth = 2;
      ctx.fill(); ctx.stroke();

      // 法線（点線）
      ctx.setLineDash([4,4]);
      ctx.strokeStyle = "rgba(140,153,171,0.6)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - R*1.02); ctx.stroke();
      // 鏡面反射方向（点線）
      ctx.strokeStyle = "rgba(255,197,90,0.45)";
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.sin(th)*R*1.02, cy - Math.cos(th)*R*1.02); ctx.stroke();
      ctx.setLineDash([]);

      // 入射光の矢印
      arrow(ctx, cx + L[0]*R*1.02, cy - L[1]*R*1.02, cx + L[0]*R*0.12, cy - L[1]*R*0.12, "#ffc55a", 2.5);

      ctx.fillStyle = "rgba(140,153,171,0.9)";
      ctx.font = axisFont(); ctx.textAlign = "left";
      ctx.fillText("入射角 " + st.theta + "°", 12, 20);
      ctx.fillText("ローブ最大値 f = " + maxF.toFixed(3), 12, 36);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffc55a";
      ctx.fillText("光", cx + L[0]*R*1.02, cy - L[1]*R*1.02 - 8);
      ctx.fillStyle = "rgba(140,153,171,0.8)";
      ctx.fillText("n", cx, cy - R*1.02 - 6);
      ctx.fillStyle = "rgba(255,197,90,0.7)";
      ctx.fillText("鏡面方向", cx + Math.sin(th)*R*1.02, cy - Math.cos(th)*R*1.02 - 6);
    }

    hookResize(s, draw);
    draw();
  };

  /* =========== Ch06: πで割る/割らない比較 (W6-b) =========== */

  Widgets.piToggle = function(canvasId){
    var canvas = document.getElementById(canvasId);
    if(!canvas) return;
    var s = setup2D(canvas), ctx = s.ctx;
    var st = { albedo: 0.8, divPi: true };

    document.querySelectorAll("[data-w6b]").forEach(function(b){
      b.addEventListener("click", function(){
        document.querySelectorAll("[data-w6b]").forEach(function(x){ x.classList.remove("on"); });
        b.classList.add("on");
        st.divPi = (b.getAttribute("data-w6b") === "on");
        draw();
      });
    });
    wireRange("w6b_albedo", 2, function(v){ st.albedo = v; draw(); });

    function draw(){
      var w = s.w(), h = s.h();
      ctx.fillStyle = "rgba(12,15,20,1)";
      ctx.fillRect(0, 0, w, h);

      var f = st.divPi ? st.albedo/Math.PI : st.albedo;   // BRDF値
      var total = f * Math.PI;                            // 半球で合計した反射エネルギー
      var over = total > 1.0001;

      var fEl = document.getElementById("w6b_f");
      var tEl = document.getElementById("w6b_total");
      if(fEl) fEl.textContent = st.divPi
        ? (st.albedo.toFixed(2) + " ÷ π = " + f.toFixed(3))
        : (st.albedo.toFixed(2) + "（πで割らない）");
      if(tEl){
        tEl.textContent = total.toFixed(3) + (over ? " ＞ 1 ← エネルギーが増えて破綻！" : " ≦ 1 OK（保存されている）");
        tEl.style.color = over ? "var(--bad)" : "var(--good)";
      }

      // 横棒グラフ: 入射=1.0 と 反射合計
      var gx = 90, gw = w - gx - 24, barH = 30;
      var maxShow = Math.max(1.2, total*1.05);
      function bar(y, val, color, label){
        ctx.fillStyle = "rgba(27,34,45,1)";
        ctx.fillRect(gx, y, gw, barH);
        ctx.fillStyle = color;
        ctx.fillRect(gx, y, gw * Math.min(val/maxShow, 1), barH);
        ctx.fillStyle = "rgba(231,237,245,0.9)";
        ctx.font = axisFont(); ctx.textAlign = "right";
        ctx.fillText(label, gx - 8, y + barH/2 + 4);
        ctx.textAlign = "left";
        ctx.fillText(val.toFixed(3), gx + gw*Math.min(val/maxShow,1) + 6, y + barH/2 + 4);
      }
      bar(h*0.22, 1.0, "#ffc55a", "入射光");
      bar(h*0.55, total, over ? "#ff7a7a" : "#7fe3a1", "反射の合計");

      // 「1.0」の基準線
      var x1 = gx + gw*(1.0/maxShow);
      ctx.strokeStyle = "rgba(255,197,90,0.5)"; ctx.setLineDash([4,4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x1, h*0.12); ctx.lineTo(x1, h*0.9); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,197,90,0.7)"; ctx.textAlign = "center";
      ctx.fillText("1.0（入射と同じ）", x1, h*0.10);
    }

    hookResize(s, draw);
    draw();
  };

  /* =========== Ch07: マイクロファセット断面シミュレータ (W7-a) =========== */

  Widgets.microfacet2D = function(canvasId){
    var canvas = document.getElementById(canvasId);
    if(!canvas) return;
    var s = setup2D(canvas), ctx = s.ctx;
    var st = { rough: 0.4 };
    wireRange("w7a_rough", 2, function(v){ st.rough = v; });

    var NPTS = 260;
    function surfaceY(x, w, h){   // x: 画面px → 表面y(画面px)
      return h*0.68 - surfHeight(x/w, st.rough, h*0.16);
    }

    // 入射光線と表面の交点＋反射方向を求める（画面座標: yは下が正）
    var rayDir = (function(){
      var d = [0.5, 1.0], l = Math.hypot(d[0], d[1]);
      return [d[0]/l, d[1]/l];               // 右下向きに進む平行光
    })();
    function traceRay(x0){
      var w = s.w(), h = s.h();
      var px = x0, py = 0, step = 3;
      for(var i=0; i<600; i++){
        px += rayDir[0]*step; py += rayDir[1]*step;
        if(px < 0 || px > w || py > h) return null;
        var sy = surfaceY(px, w, h);
        if(py >= sy){
          // 局所法線（表面の傾きから）
          var e = 2;
          var y1 = surfaceY(px-e, w, h), y2 = surfaceY(px+e, w, h);
          var tx = 2*e, ty = y2-y1;
          var len = Math.hypot(tx, ty);
          var nx = ty/len, ny = -tx/len;      // 画面座標で上向き（y負）の単位法線
          if(ny > 0){ nx = -nx; ny = -ny; }
          var dn = rayDir[0]*nx + rayDir[1]*ny;
          var rx = rayDir[0] - 2*dn*nx, ry = rayDir[1] - 2*dn*ny;
          return { hx:px, hy:sy, rx:rx, ry:ry, sx:x0 };
        }
      }
      return null;
    }

    var t0 = performance.now();
    function draw(){
      var w = s.w(), h = s.h();
      ctx.fillStyle = "rgba(12,15,20,1)";
      ctx.fillRect(0, 0, w, h);

      // 表面
      ctx.beginPath();
      for(var i=0; i<=NPTS; i++){
        var x = (i/NPTS)*w, y = surfaceY(x, w, h);
        if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#8c99ab"; ctx.lineWidth = 2; ctx.stroke();
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
      ctx.fillStyle = "rgba(27,34,45,0.8)"; ctx.fill();

      // 光線（等間隔に8本）＋反射
      var anim = (performance.now() - t0) / 1400;   // 光子アニメーション位相
      for(var k=0; k<8; k++){
        var x0 = w*(0.06 + 0.075*k);
        var hit = traceRay(x0);
        if(!hit) continue;
        // 入射
        ctx.strokeStyle = "rgba(255,197,90,0.75)"; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(hit.sx, 0); ctx.lineTo(hit.hx, hit.hy); ctx.stroke();
        // 反射
        var rl = h*0.4;
        ctx.strokeStyle = "rgba(121,210,255,0.85)";
        ctx.beginPath(); ctx.moveTo(hit.hx, hit.hy);
        ctx.lineTo(hit.hx + hit.rx*rl, hit.hy + hit.ry*rl); ctx.stroke();
        // 光子（移動する点）
        var ph = (anim + k*0.13) % 1;
        var inLen = Math.hypot(hit.hx-hit.sx, hit.hy);
        var totLen = inLen + rl;
        var dist = ph * totLen;
        var pxp, pyp;
        if(dist < inLen){
          pxp = hit.sx + (hit.hx-hit.sx)*(dist/inLen);
          pyp = 0 + hit.hy*(dist/inLen);
          ctx.fillStyle = "#ffc55a";
        } else {
          var dr = dist - inLen;
          pxp = hit.hx + hit.rx*dr; pyp = hit.hy + hit.ry*dr;
          ctx.fillStyle = "#79d2ff";
        }
        ctx.beginPath(); ctx.arc(pxp, pyp, 3, 0, Math.PI*2); ctx.fill();
      }

      ctx.fillStyle = "rgba(140,153,171,0.9)";
      ctx.font = axisFont(); ctx.textAlign = "left";
      ctx.fillText("roughness = " + st.rough.toFixed(2) +
        (st.rough < 0.15 ? "（ほぼ鏡: 反射方向が揃う）" :
         st.rough > 0.7  ? "（粗い: 反射方向がバラバラ）" : ""), 12, 20);
    }

    (function loop(){ draw(); requestAnimationFrame(loop); })();
    hookResize(s, draw);
  };

  /* =========== Ch08: D関数グラフ (W8-a / W8-c) =========== */
  /* opts.both=true で GGX と Beckmann を重ねて描画（コラム用） */

  Widgets.dGraph = function(canvasId, opts){
    opts = opts || {};
    var canvas = document.getElementById(canvasId);
    if(!canvas) return;
    var s = setup2D(canvas), ctx = s.ctx;
    var st = { rough: 0.4 };
    wireRange(opts.roughId || "w8a_rough", 2, function(v){ st.rough = v; draw(); });

    function draw(){
      var w = s.w(), h = s.h();
      ctx.fillStyle = "rgba(12,15,20,1)";
      ctx.fillRect(0, 0, w, h);
      var gx = 52, gy = 18, gw = w - gx - 20, gh = h - gy - 40;

      var a = Math.max(st.rough*st.rough, 1e-3);
      var peakG = CT.D_GGX(1, a);
      var peakB = opts.both ? CT.D_Beckmann(1, a) : 0;
      var yMax = Math.min(Math.max(peakG, peakB) * 1.06, 8);
      if(yMax < 0.4) yMax = 0.4;
      drawAxes(ctx, gx, gy, gw, gh, yMax, yMax < 2 ? 2 : 1);

      function plot(fn, color){
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.beginPath();
        var started = false;
        for(var d=0; d<=90; d+=0.5){
          var NoH = Math.cos(d*Math.PI/180);
          var v = fn(NoH, a);
          var xx = gx + (d/90)*gw;
          var yy = gy + gh - Math.min(v/yMax, 1)*gh;
          if(!started){ ctx.moveTo(xx, yy); started = true; }
          else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
      }
      plot(CT.D_GGX, "#ffc55a");
      if(opts.both) plot(CT.D_Beckmann, "#79d2ff");

      ctx.font = axisFont(); ctx.textAlign = "left";
      ctx.fillStyle = "#ffc55a";
      ctx.fillText("GGX  ピーク D(0°) = " + peakG.toFixed(2), gx + 10, gy + 14);
      if(opts.both){
        ctx.fillStyle = "#79d2ff";
        ctx.fillText("Beckmann  ピーク D(0°) = " + peakB.toFixed(2), gx + 10, gy + 30);
        ctx.fillStyle = "rgba(140,153,171,0.8)";
        ctx.fillText("→ 裾（すそ）の高さに注目", gx + 10, gy + 46);
      }
      if(Math.max(peakG, peakB) > 8){
        ctx.fillStyle = "rgba(140,153,171,0.7)";
        ctx.fillText("※ ピークがグラフ上端を超えています（鋭すぎて表示範囲外）", gx + 10, gy + gh - 8);
      }
      ctx.fillStyle = "rgba(140,153,171,0.7)";
      ctx.textAlign = "center";
      ctx.fillText("n と h のなす角", gx + gw/2, gy + gh + 32);
    }

    hookResize(s, draw);
    draw();
  };

  /* =========== Ch09: フレネルカーブ (W9-a) =========== */

  Widgets.fresnelGraph = function(canvasId){
    var canvas = document.getElementById(canvasId);
    if(!canvas) return;
    var s = setup2D(canvas), ctx = s.ctx;
    var st = { f0: 0.04 };

    var slider = wireRange("w9a_f0", 2, function(v){ st.f0 = v; draw(); });
    document.querySelectorAll("[data-w9a]").forEach(function(b){
      b.addEventListener("click", function(){
        document.querySelectorAll("[data-w9a]").forEach(function(x){ x.classList.remove("on"); });
        b.classList.add("on");
        st.f0 = parseFloat(b.getAttribute("data-w9a"));
        if(slider){ slider.value = st.f0;
          var sp = document.getElementById("w9a_f0_val");
          if(sp) sp.textContent = st.f0.toFixed(2); }
        draw();
      });
    });

    function draw(){
      var w = s.w(), h = s.h();
      ctx.fillStyle = "rgba(12,15,20,1)";
      ctx.fillRect(0, 0, w, h);
      var gx = 52, gy = 18, gw = w - gx - 20, gh = h - gy - 40;
      drawAxes(ctx, gx, gy, gw, gh, 1.0, 2);

      ctx.strokeStyle = "#ffc55a"; ctx.lineWidth = 2;
      ctx.beginPath();
      for(var d=0; d<=90; d+=0.5){
        var c = Math.cos(d*Math.PI/180);
        var F = st.f0 + (1 - st.f0)*Math.pow(1 - c, 5);
        var xx = gx + (d/90)*gw, yy = gy + gh - F*gh;
        if(d===0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();

      // F0マーカー（0°）と 90°=1.0
      ctx.fillStyle = "#79d2ff";
      ctx.beginPath(); ctx.arc(gx, gy + gh - st.f0*gh, 4, 0, Math.PI*2); ctx.fill();
      ctx.font = axisFont(); ctx.textAlign = "left";
      ctx.fillText("F0 = " + st.f0.toFixed(2) + "（正面から見たとき）", gx + 10, gy + gh - st.f0*gh - 8);
      ctx.fillStyle = "#7fe3a1";
      ctx.beginPath(); ctx.arc(gx + gw, gy, 4, 0, Math.PI*2); ctx.fill();
      ctx.textAlign = "right";
      ctx.fillText("90°では必ず 1.0（完全な鏡）", gx + gw - 8, gy + 14);
      ctx.fillStyle = "rgba(140,153,171,0.7)";
      ctx.textAlign = "center";
      ctx.fillText("視線と面のなす角（v·h の角度）", gx + gw/2, gy + gh + 32);
    }

    hookResize(s, draw);
    draw();
  };

  /* =========== Ch10: シャドウイング/マスキング断面図 (W10-a) =========== */

  Widgets.shadowMask2D = function(canvasId){
    var canvas = document.getElementById(canvasId);
    if(!canvas) return;
    var s = setup2D(canvas), ctx = s.ctx;
    var st = { angle: 25, rough: 0.5, mode: "shadow" };  // shadow=光 / mask=視線

    wireRange("w10a_angle", 0, function(v){ st.angle = v; draw(); });
    wireRange("w10a_rough", 2, function(v){ st.rough = v; draw(); });
    document.querySelectorAll("[data-w10a]").forEach(function(b){
      b.addEventListener("click", function(){
        document.querySelectorAll("[data-w10a]").forEach(function(x){ x.classList.remove("on"); });
        b.classList.add("on");
        st.mode = b.getAttribute("data-w10a");
        draw();
      });
    });

    function draw(){
      var w = s.w(), h = s.h();
      ctx.fillStyle = "rgba(12,15,20,1)";
      ctx.fillRect(0, 0, w, h);

      var N = 300, base = h*0.62, amp = h*0.17;
      var xs = [], ys = [];   // ys: 数学座標（上が正）
      for(var i=0; i<=N; i++){
        xs.push((i/N)*w);
        ys.push(surfHeight(i/N, st.rough, amp));
      }

      // 左上（shadow）または右上（mask）からの遮蔽判定（ホライズンテスト）
      var fromLeft = (st.mode === "shadow");
      var tanA = Math.tan(st.angle*Math.PI/180);
      var visible = [], visCount = 0;
      for(var i2=0; i2<=N; i2++){
        var vis = true;
        if(fromLeft){
          for(var j=i2-1; j>=0; j--){
            if((ys[j]-ys[i2]) > (xs[i2]-xs[j])*tanA){ vis = false; break; }
          }
        } else {
          for(var j2=i2+1; j2<=N; j2++){
            if((ys[j2]-ys[i2]) > (xs[j2]-xs[i2])*tanA){ vis = false; break; }
          }
        }
        visible.push(vis);
        if(vis) visCount++;
      }

      // 表面の塗り
      ctx.beginPath();
      for(var i3=0; i3<=N; i3++){
        var y = base - ys[i3];
        if(i3===0) ctx.moveTo(xs[i3], y); else ctx.lineTo(xs[i3], y);
      }
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
      ctx.fillStyle = "rgba(27,34,45,0.8)"; ctx.fill();

      // 見えている区間＝アクセント色 / 遮られている区間＝赤
      for(var i4=0; i4<N; i4++){
        ctx.strokeStyle = visible[i4] ? (fromLeft ? "#ffc55a" : "#79d2ff") : "#ff7a7a";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(xs[i4],   base - ys[i4]);
        ctx.lineTo(xs[i4+1], base - ys[i4+1]);
        ctx.stroke();
      }

      // 方向矢印（光 or 視線）
      var dirCol = fromLeft ? "#ffc55a" : "#79d2ff";
      var ax0 = fromLeft ? w*0.10 : w*0.90;
      var ay0 = h*0.10;
      var dx = (fromLeft ? 1 : -1) * Math.cos(st.angle*Math.PI/180);
      var dy = Math.sin(st.angle*Math.PI/180);
      arrow(ctx, ax0, ay0, ax0 + dx*70, ay0 + dy*70, dirCol, 2.5);
      ctx.fillStyle = dirCol; ctx.font = axisFont(); ctx.textAlign = fromLeft ? "left" : "right";
      ctx.fillText(fromLeft ? "光（シャドウイング判定）" : "視線（マスキング判定）",
                   fromLeft ? ax0 + 8 : ax0 - 8, ay0 - 8);

      // 数値: 見えている割合（≒ G の直感）
      var ratio = visCount/(N+1);
      var el2 = document.getElementById("w10a_ratio");
      if(el2){
        el2.textContent = (ratio*100).toFixed(1) + "%";
        el2.style.color = ratio > 0.8 ? "var(--good)" : (ratio > 0.5 ? "var(--photon)" : "var(--bad)");
      }
      ctx.fillStyle = "rgba(140,153,171,0.9)"; ctx.textAlign = "left";
      ctx.fillText("赤 = 遮られて寄与できない部分", 12, h - 12);
    }

    hookResize(s, draw);
    draw();
  };

  /* =========== Ch10: G関数グラフ (W10-b) =========== */

  Widgets.gGraph = function(canvasId){
    var canvas = document.getElementById(canvasId);
    if(!canvas) return;
    var s = setup2D(canvas), ctx = s.ctx;
    var st = { rough: 0.5 };
    wireRange("w10b_rough", 2, function(v){ st.rough = v; draw(); });

    function G1(NoX, k){ return NoX/(NoX*(1-k)+k); }

    function draw(){
      var w = s.w(), h = s.h();
      ctx.fillStyle = "rgba(12,15,20,1)";
      ctx.fillRect(0, 0, w, h);
      var gx = 52, gy = 18, gw = w - gx - 20, gh = h - gy - 40;
      drawAxes(ctx, gx, gy, gw, gh, 1.0, 2);

      var k = (st.rough+1)*(st.rough+1)/8;
      ctx.strokeStyle = "#ffc55a"; ctx.lineWidth = 2;
      ctx.beginPath();
      for(var d=0; d<=89.5; d+=0.5){
        var c = Math.cos(d*Math.PI/180);
        var g = G1(c, k);
        var xx = gx + (d/90)*gw, yy = gy + gh - Math.min(g,1)*gh;
        if(d===0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();

      ctx.font = axisFont(); ctx.textAlign = "left";
      ctx.fillStyle = "#ffc55a";
      ctx.fillText("G1(θ)   k = (rough+1)²/8 = " + k.toFixed(3), gx + 10, gy + 14);
      ctx.fillStyle = "rgba(140,153,171,0.8)";
      ctx.fillText("G = G1(ライト角) × G1(視線角)", gx + 10, gy + 30);
      ctx.fillStyle = "rgba(140,153,171,0.7)";
      ctx.textAlign = "center";
      ctx.fillText("n と方向のなす角（90°に近い=浅い角度）", gx + gw/2, gy + gh + 32);
    }

    hookResize(s, draw);
    draw();
  };

  /* =========== Ch11: ステップ実行計算機 (W11-a) =========== */

  Widgets.stepCalc = function(tableId){
    var body = document.getElementById(tableId);
    if(!body) return;

    function val(id){ return parseFloat(document.getElementById(id).value); }
    function hex(id){ return document.getElementById(id).value; }
    function f(x, d){ return (+x).toFixed(d==null?4:d); }
    function rgb(v, d){ return f(v[0],d)+" "+f(v[1],d)+" "+f(v[2],d); }
    function row(name, formula, num, cls){
      return "<tr class='"+(cls||"")+"'><td class='name'>"+name+
        (formula ? "<div class='desc'>"+formula+"</div>" : "")+
        "</td><td class='num'>"+num+"</td></tr>";
    }
    function head(txt){
      return "<tr><td colspan='2' style='padding:10px 14px;font-family:var(--mono);font-size:11px;"+
        "letter-spacing:.14em;text-transform:uppercase;color:var(--spec);"+
        "border-bottom:1px solid var(--panel-2)'>"+txt+"</td></tr>";
    }

    function recompute(){
      var thl = val("w11_thl")*Math.PI/180, thv = val("w11_thv")*Math.PI/180;
      var N = [0,1,0];
      var L = [Math.sin(thl),  Math.cos(thl), 0];
      var V = [-Math.sin(thv), Math.cos(thv), 0];
      var p = {
        N:N, L:L, V:V,
        baseColorLin:  CT.hex2lin(hex("w11_base")),
        lightColorLin: CT.hex2lin(hex("w11_lcol")),
        lightInt: val("w11_lint"),
        rough: val("w11_rough"), metal: val("w11_metal"), f0d: val("w11_f0")
      };
      var r = CT.evaluate(p);

      // 途中式の数値（表示用に再計算。CT.evaluate と同一ロジック）
      var a2 = r.alpha*r.alpha;
      var dd = r.NoH*r.NoH*(a2-1)+1;
      var k  = (p.rough+1)*(p.rough+1)/8;
      var g1l = r.NoL/(r.NoL*(1-k)+k), g1v = r.NoV/(r.NoV*(1-k)+k);
      var pw = Math.pow(1-r.VoH, 5);
      var denom = Math.max(4*r.NoL*r.NoV, 1e-4);

      var htmlStr = "";
      htmlStr += head("STEP 1 — ベクトルを揃える");
      htmlStr += row("l（ライト方向）", "仰角から作成・長さ1", "("+rgb(r.L,3)+")");
      htmlStr += row("v（視線方向）", "仰角から作成・長さ1", "("+rgb(r.V,3)+")");
      htmlStr += row("h（ハーフベクトル）", "normalize(l + v)", "("+rgb(r.H,3)+")");

      htmlStr += head("STEP 2 — 内積（揃い具合）");
      htmlStr += row("n·l", "max(0, 内積)", f(r.NoL));
      htmlStr += row("n·v", "", f(r.NoV));
      htmlStr += row("n·h", "", f(r.NoH));
      htmlStr += row("v·h", "", f(r.VoH));

      htmlStr += head("STEP 3 — D項（GGX）");
      htmlStr += row("α = roughness²", f(p.rough,2)+"² ", f(r.alpha));
      htmlStr += row("α²", f(r.alpha)+"²", f(a2, 6));
      htmlStr += row("d = (n·h)²(α²−1)+1", f(r.NoH)+"²×("+f(a2,4)+"−1)+1", f(dd));
      htmlStr += row("D = α² / (π·d²)", f(a2,6)+" / (π×"+f(dd)+"²)", f(r.D), "hl");

      htmlStr += head("STEP 4 — G項（Smith + Schlick-GGX）");
      htmlStr += row("k = (rough+1)²/8", "("+f(p.rough,2)+"+1)²/8", f(k));
      htmlStr += row("G1(n·l)", f(r.NoL)+"/("+f(r.NoL)+"×(1−k)+k)", f(g1l));
      htmlStr += row("G1(n·v)", f(r.NoV)+"/("+f(r.NoV)+"×(1−k)+k)", f(g1v));
      htmlStr += row("G = G1(l)·G1(v)", f(g1l)+" × "+f(g1v), f(r.G), "hl");

      htmlStr += head("STEP 5 — F項（Schlick）");
      htmlStr += row("F0", "mix("+f(p.f0d,3)+", albedo, metallic="+f(p.metal,2)+")", rgb(r.F0,3));
      htmlStr += row("(1−v·h)⁵", "(1−"+f(r.VoH)+")⁵", f(pw, 6));
      htmlStr += row("F = F0+(1−F0)(1−v·h)⁵", "", rgb(r.F,3), "hl");

      htmlStr += head("STEP 6 — 合成");
      htmlStr += row("分母 4(n·l)(n·v)", "4×"+f(r.NoL)+"×"+f(r.NoV), f(denom));
      htmlStr += row("specular = D·G·F / 分母", "", rgb(r.specular,4));
      htmlStr += row("kd = (1−F)(1−metallic)", "スペキュラに使われた残り", rgb(r.kd,3));
      htmlStr += row("diffuse = kd·albedo/π", "", rgb(r.diffuse,4));
      htmlStr += row("Lc（光の色×強度）", "", rgb(r.radiance,3));
      htmlStr += row("Lo = (diff+spec)·Lc·(n·l)", "リニア値", rgb(r.outLinear,4));
      htmlStr += row("最終色", "トーンマップ後 (sRGB)",
        r.outHex+"<span class='swatch' style='background:"+r.outHex+"'></span>", "total");

      body.innerHTML = htmlStr;
    }

    ["w11_thl","w11_thv","w11_rough","w11_metal","w11_f0","w11_lint"].forEach(function(id){
      var digits = (id==="w11_thl"||id==="w11_thv") ? 0 : 2;
      wireRange(id, digits, recompute);
    });
    ["w11_base","w11_lcol"].forEach(function(id){
      var inp = document.getElementById(id);
      if(inp) inp.addEventListener("input", function(){
        var sp = document.getElementById(id+"_val");
        if(sp) sp.textContent = inp.value;
        recompute();
      });
    });
    recompute();
  };

  global.Widgets = Widgets;
})(window);
