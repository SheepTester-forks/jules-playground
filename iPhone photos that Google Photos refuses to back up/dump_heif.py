import struct
import sys
import os

def parse_boxes(f, end_pos, indent=""):
    while f.tell() < end_pos:
        pos = f.tell()
        size_data = f.read(4)
        if not size_data:
            break
        size = struct.unpack(">I", size_data)[0]
        box_type = f.read(4).decode('ascii', errors='replace')

        real_size = size
        header_size = 8
        if size == 1:
            extended_size_data = f.read(8)
            real_size = struct.unpack(">Q", extended_size_data)[0]
            header_size = 16
        elif size == 0:
            # size 0 means until end of file
            f.seek(0, 2)
            real_size = f.tell() - pos
            f.seek(pos + header_size)

        print(f"{indent}{box_type} @ {pos} size {real_size}")

        container_boxes = ['meta', 'iprp', 'ipco', 'trak', 'moov', 'udta', 'iloc', 'iinf', 'iref']

        if box_type in container_boxes:
            box_end = pos + real_size
            if box_type == 'meta':
                # meta box has 4 bytes of version/flags
                f.read(4)
            parse_boxes(f, box_end, indent + "  ")

        f.seek(pos + real_size)

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 dump_heif.py <filename>")
        return

    filename = sys.argv[1]
    filesize = os.path.getsize(filename)
    with open(filename, 'rb') as f:
        parse_boxes(f, filesize)

if __name__ == "__main__":
    main()
