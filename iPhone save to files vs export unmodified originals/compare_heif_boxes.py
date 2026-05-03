import struct
import hashlib
import os

def parse_boxes(data, offset=0, end=None):
    if end is None:
        end = len(data)

    boxes = []
    while offset < end:
        if offset + 8 > end:
            break
        size, box_type = struct.unpack_from(">I4s", data, offset)
        box_type = box_type.decode('ascii', errors='ignore')

        real_offset = offset
        header_size = 8

        if size == 1:
            size = struct.unpack_from(">Q", data, offset + 8)[0]
            header_size = 16
        elif size == 0:
            size = end - offset

        box_data_start = offset + header_size
        box_data_end = offset + size

        boxes.append({
            'type': box_type,
            'offset': real_offset,
            'size': size,
            'data_start': box_data_start,
            'data_end': box_data_end
        })

        offset += size
    return boxes

def get_diff_percent(d1, d2):
    min_len = min(len(d1), len(d2))
    diffs = 0
    for i in range(min_len):
        if d1[i] != d2[i]:
            diffs += 1
    diffs += abs(len(d1) - len(d2))
    max_len = max(len(d1), len(d2))
    return (diffs / max_len) * 100 if max_len > 0 else 0

def compare_heic_boxes(f1, f2):
    print(f"Comparing HEIF structures:\n1: {f1}\n2: {f2}\n")

    with open(f1, 'rb') as b1:
        data1 = b1.read()
    with open(f2, 'rb') as b2:
        data2 = b2.read()

    boxes1 = parse_boxes(data1)
    boxes2 = parse_boxes(data2)

    print(f"{'Box':<10} | {'File 1 (Size)':<15} | {'File 2 (Size)':<15} | {'Data Match?'}")
    print("-" * 85)

    # We'll compare boxes by type and order
    max_len = max(len(boxes1), len(boxes2))
    for i in range(max_len):
        b1 = boxes1[i] if i < len(boxes1) else None
        b2 = boxes2[i] if i < len(boxes2) else None

        type1 = b1['type'] if b1 else "MISSING"
        type2 = b2['type'] if b2 else "MISSING"
        size1 = b1['size'] if b1 else 0
        size2 = b2['size'] if b2 else 0

        match = "N/A"
        if b1 and b2 and type1 == type2:
            d1 = data1[b1['data_start']:b1['data_end']]
            d2 = data2[b2['data_start']:b2['data_end']]
            if d1 == d2:
                match = "YES"
            else:
                h1 = hashlib.md5(d1).hexdigest()
                h2 = hashlib.md5(d2).hexdigest()
                diff_percent = get_diff_percent(d1, d2)
                match = f"NO ({h1[:6]} vs {h2[:6]}) - {diff_percent:.2f}% diff"

        print(f"{type1 if type1 == type2 else f'{type1}/{type2}':<10} | {size1:<15} | {size2:<15} | {match}")

    # Inspect 'meta' box further if needed, but 'mdat' is the main interest
    for b in boxes1:
        if b['type'] == 'meta':
            print(f"\nSub-boxes of 'meta' in File 1:")
            # meta box has 4 bytes of flags/version after header
            sub_boxes = parse_boxes(data1, b['data_start'] + 4, b['data_end'])
            for sb in sub_boxes:
                print(f"  {sb['type']} ({sb['size']} bytes)")

if __name__ == "__main__":
    file_save_to_files = 'iPhone save to files vs export unmodified originals/save to files/IMG_8099.HEIC'
    file_export_unmodified = 'iPhone save to files vs export unmodified originals/export unmodified originals/IMG_8099.HEIC'
    compare_heic_boxes(file_save_to_files, file_export_unmodified)
