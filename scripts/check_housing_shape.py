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

def lum(x, y):
    r, g, b = get_pixel(x, y)
    return 0.299*r + 0.587*g + 0.114*b

# Outer boundary of the lower black housing at y=450:
# What is the background on the far left (x < 100) and far right (x > 900)?
# Let's inspect lum along y=450 from x=0 to 150 and x=850 to 1024:
print("Left side of lower housing at y=450:")
for x in range(0, 140, 10):
    print(f"x={x:3d}: lum={lum(x, 450):.1f}, RGB={get_pixel(x, 450)}")

print("\nRight side of lower housing at y=450:")
for x in range(880, 1024, 10):
    print(f"x={x:3d}: lum={lum(x, 450):.1f}, RGB={get_pixel(x, 450)}")
