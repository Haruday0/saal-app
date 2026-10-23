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

# Let's inspect the character '普' in Row 1:
# We know '普' is roughly x=154 to 209, y=390 to 443.
# Can we find the individual LED dot peaks (local maxima in brightness)?
# Let's sample along a vertical line through '普' or along horizontal lines to find dot pitch.

# Let's inspect vertical brightness profile through '普' at a column with many dots, e.g. x=180:
col_profile = []
for y in range(390, 444):
    r, g, b = get_pixel(180, y)
    col_profile.append((y, g))

# Count peaks in col_profile:
peaks = []
for i in range(1, len(col_profile)-1):
    if col_profile[i][1] > col_profile[i-1][1] and col_profile[i][1] >= col_profile[i+1][1] and col_profile[i][1] > 100:
        peaks.append(col_profile[i][0])

print("Peaks along y at x=180:", len(peaks), peaks)

# Let's look at the width of one full-width character:
# '普': x=154 to 209 -> width = 55px
# '通': x=244 to 296 -> width = 52px
# '白': x=692 to 742 -> width = 50px
# '石': x=810 to 862 -> width = 52px
# Average full-width character width in image = ~52px to 54px.
# Display window width: x=120 to 895 = 775px.
# 775px / 52px = 14.9 characters!
# 775px / 54px = 14.35 characters!
# Let's find the exact slot grid!
