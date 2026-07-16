/* viewport.js — 総合ビューポート（Substance風）
   Viewport.mount(container, opts) でコンテナ内に丸ごと構築する。
   opts:
     controls: true          パラメータUIを表示
     modes:    true          項別表示セレクタを表示
     readout:  true          ピクセル検査パネルを表示
     lockMode: null|0..6     固定表示モード（ミニビューア用。指定時 modes を無視）
     initial:  {...}         初期パラメータ上書き
   依存: glmini.js, shaders.js, math.js
   グローバル: window.Viewport
*/
(function (global) {
  "use strict";

  var MODE_LABELS = ["Final","Diffuse","Specular","D 項","F 項","G 項","n·l"];

  function el(tag, cls, html){ var e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }

  function mount(container, opts){
    opts = opts || {};
    if (typeof container === "string") container = document.querySelector(container);
    // <canvas> を渡された場合は同じ位置に <div> を作って差し替える
    // （mount はコンテナ内にシェルを生成するため、canvas 直下だと描画されない）
    if (container && container.tagName === "CANVAS"){
      var repl = document.createElement("div");
      if (container.id) repl.id = container.id;
      if (container.className) repl.className = container.className;
      container.parentNode.replaceChild(repl, container);
      container = repl;
    }

    var state = {
      baseHex: "#c8c8c8",
      lightHex:"#fff4e0",
      lightInt: 3.0,
      rough: 0.35,
      metal: 0.0,
      f0d: 0.04,
      az: 40,   // ライト方位角(deg)
      el: 35,   // ライト仰角(deg)
      isPoint: 0,
      mode: (opts.lockMode!=null? opts.lockMode : 0),
      env: (opts.env!==undefined ? opts.env : (opts.lockMode!=null ? "none" : "751")),
      envInt: (opts.envInt!==undefined ? opts.envInt : 1.4),
      bgBlur: (opts.bgBlur!==undefined ? opts.bgBlur : 0.25)
    };
    if (opts.initial) for (var k in opts.initial) state[k]=opts.initial[k];

    /* ---------- DOM 構築 ---------- */
    // 右カラム（controls/readout）を持たないミニビューアは単一カラム表示
    var solo = (opts.controls===false) && (opts.readout===false);
    var shell = el("div", solo ? "vp-shell vp-solo" : "vp-shell");
    var stage = el("div","vp-stage");
    var canvas = el("canvas");
    stage.appendChild(canvas);
    stage.appendChild(el("div","vp-badge", opts.lockMode!=null ? MODE_LABELS[state.mode]+" のみ" : "Cook-Torrance / GGX"));
    if (opts.lockMode==null) stage.appendChild(el("div","vp-hint","ドラッグ:回転  ホイール:ズーム  クリック:検査"));
    shell.appendChild(stage);

    var side = el("div"); // 右カラム（controls + readout）
    if (opts.controls!==false){
      side.appendChild(buildControls(state, opts));
    }
    if (!solo) shell.appendChild(side);
    container.appendChild(shell);

    /* ---------- WebGL 初期化 ---------- */
    var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if(!gl){ stage.innerHTML="<div style='padding:20px;color:#ff7a7a;font-family:monospace'>WebGL が利用できません。</div>"; return null; }

    var prog = GLMini.program(gl, SHADERS.vert, SHADERS.frag);
    var mesh = GLMini.makeSphere(120);
    var pbuf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,pbuf); gl.bufferData(gl.ARRAY_BUFFER,mesh.pos,gl.STATIC_DRAW);
    var nbuf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,nbuf); gl.bufferData(gl.ARRAY_BUFFER,mesh.nrm,gl.STATIC_DRAW);
    var ibuf=gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.idx,gl.STATIC_DRAW);

    var loc = {};
    ["aPos","aNrm"].forEach(function(n){ loc[n]=gl.getAttribLocation(prog,n); });
    ["uMVP","uModel","uCamPos","uLightDir","uLightPos","uLightIsPoint","uLightColor","uLightInt",
     "uBaseColor","uRough","uMetal","uF0dielectric","uMode"].forEach(function(n){ loc[n]=gl.getUniformLocation(prog,n); });

    gl.enable(gl.DEPTH_TEST);

    var FOV = 45*Math.PI/180;
    var cam = new GLMini.OrbitCam(canvas, { onChange: draw });
    container._resetCam = function(){ cam.reset(); };

    function lightDir(){
      var e=state.el*Math.PI/180, a=state.az*Math.PI/180;
      return [ Math.cos(e)*Math.sin(a), Math.sin(e), Math.cos(e)*Math.cos(a) ];
    }
    function lightPos(){ var d=lightDir(); return [d[0]*4, d[1]*4, d[2]*4]; }

    function resize(){
      var dpr=Math.min(window.devicePixelRatio||1, 2);
      var w=stage.clientWidth, h=stage.clientHeight;
      canvas.width=Math.max(1,Math.round(w*dpr)); canvas.height=Math.max(1,Math.round(h*dpr));
      draw();
    }

    var proj=M4.create(), view=M4.create(), model=M4.create(), mvp=M4.create(), invVP=M4.create();
    var useEnv = (opts.env!==false) && (typeof IBL!=="undefined");

    function draw(){
      var w=canvas.width, h=canvas.height; if(!w||!h) return;
      gl.viewport(0,0,w,h);
      gl.clearColor(0.024,0.031,0.043,1); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

      var aspect=w/h;
      M4.perspective(proj, FOV, aspect, 0.1, 100);
      var eye=cam.eye();
      M4.lookAt(view, eye, [0,0,0], [0,1,0]);
      M4.mul(mvp, proj, view);

      // 背景（環境マップ）
      var envOn = useEnv && IBL.available(state.env);
      if (envOn){
        M4.invert(invVP, mvp);
        IBL.drawBackground(gl, state.env, invVP, eye, state.envInt, state.bgBlur);
      }

      gl.useProgram(prog);
      gl.uniformMatrix4fv(loc.uMVP,false,mvp);
      gl.uniformMatrix4fv(loc.uModel,false,model);
      gl.uniform3fv(loc.uCamPos, eye);
      var ld=lightDir(), lp=lightPos();
      gl.uniform3fv(loc.uLightDir, ld);
      gl.uniform3fv(loc.uLightPos, lp);
      gl.uniform1i(loc.uLightIsPoint, state.isPoint);
      gl.uniform3fv(loc.uLightColor, CT.hex2lin(state.lightHex));
      gl.uniform1f(loc.uLightInt, state.lightInt);
      gl.uniform3fv(loc.uBaseColor, CT.hex2lin(state.baseHex));
      gl.uniform1f(loc.uRough, state.rough);
      gl.uniform1f(loc.uMetal, state.metal);
      gl.uniform1f(loc.uF0dielectric, state.f0d);
      gl.uniform1i(loc.uMode, state.mode);

      if (useEnv) IBL.bind(gl, prog, envOn ? state.env : "none", state.envInt);

      gl.bindBuffer(gl.ARRAY_BUFFER,pbuf); gl.enableVertexAttribArray(loc.aPos); gl.vertexAttribPointer(loc.aPos,3,gl.FLOAT,false,0,0);
      gl.bindBuffer(gl.ARRAY_BUFFER,nbuf); gl.enableVertexAttribArray(loc.aNrm); gl.vertexAttribPointer(loc.aNrm,3,gl.FLOAT,false,0,0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibuf);
      gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_SHORT, 0);
    }

    /* ---------- ピクセル検査 ---------- */
    var readoutFill = null;
    if (opts.readout!==false && opts.lockMode==null){
      var ro = buildReadout();
      side.appendChild(ro.node);
      readoutFill = ro.fill;

      var moved=false;
      canvas.addEventListener("mousedown", function(){ moved=false; });
      canvas.addEventListener("mousemove", function(e){ if(e.buttons) moved=true; });
      canvas.addEventListener("click", function(e){
        if(moved) return;
        var r=canvas.getBoundingClientRect();
        var nx=((e.clientX-r.left)/r.width)*2-1;
        var ny=-(((e.clientY-r.top)/r.height)*2-1);
        var N=GLMini.pickNormal(cam, canvas.width/canvas.height, FOV, nx, ny);
        if(!N){ readoutFill(null); return; }
        inspect(N);
      });
    }

    function inspect(N){
      if(!readoutFill) return;
      var eye=cam.eye();
      var V=CT.sub(eye,N); // 表面点=N（単位球）
      var L = state.isPoint ? CT.sub(lightPos(),N) : lightDir();
      var res=CT.evaluate({
        N:N, L:L, V:V,
        baseColorLin:CT.hex2lin(state.baseHex),
        lightColorLin:CT.hex2lin(state.lightHex),
        lightInt:state.lightInt, rough:state.rough, metal:state.metal, f0d:state.f0d
      });
      readoutFill(res);
    }

    /* ---------- コントロールの結線 ---------- */
    wireControls(container, state, {
      onAny: function(){ draw(); if(readoutFill) readoutFill(null); },
      onMode: function(m){ state.mode=m; draw(); }
    });

    window.addEventListener("resize", resize);
    // 初回サイズ確定（レイアウト後）
    requestAnimationFrame(function(){ resize(); });

    return { state:state, draw:draw, cam:cam, resetCam:function(){cam.reset();} };
  }

  /* ================= コントロールUI ================= */
  function buildControls(state, opts){
    var p = el("div","panel");
    var html = "";

    if (opts.modes!==false && opts.lockMode==null){
      html += "<h4>表示モード</h4><div class='seg' data-seg='mode'>";
      for (var i=0;i<MODE_LABELS.length;i++)
        html += "<button data-mode='"+i+"'"+(i===state.mode?" class='on'":"")+">"+MODE_LABELS[i]+"</button>";
      html += "</div>";
    }

    html += "<h4>マテリアル</h4>";
    html += ctrlColor("ベースカラー","base",state.baseHex);
    html += ctrlRange("ラフネス roughness","rough",0,1,0.01,state.rough);
    html += ctrlRange("メタリック metallic","metal",0,1,0.01,state.metal);
    html += ctrlRange("F0（非金属）","f0d",0,0.08,0.001,state.f0d);

    html += "<h4>ライト</h4>";
    html += "<div class='seg' data-seg='ltype' style='margin-bottom:10px'>"+
            "<button data-lt='0'"+(state.isPoint?"":" class='on'")+">平行光</button>"+
            "<button data-lt='1'"+(state.isPoint?" class='on'":"")+">点光源</button></div>";
    html += ctrlColor("ライト色","light",state.lightHex);
    html += ctrlRange("強度","lint",0,10,0.1,state.lightInt);
    html += ctrlRange("方位角 az","az",-180,180,1,state.az,"°");
    html += ctrlRange("仰角 el","el",-10,89,1,state.el,"°");

    if (opts.env!==false && opts.lockMode==null){
      html += "<h4>環境 (IBL)</h4>";
      html += "<div class='seg' data-seg='env' style='margin-bottom:10px'>";
      var order = (typeof IBL!=="undefined" && IBL.order && IBL.order.length) ? IBL.order : ["751","758"];
      var labels = (typeof IBL!=="undefined" && IBL.labels) ? IBL.labels : {};
      for (var e=0;e<order.length;e++){
        var key=order[e], lab=labels[key]||key;
        html += "<button data-env='"+key+"'"+(state.env===key?" class='on'":"")+">"+lab+"</button>";
      }
      html += "<button data-env='none'"+(state.env==="none"?" class='on'":"")+">黒</button>";
      html += "</div>";
      html += ctrlRange("環境強度","envint",0,4,0.05,state.envInt);
    }

    html += "<h4>ビュー</h4><button class='btn' data-act='resetcam'>カメラをリセット</button>";

    p.innerHTML = html;
    return p;
  }
  function ctrlRange(label,key,min,max,step,val,unit){
    unit=unit||"";
    return "<div class='ctrl'><div class='row'><label>"+label+"</label>"+
      "<span class='val' data-val='"+key+"'>"+fmt(val)+unit+"</span></div>"+
      "<input type='range' data-k='"+key+"' min='"+min+"' max='"+max+"' step='"+step+"' value='"+val+"'></div>";
  }
  function ctrlColor(label,key,val){
    return "<div class='ctrl'><div class='row'><label>"+label+"</label>"+
      "<span class='val' data-val='"+key+"'>"+val+"</span></div>"+
      "<input type='color' data-k='"+key+"' value='"+val+"'></div>";
  }
  function fmt(v){ v=+v; return (Math.abs(v)>=100||Number.isInteger(v))? String(v) : v.toFixed(2); }

  function wireControls(container, state, cb){
    // ranges
    container.querySelectorAll("input[type=range]").forEach(function(inp){
      inp.addEventListener("input", function(){
        var key=inp.getAttribute("data-k"), v=parseFloat(inp.value);
        var map={rough:"rough",metal:"metal",f0d:"f0d",lint:"lightInt",az:"az",el:"el",envint:"envInt"};
        state[map[key]]=v;
        var span=container.querySelector("[data-val='"+key+"']");
        var unit=(key==="az"||key==="el")?"°":"";
        if(span) span.textContent=fmt(v)+unit;
        cb.onAny();
      });
    });
    // colors
    container.querySelectorAll("input[type=color]").forEach(function(inp){
      inp.addEventListener("input", function(){
        var key=inp.getAttribute("data-k"), v=inp.value;
        if(key==="base") state.baseHex=v; else if(key==="light") state.lightHex=v;
        var span=container.querySelector("[data-val='"+key+"']"); if(span) span.textContent=v;
        cb.onAny();
      });
    });
    // mode segment
    var seg=container.querySelector("[data-seg='mode']");
    if(seg) seg.addEventListener("click", function(e){
      var b=e.target.closest("button[data-mode]"); if(!b) return;
      seg.querySelectorAll("button").forEach(function(x){x.classList.remove("on");});
      b.classList.add("on"); cb.onMode(parseInt(b.getAttribute("data-mode"),10));
    });
    // light type
    var lt=container.querySelector("[data-seg='ltype']");
    if(lt) lt.addEventListener("click", function(e){
      var b=e.target.closest("button[data-lt]"); if(!b) return;
      lt.querySelectorAll("button").forEach(function(x){x.classList.remove("on");});
      b.classList.add("on"); state.isPoint=parseInt(b.getAttribute("data-lt"),10); cb.onAny();
    });
    // environment (IBL)
    var ev=container.querySelector("[data-seg='env']");
    if(ev) ev.addEventListener("click", function(e){
      var b=e.target.closest("button[data-env]"); if(!b) return;
      ev.querySelectorAll("button").forEach(function(x){x.classList.remove("on");});
      b.classList.add("on"); state.env=b.getAttribute("data-env"); cb.onAny();
    });
    // reset cam
    var rc=container.querySelector("[data-act='resetcam']");
    if(rc) rc.addEventListener("click", function(){ if(container._resetCam) container._resetCam(); });
  }

  /* ================= 読み取りパネル ================= */
  function buildReadout(){
    var node=el("div","readout");
    node.innerHTML =
      "<div class='rhead'><span>ピクセル検査</span><span class='dot' data-dot></span></div>"+
      "<table class='rtable'><tbody data-body>"+
        "<tr><td class='name' colspan='2' style='color:var(--ink-mute)'>球体をクリックすると、その点の全計算値を表示します。</td></tr>"+
      "</tbody></table>";
    function row(name,desc,num,cls){
      return "<tr class='"+(cls||"")+"'><td class='name'>"+name+
        (desc?"<div class='desc'>"+desc+"</div>":"")+"</td><td class='num'>"+num+"</td></tr>";
    }
    function fill(r){
      var body=node.querySelector("[data-body]"), dot=node.querySelector("[data-dot]");
      if(!r){
        dot.classList.remove("live");
        body.innerHTML = "<tr><td class='name' colspan='2' style='color:var(--ink-mute)'>球体をクリックすると、その点の全計算値を表示します。</td></tr>";
        return;
      }
      dot.classList.add("live");
      function f(x,d){ return (+x).toFixed(d==null?3:d); }
      var html="";
      html+=row("n·l","面と光の揃い", f(r.NoL));
      html+=row("n·v","面と視線の揃い", f(r.NoV));
      html+=row("n·h","面とハーフの揃い", f(r.NoH));
      html+=row("v·h","視線とハーフ", f(r.VoH));
      html+=row("α = rough²","D項の粗さ", f(r.alpha));
      html+=row("D","法線分布(GGX)", f(r.D,3));
      html+=row("G","幾何減衰", f(r.G));
      html+=row("F","フレネル(RGB)", f(r.F[0])+" "+f(r.F[1])+" "+f(r.F[2]));
      html+=row("kd","拡散の割合", f(r.kd[0])+" "+f(r.kd[1])+" "+f(r.kd[2]));
      var col = r.outHex;
      html+=row("最終色", "トーンマップ後", col+"<span class='swatch' style='background:"+col+"'></span>","total");
      body.innerHTML=html;
    }
    return { node:node, fill:fill };
  }

  global.Viewport = { mount: mount, MODE_LABELS: MODE_LABELS };
})(window);
