/* shaders.js — GLSL を文字列として保持（file:// で fetch を使わないため）
   グローバル: window.SHADERS.vert / .frag / .bgVert / .bgFrag
   displayMode:
     0 Final, 1 Diffuse, 2 Specular, 3 D, 4 F, 5 G, 6 n·l
   IBL: 環境マップ(RGBM符号化・equirect)を反射/放射照度に使用。
        uUseEnv==0 で従来どおり解析ライトのみ。
*/
(function (global) {
  "use strict";

  var vert = [
    "attribute vec3 aPos;",
    "attribute vec3 aNrm;",
    "uniform mat4 uMVP;",
    "uniform mat4 uModel;",
    "varying vec3 vWorldPos;",
    "varying vec3 vNormal;",
    "void main(){",
    "  vWorldPos = (uModel * vec4(aPos,1.0)).xyz;",
    "  vNormal   = mat3(uModel) * aNrm;",   // 一様スケールなので mat3(model) で十分
    "  gl_Position = uMVP * vec4(aPos,1.0);",
    "}"
  ].join("\n");

  // --- 共有GLSL断片: RGBM復号 + equirectサンプリング ---
  var envGLSL = [
    "const float ENV_RANGE = 16.0;",             // envmap.js の RANGE と一致
    "vec3 rgbmDecode(vec4 c){ return c.rgb * c.a * ENV_RANGE; }",
    "vec2 dirToEquirect(vec3 d){",
    "  float u = atan(d.z, d.x) / 6.2831853 + 0.5;",  // 0..1（経度）
    "  float v = acos(clamp(d.y, -1.0, 1.0)) / 3.14159265;", // 0=天頂(+Y)
    "  return vec2(u, v);",
    "}"
  ].join("\n");

  var frag = [
    "precision highp float;",
    "varying vec3 vWorldPos;",
    "varying vec3 vNormal;",
    "uniform vec3 uCamPos;",
    "uniform vec3 uLightDir;",     // 表面→ライト方向（正規化済み・平行光）
    "uniform vec3 uLightPos;",      // 点光源の位置
    "uniform int  uLightIsPoint;",  // 1=点光源, 0=平行光
    "uniform vec3 uLightColor;",   // linear
    "uniform float uLightInt;",
    "uniform vec3 uBaseColor;",    // linear albedo
    "uniform float uRough;",
    "uniform float uMetal;",
    "uniform float uF0dielectric;",// 非金属F0（既定0.04）
    "uniform int  uMode;",
    "uniform int  uBeckmann;",     // 1=D項をBeckmannで計算（第8章コラム）
    "",
    "uniform int   uUseEnv;",      // 1=IBL有効
    "uniform float uEnvInt;",      // 環境光の強度
    "uniform sampler2D uEnv0;",    // 256x128（鏡面）",
    "uniform sampler2D uEnv1;",
    "uniform sampler2D uEnv2;",
    "uniform sampler2D uEnv3;",
    "uniform sampler2D uEnv4;",    // 16x8（最もぼけ）",
    "uniform sampler2D uEnvIrr;",  // 拡散用放射照度",
    "",
    "const float PI = 3.14159265359;",
    envGLSL,
    "",
    "float D_GGX(float NoH, float a){",
    "  float a2 = a*a;",
    "  float d = NoH*NoH*(a2-1.0)+1.0;",
    "  return a2 / (PI*d*d);",
    "}",
    "float D_Beckmann(float NoH, float m){",   // 第8章コラム比較用（m=α）
    "  float c2 = NoH*NoH;",
    "  if(c2 <= 1e-6 || m <= 1e-6) return 0.0;",
    "  float t2 = (1.0-c2)/c2;",               // tan^2θ
    "  float m2 = m*m;",
    "  return exp(-t2/m2) / (PI*m2*c2*c2);",
    "}",
    "float G1(float NoX, float k){ return NoX/(NoX*(1.0-k)+k); }",
    "float G_Smith(float NoL, float NoV, float rough){",
    "  float k = (rough+1.0)*(rough+1.0)/8.0;",   // 直接光用 Schlick-GGX
    "  return G1(NoL,k)*G1(NoV,k);",
    "}",
    "vec3 F_Schlick(float VoH, vec3 F0){",
    "  return F0 + (1.0-F0)*pow(1.0-VoH,5.0);",
    "}",
    "vec3 F_SchlickRough(float NoV, vec3 F0, float rough){",  // 粗さ考慮フレネル（IBL用）
    "  float f = pow(1.0-NoV, 5.0);",
    "  vec3 Fr = max(vec3(1.0-rough), F0);",
    "  return F0 + (Fr - F0)*f;",
    "}",
    // 環境BRDFの解析近似（Karis mobile）: LUTなし
    "vec2 envBRDFApproxAB(float rough, float NoV){",
    "  const vec4 c0 = vec4(-1.0,-0.0275,-0.572,0.022);",
    "  const vec4 c1 = vec4( 1.0, 0.0425, 1.04,-0.04);",
    "  vec4 r = rough*c0 + c1;",
    "  float a004 = min(r.x*r.x, exp2(-9.28*NoV))*r.x + r.y;",
    "  return vec2(-1.04,1.04)*a004 + r.zw;",
    "}",
    // ラフネスに応じてmipを線形補間サンプル
    "vec3 sampleEnvLevel(int idx, vec2 uv){",
    "  if(idx<=0) return rgbmDecode(texture2D(uEnv0, uv));",
    "  else if(idx==1) return rgbmDecode(texture2D(uEnv1, uv));",
    "  else if(idx==2) return rgbmDecode(texture2D(uEnv2, uv));",
    "  else if(idx==3) return rgbmDecode(texture2D(uEnv3, uv));",
    "  return rgbmDecode(texture2D(uEnv4, uv));",
    "}",
    "vec3 prefilteredEnv(vec3 R, float rough){",
    "  vec2 uv = dirToEquirect(R);",
    "  float lvl = clamp(rough,0.0,1.0) * 4.0;",   // 0..4（5 mip）
    "  int lo = int(floor(lvl));",
    "  int hi = lo+1; if(hi>4) hi=4;",
    "  float f = lvl - float(lo);",
    "  return mix(sampleEnvLevel(lo,uv), sampleEnvLevel(hi,uv), f);",
    "}",
    "vec3 irradianceEnv(vec3 N){",
    "  return rgbmDecode(texture2D(uEnvIrr, dirToEquirect(N)));",
    "}",
    "",
    "vec3 tone(vec3 c){ c = c/(c+vec3(1.0)); return pow(c, vec3(1.0/2.2)); }",
    "",
    "void main(){",
    "  vec3 N = normalize(vNormal);",
    "  vec3 V = normalize(uCamPos - vWorldPos);",
    "  vec3 L = (uLightIsPoint==1) ? normalize(uLightPos - vWorldPos) : normalize(uLightDir);",
    "  vec3 H = normalize(V+L);",
    "  float NoL = max(dot(N,L), 0.0);",
    "  float NoV = max(dot(N,V), 1e-4);",
    "  float NoH = max(dot(N,H), 0.0);",
    "  float VoH = max(dot(V,H), 0.0);",
    "",
    "  float a = uRough*uRough;",  // α = roughness^2
    "  vec3  F0 = mix(vec3(uF0dielectric), uBaseColor, uMetal);",
    "  float D = (uBeckmann==1) ? D_Beckmann(NoH, a) : D_GGX(NoH, a);",
    "  float G = G_Smith(NoL, NoV, uRough);",
    "  vec3  F = F_Schlick(VoH, F0);",
    "",
    "  vec3 spec = (D*G)*F / max(4.0*NoL*NoV, 1e-4);",
    "  vec3 kd = (vec3(1.0)-F)*(1.0-uMetal);",
    "  vec3 diff = kd*uBaseColor/PI;",
    "",
    "  vec3 radiance = uLightColor*uLightInt;",
    "  vec3 directDiff = diff*radiance*NoL;",
    "  vec3 directSpec = spec*radiance*NoL;",
    "",
    // --- IBL（環境光）---
    "  vec3 iblDiff = vec3(0.0);",
    "  vec3 iblSpec = vec3(0.0);",
    "  if(uUseEnv==1){",
    "    vec3 Fr = F_SchlickRough(NoV, F0, uRough);",
    "    vec3 kdE = (vec3(1.0)-Fr)*(1.0-uMetal);",
    "    iblDiff = kdE * uBaseColor * irradianceEnv(N) * uEnvInt;",
    "    vec3 R = reflect(-V, N);",
    "    vec3 pre = prefilteredEnv(R, uRough) * uEnvInt;",
    "    vec2 ab = envBRDFApproxAB(uRough, NoV);",
    "    iblSpec = pre * (F0*ab.x + ab.y);",
    "  }",
    "",
    "  vec3 totalDiff = directDiff + iblDiff;",
    "  vec3 totalSpec = directSpec + iblSpec;",
    "",
    "  vec3 result;",
    "  if(uMode==0){ result = tone(totalDiff + totalSpec); }",
    "  else if(uMode==1){ result = tone(totalDiff); }",
    "  else if(uMode==2){ result = tone(totalSpec); }",
    "  else if(uMode==3){ float d = D*NoL; result = vec3(pow(clamp(d*0.25,0.0,1.0),1.0/2.2)); }",
    "  else if(uMode==4){ result = pow(clamp(F*NoL,0.0,1.0),vec3(1.0/2.2)); }",
    "  else if(uMode==5){ float g=G*NoL; result = vec3(pow(clamp(g,0.0,1.0),1.0/2.2)); }",
    "  else { result = vec3(pow(NoL,1.0/2.2)); }",   // n·l
    "  gl_FragColor = vec4(result, 1.0);",
    "}"
  ].join("\n");

  // --- 背景（環境マップ）を描く全画面パス ---
  var bgVert = [
    "attribute vec2 aP;",
    "varying vec2 vNdc;",
    "void main(){ vNdc = aP; gl_Position = vec4(aP, 0.999999, 1.0); }"
  ].join("\n");

  var bgFrag = [
    "precision highp float;",
    "varying vec2 vNdc;",
    "uniform mat4 uInvVP;",
    "uniform vec3 uCamPos;",
    "uniform float uEnvInt;",
    "uniform float uBgBlur;",       // 0=鮮鋭(uEnv0), 1=ぼかし(uEnvB)
    "uniform sampler2D uEnv0;",
    "uniform sampler2D uEnvB;",
    "const float PI = 3.14159265359;",
    envGLSL,
    "vec3 tone(vec3 c){ c = c/(c+vec3(1.0)); return pow(c, vec3(1.0/2.2)); }",
    "void main(){",
    "  vec4 pw = uInvVP * vec4(vNdc, 1.0, 1.0);",
    "  vec3 world = pw.xyz / pw.w;",
    "  vec3 dir = normalize(world - uCamPos);",
    "  vec2 uv = dirToEquirect(dir);",
    "  vec3 sharp = rgbmDecode(texture2D(uEnv0, uv));",
    "  vec3 blur  = rgbmDecode(texture2D(uEnvB, uv));",
    "  vec3 col = mix(sharp, blur, clamp(uBgBlur,0.0,1.0)) * uEnvInt;",
    "  gl_FragColor = vec4(tone(col), 1.0);",
    "}"
  ].join("\n");

  global.SHADERS = { vert: vert, frag: frag, bgVert: bgVert, bgFrag: bgFrag };
})(window);
