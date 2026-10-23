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

# In the real photo:
# Signboard Y: 244 to 357 (height = 113px)
# Center of signboard: (244 + 357) / 2 = 300.5
# Let's find the y bounds of:
# 1) Line 1 kanji: "白石・福島・仙台空港アクセス線" (x around 540 to 840, y around 250 to 290)
# 2) Line 1 english: (x around 540 to 840, y around 280 to 300)
# 3) Line 2 kanji: "亘理・原ノ町・いわき" (y around 300 to 330)
# 4) Line 2 english: (y around 330 to 350)

# Check dark pixels in x=540 to 800:
for y in range(244, 357):
    dark_cnt = sum(1 for x in range(540, 800) if lum(x, y) < 130)
    if dark_cnt > 5:
        print(f"y={y:3d} (dist from top={y-244:2d}, dist from bottom={357-y:2d}): {'#'*(dark_cnt//4)}")
