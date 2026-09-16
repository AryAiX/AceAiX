#!/usr/bin/env python3
"""
Every AceAiX icon, from the one logo file.

    python3 tools/brand/build-brand-assets.py

The source of truth is `tools/brand/aceaix-logo.png` — the full lockup on
transparency, as supplied by the brand. Everything the app, the stores, the web
console and the browser tab need is cut from it here, so there is exactly one
place a new logo has to land and one command to run afterwards.

Why a script rather than eight exported files:

* Two of them (the iOS icon, the App Store icon) **must not have an alpha
  channel** — Apple rejects the build, at upload, with a message that does not
  say which file. A flatten step in code cannot be forgotten.
* Android's adaptive icon is masked to a circle by most launchers, so the mark
  has to sit inside the inner 66% of the canvas or it gets its corners cut off.
  That is a number, and numbers belong in code.
* The notification icon is not an image on Android at all — the system throws
  away every colour and keeps the alpha channel as a stencil. A full-colour
  lockup becomes a white blob. It is generated here as a silhouette on purpose.
* The wordmark in the lockup is white, and the light-mode splash background is
  near-white, so the light splash needs the same lockup with the type
  recoloured. Doing that by hand once means doing it by hand every time.

Requires Pillow: `pip install pillow`.
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:  # pragma: no cover - operator feedback only
    sys.exit("Pillow is required:  pip install pillow")

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).resolve().parent / "aceaix-logo.png"

MOBILE = ROOT / "mobile" / "assets" / "images"
STORE = ROOT / "store-assets"
WEB = ROOT / "web" / "public"

# ── Brand ─────────────────────────────────────────────────────────────────────
# The ground is `backgroundColor` in app.json and `bg` in the dark palette of
# mobile/theme/tokens.ts. The icon and the app must be the same object.
GROUND = (11, 10, 22)  # #0B0A16 — `bg` in the dark palette, to the byte
GROUND_LIFT = (30, 27, 58)  # a top-left lift, so 1024px does not read as flat
INK = (14, 13, 28)  # the wordmark, recoloured for the light splash

# The three horizontal bands in the lockup, measured from the alpha channel.
# Recomputed on every run rather than hardcoded, so a re-crop of the source
# does not silently shift every icon.


def bands(alpha: np.ndarray) -> list[tuple[int, int]]:
    """Rows that carry ink, grouped into runs, ignoring speckle."""
    rows = (alpha > 10).sum(axis=1)
    out: list[tuple[int, int]] = []
    start = None
    for y, v in enumerate(rows):
        if v > 3 and start is None:
            start = y
        elif v <= 3 and start is not None:
            out.append((start, y - 1))
            start = None
    if start is not None:
        out.append((start, len(rows) - 1))
    # Merge runs separated by less than 12px — antialiasing breaks a glyph row
    # into slivers and we want the word, not its dot.
    merged = [out[0]]
    for a, b in out[1:]:
        if a - merged[-1][1] < 12:
            merged[-1] = (merged[-1][0], b)
        else:
            merged.append((a, b))
    return [(a, b) for a, b in merged if b - a > 20]


def trim(im: Image.Image) -> Image.Image:
    a = np.array(im)[:, :, 3]
    ys, xs = np.where(a > 10)
    return im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def fit(im: Image.Image, w: int, h: int) -> Image.Image:
    """Scale to fit inside w×h without distorting. Never upscales past 2×."""
    s = min(w / im.width, h / im.height)
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)


def ground(size: int) -> Image.Image:
    """The icon background: a diagonal lift over the app's own ground colour.

    Flat #0B0A16 at 1024px looks like a rendering failure. This is a 6% lift
    across the diagonal — invisible as a gradient at 60px, alive at 1024.
    """
    y, x = np.mgrid[0:size, 0:size]
    t = ((x + y) / (2 * (size - 1))) ** 1.4
    t = 1.0 - t  # brightest at the top-left corner
    px = np.zeros((size, size, 3), dtype=np.float64)
    for c in range(3):
        px[:, :, c] = GROUND[c] + (GROUND_LIFT[c] - GROUND[c]) * t
    return Image.fromarray(px.round().astype(np.uint8), "RGB").convert("RGBA")


def glow(base: Image.Image, mark: Image.Image, box: tuple[int, int]) -> None:
    """A bloom under the mark, in the mark's own colours.

    The logo is a bright object; on a near-black square it looks pasted on
    without one. Blurring the mark itself keeps the bloom the right hue in
    every direction rather than inventing a colour to glow with.
    """
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    layer.paste(mark, box, mark)
    layer = layer.filter(ImageFilter.GaussianBlur(base.width * 0.055))
    layer.putalpha(layer.getchannel("A").point(lambda v: int(v * 0.45)))
    base.alpha_composite(layer)


def rounded(im: Image.Image, radius_ratio: float) -> Image.Image:
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, im.width - 1, im.height - 1), radius=int(im.width * radius_ratio), fill=255
    )
    out = im.copy()
    out.putalpha(mask)
    return out


def icon(size: int, *, mark: Image.Image, scale: float = 0.62) -> Image.Image:
    """The app icon: the mark, centred on the brand ground, with a bloom."""
    base = ground(size)
    m = fit(mark, round(size * scale), round(size * scale))
    # Optically centred, not arithmetically: the mark is a triangle, so its
    # visual mass sits low. Lifting it 2% stops it looking like it is sinking.
    box = ((size - m.width) // 2, round((size - m.height) / 2 - size * 0.02))
    glow(base, m, box)
    base.alpha_composite(Image.new("RGBA", base.size, (0, 0, 0, 0)))
    base.paste(m, box, m)
    return base


def save(im: Image.Image, path: Path, *, alpha: bool = True) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if alpha:
        im.convert("RGBA").save(path, "PNG")
    else:
        # Apple rejects an icon with an alpha channel. Composite onto the
        # ground rather than dropping the channel, or the edges fringe black.
        flat = Image.new("RGB", im.size, GROUND)
        flat.paste(im.convert("RGBA"), (0, 0), im.convert("RGBA"))
        flat.save(path, "PNG")
    kb = path.stat().st_size / 1024
    rel = path.relative_to(ROOT)
    print(f"  {str(rel):<52} {im.width}×{im.height}  {'RGBA' if alpha else 'RGB '}  {kb:6.1f} KB")


def main() -> int:
    if not SOURCE.exists():
        sys.exit(f"missing {SOURCE.relative_to(ROOT)} — put the brand lockup there")

    src = Image.open(SOURCE).convert("RGBA")
    runs = bands(np.array(src)[:, :, 3])
    if len(runs) < 2:
        sys.exit(f"expected a mark and a wordmark in the lockup, found {len(runs)} bands")

    mark = trim(src.crop((0, runs[0][0], src.width, runs[0][1] + 1)))
    # Mark + wordmark, without the tagline: at 220pt on a splash the tagline is
    # four pixels tall and reads as dirt (240pt now, same conclusion).
    lockup = trim(src.crop((0, runs[0][0], src.width, runs[1][1] + 1)))

    print(f"source {SOURCE.name}  {src.width}×{src.height}")
    print(f"  mark   {mark.width}×{mark.height}")
    print(f"  lockup {lockup.width}×{lockup.height}  (tagline dropped)")
    print()

    # ── The app icon ─────────────────────────────────────────────────────────
    print("app icon")
    master = icon(1024, mark=mark)
    save(master, MOBILE / "icon.png", alpha=False)
    save(master, STORE / "app-store" / "icon-1024.png", alpha=False)
    save(master.resize((512, 512), Image.LANCZOS), STORE / "play" / "icon-512.png")
    save(master.resize((196, 196), Image.LANCZOS), MOBILE / "favicon.png", alpha=False)
    save(master, WEB / "aceaix-icon.png", alpha=False)
    save(rounded(master.resize((180, 180), Image.LANCZOS), 0.22), WEB / "aceaix-favicon.png")

    # ── Android's adaptive icon ──────────────────────────────────────────────
    # The canvas is 108dp and the launcher masks it to 72dp — anything outside
    # the inner 66% can be cut. The mark gets 44% so it clears the mask on a
    # circle, a squircle and a teardrop alike.
    print("\nandroid adaptive")
    fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    m = fit(mark, 450, 450)
    fg.paste(m, ((1024 - m.width) // 2, round((1024 - m.height) / 2 - 20)), m)
    save(fg, MOBILE / "adaptive-icon.png")

    # ── The splash ───────────────────────────────────────────────────────────
    # Two images because the wordmark is white: on #F6F6F3 the app would appear
    # to launch to a bare orange triangle.
    print("\nsplash")
    save(lockup, MOBILE / "splash-icon-dark.png")

    light = lockup.copy()
    px = np.array(light)
    # Recolour only the near-white type. The mark's own colours and the orange
    # X are saturated, so a saturation test leaves them alone.
    rgb = px[:, :, :3].astype(np.int16)
    lo, hi = rgb.min(axis=2), rgb.max(axis=2)
    is_type = (hi > 150) & ((hi - lo) < 40)
    px[:, :, :3][is_type] = INK
    save(Image.fromarray(px, "RGBA"), MOBILE / "splash-icon.png")

    # ── In-app ───────────────────────────────────────────────────────────────
    print("\nin-app")
    save(fit(mark, 512, 512), MOBILE / "logo-mark.png")
    # No separate lockup file for the app: `assetBundlePatterns` is `**/*`, so
    # anything left in this folder ships whether it is imported or not, and the
    # two splash images already are the lockup, themed.
    # The console draws its own header logo, so it needs the mark on its own.
    save(fit(mark, 256, 256), WEB / "aceaix-mark.png")

    # ── The notification icon ────────────────────────────────────────────────
    # Android keeps the alpha and throws away every colour, then tints what is
    # left. A colour lockup here becomes a white square. This is the mark's own
    # silhouette, padded to the 24dp keyline.
    print("\nnotification")
    sil = fit(mark, 72, 72)
    a = sil.getchannel("A").point(lambda v: 255 if v > 60 else 0)
    white = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    stencil = Image.new("RGBA", sil.size, (255, 255, 255, 255))
    stencil.putalpha(a)
    white.paste(stencil, ((96 - sil.width) // 2, (96 - sil.height) // 2), stencil)
    save(white, MOBILE / "notification-icon.png")

    print("\ndone.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
