import struct
import sys

def parse_ispe(f, size):
    f.read(4) # version and flags
    width = struct.unpack(">I", f.read(4))[0]
    height = struct.unpack(">I", f.read(4))[0]
    return width, height

def main():
    filename = sys.argv[1]
    with open(filename, 'rb') as f:
        content = f.read()

        pos = 0
        while True:
            pos = content.find(b'ispe', pos)
            if pos == -1:
                break

            size = struct.unpack(">I", content[pos-4:pos])[0]
            f.seek(pos + 4)
            width, height = parse_ispe(f, size)
            print(f"ispe @ {pos-4}: {width}x{height}")
            pos += 4

if __name__ == "__main__":
    main()
