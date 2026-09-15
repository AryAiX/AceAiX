#!/usr/bin/env python3
"""
Generate `site/early-access-standalone/` from `site/early-access/index.html`.

The early-access page normally lives inside the marketing site, at
`/early-access`, next to a home page it links back to. It is also deployed on
its own — as the whole of a small site, where the page is the root and nothing
else exists. Those two deployments need different HTML, and keeping the second
one by hand guarantees it falls behind the first.

So it is generated. Edit `site/early-access/index.html`, run this, commit both.

Every substitution below is asserted to match exactly once. A silent no-op is
the failure mode that matters here: the script would report success, the folder
would keep its old content, and the deployed page would quietly be a version
behind while looking entirely normal.

    python3 tools/site/build-early-access-standalone.py
    python3 tools/site/build-early-access-standalone.py --check   # CI: no write
"""

from __future__ import annotations

import argparse
import filecmp
import re
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SRC_PAGE = REPO / "site" / "early-access" / "index.html"
SRC_ASSETS = REPO / "site" / "assets"
OUT = REPO / "site" / "early-access-standalone"

# The address this deployment is expected to answer on. It is a guess until the
# DNS is pointed, and the README says so — but a canonical has to say something,
# and pointing it back at the marketing site (where this page also lives) would
# tell Google to ignore this deployment entirely.
BASE = "https://early.aceaix.com"

# Only what the page actually references, plus the two PWA icons the manifest
# names. Copying the whole assets folder would ship the marketing site's
# screenshots — about 200 KB of images nothing on this page loads.
ASSETS = [
    "aceaix-mark.webp",
    "apple-touch-icon.png",
    "favicon-32.png",
    "og-image.png",
    "icon-192.png",
    "icon-512.png",
]


def once(html: str, old: str, new: str, what: str) -> str:
    """Substitute, insisting the target appears exactly once."""
    n = html.count(old)
    if n != 1:
        raise SystemExit(
            f"build-early-access-standalone: expected one occurrence of {what},"
            f" found {n}.\nThe source page changed shape; fix this script rather"
            f" than the generated folder."
        )
    return html.replace(old, new)


def transform(html: str) -> str:
    # ── Paths: this page is the root now, not a child ────────────────────
    html = once(
        html,
        '<link rel="icon" href="../assets/favicon-32.png" sizes="32x32" type="image/png">',
        '<link rel="icon" href="assets/favicon-32.png" sizes="32x32" type="image/png">',
        "the favicon link",
    )
    html = once(
        html,
        '<link rel="apple-touch-icon" href="../assets/apple-touch-icon.png">',
        '<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">\n'
        '<link rel="manifest" href="site.webmanifest">',
        "the touch-icon link",
    )
    html = once(
        html,
        '<img src="../assets/aceaix-mark.webp" width="320" height="210" alt="">',
        '<img src="assets/aceaix-mark.webp" width="320" height="210" alt="">',
        "the logo image",
    )

    # ── Links to a page that is not in this deployment ───────────────────
    html = once(
        html,
        '    <a class="mark" href="../index.html" aria-label="AceAiX home">',
        "    <!-- Not a link. On the full site this goes to the home page; here\n"
        "         there is no home page to go to, and a logo that navigates\n"
        "         nowhere is worse than one that plainly does not navigate. -->\n"
        '    <span class="mark">',
        "the logo anchor",
    )
    # Its closing tag, found by position rather than by text — there are many
    # </a> in the file and only this one belongs to the anchor just replaced.
    i = html.index('<span class="mark">')
    j = html.index("</a>", i)
    html = html[:j] + "</span>" + html[j + len("</a>") :]

    html = once(
        html,
        '    <a href="../index.html">About AceAiX</a>',
        '    <!-- "About AceAiX" pointed at the marketing site, which is not\n'
        "         deployed here. Removed rather than left pointing at a 404. -->",
        "the footer link home",
    )

    # ── The address a crawler and a social card read ─────────────────────
    html = once(
        html,
        '<link rel="canonical" href="https://aceaix.com/early-access">',
        "<!-- ═══ THE OTHER THING TO SET — your address, once you have one ═══\n"
        "     These three lines tell Google which URL is the real one, and tell\n"
        "     WhatsApp, LinkedIn and X what to show when somebody shares the\n"
        "     link. Until the domain is pointed here they are a guess, and a\n"
        "     wrong canonical is worse than none: it tells Google the real page\n"
        "     is somewhere that does not exist. So they carry the intended\n"
        "     address — change all three the day the domain resolves, or delete\n"
        "     the canonical line if you stay on the netlify.app address.\n"
        "     Nothing else on the page depends on them. -->\n"
        f'<link rel="canonical" href="{BASE}/">',
        "the canonical link",
    )
    html = once(
        html,
        '<meta property="og:url" content="https://aceaix.com/early-access">',
        f'<meta property="og:url" content="{BASE}/">',
        "og:url",
    )
    html = once(
        html,
        '<meta property="og:image" content="https://aceaix.com/assets/og-image.png">',
        f'<meta property="og:image" content="{BASE}/assets/og-image.png">',
        "og:image",
    )

    left = re.findall(r'(?:href|src)="\.\./[^"]*"', html)
    if left:
        raise SystemExit(
            "build-early-access-standalone: paths still point outside this "
            f"folder and would 404 once deployed: {left}"
        )
    return html


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--check",
        action="store_true",
        help="fail if the folder is out of date, without writing to it",
    )
    args = ap.parse_args()

    html = transform(SRC_PAGE.read_text(encoding="utf-8"))

    if args.check:
        current = OUT / "index.html"
        if not current.exists() or current.read_text(encoding="utf-8") != html:
            print(
                "site/early-access-standalone/index.html is out of date.\n"
                "Run: python3 tools/site/build-early-access-standalone.py",
                file=sys.stderr,
            )
            return 1
        for name in ASSETS:
            a, b = SRC_ASSETS / name, OUT / "assets" / name
            if not b.exists() or not filecmp.cmp(a, b, shallow=False):
                print(f"assets/{name} is out of date.", file=sys.stderr)
                return 1
        print("site/early-access-standalone is up to date.")
        return 0

    (OUT / "assets").mkdir(parents=True, exist_ok=True)
    (OUT / "index.html").write_text(html, encoding="utf-8")
    for name in ASSETS:
        shutil.copy2(SRC_ASSETS / name, OUT / "assets" / name)

    kb = len(html.encode()) / 1024
    print(f"wrote {OUT.relative_to(REPO)}/index.html ({kb:.0f} KB)")
    print(f"copied {len(ASSETS)} assets")
    print("\nThe hand-written files here — README.md, BUILD.md, _headers,")
    print("robots.txt, sitemap.xml, site.webmanifest — are not generated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
