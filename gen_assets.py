#!/usr/bin/env python3
"""Generate SVG placeholder images + a tiny animated SVG hero stand-in.
These are placeholders only — the user will swap in real media."""
import os

os.makedirs("assets", exist_ok=True)

def svg(w, h, bg, label, sub="", fg="#ffffff"):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{bg[0]}"/>
      <stop offset="1" stop-color="{bg[1]}"/>
    </linearGradient>
  </defs>
  <rect width="{w}" height="{h}" fill="url(#g)"/>
  <text x="50%" y="48%" fill="{fg}" font-family="Oswald, Arial, sans-serif"
        font-size="{int(w*0.09)}" font-weight="700" letter-spacing="2"
        text-anchor="middle" opacity="0.9">{label}</text>
  <text x="50%" y="58%" fill="{fg}" font-family="Inter, Arial, sans-serif"
        font-size="{int(w*0.035)}" text-anchor="middle" opacity="0.55">{sub}</text>
</svg>'''

def write(name, content):
    with open(os.path.join("assets", name), "w") as f:
        f.write(content)

# Product images (3:4)
products = [
    ("p1.svg", ("#2b2b2b", "#111"), "PANTS 01"),
    ("p2.svg", ("#cfcfcf", "#9a9a9a"), "PANTS 02"),
    ("p3.svg", ("#2a3550", "#161d2e"), "PANTS 03"),
    ("p4.svg", ("#e8e2d0", "#c9c2ab"), "PANTS 04"),
    ("p5.svg", ("#6b4a30", "#3d2a1b"), "PANTS 05"),
    ("p6.svg", ("#f2f2f2", "#d6d6d6"), "PANTS 06"),
]
for name, bg, label in products:
    fg = "#111" if label in ("PANTS 02", "PANTS 04", "PANTS 06") else "#fff"
    write(name, svg(600, 800, bg, label, "placeholder — swap media", fg))

# Gallery extra shots
for i, bg in enumerate([("#222","#000"), ("#333","#111"), ("#444","#222")], start=1):
    write(f"g{i}.svg", svg(600, 800, bg, f"VIEW {i}", "placeholder", "#fff"))

# Category tiles
cats = [
    ("cat-pants.svg", "PANTS"),
    ("cat-tanks.svg", "TANK TOPS"),
    ("cat-tshirts.svg", "T-SHIRTS"),
    ("cat-hoodies.svg", "HOODIES"),
    ("cat-jackets.svg", "JACKETS"),
]
for name, label in cats:
    write(name, svg(600, 800, ("#1a1a1a", "#000"), label, "", "#fff"))

# Hero poster
write("hero-poster.svg", svg(1600, 900, ("#1a1a1a", "#000"), "FW26 COLLECTION", "video placeholder", "#fff"))

# Animated SVG hero (used as a lightweight stand-in for the video)
hero = '''<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <rect width="1600" height="900" fill="#000"/>
  <g opacity="0.4">
    <circle cx="400" cy="450" r="300" fill="#333">
      <animate attributeName="cx" values="400;1200;400" dur="12s" repeatCount="indefinite"/>
    </circle>
    <circle cx="1100" cy="400" r="260" fill="#1f1f1f">
      <animate attributeName="cy" values="400;500;400" dur="9s" repeatCount="indefinite"/>
    </circle>
  </g>
  <text x="50%" y="48%" fill="#fff" font-family="Oswald, Arial, sans-serif" font-size="90"
        font-weight="700" letter-spacing="6" text-anchor="middle">FW26 COLLECTION</text>
  <text x="50%" y="56%" fill="#aaa" font-family="Inter, Arial, sans-serif" font-size="24"
        text-anchor="middle">replace with your own video / media</text>
</svg>'''
write("hero.svg", hero)

print("Generated", len(os.listdir("assets")), "placeholder assets in ./assets")
