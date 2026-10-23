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

# Check x coordinates of Time in Row 1 (y: 390 to 445) vs Row 2 (y: 450 to 503)
# We know Time is around x=500 to 670
r1_time_xs = [x for x in range(500, 670) if any(is_lit(x, y) for y in range(390, 445))]
r2_time_xs = [x for x in range(500, 670) if any(is_lit(x, y) for y in range(450, 503))]

print(f"Row 1 Time X: {min(r1_time_xs)} to {max(r1_time_xs)} (span={max(r1_time_xs)-min(r1_time_xs)+1})")
print(f"Row 2 Time X: {min(r2_time_xs)} to {max(r2_time_xs)} (span={max(r2_time_xs)-min(r2_time_xs)+1})")

# Check x coordinates of Dest in Row 1 vs Row 2 (x > 670)
r1_dest_xs = [x for x in range(670, 900) if any(is_lit(x, y) for y in range(390, 445))]
r2_dest_xs = [x for x in range(670, 900) if any(is_lit(x, y) for y in range(450, 503))]

print(f"Row 1 Dest X: {min(r1_dest_xs)} to {max(r1_dest_xs)} (span={max(r1_dest_xs)-min(r1_dest_xs)+1})")
print(f"Row 2 Dest X: {min(r2_dest_xs)} to {max(r2_dest_xs)} (span={max(r2_dest_xs)-min(r2_dest_xs)+1})")
