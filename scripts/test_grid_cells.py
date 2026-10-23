trains = [
    {"type": "普通", "cars": 6, "time": "18:11", "dest": "白石"},
    {"type": "普通", "cars": 2, "time": "18:19", "dest": "仙台空港"},
    {"type": "普通", "cars": 4, "time": " 8:23", "dest": "原ノ町"},
]

print("Visualizing 14-grid characters:")
print("Col: |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 |")
print("Desc:| <---種別---> | <-両数-> | <--余白--> | <---時刻---> | <------行先------> |")

for t in trains:
    # 1-3: type
    c1, c2, c3 = t["type"][0], " ", t["type"][1]
    # 4-5: cars
    c4, c5 = str(t["cars"]), "両"
    # 6-7: blank
    c6, c7 = " ", " "
    # 8-10: time (5 half-width chars = 2.5 full-width)
    time_str = f"{t['time']:>5}"
    # 11-14: dest
    d = t["dest"]
    if len(d) == 4:
        d1, d2, d3, d4 = d[0], d[1], d[2], d[3]
    elif len(d) == 2:
        d1, d2, d3, d4 = " ", d[0], d[1], " "
    else:
        d1, d2, d3, d4 = " ", d, " ", " "
    print(f"Row: |  {c1} |  {c2} |  {c3} |  {c4} |  {c5} |  {c6} |  {c7} |   {time_str}   |  {d1} |  {d2} |  {d3} |  {d4} |")
