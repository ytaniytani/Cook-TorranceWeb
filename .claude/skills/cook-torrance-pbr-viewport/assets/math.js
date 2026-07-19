/* math.js — Cook-Torrance を CPU で計算（シェーダと同一ロジック）
   ピクセル検査・ステップ計算機・グラフウィジェットが共用する。
   グローバル: window.CT
*/
(function (global) {
  "use strict";

  var PI = Math.PI;
  function dot(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
  function add(a,b){ return [a[0]+b[0],a[1]+b[1],a[2]+b[2]]; }
  function sub(a,b){ return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]; }
  function scale(a,s){ return [a[0]*s,a[1]*s,a[2]*s]; }
  function mulv(a,b){ return [a[0]*b[0],a[1]*b[1],a[2]*b[2]]; }
  function norm(a){ var l=Math.hypot(a[0],a[1],a[2])||1; return [a[0]/l,a[1]/l,a[2]/l]; }

  /* sRGB <-> linear */
  function s2l(c){ return c<=0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); }
  function l2s(c){ c=Math.max(0,Math.min(1,c)); return c<=0.0031308 ? c*12.92 : 1.055*Math.pow(c,1/2.4)-0.055; }
  function hex2lin(hex){
    hex=hex.replace('#','');
    var r=parseInt(hex.substr(0,2),16)/255, g=parseInt(hex.substr(2,2),16)/255, b=parseInt(hex.substr(4,2),16)/255;
    return [s2l(r), s2l(g), s2l(b)];
  }
  function lin2hex(c){
    function h(x){ var v=Math.round(l2s(x)*255); v=Math.max(0,Math.min(255,v)); return ('0'+v.toString(16)).slice(-2); }
    return '#'+h(c[0])+h(c[1])+h(c[2]);
  }
  function tone(c){ // Reinhard + gamma、シェーダと一致
    function t(x){ x=x/(x+1); return Math.pow(Math.max(0,x),1/2.2); }
    return [t(c[0]),t(c[1]),t(c[2])];
  }
  function tone2hex(c){
    var t=tone(c);
    function h(x){ var v=Math.round(Math.max(0,Math.min(1,x))*255); return ('0'+v.toString(16)).slice(-2); }
    return '#'+h(t[0])+h(t[1])+h(t[2]);
  }

  function D_GGX(NoH, a){ var a2=a*a, d=NoH*NoH*(a2-1)+1; return a2/(PI*d*d); }
  function G1(NoX,k){ return NoX/(NoX*(1-k)+k); }
  function G_Smith(NoL,NoV,rough){ var k=(rough+1)*(rough+1)/8; return G1(NoL,k)*G1(NoV,k); }
  function F_Schlick(VoH, F0){ var p=Math.pow(1-VoH,5); return [ F0[0]+(1-F0[0])*p, F0[1]+(1-F0[1])*p, F0[2]+(1-F0[2])*p ]; }

  /* Beckmann（第8章コラム比較用） */
  function D_Beckmann(NoH, m){
    var c2=NoH*NoH; if(c2<=0) return 0;
    var t2=(1-c2)/c2; // tan^2
    return Math.exp(-t2/(m*m)) / (PI*m*m*c2*c2);
  }

  /* すべての中間値を返す評価
     p: { N,L,V (vec3), baseColorLin (vec3), lightColorLin(vec3), lightInt, rough, metal, f0d } */
  function evaluate(p){
    var N=norm(p.N), L=norm(p.L), V=norm(p.V);
    var H=norm(add(V,L));
    var NoL=Math.max(dot(N,L),0), NoV=Math.max(dot(N,V),1e-4),
        NoH=Math.max(dot(N,H),0), VoH=Math.max(dot(V,H),0);
    var a=p.rough*p.rough;
    var F0=[ p.f0d+(p.baseColorLin[0]-p.f0d)*p.metal,
             p.f0d+(p.baseColorLin[1]-p.f0d)*p.metal,
             p.f0d+(p.baseColorLin[2]-p.f0d)*p.metal ];
    var D=D_GGX(NoH,a);
    var G=G_Smith(NoL,NoV,p.rough);
    var F=F_Schlick(VoH,F0);
    var denom=Math.max(4*NoL*NoV,1e-4);
    var spec=[ D*G*F[0]/denom, D*G*F[1]/denom, D*G*F[2]/denom ];
    var kd=[ (1-F[0])*(1-p.metal), (1-F[1])*(1-p.metal), (1-F[2])*(1-p.metal) ];
    var diff=[ kd[0]*p.baseColorLin[0]/PI, kd[1]*p.baseColorLin[1]/PI, kd[2]*p.baseColorLin[2]/PI ];
    var rad=scale(p.lightColorLin, p.lightInt);
    var out=[ (diff[0]+spec[0])*rad[0]*NoL, (diff[1]+spec[1])*rad[1]*NoL, (diff[2]+spec[2])*rad[2]*NoL ];
    return {
      N:N,L:L,V:V,H:H, NoL:NoL,NoV:NoV,NoH:NoH,VoH:VoH,
      alpha:a, F0:F0, D:D, G:G, F:F, kd:kd,
      diffuse:diff, specular:spec, radiance:rad, outLinear:out,
      outHex: tone2hex(out)
    };
  }

  global.CT = {
    dot:dot, add:add, sub:sub, scale:scale, mulv:mulv, norm:norm,
    s2l:s2l, l2s:l2s, hex2lin:hex2lin, lin2hex:lin2hex, tone:tone, tone2hex:tone2hex,
    D_GGX:D_GGX, G_Smith:G_Smith, F_Schlick:F_Schlick, D_Beckmann:D_Beckmann,
    evaluate:evaluate, PI:PI
  };
})(window);
