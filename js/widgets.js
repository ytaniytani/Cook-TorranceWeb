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

  global.Widgets = Widgets;
})(window);
