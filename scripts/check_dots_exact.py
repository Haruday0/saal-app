with open('/home/haru/.gemini/antigravity-cli/brain/cbd04774-ba87-4fc5-8c6e-9a45d3573eb8/scratch/real_board.ppm', 'rb') as f:
    header = []
    while len(header) < 3:
        line = f.readline().strip()
        if line.startswith(b'#') or not line: continue
        header.extend(line.split())
    magic, W, H = header[0], int(header[1]), int(header[2])
    maxval = int(f.readline().strip())
    data = f.read()

def get_pixel(x, y):
    idx = (y * W + x) * 3
    return data[idx], data[idx+1], data[idx+2]

def is_lit(x, y):
    r, g, b = get_pixel(x, y)
    return (g > 85 and g > r*1.2) or (r > 110 and g > 65 and b < 70)

# Let's inspect the vertical lines in the colon of '18:11' or in '1' or '両' or in '港'
# '1' in '18:11': x=540 to 555
# Count vertical dot positions in '1':
for x in range(545, 555):
    dots = [y for y in range(390, 445) if is_lit(x, y)]
    if len(dots) > 10:
        # compute consecutive diffs
        diffs = [dots[i+1] - dots[i] for i in range(len(dots)-1)]
        print(f"Col {x}: {len(dots)} lit pixels, y from {min(dots)} to {max(dots)}")
        break

# Let's check dot spacing by looking at auto-correlation or FFT along vertical slice
import statistics
all_peaks_y = []
for x in range(140, 880):
    for y in range(392, 442):
        if is_lit(x, y) and not is_lit(x, y-1):
            all_peaks_y.append(y)

print(f"Total lit starts in row 1: {len(all_peaks_y)}")
