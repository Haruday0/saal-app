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

# 14 slots:
# Let's inspect where characters fall in the 14 slots:
slot_w = (895 - 120) / 14.0 # 55.357 px

print("14-Character Grid Slots (x_start to x_end):")
for i in range(14):
    xs = int(120 + i * slot_w)
    xe = int(120 + (i + 1) * slot_w)
    
    # check lit pixels in Row 1:
    r1_lit = sum(1 for y in range(390, 445) for x in range(xs, xe) if is_lit(x, y))
    # check lit pixels in Row 2:
    r2_lit = sum(1 for y in range(450, 503) for x in range(xs, xe) if is_lit(x, y))
    
    print(f"Slot {i+1:2d} (x={xs:3d}..{xe:3d}): Row 1 lit={r1_lit:3d}, Row 2 lit={r2_lit:3d}")
