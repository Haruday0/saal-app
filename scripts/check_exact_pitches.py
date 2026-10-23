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

# Window is x=120 to 895 (width = 775px)
# Let's see the 13 or 14 divisions
# Let's inspect each item's center:
# 普: center = (154 + 209)/2 = 181.5
# 通: center = (244 + 296)/2 = 270.0  -> distance = 88.5
# 6: center = (325 + 359)/2 = 342.0   -> distance = 72.0
# 両: center = (380 + 429)/2 = 404.5  -> distance = 62.5
# 18:11: center = (523 + 655)/2 = 589.0 -> distance from 両 = 184.5
# 白: center = (692 + 742)/2 = 717.0
# 石: center = (810 + 862)/2 = 836.0  -> distance = 119.0

# In Row 2:
# 普: (154 + 208)/2 = 181.0
# 通: (242 + 297)/2 = 269.5
# 2: (330 + 359)/2 = 344.5
# 両: (380 + 429)/2 = 404.5
# 18:19: (524 + 656)/2 = 590.0
# 仙: (666 + 721)/2 = 693.5
# 台: (721 + 776)/2 = 748.5
# 空: (776 + 831)/2 = 803.5
# 港: (831 + 887)/2 = 859.0

print("Row 2 destination character centers:")
print("仙:", 693.5, "台:", 748.5, "空:", 803.5, "港:", 859.0)
print("Pitch between dest chars:", 748.5 - 693.5, 803.5 - 748.5, 859.0 - 803.5)
# Pitch is EXACTLY 55.0px, 55.0px, 55.5px!

# Pitch of 18:19 digits:
# Starts at 524, ends at 656 (width = 132px for 5 half-width chars = 26.4px per half-width char)
# 26.4px * 2 = 52.8px per full-width char!
