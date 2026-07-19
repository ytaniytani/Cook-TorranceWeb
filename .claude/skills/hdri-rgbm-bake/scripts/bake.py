#!/usr/bin/env python3
# Radiance .hdr (RGBE) -> prefiltered RGBM equirect mips + irradiance, baked into js/envmap.js
# Pure stdlib (no numpy). Offline build step; output is committed, .hdr is not.
import base64, math, struct, sys, os

SP = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(SP, "envmap.js")
RANGE = 16.0  # RGBM range multiplier

MAPS = [
    ("751", os.path.join(SP, "751.hdr"), "Sky 751"),
    ("758", os.path.join(SP, "758.hdr"), "Sky 758"),
]

# --- RGBE (.hdr) reader ---------------------------------------------------
def read_hdr(path):
    with open(path, "rb") as f:
        data = f.read()
    # parse header (text lines until blank line)
    i = 0
    def readline(i):
        j = data.index(b"\n", i)
        return data[i:j].decode("latin1"), j + 1
    line, i = readline(i)
    if not line.startswith("#?"):
        raise ValueError("not a radiance hdr: " + line)
    # skip until blank line
    while True:
        line, i = readline(i)
        if line.strip() == "":
            break
    # resolution line, e.g. "-Y 1000 +X 2000"
    res, i = readline(i)
    parts = res.split()
    # parts = [sy, H, sx, W]
    sy, H, sx, W = parts[0], int(parts[1]), parts[2], int(parts[3])
    flip_y = (sy == "+Y")   # -Y => top-to-bottom (row0 = top)
    W = int(W); H = int(H)
    # decode scanlines
    px = bytearray(W * H * 4)
    pos = i
    for row in range(H):
        b0 = data[pos]; b1 = data[pos+1]; b2 = data[pos+2]; b3 = data[pos+3]
        new_rle = (b0 == 2 and b1 == 2 and ((b2 << 8) | b3) == W and W >= 8 and W <= 0x7fff)
        rowoff = row * W * 4
        if new_rle:
            pos += 4
            for c in range(4):
                x = 0
                while x < W:
                    cnt = data[pos]; pos += 1
                    if cnt > 128:
                        n = cnt - 128
                        val = data[pos]; pos += 1
                        for k in range(n):
                            px[rowoff + (x + k) * 4 + c] = val
                        x += n
                    else:
                        n = cnt
                        for k in range(n):
                            px[rowoff + (x + k) * 4 + c] = data[pos]; pos += 1
                        x += n
        else:
            # flat scanline (RGBE quads, possibly old-rle unsupported -> treat as flat)
            for x in range(W):
                px[rowoff + x*4 + 0] = data[pos + x*4 + 0]
                px[rowoff + x*4 + 1] = data[pos + x*4 + 1]
                px[rowoff + x*4 + 2] = data[pos + x*4 + 2]
                px[rowoff + x*4 + 3] = data[pos + x*4 + 3]
            pos += W * 4
    # to linear float, row0 = top (zenith) if flip_y False
    fl = [0.0] * (W * H * 3)
    for p in range(W * H):
        e = px[p*4 + 3]
        if e == 0:
            continue
        f = math.ldexp(1.0, e - (128 + 8))
        fl[p*3 + 0] = px[p*4 + 0] * f
        fl[p*3 + 1] = px[p*4 + 1] * f
        fl[p*3 + 2] = px[p*4 + 2] * f
    if flip_y:
        # make row0 = top consistently: reverse rows
        fl2 = [0.0] * (W * H * 3)
        for r in range(H):
            src = (H - 1 - r) * W * 3
            dst = r * W * 3
            fl2[dst:dst + W*3] = fl[src:src + W*3]
        fl = fl2
    return W, H, fl

# --- box downsample (linear space) ---------------------------------------
def downsample(src, sw, sh, dw, dh):
    dst = [0.0] * (dw * dh * 3)
    for oy in range(dh):
        y0 = oy * sh // dh
        y1 = max(y0 + 1, (oy + 1) * sh // dh)
        for ox in range(dw):
            x0 = ox * sw // dw
            x1 = max(x0 + 1, (ox + 1) * sw // dw)
            r = g = b = 0.0
            n = 0
            for yy in range(y0, y1):
                base = yy * sw * 3
                for xx in range(x0, x1):
                    o = base + xx * 3
                    r += src[o]; g += src[o+1]; b += src[o+2]
                    n += 1
            inv = 1.0 / n
            o = (oy * dw + ox) * 3
            dst[o] = r * inv; dst[o+1] = g * inv; dst[o+2] = b * inv
    return dst

# --- equirect helpers -----------------------------------------------------
def dir_from_uv(u, v):
    # v: 0=top(zenith,+Y), 1=bottom(-Y). u: 0..1 around
    theta = v * math.pi                 # polar from +Y
    phi = u * 2.0 * math.pi
    sy = math.cos(theta)
    st = math.sin(theta)
    sx = st * math.cos(phi)
    sz = st * math.sin(phi)
    return sx, sy, sz

# --- irradiance (cosine-weighted hemisphere convolution) ------------------
def irradiance(src, sw, sh, dw, dh):
    # precompute source dirs + solid-angle weight (sin theta)
    sdir = []
    sw3 = sw * 3
    for y in range(sh):
        v = (y + 0.5) / sh
        theta = v * math.pi
        wsin = math.sin(theta)
        for x in range(sw):
            u = (x + 0.5) / sw
            dx, dy, dz = dir_from_uv(u, v)
            o = (y * sw + x) * 3
            sdir.append((dx, dy, dz, src[o], src[o+1], src[o+2], wsin))
    dst = [0.0] * (dw * dh * 3)
    for oy in range(dh):
        v = (oy + 0.5) / dh
        for ox in range(dw):
            u = (ox + 0.5) / dw
            nx, ny, nz = dir_from_uv(u, v)
            r = g = b = 0.0
            wsum = 0.0
            for (dx, dy, dz, sr, sg, sb, wsin) in sdir:
                d = nx*dx + ny*dy + nz*dz
                if d <= 0.0:
                    continue
                w = d * wsin
                r += sr * w; g += sg * w; b += sb * w
                wsum += w
            if wsum > 0:
                inv = 1.0 / wsum
                o = (oy * dw + ox) * 3
                dst[o] = r * inv; dst[o+1] = g * inv; dst[o+2] = b * inv
    return dst

# --- RGBM encode ----------------------------------------------------------
def to_rgbm_b64(fl, w, h):
    out = bytearray(w * h * 4)
    for p in range(w * h):
        r = fl[p*3+0] / RANGE
        g = fl[p*3+1] / RANGE
        b = fl[p*3+2] / RANGE
        m = max(r, g, b)
        if m < 1e-6:
            out[p*4+0] = 0; out[p*4+1] = 0; out[p*4+2] = 0; out[p*4+3] = 1
            continue
        if m > 1.0:
            m = 1.0
        a = math.ceil(m * 255.0) / 255.0
        if a < 1.0/255.0:
            a = 1.0/255.0
        def enc(c):
            v = c / (RANGE * a)
            if v < 0: v = 0.0
            if v > 1: v = 1.0
            return int(v * 255.0 + 0.5)
        out[p*4+0] = enc(fl[p*3+0])
        out[p*4+1] = enc(fl[p*3+1])
        out[p*4+2] = enc(fl[p*3+2])
        out[p*4+3] = int(a * 255.0 + 0.5)
    return base64.b64encode(bytes(out)).decode("ascii")

MIP_SIZES = [(256,128),(128,64),(64,32),(32,16),(16,8)]
IRR_SIZE = (32,16)

def build_map(path):
    W, H, fl = read_hdr(path)
    sys.stderr.write("  loaded %dx%d\n" % (W, H)); sys.stderr.flush()
    mips = []
    prev = None
    for (dw, dh) in MIP_SIZES:
        if prev is None:
            m = downsample(fl, W, H, dw, dh)
        else:
            pw, ph, pdata = prev
            m = downsample(pdata, pw, ph, dw, dh)
        prev = (dw, dh, m)
        mips.append((dw, dh, to_rgbm_b64(m, dw, dh)))
        sys.stderr.write("  mip %dx%d\n" % (dw, dh)); sys.stderr.flush()
    # irradiance from a small env (64x32) for speed
    src = downsample(fl, W, H, 64, 32)
    irr = irradiance(src, 64, 32, IRR_SIZE[0], IRR_SIZE[1])
    irr_b64 = to_rgbm_b64(irr, IRR_SIZE[0], IRR_SIZE[1])
    sys.stderr.write("  irradiance done\n"); sys.stderr.flush()
    return mips, (IRR_SIZE[0], IRR_SIZE[1], irr_b64)

def main():
    entries = []
    labels = {}
    order = []
    for (name, path, label) in MAPS:
        sys.stderr.write("baking %s\n" % name); sys.stderr.flush()
        mips, irr = build_map(path)
        order.append(name)
        labels[name] = label
        mip_js = ",".join(
            '{w:%d,h:%d,d:"%s"}' % (w, h, b) for (w, h, b) in mips
        )
        irr_js = '{w:%d,h:%d,d:"%s"}' % irr
        entries.append('"%s":{mips:[%s],irr:%s}' % (name, mip_js, irr_js))
    labels_js = ",".join('"%s":"%s"' % (k, labels[k]) for k in order)
    order_js = ",".join('"%s"' % k for k in order)
    js = (
        "/* envmap.js — HDRI環境マップを RGBM 符号化で焼き込み（fetch不要・file://可）\n"
        " * hdri-skies.com の 751 / 758 を 2000x1000 から間引き＋プレフィルタ。\n"
        " * mips[0]=最も鮮鋭(256x128, 背景/鏡面反射), 以降ラフネス用にぼかし。irr=拡散用放射照度。\n"
        " * RGBM: linear = rgb * a * RANGE。グローバル: window.ENVMAPS */\n"
        "(function(global){\n"
        '  global.ENVMAPS = { range:%s, order:[%s], labels:{%s}, maps:{%s} };\n'
        "})(window);\n"
    ) % (repr(RANGE), order_js, labels_js, ",".join(entries))
    with open(OUT, "w") as f:
        f.write(js)
    sys.stderr.write("wrote %s (%d bytes)\n" % (OUT, len(js)))

if __name__ == "__main__":
    main()
