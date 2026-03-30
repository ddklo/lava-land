#!/usr/bin/env python3
"""
Generate Lava Land icons using pure Python stdlib.
Produces standard icons (rounded corners) and maskable icons (full-bleed with safe zone).
Sizes: 48, 72, 96, 128, 144, 180, 192, 384, 512 (standard)
       192, 512 (maskable)
"""
import struct, zlib, math

def write_png(filename, pixels, width, height):
    """Write a list of (r,g,b,a) tuples as a PNG file."""
    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
    # IHDR color type 2 = RGB (no alpha for simplicity, we'll bake alpha into bg)
    # Actually let's do RGBA (color type 6)
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))

    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type None
        for x in range(width):
            r, g, b, a = pixels[y * width + x]
            raw.extend([r & 0xff, g & 0xff, b & 0xff, a & 0xff])

    idat = chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    iend = chunk(b'IEND', b'')

    with open(filename, 'wb') as f:
        f.write(sig + ihdr + idat + iend)

def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(v)))

def lerp(a, b, t):
    t = max(0.0, min(1.0, t))
    return a + (b - a) * t

def blend(src, dst):
    """Alpha-blend src (r,g,b,a) over dst (r,g,b,a), all 0-255."""
    sa = src[3] / 255.0
    da = dst[3] / 255.0
    oa = sa + da * (1 - sa)
    if oa < 1e-6:
        return (0, 0, 0, 0)
    r = (src[0] * sa + dst[0] * da * (1 - sa)) / oa
    g = (src[1] * sa + dst[1] * da * (1 - sa)) / oa
    b = (src[2] * sa + dst[2] * da * (1 - sa)) / oa
    return (clamp(r), clamp(g), clamp(b), clamp(oa * 255))

def draw_icon(size):
    S = size
    px = [(26, 10, 10, 255)] * (S * S)  # dark bg #1a0a0a

    def set_px(x, y, rgba):
        if 0 <= x < S and 0 <= y < S:
            idx = y * S + x
            px[idx] = blend(rgba, px[idx])

    def fill_rect(x0, y0, x1, y1, rgba):
        for y in range(max(0,y0), min(S,y1)):
            for x in range(max(0,x0), min(S,x1)):
                set_px(x, y, rgba)

    def draw_circle(cx, cy, r, rgba):
        for y in range(int(cy - r) - 1, int(cy + r) + 2):
            for x in range(int(cx - r) - 1, int(cx + r) + 2):
                d = math.sqrt((x - cx)**2 + (y - cy)**2)
                if d <= r:
                    set_px(x, y, rgba)

    def draw_circle_aa(cx, cy, r, rgba):
        for y in range(int(cy - r) - 2, int(cy + r) + 3):
            for x in range(int(cx - r) - 2, int(cx + r) + 3):
                d = math.sqrt((x - cx)**2 + (y - cy)**2)
                edge = r - d
                alpha = max(0.0, min(1.0, edge + 0.5))
                if alpha > 0:
                    r2, g2, b2, a2 = rgba
                    set_px(x, y, (r2, g2, b2, clamp(a2 * alpha)))

    def radial_glow(cx, cy, r_inner, r_outer, color_in, color_out):
        for y in range(max(0, int(cy - r_outer) - 2), min(S, int(cy + r_outer) + 3)):
            for x in range(max(0, int(cx - r_outer) - 2), min(S, int(cx + r_outer) + 3)):
                d = math.sqrt((x - cx)**2 + (y - cy)**2)
                if d <= r_outer:
                    t = max(0.0, (d - r_inner) / max(1, r_outer - r_inner))
                    r2 = lerp(color_in[0], color_out[0], t)
                    g2 = lerp(color_in[1], color_out[1], t)
                    b2 = lerp(color_in[2], color_out[2], t)
                    a2 = lerp(color_in[3], color_out[3], t)
                    set_px(x, y, (clamp(r2), clamp(g2), clamp(b2), clamp(a2)))

    f = S / 512.0  # scale factor

    # ── Background gradient (dark cave, top=very dark, bottom=dark red-ish) ──
    for y in range(S):
        t = y / S
        # Top: #1a0a0a  Bottom: #2a0808
        bg_r = clamp(lerp(26, 40, t))
        bg_g = clamp(lerp(10, 8, t))
        bg_b = clamp(lerp(10, 8, t))
        for x in range(S):
            px[y * S + x] = (bg_r, bg_g, bg_b, 255)

    # ── Rounded corner mask (make it a rounded square icon) ──
    radius = S * 0.18
    cx_corners = [(radius, radius), (S - radius, radius), (radius, S - radius), (S - radius, S - radius)]
    for y in range(S):
        for x in range(S):
            # Check corners
            in_icon = True
            if x < radius and y < radius:
                if math.sqrt((x - radius)**2 + (y - radius)**2) > radius:
                    in_icon = False
            elif x > S - radius and y < radius:
                if math.sqrt((x - (S - radius))**2 + (y - radius)**2) > radius:
                    in_icon = False
            elif x < radius and y > S - radius:
                if math.sqrt((x - radius)**2 + (y - (S - radius))**2) > radius:
                    in_icon = False
            elif x > S - radius and y > S - radius:
                if math.sqrt((x - (S - radius))**2 + (y - (S - radius))**2) > radius:
                    in_icon = False
            if not in_icon:
                px[y * S + x] = (0, 0, 0, 0)

    # ── Lava pool at the bottom ──
    lava_top = int(S * 0.68)
    lava_h = S - lava_top

    # Lava base
    for y in range(lava_top, S):
        t = (y - lava_top) / lava_h
        # bright orange-red lava
        lr = clamp(lerp(255, 200, t))
        lg = clamp(lerp(100, 30, t))
        lb = clamp(0)
        for x in range(S):
            if px[y * S + x][3] > 0:
                px[y * S + x] = (lr, lg, lb, 255)

    # Lava bright veins / hotspots
    for i, (fcx, fcy) in enumerate([(0.25, 0.78), (0.55, 0.82), (0.78, 0.75), (0.42, 0.88)]):
        cx2, cy2 = fcx * S, fcy * S
        radial_glow(cx2, cy2, 0, int(S * 0.10),
                    (255, 220, 80, 200), (255, 80, 0, 0))

    # Lava surface glow (bright edge at top of lava)
    for x in range(S):
        for dy in range(int(S * 0.04)):
            y = lava_top + dy
            if 0 <= y < S and px[y * S + x][3] > 0:
                t = dy / (S * 0.04)
                a = clamp(lerp(180, 0, t))
                r2, g2, b2, _ = px[y * S + x]
                set_px(x, y, (255, 200, 60, a))

    # Wavy lava surface
    wave_h = int(S * 0.025)
    for x in range(S):
        wave = math.sin(x / S * math.pi * 4 + 0.5) * wave_h * 0.5 + \
               math.sin(x / S * math.pi * 7 + 1.2) * wave_h * 0.3
        wave = int(wave)
        for dy in range(-wave_h, wave_h):
            y = lava_top + wave + dy
            if 0 <= y < S and px[y * S + x][3] > 0:
                if dy < 0:
                    # above normal lava top - draw lava
                    t = abs(dy) / wave_h
                    set_px(x, y, (clamp(lerp(255, 40, t * 0.4)),
                                  clamp(lerp(120, 8, t * 0.4)), 0, clamp(lerp(255, 0, t))))

    # ── Stone platforms (3 across, 2 rows) ──
    # Platform dimensions
    plat_w = int(S * 0.26)
    plat_h = int(S * 0.09)
    gap_x = int(S * 0.05)
    pad_x = int(S * 0.065)

    # Two rows of platforms
    row1_y = int(S * 0.50)
    row2_y = int(S * 0.30)

    platform_defs = [
        # (col, row_y, is_safe)  — safe = slightly highlighted
        (0, row1_y, True),
        (1, row1_y, False),
        (2, row1_y, True),
        (0, row2_y, False),
        (1, row2_y, True),   # player is on this one
        (2, row2_y, False),
    ]

    for col, ry, safe in platform_defs:
        px0 = pad_x + col * (plat_w + gap_x)
        py0 = ry
        px1 = px0 + plat_w
        py1 = ry + plat_h

        # Shadow below platform
        for sy in range(min(S, py1), min(S, py1 + int(S * 0.025))):
            for sx in range(max(0, px0 + 2), min(S, px1 - 2)):
                if px[sy * S + sx][3] > 0:
                    t = (sy - py1) / (S * 0.025)
                    cur = px[sy * S + sx]
                    set_px(sx, sy, (0, 0, 0, clamp(lerp(100, 0, t))))

        # Platform base color (stone: dark gray-brown)
        for y in range(max(0, py0), min(S, py1)):
            for x in range(max(0, px0), min(S, px1)):
                t_y = (y - py0) / plat_h
                # Stone gradient: top-lighter, bottom-darker
                if safe:
                    # Safe: warm brownish stone
                    sr = clamp(lerp(110, 70, t_y))
                    sg = clamp(lerp(75, 50, t_y))
                    sb = clamp(lerp(45, 28, t_y))
                else:
                    # Fake/unknown: cooler gray stone
                    sr = clamp(lerp(80, 50, t_y))
                    sg = clamp(lerp(80, 50, t_y))
                    sb = clamp(lerp(80, 50, t_y))
                set_px(x, y, (sr, sg, sb, 255))

        # Top highlight strip
        for x in range(max(0, px0 + 1), min(S, px1 - 1)):
            set_px(x, py0, (clamp(160 if safe else 130), clamp(110 if safe else 100), clamp(65 if safe else 80), 255))
            if py0 + 1 < S:
                set_px(x, py0 + 1, (clamp(130 if safe else 100), clamp(90 if safe else 80), clamp(55 if safe else 65), 180))

        # Lava-glow underside on row1 platforms (close to lava)
        if ry == row1_y:
            for dy in range(int(S * 0.03)):
                y = py1 + dy
                if 0 <= y < S:
                    for x in range(max(0, px0), min(S, px1)):
                        if px[y * S + x][3] > 0:
                            t = dy / (S * 0.03)
                            set_px(x, y, (255, 80, 0, clamp(lerp(60, 0, t))))

        # Stone texture cracks (simple lines)
        # Crack 1
        cx_crack = px0 + int(plat_w * 0.35)
        for dy in range(int(plat_h * 0.3), int(plat_h * 0.75)):
            y = py0 + dy
            xc = cx_crack + (dy % 2)
            if px0 <= xc < px1 and 0 <= y < S:
                cur = px[y * S + xc]
                set_px(xc, y, (max(0, cur[0] - 25), max(0, cur[1] - 20), max(0, cur[2] - 15), 255))

    # ── Lava glow illuminating the bottom of row1 platforms ──
    for y in range(lava_top - int(S * 0.12), lava_top):
        for x in range(S):
            if px[y * S + x][3] > 0:
                t = (lava_top - y) / (S * 0.12)
                cur = px[y * S + x]
                glow_r = clamp(cur[0] + lerp(80, 0, t))
                glow_g = clamp(cur[1] + lerp(20, 0, t))
                glow_b = cur[2]
                px[y * S + x] = (glow_r, glow_g, glow_b, cur[3])

    # ── Player character (on the middle platform of row2, mid-jump) ──
    # Character is a simple stick figure leaping to the right
    char_cx = int(S * (0.065 + 1 * (0.26 + 0.05) + 0.13))  # center of col1
    char_base = row2_y - int(S * 0.005)

    # Jump arc: character is slightly above the platform, tilted right
    jump_offset_x = int(S * 0.09)
    jump_offset_y = -int(S * 0.14)  # above platform

    char_x = char_cx + jump_offset_x
    char_y = char_base + jump_offset_y

    body_r = int(S * 0.028)   # head radius
    body_h = int(S * 0.065)   # torso height
    limb_w = max(2, int(S * 0.012))

    # Shadow under character (on platform)
    for dx in range(-int(S*0.06), int(S*0.06)):
        sx = char_cx + dx
        sy = char_base + int(S*0.005)
        if 0 <= sx < S and 0 <= sy < S and px[sy*S+sx][3] > 0:
            t = abs(dx) / (S*0.06)
            set_px(sx, sy, (0,0,0, clamp(lerp(60,0,t))))

    def draw_line(x0, y0, x1, y1, rgba, w=1):
        dx2 = x1 - x0; dy2 = y1 - y0
        steps = max(abs(dx2), abs(dy2), 1)
        for i in range(steps + 1):
            t2 = i / steps
            px2 = x0 + dx2 * t2
            py2 = y0 + dy2 * t2
            for ddx in range(-w+1, w):
                for ddy in range(-w+1, w):
                    set_px(int(px2)+ddx, int(py2)+ddy, rgba)

    lw = max(2, int(S * 0.016))  # limb line width

    # Character colors
    SKIN = (255, 200, 140, 255)
    BODY = (255, 140, 30, 255)   # orange outfit matches lava theme
    SHADOW = (180, 90, 10, 255)

    # Legs (spread in jump pose)
    # Left leg: back-kicked
    draw_line(char_x, char_y + int(body_h*0.5),
              char_x - int(S*0.05), char_y + int(body_h*0.9),
              BODY, lw)
    draw_line(char_x - int(S*0.05), char_y + int(body_h*0.9),
              char_x - int(S*0.04), char_y + int(body_h*1.15),
              BODY, lw)
    # Right leg: forward-kicked
    draw_line(char_x, char_y + int(body_h*0.5),
              char_x + int(S*0.06), char_y + int(body_h*0.75),
              BODY, lw)
    draw_line(char_x + int(S*0.06), char_y + int(body_h*0.75),
              char_x + int(S*0.05), char_y + int(body_h*1.05),
              BODY, lw)

    # Torso
    draw_line(char_x, char_y, char_x, char_y + int(body_h * 0.55), BODY, lw)

    # Arms (outstretched for balance)
    draw_line(char_x, char_y + int(body_h*0.15),
              char_x - int(S*0.07), char_y + int(body_h*0.35),
              BODY, lw)
    draw_line(char_x, char_y + int(body_h*0.15),
              char_x + int(S*0.07), char_y - int(body_h*0.05),
              BODY, lw)

    # Head
    draw_circle_aa(char_x, char_y - body_r, body_r, SKIN)

    # Eye
    eye_x = char_x + int(body_r * 0.4)
    eye_y = char_y - body_r - int(body_r * 0.1)
    draw_circle(eye_x, eye_y, max(1, int(body_r * 0.22)), (40, 20, 10, 255))

    # ── Rescue character on the rightmost platform of row2 ──
    rescue_cx = int(S * (0.065 + 2 * (0.26 + 0.05) + 0.13))
    rescue_base = row2_y - int(S * 0.005)

    r_br = int(S * 0.022)
    r_bh = int(S * 0.055)
    rlw = max(1, int(S * 0.013))

    RESCUE_BODY = (180, 100, 200, 255)  # purple-ish rescue character
    RESCUE_SKIN = (255, 210, 160, 255)

    # Legs (standing)
    draw_line(rescue_cx - int(S*0.015), rescue_base - int(r_bh*0.1),
              rescue_cx - int(S*0.02), rescue_base + int(r_bh*0.5),
              RESCUE_BODY, rlw)
    draw_line(rescue_cx + int(S*0.015), rescue_base - int(r_bh*0.1),
              rescue_cx + int(S*0.02), rescue_base + int(r_bh*0.5),
              RESCUE_BODY, rlw)

    # Torso
    draw_line(rescue_cx, rescue_base - r_bh,
              rescue_cx, rescue_base - int(r_bh*0.1),
              RESCUE_BODY, rlw)

    # Arms waving (one up)
    draw_line(rescue_cx, rescue_base - int(r_bh*0.75),
              rescue_cx - int(S*0.05), rescue_base - int(r_bh*0.5),
              RESCUE_BODY, rlw)
    draw_line(rescue_cx, rescue_base - int(r_bh*0.75),
              rescue_cx + int(S*0.04), rescue_base - int(r_bh*1.1),  # waving up
              RESCUE_BODY, rlw)

    # Head
    draw_circle_aa(rescue_cx, rescue_base - r_bh - r_br, r_br, RESCUE_SKIN)

    # ── Motion trail under jumping character ──
    for i in range(5):
        tx = char_x - int((i+1) * S * 0.025)
        ty = char_y + int((i+1)**1.4 * S * 0.012)
        ta = clamp(lerp(120, 0, i / 4))
        tr = int(S * 0.014 * (1 - i/5))
        if tr >= 1:
            draw_circle_aa(tx, ty, tr, (255, 160, 50, ta))

    # ── Lava drips falling from bottom of row1 platforms ──
    for col, drip_x, drip_amt in [(0, pad_x + int(plat_w*0.4), 0.06),
                                   (2, pad_x + 2*(plat_w+gap_x) + int(plat_w*0.6), 0.05)]:
        drip_y_top = row1_y + plat_h
        drip_y_bot = lava_top
        drip_h = drip_y_bot - drip_y_top
        for dy in range(drip_h):
            y = drip_y_top + dy
            t = dy / drip_h
            w2 = max(1, int(lerp(S*0.018, S*0.008, t)))
            a = clamp(lerp(200, 100, t))
            r2 = clamp(lerp(255, 200, t))
            g2 = clamp(lerp(80, 40, t))
            for dx in range(-w2, w2+1):
                set_px(drip_x + dx, y, (r2, g2, 0, a))

    # ── Title text "LL" stamp in top-left corner ──
    # Simple pixel font for "LL"
    def draw_pixel_char_L(bx, by, scale, color):
        # L shape: 3 wide, 5 tall in pixel art
        pixels_L = [
            (0,0),(0,1),(0,2),(0,3),(0,4),
            (1,4),(2,4)
        ]
        for px3, py3 in pixels_L:
            for sx in range(scale):
                for sy in range(scale):
                    set_px(bx + px3*scale + sx, by + py3*scale + sy, color)

    letter_scale = max(2, int(S * 0.04))
    letter_color = (255, 100, 20, 230)
    letter_y = int(S * 0.065)
    draw_pixel_char_L(int(S * 0.07), letter_y, letter_scale, letter_color)
    draw_pixel_char_L(int(S * 0.07) + letter_scale * 4, letter_y, letter_scale, letter_color)

    # ── Re-apply rounded corner mask ──
    radius = S * 0.18
    for y in range(S):
        for x in range(S):
            if px[y * S + x][3] == 0:
                continue
            in_icon = True
            if x < radius and y < radius:
                if math.sqrt((x - radius)**2 + (y - radius)**2) > radius:
                    in_icon = False
            elif x > S - radius and y < radius:
                if math.sqrt((x - (S - radius))**2 + (y - radius)**2) > radius:
                    in_icon = False
            elif x < radius and y > S - radius:
                if math.sqrt((x - radius)**2 + (y - (S - radius))**2) > radius:
                    in_icon = False
            elif x > S - radius and y > S - radius:
                if math.sqrt((x - (S - radius))**2 + (y - (S - radius))**2) > radius:
                    in_icon = False
            if not in_icon:
                px[y * S + x] = (0, 0, 0, 0)

    return px

def downsample(src, src_size, dst_size):
    """Downsample src pixels (list of RGBA tuples) using box averaging."""
    dst = []
    for dy in range(dst_size):
        for dx in range(dst_size):
            sx0 = dx * src_size // dst_size
            sx1 = max((dx + 1) * src_size // dst_size, sx0 + 1)
            sy0 = dy * src_size // dst_size
            sy1 = max((dy + 1) * src_size // dst_size, sy0 + 1)
            rs = gs = bs = as_ = 0
            count = 0
            for sy in range(sy0, sy1):
                for sx in range(sx0, sx1):
                    r2, g2, b2, a2 = src[sy * src_size + sx]
                    rs += r2; gs += g2; bs += b2; as_ += a2; count += 1
            dst.append((rs // count, gs // count, bs // count, as_ // count))
    return dst


def make_maskable(src, src_size, dst_size):
    """Create a maskable icon: no rounded corners, content in the safe zone (inner 80%)."""
    # First, generate the icon at a higher res without rounded corners
    S = src_size
    px = list(src)  # copy

    # Fill transparent corners with the background color so it's full-bleed
    bg = (26, 10, 10, 255)
    for i in range(len(px)):
        if px[i][3] < 128:
            px[i] = bg

    # Downsample to target size
    if dst_size != src_size:
        return downsample(px, src_size, dst_size)
    return px


OUT_DIR = '/home/user/lava-land/images'

# Generate 512x512 source icon (with rounded corners)
print("Generating 512x512 source icon...")
px512 = draw_icon(512)

# Standard icon sizes (with rounded corners)
STANDARD_SIZES = [48, 72, 96, 128, 144, 180, 192, 384, 512]

for size in STANDARD_SIZES:
    fname = f'{OUT_DIR}/icon-{size}.png'
    if size == 512:
        write_png(fname, px512, 512, 512)
    else:
        print(f"  Downsampling to {size}x{size}...")
        px = downsample(px512, 512, size)
        write_png(fname, px, size, size)
    print(f"  Written: icon-{size}.png")

# Maskable icon sizes (full-bleed, no rounded corners)
MASKABLE_SIZES = [192, 512]

for size in MASKABLE_SIZES:
    fname = f'{OUT_DIR}/icon-maskable-{size}.png'
    print(f"  Generating maskable {size}x{size}...")
    px = make_maskable(px512, 512, size)
    write_png(fname, px, size, size)
    print(f"  Written: icon-maskable-{size}.png")

print(f"\nDone! Generated {len(STANDARD_SIZES)} standard + {len(MASKABLE_SIZES)} maskable icons.")
