"""Generate the existing calendar brand as PNG icons using the Python standard library."""
from pathlib import Path
import math
import struct
import zlib

OUT = Path(__file__).resolve().parent.parent / 'icons'
OUT.mkdir(exist_ok=True)


def icon(size):
    pixels = bytearray(bytes((46, 73, 208)) * size * size)

    def rounded(box, radius, color):
        x0, y0, x1, y1 = [v * size / 512 for v in box]
        radius *= size / 512
        for y in range(max(0, math.floor(y0)), min(size, math.ceil(y1))):
            center = y + .5
            delta = max(y0 + radius - center, center - (y1 - radius), 0)
            inset = radius - math.sqrt(max(0, radius * radius - delta * delta))
            left, right = max(0, math.ceil(x0 + inset)), min(size, math.floor(x1 - inset))
            if right > left:
                offset = (y * size + left) * 3
                pixels[offset:offset + (right - left) * 3] = bytes(color) * (right - left)

    white = (255, 255, 255)
    blue = (46, 73, 208)
    rounded((112, 140, 400, 392), 32, white)
    rounded((132, 206, 380, 372), 12, blue)
    rounded((170, 104, 194, 168), 12, white)
    rounded((318, 104, 342, 168), 12, white)
    for x, y in [(166, 239), (237, 239), (308, 239), (166, 305), (237, 305), (308, 305)]:
        rounded((x, y, x + 38, y + 34), 7, white)
    raw = b''.join(b'\x00' + pixels[y * size * 3:(y + 1) * size * 3] for y in range(size))

    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)

    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')


if __name__ == '__main__':
    for name, size in [('icon-192.png', 192), ('icon-512.png', 512), ('icon-maskable-512.png', 512), ('apple-touch-icon.png', 180)]:
        (OUT / name).write_bytes(icon(size))
        print(f'{name}: {size}x{size}')
