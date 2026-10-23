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

# In Row 2, what characters are displayed?
# In Row 2 we had:
# 普 通 2 両 18:19 仙台空港
# Let's find each character's bounding box in Row 2 (y=448 to 503):
row2_lit_x = []
for x in range(120, 895):
    lit = any(is_lit(x, y) for y in range(448, 503))
    row2_lit_x.append((x, lit))

# Find consecutive segments:
chars = []
curr_start = None
for x, lit in row2_lit_x:
    if lit and curr_start is None:
        curr_start = x
    elif not lit and curr_start is not None:
        if x - curr_start >= 3:
            chars.append((curr_start, x))
        curr_start = None

# Merge adjacent segments if gap <= 5 px:
merged = []
for s, e in chars:
    if not merged or s - merged[-1][1] > 6:
        merged.append([s, e])
    else:
        merged[-1][1] = e

print("Row 2 characters:")
for i, (s, e) in enumerate(merged):
    print(f"  Item {i+1}: x={s} to {e} (w={e-s}px)")
