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

# Signboard bounds:
# x=38 to 976 (width = 938px)
# LED housing bounds:
# x=26 to 988 (width = 962px)
# LED active window bounds:
# x=120 to 895 (width = 775px)

# Now check Row 1:
# '普': x=154 to 209 (width=55px)
# gap between window left (120) and '普' (154) = 34px! (That's 0.6 of a character space on the left!)
# gap between '普' (209) and '通' (244) = 35px! (0.6 of a character space in the middle!)
# '通': x=244 to 296 (width=52px)
# gap between '通' (296) and '6' (325) = 29px! (0.5 of a character space!)
# '6': x=325 to 359 (width=34px)
# gap between '6' (359) and '両' (380) = 21px! (0.4 of a character space!)
# '両': x=380 to 429 (width=49px)
# GAP BETWEEN '両' (429) AND '時刻' (523) = 94px!
# '18:11': x=523 to 655 (width=132px)
# gap between '時刻' (655) and '白' (692) = 37px!
# '白': x=692 to 742 (width=50px)
# gap between '白' (742) and '石' (810) = 68px!
# '石': x=810 to 862 (width=52px)
# gap between '石' (862) and window right (895) = 33px!

print("MEASUREMENTS FROM REAL PHOTO:")
print(f"Signboard width: 938px")
print(f"LED Window width: 775px (82.6% of signboard width)")
print(f"Window left margin before '普': 34px (4.4% of window)")
print(f"'普': 55px (7.1%)")
print(f"Space between '普' and '通': 35px (4.5%)")
print(f"'通': 52px (6.7%)")
print(f"Space between '通' and '6': 29px (3.7%)")
print(f"'6': 34px (4.4%)")
print(f"Space between '6' and '両': 21px (2.7%)")
print(f"'両': 49px (6.3%)")
print(f"GAP between '両' and Time: 94px (12.1% of window)")
print(f"Time '18:11': 132px (17.0% of window)")
print(f"Space between Time and Dest: 37px (4.8% of window)")
print(f"Dest: 170px (Row 1) / 221px (Row 2, '仙台空港')")
print(f"Window right margin: 33px (Row 1) / 8px (Row 2)")
