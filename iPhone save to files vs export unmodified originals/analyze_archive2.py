from pillow_heif import register_heif_opener
from PIL import Image
import exifread
import io

register_heif_opener()

def get_exif_heic(filename):
    with open(filename, 'rb') as f:
        tags = exifread.process_file(f, details=True)
    return tags

file1 = 'workspace/archive2/IMG_0229.HEIC'
file2 = 'workspace/archive2/IMG_0229 2.HEIC'

tags1 = get_exif_heic(file1)
tags2 = get_exif_heic(file2)

all_keys = sorted(set(tags1.keys()) | set(tags2.keys()))

print(f"{'Tag':<40} | {'IMG_0229.HEIC':<30} | {'IMG_0229 2.HEIC':<30}")
print("-" * 110)

for key in all_keys:
    val1 = tags1.get(key, "MISSING")
    val2 = tags2.get(key, "MISSING")

    if str(val1) != str(val2):
        print(f"{key:<40} | {str(val1)[:30]:<30} | {str(val2)[:30]:<30}")

import os
print("\nFilesizes:")
print(f"IMG_0229.HEIC: {os.path.getsize(file1)} bytes")
print(f"IMG_0229 2.HEIC: {os.path.getsize(file2)} bytes")
