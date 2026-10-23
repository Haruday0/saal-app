# Test compact layout
# If the screen is inset like the real photo:
# Signboard = 385px
# Screen window = 385 * 0.826 = ~318px!
# Inside 318px:
# 13 or 14 slots:
# Slot width = 318 / 13 = 24.5px (or 318 / 14 = 22.7px)
# At 22.7px per slot:
# 種別 (3 slots) = 68.1px
# 両数 (2 slots) = 45.4px
# 中央余白 (1 slot = 22.7px, or 1.5 slots = 34px)
# 時刻 (3 slots) = 68.1px
# 行先 (4 slots) = 90.8px
# Sum = 68.1 + 45.4 + 22.7 + 68.1 + 90.8 = 295px + padding = 318px!

print("318px Inset Screen Slot Breakdown:")
print("種別 (3 slots): 68px")
print("両数 (2 slots): 45px")
print("中央余白: 28px (~1.2 - 1.5 characters, NO giant gap!)")
print("時刻 (3 slots): 68px (Time takes ~55px, sits right next to destination)")
print("行先 (4 slots): 91px")
print("Total = 295px inside 318px window")
