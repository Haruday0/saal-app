# Check the photo's column positions relative to total window:
# Display window: x=120 to 895 (width = 775px)
# Time starts at x=523, ends at 655 (width = 132px, 17.0% of window)
# Time start offset from window left: 523 - 120 = 403px (52.0% of window)
# Dest starts at x=670, ends at 886 (width = 216px, 27.9% of window)
# Dest offset from window left: 670 - 120 = 550px (71.0% of window)

print("Real board column layout:")
print(f"  Window width: 775px")
print(f"  Left text ('普 通 6 両'): width = 275px (35.5%)")
print(f"  Gap to Time: width = 94px (12.1%)")
print(f"  Time column: width = 132px (17.0%)")
print(f"  Gap between Time & Dest: width = 15px (1.9%)")
print(f"  Dest column: width = 216px (27.9%)")
print(f"  Right margin: width = 9px (1.2%)")

# Sum = 275 + 94 + 132 + 15 + 216 + 9 = 741px + 34px left = 775px
