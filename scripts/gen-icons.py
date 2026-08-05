#!/usr/bin/env python3
"""Generate launcher icon PNGs for all Android density buckets."""
import os
import cairosvg

SRC = "/home/z/my-project/apk_src/ic_launcher.svg"
DENSITIES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

RES_DIR = "/home/z/my-project/apk_src/res"

# Remove old vector drawable icons
for bucket in DENSITIES:
    os.makedirs(os.path.join(RES_DIR, bucket), exist_ok=True)

# Generate ic_launcher.png and ic_launcher_round.png for each density
for bucket, size in DENSITIES.items():
    out_dir = os.path.join(RES_DIR, bucket)
    for name in ("ic_launcher.png", "ic_launcher_round.png"):
        out_path = os.path.join(out_dir, name)
        cairosvg.svg2png(
            url=SRC,
            write_to=out_path,
            output_width=size,
            output_height=size,
        )
        print(f"Generated {out_path} ({size}x{size})")

# Also generate a high-res version for play store (512x512)
play_path = "/home/z/my-project/download/ic_launcher_playstore.png"
cairosvg.svg2png(url=SRC, write_to=play_path, output_width=512, output_height=512)
print(f"Generated {play_path} (512x512 for Play Store)")

print("\nAll icons generated successfully!")
