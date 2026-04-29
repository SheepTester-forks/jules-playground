import exifread
import os
import sys

def get_exif(filename):
    with open(filename, 'rb') as f:
        tags = exifread.process_file(f)
    return tags

def compare_images(files):
    all_tags = {}
    all_keys = set()

    for f in files:
        tags = get_exif(f)
        all_tags[f] = tags
        all_keys.update(tags.keys())

    all_keys = sorted(all_keys)

    header = f"{'Tag':<40}"
    for f in files:
        header += f" | {os.path.basename(f):<30}"
    print(header)
    print("-" * len(header))

    for key in all_keys:
        row = f"{key:<40}"
        vals = [str(all_tags[f].get(key, "MISSING")) for f in files]

        # Only print if there's a difference among the files
        if len(set(vals)) > 1:
            for val in vals:
                row += f" | {val[:30]:<30}"
            print(row)

    print("\nFilesizes:")
    for f in files:
        print(f"{os.path.basename(f)}: {os.path.getsize(f)} bytes")

if __name__ == "__main__":
    dir_path = "iPhone photos that Google Photos refuses to back up"
    files = [
        os.path.join(dir_path, "IMG_6008.HEIC"),
        os.path.join(dir_path, "IMG_6009.HEIC"),
        os.path.join(dir_path, "IMG_6010.HEIC")
    ]
    compare_images(files)
