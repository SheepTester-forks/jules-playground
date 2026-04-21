import exifread
import os

def get_exif(filename):
    with open(filename, 'rb') as f:
        tags = exifread.process_file(f)
    return tags

def compare_binary(file1, file2):
    size1 = os.path.getsize(file1)
    size2 = os.path.getsize(file2)

    print(f"Comparing binary: {file1} and {file2}")
    print(f"Sizes: {size1} vs {size2}")

    with open(file1, 'rb') as f1, open(file2, 'rb') as f2:
        b1 = f1.read()
        b2 = f2.read()

    min_size = min(size1, size2)
    diffs = 0
    first_diff = -1
    for i in range(min_size):
        if b1[i] != b2[i]:
            if first_diff == -1:
                first_diff = i
            diffs += 1
            if diffs < 10:
                print(f"Diff at offset {i} (0x{i:x}): {b1[i]:02x} vs {b2[i]:02x}")

    print(f"Total byte differences in common range: {diffs}")
    if first_diff != -1:
        print(f"First difference at: {first_diff} (0x{first_diff:x})")

file_save_to_files = 'IMG_3592.jpg'
file_export_unmodified = 'IMG_3592.JPG'

print(f"--- Metadata Comparison ---")
tags1 = get_exif(file_save_to_files)
tags2 = get_exif(file_export_unmodified)

all_keys = sorted(set(tags1.keys()) | set(tags2.keys()))

print(f"{'Tag':<40} | {'Save to Files (jpg)':<30} | {'Export Unmodified (JPG)':<30}")
print("-" * 110)

for key in all_keys:
    val1 = tags1.get(key, "MISSING")
    val2 = tags2.get(key, "MISSING")

    if str(val1) != str(val2):
        print(f"{key:<40} | {str(val1)[:30]:<30} | {str(val2)[:30]:<30}")

print(f"\n--- Binary Comparison ---")
compare_binary(file_save_to_files, file_export_unmodified)
