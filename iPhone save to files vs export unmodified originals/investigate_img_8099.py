import os
import hashlib
import exifread
from pillow_heif import register_heif_opener

register_heif_opener()

file_save_to_files = 'iPhone save to files vs export unmodified originals/save to files/IMG_8099.HEIC'
file_export_unmodified = 'iPhone save to files vs export unmodified originals/export unmodified originals/IMG_8099.HEIC'

def get_md5(filename):
    hash_md5 = hashlib.md5()
    with open(filename, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def get_exif(filename):
    with open(filename, 'rb') as f:
        tags = exifread.process_file(f, details=True)
    return tags

def compare_files(f1, f2):
    print(f"Comparing:\n1: {f1}\n2: {f2}\n")

    size1 = os.path.getsize(f1)
    size2 = os.path.getsize(f2)
    print(f"Sizes: {size1} vs {size2} bytes")

    md5_1 = get_md5(f1)
    md5_2 = get_md5(f2)
    print(f"MD5: {md5_1} vs {md5_2}")

    if md5_1 == md5_2:
        print("Files are byte-identical.")
        return

    # Find first difference
    with open(f1, 'rb') as b1, open(f2, 'rb') as b2:
        chunk1 = b1.read()
        chunk2 = b2.read()
        min_len = min(len(chunk1), len(chunk2))
        for i in range(min_len):
            if chunk1[i] != chunk2[i]:
                print(f"First binary difference at offset: {i} (0x{i:x})")
                print(f"Values: 0x{chunk1[i]:02x} vs 0x{chunk2[i]:02x}")
                break
        else:
            if len(chunk1) != len(chunk2):
                print(f"No differences in common range, but sizes differ.")

    # Metadata comparison
    tags1 = get_exif(f1)
    tags2 = get_exif(f2)

    all_keys = sorted(set(tags1.keys()) | set(tags2.keys()))
    print("\nMetadata Differences:")
    diff_found = False
    for key in all_keys:
        v1 = tags1.get(key)
        v2 = tags2.get(key)
        if str(v1) != str(v2):
            print(f"{key}:")
            print(f"  Save to Files: {v1}")
            print(f"  Export Unmodified: {v2}")
            diff_found = True
    if not diff_found:
        print("No metadata differences found by exifread.")

if __name__ == "__main__":
    compare_files(file_save_to_files, file_export_unmodified)
