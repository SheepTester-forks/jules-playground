import exifread
import os

def get_exif(filename):
    with open(filename, 'rb') as f:
        tags = exifread.process_file(f)
    return tags

file1 = 'workspace/archive1/IMG_0108.jpg'
file2 = 'workspace/archive1/IMG_0108 2.JPG'

tags1 = get_exif(file1)
tags2 = get_exif(file2)

all_keys = sorted(set(tags1.keys()) | set(tags2.keys()))

print(f"{'Tag':<40} | {'IMG_0108.jpg (Save to Files)':<30} | {'IMG_0108 2.JPG (Export Unmodified)':<30}")
print("-" * 110)

for key in all_keys:
    val1 = tags1.get(key, "MISSING")
    val2 = tags2.get(key, "MISSING")

    if str(val1) != str(val2):
        print(f"{key:<40} | {str(val1)[:30]:<30} | {str(val2)[:30]:<30}")

print("\nFilesizes:")
print(f"IMG_0108.jpg: {os.path.getsize(file1)} bytes")
print(f"IMG_0108 2.JPG: {os.path.getsize(file2)} bytes")
