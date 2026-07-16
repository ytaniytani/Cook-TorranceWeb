/* shaders.js — GLSL を文字列として保持（file:// で fetch を使わないため）
   グローバル: window.SHADERS.vert / window.SHADERS.frag
   displayMode:
     0 Final, 1 Diffuse, 2 Specular, 3 D, 4 F, 5 G, 6 n·l
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
    "",
    "const float PI = 3.14159265359;",
    "",
    "float D_GGX(float NoH, float a){",
    "  float a2 = a*a;",
    "  float d = NoH*NoH*(a2-1.0)+1.0;",
    "  return a2 / (PI*d*d);",
    "}",
    "float G1(float NoX, float k){ return NoX/(NoX*(1.0-k)+k); }",
    "float G_Smith(float NoL, float NoV, float rough){",
    "  float k = (rough+1.0)*(rough+1.0)/8.0;",   // 直接光用 Schlick-GGX
    "  return G1(NoL,k)*G1(NoV,k);",
    "}",
    "vec3 F_Schlick(float VoH, vec3 F0){",
    "  return F0 + (1.0-F0)*pow(1.0-VoH,5.0);",
    "}",
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
    "  float D = D_GGX(NoH, a);",
    "  float G = G_Smith(NoL, NoV, uRough);",
    "  vec3  F = F_Schlick(VoH, F0);",
    "",
    "  vec3 spec = (D*G)*F / max(4.0*NoL*NoV, 1e-4);",
    "  vec3 kd = (vec3(1.0)-F)*(1.0-uMetal);",
    "  vec3 diff = kd*uBaseColor/PI;",
    "",
    "  vec3 radiance = uLightColor*uLightInt;",
    "  vec3 outColor = (diff+spec)*radiance*NoL;",
    "",
    "  vec3 result;",
    "  if(uMode==0){ result = tone(outColor); }",
    "  else if(uMode==1){ result = tone(diff*radiance*NoL); }",
    "  else if(uMode==2){ result = tone(spec*radiance*NoL); }",
    "  else if(uMode==3){ float d = D*NoL; result = vec3(pow(clamp(d*0.25,0.0,1.0),1.0/2.2)); }",
    "  else if(uMode==4){ result = pow(clamp(F*NoL,0.0,1.0),vec3(1.0/2.2)); }",
    "  else if(uMode==5){ float g=G*NoL; result = vec3(pow(clamp(g,0.0,1.0),1.0/2.2)); }",
    "  else { result = vec3(pow(NoL,1.0/2.2)); }",   // n·l
    "  gl_FragColor = vec4(result, 1.0);",
    "}"
  ].join("\n");

  global.SHADERS = { vert: vert, frag: frag };
})(window);
