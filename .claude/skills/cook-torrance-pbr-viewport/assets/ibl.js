/* ibl.js — 環境マップ(IBL)の共有ヘルパ
   envmap.js の RGBM データを WebGL テクスチャ化し、球シェーダへのバインドと
   背景描画を提供する。GLコンテキストごとにテクスチャを遅延生成してキャッシュ。
   依存: glmini.js, shaders.js, envmap.js
   グローバル: window.IBL
*/
(function (global) {
  "use strict";

  var ENV = global.ENVMAPS || null;

  /* ---- base64 → Uint8Array（1度だけ復号してキャッシュ） ---- */
  var decoded = {};
  function b64bytes(b64){
    var bin = global.atob(b64), n = bin.length, a = new Uint8Array(n);
    for (var i=0;i<n;i++) a[i]=bin.charCodeAt(i);
    return a;
  }
  function decode(name){
    if (decoded[name]) return decoded[name];
    var m = ENV.maps[name];
    var d = { mips: [], irr: null };
    for (var i=0;i<m.mips.length;i++){
      var lv=m.mips[i]; d.mips.push({ w:lv.w, h:lv.h, bytes:b64bytes(lv.d) });
    }
    d.irr = { w:m.irr.w, h:m.irr.h, bytes:b64bytes(m.irr.d) };
    decoded[name]=d;
    return d;
  }

  /* ---- GLコンテキストごとの状態 ---- */
  function glState(gl){
    if (gl.__ibl) return gl.__ibl;
    var S = { tex:{}, bgProg:null, bgLoc:null, quad:null };
    gl.__ibl = S;
    return S;
  }

  function makeTex(gl, w, h, bytes){
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    // equirect: 経度方向はラップ、緯度方向はクランプ。サイズは全て2の冪なのでREPEAT可。
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }

  function textures(gl, name){
    var S = glState(gl);
    if (S.tex[name]) return S.tex[name];
    var d = decode(name);
    var t = { mips: [], irr: null };
    for (var i=0;i<d.mips.length;i++){
      var lv=d.mips[i]; t.mips.push(makeTex(gl, lv.w, lv.h, lv.bytes));
    }
    t.irr = makeTex(gl, d.irr.w, d.irr.h, d.irr.bytes);
    S.tex[name]=t;
    return t;
  }

  function available(name){
    return !!(ENV && name && name!=="none" && ENV.maps[name]);
  }

  /* ---- 球シェーダのenvユニフォーム位置（progにキャッシュ） ---- */
  function sphereLoc(gl, prog){
    if (prog.__envLoc) return prog.__envLoc;
    var L={};
    ["uUseEnv","uEnvInt","uEnv0","uEnv1","uEnv2","uEnv3","uEnv4","uEnvIrr"]
      .forEach(function(n){ L[n]=gl.getUniformLocation(prog,n); });
    prog.__envLoc=L;
    return L;
  }

  /* env を球プログラムにバインド（呼び出し側で useProgram(prog) 済みであること） */
  function bind(gl, prog, name, envInt){
    var L = sphereLoc(gl, prog);
    if (!available(name)){ gl.uniform1i(L.uUseEnv, 0); return; }
    var t = textures(gl, name);
    for (var i=0;i<5;i++){
      gl.activeTexture(gl.TEXTURE0+i);
      gl.bindTexture(gl.TEXTURE_2D, t.mips[i]);
      gl.uniform1i(L["uEnv"+i], i);
    }
    gl.activeTexture(gl.TEXTURE0+5);
    gl.bindTexture(gl.TEXTURE_2D, t.irr);
    gl.uniform1i(L.uEnvIrr, 5);
    gl.uniform1i(L.uUseEnv, 1);
    gl.uniform1f(L.uEnvInt, envInt==null?1.0:envInt);
  }

  /* ---- 背景（全画面）描画 ---- */
  function ensureBg(gl){
    var S = glState(gl);
    if (S.bgProg) return S;
    S.bgProg = GLMini.program(gl, SHADERS.bgVert, SHADERS.bgFrag);
    var L={};
    L.aP = gl.getAttribLocation(S.bgProg, "aP");
    ["uInvVP","uCamPos","uEnvInt","uBgBlur","uEnv0","uEnvB"]
      .forEach(function(n){ L[n]=gl.getUniformLocation(S.bgProg,n); });
    S.bgLoc = L;
    S.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, S.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,-1,  1,-1,  -1,1,   -1,1,  1,-1,  1,1
    ]), gl.STATIC_DRAW);
    return S;
  }

  /* 背景を描く。depthテストは一時的に無効化。envが無ければ false を返す。 */
  function drawBackground(gl, name, invVP, camPos, envInt, bgBlur){
    if (!available(name)) return false;
    var S = ensureBg(gl);
    var t = textures(gl, name);
    gl.useProgram(S.bgProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, S.quad);
    gl.enableVertexAttribArray(S.bgLoc.aP);
    gl.vertexAttribPointer(S.bgLoc.aP, 2, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(S.bgLoc.uInvVP, false, invVP);
    gl.uniform3fv(S.bgLoc.uCamPos, camPos);
    gl.uniform1f(S.bgLoc.uEnvInt, envInt==null?1.0:envInt);
    gl.uniform1f(S.bgLoc.uBgBlur, bgBlur==null?0.0:bgBlur);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t.mips[0]); gl.uniform1i(S.bgLoc.uEnv0, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, t.mips[2]); gl.uniform1i(S.bgLoc.uEnvB, 1);
    var hadDepth = gl.getParameter(gl.DEPTH_TEST);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.depthMask(true);
    if (hadDepth) gl.enable(gl.DEPTH_TEST);
    return true;
  }

  global.IBL = {
    ENV: ENV,
    order: ENV ? ENV.order : [],
    labels: ENV ? ENV.labels : {},
    available: available,
    bind: bind,
    drawBackground: drawBackground
  };
})(window);
