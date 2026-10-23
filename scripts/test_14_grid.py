# Test 14-grid column assignment
trains = [
    {"type": "普通", "cars": 6, "time": "18:11", "dest": "白石"},
    {"type": "普通", "cars": 2, "time": "18:19", "dest": "仙台空港"},
    {"type": "普通", "cars": 4, "time": " 8:23", "dest": "原ノ町"},
]

for t in trains:
    # 14 columns representation:
    # col 1-2: type (2 chars)
    # col 3: blank (1 char)
    # col 4-5: cars (2 chars)
    # col 6-7: blank (2 chars)
    # col 8-10: time (3 chars)
    # col 11-14: dest (4 chars)
    type_str = t["type"] # 2 chars
    cars_str = f"{t['cars']}両" # 2 chars
    time_str = f"{t['time']:>5}" # 5 half-width chars = 2.5 full-width chars
    
    clean_dest = t["dest"]
    if len(clean_dest) == 2:
        dest_str = f" {clean_dest[0]}　{clean_dest[1]} " # 4 chars
    elif len(clean_dest) == 3:
        dest_str = f" {clean_dest} " # or centered in 4 chars
    else:
        dest_str = clean_dest # 4 chars
        
    print(f"Row: [{type_str}][ ][{cars_str}][  ][{time_str}][{dest_str}]")
