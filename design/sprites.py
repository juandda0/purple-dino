import math, random, sys, os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sprites")
os.makedirs(OUT, exist_ok=True)

INK = "#1B1430"
P, PD, PL = "#7A3CF0", "#4B1FA8", "#B48CFF"
CREAM = "#FFF4D6"


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = {}

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            if c is None:
                self.px.pop((x, y), None)
            else:
                self.px[(x, y)] = c

    def layer(self, mask, fill, outline=INK):
        """mask: set of (x,y). fill(x,y)->color. Draws an inner outline."""
        for (x, y) in mask:
            edge = any((x + dx, y + dy) not in mask for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            self.set(x, y, outline if (edge and outline) else fill(x, y))

    def svg(self, scale):
        by = {}
        for y in range(self.h):
            x = 0
            while x < self.w:
                c = self.px.get((x, y))
                if c is None:
                    x += 1
                    continue
                x2 = x
                while self.px.get((x2 + 1, y)) == c:
                    x2 += 1
                by.setdefault(c, []).append(f"M{x} {y}h{x2 - x + 1}v1h-{x2 - x + 1}z")
                x = x2 + 1
        paths = "".join(f'<path fill="{c}" d="{"".join(d)}"/>' for c, d in by.items())
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w * scale}" height="{self.h * scale}" '
                f'viewBox="0 0 {self.w} {self.h}" shape-rendering="crispEdges">{paths}</svg>')


def ascii_sprite(rows, legend):
    w = max(len(r) for r in rows)
    c = Canvas(w, len(rows))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in legend:
                c.set(x, y, legend[ch])
    return c


def save(name, canvas, scale):
    with open(os.path.join(OUT, name + ".svg"), "w") as f:
        f.write(canvas.svg(scale))


# ---------- mini dino head (avatar) ----------
DINO_HEAD = [
    "....KKKKKKK.....",
    "...KPPPPPPPKK...",
    "..KPPPPPPPPPPK..",
    "..KPPWKPPPPPPPK.",
    "..KPPKKPPPPPPPK.",
    "..KPPPPPPPPPPPK.",
    "..KPRRPPPPPPPPK.",
    "..KPPPPPPPKKKKK.",
    "..KLPPPPPPPWWK..",
    "..KLPPPPPPPKKK..",
    "..KLLPPPPPPK....",
    "..KDLLPPPPDK....",
    "...KDDDDDDK.....",
    "....KKKKKK......",
]


def dino_head(body, dark, light):
    return ascii_sprite(DINO_HEAD, {"K": INK, "P": body, "D": dark, "L": light, "W": "#FFFFFF", "R": body})


AVATARS = {
    "purple": (P, PD, PL),
    "green": ("#2DBE6C", "#1F7A45", "#7BE3A4"),
    "orange": ("#FF8A3D", "#C25516", "#FFC08F"),
    "blue": ("#2F7DE1", "#1C4F96", "#86B8F5"),
    "pink": ("#FF6FA8", "#B83A6E", "#FFB3D0"),
    "yellow": ("#F7C52B", "#B98A0B", "#FFE58A"),
}
for name, cols in AVATARS.items():
    save("dino_" + name, dino_head(*cols), 4)

# ---------- Gloop (slime) ----------
def gloop(hit=False):
    W, H = 34, 26
    c = Canvas(W, H)
    G, GD, GL = "#5BD16B", "#2E9444", "#B6F2A8"
    if hit:  # white damage flash
        G, GD, GL = "#FFFFFF", "#D6F0FF", "#FFFFFF"
    mask = set()
    cx = (W - 1) / 2
    for y in range(H):
        t = y / (H - 1)
        hw = 16 * math.sqrt(max(0.0, 1 - (1 - t) ** 2 * 1.0)) if t < 0.75 else 16 + (t - 0.75) * 4
        hw = min(hw, 16.5)
        if y < 2:
            hw = [3, 6][y]
        for x in range(W):
            if abs(x - cx) <= hw:
                mask.add((x, y))

    def fill(x, y):
        if y >= H - 4:
            return GD
        if (x - cx) > 10 and y > 8:
            return GD
        return G
    c.layer(mask, fill)
    # highlight
    for (x, y) in [(8, 6), (9, 6), (7, 7), (8, 7), (7, 8), (11, 4), (12, 4)]:
        c.set(x, y, GL)
    if hit:
        # squeezed "> <" eyes and an "o" mouth
        for (x, y) in [(11, 11), (12, 12), (13, 13), (12, 14), (11, 15),
                       (23, 11), (22, 12), (21, 13), (22, 14), (23, 15)]:
            c.set(x, y, INK)
        for (x, y) in [(16, 17), (17, 17), (15, 18), (18, 18), (15, 19), (18, 19), (16, 20), (17, 20)]:
            c.set(x, y, INK)
        return c
    # eyes
    for ex in (11, 20):
        for dx in range(3):
            for dy in range(4):
                c.set(ex + dx, 11 + dy, INK)
        c.set(ex + 1, 11, "#FFFFFF")
        c.set(ex + 1, 12, "#FFFFFF")
    # angry brows
    for i, (bx, by) in enumerate([(10, 9), (11, 9), (12, 10), (13, 10)]):
        c.set(bx, by, INK)
    for bx, by in [(20, 10), (21, 10), (22, 9), (23, 9)]:
        c.set(bx, by, INK)
    # mouth with fang
    for x in range(14, 21):
        c.set(x, 17, INK)
    c.set(15, 18, "#FFFFFF")
    c.set(19, 18, "#FFFFFF")
    c.set(14, 18, INK); c.set(16, 18, INK); c.set(18, 18, INK); c.set(20, 18, INK)
    return c




# ---------- sword hand (right) ----------
def sword_hand(W=40, H=74):
    c = Canvas(W, H)
    S, SD, SW = "#D7E0EE", "#8A97B0", "#FFFFFF"
    GOLD, GOLDD = "#FFB627", "#C77B12"
    BR, BRD = "#8A4B22", "#5E2F12"
    bx = 14  # blade left x, blade width 7
    # blade
    blade = set()
    for y in range(2, 40):
        for x in range(bx, bx + 7):
            blade.add((x, y))
    for x in range(bx + 2, bx + 5):
        blade.add((x, 1))
    blade.add((bx + 3, 0))

    def bf(x, y):
        if x == bx + 1:
            return SW
        if x >= bx + 4:
            return SD
        return S
    c.layer(blade, bf)
    for y in range(4, 38):
        c.set(bx + 3, y, "#B9C5D8")
    # crossguard
    guard = {(x, y) for x in range(bx - 6, bx + 13) for y in range(40, 45)}
    c.layer(guard, lambda x, y: GOLD if y < 42 else GOLDD)
    c.set(bx + 3, 42, "#E8434C"); c.set(bx + 3, 41, "#FF8A8A")
    # grip
    grip = {(x, y) for x in range(bx + 1, bx + 6) for y in range(45, 50)}
    c.layer(grip, lambda x, y: BR if (y % 2) else BRD)
    # arm (behind fist), going down-right
    arm = set()
    for y in range(54, H):
        off = (y - 54) * 0.55
        for x in range(int(bx - 3 + off), int(bx + 17 + off)):
            arm.add((x, y))

    def af(x, y):
        rel = x - (bx - 3 + (y - 54) * 0.55)
        if rel < 3:
            return PL
        if rel > 15:
            return PD
        return P
    c.layer(arm, af)
    # fist
    fist = {(x, y) for x in range(bx - 4, bx + 12) for y in range(49, 61)}
    for corner in [(bx - 4, 49), (bx + 11, 49), (bx - 4, 60), (bx + 11, 60)]:
        fist.discard(corner)

    def ff(x, y):
        if x <= bx - 2:
            return PL
        if x >= bx + 9:
            return PD
        return P
    c.layer(fist, ff)
    # finger separators + claws
    for fx in (bx, bx + 4, bx + 8):
        for y in range(50, 55):
            c.set(fx, y, INK)
    for i, fx in enumerate((bx - 3, bx + 1, bx + 5)):
        c.set(fx + 1, 55, CREAM); c.set(fx + 2, 55, CREAM); c.set(fx + 1, 56, CREAM)
        c.set(fx, 55, INK); c.set(fx + 3, 55, INK); c.set(fx + 1, 57, INK); c.set(fx + 2, 56, INK)
    # thumb
    for x in range(bx - 6, bx - 2):
        for y in range(51, 56):
            c.set(x, y, INK if (x == bx - 6 or y in (51, 55)) else PL)
    return c


save("sword_hand", sword_hand(), 6)
save("sword_swing", sword_hand(W=60, H=100), 6)


# ---------- shield hand (left) ----------
def shield_hand(state="cracked", with_arm=True):
    W, H = 52, 70
    c = Canvas(W, H)
    # arm going down-left
    arm = set()
    if not with_arm:
        H = 0
    for y in range(40, H):
        off = (y - 40) * 0.6
        for x in range(int(18 - off), int(38 - off)):
            arm.add((x, y))

    def af(x, y):
        rel = x - (18 - (y - 40) * 0.6)
        if rel < 3:
            return PL
        if rel > 16:
            return PD
        return P
    c.layer(arm, af)
    # heater shield
    SW_, SH = 36, 44
    ox, oy = 6, 2
    cx = ox + (SW_ - 1) / 2
    mask = set()
    for y in range(SH):
        if y < 20:
            hw = SW_ / 2
        else:
            t = (y - 20) / (SH - 20)
            hw = (SW_ / 2) * math.sqrt(max(0, 1 - t * t))
        for x in range(ox, ox + SW_):
            if abs(x - cx) <= hw - 0.2:
                mask.add((x, oy + y))
    RIM, RIMD = "#C9D3E3", "#7F8CA6"
    WOOD, WOODL, WOODD = "#B66A2E", "#D98C45", "#8A4B22"

    def depth(x, y):
        d = 0
        while all((x + dx, y + dy) in mask for dx in range(-d - 1, d + 2) for dy in range(-d - 1, d + 2) if abs(dx) + abs(dy) <= d + 1):
            d += 1
            if d > 4:
                break
        return d

    def sf(x, y):
        d = depth(x, y)
        if d <= 2:
            return RIMD if x > cx + 8 or y > oy + 34 else RIM
        plank = (x - ox) // 6
        if (x - ox) % 6 == 0:
            return WOODD
        return WOODL if plank % 2 == 0 else WOOD
    c.layer(mask, sf)
    # boss
    bcx, bcy = int(cx), oy + 18
    for x in range(bcx - 4, bcx + 6):
        for y in range(bcy - 4, bcy + 6):
            dd = (x - bcx - 0.5) ** 2 + (y - bcy - 0.5) ** 2
            if dd <= 20:
                c.set(x, y, INK if dd > 13 else ("#FFE58A" if (x < bcx and y < bcy) else "#FFB627"))
    if state == "cracked":
        crack = [(34, 2), (33, 3), (33, 4), (32, 5), (31, 6), (31, 7), (30, 8), (31, 9), (32, 10), (32, 11),
                 (31, 12), (30, 13), (29, 14), (28, 15), (28, 16), (29, 17), (35, 9), (36, 10), (37, 10), (38, 11),
                 (12, 30), (13, 31), (14, 31), (15, 32), (16, 33), (16, 34), (15, 35)]
        for p in crack:
            c.set(*p, INK)
    # fingers gripping right rim
    for i, fy in enumerate((22, 27, 32) if with_arm else ()):
        for x in range(38, 44):
            for y in range(fy, fy + 4):
                edge = x in (38, 43) or y in (fy, fy + 3)
                c.set(x, y, INK if edge else (PL if y == fy + 1 else P))
        c.set(44, fy + 1, CREAM); c.set(44, fy + 2, CREAM); c.set(45, fy + 1, INK); c.set(45, fy + 2, INK)
        c.set(44, fy, INK); c.set(44, fy + 3, INK)
    return c


save("shield_cracked", shield_hand("cracked"), 6)
save("shield_full", shield_hand("full"), 6)


# ---------- cloud ----------
def cloud(seed=1, w=40, h=14):
    c = Canvas(w, h)
    rnd = random.Random(seed)
    circles = [(8, 9, 5), (16, 6, 6), (25, 7, 6), (32, 9, 5)]
    mask = set()
    for x in range(w):
        for y in range(h):
            if y >= h - 2:
                continue
            for (cx, cy, r) in circles:
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    mask.add((x, y))
    c.layer(mask, lambda x, y: "#D6F0FF" if y >= h - 5 else "#FFFFFF", outline=None)
    return c


save("cloud", cloud(), 6)


# ---------- QR placeholder ----------
def qr():
    n = 29
    c = Canvas(n + 4, n + 4)
    for x in range(n + 4):
        for y in range(n + 4):
            c.set(x, y, "#FFFFFF")
    rnd = random.Random(42)
    grid = [[rnd.random() < 0.48 for _ in range(n)] for _ in range(n)]

    def finder(ox, oy):
        for x in range(-1, 8):
            for y in range(-1, 8):
                if 0 <= ox + x < n and 0 <= oy + y < n:
                    v = (x in (0, 6) or y in (0, 6) or (2 <= x <= 4 and 2 <= y <= 4)) and 0 <= x <= 6 and 0 <= y <= 6
                    grid[oy + y][ox + x] = v
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7)
    for i in range(8, n - 8):
        grid[6][i] = i % 2 == 0
        grid[i][6] = i % 2 == 0
    # center logo hole
    for x in range(11, 18):
        for y in range(11, 18):
            grid[y][x] = False
    for y in range(n):
        for x in range(n):
            if grid[y][x]:
                c.set(x + 2, y + 2, INK)
    # tiny dino in the middle
    head = dino_head(P, PD, PL)
    return c


save("qr", qr(), 10)


# ---------- small icons ----------
CASTLE = [
    "K.K.K....K.K.K",
    "KKKKK....KKKKK",
    "KGGGK.KK.KGGGK",
    "KGGGKKGGKKGGGK",
    "KGGGGGGGGGGGGK",
    "KGGGGGGGGGGGGK",
    "KGGGGKKKKGGGGK",
    "KGGGKDDDDKGGGK",
    "KGGGKDDDDKGGGK",
    "KKKKKKKKKKKKKK",
]
save("castle", ascii_sprite(CASTLE, {"K": INK, "G": "#C9D3E3", "D": "#4B1FA8"}), 4)

CHECK = [
    "........KK",
    ".......KWK",
    "KK....KWK.",
    "KWK..KWK..",
    ".KWKKWK...",
    "..KWWK....",
    "...KK.....",
]
save("check", ascii_sprite(CHECK, {"K": INK, "W": "#FFFFFF"}), 4)


# ---------- battle background (320x180) ----------
def battle_bg():
    W, H = 320, 180
    c = Canvas(W, H)
    rnd = random.Random(7)
    HOR = 92
    sky = ["#4FB6F5", "#63C5FF", "#86D3FF", "#A8E2FF"]
    bands = [0, 30, 55, 75]
    for y in range(HOR):
        idx = sum(1 for b in bands if y >= b) - 1
        for x in range(W):
            col = sky[idx]
            # dither transitions
            c.set(x, y, col)
    # far mountains
    for x in range(W):
        h = 18 + 10 * math.sin(x / 23.0) + 6 * math.sin(x / 9.0 + 1)
        top = int(HOR - h)
        for y in range(top, HOR):
            c.set(x, y, "#8CCFB8" if y > top + 1 else "#B9E6D6")
    # mid hills
    for x in range(W):
        h = 10 + 6 * math.sin(x / 31.0 + 2) + 3 * math.sin(x / 7.0)
        top = int(HOR + 4 - h)
        for y in range(top, HOR + 6):
            c.set(x, y, "#5DB874" if y > top else "#7FCF8F")
    # pine tree line
    def pine(px, base, height, col, colL):
        for i in range(height):
            hw = (i * 0.45) // 1 + 1 if i > 1 else 0
            y = base - height + i
            for x in range(int(px - hw), int(px + hw) + 1):
                c.set(x, y, colL if x < px else col)
        for y in range(base, base + 3):
            c.set(px, y, "#5E2F12")
    x = 2
    while x < W:
        hgt = rnd.randint(16, 26)
        if abs(x - W / 2) > 26:
            pine(x, HOR + 10, hgt, "#1F6B3A", "#2E8B4A")
        x += rnd.randint(7, 11)
    # ground
    for y in range(HOR + 8, H):
        for x in range(W):
            col = "#3FAE5A"
            c.set(x, y, col)
    # tree base strip
    for x in range(W):
        for y in range(HOR + 8, HOR + 11):
            c.set(x, y, "#2F9148")
    # perspective dirt path
    vx = W / 2
    for y in range(HOR + 6, H):
        t = (y - (HOR + 6)) / (H - HOR - 6)
        hw = 4 + t * 120
        for x in range(int(vx - hw), int(vx + hw) + 1):
            edge = abs(x - vx) > hw - 1.5
            col = "#C58A52" if edge else "#E2AE73"
            c.set(x, y, col)
    # grass tufts
    for _ in range(70):
        tx, ty = rnd.randint(0, W - 1), rnd.randint(HOR + 14, H - 2)
        t = (ty - (HOR + 6)) / (H - HOR - 6)
        if abs(tx - vx) < 4 + t * 120 + 2:
            continue
        for dx, dy in ((0, 0), (1, -1), (2, 0)):
            c.set(tx + dx, ty + dy, "#1F7A3E")
    # flowers
    for _ in range(26):
        tx, ty = rnd.randint(0, W - 1), rnd.randint(HOR + 14, H - 2)
        t = (ty - (HOR + 6)) / (H - HOR - 6)
        if abs(tx - vx) < 4 + t * 120 + 3:
            continue
        col = rnd.choice(["#FFFFFF", "#F7C52B", "#FF6FA8"])
        c.set(tx, ty, col)
    return c


save("battle_bg", battle_bg(), 5)


# ---------- sky + grass background for menus (320x180) ----------
def menu_bg():
    W, H = 320, 180
    c = Canvas(W, H)
    for y in range(H):
        for x in range(W):
            if y < 156:
                col = "#63C5FF"
                if y >= 124:
                    col = "#86D3FF"
            else:
                col = "#3FAE5A" if y > 158 else "#2F9148"
            c.set(x, y, col)
    # hills
    for x in range(W):
        h = 14 + 8 * math.sin(x / 27.0) + 4 * math.sin(x / 11.0 + 2)
        for y in range(int(156 - h), 156):
            c.set(x, y, "#5DB874" if y > int(156 - h) else "#7FCF8F")
    return c


save("menu_bg", menu_bg(), 5)

for f in sorted(os.listdir(OUT)):
    print(f, os.path.getsize(os.path.join(OUT, f)))


# ---------- answer shape icons (white with ink outline) ----------
def shape_icon(kind):
    n = 13
    c = Canvas(n, n)
    m = set()
    cx = cy = (n - 1) / 2
    for x in range(n):
        for y in range(n):
            if kind == "triangle":
                ok = y >= 1 and y <= 11 and abs(x - cx) <= (y - 1) * 0.55 + 0.5
            elif kind == "diamond":
                ok = abs(x - cx) + abs(y - cy) <= 6
            elif kind == "circle":
                ok = (x - cx) ** 2 + (y - cy) ** 2 <= 36
            else:  # star
                a = math.atan2(y - cy, x - cx) + math.pi / 2
                r = math.hypot(x - cx, y - cy)
                k = (math.cos(5 * a) + 1) / 2
                ok = r <= 2.8 + 3.6 * k
            if ok:
                m.add((x, y))
    c.layer(m, lambda x, y: "#FFFFFF")
    return c


for k in ("triangle", "diamond", "star", "circle"):
    save("icon_" + k, shape_icon(k), 4)

# shield pip for HUD
PIP = [
    "KKKKKKK",
    "KSSSSSK",
    "KSWSSSK",
    "KSSSSSK",
    ".KSSSK.",
    "..KSK..",
    "...K...",
]
save("pip_full", ascii_sprite(PIP, {"K": INK, "S": "#C9D3E3", "W": "#FFFFFF"}), 4)
save("pip_empty", ascii_sprite(PIP, {"K": "#6B6480", "S": "#3A3350", "W": "#3A3350"}), 4)


# ---------- sword slash arc ----------
def slash():
    W, H = 80, 48
    c = Canvas(W, H)
    cx, cy = 40, 58
    for x in range(W):
        for y in range(H):
            r = math.hypot(x - cx, y - cy)
            a = math.degrees(math.atan2(cy - y, x - cx))  # 0 = right, 90 = up
            if not (15 <= a <= 165):
                continue
            t = (a - 15) / 150  # 0 at right tip, 1 at left tail
            thick = 1.5 + 6 * math.sin(math.pi * min(1, t * 1.15))
            if 44 <= r <= 44 + thick:
                inner = r - 44
                c.set(x, y, "#FFFFFF" if inner < thick * 0.6 else "#A8E2FF")
    return c


save("slash", slash(), 8)


# ---------- empty open hand (no shield left) ----------
def empty_hand():
    W, H = 52, 70
    c = Canvas(W, H)
    arm = set()
    for y in range(40, H):
        off = (y - 40) * 0.6
        for x in range(int(18 - off), int(38 - off)):
            arm.add((x, y))
    c.layer(arm, lambda x, y: PL if x - (18 - (y - 40) * 0.6) < 3 else (PD if x - (18 - (y - 40) * 0.6) > 16 else P))
    palm = {(x, y) for x in range(16, 38) for y in range(30, 46)}
    for corner in [(16, 30), (37, 30), (16, 45), (37, 45)]:
        palm.discard(corner)
    c.layer(palm, lambda x, y: PL if x < 19 else (PD if x > 34 else P))
    # three spread fingers + thumb, claws on tips
    fingers = [(17, 18, -0.35), (24, 14, 0.0), (31, 18, 0.35)]
    for fx, top, lean in fingers:
        m = set()
        for y in range(top, 32):
            sx = int(fx + (31 - y) * lean)
            for x in range(sx, sx + 6):
                m.add((x, y))
        c.layer(m, lambda x, y: PL if (x + y) % 7 == 0 else P)
        tip_y = top
        sx = int(fx + (31 - tip_y) * lean)
        for dx in (1, 2, 3, 4):
            c.set(sx + dx, tip_y - 1, INK)
        c.set(sx + 2, tip_y - 2, CREAM); c.set(sx + 3, tip_y - 2, CREAM)
        c.set(sx + 2, tip_y - 3, INK); c.set(sx + 3, tip_y - 3, INK)
        c.set(sx + 1, tip_y - 2, INK); c.set(sx + 4, tip_y - 2, INK)
    thumb = {(x, y) for x in range(36, 44) for y in range(32, 38)}
    c.layer(thumb, lambda x, y: P)
    return c


save("empty_hand", empty_hand(), 6)


# ---------- shield exploding into pieces ----------
def shield_pieces(spread=7, drop=False, seed=3):
    src = shield_hand("cracked", with_arm=False)
    pts = list(src.px.keys())
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    rnd = random.Random(seed)
    seeds = [(rnd.uniform(min(xs), max(xs)), rnd.uniform(min(ys), max(ys))) for _ in range(7)]

    def owner(p):
        return min(range(len(seeds)), key=lambda i: (p[0] - seeds[i][0]) ** 2 + (p[1] - seeds[i][1]) ** 2)
    own = {p: owner(p) for p in pts}
    W, H = 52 + spread * 4, 52 + spread * 4
    c = Canvas(W, H + (20 if drop else 0))
    for i, (sx, sy) in enumerate(seeds):
        dx, dy = sx - cx, sy - cy
        n = math.hypot(dx, dy) or 1
        ox = int(dx / n * spread) + spread * 2 - 4
        oy = int(dy / n * spread) + spread * 2 + (int(abs(sy - cy) * 0.6) + 14 if drop else 0)
        if drop:
            oy = H - 12 - int((max(ys) - sy) * 0.25) - 4
            oy = oy - int(sy * 0.35)
        for p, o in own.items():
            if o != i:
                continue
            x, y = p
            border = any(own.get((x + a, y + b), -1) != i for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            c.set(x + ox, y + oy, INK if border else src.px[p])
    return c


save("shield_pieces", shield_pieces(), 6)


# ---------- full-body dino (side view) ----------
DINO_FULL = [
    "..............KKKKKKK.....",
    ".............KPPPPPPPKK...",
    "............KPPPPPPPPPPK..",
    "............KPPPPWKPPPPPK.",
    "............KPPPPKKPPPPPK.",
    "............KPRRPPPPPPPPK.",
    "............KPPPPPPPKKKKK.",
    "............KPPPPPPPPWWK..",
    "............KPPPPPPPKKKK..",
    "...KK.......KPPPPPPK......",
    "..KPPK.....KPPPPPPPK......",
    "..KDPPK...KPPPPPPPPK......",
    "...KDPPK.KPPPPPPPPPKKK....",
    "....KDPPKPPPPPPPPPPLLLK...",
    ".....KDPPPPPPPPPPPKKKK....",
    "......KDPPPPPLLLLPPK......",
    ".......KDPPPLLLLLLPK......",
    ".......KDPPPLLLLLLPK......",
    "........KDPPPLLLLPK.......",
    "........KDPPPPPPPPK.......",
    "........KDPPKKKDPPK.......",
    "........KDPK...KDPK.......",
    "........KKKK...KKKK.......",
]
SAD_FACE = {(17, 3): "P", (18, 3): "P", (17, 4): "K", (18, 4): "K", (16, 4): "K", (18, 5): "B", (18, 6): "B"}


def full_dino(body, dark, light, mirror=False, crown=False, sad=False):
    rows = [list(r.ljust(26, ".")) for r in DINO_FULL]
    if sad:
        for (x, y), ch in SAD_FACE.items():
            rows[y][x] = ch
        # downturned mouth
        rows[7][21] = "P"; rows[7][22] = "P"; rows[7][23] = "K"
    if crown:
        rows = [list("..............Y.Y.Y.......".ljust(26, ".")),
                list("..............YYJYY.......".ljust(26, ".")),
                list(".............KYYYYYK......".ljust(26, "."))] + rows
        rows[3] = list("..............KKKKKKK.....".ljust(26, "."))
    legend = {"K": INK, "P": body, "D": dark, "L": light, "W": "#FFFFFF", "R": body,
              "Y": "#FFB627", "B": "#63C5FF"}
    legend["J"] = "#E8434C"
    c = ascii_sprite(["".join(r) for r in rows], legend)
    if mirror:
        m = Canvas(c.w, c.h)
        for (x, y), col in c.px.items():
            m.set(c.w - 1 - x, y, col)
        c = m
    return c


save("dino_full", full_dino(P, PD, PL), 8)
save("dino_full_sad", full_dino(P, PD, PL, sad=True), 8)
save("princess", full_dino("#FF6FA8", "#B83A6E", "#FFB3D0", mirror=True, crown=True), 8)


# ---------- open cage ----------
def cage():
    W, H = 30, 40
    c = Canvas(W, H)
    G, GD = "#FFB627", "#C77B12"
    for y in range(0, 6):  # chain
        c.set(10, y, INK if y % 2 else GD)
    top = {(x, y) for x in range(2, 19) for y in range(6, 9)}
    c.layer(top, lambda x, y: G)
    base = {(x, y) for x in range(2, 19) for y in range(34, 37)}
    c.layer(base, lambda x, y: GD)
    for bx in range(3, 18, 4):
        for y in range(9, 34):
            c.set(bx, y, INK); c.set(bx + 1, y, G)
    # door swung open to the right
    for i, bx in enumerate(range(20, 29, 3)):
        for y in range(11 + i, 32 + i):
            c.set(bx, y, INK); c.set(bx + 1, y, G)
    for x in range(19, 30):
        c.set(x, 11 + (x - 19) // 3, INK)
        c.set(x, 32 + (x - 19) // 3, INK)
    return c


save("cage", cage(), 6)

HEART = [
    ".KK.KK.",
    "KRRKRRK",
    "KRWRRRK",
    "KRRRRRK",
    ".KRRRK.",
    "..KRK..",
    "...K...",
]
save("heart", ascii_sprite(HEART, {"K": INK, "R": "#E8434C", "W": "#FFB3D0"}), 6)


# ---------- victory background: castle at sunset ----------
def castle_bg(sky=True, castle=True):
    W, H = 320, 180
    c = Canvas(W, H)
    HOR = 128
    if not sky:  # foreground only (the sky comes from the Ocean & Clouds pack)
        return _castle_fg(c, W, H, HOR, castle)
    sky = [(0, "#3B2559"), (32, "#6A3768"), (62, "#B85A6A"), (90, "#E98A62"), (112, "#F6B26B")]
    for y in range(HOR):
        col = [s[1] for s in sky if y >= s[0]][-1]
        for x in range(W):
            c.set(x, y, col)
    # sun
    for x in range(W):
        for y in range(HOR):
            if (x - 160) ** 2 + (y - 70) ** 2 <= 34 ** 2:
                c.set(x, y, "#FFE3A3")
    return _castle_fg(c, W, H, HOR)


def _castle_fg(c, W, H, HOR, castle=True):
    # distant hills
    for x in range(W):
        top = int(HOR - 14 - 6 * math.sin(x / 19.0) - 3 * math.sin(x / 7.0))
        for y in range(top, HOR):
            c.set(x, y, "#5B3A66" if y > top else "#7A4E78")
    if castle:  # (the victory screen now uses a Sunny Castle from Pixel1992 instead)
        STONE, STONED, STONEL = "#C9D3E3", "#9AA6BE", "#E6ECF5"
        ROOF, ROOFL = "#4B1FA8", "#7A3CF0"

        def block(x0, x1, y0, y1, merlons=True):
            m = {(x, y) for x in range(x0, x1) for y in range(y0, y1)}
            if merlons:
                for x in range(x0, x1):
                    if ((x - x0) // 5) % 2 == 0:
                        for y in range(y0 - 5, y0):
                            m.add((x, y))
            c.layer(m, lambda x, y: STONEL if x < x0 + 3 else (STONED if x > x1 - 4 or (y - y0) % 10 == 9 else STONE))
        block(96, 224, 62, HOR)
        for tx in (70, 220):
            block(tx, tx + 30, 34, HOR, merlons=False)
            roof = set()
            for i in range(24):
                hw = i * 0.75
                for x in range(int(tx + 15 - hw - 1), int(tx + 15 + hw + 2)):
                    roof.add((x, 12 + i))
            c.layer(roof, lambda x, y: ROOFL if x < tx + 15 else ROOF)
            for y in range(2, 12):
                c.set(tx + 15, y, INK)
            for i, y in enumerate(range(2, 7)):
                for x in range(tx + 16, tx + 16 + 8 - i):
                    c.set(x, y, "#F7C52B" if y != 6 else "#C99A0F")
            for wy in (50, 74):
                for x in range(tx + 12, tx + 18):
                    for y in range(wy, wy + 9):
                        c.set(x, y, INK if x in (tx + 12, tx + 17) or y == wy else "#FFE58A")
        # gate (open, warm light inside)
        for x in range(144, 176):
            for y in range(88, HOR):
                r = math.hypot(x - 159.5, y - 104)
                if y >= 104 or r <= 16:
                    edge = x in (144, 175) or (y < 104 and r > 14.8)
                    c.set(x, y, INK if edge else ("#FFB627" if (y > 110 and abs(x - 159.5) < 9) else "#5E2F12"))
        # banners
        for bx in (116, 196):
            for y in range(72, 92):
                for x in range(bx, bx + 10):
                    tail = y >= 88 and abs(x - bx - 4.5) < (y - 87) * 1.2
                    if not tail:
                        c.set(x, y, INK if x in (bx, bx + 9) or y == 72 else "#7A3CF0")
            for x in range(bx + 3, bx + 7):
                c.set(x, 78, "#FFB627"); c.set(x, 79, "#FFB627")
    # ground + path to the gate
    for y in range(HOR, H):
        for x in range(W):
            c.set(x, y, "#2F7F48")
        t = (y - HOR) / (H - HOR)
        hw = 16 + t * 110
        for x in range(int(160 - hw), int(160 + hw) + 1):
            c.set(x, y, "#C58A52" if abs(x - 160) > hw - 1.5 else "#E2AE73")
    rnd = random.Random(11)
    for _ in range(40):
        tx, ty = rnd.randint(0, W - 1), rnd.randint(HOR + 3, H - 2)
        t = (ty - HOR) / (H - HOR)
        if abs(tx - 160) < 16 + t * 110 + 3:
            continue
        col = rnd.choice(["#FFFFFF", "#F7C52B", "#FF6FA8", "#1F7A3E", "#1F7A3E"])
        c.set(tx, ty, col)
    return c


save("castle_bg", castle_bg(), 5)
save("castle_fg", castle_bg(sky=False), 5)
save("ground_fg", castle_bg(sky=False, castle=False), 5)


# ---------- game over background: night forest ----------
def night_bg(sky=True):
    W, H = 320, 180
    c = Canvas(W, H)
    HOR = 100
    for y in range(HOR if sky else 0):
        col = "#120D24" if y < 35 else ("#1B1433" if y < 70 else "#271D47")
        for x in range(W):
            c.set(x, y, col)
    rnd = random.Random(5)
    for _ in range(70):
        x, y = rnd.randint(0, W - 1), rnd.randint(0, HOR - 20)
        if sky:
            c.set(x, y, rnd.choice(["#FFFFFF", "#FFF4D6", "#B48CFF"]))
    for x in range(W):
        for y in range(HOR):
            if sky and (x - 250) ** 2 + (y - 30) ** 2 <= 13 ** 2:
                c.set(x, y, "#FFF4D6" if (x - 245) ** 2 + (y - 27) ** 2 > 9 ** 2 else "#E9D6A6")
    x = 0
    while x < W:
        h = rnd.randint(18, 30)
        for i in range(h):
            hw = int(i * 0.45) + 1 if i > 1 else 0
            for xx in range(x - hw, x + hw + 1):
                c.set(xx, HOR + 6 - h + i, "#0B0818")
        x += rnd.randint(6, 10)
    for y in range(HOR + 6, H):
        for x in range(W):
            c.set(x, y, "#231B3E")
        t = (y - HOR - 6) / (H - HOR - 6)
        hw = 4 + t * 120
        for x in range(int(160 - hw), int(160 + hw) + 1):
            c.set(x, y, "#3A3058" if abs(x - 160) > hw - 1.5 else "#4A3F6E")
    return c


save("night_bg", night_bg(), 5)
save("night_fg", night_bg(sky=False), 5)


# ---------- shield seen from behind (first person): round wooden shield,
# forearm through a leather strap, fist gripping the handle strap ----------
def shield_back(state="full", with_arm=True, seed=4):
    W, H = 76, 84
    c = Canvas(W, H)
    cx, cy, R = 36, 34, 31
    rnd = random.Random(seed)
    WOOD, WOODB, WOODD, RIMC = "#8A4B22", "#9C5A2A", "#6B3818", "#5E2F12"
    LEATHER, LEATHERD = "#CDB58A", "#9C8762"

    mask = {(x, y) for x in range(W) for y in range(H) if (x - cx) ** 2 + (y - cy) ** 2 <= R * R}
    grain = {(rnd.randint(cx - R, cx + R), rnd.randint(cy - R, cy + R)) for _ in range(60)}

    def wood(x, y):
        r = math.hypot(x - cx, y - cy)
        if r > R - 2.5:
            return RIMC
        if (x - cx + R) % 9 == 0:
            return WOODD
        if (x, y) in grain or (x, y - 1) in grain:
            return WOODD
        base = WOODB if ((x - cx + R) // 9) % 2 == 0 else WOOD
        # soft shading toward the lower right
        if (x - cx) + (y - cy) > R * 0.9 and base == WOODB:
            return WOOD
        return base
    c.layer(mask, wood)

    if state == "cracked":
        crack = [(52, 6), (51, 7), (51, 8), (50, 9), (49, 10), (49, 11), (48, 12), (49, 13), (50, 14), (50, 15),
                 (49, 16), (48, 17), (47, 18), (46, 19), (56, 13), (57, 14), (58, 14), (59, 15), (60, 16),
                 (14, 44), (15, 45), (16, 45), (17, 46), (18, 47), (18, 48), (17, 49), (16, 50)]
        for p in crack:
            if p in mask:
                c.set(*p, INK)
        # chipped rim on the top right
        for (x, y) in list(mask):
            if (x - 58) ** 2 + (y - 6) ** 2 <= 30:
                c.set(x, y, None)
        for (x, y) in list(mask):
            if (x, y) in c.px and any(((x + a - 58) ** 2 + (y + b - 6) ** 2 <= 30) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                c.set(x, y, INK)

    A = (4.0, 90.0)   # where the forearm enters (bottom-left, off canvas)
    B = (46.0, 32.0)  # fist position
    dx, dy = B[0] - A[0], B[1] - A[1]
    L = math.hypot(dx, dy)
    ux, uy = dx / L, dy / L          # along the arm
    nx, ny = -uy, ux                  # perpendicular to the arm

    def band(center, half_len, half_w):
        m = set()
        for x in range(W):
            for y in range(H):
                px, py = x + 0.5 - center[0], y + 0.5 - center[1]
                along = px * nx + py * ny
                across = px * ux + py * uy
                if abs(along) <= half_len and abs(across) <= half_w:
                    m.add((x, y))
        return m

    def strap(center, half_len, half_w):
        m = band(center, half_len, half_w)
        c.layer(m, lambda x, y: LEATHERD if ((x + 0.5 - center[0]) * ux + (y + 0.5 - center[1]) * uy) > half_w - 1.6 else LEATHER)
        for sgn in (-1, 1):  # two rivets at each end
            ex, ey = center[0] + nx * sgn * (half_len - 3), center[1] + ny * sgn * (half_len - 3)
            for k in (-1.4, 1.4):
                c.set(int(ex + ux * k), int(ey + uy * k), INK)

    handle_c = (B[0] + ux * 1.0, B[1] + uy * 1.0)
    strap(handle_c, 17, 3.2)

    if not with_arm:
        strap((A[0] + dx * 0.55, A[1] + dy * 0.55), 15, 4)
        return c

    arm = set()
    for x in range(W):
        for y in range(H):
            px, py = x + 0.5 - A[0], y + 0.5 - A[1]
            t = (px * ux + py * uy) / L
            d = px * nx + py * ny
            if 0 <= t <= 0.98 and abs(d) <= 8.5:
                arm.add((x, y))

    def armfill(x, y):
        d = (x + 0.5 - A[0]) * nx + (y + 0.5 - A[1]) * ny
        if d < -5:
            return PL
        if d > 5.5:
            return PD
        return P
    c.layer(arm, armfill)

    # forearm strap goes OVER the arm
    strap((A[0] + dx * 0.55, A[1] + dy * 0.55), 15, 4)

    # fist wrapped around the handle strap
    fist = set()
    for x in range(W):
        for y in range(H):
            px, py = x + 0.5 - B[0], y + 0.5 - B[1]
            a, b = px * ux + py * uy, px * nx + py * ny
            if (a / 8.5) ** 2 + (b / 11.5) ** 2 <= 1:
                fist.add((x, y))

    def fistfill(x, y):
        b = (x + 0.5 - B[0]) * nx + (y + 0.5 - B[1]) * ny
        return PL if b < -6 else (PD if b > 7 else P)
    c.layer(fist, fistfill)
    # pronated grip: we see the back of the hand. Knuckle ridge on the far side,
    # curled fingers wrapping over the handle and claw tips peeking past it.
    def at(a, b):
        return int(B[0] + ux * a + nx * b), int(B[1] + uy * a + ny * b)
    for (x, y) in list(fist):          # curled fingers darken as they wrap toward the shield
        if (x, y) not in c.px or c.px[(x, y)] == INK:
            continue
        aa = (x + 0.5 - B[0]) * ux + (y + 0.5 - B[1]) * uy
        if aa > 5.5:
            c.set(x, y, PD)
    for b0 in (-6, -2, 2, 6):          # knuckle bumps
        for bb in (b0 - 1, b0, b0 + 1):
            c.set(*at(2, bb), PL)
    for bgap in (-4, 0, 4):            # gaps between fingers
        for aa in range(3, 9):
            c.set(*at(aa, bgap), INK)
    for a in range(-5, 2):             # tendon highlight on the back of the hand
        c.set(*at(a, -3), PL)
    for (a, b) in ((-2, -11), (-1, -11), (0, -11), (1, -11), (2, -10)):   # thumb wrapping the side
        c.set(*at(a, b), P)
    for (a, b) in ((-3, -12), (-2, -12), (-1, -12), (0, -12), (1, -12), (2, -11), (3, -10)):
        c.set(*at(a, b), INK)
    return c


save("shield_full", shield_back("full"), 6)
save("shield_cracked", shield_back("cracked"), 6)


def shield_back_pieces(spread=7, seed=3):
    src = shield_back("cracked", with_arm=False)
    pts = list(src.px.keys())
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    rnd = random.Random(seed)
    seeds = [(rnd.uniform(min(xs), max(xs)), rnd.uniform(min(ys), max(ys))) for _ in range(7)]
    own = {p: min(range(len(seeds)), key=lambda i: (p[0] - seeds[i][0]) ** 2 + (p[1] - seeds[i][1]) ** 2) for p in pts}
    c = Canvas(max(xs) + spread * 4, max(ys) + spread * 4)
    for i, (sx, sy) in enumerate(seeds):
        ddx, ddy = sx - cx, sy - cy
        n = math.hypot(ddx, ddy) or 1
        ox, oy = int(ddx / n * spread) + spread * 2, int(ddy / n * spread) + spread * 2
        for p, o in own.items():
            if o != i:
                continue
            x, y = p
            border = any(own.get((x + a, y + b), -1) != i for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            c.set(x + ox, y + oy, INK if border else src.px[p])
    return c


save("shield_pieces", shield_back_pieces(), 6)


# ---------- shadow dinosaurs (enemies): dark silhouettes, purple rim light,
# smoky aura and glowing red eyes. All face left, toward the player. ----------
SHADOW, SHADOW_LOW, RIM = "#0D0918", "#07050E", "#4A3880"
EYE, EYE_GLOW = "#FF2A3D", "#FF2A3D66"


def _shape(shapes, W, H):
    def inside(px, py, sh):
        kind = sh[0]
        if kind == "e":
            _, cx, cy, rx, ry = sh
            return ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1
        if kind == "t":  # tapered capsule from (x1,y1,r1) to (x2,y2,r2)
            _, x1, y1, r1, x2, y2, r2 = sh
            dx, dy = x2 - x1, y2 - y1
            L2 = dx * dx + dy * dy
            t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / L2))
            qx, qy = x1 + dx * t, y1 + dy * t
            return math.hypot(px - qx, py - qy) <= r1 + (r2 - r1) * t
        if kind == "p":  # polygon
            pts = sh[1]
            ins = False
            j = len(pts) - 1
            for i in range(len(pts)):
                xi, yi = pts[i]; xj, yj = pts[j]
                if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi + 1e-9) + xi:
                    ins = not ins
                j = i
            return ins
        return False
    return {(x, y) for x in range(W) for y in range(H)
            if any(inside(x + 0.5, y + 0.5, sh) for sh in shapes)}


def shadow_dino(shapes, W, H, eyes, teeth=(), crown=(), seed=1, flash=False, cut=()):
    mask = _shape(shapes, W, H)
    for sh in cut:
        mask -= _shape([sh], W, H)
    c = Canvas(W, H)
    rnd = random.Random(seed)
    # smoky aura around the silhouette
    for (x, y) in mask:
        for dx in (-2, -1, 0, 1, 2):
            for dy in (-3, -2, -1, 0, 1):
                p = (x + dx, y + dy)
                if p not in mask and 0 <= p[0] < W and 0 <= p[1] < H and rnd.random() < 0.05:
                    c.set(*p, "#5B3FA055" if rnd.random() < .6 else "#2A1F4E99")
    body, low, rim = (("#F2EEFF", "#C9BFF0", "#FFFFFF") if flash else (SHADOW, SHADOW_LOW, RIM))
    ys = [y for _, y in mask]
    ymid = (min(ys) + max(ys)) / 2
    for (x, y) in mask:
        col = body
        if (x, y - 1) not in mask or (x - 1, y) not in mask and (x, y - 2) not in mask:
            col = rim
        c.set(x, y, col)
    for (x, y) in teeth:
        c.set(x, y, "#9C93B8")
    for (x, y, col) in crown:
        c.set(x, y, col)
    for (x, y) in eyes:
        for gx, gy in ((-1, 0), (2, 0), (0, -1), (1, -1), (0, 1), (1, 1)):
            if (x + gx, y + gy) not in [(e[0], e[1]) for e in eyes]:
                c.set(x + gx, y + gy, EYE_GLOW)
        c.set(x, y, EYE); c.set(x + 1, y, "#FF8A8A" if not flash else EYE)
    return c


def raptor(flash=False):
    W, H = 60, 42
    shapes = [
        ("e", 32, 21, 11, 6.5),                    # body
        ("t", 40, 19, 5.5, 59, 9, 1),              # tail up and back
        ("t", 24, 18, 4.5, 15, 10, 4),             # neck
        ("e", 12, 9, 6.5, 4.5),                    # head
        ("p", [(1, 8), (10, 5.5), (12, 9), (2, 10.5)]),          # upper snout
        ("p", [(3, 12.5), (12, 11), (13, 14), (5, 14)]),          # lower jaw (mouth open)
        ("t", 22, 22, 1.6, 17, 27, 1.1), ("t", 17, 27, 1.1, 15, 26, 0.8),   # arm + claw
        ("t", 33, 24, 5, 36, 31, 2.4), ("t", 36, 31, 2.4, 31, 38, 1.8), ("t", 31, 38, 1.6, 26, 40, 1.2),
        ("t", 31, 39, 1.5, 34, 40.5, 1.2), ("t", 30, 37, 1, 29, 34, 0.6),                           # near leg + sickle claw
        ("t", 28, 24, 4, 30, 31, 2), ("t", 30, 31, 2, 26, 37, 1.5), ("t", 26, 37, 1.4, 22, 39, 1.1),   # far leg
    ]
    cut = [("p", [(2, 10.6), (12, 9.2), (12, 11), (3, 12.4)])]   # open mouth gap
    teeth = [(4, 11), (6, 11), (8, 10), (10, 10), (5, 12), (7, 12), (9, 12)]
    return shadow_dino(shapes, W, H, eyes=[(10, 7)], teeth=teeth, seed=11, flash=flash, cut=cut)


def pterodactyl():
    W, H = 72, 40
    left_wing = [(34, 15), (2, 4), (5, 9), (3, 13), (9, 16), (8, 20), (17, 21), (24, 25), (34, 25)]
    shapes = [
        ("p", left_wing), ("p", [(72 - x, y) for x, y in left_wing]),
        ("e", 36, 21, 4.5, 8),                     # body
        ("e", 36, 11, 4.5, 3.8),                   # head
        ("p", [(33, 10), (16, 15), (33, 13.5)]),   # long beak to the left
        ("p", [(37, 9), (52, 1), (40, 11)]),        # crest
        ("t", 34, 28, 1.3, 32, 33, 1), ("t", 38, 28, 1.3, 40, 33, 1),   # legs
        ("t", 36, 28, 1.5, 36, 36, 0.6),          # tiny tail
    ]
    return shadow_dino(shapes, W, H, eyes=[(33, 10)], seed=12)


def spinosaurus():
    W, H = 70, 46
    shapes = [
        ("e", 38, 29, 14, 8),
        ("p", [(26, 25), (28, 10), (31, 15), (34, 6), (37, 13), (40, 4), (43, 12), (46, 6), (48, 15), (51, 11), (52, 25)]),  # sail
        ("t", 50, 28, 6.5, 69, 22, 1),
        ("t", 27, 27, 6, 18, 20, 4.5),
        ("e", 15, 18, 6, 4),
        ("p", [(1, 18), (12, 15), (14, 19), (2, 20.5)]),        # croc snout
        ("p", [(3, 22.5), (14, 20.5), (15, 23), (5, 23.5)]),
        ("t", 26, 31, 1.8, 21, 35, 1.3),
        ("t", 38, 33, 5.5, 39, 41, 3), ("t", 39, 41, 2.5, 35, 45, 2),
        ("t", 46, 33, 4.5, 48, 41, 2.5), ("t", 48, 41, 2.2, 44, 45, 1.8),
    ]
    cut = [("p", [(2, 20.6), (14, 19.2), (14, 20.4), (3, 22.4)])]
    teeth = [(4, 21), (6, 21), (8, 21), (10, 20), (12, 20), (5, 22), (9, 22)]
    return shadow_dino(shapes, W, H, eyes=[(13, 16)], teeth=teeth, seed=13, cut=cut)


def triceratops():
    W, H = 70, 44
    shapes = [
        ("e", 40, 25, 17, 11),
        ("e", 21, 18, 8, 11),                       # frill
        ("p", [(4, 25), (13, 17), (22, 22), (19, 31), (9, 31)]),   # head + beak
        ("t", 15, 16, 2.2, 3, 6, 0.6), ("t", 19, 14, 2.2, 8, 2, 0.6),   # brow horns
        ("t", 7, 24, 1.6, 2, 19, 0.6),               # nose horn
        ("t", 55, 25, 5.5, 69, 30, 1),
        ("t", 29, 31, 4.5, 28, 42, 3), ("t", 37, 32, 4.2, 37, 42, 2.8),
        ("t", 47, 32, 4.5, 49, 42, 3), ("t", 53, 30, 4.2, 56, 42, 2.8),
    ]
    spikes = [(21, 7), (25, 9), (28, 13), (17, 6), (14, 8)]
    for (x, y) in spikes:
        shapes.append(("t", x, y + 3, 1.6, x, y - 1, 0.5))
    return shadow_dino(shapes, W, H, eyes=[(13, 20)], seed=14)


# ---------- King Dread (boss): a front-facing shadow tyrant that looms over the
# player. Same family as the shadow dinos (black body, violet rim, red eyes) but
# bigger (96x80) and far more detailed: bone skull-mask with an obsidian crown
# fused into it, three burning eyes, ember maw full of teeth, cracked ribcage
# glowing from inside, raised claws with broken golden shackles, violet rune
# cracks and a ragged royal mantle. No smoke aura. ----------
BONE, BONE_D, BONE_L = "#B9AED6", "#6E6390", "#EEE8FF"
EMBER, EMBER_D, EMBER_L, MAW = "#E8434C", "#7A1020", "#FF9A4A", "#2A0710"
GOLD, GOLD_D, GOLD_L = "#C9A13B", "#7A5C1C", "#FFD36B"
MANTLE, MANTLE_D, MANTLE_RIM = "#26123F", "#170B2B", "#4B1FA8"
RIM2 = "#2A2050"


def _mirror(shapes, W):
    out = []
    for sh in shapes:
        if sh[0] == "e":
            out.append(("e", W - sh[1], sh[2], sh[3], sh[4]))
        elif sh[0] == "t":
            out.append(("t", W - sh[1], sh[2], sh[3], W - sh[4], sh[5], sh[6]))
        else:
            out.append(("p", [(W - x, y) for x, y in sh[1]]))
    return out


def _polyline(pts):
    """Pixels along a polyline (1px wide)."""
    out = []
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        n = int(max(abs(x2 - x1), abs(y2 - y1))) + 1
        for i in range(n + 1):
            p = (round(x1 + (x2 - x1) * i / n), round(y1 + (y2 - y1) * i / n))
            if p not in out:
                out.append(p)
    return out


def _pale(col):
    """Damage flash: push a colour toward a pale lilac, keeping its alpha."""
    r, g, b = (int(col[i:i + 2], 16) for i in (1, 3, 5))
    t = 0.9
    r, g, b = (round(v + (w - v) * t) for v, w in ((r, 0xF4), (g, 0xF0), (b, 0xFF)))
    return f"#{r:02X}{g:02X}{b:02X}" + col[7:]


def _paint(put, mask, base, rim, rim2, low):
    for (x, y) in mask:
        if (x, y - 1) not in mask or (x - 1, y) not in mask:
            col = rim
        elif (x, y - 2) not in mask or (x - 2, y) not in mask:
            col = rim2
        elif (x, y + 1) not in mask or (x + 1, y) not in mask:
            col = low
        else:
            col = base
        put(x, y, col)


def king_dread(pose="idle", flash=False):
    W, H = 96, 80
    c = Canvas(W, H)
    roar = pose == "roar"
    F = _pale if flash else (lambda col: col)

    def put(x, y, col):
        c.set(x, y, F(col))

    def body(shapes, cut=(), low=SHADOW_LOW):
        m = _shape(shapes, W, H)
        for sh in cut:
            m -= _shape([sh], W, H)
        _paint(put, m, SHADOW, RIM, RIM2, low)
        return m

    jd = 7 if roar else 0          # extra jaw drop
    ah = -12 if roar else 0          # hands higher

    # --- ragged royal mantle behind everything ---
    mantle = [(27, 35), (69, 35), (79, 46), (86, 60), (90, 73), (86, 70), (84, 77), (79, 71), (75, 78),
              (71, 72), (66, 76), (48, 74), (30, 76), (25, 72), (21, 78), (17, 71), (12, 77), (10, 70),
              (6, 73), (10, 60), (17, 46)]
    outer = _shape([("p", mantle)], W, H)
    mm = set(outer)
    for sh in [("e", 15, 64, 0.9, 2.6), ("e", 82, 58, 0.9, 2.8), ("e", 76, 66, 0.8, 2)]:
        mm -= _shape([sh], W, H)                               # moth-eaten holes
    for (x, y) in mm:
        if (x, y - 1) not in outer or (x - 1, y) not in outer or (x + 1, y) not in outer:
            col = MANTLE_RIM
        elif (x, y - 1) not in mm or (x, y + 1) not in mm:
            col = MANTLE_D
        elif x % 6 in (0, 1) and y > 40:
            col = MANTLE_D                                      # heavy folds
        else:
            col = MANTLE
        put(x, y, col)
    for x in range(26, 71):                                    # gold hem along the collar
        if (x, 36) in mm:
            put(x, 36, GOLD_D)

    # --- tail sweeping out to the right and curling up ---
    tail = body([("t", 62, 64, 6, 80, 72, 4), ("t", 80, 72, 4, 90, 67, 2.4), ("t", 90, 67, 2.4, 92, 58, 1.2),
                 ("t", 92, 58, 1.2, 89, 54, 0.6)])

    # --- legs: wide, heavy stance ---
    left_leg = [("e", 36, 61, 8.5, 9), ("t", 35, 65, 5.5, 33, 74, 3.8),
                ("p", [(25, 74), (40, 73), (42, 79), (23, 79)])]
    legs = body(left_leg + _mirror(left_leg, W))

    # --- arms raised, clawed hands open (behind the torso edge) ---
    aw = -3 if roar else 0          # arms spread wider
    ex, ey = 18 + aw, 46 + ah // 2
    hx, hy = 13 + aw, 29 + ah
    arm = [("t", 30, 42, 6.5, ex, ey, 4.8), ("t", ex, ey, 4.8, hx, hy + 3, 4), ("e", hx, hy, 5.2, 4.6)]
    fingers = [((hx - 4, hy - 2), (hx - 8, hy - 8)), ((hx, hy - 3), (hx - 1, hy - 10)), ((hx + 4, hy - 2), (hx + 6, hy - 9))]
    fing = [("t", a[0], a[1], 2.3, b[0], b[1], 1.4) for a, b in fingers]
    arms = body(arm + fing + _mirror(arm + fing, W))
    claws = []
    for a, b in fingers:
        vx, vy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(vx, vy)
        tip = (b[0] + vx / L * 4 + (1.5 if vx < 0 else -1.5), b[1] + vy / L * 4)
        claws.append(("t", b[0], b[1], 1.4, tip[0], tip[1], 0.4))
    cm = _shape(claws + _mirror(claws, W), W, H)
    for (x, y) in cm:
        put(x, y, BONE_L if (x - 1, y) not in cm or (x, y - 1) not in cm else BONE_D)

    # --- torso, shoulders and thick neck ---
    torso = body([("e", 48, 51, 16, 15), ("e", 48, 42, 20, 6.5), ("t", 48, 40, 10, 48, 28, 11)])

    # cracked ribcage glowing from inside (drawn before the head so the jaw overlaps it)
    ry0 = 5 if roar else 0
    core = _shape([("e", 48, 50.5 + ry0, 7.5, 6.5)], W, H)
    for (x, y) in core:
        r = math.hypot((x + 0.5 - 48) / 7.5, (y + 0.5 - 51 - ry0) / 6.5)
        put(x, y, EMBER_L if r < 0.3 else EMBER if r < 0.6 else EMBER_D if r < 0.9 else MAW)
    for crack in ([(54, 46 + ry0), (57, 43 + ry0), (59, 43 + ry0)], [(42, 56 + ry0), (40, 59 + ry0), (41, 61 + ry0)]):
        for i, (x, y) in enumerate(_polyline(crack)):
            put(x, y, EMBER if i < 2 else EMBER_D)
    for y in range(43 + ry0, 58 + ry0):
        put(47, y, BONE_L if y % 4 else BONE); put(48, y, BONE_D)   # sternum
    for k, ry in enumerate(v + ry0 for v in (44, 47, 50, 53)):
        for side in (-1, 1):
            pts = _polyline([(48 + side, ry), (48 + side * 4, ry + 1), (48 + side * (8 - k), ry + 3)])
            for i, (x, y) in enumerate(pts):
                if side > 0 and k == 1 and i in (3, 4):
                    continue                                   # one snapped rib
                put(x, y, (BONE_L if i < 5 else BONE) if side < 0 else (BONE if i < 4 else BONE_D))

    # --- head seen from the front, jaws gaping at the viewer ---
    head = [("p", [(32, 12), (40, 8), (56, 8), (64, 12), (67, 22), (63, 30), (33, 30), (29, 22)]),
            ("e", 48, 25, 14, 7), ("e", 33, 25, 5.5, 6),
            ("t", 32, 26, 3.2, 37, 41 + jd, 2.8),
            ("p", [(34, 38 + jd), (48, 37 + jd), (40, 47 + jd)]), ("e", 48, 44 + jd, 9.5, 4)]
    hm = body(head + _mirror(head[2:5], W), low="#4A1028")

    # maw: dark throat with an ember glow deep inside
    maw = _shape([("p", [(35, 29), (61, 29), (58, 41 + jd), (38, 41 + jd)])], W, H)
    my = [y for _, y in maw]
    mcy = (min(my) + max(my)) / 2
    for (x, y) in maw:
        r = math.hypot((x + 0.5 - 48) / 9, (y + 0.5 - mcy - 1) / (4 + jd / 2))
        put(x, y, EMBER_L if r < 0.35 else EMBER if r < 0.7 else EMBER_D if r < 1.05 else MAW)
    # teeth: upper row hanging, lower row rising, two big fangs each
    for i, x in enumerate(range(36, 61, 2)):
        ln = 4 if x in (38, 58) else (3 if i % 2 else 2)
        for k in range(ln):
            put(x, 29 + k, BONE_L if k < ln - 1 else BONE)
        if ln >= 3:
            put(x + 1, 29, BONE_D)
    for i, x in enumerate(range(39, 58, 2)):
        ln = 4 if x in (41, 55) else (2 if i % 2 else 3)
        for k in range(ln):
            put(x, 40 + jd - k, BONE_L if k < ln - 1 else BONE)

    # bone skull-mask over brow and snout: horned brow ridges, slanted angry sockets
    MB, MBL, MBD = "#8478A8", "#C9BFEA", "#4A4070"
    mask_bone = _shape([("p", [(40, 10), (56, 10), (60, 12), (66, 8), (64, 14), (58, 20), (54, 27.5), (42, 27.5),
                               (38, 20), (32, 14), (30, 8), (36, 12)])], W, H)
    sock = [("p", [(34.5, 13.5), (45, 16.8), (44, 20), (38, 19.5)])]
    sockets = _shape(sock + _mirror(sock, W), W, H)
    mask_bone -= sockets
    for (x, y) in mask_bone:
        if (x, y - 1) not in mask_bone or ((x - 1, y) not in mask_bone and x < 48):
            col = MBL
        elif (x, y + 1) not in mask_bone or ((x + 1, y) not in mask_bone and x >= 48):
            col = MBD
        else:
            col = MB
        put(x, y, col)
    for (x, y) in sockets:
        put(x, y, MAW)
    for (x, y) in _polyline([(51, 11), (50, 14), (52, 16), (51, 19)]) + [(44, 22), (45, 23), (46, 24)]:
        put(x, y, MBD)                                         # cracks in the mask
    for (x, y) in ((45, 25), (46, 25), (50, 25), (51, 25)):
        put(x, y, MAW)                                         # nostrils

    # obsidian crown fused into the skull, gold band with blood gems
    spikes = [(34, 11, 30, 3, 1.8), (39, 10, 37, 2, 2), (43, 9, 42, -1, 2.2), (48, 9, 48, -4, 2.6)]
    sp = _shape([("t", x1, y1, r, x2, y2, 0.45) for x1, y1, x2, y2, r in spikes] +
                _mirror([("t", x1, y1, r, x2, y2, 0.45) for x1, y1, x2, y2, r in spikes[:3]], W), W, H)
    for (x, y) in sp:
        put(x, y, "#9A78E8" if (x - 1, y) not in sp else ("#3B2A6E" if (x + 1, y) in sp else SHADOW))
    for x in range(36, 61):
        y = 9 + int(abs(x - 48) ** 1.6 / 22)
        put(x, y, GOLD_L if x < 48 else GOLD)
        put(x, y + 1, GOLD_D)
    for gx in (43, 48, 53):
        y = 9 + int(abs(gx - 48) ** 1.6 / 22)
        put(gx, y, EMBER); put(gx, y + 1, EMBER_D)

    # violet rune cracks across thighs, forearms and tail
    runes = [[(32, 57), (34, 60), (33, 63), (36, 66)], [(64, 57), (62, 60), (63, 63), (60, 66)],
             [(ex - 1, ey - 3), (hx + 2, hy + 9), (hx, hy + 6)], [(W - ex + 1, ey - 3), (W - hx - 2, hy + 9), (W - hx, hy + 6)],
             [(70, 68), (74, 70), (78, 69), (82, 72)], [(43, 60), (45, 62), (44, 64)]]
    for rl in runes:
        for i, (x, y) in enumerate(_polyline(rl)):
            put(x, y, PL if i % 3 == 1 else P)

    # broken golden shackles on the wrists, chain links dangling
    for side in (-1, 1):
        wx = 48 + side * (34 - aw)
        for dx in range(-3, 4):
            put(wx + dx, hy + 6, GOLD if dx < 1 else GOLD_D)
            put(wx + dx, hy + 7, GOLD_D)
        for k in range(6):
            put(wx + side * 4 + (k % 2) * side, hy + 8 + k, "#B9AED6" if k % 2 else "#6E6390")
    # foot claws and shoulder bone spurs
    for x in (25, 31, 37):
        for xx in (x, W - 1 - x):
            put(xx, 78, BONE); put(xx, 79, BONE_L); put(xx + 1, 79, BONE_D)
    spurs = [("t", 29, 39, 1.8, 25, 33, 0.4), ("t", 33, 37, 1.6, 31, 32, 0.4),
             ("t", 31, 22, 1.6, 26, 19, 0.4), ("t", 31, 27, 1.5, 26, 27, 0.4)]   # + cheek horns
    spur = _shape(spurs + _mirror(spurs, W), W, H)
    for (x, y) in spur:
        put(x, y, BONE if (x - 1, y) not in spur else BONE_D)

    # three burning eyes (two in the sockets, one on the brow) with a soft red glow
    eyes = [(39, 17, 0), (40, 17, 1), (41, 17, 0), (42, 18, 0), (47, 12, 0), (48, 12, 1), (47, 11, 0), (48, 13, 0)]
    eyes += [(W - 1 - x, y, hot) for x, y, hot in eyes[:4]]
    lit = {(x, y) for x, y, _ in eyes}
    for (x, y, _) in eyes:
        for gx, gy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            if (x + gx, y + gy) not in lit:
                c.set(x + gx, y + gy, EYE_GLOW)
    for (x, y, hot) in eyes:
        c.set(x, y, "#FFD0D0" if hot and not flash else EYE)
    return c


save("enemy_raptor", raptor(), 6)
save("enemy_raptor_hit", raptor(flash=True), 6)
save("enemy_ptero", pterodactyl(), 6)
save("enemy_spino", spinosaurus(), 6)
save("enemy_trike", triceratops(), 6)
save("enemy_king", king_dread(), 6)
save("enemy_king_hit", king_dread(flash=True), 6)
save("enemy_king_roar", king_dread("roar"), 6)


# ---------- dusk battlefield (more mature palette) ----------
def battle_dusk(sky=True):
    W, H = 320, 180
    c = Canvas(W, H)
    rnd = random.Random(21)
    HOR = 92
    bands = [(0, "#1E1438"), (22, "#33204F"), (40, "#5B2E66"), (56, "#8E3E6E"), (70, "#C5576E"), (82, "#EE8A6A")]
    for y in range(HOR if sky else 0):
        col = [b[1] for b in bands if y >= b[0]][-1]
        for x in range(W):
            c.set(x, y, col)
    for _ in range(40):  # first stars
        x, y = rnd.randint(0, W - 1), rnd.randint(0, 34)
        if sky:
            c.set(x, y, rnd.choice(["#FFFFFF", "#D9CCFF"]))
    for x in range(W):  # far mountains
        h = 22 + 12 * math.sin(x / 23.0) + 7 * math.sin(x / 9.0 + 1)
        for y in range(int(HOR - h), HOR):
            c.set(x, y, "#4A2A5E" if y > int(HOR - h) else "#6B3D72")
    for x in range(W):  # mid hills
        h = 11 + 6 * math.sin(x / 31.0 + 2) + 3 * math.sin(x / 7.0)
        for y in range(int(HOR + 4 - h), HOR + 6):
            c.set(x, y, "#2E2A4A")

    def pine(px, base, height):
        for i in range(height):
            hw = int(i * 0.45) + 1 if i > 1 else 0
            for x in range(px - hw, px + hw + 1):
                c.set(x, base - height + i, "#16302A" if x < px else "#0F211D")
    x = 2
    while x < W:
        if abs(x - W / 2) > 30:
            pine(x, HOR + 10, rnd.randint(18, 30))
        x += rnd.randint(7, 11)
    for y in range(HOR + 8, H):
        for x in range(W):
            c.set(x, y, "#24452F" if y > HOR + 10 else "#1B3626")
    vx = W / 2
    for y in range(HOR + 6, H):
        t = (y - (HOR + 6)) / (H - HOR - 6)
        hw = 4 + t * 120
        for x in range(int(vx - hw), int(vx + hw) + 1):
            c.set(x, y, "#4A3528" if abs(x - vx) > hw - 1.5 else "#6A4C3A")
    for _ in range(60):
        tx, ty = rnd.randint(0, W - 1), rnd.randint(HOR + 14, H - 2)
        t = (ty - (HOR + 6)) / (H - HOR - 6)
        if abs(tx - vx) < 4 + t * 120 + 2:
            continue
        for dx, dy in ((0, 0), (1, -1), (2, 0)):
            c.set(tx + dx, ty + dy, "#183322")
    for y in range(HOR + 2, HOR + 12):  # low fog over the horizon
        for x in range(W):
            if (x // 6 + y) % 3 == 0:
                c.set(x, y, "#C9A0C833")
    return c


save("battle_bg", battle_dusk(), 5)
save("battle_fg", battle_dusk(sky=False), 5)


# ---------- night menu background: distant castle on a hill ----------
def menu_night(sky=True):
    W, H = 320, 180
    c = Canvas(W, H)
    rnd = random.Random(31)
    bands = [(0, "#0E0A1E"), (40, "#160F2E"), (80, "#21153F"), (110, "#2D1B4F")]
    for y in range(H if sky else 0):
        col = [b[1] for b in bands if y >= b[0]][-1]
        for x in range(W):
            c.set(x, y, col)
    for _ in range(110):
        x, y = rnd.randint(0, W - 1), rnd.randint(0, 120)
        if sky:
            c.set(x, y, rnd.choice(["#FFFFFF", "#D9CCFF", "#8E7BC9", "#8E7BC9"]))
    for x in range(W if sky else 0):  # moon
        for y in range(H):
            d = (x - 34) ** 2 + (y - 46) ** 2
            if d <= 12 ** 2:
                c.set(x, y, "#E9E2FF" if (x - 31) ** 2 + (y - 43) ** 2 > 9 ** 2 or d > 10 ** 2 else "#CFC4F2")
    for x in range(W):  # far mountains
        h = 34 + 14 * math.sin(x / 29.0) + 6 * math.sin(x / 11.0 + 1)
        for y in range(int(150 - h), H):
            c.set(x, y, "#2A1C48")
    # hill with the castle silhouette
    for x in range(W):
        top = int(118 + ((x - 230) / 70.0) ** 2 * 18) if 160 < x < 300 else 150
        for y in range(top, H):
            c.set(x, y, "#140E26")
    def rect(x0, x1, y0, y1, col="#140E26"):
        for x in range(x0, x1):
            for y in range(y0, y1):
                c.set(x, y, col)
    rect(208, 252, 100, 120)
    for x in range(208, 252, 4):
        rect(x, x + 2, 97, 100)
    rect(202, 212, 84, 120); rect(248, 258, 84, 120)
    for tx in (202, 248):
        for i in range(10):
            rect(tx + 5 - i // 2, tx + 5 + i // 2 + 1, 74 + i, 75 + i)
    rect(226, 234, 88, 100)
    for i in range(8):
        rect(230 - i // 2, 230 + i // 2 + 1, 80 + i, 81 + i)
    rect(229, 231, 104, 108, "#FFB627")   # one lit window
    rect(206, 208, 92, 95, "#FFB62799")
    # foreground grass ridge
    for x in range(W):
        top = int(156 + 3 * math.sin(x / 13.0))
        for y in range(top, H):
            c.set(x, y, "#0B1A16" if y > top else "#16302A")
    return c


save("menu_bg", menu_night(), 5)
save("menu_fg", menu_night(sky=False), 5)


# ---------- open hand (shield gone), same diagonal arm as the shield sprite ----------
def open_hand_back():
    W, H = 76, 84
    c = Canvas(W, H)
    A, B = (4.0, 90.0), (46.0, 32.0)
    dx, dy = B[0] - A[0], B[1] - A[1]
    L = math.hypot(dx, dy)
    ux, uy = dx / L, dy / L
    nx, ny = -uy, ux
    arm = set()
    for x in range(W):
        for y in range(H):
            px, py = x + 0.5 - A[0], y + 0.5 - A[1]
            t = (px * ux + py * uy) / L
            d = px * nx + py * ny
            if 0 <= t <= 0.98 and abs(d) <= 8.5:
                arm.add((x, y))
    shade = lambda x, y: PL if ((x + 0.5 - A[0]) * nx + (y + 0.5 - A[1]) * ny) < -5 else (PD if ((x + 0.5 - A[0]) * nx + (y + 0.5 - A[1]) * ny) > 5.5 else P)
    c.layer(arm, shade)
    # back of the hand
    hand = set()
    for x in range(W):
        for y in range(H):
            px, py = x + 0.5 - B[0], y + 0.5 - B[1]
            a, b = px * ux + py * uy, px * nx + py * ny
            if (a / 7) ** 2 + (b / 11) ** 2 <= 1:
                hand.add((x, y))
    c.layer(hand, lambda x, y: P)
    # four spread fingers with claws, reaching away from the viewer
    for ang in (-0.55, -0.18, 0.18, 0.55):
        fx = ux * math.cos(ang) - uy * math.sin(ang)
        fy = ux * math.sin(ang) + uy * math.cos(ang)
        base = (B[0] + nx * ang * 14 + ux * 4, B[1] + ny * ang * 14 + uy * 4)
        tip = (base[0] + fx * 12, base[1] + fy * 12)
        m = set()
        for x in range(W):
            for y in range(H):
                px, py = x + 0.5 - base[0], y + 0.5 - base[1]
                ddx, ddy = tip[0] - base[0], tip[1] - base[1]
                t = max(0, min(1, (px * ddx + py * ddy) / (ddx * ddx + ddy * ddy)))
                if math.hypot(px - ddx * t, py - ddy * t) <= 3.2 - 1.2 * t:
                    m.add((x, y))
        c.layer(m, lambda x, y: P)
        for k in (0, 1, 2):
            cx_, cy_ = tip[0] + fx * k, tip[1] + fy * k
            c.set(int(cx_), int(cy_), CREAM if k < 2 else INK)
    # thumb on the inner side
    th = set()
    tb = (B[0] - nx * 10, B[1] - ny * 10)
    tt = (tb[0] - nx * 6 + ux * 4, tb[1] - ny * 6 + uy * 4)
    for x in range(W):
        for y in range(H):
            px, py = x + 0.5 - tb[0], y + 0.5 - tb[1]
            ddx, ddy = tt[0] - tb[0], tt[1] - tb[1]
            t = max(0, min(1, (px * ddx + py * ddy) / (ddx * ddx + ddy * ddy)))
            if math.hypot(px - ddx * t, py - ddy * t) <= 3 - t:
                th.add((x, y))
    c.layer(th, lambda x, y: PL)
    for (a, b) in ((2, -6), (2, -2), (2, 2), (2, 6)):     # knuckles
        c.set(int(B[0] + ux * a + nx * b), int(B[1] + uy * a + ny * b), PL)
    return c


save("empty_hand", open_hand_back(), 6)


# ---------- sprite sheet page for the mockups ----------
def write_sprite_sheet():
    import re
    files = sorted(f for f in os.listdir(OUT) if f.endswith(".svg"))
    cells = []
    for f in files:
        head = open(os.path.join(OUT, f)).read(400)
        w, h = (int(v) for v in re.search(r'width="(\d+)" height="(\d+)"', head).groups())
        k = min(1, 360 / max(w, h))
        cells.append(f'<figure><div class="img"><img src="../sprites/{f}" width="{int(w * k)}" height="{int(h * k)}" alt="{f[:-4]}"></div>'
                     f'<figcaption>{f[:-4]}</figcaption></figure>')
    page = f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Purple Dino · Sprites</title><link rel="stylesheet" href="mockups.css">
<style>main{{display:flex;flex-wrap:wrap;gap:28px;align-items:flex-end}}figure{{display:flex;flex-direction:column;gap:10px;align-items:center;padding:16px;background:#1A1433;border:3px solid #3B2F63}}
.img{{display:flex;align-items:flex-end;justify-content:center}}img{{image-rendering:pixelated;display:block}}figcaption{{font-family:var(--display);font-size:10px;color:var(--muted)}}</style></head>
<body><header class="page-head"><h1>PURPLE DINO · SPRITES ({len(files)})</h1>
<nav><a href="index.html">ÍNDICE</a><a href="proyector.html">PROYECTOR</a><a href="celular.html">CELULAR</a><a class="on" href="sprites.html">SPRITES</a><a href="assets.html">ASSETS</a><a href="musica.html">MÚSICA</a></nav></header>
<p class="page-sub">Generados por <code>design/sprites.py</code> (SVG pixel art, se escalan sin perder nitidez).</p>
<main>{''.join(cells)}</main></body></html>
"""
    open(os.path.join(os.path.dirname(OUT), "mockups", "sprites.html"), "w").write(page)


write_sprite_sheet()
