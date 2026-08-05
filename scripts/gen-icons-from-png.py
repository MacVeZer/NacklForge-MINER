#!/usr/bin/env python3
"""
Convert AI-generated 1024x1024 icon to Android launcher icon PNGs.
Crops center squircle and generates all density buckets.
Also creates round variant.
"""
import os
from PIL import Image, ImageDraw

SRC = "/home/z/my-project/download/ic_launcher_ai_v2.png"
RES_DIR = "/home/z/my-project/apk_src/res"

# Android density buckets — launcher icon sizes
DENSITIES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

# Open source (1024x1024 expected)
src = Image.open(SRC).convert("RGBA")
src_size = src.width  # assume square
print(f"Source: {src_size}x{src_size}")

# Clean up old files
for bucket in DENSITIES:
    out_dir = os.path.join(RES_DIR, bucket)
    os.makedirs(out_dir, exist_ok=True)
    # Remove old PNG/XML
    for old in os.listdir(out_dir):
        if old.startswith("ic_launcher"):
            os.remove(os.path.join(out_dir, old))

# Generate ic_launcher.png (full squircle — system applies mask)
# and ic_launcher_round.png (same image, system masks to circle)
for bucket, size in DENSITIES.items():
    out_dir = os.path.join(RES_DIR, bucket)
    # Resize source to target size with high-quality LANCZOS
    icon = src.resize((size, size), Image.LANCZOS)
    icon.save(os.path.join(out_dir, "ic_launcher.png"), "PNG", optimize=True)
    icon.save(os.path.join(out_dir, "ic_launcher_round.png"), "PNG", optimize=True)
    print(f"Generated {bucket}/ic_launcher.png ({size}x{size})")

# Generate Play Store 512x512
play_path = "/home/z/my-project/download/ic_launcher_playstore.png"
src.resize((512, 512), Image.LANCZOS).save(play_path, "PNG", optimize=True)
print(f"Generated {play_path} (512x512)")

print("\nAll launcher icons generated!")
