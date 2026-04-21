import exifread
import os

def get_exif(filename):
    with open(filename, 'rb') as f:
        tags = exifread.process_file(f, details=True)
    return tags

file1 = 'workspace/archive1/IMG_0108.jpg'
file2 = 'workspace/archive1/IMG_0108 2.JPG'

tags1 = get_exif(file1)
tags2 = get_exif(file2)

gps_keys = sorted(set(k for k in tags1.keys() if 'GPS' in k) | set(k for k in tags2.keys() if 'GPS' in k))

print(f"{'GPS Tag':<40} | {'IMG_0108.jpg':<30} | {'IMG_0108 2.JPG':<30}")
print("-" * 110)

for key in gps_keys:
    val1 = tags1.get(key, "MISSING")
    val2 = tags2.get(key, "MISSING")
    print(f"{key:<40} | {str(val1)[:30]:<30} | {str(val2)[:30]:<30}")
