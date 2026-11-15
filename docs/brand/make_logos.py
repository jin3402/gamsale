"""겜세일 · 중간지점찾기 앱 로고 (600x600 PNG, 불투명 배경, 직각 모서리)."""
import math
import sys
from PIL import Image, ImageDraw

S = 2400  # 4배로 그린 뒤 줄여서 가장자리를 부드럽게
OUT = 600


def gradient(top, bottom):
    img = Image.new("RGB", (S, S), top)
    d = ImageDraw.Draw(img)
    for y in range(S):
        t = y / (S - 1)
        c = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        d.line([(0, y), (S, y)], fill=c)
    return img


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def p(v):
    return round(v * S)


def gamsale(path):
    top, bottom = hex2rgb("#7B5CFF"), hex2rgb("#4A27E0")
    img = gradient(top, bottom)
    d = ImageDraw.Draw(img)
    white = (255, 255, 255)
    accent = hex2rgb("#4F2EE6")

    # 컨트롤러 몸체 + 손잡이
    d.rounded_rectangle([p(0.17), p(0.38), p(0.83), p(0.66)], radius=p(0.14), fill=white)
    d.ellipse([p(0.15), p(0.47), p(0.39), p(0.78)], fill=white)
    d.ellipse([p(0.61), p(0.47), p(0.85), p(0.78)], fill=white)

    # 십자 버튼
    cx, cy, a, b = 0.32, 0.52, 0.075, 0.026
    d.rounded_rectangle([p(cx - a), p(cy - b), p(cx + a), p(cy + b)], radius=p(0.01), fill=accent)
    d.rounded_rectangle([p(cx - b), p(cy - a), p(cx + b), p(cy + a)], radius=p(0.01), fill=accent)

    # 오른쪽 버튼 두 개
    for bx, by in ((0.64, 0.555), (0.72, 0.485)):
        r = 0.036
        d.ellipse([p(bx - r), p(by - r), p(bx + r), p(by + r)], fill=accent)

    # 할인 가격표 (노란색, 기울임)
    tag = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    td = ImageDraw.Draw(tag)
    yellow = hex2rgb("#FFC93C")
    tx0, ty0, tx1, ty1 = 0.50, 0.10, 0.86, 0.34
    tip = 0.08
    td.rounded_rectangle([p(tx0 + tip), p(ty0), p(tx1), p(ty1)], radius=p(0.035), fill=yellow)
    mid = (ty0 + ty1) / 2
    td.polygon([(p(tx0), p(mid)), (p(tx0 + tip + 0.02), p(ty0)), (p(tx0 + tip + 0.02), p(ty1))], fill=yellow)
    hr = 0.022
    td.ellipse([p(tx0 + 0.055 - hr), p(mid - hr), p(tx0 + 0.055 + hr), p(mid + hr)], fill=(0, 0, 0, 0))
    # % 기호
    ink = hex2rgb("#3A1FB8")
    pcx = tx0 + tip + (tx1 - tx0 - tip) / 2 + 0.01
    pr = 0.028
    td.ellipse([p(pcx - 0.075 - pr), p(mid - 0.05 - pr), p(pcx - 0.075 + pr), p(mid - 0.05 + pr)], outline=ink, width=p(0.016))
    td.ellipse([p(pcx + 0.065 - pr), p(mid + 0.05 - pr), p(pcx + 0.065 + pr), p(mid + 0.05 + pr)], outline=ink, width=p(0.016))
    td.line([(p(pcx + 0.07), p(mid - 0.085)), (p(pcx - 0.08), p(mid + 0.085))], fill=ink, width=p(0.02))
    tag = tag.rotate(-14, resample=Image.BICUBIC, center=(p(0.68), p(0.22)))
    img.paste(tag, (0, 0), tag)

    img.resize((OUT, OUT), Image.LANCZOS).save(path, "PNG")


def midpoint(path):
    top, bottom = hex2rgb("#22C58B"), hex2rgb("#0B9466")
    img = gradient(top, bottom)
    d = ImageDraw.Draw(img)
    white = (255, 255, 255)
    soft = (255, 255, 255)
    deep = hex2rgb("#0A8A5F")

    center = (0.5, 0.50)
    starts = [(0.18, 0.74), (0.82, 0.70), (0.76, 0.22)]

    # 출발지 → 중간지점 점선
    for sx, sy in starts:
        n = 7
        for i in range(n):
            t0, t1 = i / n, (i + 0.55) / n
            x0, y0 = sx + (center[0] - sx) * t0, sy + (center[1] - sy) * t0
            x1, y1 = sx + (center[0] - sx) * t1, sy + (center[1] - sy) * t1
            d.line([(p(x0), p(y0)), (p(x1), p(y1))], fill=(214, 255, 238), width=p(0.018))

    # 출발지 점
    for sx, sy in starts:
        r = 0.055
        d.ellipse([p(sx - r), p(sy - r), p(sx + r), p(sy + r)], fill=soft)
        r2 = 0.026
        d.ellipse([p(sx - r2), p(sy - r2), p(sx + r2), p(sy + r2)], fill=deep)

    # 가운데 위치 핀 (끝이 중간지점을 가리킴)
    pin_r = 0.14
    pcx, pcy = center[0], center[1] - 0.17
    d.ellipse([p(pcx - pin_r), p(pcy - pin_r), p(pcx + pin_r), p(pcy + pin_r)], fill=white)
    ang = math.radians(42)
    lx, ly = pcx - pin_r * math.sin(ang), pcy + pin_r * math.cos(ang)
    rx, ry = pcx + pin_r * math.sin(ang), pcy + pin_r * math.cos(ang)
    d.polygon([(p(lx), p(ly)), (p(rx), p(ry)), (p(center[0]), p(center[1] + 0.02))], fill=white)
    ir = 0.058
    d.ellipse([p(pcx - ir), p(pcy - ir), p(pcx + ir), p(pcy + ir)], fill=deep)

    img.resize((OUT, OUT), Image.LANCZOS).save(path, "PNG")


if __name__ == "__main__":
    out_dir = sys.argv[1]
    gamsale(f"{out_dir}/gamsale-logo.png")
    midpoint(f"{out_dir}/midpoint-logo.png")
    print("ok")
