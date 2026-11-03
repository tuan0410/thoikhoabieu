"""Verify packaged Neon icons. Export source artwork with export-icons.ps1 on Windows."""
from pathlib import Path
import struct
OUT = Path(__file__).resolve().parent.parent / 'icons'

def icon(size):
    name = {180: 'apple-touch-icon.png', 192: 'icon-192.png', 512: 'icon-512.png', 1024: 'icon-1024.png'}[size]
    data = (OUT / name).read_bytes()
    if data[:8] != bytes([137,80,78,71,13,10,26,10]) or struct.unpack('>II', data[16:24]) != (size, size):
        raise ValueError('Invalid icon dimensions: ' + name)
    return data

if __name__ == '__main__':
    for size in [180, 192, 512, 1024]:
        icon(size)
        print(f'Neon icon verified: {size}x{size}')
