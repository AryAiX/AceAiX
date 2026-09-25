#!/usr/bin/env python3
"""
Demo media for the local harness and the preview build.

Three short vertical clips (football, athletics, basketball) and three
stills, drawn from scratch so nothing in the repo is somebody else's footage.
Output lands beside this file as <bucket>/<owner id>/<name>, which is exactly
the storage path the seeded rows point at. Re-run after changing a scene:

    python3 tools/local-supabase/demo-media/generate.py
"""
import math, os, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
W, H, FPS, SECONDS = 360, 640, 20, 4
LAYLA = 'a0000000-0000-4000-8000-000000000001'
SARA = 'a0000000-0000-4000-8000-000000000004'
DANIEL = 'a0000000-0000-4000-8000-000000000005'
MARCO = 'b0000000-0000-4000-8000-000000000001'
ACADEMY = 'c0000000-0000-4000-8000-000000000001'


def out(bucket, owner, name):
    path = os.path.join(HERE, bucket, owner, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


def ease(t):
    return 0.5 - 0.5 * math.cos(math.pi * max(0.0, min(1.0, t)))


def pitch(d):
    for i in range(10):
        d.rectangle([0, i * H / 10, W, (i + 1) * H / 10], fill=(30, 123, 59) if i % 2 else (36, 135, 66))
    line = (240, 250, 240)
    d.rectangle([12, 12, W - 12, H - 12], outline=line, width=3)
    d.rectangle([70, 12, W - 70, 150], outline=line, width=3)
    d.rectangle([130, 12, W - 130, 60], outline=line, width=3)
    d.rectangle([150, 0, W - 150, 14], fill=(255, 255, 255))
    d.ellipse([W / 2 - 60, H - 72, W / 2 + 60, H + 48], outline=line, width=3)


def dot(d, x, y, r, fill, ring=(255, 255, 255)):
    d.ellipse([x - r, y - r, x + r, y + r], fill=fill, outline=ring, width=3)


def football(t):
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    pitch(d)
    # A one-two on the edge of the box, then a finish into the top corner.
    you = (180 - 20 * ease(t / 0.4), 470 - 160 * ease(t / 0.6))
    mate = (80 + 30 * ease(t / 0.5), 330 - 60 * ease(t / 0.5))
    dot(d, *mate, 14, (46, 125, 246))
    for ox, oy in [(200, 250), (120, 200), (260, 170)]:
        dot(d, ox + 6 * math.sin(t * 6), oy, 14, (226, 41, 75), (120, 16, 16))
    dot(d, W / 2 + 25 * math.sin(t * 3), 40, 14, (255, 200, 61), (138, 106, 0))
    dot(d, *you, 15, (255, 90, 31))
    if t < 0.35:
        bx, by = you[0] + 10, you[1] + 8
    elif t < 0.55:
        k = (t - 0.35) / 0.2
        bx, by = you[0] + (mate[0] - you[0]) * k, you[1] + (mate[1] - you[1]) * k
    elif t < 0.7:
        k = (t - 0.55) / 0.15
        bx, by = mate[0] + (you[0] - mate[0]) * k, mate[1] + (you[1] - mate[1]) * k
    else:
        k = ease((t - 0.7) / 0.3)
        bx, by = you[0] + (W / 2 + 34 - you[0]) * k, you[1] + (22 - you[1]) * k - 60 * math.sin(math.pi * k)
    d.ellipse([bx - 7, by - 7, bx + 7, by + 7], fill=(255, 255, 255), outline=(20, 22, 26), width=2)
    if t > 0.95:
        d.rectangle([0, 0, W, H], outline=(201, 240, 60), width=10)
    return img


def athletics(t):
    img = Image.new('RGB', (W, H), (196, 76, 48))
    d = ImageDraw.Draw(img)
    lanes = 6
    for i in range(lanes + 1):
        x = 20 + i * (W - 40) / lanes
        d.line([x, 0, x, H], fill=(245, 235, 225), width=3)
    d.rectangle([20, 70, W - 20, 82], fill=(255, 255, 255))
    for c in range(8):
        d.rectangle([20 + c * (W - 40) / 8, 70, 20 + (c + 0.5) * (W - 40) / 8, 82], fill=(20, 22, 26))
    speeds = [0.92, 1.0, 0.95, 0.88, 0.97, 0.9]
    colors = [(46, 125, 246), (255, 90, 31), (139, 92, 246), (16, 213, 160), (240, 48, 140), (255, 176, 32)]
    for i in range(lanes):
        x = 20 + (i + 0.5) * (W - 40) / lanes
        y = H - 40 - (H - 140) * ease(min(1, t * speeds[i] * 1.15))
        dot(d, x, y, 13, colors[i])
    return img


def basketball(t):
    img = Image.new('RGB', (W, H), (214, 158, 96))
    d = ImageDraw.Draw(img)
    for i in range(0, W, 24):
        d.line([i, 0, i, H], fill=(200, 145, 85), width=2)
    line = (255, 255, 255)
    d.rectangle([110, 0, W - 110, 230], outline=line, width=3)
    d.ellipse([110, 170, W - 110, 290], outline=line, width=3)
    d.rectangle([140, 30, W - 140, 36], fill=(40, 40, 40))
    d.ellipse([W / 2 - 22, 40, W / 2 + 22, 56], outline=(255, 90, 31), width=4)
    sx, sy = 90, 520
    k = ease(min(1, t / 0.85))
    bx = sx + (W / 2 - sx) * k
    by = sy + (48 - sy) * k - 260 * math.sin(math.pi * k)
    dot(d, sx + 10 * math.sin(t * 5), 540, 16, (255, 90, 31))
    d.ellipse([bx - 13, by - 13, bx + 13, by + 13], fill=(232, 110, 30), outline=(40, 20, 10), width=2)
    return img


def render(scene, bucket, owner, name):
    with tempfile.TemporaryDirectory() as tmp:
        frames = FPS * SECONDS
        for i in range(frames):
            scene(i / (frames - 1)).save(os.path.join(tmp, f'{i:04d}.png'))
        video = out(bucket, owner, name + '.mp4')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS),
                        '-i', os.path.join(tmp, '%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                        '-crf', '30', '-preset', 'slow', '-movflags', '+faststart', video], check=True)
        scene(0.5).convert('RGB').save(out(bucket, owner, name + '.jpg'), quality=78)


def still(kind, bucket, owner, name):
    img = Image.new('RGB', (720, 1280))
    d = ImageDraw.Draw(img)
    top, bottom = {'stadium': ((18, 22, 58), (86, 44, 150)), 'training': ((255, 122, 69), (240, 48, 140)),
                   'academy': ((18, 194, 233), (46, 125, 246))}[kind]
    for y in range(1280):
        k = y / 1279
        d.line([0, y, 720, y], fill=tuple(int(top[c] + (bottom[c] - top[c]) * k) for c in range(3)))
    if kind == 'stadium':
        beams = Image.new('RGBA', (720, 1280), (0, 0, 0, 0))
        b = ImageDraw.Draw(beams)
        for x in (110, 610):
            b.polygon([(x - 20, 150), (x + 20, 150), (x + 330 * (1 if x < 360 else -1) + 120, 900),
                       (x + 330 * (1 if x < 360 else -1) - 120, 900)], fill=(255, 250, 220, 70))
        beams = beams.filter(ImageFilter.GaussianBlur(30))
        img = Image.alpha_composite(img.convert('RGBA'), beams).convert('RGB')
        d = ImageDraw.Draw(img)
        d.polygon([(0, 760), (720, 760), (720, 900), (0, 900)], fill=(24, 20, 48))
        for i in range(0, 720, 18):
            d.rectangle([i + 4, 790 + (i // 18 % 3) * 6, i + 12, 800 + (i // 18 % 3) * 6], fill=(60, 52, 110))
        for x in (110, 610):
            for k in range(4):
                d.ellipse([x - 40 + k * 22, 130, x - 26 + k * 22, 144], fill=(255, 255, 240))
            d.line([x, 150, x, 760], fill=(40, 36, 70), width=8)
        d.rectangle([0, 900, 720, 1280], fill=(30, 123, 59))
        for i in range(0, 720, 90):
            d.rectangle([i, 900, i + 45, 1280], fill=(36, 135, 66))
        d.ellipse([330, 1040, 390, 1100], fill=(255, 255, 255), outline=(20, 22, 26), width=5)
    elif kind == 'training':
        for i in range(8):
            x = 90 + i * 80
            d.polygon([(x, 980), (x - 26, 1040), (x + 26, 1040)], fill=(255, 176, 32))
        d.ellipse([300, 700, 420, 820], fill=(255, 255, 255), outline=(20, 22, 26), width=6)
    else:
        for r in range(6):
            d.ellipse([360 - 80 * r, 640 - 80 * r, 360 + 80 * r, 640 + 80 * r], outline=(255, 255, 255), width=4)
    img.save(out(bucket, owner, name), quality=80)


if __name__ == '__main__':
    render(football, 'posts', LAYLA, 'demo-reel-1')
    render(athletics, 'posts', SARA, 'demo-reel-2')
    render(basketball, 'posts', DANIEL, 'demo-reel-3')
    still('stadium', 'stories', LAYLA, 'demo-story-1.jpg')
    still('training', 'stories', MARCO, 'demo-story-2.jpg')
    still('academy', 'posts', ACADEMY, 'demo-photo-1.jpg')
    print('demo media written')
