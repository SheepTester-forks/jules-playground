def compare_files(file1, file2):
    size1 = os.path.getsize(file1)
    size2 = os.path.getsize(file2)

    print(f"Comparing {file1} and {file2}")
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
                print(f"Diff at {i}: {b1[i]:02x} vs {b2[i]:02x}")

    print(f"Total byte differences in common range: {diffs}")
    if first_diff != -1:
        print(f"First difference at: {first_diff} (0x{first_diff:x})")

import os
compare_files('workspace/archive1/IMG_0108.jpg', 'workspace/archive1/IMG_0108 2.JPG')
print("-" * 40)
compare_files('workspace/archive2/IMG_0229.HEIC', 'workspace/archive2/IMG_0229 2.HEIC')
