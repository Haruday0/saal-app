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

# In Row 2, '仙台空港' is 4 full-width kanji characters:
# x = 666 to 887 (width = 221px)
# 221 / 4 = 55.25px per character!
# Let's see each of the 4 characters:
# '仙': 666 to ~721 (55px)
# '台': 721 to ~776 (55px)
# '空': 776 to ~831 (55px)
# '港': 831 to ~887 (56px)

# Now what about '普' and '通'?
# '普': 154 to 208 (54px)
# '通': 242 to 297 (55px)
# Notice: '普' to '通' pitch:
# 242 - 154 = 88px!
# 88px = 55px (1 char) + 33px (gap = ~0.6 char)
# '通' (start 242) to '2' (start 330): 330 - 242 = 88px!
# '2' is a half-width digit (~28px) followed by '両' at 380!
# '2両' occupies 330 to 429 = 99px!

# And from '両' (end 429) to '18:19' (start 524):
# Gap = 524 - 429 = 95px! (approx 1.7 characters)

# '18:19': 524 to 656 = 132px!
# 132px / 55px = 2.4 characters (half-width 5 digits = 2.5 characters!)

# Gap from '18:19' (end 656) to '仙台空港' (start 666):
# Gap = 666 - 656 = 10px!

# Total span:
# From start of '普' (154) to end of '港' (887) = 733px!
# 733px / 55.25px = 13.27 characters!
print(f"Total lit span: 733px = {733 / 55.25:.2f} full-width characters")
print(f"Total window: 775px = {775 / 55.25:.2f} full-width characters")
