/* glmini.js — 依存ゼロの最小WebGLヘルパ
   - 4x4行列演算 (M4)
   - 球メッシュ生成
   - オービットカメラ（マウス/タッチ）
   - ray-sphere 交差（ピクセル検査用）
   グローバル: window.GLMini, window.M4
*/
(function (global) {
  "use strict";

  /* ============ 4x4 行列（列優先, gl-matrix互換の並び） ============ */
  var M4 = {
    create: function () { var o = new Float32Array(16); o[0]=o[5]=o[10]=o[15]=1; return o; },
    mul: function (out, a, b) {
      var a00=a[0],a01=a[1],a02=a[2],a03=a[3], a10=a[4],a11=a[5],a12=a[6],a13=a[7],
          a20=a[8],a21=a[9],a22=a[10],a23=a[11], a30=a[12],a31=a[13],a32=a[14],a33=a[15];
      for (var i=0;i<4;i++){
        var b0=b[i*4],b1=b[i*4+1],b2=b[i*4+2],b3=b[i*4+3];
        out[i*4]  =b0*a00+b1*a10+b2*a20+b3*a30;
        out[i*4+1]=b0*a01+b1*a11+b2*a21+b3*a31;
        out[i*4+2]=b0*a02+b1*a12+b2*a22+b3*a32;
        out[i*4+3]=b0*a03+b1*a13+b2*a23+b3*a33;
      }
      return out;
    },
    perspective: function (out, fovy, aspect, near, far) {
      var f = 1.0 / Math.tan(fovy/2), nf = 1/(near-far);
      out[0]=f/aspect; out[1]=0; out[2]=0; out[3]=0;
      out[4]=0; out[5]=f; out[6]=0; out[7]=0;
      out[8]=0; out[9]=0; out[10]=(far+near)*nf; out[11]=-1;
      out[12]=0; out[13]=0; out[14]=2*far*near*nf; out[15]=0;
      return out;
    },
    lookAt: function (out, eye, center, up) {
      var z0=eye[0]-center[0], z1=eye[1]-center[1], z2=eye[2]-center[2];
      var zl=1/Math.hypot(z0,z1,z2); z0*=zl; z1*=zl; z2*=zl;
      var x0=up[1]*z2-up[2]*z1, x1=up[2]*z0-up[0]*z2, x2=up[0]*z1-up[1]*z0;
      var xl=Math.hypot(x0,x1,x2); if(!xl){x0=0;x1=0;x2=0;} else {xl=1/xl; x0*=xl;x1*=xl;x2*=xl;}
      var y0=z1*x2-z2*x1, y1=z2*x0-z0*x2, y2=z0*x1-z1*x0;
      out[0]=x0; out[1]=y0; out[2]=z0; out[3]=0;
      out[4]=x1; out[5]=y1; out[6]=z1; out[7]=0;
      out[8]=x2; out[9]=y2; out[10]=z2; out[11]=0;
      out[12]=-(x0*eye[0]+x1*eye[1]+x2*eye[2]);
      out[13]=-(y0*eye[0]+y1*eye[1]+y2*eye[2]);
      out[14]=-(z0*eye[0]+z1*eye[1]+z2*eye[2]);
      out[15]=1;
      return out;
    }
  };

  /* ============ 球メッシュ（単位球, 原点中心） ============ */
  function makeSphere(seg) {
    seg = seg || 96;
    var pos=[], nrm=[], idx=[];
    for (var y=0; y<=seg; y++){
      var v=y/seg, phi=v*Math.PI;
      for (var x=0; x<=seg; x++){
        var u=x/seg, theta=u*Math.PI*2;
        var sx=Math.sin(phi)*Math.cos(theta);
        var sy=Math.cos(phi);
        var sz=Math.sin(phi)*Math.sin(theta);
        pos.push(sx,sy,sz); nrm.push(sx,sy,sz);
      }
    }
    var row=seg+1;
    for (var yy=0; yy<seg; yy++){
      for (var xx=0; xx<seg; xx++){
        var a=yy*row+xx, b=a+row;
        idx.push(a,b,a+1, a+1,b,b+1);
      }
    }
    return { pos:new Float32Array(pos), nrm:new Float32Array(nrm), idx:new Uint16Array(idx) };
  }

  /* ============ プログラム構築 ============ */
  function compile(gl, type, src){
    var s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))
      throw new Error("shader: "+gl.getShaderInfoLog(s)+"\n"+src);
    return s;
  }
  function program(gl, vs, fs){
    var p=gl.createProgram();
    gl.attachShader(p, compile(gl,gl.VERTEX_SHADER,vs));
    gl.attachShader(p, compile(gl,gl.FRAGMENT_SHADER,fs));
    gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))
      throw new Error("link: "+gl.getProgramInfoLog(p));
    return p;
  }

  /* ============ オービットカメラ ============ */
  function OrbitCam(canvas, opts){
    opts=opts||{};
    this.yaw   = opts.yaw   != null ? opts.yaw   : 0.6;
    this.pitch = opts.pitch != null ? opts.pitch : 0.25;
    this.dist  = opts.dist  != null ? opts.dist  : 3.4;
    this.minD=1.6; this.maxD=8; this.onChange=opts.onChange||function(){};
    this._def={ yaw:this.yaw, pitch:this.pitch, dist:this.dist };
    var self=this, drag=false, px=0, py=0, pinch=0;

    function eventXY(e){ var r=canvas.getBoundingClientRect(); return [e.clientX-r.left, e.clientY-r.top]; }

    canvas.addEventListener("mousedown", function(e){ drag=true; px=e.clientX; py=e.clientY; });
    window.addEventListener("mouseup", function(){ drag=false; });
    window.addEventListener("mousemove", function(e){
      if(!drag) return;
      self.yaw   -= (e.clientX-px)*0.008;
      self.pitch -= (e.clientY-py)*0.008;
      self._clamp(); px=e.clientX; py=e.clientY; self.onChange();
    });
    canvas.addEventListener("wheel", function(e){
      e.preventDefault();
      self.dist *= (1 + Math.sign(e.deltaY)*0.08);
      self.dist = Math.max(self.minD, Math.min(self.maxD, self.dist)); self.onChange();
    }, {passive:false});

    // touch
    canvas.addEventListener("touchstart", function(e){
      if(e.touches.length===1){ drag=true; px=e.touches[0].clientX; py=e.touches[0].clientY; }
      else if(e.touches.length===2){ drag=false; pinch=touchDist(e); }
    }, {passive:false});
    canvas.addEventListener("touchmove", function(e){
      e.preventDefault();
      if(e.touches.length===1 && drag){
        self.yaw   -= (e.touches[0].clientX-px)*0.008;
        self.pitch -= (e.touches[0].clientY-py)*0.008;
        self._clamp(); px=e.touches[0].clientX; py=e.touches[0].clientY; self.onChange();
      } else if(e.touches.length===2){
        var d=touchDist(e);
        if(pinch){ self.dist *= pinch/d; self.dist=Math.max(self.minD,Math.min(self.maxD,self.dist)); self.onChange(); }
        pinch=d;
      }
    }, {passive:false});
    canvas.addEventListener("touchend", function(e){ if(e.touches.length===0) drag=false; });

    function touchDist(e){
      var dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
      return Math.hypot(dx,dy);
    }
  }
  OrbitCam.prototype._clamp=function(){
    var lim=Math.PI/2-0.02;
    this.pitch=Math.max(-lim, Math.min(lim, this.pitch));
  };
  OrbitCam.prototype.reset=function(){ this.yaw=this._def.yaw; this.pitch=this._def.pitch; this.dist=this._def.dist; this.onChange(); };
  OrbitCam.prototype.eye=function(){
    var cp=Math.cos(this.pitch);
    return [ this.dist*cp*Math.sin(this.yaw), this.dist*Math.sin(this.pitch), this.dist*cp*Math.cos(this.yaw) ];
  };

  /* ============ ray-sphere（単位球, 原点）: 画面座標→表面法線 ============
     戻り値: 交差した単位球上の点(=法線) [x,y,z] または null */
  function pickNormal(cam, aspect, fovy, nx, ny){
    // nx,ny: -1..1（NDC, y上向き）
    var eye=cam.eye();
    var f=[-eye[0],-eye[1],-eye[2]]; var fl=1/Math.hypot(f[0],f[1],f[2]); f=[f[0]*fl,f[1]*fl,f[2]*fl];
    var up=[0,1,0];
    var r=[ f[1]*up[2]-f[2]*up[1], f[2]*up[0]-f[0]*up[2], f[0]*up[1]-f[1]*up[0] ];
    var rl=1/Math.hypot(r[0],r[1],r[2]); r=[r[0]*rl,r[1]*rl,r[2]*rl];
    var u=[ r[1]*f[2]-r[2]*f[1], r[2]*f[0]-r[0]*f[2], r[0]*f[1]-r[1]*f[0] ];
    var th=Math.tan(fovy/2);
    var dir=[
      f[0] + r[0]*(nx*aspect*th) + u[0]*(ny*th),
      f[1] + r[1]*(nx*aspect*th) + u[1]*(ny*th),
      f[2] + r[2]*(nx*aspect*th) + u[2]*(ny*th)
    ];
    var dl=1/Math.hypot(dir[0],dir[1],dir[2]); dir=[dir[0]*dl,dir[1]*dl,dir[2]*dl];
    // |eye + t dir|^2 = 1
    var b=2*(eye[0]*dir[0]+eye[1]*dir[1]+eye[2]*dir[2]);
    var c=eye[0]*eye[0]+eye[1]*eye[1]+eye[2]*eye[2]-1;
    var disc=b*b-4*c; if(disc<0) return null;
    var t=(-b-Math.sqrt(disc))/2; if(t<0) return null;
    return [eye[0]+t*dir[0], eye[1]+t*dir[1], eye[2]+t*dir[2]];
  }

  global.M4 = M4;
  global.GLMini = {
    makeSphere: makeSphere,
    program: program,
    OrbitCam: OrbitCam,
    pickNormal: pickNormal
  };
})(window);
